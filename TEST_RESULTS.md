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

## Pending
- Phase 1: vitest domain tests + T1–T15 + 170-case evaluation (iteration/held-out).
