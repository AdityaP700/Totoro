# HANDOFF — resume instructions for the next agent

## Where things stand (2026-10-13, after Phase 1 WIP commit)

Phase 0 is complete and pushed (`57f4f63`). Phase 1 is ~60% done: the whole
domain core and evaluation harness are written but **never executed** — no test
file exists yet. `IMPLEMENTATION_STATE.md` "Exact next command / task" is the
authoritative resume checklist.

## Read these files first, in order

1. `AGENTS.md` — durable rules (guardrails, boundaries, commands).
2. `IMPLEMENTATION_STATE.md` — exact status + next steps.
3. `HANDOFF.md` (this file) + `DECISION_LOG.md` (D-001…D-010) + `RISK_REGISTER.md`.
4. `docs/adr/ADR-0001-stack-architecture-evaluation.md` — stack + eval protocol.
5. `docs/source/AGENT_EXECUTION_PROMPT.md` — the operative phase-gate spec.
6. `docs/source/Cheerio_Resolve_Design_Brief_for_AI_Agent_Decisions.md` — G1–G15,
   D1–D11 (binding).
7. `docs/source/Cheerio_Resolve_Implementation_Plan_and_Agent_Handoff.md` — state
   machine spec (§5), screens (§6), fixtures/playbooks (§7), T1–T15 (§10).

## Code map (all written, none tested)

- `src/domain/types.ts` — all domain types (CaseState, TriageResult, Proposal…).
- `src/domain/triage.ts` — deterministic rules v1.0 (`TRIAGE_RULE_VERSION`),
  ordered rule table + clarify transforms; never emits provider codes; never
  echoes the raw message in rationale.
- `src/data/templates.ts` — MOCK workspace + 3 rejected-template fixtures
  (TPL-1001 promo-in-utility → simulates PENDING; TPL-1002 malformed variable →
  PENDING; TPL-1003 category mismatch → simulates NO-CHANGE failure path/T7).
- `src/data/playbooks.ts` — 4 playbooks keyed on FIXTURE_* reason codes +
  UNKNOWN_REASON playbook (no proposal; human review offer).
- `src/domain/mockStore.ts` — the ONLY mutation path; enforces allowlist,
  exact before/after confirmation, idempotency (duplicate key = blocked).
- `src/domain/allowlist.ts` — `["resubmit_template"]` constant.
- `src/domain/verification.ts` — fresh-read vs expected ("Verified" only on
  match; PENDING ≠ approved).
- `src/domain/eventLog.ts` / `src/domain/caseFile.ts` — audit events; complete
  case file + `copySummary`.
- `src/domain/stateMachine.ts` — `ResolveSession`: constructor runs
  ENTRY→READ_STATE→TRIAGE→(route); `clarify(answer)`, `approveProposal()`,
  `declineProposal()`, `requestHuman()`; two-failed-attempts escalation; T13
  duplicate-confirm blocked.
- `src/eval/dataset.ts` (JSONL loader), `src/eval/split.ts` (seed 20261013,
  70/30 + all adversarial in held-out — DO NOT retune membership),
  `src/eval/scorer.ts` (metrics + separate safety counters).

## Known cautions

- `ResolveSession` deps need deterministic `now()`/`newId()` in tests (inject).
- `triage.ts` has a `CLARIFY_TRANSFORMS` regex list; the "policy_question_can_i"
  transform matches messages STARTING with "can i" — dataset has several such
  cases (e.g. CR-022, CR-025) that expect clarify_once.
- `mockStore.checkExactChange` compares full before/after JSON — proposal
  `buildChanges` must return the template's current values as `before`.
- Watch `tsconfig.json` `noUnusedLocals` — delete dead imports before build.
- Tests: `npm test` (vitest, node env). Build: `npm run build` (tsc -b + vite).
- Never tune rules on held-out; safety bugs (missed escalation, invented codes)
  may be fixed anywhere — guardrails outrank the tuning protocol; log it.

## Git

- Branch `main`; remote origin configured and pushing works.
- Commit style: "Phase N: <summary>"; explicit paths only; never `git add -A`;
  never touch `.zcodeignore` (user file) or `.env*`.

## Quota note

This handoff exists because the original agent approached its usage budget.
Everything needed to continue is in the repo; no conversation context is
required beyond these files.
