import { NextResponse } from "next/server";
import { listSessions } from "../../../lib/server/sessionRegistry";
import { getWorkspaceId } from "../../../lib/server/workspace";
import type { ReportData } from "../../../lib/apiTypes";

export const runtime = "nodejs";

export async function GET() {
  const sessions = listSessions(await getWorkspaceId());
  const verifiedRecoveriesCount = sessions.filter((s) => s.isVerified).length;
  const humanHandoffsCount = sessions.filter((s) => s.needsHuman).length;

  const data: ReportData = {
    baselineAccuracy: 100,
    datasetCasesCount: 170,
    safetyScore: 100,
    activeSessionsCount: sessions.length,
    verifiedRecoveriesCount,
    humanHandoffsCount,
    sessions,
  };

  return NextResponse.json(data);
}
