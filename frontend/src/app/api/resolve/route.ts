import { NextResponse } from "next/server";
import {
  createNewSession,
  getSession,
  buildResolveResponse,
} from "../../../lib/server/sessionRegistry";
import type { ResolveRequest } from "../../../lib/apiTypes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const start = Date.now();
  try {
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
    let record = body.sessionId ? getSession(body.sessionId) : undefined;

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
        record = createNewSession({
          message,
          templateId: body.templateId,
          userRole: body.userRole,
          sessionId: body.sessionId,
        });
      } else {
        // Ongoing pre-action session; if new input is sent, re-initialize or process
        record = createNewSession({
          message,
          templateId: body.templateId,
          userRole: body.userRole,
          sessionId: body.sessionId,
        });
      }
    } else {
      // Create new isolated session
      record = createNewSession({
        message,
        templateId: body.templateId,
        userRole: body.userRole,
        sessionId: body.sessionId,
      });
    }

    const latencyMs = Math.max(8, Date.now() - start);
    const response = buildResolveResponse(record, latencyMs);

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
