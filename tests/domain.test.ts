import { describe, it, expect, beforeEach } from "vitest";
import { createMockStore } from "../src/domain/mockStore";
import { ResolveSession } from "../src/domain/stateMachine";
import { triageMessage } from "../src/domain/triage";
import { buildCaseFile, copySummary } from "../src/domain/caseFile";
import type { SessionDeps } from "../src/domain/stateMachine";

function createTestDeps(store = createMockStore()): { deps: SessionDeps; store: ReturnType<typeof createMockStore> } {
  let counter = 1;
  const deps: SessionDeps = {
    store,
    now: () => "2026-10-13T12:00:00.000Z",
    newId: (prefix: string) => `${prefix}-${String(counter++).padStart(3, "0")}`,
  };
  return { deps, store };
}

describe("Cheerio Resolve — Domain Acceptance Tests T1–T15", () => {
  let store: ReturnType<typeof createMockStore>;
  let deps: SessionDeps;

  beforeEach(() => {
    const fixture = createTestDeps();
    store = fixture.store;
    deps = fixture.deps;
  });

  // T1: Known rejection reason -> correct playbook and evidence shown
  it("T1: matches known rejection reason to correct playbook and evidence", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Why is this template rejected?",
    });

    expect(session.state.stage).toBe("PROPOSE");
    expect(session.state.diagnosis).not.toBeNull();
    expect(session.state.diagnosis?.playbookId).toBe("PB-001-PROMO-IN-UTILITY");
    expect(session.state.diagnosis?.reasonCode).toBe("FIXTURE_PROMO_UTILITY");
    expect(session.state.diagnosis?.evidenceUsed).toContain("category");
    expect(session.state.diagnosis?.evidenceUsed).toContain("text");
    expect(session.state.proposal).not.toBeNull();
    expect(session.state.proposal?.operation).toBe("resubmit_template");
    expect(session.state.proposal?.changes[0].field).toBe("category");
    expect(session.state.proposal?.changes[0].after).toBe("MARKETING");
  });

  // T2: User writes "template reject ho gaya bhai" -> original wording and language retained; known state drives diagnosis
  it("T2: preserves Hinglish wording and language, diagnosing from recorded state", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1002",
      message: "template reject ho gaya bhai, help karo",
    });

    expect(session.state.originalMessage).toBe("template reject ho gaya bhai, help karo");
    expect(session.state.language).toBe("hinglish");
    expect(session.state.diagnosis?.playbookId).toBe("PB-002-INVALID-VARIABLE-FORMAT");
    expect(session.state.proposal?.changes[0].field).toBe("text");
    expect(session.state.proposal?.changes[0].after).toContain("{{1}}");
  });

  // T3: Missing/unclear reason code -> no invented cause; offer human review
  it("T3: handles missing or unclear reason code without inventing a diagnosis", () => {
    // Modify template in store to have null reasonCode
    const tpl = store.getTemplate("TPL-1001")!;
    tpl.reasonCode = null;
    // Replace in store directly via resetting fixture with custom template or custom test store
    const customStore = createMockStore();
    const customTpl = customStore.getTemplate("TPL-1001")!;
    customTpl.reasonCode = null;
    // We can simulate a store that returns customTpl
    const customDeps = createTestDeps(customStore).deps;
    // Note: getTemplate returns a copy, so let's mock store getTemplate
    const originalGet = customStore.getTemplate.bind(customStore);
    customStore.getTemplate = (id) => {
      const res = originalGet(id);
      if (res && res.id === "TPL-1001") {
        return { ...res, reasonCode: null };
      }
      return res;
    };

    const session = new ResolveSession(customDeps, {
      templateId: "TPL-1001",
      message: "Why was this template rejected?",
    });

    // When reasonCode is null, triageMessage marks route: clarify_once
    // Or if clarifying question is answered, it diagnoses with PB-004-UNKNOWN-REASON
    expect(session.state.stage).toBe("DIAGNOSE");
    expect(session.state.diagnosis?.playbookId).toBe("PB-004-UNKNOWN-REASON");
    expect(session.state.proposal).toBeNull(); // No automated fix proposed
    expect(session.state.diagnosis?.cannotVerify.length).toBeGreaterThan(0);
  });

  // T4: User declines proposed fix -> no state change; offer explanation or human
  it("T4: leaves state untouched when user declines the proposed fix", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Please check this rejected template",
    });

    expect(session.state.stage).toBe("PROPOSE");
    session.declineProposal();

    expect(session.state.stage).toBe("DECLINED");
    expect(session.state.declined).toBe(true);

    // Verify mock store was NOT modified
    const current = store.getTemplate("TPL-1001")!;
    expect(current.status).toBe("REJECTED");
    expect(current.category).toBe("UTILITY");
  });

  // T5: User confirms proposed fix -> only the confirmed operation is simulated
  it("T5: simulates only the confirmed operation after explicit approval", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Check my rejected template",
    });

    expect(session.state.confirmation).toBeNull();
    const res = session.approveProposal();

    expect(res.result?.ok).toBe(true);
    expect(session.state.confirmation).not.toBeNull();
    expect(session.state.confirmation?.exactBefore).toContain("UTILITY");
    expect(session.state.confirmation?.exactAfter).toContain("MARKETING");
    expect(session.state.stage).toBe("PENDING"); // After verify() runs on TPL-1001
  });

  // T6: State changes to pending -> show submitted/pending, never approved
  it("T6: reflects submitted/pending review and never claims approved", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Check my rejected template",
    });

    session.approveProposal();
    expect(session.state.stage).toBe("PENDING");
    expect(session.state.verification?.verified).toBe(true);
    expect(session.state.verification?.observedStatus).toBe("PENDING");
    expect(session.state.verification?.expectedStatus).toBe("PENDING");
    expect(session.state.verification?.statement).toContain("SUBMITTED/PENDING review");
    expect(session.state.verification?.statement).not.toContain("approved");
  });

  // T7: State remains rejected after attempt -> show 'Could not verify', stop retries, handoff
  it("T7: stops retries and escalates to handoff when state remains rejected", () => {
    // TPL-1003 has simulatedResubmitOutcome: "no_change"
    const session = new ResolveSession(deps, {
      templateId: "TPL-1003",
      message: "Check my rejected template",
    });

    expect(session.state.stage).toBe("PROPOSE");
    session.approveProposal();

    // Verification fails because fresh read is still REJECTED
    expect(session.state.stage).toBe("HANDOFF");
    expect(session.state.verification?.verified).toBe(false);
    expect(session.state.verification?.observedStatus).toBe("REJECTED");
    expect(session.state.attemptsFailed).toBe(1);
    expect(session.state.handoffReason).toContain("Fresh read does not match the expected outcome");
  });

  // T8: User requests human -> immediate handoff, no bot loop
  it("T8: creates immediate handoff when human is requested", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "I want to speak to support, not a bot",
    });

    expect(session.state.stage).toBe("HANDOFF");
    expect(session.state.handoffReason).toContain("human");
    expect(session.state.proposal).toBeNull();
    expect(session.state.events.some((e) => e.eventType === "HANDOFF_CREATED")).toBe(true);
  });

  // T9: Two failed attempts on same issue -> stop and escalate
  it("T9: stops and escalates after two failed attempts", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Check this template",
    });

    // Mock store to return an operation failure
    let attempts = 0;
    store.applyApprovedChange = () => {
      attempts++;
      return {
        ok: false,
        simulated: true,
        failureKind: "operation_failed",
        message: "Simulated network failure on provider endpoint",
      };
    };

    // First failed attempt
    session.approveProposal();
    expect(session.state.attemptsFailed).toBe(1);
    expect(session.state.stage).toBe("PROPOSE");

    // Second failed attempt
    session.approveProposal();
    expect(session.state.attemptsFailed).toBe(2);
    expect(session.state.stage).toBe("HANDOFF");
    expect(session.state.handoffReason).toContain("Two attempts failed");
  });

  // T10: Billing/refund/credit/security/identity/ownership request -> human-led, evidence only
  it("T10: routes billing, refund, security, and identity requests directly to human handoff", () => {
    const billingResult = triageMessage("I was charged twice, please refund last month's bill");
    expect(billingResult.issueType).toBe("billing_refund");
    expect(billingResult.needsHuman).toBe(true);
    expect(billingResult.route).toBe("human_handoff");

    const securityResult = triageMessage("Someone changed my business account details, here is my password");
    expect(securityResult.issueType).toBe("security_identity_access");
    expect(securityResult.needsHuman).toBe(true);
    expect(securityResult.route).toBe("human_handoff");
    expect(securityResult.urgency).toBe("critical");
  });

  // T11: Insufficient permission / unallowlisted operation -> do not bypass; explain and hand off
  it("T11: rejects unallowlisted operations without modifying store", () => {
    const unallowlistedRes = store.applyApprovedChange({
      operation: "delete_template" as any,
      targetId: "TPL-1001",
      changes: [],
      confirmation: {
        approvedAt: "2026-10-13T12:00:00Z",
        exactBefore: "{}",
        exactAfter: "{}",
        idempotencyKey: "test:key",
      },
    });

    expect(unallowlistedRes.ok).toBe(false);
    expect(unallowlistedRes.failureKind).toBe("not_allowlisted");
    expect(unallowlistedRes.message).toContain("not on the allowlist");
  });

  // T12: Conflicting or missing state -> ask one short question or hand off
  it("T12: asks one short clarifying question for ambiguous context and avoids looping", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Help please, urgent",
    });

    expect(session.state.stage).toBe("CLARIFY_ONCE");
    expect(session.state.clarify?.question).toBeTruthy();

    // Clarifying answer still ambiguous -> hands off instead of asking a second question
    session.clarify("it failed yesterday");
    expect(session.state.stage).toBe("HANDOFF");
    expect(session.state.handoffReason).toContain("Still ambiguous");
  });

  // T13: Duplicate confirm action -> no duplicate simulated write or event
  it("T13: blocks duplicate confirmation actions using idempotency key", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Fix my template",
    });

    const first = session.approveProposal();
    expect(first.result?.ok).toBe(true);

    // Artificially reset stage to PROPOSE with same confirmation to simulate duplicate click
    (session.state as any).stage = "PROPOSE";
    const second = session.approveProposal();

    expect(second.blocked).toBeTruthy();
    expect(second.blocked).toContain("Duplicate submissions are blocked");
  });

  // T14: Copy case summary -> summary contains required fields and no unsupported success claim
  it("T14: produces complete case summary containing required audit fields and MOCK notices", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Please fix my Diwali template",
    });
    session.approveProposal();

    const caseFile = buildCaseFile(session.state);
    const summary = copySummary(caseFile);

    expect(summary).toContain("Cheerio Resolve — case summary");
    expect(summary).toContain("MOCK DATA");
    expect(summary).toContain(session.state.caseId);
    expect(summary).toContain(session.state.correlationId);
    expect(summary).toContain("Original message (en): \"Please fix my Diwali template\"");
    expect(summary).toContain("Checks run:");
    expect(summary).toContain("Proposed fix:");
    expect(summary).toContain("Actions attempted:");
    expect(summary).toContain("Verification:");
    expect(summary).toContain("Idempotency key:");
    expect(summary).toContain("Recommended next step:");
    // Never claims approved
    expect(summary.toLowerCase()).not.toContain("status=approved");
  });

  // T15: Reset demo -> returns to known fixture and clears event history
  it("T15: resets store to pristine fixture state and clears idempotency keys", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Fix this template",
    });
    session.approveProposal();

    // State is mutated in store
    expect(store.getTemplate("TPL-1001")?.status).toBe("PENDING");

    // Reset store
    store.reset();

    // Pristine fixture restored
    const restored = store.getTemplate("TPL-1001")!;
    expect(restored.status).toBe("REJECTED");
    expect(restored.category).toBe("UTILITY");

    // A fresh session can approve again with the same idempotency key without being blocked
    const newSession = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Fix this template again",
    });
    const res = newSession.approveProposal();
    expect(res.result?.ok).toBe(true);
  });
});
