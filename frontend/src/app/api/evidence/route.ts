import { NextResponse } from "next/server";
import { getWorkspaceId } from "../../../lib/server/workspace";
import { repositories } from "../../../lib/server/persistence";
import { ingestUpload } from "../../../lib/server/ingestion";

export const runtime = "nodejs";
export async function GET(req: Request) { const workspaceId = await getWorkspaceId(); const caseId = new URL(req.url).searchParams.get("caseId") || undefined; return NextResponse.json({ sources: repositories.listEvidence(workspaceId, caseId) }); }
export async function POST(req: Request) {
  try { const workspaceId = await getWorkspaceId(); const form = await req.formData(); const file = form.get("file"); const caseId = form.get("caseId"); if (!(file instanceof File)) return NextResponse.json({ error: "A file is required." }, { status: 400 });
    const linkedCaseId = typeof caseId === "string" && caseId ? caseId : null;
    if (linkedCaseId && !repositories.hasCase(workspaceId, linkedCaseId)) return NextResponse.json({ error: "Case not found in this workspace." }, { status: 404 });
    const source = await ingestUpload(file); repositories.addEvidence(workspaceId, { ...source, caseId: linkedCaseId, status: "READY" }); return NextResponse.json({ source }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 400 }); }
}
export async function PATCH(req: Request) { const workspaceId = await getWorkspaceId(); const body = await req.json(); if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Invalid evidence request." }, { status: 400 }); if (body.mapping && typeof body.mapping === "object") return NextResponse.json({ ok: repositories.saveMapping(workspaceId, body.id, body.mapping) }); if (body.caseId !== null && typeof body.caseId !== "string") return NextResponse.json({ error: "Invalid evidence link request." }, { status: 400 }); if (body.caseId && !repositories.hasCase(workspaceId, body.caseId)) return NextResponse.json({ error: "Case not found in this workspace." }, { status: 404 }); return NextResponse.json({ ok: repositories.linkEvidence(workspaceId, body.id, body.caseId) }); }
