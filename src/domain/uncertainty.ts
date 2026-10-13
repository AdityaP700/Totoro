import type {
  MockTemplate,
  TriageResult,
} from "./types";
import {
  isSecurityRequest,
  isExplicitHumanRequest,
  isBillingRequest,
} from "./triage";

export type EvidenceStatus =
  | "SUFFICIENT_TO_PROCEED"
  | "MISSING_EVIDENCE_CLARIFIABLE"
  | "CONFLICTING_EVIDENCE_INVESTIGATE"
  | "UNSAFE_OR_SENSITIVE_HUMAN_REVIEW";

export interface UncertaintySignals {
  hasSufficientEvidence: boolean;
  missingEvidenceFields: string[];
  hasStateConflict: boolean;
  isSensitiveOrUnsafe: boolean;
  modelRulesDisagreement: boolean;
  modelValidationFailed: boolean;
  rawConfidence: number;
  isConfidenceReliable: boolean;
  attemptsExceeded: boolean;
}

export interface UncertaintyAssessment {
  status: EvidenceStatus;
  signals: UncertaintySignals;
  recommendedNextStep:
    | "proceed_to_playbook"
    | "ask_clarifying_question"
    | "human_handoff";
  rationale: string;
  clarifyingQuestion?: string;
}

export interface UncertaintyContext {
  message: string;
  templateSnapshot?: MockTemplate | null;
  rulesResult: TriageResult;
  modelResult?: Partial<TriageResult> | null;
  validationErrors?: string[];
  previousAttempts?: number;
}

/**
 * Conservative uncertainty-aware decision layer (Phase 3).
 *
 * Distinguishes:
 * 1. SUFFICIENT_TO_PROCEED: All evidence present & verified, no conflict.
 * 2. MISSING_EVIDENCE_CLARIFIABLE: Recoverable gap with exactly 1 question.
 * 3. CONFLICTING_EVIDENCE_INVESTIGATE: Contradictory states requiring human investigation.
 * 4. UNSAFE_OR_SENSITIVE_HUMAN_REVIEW: Policy-mandated human-led zones.
 *
 * Never treats raw model confidence as calibrated probability.
 */
export function assessRecoveryUncertainty(
  ctx: UncertaintyContext,
): UncertaintyAssessment {
  const {
    message,
    templateSnapshot,
    rulesResult,
    modelResult,
    validationErrors = [],
    previousAttempts = 0,
  } = ctx;

  const isSensitive =
    isSecurityRequest(message) ||
    isBillingRequest(message) ||
    isExplicitHumanRequest(message) ||
    rulesResult.issueType === "security_identity_access" ||
    rulesResult.issueType === "billing_refund" ||
    rulesResult.issueType === "human_requested";

  const attemptsExceeded = previousAttempts >= 2;

  // State Conflict: User reports symptom contradicting system status
  const hasStateConflict = Boolean(
    rulesResult.issueType === "state_conflict_or_stale" ||
    (templateSnapshot &&
      templateSnapshot.status === "APPROVED" &&
      /\b(reject|rejected|failed|not working)\b/i.test(message)) ||
    (templateSnapshot &&
      templateSnapshot.status === "REJECTED" &&
      /\b(says approved|working on my phone|delivered)\b/i.test(message)),
  );

  // Model vs Rules Disagreement
  const modelRulesDisagreement = Boolean(
    modelResult &&
      modelResult.issueType &&
      modelResult.issueType !== rulesResult.issueType,
  );

  // Missing Evidence Detection
  const missingEvidenceFields: string[] = [];
  if (
    rulesResult.issueType === "template_rejection" &&
    !templateSnapshot
  ) {
    missingEvidenceFields.push("template_id");
  }
  if (
    templateSnapshot &&
    templateSnapshot.status === "REJECTED" &&
    (!templateSnapshot.reasonCode || templateSnapshot.reasonCode === "")
  ) {
    missingEvidenceFields.push("reason_code");
  }
  if (
    rulesResult.issueType === "ambiguous_or_missing_context" &&
    rulesResult.missingInformation.length > 0
  ) {
    missingEvidenceFields.push(...rulesResult.missingInformation);
  }

  const rawConfidence = modelResult?.confidence ?? rulesResult.confidence;
  // Raw confidence is NOT calibrated probability: uncalibrated if disagreement or missing evidence
  const isConfidenceReliable =
    !modelRulesDisagreement &&
    missingEvidenceFields.length === 0 &&
    !hasStateConflict &&
    rawConfidence >= 0.75;

  const modelValidationFailed = validationErrors.length > 0;

  const signals: UncertaintySignals = {
    hasSufficientEvidence:
      missingEvidenceFields.length === 0 &&
      (Boolean(templateSnapshot?.reasonCode) || rulesResult.issueType !== "template_rejection"),
    missingEvidenceFields,
    hasStateConflict,
    isSensitiveOrUnsafe: isSensitive,
    modelRulesDisagreement,
    modelValidationFailed,
    rawConfidence,
    isConfidenceReliable,
    attemptsExceeded,
  };

  // --- Decision Hierarchy ---

  // 1. Mandatory Human Safety Zones (G8/G10)
  if (isSensitive || attemptsExceeded) {
    const reason = attemptsExceeded
      ? "Two previous recovery attempts failed; policy requires human specialist handoff."
      : "Request touches security, credentials, billing, or explicit human escalation.";
    return {
      status: "UNSAFE_OR_SENSITIVE_HUMAN_REVIEW",
      signals,
      recommendedNextStep: "human_handoff",
      rationale: `Safety override: ${reason}`,
    };
  }

  // 2. State Conflict / Discrepancy (G12)
  if (hasStateConflict) {
    return {
      status: "CONFLICTING_EVIDENCE_INVESTIGATE",
      signals,
      recommendedNextStep: "human_handoff",
      rationale:
        "Observed state contradicts reported symptom; requires human investigation to avoid applying wrong fix.",
    };
  }

  // 3. Model/Rules Disagreement on Non-Trivial Request
  if (modelRulesDisagreement && !isConfidenceReliable) {
    // If rules say clarify, ask clarification
    if (rulesResult.route === "clarify_once") {
      return {
        status: "MISSING_EVIDENCE_CLARIFIABLE",
        signals,
        recommendedNextStep: "ask_clarifying_question",
        rationale: "Rules and model disagree on ambiguous query; asking focused clarifying question.",
        clarifyingQuestion:
          rulesResult.missingInformation[0] ||
          "Could you specify the exact component or error you are experiencing?",
      };
    }
  }

  // 4. Missing Evidence that can be clarified (G9)
  if (missingEvidenceFields.length > 0) {
    let question = "Could you provide additional details about the affected item?";
    if (missingEvidenceFields.includes("template_id")) {
      question = "Which template name or ID is experiencing the issue?";
    } else if (missingEvidenceFields.includes("reason_code")) {
      // Reason code cannot be invented; if template record lacks it, don't pretend customer knows it
      return {
        status: "CONFLICTING_EVIDENCE_INVESTIGATE",
        signals,
        recommendedNextStep: "human_handoff",
        rationale:
          "Template is rejected but provider reason code is unverified in state; policy prohibits guessing.",
      };
    } else if (rulesResult.missingInformation[0]) {
      question = rulesResult.missingInformation[0];
    }

    return {
      status: "MISSING_EVIDENCE_CLARIFIABLE",
      signals,
      recommendedNextStep: "ask_clarifying_question",
      rationale: `Missing required evidence: ${missingEvidenceFields.join(", ")}. Asking one question.`,
      clarifyingQuestion: question,
    };
  }

  // 5. Sufficient Evidence to Proceed
  return {
    status: "SUFFICIENT_TO_PROCEED",
    signals,
    recommendedNextStep: "proceed_to_playbook",
    rationale:
      "All required evidence verified and consistent. Safe to propose verified recovery playbook.",
  };
}
