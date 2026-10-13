import { describe, expect, it } from "vitest";
import { generateCustomerFacingResponse } from "../src/domain/conversationalResponse";
import type { TriageResult } from "../src/domain/types";
import { createMockStore } from "../src/domain/mockStore";

describe("Phase 1 — Conversational Recovery Response Layer", () => {
  const store = createMockStore();

  it("translates promotional in utility rejection into clear non-technical explanation", () => {
    const tpl = store.getTemplate("TPL-1001"); // promo utility
    const triage: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: false,
      route: "rules_playbook",
      confidence: 0.95,
      confidenceBand: "high",
      rationale: "Rule PB-001 hit",
      missingInformation: [],
    };

    const resp = generateCustomerFacingResponse({
      triage,
      templateSnapshot: tpl,
    });

    expect(resp.headline).toContain("Promotional Content in Utility Template");
    expect(resp.whatIsWrong).toContain("contains promotional wording");
    expect(resp.whatIsWrong).not.toContain("FIXTURE_PROMO_UTILITY"); // no provider code leak
    expect(resp.evidenceExplanation).toContain("Marketing");
    expect(resp.nextSteps).toContain("requires your explicit confirmation");
    expect(resp.requiresConfirmation).toBe(true);
    expect(resp.canAutomate).toBe(true);
    expect(resp.statusLabel).toBe("Awaiting Your Confirmation");
  });

  it("translates malformed variable rejection into clear non-technical explanation", () => {
    const tpl = store.getTemplate("TPL-1002"); // variable format
    const triage: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: false,
      route: "rules_playbook",
      confidence: 0.95,
      confidenceBand: "high",
      rationale: "Rule PB-002 hit",
      missingInformation: [],
    };

    const resp = generateCustomerFacingResponse({
      triage,
      templateSnapshot: tpl,
    });

    expect(resp.headline).toContain("Malformed Variable Syntax");
    expect(resp.whatIsWrong).toContain("invalid variable format");
    expect(resp.evidenceExplanation).toContain("matched double curly braces");
    expect(resp.requiresConfirmation).toBe(true);
  });

  it("explains security requests with strict protection rationale and zero automation", () => {
    const triage: TriageResult = {
      issueType: "security_identity_access",
      urgency: "critical",
      needsHuman: true,
      route: "human_handoff",
      confidence: 0.98,
      confidenceBand: "high",
      rationale: "Security credentials involved",
      missingInformation: [],
    };

    const resp = generateCustomerFacingResponse({ triage });

    expect(resp.headline).toContain("Account Security & Credentials Verification");
    expect(resp.evidenceExplanation).toContain("automated agents are strictly prohibited");
    expect(resp.requiresConfirmation).toBe(false);
    expect(resp.canAutomate).toBe(false);
    expect(resp.statusLabel).toBe("Security Review in Progress");
  });

  it("explains billing requests with finance team handoff rationale", () => {
    const triage: TriageResult = {
      issueType: "billing_refund",
      urgency: "high",
      needsHuman: true,
      route: "human_handoff",
      confidence: 0.95,
      confidenceBand: "high",
      rationale: "Billing inquiry",
      missingInformation: [],
    };

    const resp = generateCustomerFacingResponse({ triage });

    expect(resp.headline).toContain("Billing & Payment Inquiry");
    expect(resp.whatIsWrong).toContain("financial transactions, invoices, or credit adjustments");
    expect(resp.requiresConfirmation).toBe(false);
    expect(resp.canAutomate).toBe(false);
    expect(resp.statusLabel).toBe("Transferred to Billing Team");
  });

  it("asks exactly one clarifying question when context is missing", () => {
    const triage: TriageResult = {
      issueType: "ambiguous_or_missing_context",
      urgency: "medium",
      needsHuman: false,
      route: "clarify_once",
      confidence: 0.45,
      confidenceBand: "low",
      rationale: "Vague request",
      missingInformation: ["Which specific WhatsApp template or campaign is affected?"],
    };

    const resp = generateCustomerFacingResponse({ triage });

    expect(resp.headline).toContain("More Information Needed");
    expect(resp.clarifyingQuestion).toBe("Which specific WhatsApp template or campaign is affected?");
    expect(resp.canAutomate).toBe(false);
    expect(resp.statusLabel).toBe("Awaiting Your Clarification");
  });

  it("explains escalation after two previous failed attempts (G8)", () => {
    const triage: TriageResult = {
      issueType: "template_rejection",
      urgency: "medium",
      needsHuman: true,
      route: "human_handoff",
      confidence: 0.9,
      confidenceBand: "high",
      rationale: "Max retries exceeded",
      missingInformation: [],
    };

    const resp = generateCustomerFacingResponse({
      triage,
      previousAttempts: 2,
    });

    expect(resp.headline).toContain("Transferring to a Support Specialist");
    expect(resp.whatIsWrong).toContain("two previous automated recovery attempts were unsuccessful");
    expect(resp.statusLabel).toBe("Escalated to Support Specialist");
    expect(resp.canAutomate).toBe(false);
  });
});
