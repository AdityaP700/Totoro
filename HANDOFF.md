# HANDOFF — resume instructions for a different agent

## Where things stand (2026-10-13)

Phase 0 complete except its commit. See `IMPLEMENTATION_STATE.md` for the live
checklist and `docs/adr/ADR-0001-stack-architecture-evaluation.md` for the
architecture. All continuity files are current.

## Resume in five steps

1. Read `AGENTS.md` (rules) and `IMPLEMENTATION_STATE.md` (exact next step).
2. `git status --short --branch` — confirm the Phase 0 files exist and nothing
   unexpected is modified. If the Phase 0 commit is missing, commit the files listed
   there with explicit paths (never `git add -A`).
3. Push attempt per `DECISION_LOG.md` D-010 (`git push -u origin main`); record result.
4. Start Phase 1 per `docs/source/AGENT_EXECUTION_PROMPT.md`:
   - Scaffold: `package.json`, Vite, React 18, TS strict, Vitest. No CSS framework.
   - Implement `src/domain/`: `types.ts` (MockTemplate, TriageResult, Playbook,
     AuditEvent, CaseFile per handoff §7–9), `stateMachine.ts` (ENTRY→…→VERIFY→
     RESOLVED/PENDING + CLARIFY_ONCE/DECLINED/HANDOFF), `triage.ts` (deterministic
     rules), `allowlist.ts`, `verification.ts` (fresh read + expected match),
     `caseFile.ts`, `eventLog.ts` (correlation ID, idempotent confirm).
   - `src/data/`: three template fixtures + playbook table as JSON/TS data.
   - `tests/`: T1–T15 from handoff §10 + dataset eval harness with the seed-20261013
     split (`src/eval/split.ts`; all 20 adversarial + 30% of evaluation held out).
5. Update continuity files; commit Phase 1 only if tests pass (or document the
   approved exception).

## Hard reminders

- Rules-only core; everything mock-labelled; no network, keys, GPU or model downloads.
- Held-out split must exist before any rule tuning; never tune on held-out.
- UI stays structurally plain — Codex does design later (`DESIGN_HANDOFF.md` from Phase 2).
- The user must personally rewrite all user-facing copy and the submission narrative
  before submission (assignment policy G15).
