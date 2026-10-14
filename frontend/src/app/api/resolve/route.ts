import { NextResponse } from "next/server";
import {
  createNewSession,
  getSession,
  buildResolveResponse,
  persist,
} from "../../../lib/server/sessionRegistry";
import { getWorkspaceId } from "../../../lib/server/workspace";
import type { ResolveRequest } from "../../../lib/apiTypes";

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
      // Existing session found
      if (record.session.state.stage === "CLARIFY_ONCE") {
        // Multi-turn clarification answer
        record.session.clarify(message);
        record.messages.push({
          role: "user",
          text: message,
          timestamp: new Date().toISOString(),
        });
        record.updatedAt = new Date().toISOString();
      } else {
        // Preserve active or terminal case; record follow-up question in conversation history
        record.messages.push({ role: "user", text: message, timestamp: new Date().toISOString() });
        record.updatedAt = new Date().toISOString();
      }
    } else {
      // Create new isolated session
      record = createNewSession(workspaceId, {
        message,
        templateId: body.templateId,
        userRole: body.userRole,
        sessionId: body.sessionId,
      });
    }

    const latencyMs = Math.max(8, Date.now() - start);
    let response = buildResolveResponse(record, latencyMs);
    record.messages.push({ role: "assistant", text: response.customerExplanation.whatIsWrong, timestamp: new Date().toISOString() });
    persist(record);
    response = buildResolveResponse(record, latencyMs);

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
