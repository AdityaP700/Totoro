import { describe, expect, it } from "vitest";
import {
  PlaybookRegistry,
  defaultPlaybookRegistry,
  type RecoveryPlaybook,
} from "../src/domain/playbookRegistry";
import { createMockStore } from "../src/domain/mockStore";

describe("Phase 2 — Reusable Recovery Playbook Registry", () => {
  const store = createMockStore();

  it("registers and lists default playbooks covering all core recovery scenarios", () => {
    const list = defaultPlaybookRegistry.list();
    expect(list.length).toBeGreaterThanOrEqual(8);

    const ids = list.map((p) => p.id);
    expect(ids).toContain("PB-001-PROMO-IN-UTILITY");
    expect(ids).toContain("PB-002-INVALID-VARIABLE-FORMAT");
    expect(ids).toContain("PB-003-TAG-CONTENT-MISMATCH");
    expect(ids).toContain("PB-004-UNKNOWN-REASON");
    expect(ids).toContain("PB-SECURITY-IDENTITY-LOCKOUT");
    expect(ids).toContain("PB-BILLING-FINANCIAL-AUDIT");
    expect(ids).toContain("PB-HUMAN-EXPLICIT-HANDOFF");
    expect(ids).toContain("PB-AMBIGUOUS-CLARIFICATION");
  });

  it("finds the exact playbook matching verified reason code", () => {
    const pb1 = defaultPlaybookRegistry.findForContext({
      reasonCode: "FIXTURE_PROMO_UTILITY",
    });
    expect(pb1.id).toBe("PB-001-PROMO-IN-UTILITY");
    expect(pb1.entryConditions.reasonCodes).toContain("FIXTURE_PROMO_UTILITY");
    expect(pb1.permittedActions[0].requiresConfirmation).toBe(true);
    expect(pb1.verificationRules.freshReadRequired).toBe(true);

    const pb2 = defaultPlaybookRegistry.findForContext({
      reasonCode: "FIXTURE_INVALID_VARIABLE_FORMAT",
    });
    expect(pb2.id).toBe("PB-002-INVALID-VARIABLE-FORMAT");
  });

  it("safely falls back to unknown reason playbook when code cannot be verified", () => {
    const pb = defaultPlaybookRegistry.findForContext({
      reasonCode: null,
      templateSnapshot: store.getTemplate("TPL-1003"), // missing reason code
    });

    expect(pb.id).toBe("PB-004-UNKNOWN-REASON");
    expect(pb.permittedActions.length).toBe(0); // no blind action permitted
    expect(pb.humanHandoffConditions.some((c) => c.includes("G9/T3"))).toBe(true);
  });

  it("strictly enforces zero write actions and mandatory human handoff for security and billing", () => {
    const secPb = defaultPlaybookRegistry.findForContext({
      issueType: "security_identity_access",
    });
    expect(secPb.id).toBe("PB-SECURITY-IDENTITY-LOCKOUT");
    expect(secPb.permittedActions.length).toBe(0);
    expect(secPb.expectedPostActionState.status).toBe("HUMAN_ESCALATION");

    const billPb = defaultPlaybookRegistry.findForContext({
      issueType: "billing_refund",
    });
    expect(billPb.id).toBe("PB-BILLING-FINANCIAL-AUDIT");
    expect(billPb.permittedActions.length).toBe(0);
  });

  it("allows custom recovery playbook registration for new recovery flows", () => {
    const customRegistry = new PlaybookRegistry();
    const customPb: RecoveryPlaybook = {
      id: "PB-CUSTOM-WEBHOOK-RETRY",
      issueType: "integration_webhook",
      title: "Webhook Idempotent Retry",
      description: "Checks webhook endpoint before retry.",
      entryConditions: {
        requiredEvidence: ["webhook_url", "error_code_500"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      expectedPostActionState: {
        status: "CHECKED",
        explanation: "Webhook health verified.",
      },
      verificationRules: {
        freshReadRequired: true,
        expectedStatus: "CHECKED",
        maxRetries: 1,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Webhook endpoint unreachable"],
    };

    customRegistry.register(customPb);
    expect(customRegistry.get("PB-CUSTOM-WEBHOOK-RETRY")).toBeDefined();
    expect(customRegistry.findForContext({ issueType: "integration_webhook" }).id).toBe(
      "PB-CUSTOM-WEBHOOK-RETRY",
    );
  });
});
