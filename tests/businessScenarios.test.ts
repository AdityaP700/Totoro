import { describe, it, expect, beforeEach } from "vitest";
import { createMockStore } from "../src/domain/mockStore";
import { ResolveSession } from "../src/domain/stateMachine";
import type { SessionDeps } from "../src/domain/stateMachine";
import { runConversationTurn } from "../src/domain/conversationGraph";

function createTestDeps(store = createMockStore()): { deps: SessionDeps; store: ReturnType<typeof createMockStore> } {
  let counter = 1;
  const deps: SessionDeps = {
    store,
    now: () => "2026-10-15T12:00:00.000Z",
    newId: (prefix: string) => `${prefix}-${String(counter++).padStart(3, "0")}`,
  };
  return { deps, store };
}

describe("Operational Business Scenarios Evaluation Suite (12 Multi-Turn Scenarios)", () => {
  let deps: SessionDeps;

  beforeEach(() => {
    const fixture = createTestDeps();
    deps = fixture.deps;
  });

  // ==========================================================================
  // Scenario F1: Founder Context & Date Range Correction
  // ==========================================================================
  it("F1: handles founder metrics inquiry, discloses financial DB limitation, and updates date range with fact correction", async () => {
    const session = new ResolveSession(deps, {
      message: "Why did our conversion rate drop so much this week?",
    });

    // Turn 1: Initial conversion inquiry
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-F1",
      message: "Why did our conversion rate drop so much this week?",
      history: [{ role: "user", text: "Why did our conversion rate drop so much this week?" }],
      session,
    });

    expect(turn1.status).toBe("data_analyzed");
    expect(turn1.response).toContain("LIMITATION");
    expect(turn1.response).toContain("live production database");
    expect(session.state.businessContext?.domain).toBe("founder_metrics");
    expect(session.state.businessContext?.entities.topic).toBe("conversion_rate_drop");

    // Turn 2: Fact correction from "this week" to "Oct 1 to Oct 7"
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-F1",
      message: "Actually, I meant from Oct 1 to Oct 7, not this week.",
      history: [
        { role: "user", text: "Why did our conversion rate drop so much this week?" },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Actually, I meant from Oct 1 to Oct 7, not this week." },
      ],
      session,
    });

    expect(turn2.status).toBe("data_analyzed");
    expect(turn2.headline).toContain("Date Range Corrected: Oct 1 to Oct 7");
    expect(session.state.businessContext?.entities.dateRange).toBe("Oct 1 to Oct 7");
    expect(session.state.businessContext?.invalidatedConclusions.length).toBeGreaterThan(0);
    expect(session.state.businessContext?.invalidatedConclusions[0]).toContain("dateRange");
    expect(turn2.response).toContain("invalidated");
    expect(turn2.response).toContain("LIMITATION");
  });

  // ==========================================================================
  // Scenario F0: Founder 4-Turn Revenue Drop Reproduction (Live User Journey)
  // ==========================================================================
  it("F0: handles 4-turn revenue-drop journey routing all 4 turns to analyze_data without human handoff or support triage leakage", async () => {
    const session = new ResolveSession(deps, {
      message: "Our revenue dropped this week. Help me figure out why.",
    });

    const routeHistory: string[] = [];

    // Turn 1: Revenue dropped inquiry
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-F0",
      message: "Our revenue dropped this week. Help me figure out why.",
      history: [{ role: "user", text: "Our revenue dropped this week. Help me figure out why." }],
      session,
    });
    routeHistory.push(turn1.route || "unknown");

    expect(turn1.route).toBe("analyze_data");
    expect(turn1.status).toBe("data_analyzed");
    expect(turn1.response).toContain("LIMITATION");
    expect(turn1.response).toContain("Traffic / Volume");
    expect(turn1.response).toContain("Conversion Funnel");
    expect(turn1.response).toContain("Average Order Value");
    expect(turn1.response).toContain("Payment Failures & Refunds");
    expect(session.state.businessContext?.domain).toBe("founder_metrics");
    expect(session.state.stage).toBe("RESOLVED");
    expect(session.state.clarify).toBeNull();
    expect(session.state.handoffReason).toBeNull();
    expect(session.state.specialistAssignment).toBeNull();

    // Turn 2: Compare October 1–7 with October 8–14
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-F0",
      message: "Compare October 1–7 with October 8–14.",
      history: [
        { role: "user", text: "Our revenue dropped this week. Help me figure out why." },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Compare October 1–7 with October 8–14." },
      ],
      session,
    });
    routeHistory.push(turn2.route || "unknown");

    expect(turn2.route).toBe("analyze_data");
    expect(turn2.status).toBe("data_analyzed");
    expect(session.state.businessContext?.entities.comparisonPeriod).toContain("October 1–7");
    expect(session.state.businessContext?.invalidatedConclusions.length).toBeGreaterThan(0);
    expect(session.state.stage).toBe("RESOLVED");
    expect(turn2.response).toContain("LIMITATION");

    // Turn 3: What data do you need to confirm the cause?
    const turn3 = await runConversationTurn({
      sessionId: "SES-TEST-F0",
      message: "What data do you need to confirm the cause?",
      history: [
        { role: "user", text: "Our revenue dropped this week. Help me figure out why." },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Compare October 1–7 with October 8–14." },
        { role: "assistant", text: turn2.response },
        { role: "user", text: "What data do you need to confirm the cause?" },
      ],
      session,
    });
    routeHistory.push(turn3.route || "unknown");

    expect(turn3.route).toBe("analyze_data");
    expect(turn3.status).toBe("data_analyzed");
    expect(turn3.headline).toContain("Required Data to Confirm Revenue Drop Cause");
    expect(turn3.response).toContain("Daily Revenue & Order Volume");
    expect(turn3.response).toContain("Traffic & Funnel Conversion");
    expect(turn3.response).toContain("Average Order Value (AOV)");
    expect(turn3.response).toContain("Payment Processing & Refunds");
    expect(turn3.response).toContain("LIMITATION");
    expect(session.state.stage).toBe("RESOLVED");

    // Turn 4: We don't have production database access connected yet.
    const turn4 = await runConversationTurn({
      sessionId: "SES-TEST-F0",
      message: "We don't have production database access connected yet. What can you conclude from what you have?",
      history: [
        { role: "user", text: "Our revenue dropped this week. Help me figure out why." },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Compare October 1–7 with October 8–14." },
        { role: "assistant", text: turn2.response },
        { role: "user", text: "What data do you need to confirm the cause?" },
        { role: "assistant", text: turn3.response },
        { role: "user", text: "We don't have production database access connected yet. What can you conclude from what you have?" },
      ],
      session,
    });
    routeHistory.push(turn4.route || "unknown");

    expect(turn4.route).toBe("analyze_data");
    expect(turn4.status).toBe("data_analyzed");
    expect(turn4.headline).toContain("Known Facts vs. Unknowns");
    expect(turn4.response).toContain("What We Know [REPORTED / DOCUMENTED]");
    expect(turn4.response).toContain("What Remains Unknown [UNKNOWN]");
    expect(turn4.response).toContain("LIMITATION");
    expect(session.state.stage).toBe("RESOLVED");
    expect(session.state.handoffReason).toBeNull();
    expect(session.state.specialistAssignment).toBeNull();

    // Verify all 4 turns routed to analyze_data
    expect(routeHistory).toEqual([
      "analyze_data",
      "analyze_data",
      "analyze_data",
      "analyze_data",
    ]);
  });

  // ==========================================================================
  // Scenario F2: Founder Dynamic Task Prioritization
  // ==========================================================================
  it("F2: dynamically re-ranks 3 tasks when a time-sensitive expiration constraint is added", async () => {
    const session = new ResolveSession(deps, {
      message: "Help me prioritize these 3 tasks: 1. Fix checkout drop-off, 2. Enterprise lead follow-up, 3. Pitch deck updates",
    });

    // Turn 1: Initial prioritization
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-F2",
      message: "Help me prioritize these 3 tasks: 1. Fix checkout drop-off, 2. Enterprise lead follow-up, 3. Pitch deck updates",
      history: [
        {
          role: "user",
          text: "Help me prioritize these 3 tasks: 1. Fix checkout drop-off, 2. Enterprise lead follow-up, 3. Pitch deck updates",
        },
      ],
      session,
    });

    expect(turn1.status).toBe("plan_prioritized");
    expect(session.state.businessContext?.entities.rank1).toBe("Fix checkout drop-off");
    expect(session.state.businessContext?.entities.rank2).toBe("Enterprise lead follow-up");
    expect(session.state.businessContext?.entities.rank3).toBe("Pitch deck updates");

    // Turn 2: Urgent constraint added
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-F2",
      message: "The enterprise lead expires in 2 hours.",
      history: [
        {
          role: "user",
          text: "Help me prioritize these 3 tasks: 1. Fix checkout drop-off, 2. Enterprise lead follow-up, 3. Pitch deck updates",
        },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "The enterprise lead expires in 2 hours." },
      ],
      session,
    });

    expect(turn2.status).toBe("plan_prioritized");
    expect(session.state.businessContext?.activeConstraints["enterprise_lead_expiry"]).toBe("2 hours");
    expect(session.state.businessContext?.entities.rank1).toBe("Enterprise lead follow-up");
    expect(session.state.businessContext?.entities.rank2).toBe("Fix checkout drop-off");
    expect(session.state.businessContext?.entities.rank3).toBe("Pitch deck updates");
    expect(turn2.response).toContain("URGENT");
    expect(turn2.response).toContain("2 hours");
  });

  // ==========================================================================
  // Scenario S1: Salesperson Drafting vs Sending Capability Boundary
  // ==========================================================================
  it("S1: drafts follow-up email, refuses fake sending, explains outbound email is not connected, and preserves draft", async () => {
    const session = new ResolveSession(deps, {
      message: "Draft a follow-up email to Acme Corp about the proposal we sent on Tuesday.",
    });

    // Turn 1: Draft request
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-S1",
      message: "Draft a follow-up email to Acme Corp about the proposal we sent on Tuesday.",
      history: [
        {
          role: "user",
          text: "Draft a follow-up email to Acme Corp about the proposal we sent on Tuesday.",
        },
      ],
      session,
    });

    expect(turn1.status).toBe("draft_generated");
    expect(session.state.businessContext?.domain).toBe("sales_crm");
    expect(session.state.businessContext?.pendingDraft).toBeDefined();
    expect(session.state.businessContext?.pendingDraft?.type).toBe("email");
    expect(session.state.businessContext?.pendingDraft?.recipient).toBe("Acme Corp");
    expect(session.state.businessContext?.pendingDraft?.status).toBe("drafted_for_review");

    // Turn 2: Request to send
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-S1",
      message: "Looks good, send it right now.",
      history: [
        {
          role: "user",
          text: "Draft a follow-up email to Acme Corp about the proposal we sent on Tuesday.",
        },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Looks good, send it right now." },
      ],
      session,
    });

    expect(turn2.headline).toContain("Capability Boundary: Outbound Email Disconnected");
    expect(turn2.response).toContain("cannot send this email");
    expect(turn2.response).toContain("SMTP integration configured");
    expect(session.state.businessContext?.unsupportedCapabilitiesAttempted).toContain("send_email");
    // Draft must remain preserved
    expect(session.state.businessContext?.pendingDraft?.status).toBe("drafted_for_review");
    expect(session.state.businessContext?.pendingDraft?.recipient).toBe("Acme Corp");
  });

  // ==========================================================================
  // Scenario S2: Salesperson Objection + Budget Constraint Adaptation
  // ==========================================================================
  it("S2: provides pricing objection strategy and adapts commercial proposal to $500/mo budget ceiling", async () => {
    const session = new ResolveSession(deps, {
      message: "The prospect says our tier is too expensive compared to Competitor X.",
    });

    // Turn 1: Objection handling
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-S2",
      message: "The prospect says our tier is too expensive compared to Competitor X.",
      history: [
        { role: "user", text: "The prospect says our tier is too expensive compared to Competitor X." },
      ],
      session,
    });

    expect(turn1.status).toBe("data_analyzed");
    expect(turn1.headline).toContain("Pricing Objection Strategy");
    expect(session.state.businessContext?.entities.objectionType).toBe("price_vs_competitor_x");

    // Turn 2: Budget ceiling constraint
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-S2",
      message: "They have a strict budget ceiling of $500/month.",
      history: [
        { role: "user", text: "The prospect says our tier is too expensive compared to Competitor X." },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "They have a strict budget ceiling of $500/month." },
      ],
      session,
    });

    expect(turn2.status).toBe("data_analyzed");
    expect(turn2.headline).toContain("Proposal Adapted: $500/mo Budget Ceiling");
    expect(session.state.businessContext?.activeConstraints["budget_ceiling"]).toBe("$500/month");
    expect(turn2.response).toContain("5-Seat Starter Package");
    expect(turn2.response).toContain("$500");
  });

  // ==========================================================================
  // Scenario M1: Manager Evidence Synthesis
  // ==========================================================================
  it("M1: synthesizes progress strictly from reported facts without guessing completion date", async () => {
    const session = new ResolveSession(deps, {
      message: "API migration is at 80% done, but QA is currently blocked on the auth staging environment. What's our status?",
    });

    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-M1",
      message: "API migration is at 80% done, but QA is currently blocked on the auth staging environment. What's our status?",
      history: [
        {
          role: "user",
          text: "API migration is at 80% done, but QA is currently blocked on the auth staging environment. What's our status?",
        },
      ],
      session,
    });

    expect(turn1.status).toBe("data_analyzed");
    expect(turn1.headline).toContain("Status Summary: API Migration & QA Blocker");
    expect(turn1.response).toContain("80% complete [REPORTED]");
    expect(turn1.response).toContain("blocked on the auth staging environment [REPORTED]");
    expect(turn1.response).toContain("Cannot be estimated until the auth staging blocker is resolved [UNKNOWN]");
    expect(session.state.businessContext?.entities.apiMigrationProgress).toBe("80%");
    expect(session.state.businessContext?.entities.qaStatus).toBe("blocked_on_auth_staging");
  });

  // ==========================================================================
  // Scenario M2: Manager Dependency Update
  // ==========================================================================
  it("M2: reports zero initial blockers, then accurately logs new frontend-backend dependency", async () => {
    const session = new ResolveSession(deps, {
      message: "Are there any blockers logged for the mobile release?",
    });

    // Turn 1: Blocker check
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-M2",
      message: "Are there any blockers logged for the mobile release?",
      history: [{ role: "user", text: "Are there any blockers logged for the mobile release?" }],
      session,
    });

    expect(turn1.response).toContain("no blockers logged in the project registry");

    // Turn 2: New dependency reported
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-M2",
      message: "Actually, frontend is waiting on the backend user profile endpoint.",
      history: [
        { role: "user", text: "Are there any blockers logged for the mobile release?" },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Actually, frontend is waiting on the backend user profile endpoint." },
      ],
      session,
    });

    expect(turn2.headline).toContain("Dependency Logged");
    expect(turn2.response).toContain("waiting on the backend user profile endpoint [REPORTED]");
    expect(session.state.businessContext?.entities.mobileReleaseBlocker).toContain("user profile endpoint");
  });

  // ==========================================================================
  // Scenario W1: Freelancer Drafting Boundary
  // ==========================================================================
  it("W1: drafts polite reminder for overdue invoice INV-204 and enforces dispatch capability boundary", async () => {
    const session = new ResolveSession(deps, {
      message: "Write a polite reminder for overdue invoice INV-204 for $1,200.",
    });

    // Turn 1: Draft reminder
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-W1",
      message: "Write a polite reminder for overdue invoice INV-204 for $1,200.",
      history: [
        { role: "user", text: "Write a polite reminder for overdue invoice INV-204 for $1,200." },
      ],
      session,
    });

    expect(turn1.status).toBe("draft_generated");
    expect(turn1.headline).toContain("INV-204");
    expect(session.state.businessContext?.pendingDraft?.type).toBe("reminder");
    expect(session.state.businessContext?.entities.invoiceId).toBe("INV-204");
    expect(session.state.businessContext?.entities.amount).toBe("$1,200");

    // Turn 2: Dispatch request
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-W1",
      message: "Send this to the client right now.",
      history: [
        { role: "user", text: "Write a polite reminder for overdue invoice INV-204 for $1,200." },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Send this to the client right now." },
      ],
      session,
    });

    expect(turn2.headline).toContain("Capability Boundary: Direct Dispatch Disconnected");
    expect(turn2.response).toContain("cannot send this reminder directly to your client");
    expect(session.state.businessContext?.unsupportedCapabilitiesAttempted).toContain("send_external_invoice");
  });

  // ==========================================================================
  // Scenario W2: Freelancer Fact Correction
  // ==========================================================================
  it("W2: records Net 30 payment terms, then updates to Net 15 and invalidates Net 30 schedule", async () => {
    const session = new ResolveSession(deps, {
      message: "Client contract for Project Alpha is on Net 30 terms.",
    });

    // Turn 1: Log Net 30
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-W2",
      message: "Client contract for Project Alpha is on Net 30 terms.",
      history: [{ role: "user", text: "Client contract for Project Alpha is on Net 30 terms." }],
      session,
    });

    expect(turn1.response).toContain("Net 30 payment terms [REPORTED]");
    expect(session.state.businessContext?.entities.paymentTerms).toBe("Net 30");

    // Turn 2: Fact correction to Net 15
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-W2",
      message: "Correction: Project Alpha is actually Net 15, not Net 30.",
      history: [
        { role: "user", text: "Client contract for Project Alpha is on Net 30 terms." },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Correction: Project Alpha is actually Net 15, not Net 30." },
      ],
      session,
    });

    expect(turn2.headline).toContain("Terms Corrected: Project Alpha (Net 15)");
    expect(session.state.businessContext?.entities.paymentTerms).toBe("Net 15");
    expect(session.state.businessContext?.invalidatedConclusions.length).toBeGreaterThan(0);
    expect(turn2.response).toContain("invalidated");
  });

  // ==========================================================================
  // Scenario O1: Operations Carrier Telemetry Limitation & Evidence
  // ==========================================================================
  it("O1: discloses carrier telemetry limitation, then incorporates ORD-901 and ORD-902 hub hold evidence", async () => {
    const session = new ResolveSession(deps, {
      message: "Why are our dispatches delayed today?",
    });

    // Turn 1: Delay inquiry
    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-O1",
      message: "Why are our dispatches delayed today?",
      history: [{ role: "user", text: "Why are our dispatches delayed today?" }],
      session,
    });

    expect(turn1.headline).toContain("Carrier Telemetry Limitation");
    expect(turn1.response).toContain("LIMITATION");
    expect(turn1.response).toContain("real-time telemetry or GPS connectivity");

    // Turn 2: Provide tracking details
    const turn2 = await runConversationTurn({
      sessionId: "SES-TEST-O1",
      message: "Shipments ORD-901 and ORD-902 are stuck at the north hub.",
      history: [
        { role: "user", text: "Why are our dispatches delayed today?" },
        { role: "assistant", text: turn1.response },
        { role: "user", text: "Shipments ORD-901 and ORD-902 are stuck at the north hub." },
      ],
      session,
    });

    expect(turn2.headline).toContain("Carrier Hub Hold: ORD-901 & ORD-902");
    expect(turn2.response).toContain("North Hub [REPORTED]");
    expect(session.state.businessContext?.entities.delayedOrders).toBe("ORD-901, ORD-902");
    expect(session.state.businessContext?.entities.location).toBe("North Hub");
  });

  // ==========================================================================
  // Scenario O2: Operations Inventory Uncertainty
  // ==========================================================================
  it("O2: flags 30-unit discrepancy between ledger and physical count without guessing ground truth", async () => {
    const session = new ResolveSession(deps, {
      message: "The warehouse ledger says we have 150 units of SKU-A, but physical count only found 120.",
    });

    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-O2",
      message: "The warehouse ledger says we have 150 units of SKU-A, but physical count only found 120.",
      history: [
        {
          role: "user",
          text: "The warehouse ledger says we have 150 units of SKU-A, but physical count only found 120.",
        },
      ],
      session,
    });

    expect(turn1.status).toBe("data_analyzed");
    expect(turn1.headline).toContain("Inventory Discrepancy: SKU-A (30 Units Variance)");
    expect(turn1.response).toContain("Ground truth inventory is UNCERTAIN");
    expect(session.state.businessContext?.entities.variance).toBe("-30");
    expect(turn1.response).toContain("Freeze automated order allocations");
  });

  // ==========================================================================
  // Scenario C1: Customer Support G8 Two-Attempt Escalation Rule
  // ==========================================================================
  it("C1: applies G8 threshold on two prior failed recovery attempts and escalates to specialist with dossier", async () => {
    const session = new ResolveSession(deps, {
      message: "I already cleared cache and re-synced credentials. The error is still happening for the third time.",
    });
    session.state.attemptsFailed = 2;

    const turn1 = await runConversationTurn({
      sessionId: "SES-TEST-C1",
      message: "I already cleared cache and re-synced credentials. The error is still happening for the third time.",
      history: [
        {
          role: "user",
          text: "I already cleared cache and re-synced credentials. The error is still happening for the third time.",
        },
      ],
      session,
    });

    expect(turn1.status).toBe("handoff_completed");
    expect(turn1.headline).toContain("Escalated to Engineering Specialist (G8 Rule)");
    expect(turn1.response).toContain("G8: two failed recovery attempts");
    expect(turn1.response).toContain("transferred to an engineering specialist");
    expect(session.state.stage).toBe("HANDOFF");
    expect(session.state.completedChecks).toContain("resync_credentials");
  });

  // ==========================================================================
  // Scenario X1: Cross-Session Isolation (Interleaved Execution)
  // ==========================================================================
  it("X1: maintains 100% state and memory isolation between two interleaved concurrent sessions", async () => {
    const sessionA = new ResolveSession(deps, {
      message: "Why did our conversion rate drop so much this week?",
    });
    const sessionB = new ResolveSession(deps, {
      message: "Draft a follow-up email to Acme Corp about the proposal we sent on Tuesday.",
    });

    // 1. Session A turn 1
    const resA1 = await runConversationTurn({
      sessionId: "SES-ISO-A",
      message: "Why did our conversion rate drop so much this week?",
      history: [{ role: "user", text: "Why did our conversion rate drop so much this week?" }],
      session: sessionA,
    });

    // 2. Session B turn 1 (interleaved)
    const resB1 = await runConversationTurn({
      sessionId: "SES-ISO-B",
      message: "Draft a follow-up email to Acme Corp about the proposal we sent on Tuesday.",
      history: [
        {
          role: "user",
          text: "Draft a follow-up email to Acme Corp about the proposal we sent on Tuesday.",
        },
      ],
      session: sessionB,
    });

    // 3. Session A turn 2 (interleaved)
    const resA2 = await runConversationTurn({
      sessionId: "SES-ISO-A",
      message: "Actually, I meant from Oct 1 to Oct 7, not this week.",
      history: [
        { role: "user", text: "Why did our conversion rate drop so much this week?" },
        { role: "assistant", text: resA1.response },
        { role: "user", text: "Actually, I meant from Oct 1 to Oct 7, not this week." },
      ],
      session: sessionA,
    });

    // 4. Session B turn 2 (interleaved)
    const resB2 = await runConversationTurn({
      sessionId: "SES-ISO-B",
      message: "Looks good, send it right now.",
      history: [
        {
          role: "user",
          text: "Draft a follow-up email to Acme Corp about the proposal we sent on Tuesday.",
        },
        { role: "assistant", text: resB1.response },
        { role: "user", text: "Looks good, send it right now." },
      ],
      session: sessionB,
    });

    // Verifications on Session A
    expect(sessionA.state.businessContext?.domain).toBe("founder_metrics");
    expect(sessionA.state.businessContext?.entities.dateRange).toBe("Oct 1 to Oct 7");
    expect(sessionA.state.businessContext?.entities.recipient).toBeUndefined();
    expect(sessionA.state.businessContext?.pendingDraft).toBeUndefined();
    expect(resA2.response).not.toContain("Acme Corp");
    expect(resA2.response).not.toContain("email");

    // Verifications on Session B
    expect(sessionB.state.businessContext?.domain).toBe("sales_crm");
    expect(sessionB.state.businessContext?.entities.recipient).toBe("Acme Corp");
    expect(sessionB.state.businessContext?.pendingDraft?.recipient).toBe("Acme Corp");
    expect(sessionB.state.businessContext?.entities.dateRange).toBeUndefined();
    expect(resB2.response).not.toContain("conversion rate");
    expect(resB2.response).not.toContain("Oct 1 to Oct 7");
  });
});
