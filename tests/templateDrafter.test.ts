import { describe, expect, it } from "vitest";
import {
  validateTemplateDraft,
  createDraftProposal,
} from "../src/domain/templateDrafter";
import { createMockStore } from "../src/domain/mockStore";

describe("Phase 4 — Constrained Template Drafting & Deterministic Validation", () => {
  const store = createMockStore();

  it("validates a compliant marketing draft with valid sequential variables", () => {
    const text = "Hi {{1}}, get 20% off your next purchase using code {{2}}!";
    const res = validateTemplateDraft(text, "MARKETING");

    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
    expect(res.checks.variablesValid).toBe(true);
    expect(res.checks.categoryCompliant).toBe(true);
    expect(res.checks.noProhibitedContent).toBe(true);
    expect(res.checks.lengthCompliant).toBe(true);
  });

  it("blocks a draft with malformed unclosed variable brace {{1}", () => {
    const text = "Hi {{1}, thank you for your order.";
    const res = validateTemplateDraft(text, "UTILITY");

    expect(res.valid).toBe(false);
    expect(res.checks.variablesValid).toBe(false);
    expect(res.errors.some((e) => e.includes("matched double curly braces"))).toBe(true);
  });

  it("blocks a draft with non-sequential variables (skipping numbers)", () => {
    const text = "Hi {{1}}, your order {{3}} is ready.";
    const res = validateTemplateDraft(text, "UTILITY");

    expect(res.valid).toBe(false);
    expect(res.checks.variablesValid).toBe(false);
    expect(res.errors.some((e) => e.includes("sequentially without gaps"))).toBe(true);
  });

  it("blocks promotional language in UTILITY category", () => {
    const text = "Your order is confirmed! Enjoy 50% off your next meal with this coupon.";
    const res = validateTemplateDraft(text, "UTILITY");

    expect(res.valid).toBe(false);
    expect(res.checks.categoryCompliant).toBe(false);
    expect(res.errors.some((e) => e.includes("Promotional terms"))).toBe(true);
  });

  it("blocks drafts with sensitive prohibited credentials", () => {
    const text = "Your temporary password is {{1}}. Please share your otp with the driver.";
    const res = validateTemplateDraft(text, "AUTHENTICATION");

    expect(res.valid).toBe(false);
    expect(res.checks.noProhibitedContent).toBe(false);
    expect(res.errors.some((e) => e.includes("Policy violation"))).toBe(true);
  });

  it("blocks self-approval: createDraftProposal enforces isEligibleForReview and customerConfirmed=false", () => {
    const tpl = store.getTemplate("TPL-1001")!;

    // Compliant draft
    const proposal = createDraftProposal({
      originalTemplate: tpl,
      proposedText: "Hi {{1}}, flash sale! Use code {{2}} for 50% discount.",
      proposedCategory: "MARKETING",
      explanation: "Switch category to Marketing to permit discount.",
    });

    expect(proposal.validation.valid).toBe(true);
    expect(proposal.isEligibleForReview).toBe(true);
    expect(proposal.customerConfirmed).toBe(false); // Model NEVER self-approves
    expect(proposal.changes.length).toBeGreaterThan(0);

    // Invalid draft blocks eligibility
    const invalidProposal = createDraftProposal({
      originalTemplate: tpl,
      proposedText: "Invalid variable {{1} and promo in utility",
      proposedCategory: "UTILITY", // promo in utility!
      explanation: "Broken draft",
    });

    expect(invalidProposal.validation.valid).toBe(false);
    expect(invalidProposal.isEligibleForReview).toBe(false);
  });
});
