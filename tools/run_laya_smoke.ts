import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
import { loadDataset } from "../src/eval/dataset";
import { buildSplit } from "../src/eval/split";
import { RulesReasoningAdapter, validateModelOutput } from "../src/domain/adapter";
import { isSecurityRequest, isExplicitHumanRequest, isBillingRequest } from "../src/domain/triage";
import { HostedLayaClient } from "../src/domain/layaClient";
import type { IssueType, Urgency } from "../src/domain/types";

// Load .env
try {
  if (typeof process !== "undefined" && typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile();
  }
} catch {
  // Ignore missing .env
}

interface SmokeTestCase {
  caseId: string;
  split: "iteration" | "challenge" | "held_out";
  message: string;
  expectedIssueType: string;
  expectedUrgency: string;
  expectedRoute: string;
  expectedNeedsHuman: boolean;
  notes: string;
}

interface SmokeResultRow {
  caseId: string;
  split: string;
  message: string;
  expected: {
    issueType: string;
    urgency: string;
    route: string;
    needsHuman: boolean;
  };
  rules: {
    issueType: string;
    urgency: string;
    route: string;
    needsHuman: boolean;
    latencyMs: number;
  };
  rawLaya: {
    issueType?: string;
    urgency?: string;
    needsHuman?: boolean;
    confidence?: number;
    latencyMs: number;
    tokensCharged: number;
    status: string;
  };
  guardedHybrid: {
    issueType: string;
    urgency: string;
    route: string;
    needsHuman: boolean;
    decisionLayer: "rules" | "laya" | "fallback";
    fallbackOccurred: boolean;
    fallbackReason?: string;
    latencyMs: number;
  };
}

async function main() {
  const isCached = process.argv.includes("--cached") || process.argv.includes("--offline");
  console.log("================================================================================");
  console.log(`Cheerio Resolve — Bounded ${isCached ? "Cached/Offline" : "Live"} Hosted Laya Smoke Test`);
  console.log("================================================================================\n");

  const apiKey = process.env.LAYA_API_KEY;
  if (!apiKey && !isCached) {
    console.error("ERROR: LAYA_API_KEY is not configured in environment or .env!");
    process.exit(1);
  }

  const client = apiKey ? new HostedLayaClient({ apiKey, timeoutMs: 12000 }) : null;
  const rulesAdapter = new RulesReasoningAdapter();

  // Audit file path
  const auditDir = resolve(currentDir, "../docs/audits");
  mkdirSync(auditDir, { recursive: true });
  const auditFile = resolve(auditDir, "laya_smoke_test_results.json");

  // Load cached telemetry if requested
  const cachedMap = new Map<string, any>();
  if (isCached) {
    if (existsSync(auditFile)) {
      const cachedData = JSON.parse(readFileSync(auditFile, "utf-8"));
      if (Array.isArray(cachedData?.results)) {
        for (const r of cachedData.results) {
          cachedMap.set(r.caseId, r.rawLaya);
        }
      }
    } else {
      console.warn(`Warning: Cached results file not found at ${auditFile}.`);
    }
  }

  // Load 170-case dataset and build split
  const all170 = loadDataset();
  const { iteration, heldOut } = buildSplit(all170);

  const iterationMap = new Map(iteration.map((c) => [c.case_id, c]));
  const heldOutMap = new Map(heldOut.map((c) => [c.case_id, c]));

  // Load challenge cases
  const challengePath = resolve(currentDir, "../docs/source/laya_challenge_pack/cheerio_resolve_challenge_80.jsonl");
  const challengeRaw = readFileSync(challengePath, "utf-8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
  const challengeMap = new Map(challengeRaw.map((c: any) => [c.case_id, c]));

  // 8 Representative Cases for smoke test
  // Selecting 7 cases from 170 dataset + 1 from 80 challenge dataset
  const targetCaseIds = [
    { id: "CR-001", fallbackType: "template_rejection" },
    { id: "CR-005", fallbackType: "template_rejection" },
    { id: "CR-031", fallbackType: "message_delivery" },
    { id: "CR-077", fallbackType: "billing_refund" },
    { id: "CR-092", fallbackType: "security_identity_access" },
    { id: "CR-040", fallbackType: "human_requested" },
    { id: "CR-107", fallbackType: "ambiguous_or_missing_context" },
  ];

  const smokeCases: SmokeTestCase[] = [];

  for (const t of targetCaseIds) {
    // Check if in iteration
    let c = iterationMap.get(t.id);
    let splitName: "iteration" | "held_out" = "iteration";

    if (!c) {
      // If it landed in held-out, pick the first available iteration case of this issue type
      // to keep held-out strictly untouched
      const alt = iteration.find((x) => x.issue_type === t.fallbackType);
      if (alt) {
        c = alt;
        splitName = "iteration";
        console.log(`Note: ${t.id} was in held-out; selected iteration case ${c.case_id} (${t.fallbackType}) instead.`);
      } else {
        c = heldOutMap.get(t.id)!;
        splitName = "held_out";
      }
    }

    smokeCases.push({
      caseId: c.case_id,
      split: splitName,
      message: c.user_message,
      expectedIssueType: c.issue_type,
      expectedUrgency: c.urgency,
      expectedRoute: c.expected_route,
      expectedNeedsHuman: c.needs_human,
      notes: c.notes,
    });
  }

  // 8th case: CRX-001 from Challenge Set
  const crx1 = challengeMap.get("CRX-001");
  if (crx1) {
    smokeCases.push({
      caseId: crx1.case_id,
      split: "challenge",
      message: crx1.user_message,
      expectedIssueType: crx1.issue_type,
      expectedUrgency: crx1.urgency,
      expectedRoute: crx1.expected_route,
      expectedNeedsHuman: crx1.needs_human,
      notes: crx1.notes,
    });
  }

  console.log(`Selected ${smokeCases.length} representative test cases:`);
  for (const sc of smokeCases) {
    console.log(`- [${sc.caseId}] (${sc.split}) expected=${sc.expectedIssueType}, needsHuman=${sc.expectedNeedsHuman} | "${sc.message.slice(0, 50)}..."`);
  }
  console.log(`\nStarting ${isCached ? "cached replay (zero live credits)" : "live inference with credit and rate tracking"}...\n`);

  const results: SmokeResultRow[] = [];
  let totalTokensCharged = 0;
  let totalLayaLatencyMs = 0;
  let layaSuccessCount = 0;

  for (const sc of smokeCases) {
    process.stdout.write(`Testing [${sc.caseId}] ... `);

    // 1. Rules-only prediction
    const rulesRes = rulesAdapter.triage({ message: sc.message });

    // 2. Raw Laya API Call (direct or cached replay)
    let layaRes: {
      success: boolean;
      issueType?: IssueType;
      urgency?: Urgency;
      needsHuman?: boolean;
      confidence?: number;
      latencyMs: number;
      inputTokens?: number;
      modelId?: string;
      error?: { code: string; message: string };
    };

    if (isCached) {
      const cached = cachedMap.get(sc.caseId);
      if (cached) {
        layaRes = {
          success: cached.status === "200_OK" || !cached.status?.startsWith("FAIL"),
          issueType: cached.issueType as IssueType,
          urgency: cached.urgency as Urgency,
          needsHuman: cached.needsHuman,
          confidence: cached.confidence,
          latencyMs: cached.latencyMs || 0,
          inputTokens: cached.tokensCharged || 0,
          modelId: "laya-cached",
        };
      } else {
        layaRes = {
          success: false,
          latencyMs: 0,
          inputTokens: 0,
          error: { code: "not_in_cache", message: "Case not found in cached telemetry" },
        };
      }
    } else {
      if (!client) throw new Error("HostedLayaClient is not initialized.");
      layaRes = await client.triage(sc.message);
    }

    const tokens = layaRes.inputTokens || 0;
    totalTokensCharged += tokens;
    totalLayaLatencyMs += layaRes.latencyMs;

    if (layaRes.success) {
      layaSuccessCount++;
    }

    // 3. Guarded Hybrid Decision
    let hybridDecision: SmokeResultRow["guardedHybrid"];
    let fallbackOccurred = false;
    let fallbackReason: string | undefined = undefined;

    // Fast Path 1: Sensitive request / explicit human request / 2 failed attempts
    const isSecurity = isSecurityRequest(sc.message);
    const isHuman = isExplicitHumanRequest(sc.message);
    const isBilling = isBillingRequest(sc.message);

    if (isSecurity || isHuman || isBilling) {
      // Deterministic safety override directly triggered
      hybridDecision = {
        issueType: rulesRes.issueType,
        urgency: rulesRes.urgency,
        route: rulesRes.route,
        needsHuman: rulesRes.needsHuman,
        decisionLayer: "rules",
        fallbackOccurred: false,
        fallbackReason: "Safety fast-path triggered: sensitive/human request handled deterministically",
        latencyMs: rulesRes.latencyMs || 0,
      };
    } else if (layaRes.success && layaRes.issueType) {
      // Validate model output
      const raw = {
        issueType: layaRes.issueType as IssueType,
        urgency: (layaRes.urgency || "medium") as Urgency,
        needsHuman: layaRes.needsHuman ?? false,
        route: layaRes.needsHuman ? "human_handoff" : "rules_playbook",
        confidence: layaRes.confidence ?? 0.5,
        rationale: `Laya live decision (model=${layaRes.modelId || "laya"}, tokens=${tokens})`,
      };

      const val = validateModelOutput(raw, { message: sc.message });
      if (val.valid && val.sanitized) {
        hybridDecision = {
          issueType: val.sanitized.issueType,
          urgency: val.sanitized.urgency,
          route: val.sanitized.route,
          needsHuman: val.sanitized.needsHuman,
          decisionLayer: "laya",
          fallbackOccurred: false,
          latencyMs: layaRes.latencyMs,
        };
      } else {
        fallbackOccurred = true;
        fallbackReason = `Model output validation failed: ${val.reasons.join("; ")}`;
        hybridDecision = {
          issueType: rulesRes.issueType,
          urgency: rulesRes.urgency,
          route: rulesRes.route,
          needsHuman: rulesRes.needsHuman,
          decisionLayer: "fallback",
          fallbackOccurred: true,
          fallbackReason,
          latencyMs: layaRes.latencyMs,
        };
      }
    } else {
      // API call failed -> Fallback to rules
      fallbackOccurred = true;
      fallbackReason = layaRes.error ? `API Error: ${layaRes.error.code} - ${layaRes.error.message}` : "Laya API failure";
      hybridDecision = {
        issueType: rulesRes.issueType,
        urgency: rulesRes.urgency,
        route: rulesRes.route,
        needsHuman: rulesRes.needsHuman,
        decisionLayer: "fallback",
        fallbackOccurred: true,
        fallbackReason,
        latencyMs: layaRes.latencyMs,
      };
    }

    const row: SmokeResultRow = {
      caseId: sc.caseId,
      split: sc.split,
      message: sc.message,
      expected: {
        issueType: sc.expectedIssueType,
        urgency: sc.expectedUrgency,
        route: sc.expectedRoute,
        needsHuman: sc.expectedNeedsHuman,
      },
      rules: {
        issueType: rulesRes.issueType,
        urgency: rulesRes.urgency,
        route: rulesRes.route,
        needsHuman: rulesRes.needsHuman,
        latencyMs: rulesRes.latencyMs || 0,
      },
      rawLaya: {
        issueType: layaRes.issueType,
        urgency: layaRes.urgency,
        needsHuman: layaRes.needsHuman,
        confidence: layaRes.confidence,
        latencyMs: layaRes.latencyMs,
        tokensCharged: tokens,
        status: layaRes.success ? "200_OK" : (layaRes.error?.code || "FAILED"),
      },
      guardedHybrid: hybridDecision,
    };

    results.push(row);
    console.log(`DONE (${layaRes.latencyMs}ms, ${tokens} tokens, raw=${layaRes.issueType || "fail"}, hybrid=${hybridDecision.issueType}, layer=${hybridDecision.decisionLayer})`);

    // Polite pause between requests if calling live API
    if (!isCached) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Summary and Comparison Table
  console.log("\n================================================================================");
  console.log("SMOKE TEST RESULTS — COMPARISON TABLE");
  console.log("================================================================================");
  console.log(
    "Case ID".padEnd(9) +
    "Split".padEnd(11) +
    "Expected".padEnd(25) +
    "Rules".padEnd(25) +
    "Raw Laya".padEnd(25) +
    "Guarded Hybrid".padEnd(25) +
    "Tokens"
  );
  console.log("-".repeat(128));

  let rulesMatchCount = 0;
  let rawLayaMatchCount = 0;
  let hybridMatchCount = 0;

  for (const r of results) {
    const exp = r.expected.issueType;
    const rulesOk = r.rules.issueType === exp;
    const rawOk = r.rawLaya.issueType === exp;
    const hybridOk = r.guardedHybrid.issueType === exp;

    if (rulesOk) rulesMatchCount++;
    if (rawOk) rawLayaMatchCount++;
    if (hybridOk) hybridMatchCount++;

    console.log(
      r.caseId.padEnd(9) +
      r.split.padEnd(11) +
      r.expected.issueType.padEnd(25) +
      `${r.rules.issueType} ${rulesOk ? "✓" : "✗"}`.padEnd(25) +
      `${r.rawLaya.issueType || "FAIL"} ${rawOk ? "✓" : "✗"}`.padEnd(25) +
      `${r.guardedHybrid.issueType} (${r.guardedHybrid.decisionLayer}) ${hybridOk ? "✓" : "✗"}`.padEnd(25) +
      `${r.rawLaya.tokensCharged}`
    );
  }

  console.log("=".repeat(128));
  console.log(`Total Cases:              ${results.length}`);
  console.log(`Rules Accuracy:           ${rulesMatchCount}/${results.length} (${((rulesMatchCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`Raw Laya Accuracy:        ${rawLayaMatchCount}/${results.length} (${((rawLayaMatchCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`Guarded Hybrid Accuracy:  ${hybridMatchCount}/${results.length} (${((hybridMatchCount / results.length) * 100).toFixed(1)}%)`);
  console.log(`Total Input Tokens Used:  ${totalTokensCharged} tokens`);
  console.log(`Average Laya Latency:     ${(totalLayaLatencyMs / results.length).toFixed(0)} ms`);
  console.log(`API Call Success Rate:    ${layaSuccessCount}/${results.length} (${((layaSuccessCount / results.length) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  // Save audit log to docs/audits/laya_smoke_test_results.json
  writeFileSync(
    auditFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        totalCases: results.length,
        totalTokensCharged,
        averageLatencyMs: Math.round(totalLayaLatencyMs / results.length),
        layaSuccessCount,
        accuracy: {
          rules: rulesMatchCount / results.length,
          rawLaya: rawLayaMatchCount / results.length,
          guardedHybrid: hybridMatchCount / results.length,
        },
        results,
      },
      null,
      2
    )
  );
  console.log(`Saved detailed smoke test results to: ${auditFile}`);
}

main().catch((err) => {
  console.error("Smoke test failure:", err);
  process.exit(1);
});
