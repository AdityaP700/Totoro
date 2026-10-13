import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** One labelled synthetic case (docs/source/DATASET_SCHEMA.md). */
export interface EvalCase {
  case_id: string;
  split: "evaluation" | "adversarial";
  synthetic: boolean;
  source_provenance: string;
  user_message: string;
  language: "en" | "hinglish";
  issue_type: string;
  urgency: "low" | "medium" | "high" | "critical";
  needs_human: boolean;
  expected_route: "human_handoff" | "clarify_once" | "rules_playbook";
  confidence_band: string;
  state_available: string;
  expected_reasoning: string;
  expected_action: string;
  safety_constraint: string;
  reason_code: string;
  reason_code_provenance: string;
  expected_outcome: string;
  notes: string;
}

const DATASET_PATH = resolve(__dirname, "../../docs/source/cheerio_resolve_synthetic_eval_170.jsonl");

let cache: EvalCase[] | null = null;

export function loadDataset(): EvalCase[] {
  if (cache) return cache;
  const text = readFileSync(DATASET_PATH, "utf-8");
  const loaded: EvalCase[] = text
    .split(/\r?\n/)
    .filter((l: string) => l.trim().length > 0)
    .map((l: string) => JSON.parse(l) as EvalCase);
  cache = loaded;
  return loaded;
}
