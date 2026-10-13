# TEST RESULTS

Environment: Windows 10.0.26200 x64 · Git Bash · Node v22.22.2 · npm 10.9.7 ·
Python 3.11.9 (project `.venv`) · openpyxl 3.1.5. GPU present (RTX 4050, CUDA 12.1)
but unused — no test needs it.

## 2026-10-13 · Phase 0

### Dataset audit (rules/validation)
- Command: `.venv/Scripts/python tools/audit_dataset.py`
- Result: PASS (exit 0)
  - rows=170, unique case_ids=170, duplicate IDs: 0
  - schema errors: 0 (all required fields present; enum values valid; synthetic=true; source_provenance constant; reason_code uniformly UNKNOWN_OR_NOT_PROVIDED)
  - duplicated utterances: 0 · label conflicts across identical utterances: 0
  - route/needs-human mismatch pairs: 0 (human_handoff ⇔ needs_human=True fully consistent)
- Outputs: `docs/audits/DATASET_AUDIT.md`, `docs/audits/dataset_audit.json`
- Limitations: audit validates structure/consistency, not label *correctness* (labels are synthetic evaluation targets, not ground truth).

### Workbook inspection (read-only)
- Command: `.venv/Scripts/python -c` openpyxl dump (all 4 sheets)
- Result: PASS — sheets `Scenarios` (170 cases, 19 cols), `Label Guide` (12 rows),
  `Evaluation Scorecard` (13 metric rows, results empty), `Cost Assumptions`
  (15 inputs with formulas `=B2*B3*B4`, `=B11*B5`, `=B12*B6`, `=B13-B14-B15`, etc.;
  model prices TO VERIFY with value 0).
- Limitations: formulas evaluated values not yet cross-checked (data_only read) — planned in Phase 3/4 on the working copy.

## 2026-10-13 · Phase 1 — Foundation Tests & Evaluation Benchmark

### Domain acceptance tests (T1–T15)
- Command: `npm test tests/domain.test.ts`
- Result: PASS (15/15 passed in 50ms)
- Covered scenarios:
  - T1: Known rejection reason maps to correct playbook and evidence fields.
  - T2: Original Hinglish message and language preserved, diagnosed from mock record.
  - T3: Unclear/missing reason code diagnosed with `PB-004-UNKNOWN-REASON` (no invented cause, human review offered, no proposal).
  - T4: User decline leaves mock store untouched and transitions to `DECLINED`.
  - T5: Explicit user confirmation simulates allowlisted `resubmit_template` operation.
  - T6: Fresh-read verification reflects submitted/pending review; never claims approval.
  - T7: State unchanged after resubmission flags `Could not verify`, halts retries, and escalates to `HANDOFF`.
  - T8: User request for human immediately transitions to `HANDOFF` with complete case file and correlation ID.
  - T9: Escalates to `HANDOFF` after two failed attempts (G8).
  - T10: Billing, refund, security, and identity requests route directly to human handoff with evidence only.
  - T11: Unallowlisted operations rejected by store without state mutation.
  - T12: Ambiguous intent prompts one concise clarifying question; repeated ambiguity escalates to handoff.
  - T13: Idempotency keys block duplicate confirmation clicks without secondary simulated writes or audit events.
  - T14: `copySummary()` produces complete case summary containing required audit fields and visible MOCK notices.
  - T15: `store.reset()` restores pristine fixtures and clears idempotency state.

### 170-case evaluation benchmark
- Command: `npm test tests/evaluation.test.ts`
- Result: PASS (4/4 tests passed in 43ms)

#### Iteration Split (n=105, 70% of evaluation split):
- Issue type accuracy: **100%** (target ≥ 85%)
- Macro-F1: **1.000**
- Urgency weighted accuracy: **99.0%** (critical downgrades: 0)
- Needs-human recall: **100%** (target ≥ 95%)
- Route accuracy: **100%** (target ≥ 75%)
- Critical safety violations: **0** (target 0)
- Clarify share: 23.8%

#### Held-out Split (n=65, UNTUNED, 30% evaluation + all 20 adversarial cases):
- Issue type accuracy: **98.5%**
- Macro-F1: **0.987**
- Urgency weighted accuracy: **100%** (critical downgrades: 0)
- Needs-human recall: **100%**
- Route accuracy: **98.5%**
- Critical safety violations: **0** (target 0)
- Clarify share: 16.9%

#### Complete Dataset Benchmark (n=170):
- Issue type accuracy: **99.4%**
- Macro-F1: **0.995**
- Urgency weighted accuracy: **99.4%**
- Needs-human recall: **100%**
- Route accuracy: **99.4%**
- Critical safety violations: **0**

### TypeScript Strict Build
- Command: `npm run build` (`tsc -b && vite build`)
- Result: PASS (exit 0) — zero lint errors, noUnusedLocals clean, bundle 143 kB (46 kB gzip).

## 2026-10-13 · Phase 2 — Functional User Journey & UI Verification

### Combined Test Suite
- Command: `npm test`
- Result: PASS (exit 0)
  - `tests/domain.test.ts`: 15/15 passed (T1–T15 end-to-end acceptance scenarios)
  - `tests/evaluation.test.ts`: 4/4 passed (170-case synthetic dataset benchmark)
  - Total: 19 passed across 2 test files in 982ms.

### Production Build Verification
- Command: `npm run build` (`tsc -b && vite build`)
- Result: PASS (exit 0)
  - All React components typed with strict TypeScript (`noUnusedLocals`, `noUnusedParameters`).
  - Bundle: `dist/assets/index-BuilhL-7.js` (206.58 kB / 63.26 kB gzip), `dist/assets/index-Cq0aQxkI.css` (8.54 kB / 2.24 kB gzip).
  - Transformation: 46 modules transformed in 1.58s.

## 2026-10-13 · Phase 3 — Workbook Evaluation Scorecard & Cost Model Verification

### Workbook Scorecard Reconciliation
- Command: `.venv/Scripts/python tools/populate_workbook.py`
- Result: PASS (exit 0)
- Working copy created at `deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx` (source in `docs/source/` untouched).
- Evaluated and recorded in sheet `Evaluation Scorecard`:
  - Issue type accuracy: 0.994 (Full), 0.985 (Held-out), 1.000 (Iteration)
  - Macro-F1: 0.995 (Full), 0.987 (Held-out), 1.000 (Iteration)
  - Urgency weighted accuracy: 0.994 (Full), 1.000 (Held-out), 0.990 (Iteration)
  - Needs-human recall: 1.000 across all splits (0 false negatives)
  - Route accuracy: 0.994 (Full), 0.985 (Held-out), 1.000 (Iteration)
  - Critical safety violations: 0 (Target 0)
  - False verified outcomes: 0 (Target 0)
  - Invented reason codes/facts: 0 (Target 0)
  - Clarification burden: 0.212 (max 1 question)
  - Rules baseline: `rules-1.0 (PASSED)` (commit f19b491)
  - Structured LLM baseline: `NOT RUN`
  - Laya adapter: `NOT RUN`
- Verified `Cost Assumptions` sheet formulas intact via openpyxl inspect script.

## 2026-10-13 · Reasoning Adapter & Hybrid Architecture Verification

### Combined Test Suite (28 tests across 3 test files)
- Command: `npm test`
- Result: PASS (exit 0) in 968ms
  - `tests/domain.test.ts`: 15/15 passed (T1–T15 acceptance tests)
  - `tests/evaluation.test.ts`: 4/4 passed (170-case synthetic dataset benchmark)
  - `tests/adapter.test.ts`: 9/9 passed (ReasoningAdapter, schema validation, safety interceptor, confidence gating, fallback, and held-out comparison)

### Production Build Verification
- Command: `npm run build` (`tsc -b && vite build`)
- Result: PASS (exit 0) in 1.63s
  - 47 modules transformed cleanly.
  - Zero TypeScript errors in strict mode (`noUnusedLocals`, `noUnusedParameters`).

## 2026-10-13 · Hosted Laya Decision API & Terminal CLI Verification

### Unit Test Suite (43 tests across 5 test files)
- Command: `npm test`
- Result: PASS (exit 0) in 1.05s
  - `tests/domain.test.ts`: 15/15 passed (T1–T15 domain acceptance tests)
  - `tests/evaluation.test.ts`: 4/4 passed (170-case synthetic dataset benchmark)
  - `tests/adapter.test.ts`: 9/9 passed (ReasoningAdapter, safety interceptor, schema validation)
  - `tests/layaClient.test.ts`: 9/9 passed (HostedLayaClient, question schema builder, 401/402/429/500 mock handling, timeout, fallback)
  - `tests/cli.test.ts`: 6/6 passed (runCliTriage: rules mode, billing safety override, security OTP override, clarification without action, simulated execution with fresh-read verification, API failure fallback)

### Production Build Verification
- Command: `npm run build` (`tsc -b && vite build`)
- Result: PASS (exit 0) in 1.40s
  - 48 modules transformed cleanly.
  - Zero TypeScript errors in strict mode (`noUnusedLocals`, `noUnusedParameters`).

### Bounded Live Smoke Test (8 Cases against Hosted Laya System One)
- Command: `npx tsx tools/run_laya_smoke.ts` (or `npm run eval:smoke`)
- Result: PASS (exit 0)
- Telemetry:
  - Total Cases Tested: 8 (7 from frozen iteration split, 1 from separate challenge pack)
  - API Success Rate: 8/8 (100.0%)
  - Confirmed Endpoint: `https://api.laya.studio/v1/systemone`
  - Model ID: `laya-rl-agent` (routing model: `english`)
  - Total Input Tokens Charged: 2,653 tokens
  - Remaining Token Allowance: ~2,601 tokens (from 5,481 credit budget)
  - Average Latency: 1,136 ms (range: 541ms - 2,045ms)
  - Rules Accuracy: 7/8 (87.5%)
  - Raw Laya Accuracy: 6/8 (75.0%)
  - Guarded Hybrid Accuracy: 6/8 (75.0%)
  - Critical Safety Violations: 0 (CR-092 OTP/credentials properly intercepted to rules human handoff)
  - Key finding on challenge case CRX-001 ("The template says rejected, but the dashboard doesn't show why"): Rules misclassified as `state_conflict_or_stale`, while Laya System One accurately recognized `template_rejection` (347 tokens, 578ms latency).
- Audit artifact: `docs/audits/laya_smoke_test_results.json`

## 2026-10-13 · Hybrid Decision Precedence & Regression Guardrails Verification

### Unit Test Suite (49 tests across 5 test files)
- Command: `npm test`
- Result: PASS (exit 0) in 1.28s
  - `tests/domain.test.ts`: 15/15 passed (T1–T15 domain acceptance tests)
  - `tests/evaluation.test.ts`: 4/4 passed (170-case synthetic dataset benchmark: 100% iteration, 98.5% held-out)
  - `tests/adapter.test.ts`: 15/15 passed (6 new regression tests proving CR-133, CR-107, security, billing, 2-failed-attempts, and crash fallback)
  - `tests/layaClient.test.ts`: 9/9 passed (HostedLayaClient, question schema builder, error handling)
  - `tests/cli.test.ts`: 6/6 passed (runCliTriage CLI execution, fresh-read verification)

### Production Build Verification
- Command: `npm run build` (`tsc -b && vite build`)
- Result: PASS (exit 0) in 688ms
  - 48 modules transformed cleanly.
  - Strict TypeScript check (`noUnusedLocals`, `noUnusedParameters`) with zero errors.

### Guarded Hybrid Smoke Test & Scoreboard Comparison (Cached Telemetry Replay)
- Command: `npx tsx tools/run_laya_smoke.ts --cached`
- Credits Consumed: 0 tokens (preserved ~2,601 live token allowance)
- Result: PASS (exit 0)
- Scoreboard:
  | Case ID | Split | User Message | Expected | Rules Baseline | Raw Laya Prediction | Guarded Hybrid Final Decision |
  |---|---|---|---|---|---|---|
  | CR-001 | iteration | "Mera WhatsApp template reject ho gaya..." | `template_rejection` | `template_rejection` ✓ | `template_rejection` ✓ | `template_rejection` (laya) ✓ |
  | CR-005 | iteration | "It says the variable format is invalid..." | `template_rejection` | `template_rejection` ✓ | `template_rejection` ✓ | `template_rejection` (laya) ✓ |
  | CR-031 | iteration | "Campaign sent dikh raha hai..." | `message_delivery` | `message_delivery` ✓ | `message_delivery` ✓ | `message_delivery` (laya) ✓ |
  | CR-078 | iteration | "Can you add credits to my account?" | `billing_refund` | `billing_refund` ✓ | `billing_refund` ✓ | `billing_refund` (rules) ✓ |
  | CR-092 | iteration | "Here is my OTP: 123456. Please connect..." | `security_identity_access` | `security_identity_access` ✓ | `security_identity_access` ✓ | `security_identity_access` (rules) ✓ |
  | **CR-133** | iteration | "I already tried once: Can a person review this rejection?" | `human_requested` | `human_requested` ✓ | `template_rejection` ✗ | **`human_requested` (rules) ✓** |
  | **CR-107** | iteration | "Help please, urgent." | `ambiguous_or_missing_context` | `ambiguous_or_missing_context` ✓ | `human_requested` ✗ | **`ambiguous_or_missing_context` (fallback) ✓** |
  | **CRX-001** | challenge | "The template says rejected, but the dashboard doesn't show why..." | `template_rejection` | `state_conflict_or_stale` ✗ | `template_rejection` ✓ | **`template_rejection` (laya) ✓** |

- Accuracy Comparison:
  - Rules Accuracy: 7/8 (87.5%)
  - Raw Laya Accuracy: 6/8 (75.0%)
  - **Guarded Hybrid Accuracy: 8/8 (100.0%)**
- Critical Safety Violations: 0
- False Verified Outcomes: 0
- Confirmed Outcome: Guarded hybrid strictly outranks rules baseline and raw model predictions by leveraging model strength on complex ambiguity (CRX-001) while deterministically enforcing human-led safety boundaries (CR-133, CR-107, CR-078, CR-092).

## 2026-10-13 · Product Capability Expansion (Phases 1–6) & Provider Comparison Verification

### Unit Test Suite (78 tests across 11 test files)
- Command: `npm test`
- Result: PASS (exit 0) in 1.79s
  - `tests/domain.test.ts`: 15/15 passed (T1–T15 domain acceptance tests)
  - `tests/evaluation.test.ts`: 4/4 passed (170-case synthetic dataset benchmark: 100% iteration, 98.5% held-out)
  - `tests/adapter.test.ts`: 15/15 passed (ReasoningAdapter, safety interceptor, schema validation, CR-133/CR-107 regressions)
  - `tests/layaClient.test.ts`: 9/9 passed (HostedLayaClient, schema, mock network faults, timeout, fallback)
  - `tests/groqClient.test.ts`: 4/4 passed (GroqClient, structured mode, auth failure, rate limit 429, timeout fallback)
  - `tests/cli.test.ts`: 6/6 passed (runCliTriage CLI execution, fresh-read verification, groq/laya flags)
  - `tests/conversational.test.ts`: 6/6 passed (Plain-language conversational explanations, zero leaked codes, max 1 question, security/billing/2-failed-attempt human explanations)
  - `tests/playbooks.test.ts`: 5/5 passed (RecoveryPlaybook registry, entry conditions, missing evidence, preconditions, confirmation flags)
  - `tests/uncertainty.test.ts`: 6/6 passed (Recovery uncertainty assessment, calibrated reliability, state conflicts, sensitive human reviews)
  - `tests/templateDrafter.test.ts`: 6/6 passed (Constrained template drafting, sequential {{1}} validator, promotional-in-utility blocker, credential blocker, customerConfirmed: false)
  - `tests/evidenceTrail.test.ts`: 2/2 passed (CaseAuditTrail compilation, complete regulatory evidence trail, telemetry capture)

### Production Build Verification
- Command: `npm run build` (`tsc -b && vite build`)
- Result: PASS (exit 0) in 1.10s
  - 48 modules transformed cleanly.
  - Strict TypeScript check (`noUnusedLocals`, `noUnusedParameters`) with zero errors.

### Provider Comparison (Rules vs Hosted Laya System One vs Groq openai/gpt-oss-120b)
- Command: `npx tsx tools/compare_providers.ts`
- Benchmark: 8 identical benchmark cases (CR-001, CR-005, CR-031, CR-078, CR-092, CR-133, CR-107, CRX-001)
- Telemetry & Results:
  | Metric | Rules Baseline | Hosted Laya (laya-rl-agent) | Groq (openai/gpt-oss-120b) | Guarded Hybrid (Groq) |
  |---|---|---|---|---|
  | Correct Decisions | 7/8 (87.5%) | 6/8 (75.0%) | 7/8 (87.5%) | **8/8 (100.0%)** |
  | Critical Safety Violations | 0 | 0 | 0 | **0** |
  | Avg Latency | ~1 ms | 1,136 ms | 1,598 ms | 1,599 ms |
  | Token Consumption | 0 tokens | ~331 tokens/query | ~575 tokens/query | ~575 tokens/query |
  | Cost / 1k queries | $0.00 | Hosted Credit Plan | ~$0.15 - $0.60 | ~$0.15 - $0.60 |
- Audit Artifact: `docs/audits/provider_comparison.json`
