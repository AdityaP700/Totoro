import { describe, expect, it } from "vitest";
import { assessRecoveryUncertainty } from "../src/domain/uncertainty";
import { createMockStore } from "../src/domain/mockStore";
import type { TriageResult } from "../src/domain/types";

describe("Phase 3 — Uncertainty-Aware Recovery Decision Layer", () => {
  const store = createMockStore();

  it("identifies SUFFICIENT_TO_PROCEED when all evidence is present and consistent", () => {
    const tpl = store.getTemplate("TPL-1001"); // has reasonCode FIXTURE_PROMO_UTILITY
    const rulesResult: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: false,
      route: "rules_playbook",
      confidence: 0.95,
      confidenceBand: "high",
      rationale: "Known promo in utility",
      missingInformation: [],
    };

    const res = assessRecoveryUncertainty({
      message: "Why was my promotional template rejected?",
      templateSnapshot: tpl,
      rulesResult,
    });

    expect(res.status).toBe("SUFFICIENT_TO_PROCEED");
    expect(res.signals.hasSufficientEvidence).toBe(true);
    expect(res.signals.hasStateConflict).toBe(false);
    expect(res.signals.isSensitiveOrUnsafe).toBe(false);
    expect(res.recommendedNextStep).toBe("proceed_to_playbook");
  });

  it("identifies MISSING_EVIDENCE_CLARIFIABLE when template ID is missing", () => {
    const rulesResult: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: false,
      route: "clarify_once",
      confidence: 0.5,
      confidenceBand: "low",
      rationale: "Template rejected without ID",
      missingInformation: ["template_id"],
    };

    const res = assessRecoveryUncertainty({
      message: "My template got rejected, please help",
      templateSnapshot: null, // missing template record
      rulesResult,
    });

    expect(res.status).toBe("MISSING_EVIDENCE_CLARIFIABLE");
    expect(res.signals.missingEvidenceFields).toContain("template_id");
    expect(res.recommendedNextStep).toBe("ask_clarifying_question");
    expect(res.clarifyingQuestion).toContain("template name or ID");
  });

  it("identifies CONFLICTING_EVIDENCE_INVESTIGATE when symptom contradicts recorded status", () => {
    const approvedTpl = {
      ...store.getTemplate("TPL-1001")!,
      status: "APPROVED" as const,
    };

    const rulesResult: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: false,
      route: "rules_playbook",
      confidence: 0.8,
      confidenceBand: "medium",
      rationale: "User claims rejected",
      missingInformation: [],
    };

    const res = assessRecoveryUncertainty({
      message: "Why is this template rejected?",
      templateSnapshot: approvedTpl, // but system record says APPROVED!
      rulesResult,
    });

    expect(res.status).toBe("CONFLICTING_EVIDENCE_INVESTIGATE");
    expect(res.signals.hasStateConflict).toBe(true);
    expect(res.recommendedNextStep).toBe("human_handoff");
    expect(res.rationale).toContain("contradicts reported symptom");
  });

  it("identifies UNSAFE_OR_SENSITIVE_HUMAN_REVIEW for security requests regardless of model output", () => {
    const rulesResult: TriageResult = {
      issueType: "security_identity_access",
      urgency: "critical",
      needsHuman: true,
      route: "human_handoff",
      confidence: 0.99,
      confidenceBand: "high",
      rationale: "OTP detected",
      missingInformation: [],
    };

    const res = assessRecoveryUncertainty({
      message: "Here is my OTP: 123456. Reset my password.",
      rulesResult,
      modelResult: {
        issueType: "template_rejection", // naive model hallucination
        confidence: 0.95,
      },
    });

    expect(res.status).toBe("UNSAFE_OR_SENSITIVE_HUMAN_REVIEW");
    expect(res.signals.isSensitiveOrUnsafe).toBe(true);
    expect(res.recommendedNextStep).toBe("human_handoff");
  });

  it("enforces human review when two previous attempts failed (G8)", () => {
    const tpl = store.getTemplate("TPL-1001");
    const rulesResult: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: true,
      route: "human_handoff",
      confidence: 0.95,
      confidenceBand: "high",
      rationale: "Retries exceeded",
      missingInformation: [],
    };

    const res = assessRecoveryUncertainty({
      message: "Fix template again",
      templateSnapshot: tpl,
      rulesResult,
      previousAttempts: 2,
    });

    expect(res.status).toBe("UNSAFE_OR_SENSITIVE_HUMAN_REVIEW");
    expect(res.signals.attemptsExceeded).toBe(true);
    expect(res.recommendedNextStep).toBe("human_handoff");
    expect(res.rationale).toContain("Two previous recovery attempts failed");
  });

  it("flags uncalibrated confidence when model and rules disagree", () => {
    const tpl = store.getTemplate("TPL-1001");
    const rulesResult: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: false,
      route: "rules_playbook",
      confidence: 0.95,
      confidenceBand: "high",
      rationale: "Rules hit",
      missingInformation: [],
    };

    const res = assessRecoveryUncertainty({
      message: "Template error",
      templateSnapshot: tpl,
      rulesResult,
      modelResult: {
        issueType: "message_delivery", // disagreement!
        confidence: 0.99, // high raw confidence should not be trusted
      },
    });

    expect(res.signals.modelRulesDisagreement).toBe(true);
    expect(res.signals.isConfidenceReliable).toBe(false);
  });
});
