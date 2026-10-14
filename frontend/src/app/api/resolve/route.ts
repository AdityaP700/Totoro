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
      } else if (
        record.session.state.stage === "PENDING" ||
        record.session.state.stage === "HANDOFF" ||
        record.session.state.stage === "DECLINED"
      ) {
        // Prior case reached terminal stage; start fresh investigation for same user/session
        record = createNewSession(workspaceId, {
          message,
          templateId: body.templateId,
          userRole: body.userRole,
          sessionId: body.sessionId,
        });
      } else {
        // Preserve an active case. Follow-up text is audit context only; it cannot change a proposal.
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
    return NextResponse.json(
      {
        error: errorMsg,
        status: "error",
      },
      { status: 500 }
    );
  }
}
