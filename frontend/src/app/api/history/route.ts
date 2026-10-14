import { NextResponse } from "next/server";
import { listSessions } from "../../../lib/server/sessionRegistry";
import { getWorkspaceId } from "../../../lib/server/workspace";

export const runtime = "nodejs";

export async function GET() {
  const sessions = listSessions(await getWorkspaceId());
  return NextResponse.json({
    sessions,
    total: sessions.length,
  });
}
