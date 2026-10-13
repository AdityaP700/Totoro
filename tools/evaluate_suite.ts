import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
import { loadDataset } from "../src/eval/dataset";
import { buildSplit } from "../src/eval/split";
import { scoreCases, scorecardRows, countSafety } from "../src/eval/scorer";
import { RulesReasoningAdapter, HybridLayaReasoningAdapter } from "../src/domain/adapter";
import type { TriageResult } from "../src/domain/types";

// Load .env if present
try {
  if (typeof process !== "undefined" && typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile();
  }
} catch {
  // Ignore missing .env
}

interface SuiteOptions {
  mode: "rules" | "hybrid" | "raw";
  splitTarget: "iteration" | "held_out" | "all";
}

async function runSuite() {
  const args = process.argv.slice(2);
  let mode: SuiteOptions["mode"] = "rules";
  let splitTarget: SuiteOptions["splitTarget"] = "iteration";

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--mode") mode = (args[++i] as any) || "rules";
    if (a === "--split") splitTarget = (args[++i] as any) || "iteration";
  }

  console.log("================================================================================");
  console.log(`Cheerio Resolve Evaluation Suite — Mode: ${mode.toUpperCase()} | Split: ${splitTarget.toUpperCase()}`);
  console.log("================================================================================\n");

  const allCases = loadDataset();
  const { iteration, heldOut } = buildSplit(allCases);

  const evalCases =
    splitTarget === "iteration"
      ? iteration
      : splitTarget === "held_out"
      ? heldOut
      : allCases;

  console.log(`Evaluating ${evalCases.length} cases from ${splitTarget} split...`);

  const rulesAdapter = new RulesReasoningAdapter();
  const hybridAdapter = new HybridLayaReasoningAdapter();

  const caseOutputs: Array<{
    caseId: string;
    expected: {
      issueType: string;
      urgency: string;
      route: string;
      needsHuman: boolean;
    };
    predicted: {
      issueType: string;
      urgency: string;
      route: string;
      needsHuman: boolean;
      decisionLayer: string;
      rationale: string;
    };
    isCorrectIssue: boolean;
    isCorrectRoute: boolean;
    isCorrectUrgency: boolean;
    isCorrectNeedsHuman: boolean;
    latencyMs: number;
  }> = [];

  const predictor = (c: typeof evalCases[0]): TriageResult => {
    let res: TriageResult;
    if (mode === "rules") {
      res = rulesAdapter.triage({ message: c.user_message });
    } else {
      res = hybridAdapter.triage({ message: c.user_message });
    }

    caseOutputs.push({
      caseId: c.case_id,
      expected: {
        issueType: c.issue_type,
        urgency: c.urgency,
        route: c.expected_route,
        needsHuman: c.needs_human,
      },
      predicted: {
        issueType: res.issueType,
        urgency: res.urgency,
        route: res.route,
        needsHuman: res.needsHuman,
        decisionLayer: res.decisionLayer || "rules",
        rationale: res.rationale,
      },
      isCorrectIssue: res.issueType === c.issue_type,
      isCorrectRoute: res.route === c.expected_route,
      isCorrectUrgency: res.urgency === c.urgency,
      isCorrectNeedsHuman: res.needsHuman === c.needs_human,
      latencyMs: res.latencyMs || 0,
    });

    return res;
  };

  const metrics = scoreCases(evalCases, predictor);
  const scorecard = scorecardRows(metrics);

  console.log("\n=================== EVALUATION SCORECARD ===================");
  for (const row of scorecard) {
    console.log(`${row.metric.padEnd(30)} : ${row.result.padEnd(20)} [${row.notes}]`);
  }
  console.log("============================================================\n");

  console.log("Per-Issue Class Breakdown (Macro-F1 & Support):");
  for (const [issue, stats] of Object.entries(metrics.perIssue)) {
    console.log(`- ${issue.padEnd(30)}: support=${String(stats.support).padEnd(4)} correct=${String(stats.correct).padEnd(4)} F1=${stats.f1.toFixed(3)}`);
  }

  const safetyViolations = countSafety(metrics);
  console.log(`\nCritical Safety Violations: ${safetyViolations}`);
  console.log(`Completed Cases Count:     ${evalCases.length}`);

  // Save audit artifact
  const outDir = resolve(currentDir, "../docs/audits");
  mkdirSync(outDir, { recursive: true });
  const outFile = resolve(outDir, `eval_${mode}_${splitTarget}.json`);
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        mode,
        split: splitTarget,
        caseCount: evalCases.length,
        metrics: {
          issueAccuracy: metrics.issueAccuracy,
          macroF1: metrics.macroF1,
          urgencyAccuracy: metrics.urgencyAccuracy,
          routeAccuracy: metrics.routeAccuracy,
          needsHumanRecall: metrics.needsHumanRecall,
          needsHumanPrecision: metrics.needsHumanPrecision,
          clarifyShare: metrics.clarifyShare,
          criticalSafetyViolations: safetyViolations,
        },
        perIssue: metrics.perIssue,
        caseOutputs,
        errors: metrics.errors,
      },
      null,
      2
    )
  );

  console.log(`\nDetailed evaluation artifact written to: ${outFile}\n`);
}

runSuite().catch((err) => {
  console.error("Evaluation error:", err);
  process.exit(1);
});
