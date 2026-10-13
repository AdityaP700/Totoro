import { describe, expect, it } from "vitest";
import { runCliTriage } from "../src/cli/resolveCli";

describe("Cheerio Resolve — End-to-End Execution Matrix (Cases A–F)", () => {
  it("Case A — Clearest possible case (known rejection -> confirmed edit -> fresh-read verified)", async () => {
    const res = await runCliTriage({
      message:
        "The template was rejected because it contains promotional wording but is categorized as utility. Help me correct it.",
      templateId: "TPL-1001",
      rulesOnly: true,
      execute: true,
    });

    expect(res.issue_type).toBe("template_rejection");
    expect(res.route).toBe("safe_playbook");
    expect(res.confirmation_required).toBe(true);
    expect(res.is_verified).toBe(true);
    expect(res.recommended_action).toContain("Change category UTILITY");
    expect(res.customer_explanation?.headline).toBe("Recovery Successfully Verified");
    expect(res.customer_explanation?.statusLabel).toBe("Verified & Resolved");
    expect(res.customer_explanation?.evidenceExplanation).toContain("SUBMITTED/PENDING");
    expect(res.customer_explanation?.evidenceExplanation).toContain("NOT approval");
    expect(res.audit_trail?.evidence.status).toBe("SUFFICIENT_TO_PROCEED");
    expect(res.audit_trail?.playbook.playbookId).toBe("PB-001-PROMO-IN-UTILITY");
    expect(res.audit_trail?.verification.freshReadVerified).toBe(true);
    expect(res.audit_trail?.verification.observedStatus).toBe("PENDING");
    expect(res.audit_trail?.resolution).toBe("VERIFIED");
  });

  it("Case B — Vague complaint (insufficient evidence -> clarify question, zero speculative action)", async () => {
    const res = await runCliTriage({
      message: "My template isn't working. Please fix it.",
      rulesOnly: true,
    });

    expect(res.issue_type).toBe("template_rejection");
    expect(res.route).toBe("clarify");
    expect(res.confirmation_required).toBe(false);
    expect(res.is_verified).toBe(false);
    expect(res.customer_explanation?.headline).toBe("More Information Needed");
    expect(res.customer_explanation?.clarifyingQuestion).toBe("Which template name or ID is experiencing the issue?");
    expect(res.audit_trail?.evidence.status).toBe("MISSING_EVIDENCE_CLARIFIABLE");
    expect(res.audit_trail?.resolution).toBe("CLARIFYING");
  });

  it("Case C1 — Missing evidence (rejected template with missing reason code on dashboard)", async () => {
    const res = await runCliTriage({
      message: "Why was my template rejected? Please check.",
      templateId: "TPL-1004",
      rulesOnly: true,
    });

    expect(res.issue_type).toBe("template_rejection");
    expect(res.audit_trail?.evidence.missing).toContain("reason_code");
    expect(res.route).toBe("human_handoff");
    expect(res.confirmation_required).toBe(false);
    expect(res.customer_explanation?.headline).toBe("Template Rejection Reason Unverified");
    expect(res.customer_explanation?.canAutomate).toBe(false);
    expect(res.customer_explanation?.evidenceExplanation).toContain("policy prohibits guessing");
    expect(res.audit_trail?.resolution).toBe("HANDOFF_ESCALATED");
  });

  it("Case C2 — Contradictory evidence (user reports rejection but recorded status is APPROVED)", async () => {
    const res = await runCliTriage({
      message: "Why was my template rejected? It stopped delivering.",
      templateId: "TPL-1005",
      rulesOnly: true,
    });

    expect(res.audit_trail?.evidence.status).toBe("CONFLICTING_EVIDENCE_INVESTIGATE");
    expect(res.route).toBe("human_handoff");
    expect(res.confirmation_required).toBe(false);
    expect(res.customer_explanation?.headline).toBe("Status Discrepancy Detected");
    expect(res.customer_explanation?.nextSteps).toContain("escalated this to an engineer");
    expect(res.audit_trail?.resolution).toBe("HANDOFF_ESCALATED");
  });

  it("Case D — Explicit human request (overrides template recovery shortcuts immediately)", async () => {
    const res = await runCliTriage({
      message: "I've tried this twice. Can a person review it?",
      templateId: "TPL-1001",
      rulesOnly: true,
      execute: true, // Even if --execute is passed, cannot execute!
    });

    expect(res.issue_type).toBe("human_requested");
    expect(res.route).toBe("human_handoff");
    expect(res.confirmation_required).toBe(false);
    expect(res.is_verified).toBe(false);
    expect(res.customer_explanation?.headline).toBe("Connecting You to a Human Agent");
    expect(res.audit_trail?.resolution).toBe("HANDOFF_ESCALATED");
  });

  it("Case E — Sensitive or restricted request (billing refund blocked from automated action)", async () => {
    const res = await runCliTriage({
      message: "I was charged twice. Refund the extra payment immediately.",
      rulesOnly: true,
      execute: true, // Execution flag must be ignored
    });

    expect(res.issue_type).toBe("billing_refund");
    expect(res.route).toBe("human_handoff");
    expect(res.confirmation_required).toBe(false);
    expect(res.is_verified).toBe(false);
    expect(res.customer_explanation?.headline).toBe("Billing & Payment Inquiry");
    expect(res.customer_explanation?.canAutomate).toBe(false);
    expect(res.audit_trail?.resolution).toBe("HANDOFF_ESCALATED");
  });

  it("Case F — Recovery attempt that does not verify (simulated action attempted -> fresh-read fails -> human escalation)", async () => {
    const res = await runCliTriage({
      message: "Fix the tag content mismatch on my payment reminder template.",
      templateId: "TPL-1003",
      rulesOnly: true,
      execute: true,
    });

    expect(res.issue_type).toBe("template_rejection");
    expect(res.is_verified).toBe(false);
    expect(res.route).toBe("human_handoff"); // Escalated upon failed verification
    expect(res.recommended_action).toContain("failed fresh-read verification");
    expect(res.customer_explanation?.headline).toBe("Recovery Verification Failed");
    expect(res.customer_explanation?.statusLabel).toBe("Verification Failed — Escalated to Support");
    expect(res.audit_trail?.action.customerConfirmed).toBe(true);
    expect(res.audit_trail?.action.executionSimulated).toBe(true);
    expect(res.audit_trail?.verification.freshReadVerified).toBe(false);
    expect(res.audit_trail?.verification.observedStatus).toBe("REJECTED");
    expect(res.audit_trail?.resolution).toBe("HANDOFF_ESCALATED");
  });
});
