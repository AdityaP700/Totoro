import { NextResponse } from "next/server";
import { resetAllSessions } from "../../../../lib/server/sessionRegistry";

export const runtime = "nodejs";

export async function POST() {
  resetAllSessions();
  return NextResponse.json({
    ok: true,
    message: "All in-memory sessions cleared and mock fixtures restored to pristine state.",
  });
}
