import type {
  MockTemplate,
  TriageResult,
  VerificationResult,
} from "./types";
import type { EvidenceStatus, UncertaintyAssessment } from "./uncertainty";
import type { RecoveryPlaybook } from "./playbookRegistry";

/**
 * Complete, structured evidence trail and audit record for Cheerio Resolve (Phase 5).
 * Encapsulates the entire recovery lifecycle for regulatory compliance,
 * manager analytics, and deterministic verification.
 */
export interface CaseAuditTrail {
  caseId: string;
  correlationId: string;
  timestamp: string;
  originalMessage: string;
  evidence: {
    present: string[];
    missing: string[];
    status: EvidenceStatus;
  };
  triage: {
    rules: {
      issueType: string;
      urgency: string;
      route: string;
      needsHuman: boolean;
    };
    model?: {
      modelId?: string;
      issueType?: string;
      urgency?: string;
      confidence?: number;
      latencyMs?: number;
      tokensCharged?: number;
    } | null;
    guardedDecision: {
      issueType: string;
      urgency: string;
      route: string;
      needsHuman: boolean;
      decisionLayer: "rules" | "laya" | "groq" | "fallback";
      rationale: string;
    };
    guardrailOutcome: "PERMITTED" | "OVERRIDDEN" | "REJECTED_FALLBACK";
    guardrailReason?: string;
  };
  playbook: {
    playbookId: string | null;
    title?: string;
    actionAllowed: boolean;
  };
  action: {
    proposedAction?: string | null;
    confirmationRequired: boolean;
    customerConfirmed: boolean;
    executionSimulated: boolean;
    mockResult?: string | null;
  };
  verification: {
    freshReadVerified: boolean;
    observedStatus?: string;
    expectedStatus?: string;
    statement?: string;
  };
  resolution:
    | "VERIFIED"
    | "PENDING_REVIEW"
    | "CLARIFYING"
    | "HANDOFF_ESCALATED"
    | "DECLINED";
  telemetry: {
    totalLatencyMs: number;
    tokenUsage?: {
      inputTokens: number;
      outputTokens?: number;
    } | null;
    error?: string | null;
  };
}

export function buildCaseAuditTrail(params: {
  caseId: string;
  correlationId: string;
  originalMessage: string;
  templateSnapshot?: MockTemplate | null;
  rulesResult: TriageResult;
  modelResult?: {
    modelId?: string;
    issueType?: string;
    urgency?: string;
    confidence?: number;
    latencyMs?: number;
    tokensCharged?: number;
  } | null;
  guardedDecision: TriageResult;
  uncertainty: UncertaintyAssessment;
  playbook?: RecoveryPlaybook | null;
  customerConfirmed?: boolean;
  actionExecuted?: boolean;
  mockResult?: string | null;
  verification?: VerificationResult | null;
  totalLatencyMs?: number;
  error?: string | null;
}): CaseAuditTrail {
  const {
    caseId,
    correlationId,
    originalMessage,
    templateSnapshot,
    rulesResult,
    modelResult,
    guardedDecision,
    uncertainty,
    playbook,
    customerConfirmed = false,
    actionExecuted = false,
    mockResult = null,
    verification,
    totalLatencyMs = 0,
    error = null,
  } = params;

  // Evidence extraction
  const present: string[] = [];
  if (templateSnapshot) {
    present.push(`template_id=${templateSnapshot.id}`);
    present.push(`template_status=${templateSnapshot.status}`);
    present.push(`template_category=${templateSnapshot.category}`);
    if (templateSnapshot.reasonCode) {
      present.push(`reason_code=${templateSnapshot.reasonCode}`);
    }
  }
  present.push(`message_len=${originalMessage.length}`);

  // Guardrail outcome
  let guardrailOutcome: CaseAuditTrail["triage"]["guardrailOutcome"] = "PERMITTED";
  let guardrailReason: string | undefined = undefined;

  if (guardedDecision.decisionLayer === "fallback") {
    guardrailOutcome = "REJECTED_FALLBACK";
    guardrailReason = "Model output was rejected by validation guardrails; safe rules baseline applied.";
  } else if (
    modelResult &&
    modelResult.issueType &&
    guardedDecision.issueType !== modelResult.issueType
  ) {
    guardrailOutcome = "OVERRIDDEN";
    guardrailReason = "Safety interceptor overridden model prediction to human-led zone.";
  }

  // Final resolution calculation
  let resolution: CaseAuditTrail["resolution"] = "PENDING_REVIEW";
  if (guardedDecision.route === "human_handoff" || guardedDecision.needsHuman) {
    resolution = "HANDOFF_ESCALATED";
  } else if (
    guardedDecision.route === "clarify_once" ||
    (guardedDecision.route as string) === "clarify" ||
    uncertainty.status === "MISSING_EVIDENCE_CLARIFIABLE"
  ) {
    resolution = "CLARIFYING";
  } else if (verification) {
    resolution = verification.verified ? "VERIFIED" : "HANDOFF_ESCALATED";
  } else if (!customerConfirmed) {
    resolution = "PENDING_REVIEW";
  }

  return {
    caseId,
    correlationId,
    timestamp: new Date().toISOString(),
    originalMessage,
    evidence: {
      present,
      missing: uncertainty.signals.missingEvidenceFields,
      status: uncertainty.status,
    },
    triage: {
      rules: {
        issueType: rulesResult.issueType,
        urgency: rulesResult.urgency,
        route: rulesResult.route,
        needsHuman: rulesResult.needsHuman,
      },
      model: modelResult || null,
      guardedDecision: {
        issueType: guardedDecision.issueType,
        urgency: guardedDecision.urgency,
        route: guardedDecision.route,
        needsHuman: guardedDecision.needsHuman,
        decisionLayer: guardedDecision.decisionLayer || "rules",
        rationale: guardedDecision.rationale,
      },
      guardrailOutcome,
      guardrailReason,
    },
    playbook: {
      playbookId: playbook?.id || null,
      title: playbook?.title,
      actionAllowed: (playbook?.permittedActions.length ?? 0) > 0,
    },
    action: {
      proposedAction: playbook?.permittedActions[0]?.description || null,
      confirmationRequired: playbook?.permittedActions[0]?.requiresConfirmation ?? false,
      customerConfirmed,
      executionSimulated: actionExecuted,
      mockResult,
    },
    verification: {
      freshReadVerified: verification?.verified ?? false,
      observedStatus: verification?.observedStatus,
      expectedStatus: verification?.expectedStatus,
      statement: verification?.statement,
    },
    resolution,
    telemetry: {
      totalLatencyMs,
      tokenUsage: modelResult?.tokensCharged
        ? { inputTokens: modelResult.tokensCharged }
        : null,
      error,
    },
  };
}
