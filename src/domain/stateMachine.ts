import type {
  CaseState,
  MockTemplate,
  ProposedChange,
  Proposal,
  Stage,
  TriageResult,
} from "./types";
import type { MockStore, ApplyResult } from "./mockStore";
import { checkExactChange } from "./mockStore";
import { findPlaybook } from "../data/playbooks";
import { triageMessage, guessLanguage } from "./triage";
import { appendEvent } from "./eventLog";
import { expectedStatusAfter, verifyAgainstFreshRead } from "./verification";

export interface SessionDeps {
  store: MockStore;
  now(): string;
  newId(prefix: string): string;
}

export interface StartOptions {
  templateId: string;
  message: string;
}

/**
 * Session orchestrator for the one shared loop:
 * read state → triage → diagnose → propose → authorize → act (mock) →
 * re-read/verify → resolve or hand off. Handoff is reachable from every
 * pre-terminal stage (G8–G12). All state mutation is mock-labelled.
 */
export class ResolveSession {
  readonly state: CaseState;
  private readonly deps: SessionDeps;

  constructor(deps: SessionDeps, opts: StartOptions) {
    this.deps = deps;
    const startedAt = deps.now();
    this.state = {
      caseId: deps.newId("CASE"),
      correlationId: deps.newId("COR"),
      stage: "ENTRY",
      originalMessage: opts.message,
      language: guessLanguage(opts.message),
      templateId: opts.templateId,
      templateSnapshot: null,
      triage: null,
      clarify: null,
      diagnosis: null,
      proposal: null,
      confirmation: null,
      actionResult: null,
      verification: null,
      attemptsFailed: 0,
      declined: false,
      handoffReason: null,
      startedAt,
      updatedAt: startedAt,
      events: [],
    };
    this.append("CASE_OPENED", "Case opened from the rejected-template screen (mock context)", {
      templateId: opts.templateId,
    });
    this.readState();
    this.runTriage();
    this.routeAfterTriage();
  }

  // ---- flow steps -----------------------------------------------------------

  private readState(): void {
    const fresh: MockTemplate | undefined = this.deps.store.getTemplate(this.state.templateId!);
    if (!fresh) {
      this.state.templateSnapshot = null;
      this.append("STATE_READ", "Template record not found in mock store", {});
      this.handoff("The referenced template could not be read from the mock record.");
      return;
    }
    this.state.templateSnapshot = fresh;
    this.append(
      "STATE_READ",
      `Fresh read (MOCK): status=${fresh.status}, category=${fresh.category}, reasonCode=${fresh.reasonCode ?? "none"}`,
      { templateId: fresh.id, status: fresh.status, category: fresh.category },
    );
    this.state.stage = "READ_STATE";
  }

  private runTriage(): void {
    const t: TriageResult = triageMessage(this.state.originalMessage, {
      reasonCode: this.state.templateSnapshot?.reasonCode ?? null,
      stateStatus: this.state.templateSnapshot?.status,
    });
    this.state.triage = t;
    this.append(
      "TRIAGED",
      `issue=${t.issueType}, urgency=${t.urgency}, needsHuman=${t.needsHuman}, route=${t.route} (rules, no model)`,
      { ruleVersion: "rules-1.0", route: t.route },
    );
    this.state.stage = "TRIAGE";
  }

  private routeAfterTriage(): void {
    const t = this.state.triage!;
    if (t.needsHuman || t.route === "human_handoff") {
      this.handoff(`Policy requires human handling — ${t.rationale}`);
      return;
    }
    if (t.route === "clarify_once") {
      this.askClarification();
      return;
    }
    this.diagnose();
  }

  private static QUESTIONS: Record<string, string> = {
    ambiguous_or_missing_context:
      "Which feature is affected — a WhatsApp template, number/WABA setup, a campaign, a chatbot flow, or an integration?",
    template_rejection: "Could you share the template name (or ID) shown on the rejected-template screen?",
    message_delivery: "Which campaign is affected, and roughly when was it sent?",
    integration_webhook: "Which endpoint or CRM is affected, and when did the failures start?",
    chatbot_flow: "Which flow is affected, and what should trigger it?",
    number_waba_setup: "Which number or WABA account is affected?",
  };

  private askClarification(): void {
    const t = this.state.triage!;
    const question = ResolveSession.QUESTIONS[t.issueType] ?? ResolveSession.QUESTIONS["ambiguous_or_missing_context"];
    this.state.clarify = { question, askedAt: this.deps.now(), answer: null };
    this.state.stage = "CLARIFY_ONCE";
    this.append("CLARIFICATION_ASKED", `One focused question asked: ${question}`, {
      issueType: t.issueType,
    });
  }

  /** Answer the (single) clarifying question and re-triage. */
  clarify(answer: string): void {
    if (this.state.stage !== "CLARIFY_ONCE" || !this.state.clarify) {
      throw new Error("No clarification is pending for this case.");
    }
    if (this.state.clarify.answer !== null) {
      // Only one clarifying question per case (G9).
      this.handoff("Still ambiguous after one clarifying question; escalating with context.");
      return;
    }
    this.state.clarify.answer = answer;
    this.append("CLARIFICATION_ANSWERED", "User answered the clarifying question", {});
    const combined = `${this.state.originalMessage}\n${answer}`;
    const t = triageMessage(combined, {
      reasonCode: this.state.templateSnapshot?.reasonCode ?? null,
      stateStatus: this.state.templateSnapshot?.status,
    });
    this.state.triage = t;
    this.append(
      "TRIAGED",
      `re-triage after clarification: issue=${t.issueType}, route=${t.route} (rules, no model)`,
      { ruleVersion: "rules-1.0" },
    );
    if (t.needsHuman || t.route === "human_handoff") {
      this.handoff(`Policy requires human handling — ${t.rationale}`);
      return;
    }
    if (t.route === "clarify_once") {
      // One question max: hand off instead of looping (G9).
      this.handoff("Still ambiguous after one clarifying question; escalating with context.");
      return;
    }
    this.diagnose();
  }

  private diagnose(): void {
    const template = this.state.templateSnapshot!;
    const playbook = findPlaybook(template.reasonCode);
    this.state.diagnosis = {
      playbookId: playbook.id,
      reasonCode: template.reasonCode,
      plainExplanation: playbook.explanation,
      evidenceUsed: playbook.evidenceFields,
      cannotVerify:
        template.reasonCode === null
          ? ["The rejection cause cannot be verified from the record; no reason code is available."]
          : [],
    };
    this.append(
      "DIAGNOSED",
      `playbook ${playbook.id} matched recorded reason code ${template.reasonCode ?? "(none)"}`,
      { playbookId: playbook.id },
    );
    this.state.stage = "DIAGNOSE";
    if (playbook.proposedAction) {
      this.propose(playbook.id, playbook.proposedAction.description, playbook.proposedAction.buildChanges(template));
    } else {
      // Unknown/absent reason: no proposal, explanation + human review offer (T3).
      this.state.proposal = null;
    }
  }

  private propose(playbookId: string, description: string, changes: ProposedChange[]): void {
    const proposal: Proposal = {
      operation: "resubmit_template",
      targetId: this.state.templateSnapshot!.id,
      playbookId,
      description,
      changes,
      requiresConfirmation: true,
    };
    this.state.proposal = proposal;
    this.state.stage = "PROPOSE";
    this.append("FIX_PROPOSED", description, { changes });
  }

  // ---- user decisions -------------------------------------------------------

  /** The ONLY path that can lead to a state change (G1). */
  approveProposal(): { blocked?: string; result?: ApplyResult } {
    const proposal = this.state.proposal;
    if (!proposal || (this.state.stage !== "PROPOSE" && this.state.stage !== "CONFIRM")) {
      throw new Error("No proposal is awaiting confirmation.");
    }
    const template = this.deps.store.getTemplate(proposal.targetId)!;

    const exactBefore = this.exactSnapshot(template, proposal.changes, "before");
    const exactAfter = this.exactSnapshot(template, proposal.changes, "after");
    const confirmation = {
      approvedAt: this.deps.now(),
      exactBefore,
      exactAfter,
      idempotencyKey: `${this.state.caseId}:${proposal.playbookId ?? "noop"}:${hashProposal(proposal)}`,
    };
    if (!checkExactChange(template, proposal.changes, confirmation)) {
      throw new Error("Proposal serialization mismatch — refusing to confirm.");
    }
    this.state.confirmation = confirmation;
    this.state.stage = "CONFIRM";
    this.append("USER_CONFIRMED", "User explicitly approved the exact proposed change", {
      idempotencyKey: confirmation.idempotencyKey,
    });

    const result = this.deps.store.applyApprovedChange({
      operation: proposal.operation,
      targetId: proposal.targetId,
      changes: proposal.changes,
      confirmation,
    });

    if (!result.ok) {
      if (result.failureKind === "duplicate_idempotency_key") {
        // T13: duplicate confirmation — no second simulated write, no event.
        return { blocked: result.message };
      }
      this.state.attemptsFailed += 1;
      this.append("ACTION_SIMULATED", `Operation blocked: ${result.message}`, {
        failureKind: result.failureKind,
      });
      if (this.state.attemptsFailed >= 2) {
        this.handoff("Two attempts failed on the same issue; escalation with evidence (G8).");
      } else {
        this.state.stage = "PROPOSE";
      }
      return { result };
    }

    this.state.actionResult = result.message;
    this.append("ACTION_SIMULATED", result.message, { simulated: true });
    this.state.stage = "APPLY_SIMULATED_ACTION";
    this.verify();
    return { result };
  }

  private verify(): void {
    const proposal = this.state.proposal!;
    const expected = expectedStatusAfter(proposal.operation);
    if (expected === null) {
      this.handoff("No expected outcome is defined for this operation; cannot verify.");
      return;
    }
    const fresh = this.deps.store.getTemplate(proposal.targetId)!;
    const verification = verifyAgainstFreshRead(fresh, expected);
    this.state.verification = verification;
    this.state.templateSnapshot = fresh;
    this.append("STATE_VERIFIED", verification.statement, {
      observed: verification.observedStatus,
      expected: verification.expectedStatus,
      verified: verification.verified,
    });
    this.state.stage = "VERIFY";
    if (verification.verified) {
      // Success is "Submitted — pending review", never "approved" (G6).
      this.state.stage = "PENDING";
    } else {
      // T7: state unchanged → stop retrying, hand off with evidence.
      this.state.attemptsFailed += 1;
      this.handoff(
        "Fresh read does not match the expected outcome; retries are stopped and the case is escalated (T7/G5).",
      );
    }
  }

  declineProposal(): void {
    if (this.state.stage !== "PROPOSE" && this.state.stage !== "CONFIRM") {
      throw new Error("No proposal to decline.");
    }
    this.state.declined = true;
    this.state.stage = "DECLINED";
    this.append("FIX_DECLINED", "User declined the proposed change; mock record untouched", {});
  }

  /** Available from any non-terminal stage (D7). */
  requestHuman(reason?: string): void {
    this.handoff(reason ?? "The user asked for a human.");
  }

  // ---- helpers --------------------------------------------------------------

  private handoff(reason: string): void {
    this.state.handoffReason = reason;
    this.state.stage = "HANDOFF";
    this.append("HANDOFF_CREATED", `Human handoff: ${reason}`, {});
  }

  private append(eventType: Parameters<typeof appendEvent>[1], outcome: string, details: Record<string, unknown>): void {
    appendEvent(this.state, eventType, outcome, details, this.deps);
  }

  /** Exact before/after JSON across ALL fields, confirmed untouched fields included (G1). */
  private exactSnapshot(
    template: MockTemplate,
    changes: ProposedChange[],
    which: "before" | "after",
  ): string {
    const obj: Record<string, string> = {
      text: template.text,
      category: template.category,
    };
    for (const c of changes) obj[c.field] = which === "before" ? c.before : c.after;
    return JSON.stringify(obj);
  }
}

function hashProposal(p: Proposal): string {
  // Deterministic, dependency-free hash (FNV-1a) over the change set.
  const s = JSON.stringify(p.changes);
  let h = 0x811c9dc5;
  for (let idx = 0; idx < s.length; idx++) {
    h ^= s.charCodeAt(idx);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function sessionStage(s: CaseState): Stage {
  return s.stage;
}
