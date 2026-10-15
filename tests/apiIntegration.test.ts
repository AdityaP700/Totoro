import { describe, it, expect, beforeEach } from "vitest";
import { POST as resolvePost } from "../frontend/src/app/api/resolve/route";
import { POST as actionPost } from "../frontend/src/app/api/action/route";
import { GET as sessionGet, DELETE as sessionDelete } from "../frontend/src/app/api/session/route";
import { GET as historyGet } from "../frontend/src/app/api/history/route";
import { GET as templatesGet } from "../frontend/src/app/api/templates/route";
import { resetAllSessions, getSession } from "../frontend/src/lib/server/sessionRegistry";
import { repositories } from "../frontend/src/lib/server/persistence";

function makeJsonRequest(url: string, body?: any, method: string = "POST"): Request {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  });
}

describe("Cheerio Resolve — UI API Integration Suite", () => {
  beforeEach(() => {
    resetAllSessions();
  });

  // 1. Normal customer query
  it("processes a normal customer query and returns structured diagnosis", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/resolve", {
      message: "Why was my WhatsApp template rejected with a promotional classification error?",
      templateId: "TPL-1001",
    });

    const res = await resolvePost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.sessionId).toBeDefined();
    expect(data.caseId).toBeDefined();
    expect(data.stage).toBe("PROPOSE");
    expect(data.triage.issueType).toBe("template_rejection");
    expect(data.customerExplanation.headline).toBeDefined();
    expect(data.proposal).not.toBeNull();
    expect(data.proposal.operation).toBe("resubmit_template");
    expect(data.events.length).toBeGreaterThan(0);
  });

  // 2. Ambiguous query requiring clarification
  it("handles an ambiguous query and asks exactly one clarifying question", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/resolve", {
      message: "Nothing is working, please help me fix it",
    });

    const res = await resolvePost(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.stage).toBe("CLARIFY_ONCE");
    expect(data.clarificationQuestion).toBeDefined();
    expect(data.clarificationQuestion).toContain("Which feature is affected");

    // Answering clarification in the same session
    const clarifyReq = makeJsonRequest("http://localhost:3000/api/resolve", {
      sessionId: data.sessionId,
      message: "It is a WhatsApp template that was rejected with format error",
    });

    const clarifyRes = await resolvePost(clarifyReq);
    expect(clarifyRes.status).toBe(200);
    const clarifyData = await clarifyRes.json();
    expect(clarifyData.stage).toBe("PROPOSE");
  });

  // 3. Supported template rejection scenario (TPL-1001)
  it("matches playbook and constructs exact before/after change for TPL-1001", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/resolve", {
      message: "Template festive_offer_blast was rejected by provider",
      templateId: "TPL-1001",
    });

    const res = await resolvePost(req);
    const data = await res.json();

    expect(data.stage).toBe("PROPOSE");
    expect(data.proposal.changes).toEqual([
      {
        field: "category",
        before: "UTILITY",
        after: "MARKETING",
        reason: "Content is promotional; MARKETING is the truthful category.",
      },
    ]);
  });

  // 4. Explicit human request
  it("routes immediately to human handoff with context when human is requested", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/resolve", {
      message: "I need to speak with a human agent right now, don't give me automated answers",
    });

    const res = await resolvePost(req);
    const data = await res.json();

    expect(data.stage).toBe("HANDOFF");
    expect(data.triage.needsHuman).toBe(true);
    expect(data.handoffReason).toContain("human handling");
  });

  // 5. Sensitive billing or security request
  it("enforces human-led zone for billing and account ownership", async () => {
    const req = makeJsonRequest("http://localhost:3000/api/resolve", {
      message: "I was overcharged for my last messaging invoice and need an immediate refund",
    });

    const res = await resolvePost(req);
    const data = await res.json();

    expect(data.stage).toBe("HANDOFF");
    expect(data.triage.issueType).toBe("billing_refund");
    expect(data.triage.needsHuman).toBe(true);
  });

  // 6. Approved mock action with successful verification (TPL-1001)
  it("approves mock action, executes simulated write, and verifies fresh state", async () => {
    // Step 1: Diagnose
    const resolveRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Fix template festive_offer_blast rejection",
        templateId: "TPL-1001",
      })
    );
    const resolveData = await resolveRes.json();
    const sessionId = resolveData.sessionId;

    // Step 2: Approve Action
    const actionRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId,
        action: "approve",
        idempotencyKey: `TEST-KEY-${Date.now()}`,
      })
    );

    expect(actionRes.status).toBe(200);
    const actionData = await actionRes.json();
    expect(actionData.isVerified).toBe(true);
    expect(actionData.stage).toBe("PENDING");
    expect(actionData.templateAfter.category).toBe("MARKETING");
    expect(actionData.templateAfter.status).toBe("PENDING");
  });

  // 7. Action rejected because state changed (before/after mismatch)
  it("rejects action if template state changes before approval is executed", async () => {
    const resolveRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Fix template festive_offer_blast",
        templateId: "TPL-1001",
      })
    );
    const resolveData = await resolveRes.json();
    const record = getSession(resolveData.sessionId)!;

    // Simulate concurrent out-of-band state mutation in store
    record.store.updateTemplate("TPL-1001", (t) => {
      t.category = "AUTHENTICATION";
    });

    // Attempt to execute proposal formulated against the old category
    const actionRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId: resolveData.sessionId,
        action: "approve",
      })
    );

    expect(actionRes.status).toBe(200);
    const actionData = await actionRes.json();
    expect(actionData.stage).toBe("HANDOFF");
    expect(actionData.isVerified).toBe(false);
  });

  // 8. Invalid or duplicate confirmation (idempotency key protection)
  it("blocks duplicate submission with the same idempotency key (G11)", async () => {
    const resolveRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Fix template festive_offer_blast",
        templateId: "TPL-1001",
      })
    );
    const resolveData = await resolveRes.json();
    const sessionId = resolveData.sessionId;
    const testKey = "IDEMP-DUPLICATE-TEST-KEY";

    // First execution
    const firstActionRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId,
        action: "approve",
        idempotencyKey: testKey,
      })
    );
    expect(firstActionRes.status).toBe(200);

    // Duplicate submission
    const duplicateRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId,
        action: "approve",
        idempotencyKey: testKey,
      })
    );

    const dupData = await duplicateRes.json();
    expect(dupData.blocked || dupData.error).toBeDefined();
  });

  // 9. Isolated second session
  it("ensures two distinct sessions maintain completely isolated mock stores", async () => {
    // Session A
    const resA = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Fix template for Session A",
        templateId: "TPL-1001",
      })
    );
    const dataA = await resA.json();

    // Session B
    const resB = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Fix template for Session B",
        templateId: "TPL-1001",
      })
    );
    const dataB = await resB.json();

    expect(dataA.sessionId).not.toBe(dataB.sessionId);

    // Approve in Session A
    await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId: dataA.sessionId,
        action: "approve",
      })
    );

    // Verify Session A store was mutated
    const recordA = getSession(dataA.sessionId)!;
    expect(recordA.store.getTemplate("TPL-1001")!.status).toBe("PENDING");

    // Verify Session B store remains untouched in pristine REJECTED state
    const recordB = getSession(dataB.sessionId)!;
    expect(recordB.store.getTemplate("TPL-1001")!.status).toBe("REJECTED");
  });

  // 10. Provider unverified outcome (TPL-1003 verification failure)
  it("escalates to human handoff when fresh read verification fails (TPL-1003)", async () => {
    const resolveRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Fix payment reminder template rejection",
        templateId: "TPL-1003",
      })
    );
    const resolveData = await resolveRes.json();

    const actionRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId: resolveData.sessionId,
        action: "approve",
      })
    );

    const actionData = await actionRes.json();
    // TPL-1003 has simulatedResubmitOutcome = "no_change", so status stays REJECTED
    expect(actionData.isVerified).toBe(false);
    expect(actionData.stage).toBe("HANDOFF");
    expect(actionData.handoffReason).toContain("Fresh read does not match");
  });

  // 11. Malformed API requests
  it("validates request bodies and returns appropriate 400 status codes", async () => {
    // Empty message
    const emptyMsgRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", { message: "" })
    );
    expect(emptyMsgRes.status).toBe(400);

    // Invalid JSON
    const malformedReq = new Request("http://localhost:3000/api/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json-content",
    });
    const malformedRes = await resolvePost(malformedReq);
    expect(malformedRes.status).toBe(400);

    // Invalid action
    const invalidActionRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId: "fake-session",
        action: "destroy_database",
      })
    );
    expect(invalidActionRes.status).toBe(400);

    // Nonexistent session
    const missingSessionRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId: "NONEXISTENT_SESSION_ID",
        action: "approve",
      })
    );
    expect(missingSessionRes.status).toBe(404);
  });

  // 12. Session retrieval, deletion, and history
  it("supports session lifecycle: retrieval, listing in history, and deletion", async () => {
    const resolveRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Query for history testing",
      })
    );
    const data = await resolveRes.json();

    // Check history endpoint
    const historyRes = await historyGet();
    const historyData = await historyRes.json();
    expect(historyData.total).toBe(1);
    expect(historyData.sessions[0].sessionId).toBe(data.sessionId);

    // Check single session GET
    const sessionRes = await sessionGet(
      new Request(`http://localhost:3000/api/session?sessionId=${data.sessionId}`)
    );
    expect(sessionRes.status).toBe(200);
    const sessionData = await sessionRes.json();
    expect(sessionData.sessionId).toBe(data.sessionId);

    // Delete session
    const delRes = await sessionDelete(
      new Request(`http://localhost:3000/api/session?sessionId=${data.sessionId}`, {
        method: "DELETE",
      })
    );
    expect(delRes.status).toBe(200);

    // Confirm deleted
    const postDelHistory = await (await historyGet()).json();
    expect(postDelHistory.total).toBe(0);
  });

  // 13. Evidence expansion regression: read-only operations never create cases
  it("proves reading or expanding case evidence does not create a case or mutate state", async () => {
    const initRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Why was my WhatsApp template rejected?",
        templateId: "TPL-1001",
      })
    );
    expect(initRes.status).toBe(200);
    const caseData = await initRes.json();
    const initialSessionId = caseData.sessionId;
    const initialCaseId = caseData.caseId;

    // Check history count
    const historyBefore = await (await historyGet()).json();
    expect(historyBefore.total).toBe(1);
    expect(historyBefore.sessions[0].sessionId).toBe(initialSessionId);

    // Repeated read-only session inspections (simulating evidence expansion and page refresh)
    for (let i = 0; i < 5; i++) {
      const inspectRes = await sessionGet(
        new Request(`http://localhost:3000/api/session?sessionId=${initialSessionId}`)
      );
      expect(inspectRes.status).toBe(200);
      const readData = await inspectRes.json();
      expect(readData.sessionId).toBe(initialSessionId);
      expect(readData.caseId).toBe(initialCaseId);
    }

    // Confirm NO additional cases or sessions were created
    const historyAfter = await (await historyGet()).json();
    expect(historyAfter.total).toBe(1);
    expect(historyAfter.sessions[0].sessionId).toBe(initialSessionId);
  });

  // 14. Follow-up messages on terminal/approved cases do not violate UNIQUE constraints
  it("handles follow-up messages on terminal/approved cases without UNIQUE constraint errors", async () => {
    const initRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Why was my WhatsApp template rejected?",
        templateId: "TPL-1001",
      })
    );
    const caseData = await initRes.json();
    const sessionId = caseData.sessionId;

    const approveRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId,
        action: "approve",
        idempotencyKey: `TEST-APPROVE-${Date.now()}`,
      })
    );
    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.stage).toBe("PENDING");

    // Send follow-up question on this approved case (which previously failed with UNIQUE constraint failed: cases.session_id)
    const followUpRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "Show supporting evidence and explain the verification outcome.",
      })
    );

    expect(followUpRes.status).toBe(200);
    const followUpData = await followUpRes.json();
    expect(followUpData.sessionId).toBe(sessionId);
    expect(followUpData.error).toBeUndefined();

    // Verify history still contains exactly 1 case
    const historyRes = await (await historyGet()).json();
    expect(historyRes.total).toBe(1);
    expect(historyRes.sessions[0].sessionId).toBe(sessionId);

    // Verify conversation turns include the follow-up message
    const restored = await (
      await sessionGet(new Request(`http://localhost:3000/api/session?sessionId=${sessionId}`))
    ).json();
    const userMessages = restored.messages.filter((m: any) => m.role === "user");
    expect(userMessages.length).toBeGreaterThanOrEqual(2);
    expect(userMessages[userMessages.length - 1].text).toContain("Show supporting evidence");
  });

  // 15. Persistence idempotency: updating existing case updates in place
  it("idempotently updates an existing case in persistence layer without SQLite errors", () => {
    const testCase = {
      id: "CASE-REGRESSION-1001",
      workspaceId: "test-workspace-reg",
      sessionId: "SES-REGRESSION-1001",
      title: "Regression Case Test",
      templateId: "TPL-1001",
      originalMessage: "Original message text",
      state: { stage: "ENTRY", events: [] },
      templates: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [{ role: "user" as const, text: "Original message text", timestamp: new Date().toISOString() }],
    };

    expect(() => repositories.saveCase(testCase)).not.toThrow();

    testCase.title = "Updated Regression Title";
    testCase.updatedAt = new Date().toISOString();
    expect(() => repositories.saveCase(testCase)).not.toThrow();

    const testCaseVariantId = {
      ...testCase,
      id: "CASE-REGRESSION-VARIANT-9999",
      title: "Variant Case Id for same Session",
    };
    expect(() => repositories.saveCase(testCaseVariantId)).not.toThrow();

    const fetched = repositories.getCase("test-workspace-reg", "SES-REGRESSION-1001");
    expect(fetched).not.toBeNull();
    expect(fetched?.title).toBe("Variant Case Id for same Session");

    repositories.clearWorkspaceForTest("test-workspace-reg");
  });

  // 16. Template context selector semantics: manual selection vs auto-detect
  it("enforces template selector semantics: manual vs auto-detect without unprompted case creation", async () => {
    // Verify GET /api/templates returns authentic mock fixtures
    const templatesRes = await templatesGet();
    expect(templatesRes.status).toBe(200);
    const { templates } = await templatesRes.json();
    const templateIds = templates.map((t: any) => t.id);
    expect(templateIds).toContain("TPL-1001");
    expect(templateIds).toContain("TPL-1002");
    expect(templateIds).toContain("TPL-1003");

    // History before any submit
    const historyBefore = await (await historyGet()).json();
    const initialCount = historyBefore.total;

    // Manual template selection submit
    const manualRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Template order_update_v3 has invalid variable format",
        templateId: "TPL-1002",
      })
    );
    expect(manualRes.status).toBe(200);
    const manualData = await manualRes.json();
    expect(manualData.templateSnapshot.id).toBe("TPL-1002");
    expect(manualData.templateSnapshot.name).toBe("order_update_v3");

    // Auto-detect submit without templateId
    const autoRes = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Why was my festive_offer_blast rejected?",
      })
    );
    expect(autoRes.status).toBe(200);
    const autoData = await autoRes.json();
    expect(autoData.templateSnapshot.id).toBe("TPL-1001");
    expect(autoData.templateSnapshot.name).toBe("festive_offer_blast");

    // Total cases created equals exactly 2 explicit submissions
    const historyAfter = await (await historyGet()).json();
    expect(historyAfter.total).toBe(initialCount + 2);
  });

  // 17. Technical details diagnostic inspector payload integrity
  it("verifies structured diagnostic events and raw trace fidelity", async () => {
    const res = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Why was my WhatsApp template rejected?",
        templateId: "TPL-1001",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    // Verify structured events
    expect(Array.isArray(data.events)).toBe(true);
    expect(data.events.length).toBeGreaterThanOrEqual(4);

    const eventTypes = data.events.map((e: any) => e.eventType);
    expect(eventTypes).toContain("CASE_OPENED");
    expect(eventTypes).toContain("STATE_READ");
    expect(eventTypes).toContain("TRIAGED");
    expect(eventTypes).toContain("DIAGNOSED");
    expect(eventTypes).toContain("FIX_PROPOSED");

    // Verify raw trace has matching lines and is readable
    expect(typeof data.ruleTrace).toBe("string");
    expect(data.ruleTrace).toContain("[CASE_OPENED]");
    expect(data.ruleTrace).toContain("[STATE_READ]");
    expect(data.ruleTrace).toContain("[DIAGNOSED]");

    // Verify execution summary metrics
    expect(data.guardrails).toBe("Guarded");
    expect(data.contextEvaluated).toContain("Mock state");
    expect(typeof data.latencyMs).toBe("number");
    expect(data.latencyMs).toBeGreaterThanOrEqual(0);
  });

  // =========================================================================
  // Targeted Regression Tests (Section D)
  // =========================================================================

  // 18. Regression 1: Vague delivery complaint with auto-detect context must NOT diagnose a template-variable error
  it("REGRESSION 1: vague message-delivery complaint does not diagnose template-variable errors or associate templates", async () => {
    const res = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "None of my messages are getting delivered today. Is WhatsApp down?",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.triage.issueType).toBe("message_delivery");
    expect(data.templateSnapshot).toBeNull();
    // Must NOT be diagnosed as FIXTURE_INVALID_VARIABLE_FORMAT
    expect(data.diagnosis?.reasonCode).not.toBe("FIXTURE_INVALID_VARIABLE_FORMAT");
    expect(data.diagnosis?.playbookId).not.toBe("PB-002-INVALID-VARIABLE-FORMAT");
    // Must NOT propose template resubmission or modification
    expect(data.proposal).toBeNull();
    // Context evaluated must not claim template mock state
    expect(data.contextEvaluated).not.toContain("TPL-");
    expect(data.category).toBe("Message Delivery");
    expect(data.customerExplanation.headline).toBe("Message Delivery Delay");
  });

  // 19. Regression 2: Duplicate-payment complaint must not associate with unrelated template fixtures or display template rejection evidence
  it("REGRESSION 2: duplicate-payment / billing complaint does not associate with unrelated template fixtures or evidence", async () => {
    const res = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "I have a duplicate payment complaint: I was charged twice for my subscription invoice",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.triage.issueType).toBe("billing_refund");
    expect(data.stage).toBe("HANDOFF");
    expect(data.triage.needsHuman).toBe(true);
    // Must NOT associate with TPL-1002 or TPL-1003 or any template fixture
    expect(data.templateSnapshot).toBeNull();
    expect(data.proposal).toBeNull();
    // Context evaluated must not claim template mock state
    expect(data.contextEvaluated).not.toContain("TPL-");
    expect(data.category).toBe("Billing & Refund Inquiry");
    // Evidence must not contain template rejection codes
    expect(data.evidence).not.toContain("FIXTURE_INVALID_VARIABLE_FORMAT");
    expect(data.evidence).not.toContain("FIXTURE_TAG_CONTENT_MISMATCH");
    expect(data.customerExplanation.headline).toBe("Billing & Payment Inquiry");
  });

  // 20. Regression 3: Genuine template-rejection complaint with matching fixture continues to diagnose and propose the correct fix
  it("REGRESSION 3: genuine template-rejection complaint with fixture continues to diagnose and propose correct fix", async () => {
    const res = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Template order_update_v3 was rejected because of a variable format issue",
        templateId: "TPL-1002",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.triage.issueType).toBe("template_rejection");
    expect(data.stage).toBe("PROPOSE");
    expect(data.templateSnapshot).not.toBeNull();
    expect(data.templateSnapshot.id).toBe("TPL-1002");
    expect(data.diagnosis?.playbookId).toBe("PB-002-INVALID-VARIABLE-FORMAT");
    expect(data.diagnosis?.reasonCode).toBe("FIXTURE_INVALID_VARIABLE_FORMAT");
    expect(data.proposal).not.toBeNull();
    expect(data.proposal.operation).toBe("resubmit_template");
    expect(data.proposal.changes[0].field).toBe("text");
    expect(data.proposal.changes[0].after).toContain("{{1}}");
  });

  // 21. Regression 4: User asks for human specialist escalates directly without template confusion
  it("REGRESSION 4: explicit request for a human specialist escalates directly without template confusion", async () => {
    const res = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Connect me to a human specialist please, I do not want an automated bot",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.triage.issueType).toBe("human_requested");
    expect(data.stage).toBe("HANDOFF");
    expect(data.triage.needsHuman).toBe(true);
    expect(data.templateSnapshot).toBeNull();
    expect(data.proposal).toBeNull();
    expect(data.contextEvaluated).not.toContain("TPL-");
    expect(data.handoffReason).toContain("Policy requires human handling");
  });

  // 22. Regression 5: Missing or ambiguous entity mapping asks for clarification without ungrounded fixture binding
  it("REGRESSION 5: ambiguous or missing entity mapping asks for clarification without ungrounded fixture binding", async () => {
    const res = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "My WhatsApp template was rejected, please fix it",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    // With auto-detect and no template name/ID in message:
    expect(data.triage.issueType).toBe("template_rejection");
    expect(data.stage).toBe("CLARIFY_ONCE");
    expect(data.templateSnapshot).toBeNull();
    expect(data.proposal).toBeNull();
    expect(data.clarificationQuestion).toBeDefined();
    expect(data.clarificationQuestion).toContain("Could you share the template name (or ID)");
  });

  // 23. Regression 6: Template rejection without attached template or reason code never leaks message delivery diagnosis
  it("REGRESSION 6: template rejection inquiry never returns delivery diagnosis or check_message_status next step", async () => {
    const res = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Why is my WhatsApp template being rejected?",
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.triage.issueType).toBe("template_rejection");
    expect(data.stage).toBe("CLARIFY_ONCE");
    expect(data.category).toBe("Template support");
    expect(data.statusBadge).toBe("Needs details");
    expect(data.title).toBe("WhatsApp template rejection");
    expect(data.customerExplanation.whatIsWrong).toBe(
      "Your WhatsApp template was rejected, but I don't yet have the rejection reason needed to recommend the right fix."
    );
    expect(data.customerExplanation.evidenceExplanation).toContain(
      "I haven't verified the rejection reason yet, so I won't recommend a delivery-status check."
    );
    expect(data.diagnosisSummary).toBeNull();
    expect(data.recommendedNextStep).toBeNull();
  });

  // 24. Multi-turn conversation preserves full transcript continuity through clarification and proposal
  it("maintains conversation continuity across multiple turns without losing prior messages", async () => {
    // Turn 1: Initial query triggering clarification
    const res1 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Why is my WhatsApp template being rejected?",
      })
    );
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    const sessionId = data1.sessionId;
    expect(data1.stage).toBe("CLARIFY_ONCE");
    expect(data1.messages).toHaveLength(2);
    expect(data1.messages[0].role).toBe("user");
    expect(data1.messages[0].text).toBe("Why is my WhatsApp template being rejected?");
    expect(data1.messages[1].role).toBe("assistant");
    expect(data1.messages[1].text).toContain("WhatsApp template was rejected");

    // Turn 2: Follow-up providing template ID and rejection reason
    const res2 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "The template ID is TPL-1001 and rejection reason is promotional content",
      })
    );
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.sessionId).toBe(sessionId);
    expect(data2.stage).toBe("PROPOSE");
    expect(data2.proposal).not.toBeNull();
    expect(data2.proposal.changes[0].after).toBe("MARKETING");
    expect(data2.messages).toHaveLength(4);
    expect(data2.messages[0].text).toBe("Why is my WhatsApp template being rejected?");
    expect(data2.messages[1].role).toBe("assistant");
    expect(data2.messages[2].role).toBe("user");
    expect(data2.messages[2].text).toBe("The template ID is TPL-1001 and rejection reason is promotional content");
    expect(data2.messages[3].role).toBe("assistant");
    expect(data2.messages[3].text).toContain("promotional wording");

    // Turn 3: Follow-up asking for a simpler explanation
    const res3 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "What does category mismatch actually mean?",
      })
    );
    expect(res3.status).toBe(200);
    const data3 = await res3.json();
    expect(data3.sessionId).toBe(sessionId);
    expect(data3.messages).toHaveLength(6);
    expect(data3.messages[4].role).toBe("user");
    expect(data3.messages[4].text).toBe("What does category mismatch actually mean?");
    expect(data3.messages[5].role).toBe("assistant");
    expect(data3.messages[5].text).toContain("WhatsApp rejected this template because its wording looks like a promotion");

    // Turn 4: Approve action
    const actionRes = await actionPost(
      makeJsonRequest("http://localhost:3000/api/action", {
        sessionId,
        action: "approve",
        idempotencyKey: `TEST-KEY-MULTITURN-${Date.now()}`,
      })
    );
    expect(actionRes.status).toBe(200);
    const actionData = await actionRes.json();
    expect(actionData.isVerified).toBe(true);
    expect(actionData.messages).toHaveLength(7);
    expect(actionData.messages[6].role).toBe("assistant");
    expect(actionData.messages[6].text).toContain("Simulated resubmission applied and verified for TPL-1001");
  });

  // 25. Multi-turn follow-up intent understanding (P0 reproduction sequence)
  it("understands follow-up intent across multi-turn conversation without repeating diagnosis or completed checks", async () => {
    // 1. Initial message: message delivery complaint without template rejection
    const res1 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "My WhatsApp messages show as sent, but several recipients have not received them. There is no template rejection error.",
      })
    );
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    const sessionId = data1.sessionId;
    expect(sessionId).toBeDefined();
    expect(data1.triage.issueType).toBe("message_delivery");
    expect(data1.recommendedNextStep?.primaryCta.action).toBe("check_message_status");
    expect(data1.messages).toHaveLength(2);
    expect(data1.messages[0].text).toContain("My WhatsApp messages show as sent");
    expect(data1.messages[1].role).toBe("assistant");

    // 2. Follow-up 1: User already performed the recommended check
    const res2 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "I already checked the delivery status. It is still pending. Please don't ask me to repeat the same check.",
      })
    );
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.sessionId).toBe(sessionId);
    expect(data2.triage.issueType).toBe("message_delivery");
    // Verify check is marked completed and NOT recommended again
    expect(data2.recommendedNextStep?.primaryCta.action).not.toBe("check_message_status");
    expect(data2.recommendedNextStep?.primaryCta.action).toBe("clarify");
    expect(data2.recommendedNextStep?.secondaryCta?.action).toBe("human");
    // Verify no fabricated telemetry
    expect(data2.customerExplanation.evidenceExplanation).not.toContain("carrier handset transit is active");
    expect(data2.customerExplanation.evidenceExplanation).toContain("[REPORTED]");
    expect(data2.customerExplanation.nextSteps).toContain("approximately when were the affected messages sent");
    expect(data2.messages).toHaveLength(4);
    expect(data2.messages[2].text).toBe("I already checked the delivery status. It is still pending. Please don't ask me to repeat the same check.");
    expect(data2.messages[3].role).toBe("assistant");
    expect(data2.messages[3].text).toContain("confirmed that message delivery status remains pending");

    // 3. Follow-up 2: "hi" greeting
    const res3 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "hi",
      })
    );
    expect(res3.status).toBe(200);
    const data3 = await res3.json();
    expect(data3.sessionId).toBe(sessionId);
    expect(data3.triage.issueType).toBe("message_delivery");
    // Verify it responds naturally and does not repeat prior diagnosis
    expect(data3.customerExplanation.whatIsWrong).toContain("Hi! I'm here. Would you like to continue troubleshooting the pending WhatsApp deliveries?");
    expect(data3.messages).toHaveLength(6);
    expect(data3.messages[4].text).toBe("hi");
    expect(data3.messages[5].text).toContain("Hi! I'm here.");
    // Verify it does not repeat completed check
    expect(data3.recommendedNextStep?.primaryCta.action).not.toBe("check_message_status");

    // 4. Follow-up 3: "what chlk" mistyped / unclear query
    const res4 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "what chlk",
      })
    );
    expect(res4.status).toBe(200);
    const data4 = await res4.json();
    expect(data4.sessionId).toBe(sessionId);
    expect(data4.triage.issueType).toBe("message_delivery");
    // Verify it asks for clarification instead of inventing new technical evidence or repeating
    expect(data4.customerExplanation.whatIsWrong).toContain("I didn't quite catch that. Did you mean to ask about the delivery check");
    expect(data4.messages).toHaveLength(8);
    expect(data4.messages[6].text).toBe("what chlk");
    expect(data4.messages[7].text).toContain("I didn't quite catch that");

    // Verify all assistant messages are distinct across the multi-turn session
    const assistantTexts = [
      data4.messages[1].text,
      data4.messages[3].text,
      data4.messages[5].text,
      data4.messages[7].text,
    ];
    const uniqueAssistantTexts = new Set(assistantTexts);
    expect(uniqueAssistantTexts.size).toBe(4);
  });

  // 26. Founder business analytics 4-turn journey (Zero support triage leakage)
  it("executes 4-turn founder revenue-drop conversation through HTTP API without escalating or leaking support triage UI", async () => {
    // Turn 1: Initial business request
    const res1 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        message: "Our revenue dropped this week. Help me figure out why.",
      })
    );
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    const sessionId = data1.sessionId;
    expect(sessionId).toBeDefined();
    expect(data1.category).toBe("Business Analytics");
    expect(data1.statusBadge).toBe("Analysis active");
    expect(data1.stage).toBe("RESOLVED");
    expect(data1.diagnosisSummary).toBeNull();
    expect(data1.specialistAssignment).toBeNull();
    expect(data1.handoffReason).toBeNull();
    expect(data1.customerExplanation.whatIsWrong).toContain("LIMITATION");
    expect(data1.customerExplanation.whatIsWrong).toContain("Traffic / Volume");
    expect(data1.customerExplanation.whatIsWrong).toContain("Conversion Funnel");
    expect(data1.customerExplanation.whatIsWrong).toContain("Average Order Value");
    expect(data1.customerExplanation.whatIsWrong).toContain("Payment Failures & Refunds");
    expect(data1.messages).toHaveLength(2);

    // Turn 2: Fact update & comparison dates
    const res2 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "Compare October 1–7 with October 8–14.",
      })
    );
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.sessionId).toBe(sessionId);
    expect(data2.category).toBe("Business Analytics");
    expect(data2.statusBadge).toBe("Analysis active");
    expect(data2.stage).toBe("RESOLVED");
    expect(data2.diagnosisSummary).toBeNull();
    expect(data2.specialistAssignment).toBeNull();
    expect(data2.customerExplanation.whatIsWrong).toContain("October 1–7");
    expect(data2.customerExplanation.whatIsWrong).toContain("October 8–14");
    expect(data2.customerExplanation.whatIsWrong).toContain("invalidated");
    expect(data2.messages).toHaveLength(4);

    // Turn 3: Query required data points
    const res3 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "What data do you need to confirm the cause?",
      })
    );
    expect(res3.status).toBe(200);
    const data3 = await res3.json();
    expect(data3.sessionId).toBe(sessionId);
    expect(data3.category).toBe("Business Analytics");
    expect(data3.statusBadge).toBe("Analysis active");
    expect(data3.stage).toBe("RESOLVED");
    expect(data3.diagnosisSummary).toBeNull();
    expect(data3.specialistAssignment).toBeNull();
    expect(data3.customerExplanation.whatIsWrong).toContain("Daily Revenue & Order Volume");
    expect(data3.customerExplanation.whatIsWrong).toContain("Traffic & Funnel Conversion");
    expect(data3.customerExplanation.whatIsWrong).toContain("Average Order Value");
    expect(data3.messages).toHaveLength(6);

    // Turn 4: Disclosed database limitation and known vs unknown conclusion
    const res4 = await resolvePost(
      makeJsonRequest("http://localhost:3000/api/resolve", {
        sessionId,
        message: "We don't have production database access connected yet. What can you conclude from what you have?",
      })
    );
    expect(res4.status).toBe(200);
    const data4 = await res4.json();
    expect(data4.sessionId).toBe(sessionId);
    expect(data4.category).toBe("Business Analytics");
    expect(data4.statusBadge).toBe("Analysis active");
    expect(data4.stage).toBe("RESOLVED");
    expect(data4.diagnosisSummary).toBeNull();
    expect(data4.specialistAssignment).toBeNull();
    expect(data4.handoffReason).toBeNull();
    expect(data4.customerExplanation.whatIsWrong).toContain("What We Know [REPORTED / DOCUMENTED]");
    expect(data4.customerExplanation.whatIsWrong).toContain("What Remains Unknown [UNKNOWN]");
    expect(data4.customerExplanation.whatIsWrong).toContain("LIMITATION");
    expect(data4.messages).toHaveLength(8);
  });
});


