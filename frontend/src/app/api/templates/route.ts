import { NextResponse } from "next/server";
import { createMockStore } from "../../../../../src/domain/mockStore";

export const runtime = "nodejs";

export async function GET() {
  const store = createMockStore();
  const templates = store.listTemplates();
  return NextResponse.json({
    templates: templates.map((t) => ({
      id: t.id,
      name: t.name,
      language: t.language,
      category: t.category,
      status: t.status,
      reasonCode: t.reasonCode,
      text: t.text,
      sourceLabel: t.sourceLabel,
    })),
  });
}
