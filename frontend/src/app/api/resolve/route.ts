import { NextResponse } from "next/server";
import {
  createNewSession,
  getSession,
  buildResolveResponse,
  persist,
} from "../../../lib/server/sessionRegistry";
import { getWorkspaceId } from "../../../lib/server/workspace";
import type { ResolveRequest } from "../../../lib/apiTypes";
import { runConversationTurn, isBusinessRequest } from "../../../../../src/domain/conversationGraph";
import { detectLanguage } from "../../../../../src/domain/fastRouter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const start = Date.now();
  try {
    const workspaceId = await getWorkspaceId();
    let body: ResolveRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Malformed request payload: Invalid JSON." },
        { status: 400 }
      );
    }

    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return NextResponse.json(
        { error: "Field 'message' is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const message = body.message.trim();
    let record = body.sessionId ? getSession(workspaceId, body.sessionId) : undefined;

    if (record) {
      record.messages.push({ role: "user", text: message, timestamp: new Date().toISOString() });
      const isBusinessSession = Boolean(
        record.session.state.businessContext &&
        record.session.state.businessContext.domain !== "platform_recovery" &&
        record.session.state.businessContext.domain !== "customer_support"
      );

      if (record.session.state.stage === "CLARIFY_ONCE" && !isBusinessSession && !isBusinessRequest(message)) {
        record.session.clarify(message);
      } else {
        // Multi-turn conversational follow-up handled by LangGraph.js flow
        await runConversationTurn({
          sessionId: record.sessionId,
          message,
          history: record.messages,
          session: record.session,
        });
      }
      record.updatedAt = new Date().toISOString();
    } else {
      // Create new isolated session
      record = createNewSession(workspaceId, {
        message,
        templateId: body.templateId,
        userRole: body.userRole,
        sessionId: body.sessionId,
      });

      // Execute LangGraph flow on Turn 1 for business requests or multilingual queries
      const detectedLang = detectLanguage(message);
      if (isBusinessRequest(message) || detectedLang !== "en") {
        await runConversationTurn({
          sessionId: record.sessionId,
          message,
          history: record.messages,
          session: record.session,
        });
      }
    }

    const latencyMs = Math.max(8, Date.now() - start);
    let response = buildResolveResponse(record, latencyMs);
    record.messages.push({ role: "assistant", text: response.customerExplanation.whatIsWrong, timestamp: new Date().toISOString() });
    persist(record);
    response = buildResolveResponse(record, latencyMs);

    console.log(
      JSON.stringify({
        tag: "CONVERSATION_TURN",
        sessionId: record.sessionId,
        caseId: record.caseId,
        threadId: record.sessionId,
        issueCategory: record.session.state.triage?.issueType || "unknown",
        selectedRoute: record.session.state.triage?.route || "unknown",
        responseCaseId: response.caseId,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal diagnosis error";
    console.error("[API Resolve Error]", err);
    const userFriendlyMsg = /unique|constraint|sqlite|foreign_key|syntax error/i.test(errorMsg)
      ? "Unable to complete this recovery step due to an internal storage issue. Please try again or start a new request."
      : errorMsg;
    return NextResponse.json(
      {
        error: userFriendlyMsg,
        status: "error",
      },
      { status: 500 }
    );
  }
}
