# ADR-0001 — Stack, architecture, evaluation approach and scope cuts

Date: 2026-10-13 · Status: Accepted · Owner: implementation agent (Z Code)

## Context

Cheerio Resolve is a context-aware support-recovery prototype for the Cheerio
product-intern assignment (Assignment A). The repo `Totoro` was empty at Phase 0
start: no commits, no stack, no `.gitignore`, remote `origin/main` unborn
(https://github.com/AdityaP700/Totoro.git). All product behaviour must run
deterministically in rules-only mode; no real Cheerio/Meta API calls; every mock
value visibly labelled (G1–G15, D1–D11 in `docs/source/Cheerio_Resolve_Design_Brief_for_AI_Agent_Decisions.md`).

## Decision 1 — Stack: single TypeScript stack (ASSUMPTION — engineering choice)

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | The implementation handoff specifies TS types (`MockTemplate`, `Playbook`, `TriageResult`, `AuditEvent`); one language for domain, UI and evaluation |
| Build/dev | Vite | Smallest viable dev server + static build for a clickable prototype |
| UI | React 18, function components, typed props | Thin presentation components over a pure domain core; clean replacement boundary for the later Codex design pass |
| Styling | One plain CSS file, semantic HTML, no CSS framework | Phase 2 requires functional/accessible structure, not visual polish (execution prompt: Codex owns design later) |
| Tests | Vitest (domain + evaluation harness) | Runs the 170-case dataset as data-driven tests with zero network |
| Python sidecar | `.venv` + pinned `requirements.txt` (openpyxl 3.1.5 only) | Workbook editing/audit only. No GPU/ML packages |

Rejected: Python backend (second service — execution prompt forbids unnecessary
stacks), Next.js (server complexity unneeded for a mock-only demo), a chat-UI
library (the design brief forbids a chat window as the only surface).

## Decision 2 — Architecture: pure domain core, thin UI shell

```
src/
  domain/     types.ts, stateMachine.ts, triage.ts, playbooks.ts,
              verification.ts, caseFile.ts, eventLog.ts, allowlist.ts
  data/       templates.ts (3 fixture variants), playbooks.ts (rule table as data)
  eval/       dataset.ts (loader), scorer.ts, rulesBaseline.ts (reuses domain/triage)
  ui/         thin React components S1–S6 (mock-labelled, accessible)
tests/        vitest: state machine, triage, allowlist, verification, T1–T15,
              170-case evaluation (iteration vs held-out)
tools/        python: audit_dataset.py, workbook scripts
deliverables/ working workbook copy (source workbook in docs/source stays untouched)
```

Rules for the boundary:
- Domain modules are pure functions/state; no React imports. UI components receive
  typed props and dispatch events to the state machine.
- Playbooks and policy live in `src/data/` as data (D4/P4), editable without UI changes.
- Writes go through `allowlist.ts` only; model/triage output never becomes a tool call (G2/D8).

## Decision 3 — State machine

Exactly the states of the implementation handoff §5:
`ENTRY → READ_STATE → TRIAGE → DIAGNOSE → PROPOSE → CONFIRM → APPLY_SIMULATED_ACTION → VERIFY → RESOLVED | PENDING`, plus `CLARIFY_ONCE`, `DECLINED`, `HANDOFF`.
- `HANDOFF` reachable from every pre-terminal state (human request, unsafe, low
  confidence, conflict, failed verification, two failed attempts — G8/G9, escalation list).
- `VERIFY` re-reads mock state and compares to expected; "Verified" only on match (G5/D6).
- Duplicate confirmation submissions blocked (G11/T13); reset restores fixtures (T15).

## Decision 4 — Triage (rules baseline) and evaluation protocol

- Rules: deterministic keyword/regex rules over the user message + state flags,
  returning `issueType`, `urgency`, `needsHuman`, `route`, `confidence`, `rationale`.
  Unknown reason codes are never guessed (D10); missing/conflicting state routes to
  clarify-once or handoff.
- Evaluation: `tools/audit_dataset.py` validates the dataset (done, clean). The 170
  cases run through the rules baseline in vitest, scored per the workbook's
  Evaluation Scorecard: issue accuracy, macro-F1, urgency weighted accuracy,
  needs-human recall, route accuracy; safety violations counted separately (target 0).
- Split: the Label Guide's suggested protocol — 70% iteration / 30% held-out with
  all 20 adversarial cases preserved in held-out; deterministic seed recorded in
  `src/eval/split.ts` (seed 20261013). Held-out is never used to tune rules.
- Optional model adapter (Phase 3): structured-output LLM or Laya only if the user
  supplies credentials/approval; otherwise `NOT RUN`. Laya weights are never
  downloaded without explicit approval. GPU (RTX 4050, CUDA 12.1 present) is not
  used — no workload needs it.

## Decision 5 — Mock data and reason codes

Three template fixtures per the handoff §7: promotional wording in a Utility
template, broken variable format, category mismatch. Fixture reason codes use
clearly-labelled internal codes (e.g. `FIXTURE_PROMO_UTILITY`); if browser-use
verifies a documented provider reason string (URL + date recorded), it may be
cited as DOCUMENTED context but never synthesised as the template's live code.

## Initial end-to-end sequence (S1→S5)

1. S1 template list (mock label) → tap "Why isn't this working?" on the rejected fixture
2. State machine READ_STATE loads the mock record; TRIAGE classifies
3. S2 diagnosis: reason code + plain-language explanation + evidence + what cannot be verified
4. S3 before/after with per-change reason; "Review and resubmit" is the only write gate
5. APPLY_SIMULATED_ACTION (labelled simulated) → VERIFY fresh read
6. S4 shows Verified / Submitted–pending / Could not verify (never "approved")
7. Any failure/uncertainty/human request → S5 case file with correlation ID

## Scope cuts (deliberately not built)

- No general chatbot, no standalone dashboard, no second bot, no S6 unless S1–S5 are solid.
- No real API integration, no autonomous writes, no billing/refund/security automation.
- No visual design polish, animations, illustrations or design-system work (Codex owns that later; DESIGN_HANDOFF.md is the boundary artifact).
- No model hosting, no Laya weights download, no fine-tuning, no GPU packages.
- No production auth/permissions; mock permission checks only.

## Risks deferred to RISK_REGISTER.md; conflicts recorded in DECISION_LOG.md.
