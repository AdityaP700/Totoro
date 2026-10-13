# CHANGELOG

User-visible changes. (Internal engineering notes live in the other continuity files.)

## 2026-10-13 — Phase 0 (inspection & decisions)

- Added the full source pack to `docs/source/` (design brief, implementation handoff,
  research dossier, master prompt pack, dataset schema, 170-case synthetic dataset,
  original workbook) as read-only provenance.
- Added dataset audit tooling (`tools/audit_dataset.py`) and the first audit report
  (`docs/audits/DATASET_AUDIT.md`): 170/170 rows valid, no duplicates, no label conflicts.
- Added architecture decision record (`docs/adr/ADR-0001…`) selecting the TypeScript +
  Vite + React + Vitest stack and the pure-domain-core architecture.
- Added risk register, decision log and all continuity files; added `.gitignore` and
  pinned Python sidecar requirements (openpyxl only).

## 2026-10-13 — Phase 1 (foundation domain core, acceptance tests, evaluation harness)

- Implemented pure TypeScript domain core: `ResolveSession` state machine, deterministic rules triage v1.0, playbooks data table, in-memory mock store with narrow allowlist and idempotency enforcement, fresh-read state verification, and audit event logging.
- Added comprehensive domain acceptance test suite `tests/domain.test.ts` implementing and passing scenarios T1 through T15.
- Added 170-case synthetic dataset evaluation test suite `tests/evaluation.test.ts` running seed-20261013 deterministic iteration/held-out splits:
  - Iteration split achieved 100% issue accuracy, 100% route accuracy, 100% needs-human recall, and 0 critical safety violations.
  - Held-out split achieved 98.5% issue accuracy, 98.5% route accuracy, 100% needs-human recall, and 0 critical safety violations.
- Verified TypeScript strict build (`tsc -b && vite build`) passes cleanly with zero errors.

## 2026-10-13 — Phase 2 (functional user journey screens S1–S6 & Codex design handoff)

- Built functional presentation components in `src/ui/components/`:
  - `S1TemplateList`: catalog view with status pills, fixture switcher (`TPL-1001`, `TPL-1002`, `TPL-1003`), filters, and entry button.
  - `S2Diagnosis`: diagnostic explanations, evidence fields with provenance labels, unverified boundaries, and user clarification flow.
  - `S3Proposal`: side-by-side before/after diff viewer, scope boundary notice, explicit confirmation gate, and decline option.
  - `S4Outcome`: simulated resubmission status, fresh-read state verification, and outcome states (Pending, Verified, Could-Not-Verify, Declined).
  - `S5CaseFile`: complete human escalation case file with structured diagnostic context and interactive clipboard copy button.
  - `S6ManagerView`: manager analytics overview and full chronological audit timeline table.
- Connected multi-screen state machine orchestration in `src/App.tsx` supporting the happy path, decline path, unverified failure path, human request escalation, and clean demo reset.
- Added semantic responsive styles in `src/styles.css` with WCAG AA contrast and visible `MOCK` / `SIMULATED` banners.
- Created `DESIGN_HANDOFF.md` documenting screen inventory, state contracts, component boundaries, and non-negotiable guardrails for the upcoming Codex visual design pass.

## 2026-10-13 — Phase 3 (workbook evaluation scorecard & cost model verification)

- Created working copy `deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx` preserving original `docs/source/` provenance untouched.
- Populated `Evaluation Scorecard` sheet with measured rules baseline metrics from Phase 1 test execution across all 170 synthetic cases.
- Kept `Structured LLM baseline` and `Laya adapter` marked `NOT RUN` with honest explanatory notes (no unapproved API tokens, no network calls, GPU kept dormant).
- Verified `Cost Assumptions` sheet formulas (`=B2*B3*B4`, `=B11*B5`, `=B12*B6`, `=B13-B14-B15`) and evidence labels preserved intact.
- Added `tools/populate_workbook.py` automation script using `.venv` and pinned `openpyxl`.

## 2026-10-13 — Phase 4 (functional submission, assignment reconciliation & final verification)

- Verified clean test execution across full domain acceptance suite T1–T15 and 170-case evaluation benchmark (19/19 tests passing).
- Verified production static build (`tsc -b && vite build`) passing cleanly with zero TypeScript errors or bundle warnings.
- Ran automated dataset audit (`tools/audit_dataset.py`) confirming 170/170 rows valid with zero schema or label errors.
- Authored `SUBMISSION_DRAFT.md` featuring assignment reconciliation matrix, reviewer screenshot checklist, demo walkthrough script, unresolved risks, and transparent AI usage disclosure.
- Updated `HANDOFF.md` with comprehensive instructions, architecture map, and verification commands.
