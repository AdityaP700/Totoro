import { NextResponse } from "next/server";
import {
  getSession,
  deleteSession,
  buildResolveResponse,
} from "../../../lib/server/sessionRegistry";
import { getWorkspaceId } from "../../../lib/server/workspace";
import { repositories } from "../../../lib/server/persistence";

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

  const record = getSession(await getWorkspaceId(), sessionId);
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

  const deleted = deleteSession(await getWorkspaceId(), sessionId);
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

export async function PATCH(req: Request) { const body = await req.json(); if (!body || typeof body.sessionId !== "string" || typeof body.title !== "string" || !body.title.trim()) return NextResponse.json({ error: "sessionId and title are required." }, { status: 400 }); return NextResponse.json({ ok: repositories.renameCase(await getWorkspaceId(), body.sessionId, body.title.trim()) }); }
