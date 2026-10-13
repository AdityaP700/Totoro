import { describe, it, expect } from "vitest";
import { loadDataset } from "../src/eval/dataset";
import { buildSplit } from "../src/eval/split";
import { scoreCases, scorecardRows, countSafety } from "../src/eval/scorer";
import { triageMessage } from "../src/domain/triage";

describe("Cheerio Resolve — 170-Case Dataset Evaluation Benchmark", () => {
  const allCases = loadDataset();
  const { iteration, heldOut } = buildSplit(allCases);

  it("loads 170 cases and splits deterministically into 105 iteration and 65 held-out", () => {
    expect(allCases.length).toBe(170);
    expect(iteration.length).toBe(105);
    expect(heldOut.length).toBe(65);

    // All 20 adversarial cases must be in the held-out split (Label Guide / D-004)
    const adversarialInHeldOut = heldOut.filter((c) => c.split === "adversarial");
    expect(adversarialInHeldOut.length).toBe(20);
    const adversarialInIteration = iteration.filter((c) => c.split === "adversarial");
    expect(adversarialInIteration.length).toBe(0);
  });

  it("meets required performance thresholds on the ITERATION split", () => {
    const metrics = scoreCases(iteration, (c) => triageMessage(c.user_message));
    const scorecard = scorecardRows(metrics);

    console.log("\n=================== ITERATION SPLIT SCORECARD (n=105) ===================");
    for (const row of scorecard) {
      console.log(`${row.metric.padEnd(30)} : ${row.result.padEnd(20)} [${row.notes}]`);
    }
    console.log("========================================================================\n");

    if (metrics.errors.length > 0) {
      console.log(`Iteration split errors count: ${metrics.errors.length}`);
      for (const err of metrics.errors.slice(0, 15)) {
        console.log(`- [${err.caseId}] field=${err.field}: expected=${err.expected}, predicted=${err.predicted} | msg: "${err.message}"`);
      }
    }

    // Required thresholds on iteration split:
    // issue accuracy >= 0.85
    expect(metrics.issueAccuracy).toBeGreaterThanOrEqual(0.85);

    // route accuracy >= 0.75
    expect(metrics.routeAccuracy).toBeGreaterThanOrEqual(0.75);

    // needs-human recall >= 0.95
    expect(metrics.needsHumanRecall).toBeGreaterThanOrEqual(0.95);

    // Safety violations must be exactly 0
    expect(countSafety(metrics)).toBe(0);
    expect(metrics.safety.missedEscalations.length).toBe(0);
    expect(metrics.safety.ignoredHumanRequests.length).toBe(0);
    expect(metrics.safety.messageEchoCases.length).toBe(0);
    expect(metrics.criticalDowngrades.length).toBe(0);
  });

  it("evaluates and reports the HELD-OUT split without tuning rules on it", () => {
    const metrics = scoreCases(heldOut, (c) => triageMessage(c.user_message));
    const scorecard = scorecardRows(metrics);

    console.log("\n=================== HELD-OUT SPLIT SCORECARD (n=65) ===================");
    console.log("NOTE: Held-out split is never used to tune rules (DECISION_LOG D-004).");
    for (const row of scorecard) {
      console.log(`${row.metric.padEnd(30)} : ${row.result.padEnd(20)} [${row.notes}]`);
    }
    console.log("=======================================================================\n");

    // Report and assert basic sanity (never tuned on held-out)
    expect(metrics.n).toBe(65);
    // Safety check: no message echo in rationale
    expect(metrics.safety.messageEchoCases.length).toBe(0);
  });

  it("scores the complete 170-case synthetic dataset for overall baseline reference", () => {
    const metrics = scoreCases(allCases, (c) => triageMessage(c.user_message));
    const scorecard = scorecardRows(metrics);

    console.log("\n=================== COMPLETE DATASET SCORECARD (n=170) ===================");
    for (const row of scorecard) {
      console.log(`${row.metric.padEnd(30)} : ${row.result.padEnd(20)} [${row.notes}]`);
    }
    console.log("==========================================================================\n");

    expect(metrics.n).toBe(170);
  });
});
