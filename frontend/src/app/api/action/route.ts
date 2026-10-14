import { NextResponse } from "next/server";
import { getSession } from "../../../lib/server/sessionRegistry";
import { generateCustomerFacingResponse } from "../../../../../src/domain/conversationalResponse";
import { buildCaseAuditTrail } from "../../../../../src/domain/evidenceTrail";
import { assessRecoveryUncertainty } from "../../../../../src/domain/uncertainty";
import { defaultPlaybookRegistry } from "../../../../../src/domain/playbookRegistry";
import type { ActionRequest, ActionResponse } from "../../../lib/apiTypes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    let body: ActionRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed request payload: Invalid JSON." },
        { status: 400 }
      );
    }

    if (!body || !body.sessionId || typeof body.sessionId !== "string") {
      return NextResponse.json(
        { error: "Field 'sessionId' is required." },
        { status: 400 }
      );
    }

    if (!body.action || !["approve", "decline", "human"].includes(body.action)) {
      return NextResponse.json(
        { error: "Field 'action' must be one of: 'approve', 'decline', 'human'." },
        { status: 400 }
      );
    }

    const record = getSession(body.sessionId);
    if (!record) {
      return NextResponse.json(
        { error: `Session not found or expired: '${body.sessionId}'.` },
        { status: 404 }
      );
    }

    const session = record.session;
    const store = record.store;

    if (body.action === "decline") {
      if (session.state.stage !== "PROPOSE" && session.state.stage !== "CONFIRM") {
        return NextResponse.json(
          { error: "No proposal is pending to decline." },
          { status: 400 }
        );
      }
      session.declineProposal();
      record.updatedAt = new Date().toISOString();

      const explanation = generateCustomerFacingResponse({
        triage: session.state.triage!,
        templateSnapshot: session.state.templateSnapshot,
      });

      return NextResponse.json<ActionResponse>({
        sessionId: record.sessionId,
        caseId: session.state.caseId,
        stage: session.state.stage,
        actionResult: "User declined proposed change; mock record untouched.",
        isVerified: false,
        customerExplanation: explanation,
        events: session.state.events,
        statusBadge: "Proposal Declined",
        verificationStatus: "Record untouched",
        executionVerification: [
          ["Action", "Declined by user"],
          ["Mock Store", "Untouched"],
        ],
      });
    }

    if (body.action === "human") {
      const reason = body.customReason || "The user requested human support.";
      session.requestHuman(reason);
      record.updatedAt = new Date().toISOString();

      const explanation = generateCustomerFacingResponse({
        triage: session.state.triage!,
        templateSnapshot: session.state.templateSnapshot,
      });

      return NextResponse.json<ActionResponse>({
        sessionId: record.sessionId,
        caseId: session.state.caseId,
        stage: session.state.stage,
        handoffReason: reason,
        isVerified: false,
        customerExplanation: explanation,
        events: session.state.events,
        statusBadge: "Escalated to Support",
        verificationStatus: "Human handoff case compiled",
        executionVerification: [
          ["Status", "Escalated to human support"],
          ["Case File", "Compiled with full audit trail"],
        ],
      });
    }

    // Action is "approve"
    if (session.state.stage !== "PROPOSE" && session.state.stage !== "CONFIRM") {
      return NextResponse.json(
        { error: `No proposal is awaiting confirmation in stage '${session.state.stage}'.` },
        { status: 400 }
      );
    }

    const proposal = session.state.proposal;
    if (!proposal) {
      return NextResponse.json(
        { error: "No proposal object found in active session." },
        { status: 400 }
      );
    }

    // 1. Recheck preconditions immediately before execution (TOCTOU guard)
    const freshBeforeExec = store.getTemplate(proposal.targetId);
    if (!freshBeforeExec) {
      session.requestHuman("Target template disappeared from mock store prior to execution.");
      return NextResponse.json<ActionResponse>({
        sessionId: record.sessionId,
        caseId: session.state.caseId,
        stage: "HANDOFF",
        blocked: "Target template not found in store.",
        isVerified: false,
        customerExplanation: generateCustomerFacingResponse({
          triage: session.state.triage!,
          actionBlockedReason: "Target template no longer exists in mock store.",
        }),
        events: session.state.events,
        statusBadge: "Action Aborted",
        verificationStatus: "Template missing",
        executionVerification: [["State Check", "Failed — template missing"]],
      });
    }

    // Check duplicate idempotency key if passed
    if (body.idempotencyKey && store.hasIdempotencyKey(body.idempotencyKey)) {
      const explanation = generateCustomerFacingResponse({
        triage: session.state.triage!,
        templateSnapshot: freshBeforeExec,
        actionBlockedReason: "This confirmation was already used. Duplicate submissions are blocked (G11).",
        actionFailureKind: "duplicate_idempotency_key",
      });

      return NextResponse.json<ActionResponse>({
        sessionId: record.sessionId,
        caseId: session.state.caseId,
        stage: session.state.stage,
        blocked: "This confirmation was already used. Duplicate submissions are blocked (G11).",
        isVerified: false,
        customerExplanation: explanation,
        events: session.state.events,
        statusBadge: "Duplicate Submission Blocked",
        verificationStatus: "Blocked by idempotency",
        executionVerification: [
          ["Idempotency", "Key already used"],
          ["Safety Policy", "Duplicate write blocked (G11)"],
        ],
      });
    }

    // Execute through ResolveSession state machine
    let execOutcome: { blocked?: string; result?: any };
    try {
      execOutcome = session.approveProposal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Proposal serialization mismatch";
      session.requestHuman(`State drift detected: ${msg}`);
      record.updatedAt = new Date().toISOString();

      const explanation = generateCustomerFacingResponse({
        triage: session.state.triage!,
        actionBlockedReason: msg,
        actionFailureKind: "before_after_mismatch",
      });

      return NextResponse.json<ActionResponse>({
        sessionId: record.sessionId,
        caseId: session.state.caseId,
        stage: "HANDOFF",
        blocked: msg,
        isVerified: false,
        customerExplanation: explanation,
        events: session.state.events,
        statusBadge: "Action Aborted — Escalated",
        verificationStatus: "State drift detected",
        executionVerification: [["State Check", `Aborted: ${msg}`]],
      });
    }

    if (execOutcome.blocked) {
      return NextResponse.json<ActionResponse>({
        sessionId: record.sessionId,
        caseId: session.state.caseId,
        stage: session.state.stage,
        blocked: execOutcome.blocked,
        isVerified: false,
        customerExplanation: generateCustomerFacingResponse({
          triage: session.state.triage!,
          templateSnapshot: freshBeforeExec,
          actionBlockedReason: execOutcome.blocked,
          actionFailureKind: "duplicate_idempotency_key",
        }),
        events: session.state.events,
        statusBadge: "Action Blocked",
        verificationStatus: "Blocked by safety checks",
        executionVerification: [["Safety Check", execOutcome.blocked]],
      });
    }

    const templateAfter = store.getTemplate(proposal.targetId);
    const isVerified = session.state.verification?.verified ?? false;

    const uncertainty = assessRecoveryUncertainty({
      message: record.originalMessage,
      rulesResult: session.state.triage!,
      templateSnapshot: templateAfter,
      previousAttempts: session.state.attemptsFailed,
    });

    const playbook = defaultPlaybookRegistry.findForContext({
      reasonCode: templateAfter?.reasonCode,
      issueType: session.state.triage!.issueType,
      templateSnapshot: templateAfter,
    });

    const auditTrail = buildCaseAuditTrail({
      caseId: session.state.caseId,
      correlationId: session.state.correlationId,
      originalMessage: record.originalMessage,
      templateSnapshot: templateAfter,
      rulesResult: session.state.triage!,
      guardedDecision: session.state.triage!,
      uncertainty,
      playbook,
      customerConfirmed: true,
      actionExecuted: true,
      mockResult: isVerified ? "SIMULATED_PENDING_REVIEW" : session.state.actionResult,
      verification: session.state.verification,
      totalLatencyMs: 25,
    });

    const explanation = generateCustomerFacingResponse({
      triage: session.state.triage!,
      templateSnapshot: templateAfter,
      verification: session.state.verification,
      previousAttempts: session.state.attemptsFailed,
    });

    const executionVerification: [string, string][] = [
      ["Action Result", session.state.actionResult || "Simulated write complete"],
      [
        "Fresh Read Verification",
        isVerified ? "Verified match (PENDING)" : "Failed — status not cleared",
      ],
      [
        "Target Status",
        templateAfter ? `${templateAfter.status} (MOCK)` : "Unknown",
      ],
    ];

    return NextResponse.json<ActionResponse>({
      sessionId: record.sessionId,
      caseId: session.state.caseId,
      stage: session.state.stage,
      actionResult: session.state.actionResult,
      verification: session.state.verification,
      isVerified,
      customerExplanation: explanation,
      handoffReason: session.state.handoffReason,
      events: session.state.events,
      templateAfter,
      auditTrail,
      statusBadge: isVerified
        ? "Verified (Pending Review)"
        : "Verification Failed — Escalated",
      verificationStatus: isVerified
        ? "Fresh state verified (MOCK)"
        : "Verification failed fresh read",
      executionVerification,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal action execution error";
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}
