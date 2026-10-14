import { NextResponse } from "next/server";
import {
  getSession,
  deleteSession,
  buildResolveResponse,
} from "../../../lib/server/sessionRegistry";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Query parameter 'sessionId' is required." },
      { status: 400 }
    );
  }

  const record = getSession(sessionId);
  if (!record) {
    return NextResponse.json(
      { error: `Session '${sessionId}' not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(buildResolveResponse(record));
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Query parameter 'sessionId' is required." },
      { status: 400 }
    );
  }

  const deleted = deleteSession(sessionId);
  if (!deleted) {
    return NextResponse.json(
      { error: `Session '${sessionId}' not found or already deleted.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `Session '${sessionId}' successfully deleted from memory.`,
  });
}
