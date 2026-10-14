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
import type { ReasoningAdapter } from "./adapter";
import { RulesReasoningAdapter } from "./adapter";

export interface SessionDeps {
  store: MockStore;
  now(): string;
  newId(prefix: string): string;
  reasoningAdapter?: ReasoningAdapter;
}

export interface StartOptions {
  templateId?: string | null;
  message: string;
}

export function detectTemplateIdFromText(text: string): string | undefined {
  if (!text) return undefined;
  const idMatch = text.toUpperCase().match(/\bTPL-\d{4}\b/);
  if (idMatch) return idMatch[0];

  const lower = text.toLowerCase();
  if (lower.includes("festive_offer_blast") || lower.includes("festive_offer") || (lower.includes("template") && lower.includes("festive"))) {
    return "TPL-1001";
  }
  if (lower.includes("order_update_v3") || (lower.includes("template") && (lower.includes("order_update") || lower.includes("format") || lower.includes("variable")))) {
    return "TPL-1002";
  }
  if (lower.includes("payment_reminder_aug") || (lower.includes("template") && (lower.includes("payment_reminder") || lower.includes("tag")))) {
    return "TPL-1003";
  }
  if (lower.includes("missing_reason_alert") || (lower.includes("template") && lower.includes("missing_reason"))) {
    return "TPL-1004";
  }
  if (lower.includes("welcome_onboarding") || (lower.includes("template") && lower.includes("welcome_onboarding"))) {
    return "TPL-1005";
  }
  return undefined;
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
      templateId: opts.templateId ?? null,
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

    // 1. If templateId was provided, read state first so adapter has template context
    if (this.state.templateId) {
      this.readState();
    }

    // 2. Triage the message intent
    this.runTriage();

    // 3. Enforce request and entity consistency (Requirement B):
    // Sensitive human-led zones (billing, security, explicit human requests) must NEVER inherit
    // template rejection state or evidence, even if a template was accidentally pre-selected.
    const isSensitiveNonTemplateZone =
      this.state.triage?.issueType === "billing_refund" ||
      this.state.triage?.issueType === "security_identity_access" ||
      this.state.triage?.issueType === "human_requested";

    if (isSensitiveNonTemplateZone) {
      this.state.templateId = null;
      this.state.templateSnapshot = null;
      this.append("CASE_OPENED", "Case opened for policy-governed investigation", {
        issueType: this.state.triage?.issueType,
      });
      this.append("STATE_READ", `No template entity attached to request context (${this.state.triage?.issueType})`, {});
      this.state.stage = "READ_STATE";
    } else if (this.state.templateId && this.state.templateSnapshot) {
      this.append("CASE_OPENED", "Case opened from the template context (mock context)", {
        templateId: this.state.templateId,
      });
    } else {
      this.append("CASE_OPENED", "Case opened without template context", {});
      this.append("STATE_READ", "No template entity attached to request context", {});
      this.state.stage = "READ_STATE";
    }

    // 4. Route after triage and state inspection
    this.routeAfterTriage();
  }

  // ---- flow steps -----------------------------------------------------------

  private readState(): void {
    if (!this.state.templateId) {
      this.state.templateSnapshot = null;
      this.append("STATE_READ", "No template entity attached to request context", {});
      this.state.stage = "READ_STATE";
      return;
    }
    const fresh: MockTemplate | undefined = this.deps.store.getTemplate(this.state.templateId);
    if (!fresh) {
      this.state.templateSnapshot = null;
      this.append("STATE_READ", "Template record not found in mock store", { templateId: this.state.templateId });
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
    const adapter = this.deps.reasoningAdapter ?? new RulesReasoningAdapter();
    const t: TriageResult = adapter.triage({
      message: this.state.originalMessage,
      templateSnapshot: this.state.templateSnapshot,
      previousAttempts: this.state.attemptsFailed,
    });
    this.state.triage = t;
    const layer = t.decisionLayer ?? "rules";
    this.append(
      "TRIAGED",
      `issue=${t.issueType}, urgency=${t.urgency}, needsHuman=${t.needsHuman}, route=${t.route} (adapter=${adapter.name}, layer=${layer})`,
      { adapter: adapter.name, version: adapter.version, decisionLayer: layer, route: t.route, latencyMs: t.latencyMs },
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

    if (!this.state.templateSnapshot) {
      const detectedId = detectTemplateIdFromText(combined);
      if (detectedId) {
        const fresh = this.deps.store.getTemplate(detectedId);
        if (fresh) {
          this.state.templateId = fresh.id;
          this.state.templateSnapshot = fresh;
          this.append(
            "STATE_READ",
            `Fresh read after clarification (MOCK): status=${fresh.status}, category=${fresh.category}, reasonCode=${fresh.reasonCode ?? "none"}`,
            { templateId: fresh.id, status: fresh.status, category: fresh.category },
          );
        }
      }
    }

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
    const t = this.state.triage;
    const issueType = t?.issueType ?? "template_rejection";

    // Non-template issues must never inherit template playbooks or write proposals (Requirement B)
    if (issueType !== "template_rejection") {
      if (issueType === "message_delivery") {
        this.state.diagnosis = {
          playbookId: "PB-DELIVERY-STATUS-CHECK",
          reasonCode: null,
          plainExplanation:
            "Message delivery issues depend on recipient handset connectivity and carrier delivery networks. No template formatting errors are present.",
          evidenceUsed: ["message_delivery_status"],
          cannotVerify: [
            "Live recipient handset connectivity and carrier delivery receipts cannot be verified without real-time carrier telemetry.",
          ],
        };
        this.append(
          "DIAGNOSED",
          "Message delivery assessment: delivery receipts depend on carrier networks and recipient handset connectivity; no template resubmission applies.",
          { playbookId: "PB-DELIVERY-STATUS-CHECK" },
        );
        this.state.stage = "DIAGNOSE";
        this.state.proposal = null;
        return;
      }

      if (issueType === "integration_webhook") {
        this.state.diagnosis = {
          playbookId: "PB-INTEGRATION-ENDPOINT-CHECK",
          reasonCode: null,
          plainExplanation:
            "Integration and webhook events depend on customer endpoint availability and webhook subscription status. Verify server SSL and response status 200.",
          evidenceUsed: ["webhook_endpoint_status"],
          cannotVerify: ["Remote webhook server response logs cannot be verified directly."],
        };
        this.append(
          "DIAGNOSED",
          "Integration webhook assessment: inspect endpoint responsiveness and retry metadata.",
          { playbookId: "PB-INTEGRATION-ENDPOINT-CHECK" },
        );
        this.state.stage = "DIAGNOSE";
        this.state.proposal = null;
        return;
      }

      if (issueType === "number_waba_setup") {
        this.state.diagnosis = {
          playbookId: "PB-WABA-REGISTRATION-CHECK",
          reasonCode: null,
          plainExplanation:
            "WhatsApp Business Account setup requires verified display name and active phone certificate registration on Meta Business Manager.",
          evidenceUsed: ["waba_registration_status"],
          cannotVerify: ["Meta Business Manager verification state cannot be modified automatically."],
        };
        this.append(
          "DIAGNOSED",
          "WABA setup assessment: business verification and certificate registration required.",
          { playbookId: "PB-WABA-REGISTRATION-CHECK" },
        );
        this.state.stage = "DIAGNOSE";
        this.state.proposal = null;
        return;
      }

      if (issueType === "chatbot_flow") {
        this.state.diagnosis = {
          playbookId: "PB-CHATBOT-FLOW-CHECK",
          reasonCode: null,
          plainExplanation:
            "Chatbot flow triggers depend on keyword match rules and flow publish state.",
          evidenceUsed: ["chatbot_flow_status"],
          cannotVerify: ["Runtime flow execution state cannot be verified without trigger logs."],
        };
        this.append(
          "DIAGNOSED",
          "Chatbot flow assessment: inspect trigger rules and publish state.",
          { playbookId: "PB-CHATBOT-FLOW-CHECK" },
        );
        this.state.stage = "DIAGNOSE";
        this.state.proposal = null;
        return;
      }

      // Default safe guidance for any other non-template issue
      this.state.diagnosis = {
        playbookId: null,
        reasonCode: null,
        plainExplanation: `Policy evaluated for ${issueType}; no automated write operation applies.`,
        evidenceUsed: [],
        cannotVerify: ["No fixture matches this entity type."],
      };
      this.state.stage = "DIAGNOSE";
      this.state.proposal = null;
      return;
    }

    // For template_rejection:
    const template = this.state.templateSnapshot;
    if (!template) {
      // Unmapped template entity: ask single focused clarification (G9/Requirement B)
      this.askClarification();
      return;
    }

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

    let confirmation = this.state.confirmation;
    if (!confirmation) {
      const exactBefore = this.exactSnapshot(template, proposal.changes, "before");
      const exactAfter = this.exactSnapshot(template, proposal.changes, "after");
      confirmation = {
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
    }

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
