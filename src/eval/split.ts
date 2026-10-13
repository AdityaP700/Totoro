import type { EvalCase } from "./dataset";

/**
 * Deterministic iteration/held-out split (DECISION_LOG D-004).
 *
 * Protocol (workbook "Label Guide"): 70% iteration / 30% held-out, with all
 * adversarial cases preserved in the held-out set. Membership is fixed by the
 * seed below and MUST NOT change after rule tuning starts; the held-out set is
 * never used to tune rules — development iterates on `iteration` only.
 *
 * Seed: 20261013 (mulberry32 PRNG; stable across Node versions).
 */
export const SPLIT_SEED = 20261013;

export interface Split {
  iteration: EvalCase[];
  heldOut: EvalCase[];
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSplit(cases: EvalCase[]): Split {
  const evaluation = cases
    .filter((c) => c.split === "evaluation")
    .map((c) => ({ c, r: mulberry32(SPLIT_SEED ^ hash(c.case_id))() }))
    .sort((a, b) => a.r - b.r || a.c.case_id.localeCompare(b.c.case_id))
    .map((x) => x.c);

  // 30% of the 150 evaluation cases → 45, plus all 20 adversarial → 65 held-out.
  const heldOutEvalCount = Math.round(evaluation.length * 0.3);
  const heldOut = [
    ...evaluation.slice(0, heldOutEvalCount),
    ...cases.filter((c) => c.split === "adversarial"),
  ];
  const iteration = evaluation.slice(heldOutEvalCount);
  return { iteration, heldOut };
}

function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
