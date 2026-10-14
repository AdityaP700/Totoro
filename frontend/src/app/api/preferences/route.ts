import { NextResponse } from "next/server";
import { getWorkspaceId } from "../../../lib/server/workspace";
import { repositories } from "../../../lib/server/persistence";

export const runtime = "nodejs";
export async function GET() { return NextResponse.json({ profile: repositories.getPreferences(await getWorkspaceId()) }); }
export async function PUT(req: Request) {
  try { const profile = await req.json(); if (!profile || typeof profile !== "object") return NextResponse.json({ error: "Invalid profile." }, { status: 400 }); repositories.savePreferences(await getWorkspaceId(), profile); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Unable to save preferences." }, { status: 400 }); }
}
