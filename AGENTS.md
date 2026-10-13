# AGENTS.md — Cheerio Resolve (Totoro repo)

Durable rules for any coding agent working in this repository. Read this before changing anything.

## What this project is

A functional prototype of **Cheerio Resolve** — a context-aware support-recovery flow
for the Cheerio product-intern assignment. One journey: rejected WhatsApp template →
read mock state → rules triage → diagnosis → before/after proposal → explicit
confirmation → simulated action → fresh-read verification → verified/pending or
human handoff with a complete case file.

Authoritative inputs live in `docs/source/` (design brief with guardrails G1–G15 and
decisions D1–D11, implementation handoff, dataset pack). Precedence: G1–G15 > D1–D11 +
assignment brief > decision package/phase plans > dataset schema/execution prompt >
documented engineering judgement.

## Non-negotiable rules

1. **Rules-only baseline.** The core flow must run deterministically with no network,
   no API keys, no GPU. Any model adapter is optional and must be labelled `NOT RUN`
   unless actually evaluated.
2. **No real Cheerio/Meta calls. Ever.** All state is mock fixtures, visibly labelled
   `MOCK` / `SIMULATED` in UI, events and docs.
3. **No write before explicit confirmation** tied to the exact before/after change
   (G1). Writes only via the allowlist module (G2/D8). `Submitted/pending` is never
   `Verified`; "Verified" requires a fresh state read matching expected (G5/D6).
4. **Never invent facts**: no provider reason codes, no live status, no prices without
   a verified source + date. Evidence labels: DOCUMENTED / REPORTED / HYPOTHESIS /
   ASSUMPTION / SYNTHETIC / UNKNOWN.
5. **Human-led zones**: billing/refunds/credits, security/identity/access/ownership,
   destructive actions, human requests, conflicting/missing state, two failed
   attempts, failed verification → handoff with case file (G8–G12).
6. **Preserve user work**: inspect `git status` first; never reset/clean/force-push;
   stage explicit paths only; one small commit per phase.
7. **Do not touch `.env*`** (create/read/commit). `.env.example` only if the source
   plan explicitly permits, with fake placeholders.
8. **Stack**: TypeScript + Vite + React (see `docs/adr/ADR-0001`). Domain logic in
   `src/domain/` is pure and UI-free; UI is thin typed components in `src/ui/`.
   Do not add a second framework, a CSS framework, or visual polish — the user's
   later Codex pass owns design (see `DESIGN_HANDOFF.md`).
9. **Python sidecar** (`.venv`, pinned `requirements.txt`) is for workbook/audit
   tooling only. No GPU/ML packages. GPU is present (RTX 4050) but must stay unused.
10. **Dataset is synthetic** (`SYNTHETIC_AUTHORED_NOT_REAL_TICKETS`). Never treat
    labels as provider truth; keep the deterministic held-out split
    (seed in `src/eval/split.ts`) untouched by tuning.

## Project map

```
docs/source/     input pack (read-only provenance; includes the 170-case dataset)
docs/adr/        architecture decision records
docs/audits/     dataset/workbook audit outputs (regenerable via tools/)
src/domain/      pure domain: state machine, triage, playbooks, verification, case file, events
src/data/        mock fixtures + playbook/rule tables (data, not code)
src/eval/        dataset loader, deterministic split, scorer, rules baseline runner
src/ui/          thin React screens S1–S6 (mock labels, semantic HTML)
tests/           vitest: domain tests + T1–T15 + 170-case evaluation
tools/           python: audit_dataset.py, workbook scripts (run with .venv)
deliverables/    working copy of the cost/eval workbook
```

## Commands

- `npm install` · `npm run dev` (local UI) · `npm test` (vitest, includes dataset eval)
- `npm run build` (static build) · `.venv/Scripts/python tools/audit_dataset.py` (dataset audit)

## Continuity files to keep updated

`IMPLEMENTATION_STATE.md` (current phase + exact next step), `DECISION_LOG.md`,
`FAILURES_AND_LEARNINGS.md`, `TEST_RESULTS.md`, `HANDOFF.md`, `CHANGELOG.md`,
`DESIGN_HANDOFF.md`. Update after every phase and immediately on meaningful failure.
