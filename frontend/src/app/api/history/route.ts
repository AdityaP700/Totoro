import { NextResponse } from "next/server";
import { listSessions } from "../../../lib/server/sessionRegistry";

export const runtime = "nodejs";

export async function GET() {
  const sessions = listSessions();
  return NextResponse.json({
    sessions,
    total: sessions.length,
  });
}
