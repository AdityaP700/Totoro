import type { CaseState, ProposedChange } from "./types";
import { MOCK_WORKSPACE } from "../data/templates";
import { checksRunFromEvents } from "./eventLog";

/**
 * Complete handoff case file (G12/D7): everything a human needs so the user
 * never repeats their story. Contains mock identifiers only; stores the
 * minimum data the issue needs (G14).
 */
export interface CaseFile {
  caseId: string;
  correlationId: string;
  createdAt: string;
  updatedAt: string;
  workspace: { workspaceId: string; accountId: string; wabaId: string; sourceLabel: "MOCK" };
  template: {
    id: string;
    name: string;
    sourceLabel: "MOCK";
  } | null;
  originalMessage: string;
  language: string;
  issueType: string;
  urgency: string;
  confidenceBand: string;
  triageRationale: string;
  currentState: {
    status: string;
    category: string;
    reasonCode: string | null;
    reasonCodeProvenance: string;
    sourceLabel: "MOCK";
  } | null;
  checksRun: { check: string; result: string }[];
  proposedFix: {
    description: string;
    changes: ProposedChange[];
    userDecision: "approved" | "declined" | "none";
  } | null;
  actionsAttempted: { action: string; result: string }[];
  verification: {
    status: string;
    verified: boolean | null;
    statement: string | null;
  };
  noVerifiedResolutionYet: boolean;
  idempotencyKey: string | null;
  recommendedNextStep: string;
  handoffReason: string | null;
}

export function buildCaseFile(state: CaseState): CaseFile {
  const verified = state.verification?.verified ?? null;
  const noVerifiedResolution = state.stage !== "RESOLVED" && verified !== true;
  return {
    caseId: state.caseId,
    correlationId: state.correlationId,
    createdAt: state.startedAt,
    updatedAt: state.updatedAt,
    workspace: { ...MOCK_WORKSPACE },
    template: state.templateSnapshot
      ? {
          id: state.templateSnapshot.id,
          name: state.templateSnapshot.name,
          sourceLabel: "MOCK" as const,
        }
      : null,
    originalMessage: state.originalMessage,
    language: state.language,
    issueType: state.triage?.issueType ?? "unknown",
    urgency: state.triage?.urgency ?? "unknown",
    confidenceBand: state.triage?.confidenceBand ?? "unknown",
    triageRationale: state.triage?.rationale ?? "",
    currentState: state.templateSnapshot
      ? {
          status: state.templateSnapshot.status,
          category: state.templateSnapshot.category,
          reasonCode: state.templateSnapshot.reasonCode,
          reasonCodeProvenance: state.templateSnapshot.reasonCodeProvenance,
          sourceLabel: "MOCK" as const,
        }
      : null,
    checksRun: checksRunFromEvents(state.events),
    proposedFix: state.proposal
      ? {
          description: state.proposal.description,
          changes: state.proposal.changes,
          userDecision: state.declined
            ? "declined"
            : state.confirmation
              ? "approved"
              : "none",
        }
      : null,
    actionsAttempted: state.events
      .filter((e) => e.eventType === "ACTION_SIMULATED")
      .map((e) => ({ action: "resubmit_template (SIMULATED)", result: e.outcome })),
    verification: {
      status: state.stage === "PENDING" ? "submitted_pending_review" : state.stage,
      verified,
      statement: state.verification?.statement ?? null,
    },
    noVerifiedResolutionYet: noVerifiedResolution,
    idempotencyKey: state.confirmation?.idempotencyKey ?? null,
    recommendedNextStep: recommendNextStep(state),
    handoffReason: state.handoffReason,
  };
}

function recommendNextStep(state: CaseState): string {
  switch (state.stage) {
    case "PENDING":
      return "Wait for Meta review; the prototype must not claim approval. If the review does not complete in the expected window, reopen with the correlation ID.";
    case "HANDOFF":
      return "Human agent reviews the evidence above and contacts the user. No automated retries are pending.";
    case "DECLINED":
      return "The user declined the proposed change; the mock record is untouched. Offer an explanation or continue with a human.";
    case "RESOLVED":
      return "Verified outcome recorded. Monitor for repeat contact within 72 hours.";
    default:
      return "Continue the guided flow or hand off to a human.";
  }
}

export function copySummary(cf: CaseFile): string {
  const lines: string[] = [
    `Cheerio Resolve — case summary (${cf.caseId}, correlation ${cf.correlationId})`,
    `MOCK DATA — all identifiers and outcomes in this summary are simulated.`,
    "",
    `Original message (${cf.language}): "${cf.originalMessage}"`,
    `Issue: ${cf.issueType} · urgency ${cf.urgency} · confidence band ${cf.confidenceBand}`,
    cf.template ? `Template: ${cf.template.id} "${cf.template.name}" (MOCK)` : `Template: n/a`,
    cf.currentState
      ? `Recorded state (MOCK): status=${cf.currentState.status}, category=${cf.currentState.category}, reasonCode=${cf.currentState.reasonCode ?? "none"} (${cf.currentState.reasonCodeProvenance})`
      : `Recorded state: unavailable`,
    "",
    "Checks run:",
    ...(cf.checksRun.length ? cf.checksRun.map((c) => `- ${c.check}: ${c.result}`) : ["- none"]),
  ];
  if (cf.proposedFix) {
    lines.push(
      "",
      `Proposed fix: ${cf.proposedFix.description}`,
      ...cf.proposedFix.changes.map(
        (c) => `- ${c.field}: "${c.before}" → "${c.after}" (${c.reason})`,
      ),
      `User decision: ${cf.proposedFix.userDecision}`,
    );
  }
  lines.push(
    "",
    "Actions attempted:",
    ...(cf.actionsAttempted.length
      ? cf.actionsAttempted.map((a) => `- ${a.action}: ${a.result}`)
      : ["- none (no write-like operation was performed)"]),
    "",
    cf.verification.statement
      ? `Verification: ${cf.verification.statement}`
      : `Verification: not performed${cf.noVerifiedResolutionYet ? " — no verified resolution yet" : ""}`,
    `No verified resolution yet: ${cf.noVerifiedResolutionYet ? "YES" : "no"}`,
    `Idempotency key: ${cf.idempotencyKey ?? "none"}`,
    "",
    `Recommended next step: ${cf.recommendedNextStep}`,
  );
  if (cf.handoffReason) lines.push(`Handoff reason: ${cf.handoffReason}`);
  return lines.join("\n");
}
