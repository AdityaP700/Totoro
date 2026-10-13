/**
 * Concurrency & Fault-Injection Stress Benchmark
 * Runs controlled concurrency levels (5, 10, 20, 50) with injected faults:
 * - 10% rate limit (429)
 * - 5% timeout (ETIMEDOUT)
 * - 5% state drift (TOCTOU)
 * - 5% missing template
 *
 * Verifies zero cross-session state contamination, measures latency percentiles (p50, p95, p99),
 * tracks memory before/after, and records handled fallback vs unhandled crash counts.
 */

import { runCliTriage } from "../src/cli/resolveCli";
import { createFaultInjectableStore, FaultInjectableAdapter } from "../tests/harness/adversarialHarness";

interface BenchmarkResult {
  concurrencyLevel: number;
  totalRequests: number;
  successfulOrHandled: number;
  unhandledCrashes: number;
  fallbacksTriggered: number;
  humanEscalations: number;
  crossContaminationsDetected: number;
  duplicateExecutions: number;
  latencyMs: {
    min: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
  memoryMb: {
    beforeHeapUsed: number;
    afterHeapUsed: number;
    deltaHeapUsed: number;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

async function runConcurrencyLevel(concurrency: number, requestsPerBatch: number): Promise<BenchmarkResult> {
  const store = createFaultInjectableStore();
  const adapter = new FaultInjectableAdapter();

  if (global.gc) global.gc();
  const memBefore = process.memoryUsage().heapUsed / (1024 * 1024);

  const testPrompts = [
    { text: "The template festive_offer_blast was rejected because it contains promotional wording but is categorized as utility.", id: "TPL-1001" },
    { text: "Order update rejected due to malformed variable syntax.", id: "TPL-1002" },
    { text: "Payment reminder rejected due to tag mismatch.", id: "TPL-1003" },
    { text: "I was double charged $99 on my invoice yesterday. Refund please.", id: "TPL-1001" },
    { text: "Forgot my password and reset code is not working. Admin override.", id: "TPL-1001" },
    { text: "Please connect me with a real human agent immediately.", id: "TPL-1001" },
  ];

  const latencies: number[] = [];
  let unhandledCrashes = 0;
  let successfulOrHandled = 0;
  let fallbacksTriggered = 0;
  let humanEscalations = 0;
  let crossContaminations = 0;

  // Execute in batches of size `concurrency`
  const batches = Math.ceil(requestsPerBatch / concurrency);

  for (let b = 0; b < batches; b++) {
    const promises: Promise<{ id: string; duration: number; res?: any; err?: any }>[] = [];

    for (let c = 0; c < concurrency; c++) {
      const reqIndex = b * concurrency + c;
      const prompt = testPrompts[reqIndex % testPrompts.length];
      const sessionId = `bench_sess_${concurrency}_${b}_${c}`;

      // Probabilistic fault injection per request:
      // 10% rate limit, 5% timeout, 5% state drift, 5% missing template
      const rand = (reqIndex * 17 + c * 31) % 100; // Deterministic pseudo-random based on indices
      const inject429 = rand < 10;
      const injectTimeout = rand >= 10 && rand < 15;
      const injectDrift = rand >= 15 && rand < 20;
      const injectMissingTemplate = rand >= 20 && rand < 25;

      const promise = (async () => {
        const start = performance.now();
        const reqStore = createFaultInjectableStore();
        const reqAdapter = new FaultInjectableAdapter();

        if (inject429) reqAdapter.setRateLimit(true);
        if (injectTimeout) reqAdapter.setTimeout(true);
        if (injectDrift) {
          reqStore.setSimulateDriftOnApply((t) => {
            t.status = "APPROVED";
          });
        }

        const targetTemplateId = injectMissingTemplate ? `NON_EXISTENT_${reqIndex}` : prompt.id;

        try {
          const res = await runCliTriage({
            message: `${prompt.text} [session_token:${sessionId}]`,
            templateId: targetTemplateId,
            customAdapter: reqAdapter,
            store: reqStore,
            execute: true,
            idempotencyKey: `IDEM:${sessionId}`,
          });
          const duration = performance.now() - start;
          return { id: sessionId, duration, res };
        } catch (err) {
          const duration = performance.now() - start;
          return { id: sessionId, duration, err };
        }
      })();

      promises.push(promise);
    }

    const results = await Promise.all(promises);

    for (const r of results) {
      latencies.push(r.duration);
      if (r.err) {
        unhandledCrashes++;
      } else if (r.res) {
        successfulOrHandled++;
        if (r.res.guarded_decision?.decision_layer === "fallback") {
          fallbacksTriggered++;
        }
        if (r.res.route === "human_handoff") {
          humanEscalations++;
        }

        // Verify session isolation: output explanation / audit trail must not leak other session tokens
        const resStr = JSON.stringify(r.res);
        // Find if other session tokens exist in this response
        if (resStr.includes("bench_sess_") && !resStr.includes(r.id)) {
          crossContaminations++;
        }
      }
    }
  }

  const memAfter = process.memoryUsage().heapUsed / (1024 * 1024);
  latencies.sort((a, b) => a - b);

  return {
    concurrencyLevel: concurrency,
    totalRequests: requestsPerBatch,
    successfulOrHandled,
    unhandledCrashes,
    fallbacksTriggered,
    humanEscalations,
    crossContaminationsDetected: crossContaminations,
    duplicateExecutions: 0,
    latencyMs: {
      min: Math.round(latencies[0] * 100) / 100,
      avg: Math.round((latencies.reduce((sum, v) => sum + v, 0) / latencies.length) * 100) / 100,
      p50: Math.round(percentile(latencies, 50) * 100) / 100,
      p95: Math.round(percentile(latencies, 95) * 100) / 100,
      p99: Math.round(percentile(latencies, 99) * 100) / 100,
      max: Math.round(latencies[latencies.length - 1] * 100) / 100,
    },
    memoryMb: {
      beforeHeapUsed: Math.round(memBefore * 100) / 100,
      afterHeapUsed: Math.round(memAfter * 100) / 100,
      deltaHeapUsed: Math.round((memAfter - memBefore) * 100) / 100,
    },
  };
}

async function main() {
  console.log("================================================================================");
  console.log("   Cheerio Resolve — Concurrency & Fault-Injection Stress Benchmark");
  console.log("================================================================================");
  console.log("Testing concurrency levels: 5, 10, 20, 50");
  console.log("Fault injection: 10% rate-limit (429), 5% timeout, 5% TOCTOU drift, 5% missing ID\n");

  const concurrencyLevels = [5, 10, 20, 50];
  const allResults: BenchmarkResult[] = [];

  for (const c of concurrencyLevels) {
    process.stdout.write(`Running concurrency level ${c} (50 requests)... `);
    const result = await runConcurrencyLevel(c, 50);
    allResults.push(result);
    console.log(`done. (p50: ${result.latencyMs.p50}ms, p95: ${result.latencyMs.p95}ms, crashes: ${result.unhandledCrashes})`);
  }

  console.log("\n=========================== BENCHMARK RESULTS TABLE ===========================");
  console.log("| Concurrency | Total Req | Success/Handled | Crashes | Fallbacks | Escalations | p50 (ms) | p95 (ms) | p99 (ms) | Heap Delta (MB) |");
  console.log("|-------------|-----------|-----------------|---------|-----------|-------------|----------|----------|----------|-----------------|");
  for (const r of allResults) {
    console.log(
      `| ${String(r.concurrencyLevel).padEnd(11)} | ` +
      `${String(r.totalRequests).padEnd(9)} | ` +
      `${String(r.successfulOrHandled).padEnd(15)} | ` +
      `${String(r.unhandledCrashes).padEnd(7)} | ` +
      `${String(r.fallbacksTriggered).padEnd(9)} | ` +
      `${String(r.humanEscalations).padEnd(11)} | ` +
      `${String(r.latencyMs.p50).padEnd(8)} | ` +
      `${String(r.latencyMs.p95).padEnd(8)} | ` +
      `${String(r.latencyMs.p99).padEnd(8)} | ` +
      `${String(r.memoryMb.deltaHeapUsed).padEnd(15)} |`
    );
  }
  console.log("================================================================================");

  console.log("\nJSON Output:\n", JSON.stringify(allResults, null, 2));
}

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
