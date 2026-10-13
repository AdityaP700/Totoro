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
