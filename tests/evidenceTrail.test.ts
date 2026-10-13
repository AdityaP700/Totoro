import { describe, expect, it } from "vitest";
import { buildCaseAuditTrail } from "../src/domain/evidenceTrail";
import { assessRecoveryUncertainty } from "../src/domain/uncertainty";
import { defaultPlaybookRegistry } from "../src/domain/playbookRegistry";
import { createMockStore } from "../src/domain/mockStore";
import type { TriageResult } from "../src/domain/types";

describe("Phase 5 — Structured Evidence Trail & Audit Logging", () => {
  const store = createMockStore();

  it("builds a complete structured audit trail for a verified recovery flow", () => {
    const tpl = store.getTemplate("TPL-1001")!;
    const rulesResult: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: false,
      route: "rules_playbook",
      confidence: 0.95,
      confidenceBand: "high",
      rationale: "Rule hit",
      missingInformation: [],
      decisionLayer: "rules",
    };

    const uncertainty = assessRecoveryUncertainty({
      message: "Why is my template rejected?",
      templateSnapshot: tpl,
      rulesResult,
    });

    const playbook = defaultPlaybookRegistry.findForContext({
      reasonCode: tpl.reasonCode,
    });

    const trail = buildCaseAuditTrail({
      caseId: "CASE-TEST-1001",
      correlationId: "CORR-TEST-001",
      originalMessage: "Why is my template rejected?",
      templateSnapshot: tpl,
      rulesResult,
      guardedDecision: rulesResult,
      uncertainty,
      playbook,
      customerConfirmed: true,
      actionExecuted: true,
      mockResult: "SIMULATED_PENDING_REVIEW",
      verification: {
        verified: true,
        observedStatus: "PENDING",
        expectedStatus: "PENDING",
        statement: "Fresh read confirms status changed to PENDING.",
      },
      totalLatencyMs: 145,
    });

    expect(trail.caseId).toBe("CASE-TEST-1001");
    expect(trail.evidence.present).toContain("template_id=TPL-1001");
    expect(trail.evidence.status).toBe("SUFFICIENT_TO_PROCEED");
    expect(trail.playbook.playbookId).toBe("PB-001-PROMO-IN-UTILITY");
    expect(trail.action.customerConfirmed).toBe(true);
    expect(trail.action.executionSimulated).toBe(true);
    expect(trail.verification.freshReadVerified).toBe(true);
    expect(trail.resolution).toBe("VERIFIED");
    expect(trail.triage.guardrailOutcome).toBe("PERMITTED");
  });

  it("records guardrail override when security interceptor catches naive model prediction", () => {
    const rulesResult: TriageResult = {
      issueType: "security_identity_access",
      urgency: "critical",
      needsHuman: true,
      route: "human_handoff",
      confidence: 0.99,
      confidenceBand: "high",
      rationale: "Safety override",
      missingInformation: [],
      decisionLayer: "rules",
    };

    const rawModelResult = {
      modelId: "laya-test",
      issueType: "template_rejection" as const, // naive prediction!
      urgency: "low" as const,
      confidence: 0.9,
      tokensCharged: 320,
      latencyMs: 850,
    };

    const uncertainty = assessRecoveryUncertainty({
      message: "Here is my OTP 123456",
      rulesResult,
      modelResult: rawModelResult,
    });

    const trail = buildCaseAuditTrail({
      caseId: "CASE-SEC-002",
      correlationId: "CORR-SEC-002",
      originalMessage: "Here is my OTP 123456",
      rulesResult,
      modelResult: rawModelResult,
      guardedDecision: rulesResult,
      uncertainty,
      totalLatencyMs: 850,
    });

    expect(trail.resolution).toBe("HANDOFF_ESCALATED");
    expect(trail.triage.guardrailOutcome).toBe("OVERRIDDEN");
    expect(trail.triage.guardrailReason).toContain("Safety interceptor overridden model prediction");
    expect(trail.telemetry.tokenUsage?.inputTokens).toBe(320);
  });
});
