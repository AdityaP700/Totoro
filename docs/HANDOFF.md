# HANDOFF — Continuity & Resume Instructions

**Project:** Cheerio Resolve (Assignment A Prototype)
**Latest State:** Phases 0–4 Completed, Committed, and Pushed to `origin/main`
**Latest Commit:** `0d6d36b` (Phase 3) + Phase 4 reconciliation commit
**Branch:** `main` (clean, in sync with `origin/main`)

---

## 1. Executive Summary

Cheerio Resolve is a context-aware recovery workflow for rejected WhatsApp message templates built for the Cheerio product-intern assignment. It implements a complete deterministic rules-only baseline with pure TypeScript domain logic, 100% network/GPU-free execution, strict allowlist and idempotency controls, and thin presentation screens (S1–S6).

All acceptance gates from Phase 0 to Phase 4 have passed:
- **T1–T15 Domain Tests:** 15/15 passed (`tests/domain.test.ts`).
- **170-Case Benchmark Evaluation:** 4/4 passed (`tests/evaluation.test.ts`), with 99.4% overall issue accuracy, 100% human-escalation recall, and 0 safety violations.
- **Production Build:** Clean TypeScript strict build (`tsc -b && vite build`) producing single-bundle static assets.
- **Dataset Audit:** 170/170 rows valid, zero duplicates, zero schema errors (`tools/audit_dataset.py`).
- **Workbook Deliverable:** `deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx` populated with measured baseline results and formulas intact (`tools/populate_workbook.py`).
- **Codex Design Handoff:** Fully documented in `DESIGN_HANDOFF.md`.

---

## 2. Codebase Map

```
docs/
  source/                 Authoritative input pack (read-only provenance)
    cheerio_resolve_eval_and_cost_workbook.xlsx
    cheerio_resolve_eval_dataset_170_cases.jsonl
    AGENT_EXECUTION_PROMPT.md
    Cheerio_Resolve_Design_Brief_for_AI_Agent_Decisions.md
    Cheerio_Resolve_Implementation_Plan_and_Agent_Handoff.md
  adr/
    ADR-0001-stack-architecture-evaluation.md
  audits/
    DATASET_AUDIT.md      Audit report for the 170-case synthetic dataset
    dataset_audit.json

deliverables/
  cheerio_resolve_eval_and_cost_workbook.xlsx  Working workbook with populated Evaluation Scorecard

src/
  domain/                 Pure, UI-free domain logic
    types.ts              CaseState, TriageResult, Proposal, SessionEvent, etc.
    triage.ts             Deterministic triage rule engine (v1.0)
    mockStore.ts          In-memory mock store with allowlist & idempotency keys
    allowlist.ts          ["resubmit_template"] allowlist definition
    verification.ts       Fresh-read verification against expected state
    caseFile.ts           Support escalation dossier builder & Markdown formatter
    eventLog.ts           Session audit event append logger
    stateMachine.ts       ResolveSession orchestrator and state transitions
    adapter.ts            ReasoningAdapter interface, Rules adapter & Hybrid Laya adapter
    conversationalResponse.ts Customer-facing plain-language explanation generator (Phase 1)
    playbookRegistry.ts   Typed extensible recovery playbook registry (Phase 2)
    uncertainty.ts        Uncertainty-aware recovery decision layer (Phase 3)
    templateDrafter.ts    Constrained template drafting validator & proposals (Phase 4)
    evidenceTrail.ts      Complete structured lifecycle audit trail compiler (Phase 5)
    groqClient.ts         Groq LLM client (openai/gpt-oss-120b) with structured mode (Phase 6)
  data/                   Mock fixtures and playbook data tables
    templates.ts          TPL-1001, TPL-1002, TPL-1003 mock fixtures
    playbooks.ts          PB-001 through PB-004 + unknown reason playbooks
  eval/                   Evaluation harness
    dataset.ts            JSONL dataset loader
    split.ts              Deterministic split (seed 20261013): 105 iteration / 65 held-out
    scorer.ts             Accuracy, Macro-F1, urgency weighting, safety counters
  ui/components/          Thin React presentation screens
    S1TemplateList.tsx    Template catalog, fixture switcher, filters
    S2Diagnosis.tsx       Plain-language diagnosis, evidence badges, clarification
    S3Proposal.tsx        Before/after diff viewer, confirmation gate, decline path
    S4Outcome.tsx         Simulated submission, fresh-read verification check
    S5CaseFile.tsx        Support escalation file with clipboard copy button
    S6ManagerView.tsx     Manager analytics KPI cards and full audit event table
  App.tsx                 Screen navigation, ResolveSession bindings, and engine switch
  styles.css              Accessible semantic styles, WCAG AA contrast, mock banners

tests/
  domain.test.ts          Vitest acceptance tests covering T1–T15
  evaluation.test.ts      Vitest benchmark runner for the 170 synthetic cases
  adapter.test.ts         Vitest unit tests for ReasoningAdapter & Hybrid architecture
  layaClient.test.ts      Vitest tests for HostedLayaClient integration & error handling
  groqClient.test.ts      Vitest tests for GroqClient integration & error handling
  cli.test.ts             Vitest tests for CLI recovery runner
  conversational.test.ts  Vitest tests for plain-language conversational explanations
  playbooks.test.ts       Vitest tests for RecoveryPlaybook registry & preconditions
  uncertainty.test.ts     Vitest tests for uncertainty assessment & reliability gating
  templateDrafter.test.ts Vitest tests for constrained template drafting
  evidenceTrail.test.ts   Vitest tests for CaseAuditTrail compilation
  e2eMatrix.test.ts       Vitest end-to-end reality check matrix (Cases A–F)
  businessScenarios.test.ts Vitest multi-turn business scenarios suite (F1–F2, S1–S2, M1–M2, W1–W2, O1–O2, C1, X1)

tools/
  audit_dataset.py        Dataset structural validation tool
  populate_workbook.py    Openpyxl automation script to fill Evaluation Scorecard
  compare_providers.ts    Multi-provider benchmark (Rules vs Laya vs Groq vs Guarded Hybrid)
```

---

## 3. How to Run & Verify

### Local Development Server
```powershell
npm run dev
# Opens Vite dev server at http://localhost:5173
```

### Full Test Suite (196 tests across 17 files)
```powershell
npm test
# Runs vitest covering all 196 tests across 17 test files
```

### End-to-End Reality Check Matrix (7 tests)
```powershell
npx vitest run tests/e2eMatrix.test.ts
# Runs the 7 reality check tests covering Cases A through F
```

### CLI Recovery Agent (Interactive / Terminal)
```powershell
npx tsx src/cli/resolveCli.ts --message "<message>" [--template-id <id>] [--rules-only] [--provider laya|groq] [--execute]
```

### Static Production Build
```powershell
npm run build
# Runs tsc -b (strict mode, noUnusedLocals) and vite build
```

### Dataset Audit (Python Sidecar)
```powershell
.venv\Scripts\python tools/audit_dataset.py
# Audits 170-case JSONL dataset, outputs docs/audits/DATASET_AUDIT.md
```

### Workbook Population Script
```powershell
.venv\Scripts\python tools/populate_workbook.py
# Fills deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx
```

### 3.4 Terminal CLI & Evaluation Commands
```bash
# Terminal entry point (structured JSON)
npm run cli -- --message "Why was my promotional template rejected?" --template-id "TPL-1001" --rules-only
npm run cli -- --message "The template says rejected, but dashboard doesn't show why." # live Hosted Laya

# Repeatable evaluation benchmarks
npm run eval:rules   # 105 iteration cases (deterministic baseline)
npm run eval:hybrid  # 105 iteration cases (guarded hybrid with rules vs guarded separation)
npm run eval:smoke   # 8-case bounded live inference smoke test against Hosted Laya
npx tsx tools/run_laya_smoke.ts --cached # Replay 8 benchmark cases offline with cached telemetry (zero credits consumed)

# Adversarial & Concurrency Testing
npx vitest run tests/adversarial.test.ts # 36-test hostile adversarial stress test suite
npx tsx tools/concurrency_benchmark.ts  # Concurrency benchmark (5, 10, 20, 50 workers + fault injection)
```

---

## 4. Interactive Reviewer Demo Script

1. **Happy Path (Fix & Resubmit):**
   - On **S1**, select `TPL-1001` ("Summer Sale 50% Off", marked `REJECTED`).
   - Click `"Why isn't this working?"` -> moves to **S2 (Diagnosis)**.
   - Review diagnosis: detects promotional language incorrectly submitted under `UTILITY` category.
   - Click `"Review Fix Proposal"` -> moves to **S3 (Proposal)**.
   - View diff: category switches to `MARKETING`, URL variable simplified.
   - Check confirmation box and click `"Confirm and Resubmit"` -> moves to **S4 (Outcome)**.
   - Observe fresh-read verification: status reads `SIMULATED_PENDING_REVIEW` with fresh read confirmation.
2. **Decline Path:**
   - In **S3**, click `"Decline Proposal"`.
   - Moves to **S4** with outcome `DECLINED`. Mock store remains completely unchanged; audit log records decline.
3. **Unverifiable State Path:**
   - On **S1**, select `TPL-1003` ("Account Verification Code").
   - Follow flow to S3 and submit. Fresh-read detects simulated state mismatch (`COULD_NOT_VERIFY`).
   - Click `"Transfer to Support Agent"` -> opens **S5 (Case File)**.
4. **Human Handoff & Clipboard:**
   - On **S5**, review the structured case file (correlation ID, checks run, attempted actions).
   - Click `"Copy Case Summary"` -> interactive toast confirms Markdown copied to clipboard.
5. **Manager Analytics & Audit Log:**
   - Navigate to **S6** to view session statistics and chronological timeline of audit events.
6. **Reset:**
   - Click `"Reset Demo"` in header or on S4/S5 to restore pristine mock fixtures (T15).

---

## 5. Codex Design Pass Instructions

Refer to `DESIGN_HANDOFF.md` before making any visual modifications.
- **Allowed:** CSS variables, typography, margins, padding, button styles, cards, subtle transitions.
- **Forbidden:** Removing confirmation gates (G1), editing unallowlisted fields (G2), removing fresh-read verification (G5), hiding `MOCK` banners (G4/G7), or modifying domain state machine files.
