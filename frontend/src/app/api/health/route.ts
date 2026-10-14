import { NextResponse } from "next/server";
import { createMockStore } from "../../../../../src/domain/mockStore";

export async function GET() {
  const store = createMockStore();
  const templates = store.listTemplates();
  return NextResponse.json({ ok: true, count: templates.length, templates: templates.map(t => t.id) });
}
