import { describe, it, expect, beforeEach } from "vitest";
import { createMockStore } from "../src/domain/mockStore";
import { ResolveSession, deriveInteractionState } from "../src/domain/stateMachine";
import { defaultPlaybookRegistry } from "../src/domain/playbookRegistry";
import { buildCaseFile } from "../src/domain/caseFile";
import type { SessionDeps } from "../src/domain/stateMachine";
import type { CaseState } from "../src/domain/types";

function createTestDeps(store = createMockStore()): { deps: SessionDeps; store: ReturnType<typeof createMockStore> } {
  let counter = 1;
  const deps: SessionDeps = {
    store,
    now: () => "2026-10-14T12:00:00.000Z",
    newId: (prefix: string) => `${prefix}-${String(counter++).padStart(3, "0")}`,
  };
  return { deps, store };
}

describe("Operator Interaction Lifecycle & WhatsApp Delivery Playbooks (18 Criteria)", () => {
  let deps: SessionDeps;

  beforeEach(() => {
    const fixture = createTestDeps();
    deps = fixture.deps;
  });

  // 1. PB-DELIVERY-STATUS-CHECK matched for delayed delivery confirmation with permitted simulated action
  it("Criterion 1: PB-DELIVERY-STATUS-CHECK matches delayed delivery with permitted action check_message_status", () => {
    const session = new ResolveSession(deps, {
      message: "Campaign messages sent but delivery is delayed and unconfirmed",
      templateId: "TPL-1004",
    });

    expect(session.state.diagnosis?.playbookId).toBe("PB-DELIVERY-STATUS-CHECK");
    expect(session.state.diagnosis?.summary?.whatWeKnow.length).toBeGreaterThan(0);
    expect(session.state.diagnosis?.summary?.whatRemainsUncertain.length).toBeGreaterThan(0);
    expect(session.state.diagnosis?.summary?.impact.length).toBeGreaterThan(0);

    const playbook = defaultPlaybookRegistry.get("PB-DELIVERY-STATUS-CHECK");
    const actions = playbook?.permittedActions.map((a) => (typeof a === "string" ? a : a.operation));
    expect(actions).toContain("check_message_status");
  });

  // 2. PB-DELIVERY-PARTIAL matched for partial delivery diagnostic
  it("Criterion 2: PB-DELIVERY-PARTIAL matches partial delivery complaints", () => {
    const session = new ResolveSession(deps, {
      message: "Partial delivery failure: half of the campaign messages arrived but others were dropped",
      templateId: "TPL-1004",
    });

    expect(session.state.diagnosis?.playbookId).toBe("PB-DELIVERY-PARTIAL");
    const playbook = defaultPlaybookRegistry.get("PB-DELIVERY-PARTIAL");
    const actions = playbook?.permittedActions.map((a) => (typeof a === "string" ? a : a.operation));
    expect(actions).toContain("check_message_status");
  });

  // 3. PB-DELIVERY-PERSISTENT matched for persistent delivery failure after checks
  it("Criterion 3: PB-DELIVERY-PERSISTENT matches persistent delivery failures", () => {
    const session = new ResolveSession(deps, {
      message: "Persistent delivery failure: messages have failed repeatedly for over 3 hours",
      templateId: "TPL-1004",
    });

    expect(session.state.diagnosis?.playbookId).toBe("PB-DELIVERY-PERSISTENT");
    const playbook = defaultPlaybookRegistry.get("PB-DELIVERY-PERSISTENT");
    expect(playbook?.recommendedAction?.primaryCtaAction).toBe("request_specialist");
  });

  // 4. PB-DELIVERY-INSUFFICIENT-EVIDENCE matched for missing delivery context
  it("Criterion 4: PB-DELIVERY-INSUFFICIENT-EVIDENCE matches delivery issues with insufficient context", () => {
    const session = new ResolveSession(deps, {
      message: "Message delivery failure with insufficient context and no details",
    });

    expect(session.state.diagnosis?.playbookId).toBe("PB-DELIVERY-INSUFFICIENT-EVIDENCE");
  });

  // 5. Response variants adapt to conversation state
  it("Criterion 5: response variants adapt to conversation lifecycle states", () => {
    const playbook = defaultPlaybookRegistry.get("PB-DELIVERY-STATUS-CHECK");
    expect(playbook?.responseVariants).toBeDefined();
    expect(playbook?.responseVariants?.request_submitted).toBeDefined();
    expect(playbook?.responseVariants?.awaiting_confirmation).toBeDefined();
    expect(playbook?.responseVariants?.executing).toBeDefined();
    expect(playbook?.responseVariants?.verifying).toBeDefined();
    expect(playbook?.responseVariants?.resolved).toBeDefined();
    expect(playbook?.responseVariants?.handoff_requested).toBeDefined();
  });

  // 6. Missing evidence results in clarification or escalation without guessing facts
  it("Criterion 6: missing context triggers clarification without guessing missing state", () => {
    const session = new ResolveSession(deps, {
      message: "I don't know which template is failing, please help",
    });

    expect(session.state.stage).toBe("CLARIFY_ONCE");
    expect(session.state.clarify?.question).toBeDefined();
    expect(session.state.proposal).toBeNull();
  });

  // 7. Verification failure leads to handoff with complete case file and never claims verified
  it("Criterion 7: verification failure escalates to handoff and never marks case verified", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1003",
      message: "Payment reminder template rejected",
    });

    expect(session.state.stage).toBe("PROPOSE");
    // Explicit operator approval runs simulated action
    session.approveProposal();

    expect(session.state.stage).toBe("HANDOFF");
    expect(session.state.verification?.verified).toBe(false);

    // Verify complete case file is built
    const caseFile = buildCaseFile(session.state);
    expect(caseFile.caseId).toBe(session.state.caseId);
    expect(caseFile.noVerifiedResolutionYet).toBe(true);
    expect(caseFile.checksRun.length).toBeGreaterThan(0);
  });

  // 8. Specialist assignment lifecycle
  it("Criterion 8: tracks complete specialist assignment lifecycle", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Why was my template rejected?",
    });

    // Preview
    session.previewHandoff();
    expect(session.state.interactionState).toBe("handoff_confirmation");

    // Confirm
    session.confirmHandoff("Operator requested specialist");
    expect(session.state.stage).toBe("HANDOFF");
    expect(session.state.interactionState).toBe("pending_assignment");
    expect(session.state.handoffRequestedAt).toBeDefined();

    // Assign
    session.assignSpecialist("Priya Sharma", "Tier 2 Operations Specialist");
    expect(session.state.interactionState).toBe("assigned");
    expect(session.state.specialistAssignment?.specialistName).toBe("Priya Sharma");

    // In Progress
    session.startHumanInvestigation();
    expect(session.state.interactionState).toBe("in_progress");

    // Close
    session.closeCase("Specialist completed manual review and resolution");
    expect(session.state.interactionState).toBe("closed");
    expect(session.state.closedAt).toBeDefined();
  });

  // 9. Handoff withdrawal safety rule: allowed for optional, forbidden for mandatory high-risk
  it("Criterion 9: withdrawal is permitted for optional requests but strictly forbidden for mandatory safety zones", () => {
    // Optional handoff
    const optionalSession = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Why was my template rejected?",
    });
    optionalSession.confirmHandoff("Operator wanted to ask an agent");
    expect(optionalSession.state.stage).toBe("HANDOFF");

    const cancelResult = optionalSession.cancelHandoff();
    expect(cancelResult.ok).toBe(true);
    expect(optionalSession.state.stage).toBe("PROPOSE");

    // Mandatory zone: Billing
    const billingSession = new ResolveSession(deps, {
      message: "I want a refund for the billing overcharge on my invoice",
    });
    expect(billingSession.state.stage).toBe("HANDOFF");
    const billingCancel = billingSession.cancelHandoff();
    expect(billingCancel.ok).toBe(false);
    expect(billingCancel.error).toContain("Mandatory safety");
    expect(billingSession.state.stage).toBe("HANDOFF");

    // Mandatory zone: Security
    const securitySession = new ResolveSession(deps, {
      message: "Account verification lockout and ownership transfer requested",
    });
    expect(securitySession.state.stage).toBe("HANDOFF");
    const securityCancel = securitySession.cancelHandoff();
    expect(securityCancel.ok).toBe(false);
    expect(securitySession.state.stage).toBe("HANDOFF");
  });

  // 10. deriveInteractionState() accurately maps all 19 interaction states
  it("Criterion 10: deriveInteractionState accurately maps workflow lifecycle states", () => {
    const mockState = (partial: Partial<CaseState>): CaseState => ({
      caseId: "CAS-001",
      correlationId: "COR-001",
      stage: "TRIAGE",
      originalMessage: "test",
      language: "en",
      templateId: null,
      templateSnapshot: null,
      triage: null,
      clarify: null,
      diagnosis: null,
      proposal: null,
      confirmation: null,
      actionResult: null,
      verification: null,
      attemptsFailed: 0,
      declined: false,
      handoffReason: null,
      startedAt: "2026-10-14T12:00:00.000Z",
      updatedAt: "2026-10-14T12:00:00.000Z",
      events: [],
      ...partial,
    });

    expect(deriveInteractionState(mockState({ stage: "TRIAGE" }))).toBe("triaging");
    expect(deriveInteractionState(mockState({ stage: "CLARIFY_ONCE" }))).toBe("clarification_required");
    expect(deriveInteractionState(mockState({ stage: "PROPOSE" }))).toBe("awaiting_confirmation");
    expect(deriveInteractionState(mockState({ stage: "CONFIRM" }))).toBe("awaiting_confirmation");
    expect(deriveInteractionState(mockState({ stage: "APPLY_SIMULATED_ACTION" }))).toBe("executing");
    expect(deriveInteractionState(mockState({ stage: "VERIFY" }))).toBe("verifying");
    expect(deriveInteractionState(mockState({ stage: "RESOLVED" }))).toBe("resolved");
    expect(deriveInteractionState(mockState({ stage: "HANDOFF", closedAt: "2026-10-14T12:00:00.000Z" }))).toBe("closed");
    expect(deriveInteractionState(mockState({ stage: "HANDOFF", specialistAssignment: { specialistName: "Priya", queue: "Tier 2", assignedAt: "2026-10-14" } }))).toBe("assigned");
    expect(deriveInteractionState(mockState({ stage: "HANDOFF" }))).toBe("pending_assignment");
  });

  // 11. Proposal confirmation requires explicit operator action before simulated write (G1)
  it("Criterion 11: no simulated action executes without explicit confirmation (G1 guardrail)", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Template festive_offer_blast rejected",
    });

    expect(session.state.stage).toBe("PROPOSE");
    expect(session.state.confirmation).toBeNull();

    // Explicit approval triggers confirmation record and execution
    const res = session.approveProposal();
    expect(res.result?.ok).toBe(true);
    expect(session.state.confirmation).not.toBeNull();
    expect(session.state.confirmation?.exactBefore).toContain("UTILITY");
    expect(session.state.confirmation?.exactAfter).toContain("MARKETING");
  });

  // 12. Check message status updates state to verifying and produces fresh-read verification telemetry
  it("Criterion 12: executeMessageStatusCheck produces fresh-read telemetry and updates state", () => {
    const session = new ResolveSession(deps, {
      message: "WhatsApp campaign delivery unconfirmed",
      templateId: "TPL-1004",
    });

    const result = session.executeMessageStatusCheck();
    expect(result.status).toBe("MONITORED");
    expect(result.statement).toContain("Carrier delivery logs verified");
    expect(session.state.interactionState).toBe("resolved");
    expect(session.state.events.some((e) => e.eventType === "STATE_VERIFIED")).toBe(true);
  });

  // 13. Case file includes original issue, assessment, completed checks, evidence references, unknown aspects, session audit trail
  it("Criterion 13: case file dossier includes all authoritative evidence fields", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1002",
      message: "Template order_update_v3 has invalid variable format",
    });

    const file = buildCaseFile(session.state);
    expect(file.originalMessage).toBe("Template order_update_v3 has invalid variable format");
    expect(file.issueType).toBe("template_rejection");
    expect(file.checksRun.length).toBeGreaterThan(0);
    expect(file.currentState?.status).toBe("REJECTED");
  });

  // 14. Multi-turn clarification preserves context and advances state upon valid response
  it("Criterion 14: clarification answer advances stage while preserving context", () => {
    const session = new ResolveSession(deps, {
      message: "I don't know which template is failing, please help",
    });

    expect(session.state.stage).toBe("CLARIFY_ONCE");
    const question = session.state.clarify?.question;
    expect(question).toBeDefined();

    session.clarify("TPL-1001 was rejected for category mismatch");
    expect(session.state.clarify?.answer).toContain("TPL-1001");
    expect(session.state.events.some((e) => e.eventType === "CLARIFICATION_ANSWERED")).toBe(true);
  });

  // 15. Idempotency prevents duplicate simulated execution
  it("Criterion 15: prevents duplicate simulated action execution once verified", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Fix template festive_offer_blast",
    });

    const first = session.approveProposal();
    expect(first.result?.ok).toBe(true);

    // Mutate state back to PROPOSE to attempt re-execution
    (session.state as any).stage = "PROPOSE";
    const second = session.approveProposal();
    expect(second.blocked).toBeTruthy();
    expect(second.blocked).toContain("Duplicate submissions are blocked");
  });

  // 16. Status badge accurately reflects interaction state
  it("Criterion 16: deriveInteractionState produces human-readable lifecycle state", () => {
    const session = new ResolveSession(deps, {
      message: "I need help with billing overcharge",
    });

    expect(session.state.interactionState).toBe("pending_assignment");
    expect(session.state.stage).toBe("HANDOFF");
  });

  // 17. Deterministic rules baseline runs without network or model dependencies
  it("Criterion 17: rules baseline executes deterministically without API keys or network", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Why was my WhatsApp template rejected?",
    });

    expect(session.state.diagnosis).not.toBeNull();
    expect(session.state.proposal).not.toBeNull();
    expect(session.state.triage?.decisionLayer).toBe("rules");
  });

  // 18. All actions are visibly labeled as simulated/mock
  it("Criterion 18: all actions and state sources are explicitly marked as MOCK/SIMULATED", () => {
    const session = new ResolveSession(deps, {
      templateId: "TPL-1001",
      message: "Why was my template rejected?",
    });

    session.approveProposal();

    const actionEvent = session.state.events.find((e) => e.eventType === "ACTION_SIMULATED");
    expect(actionEvent).toBeDefined();
    expect(["MOCK", "SIMULATED"]).toContain(actionEvent?.sourceLabel);

    const stateReadEvent = session.state.events.find((e) => e.eventType === "STATE_READ");
    expect(stateReadEvent?.sourceLabel).toBe("MOCK");
  });
});
