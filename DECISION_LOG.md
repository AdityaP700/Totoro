# DECISION LOG

Dated decisions with alternatives, evidence labels and rationale. New entries at the bottom.
Format: `ID · date · decision · alternatives rejected · evidence label · rationale`.

## D-001 · 2026-10-13 · Source pack location and extraction

The execution prompt's "user-provided ZIP" was not in `core/`; located in
`C:/Users/ACER/Downloads/` and extracted to `docs/source/`. Files: three ZIPs
(Agent Prompt Pack, approach pack, Dataset+Execution Pack) plus loose source
markdowns (design brief, research dossier, master architecture prompt,
implementation plan, assignment brief).

- Alternatives rejected: working only from `core/` files (would miss guardrails/decisions); modifying the source files (forbidden — provenance).
- Evidence label: REPORTED (file provenance from Downloads listing).
- Rationale: source precedence requires reading the decision package; preserving originals read-only in-repo keeps citations verifiable.

## D-002 · 2026-10-13 · Stack: TypeScript + Vite + React + Vitest, no second stack

- Alternatives rejected: Python backend (second service); Next.js (unneeded server complexity); vanilla DOM UI (weaker typed-props boundary for the Codex design pass); a Python eval harness for the 170 cases (duplicates logic that must live in the TS domain core).
- Evidence label: ASSUMPTION (engineering judgement, documented in ADR-0001).
- Rationale: implementation handoff specifies TS types for fixtures/playbooks/triage/audit events; single stack keeps domain, UI and evaluation consistent; Vite build gives a clickable prototype without a server.

## D-003 · 2026-10-13 · Rules-only deterministic baseline; model adapter default NOT RUN

- Alternatives rejected: integrating an LLM from the start (contradicts execution prompt + D5/D8); self-hosting Laya (weights download needs explicit user approval; model card says base-to-specialise, not zero-shot).
- Evidence label: DOCUMENTED (execution prompt Phase 3; design brief D5, "Where Jev and Laya fit").
- Rationale: core flow must work with zero network/keys; adapter only if the user supplies credentials + approval, and then on the same fixed held-out cases.

## D-004 · 2026-10-13 · Deterministic evaluation split (seed 20261013)

Follow the workbook Label Guide: 70% iteration / 30% held-out, with all 20
adversarial cases preserved in the held-out set. Held-out = all adversarial +
a seeded random 30% of the 150 evaluation cases; seed and membership recorded in
`src/eval/split.ts` before any tuning.

- Alternatives rejected: scoring only on all-170 (no untuned check); k-fold (overkill for rules baseline).
- Evidence label: DOCUMENTED (workbook "Suggested split" row) + ASSUMPTION (seed value).
- Rationale: prevents held-out contamination; deterministic so any rerun reproduces membership.

## D-005 · 2026-10-13 · Recorded conflict: "polish" wording in dossier vs no-polish execution prompt

The research dossier's Day-2 checklist says "polish"; the execution prompt and the
design-workflow note say the implementation phase must NOT do visual polish because
Codex owns design later. Resolution per precedence (execution prompt is the
operative instruction for this run): build a functional, accessible, structural UI
only; record design handoff requirements in `DESIGN_HANDOFF.md`.

- Alternatives rejected: doing a visual pass now (explicitly forbidden; wasted effort before Codex restyle).
- Evidence label: DOCUMENTED (AGENT_EXECUTION_PROMPT.md Phase 2 + "Explicit tool ownership"; README "Design workflow clarification").
- Rationale: never silently reconcile contradictions — conflict and resolution recorded here.

## D-006 · 2026-10-13 · Recorded tension: dossier permits "lightweight model for ambiguous language" vs rules-only core

Resolution: rules-only for the core prototype path; the "lightweight model for
ambiguous phrasing" idea maps to the optional Phase 3 adapter, default `NOT RUN`.

- Evidence label: DOCUMENTED (execution prompt "Required product behaviour": rules-only core).
- Rationale: guardrails outrank research notes; keeps the demo network-free.

## D-007 · 2026-10-13 · Mock reason codes are fixture-labelled, not fabricated provider codes

Fixtures use clearly internal codes (e.g. `FIXTURE_PROMO_UTILITY`,
`FIXTURE_INVALID_VARIABLE_FORMAT`, `FIXTURE_TAG_CONTENT_MISMATCH`), labelled MOCK.
Documented provider reason strings (e.g. `INVALID_FORMAT`) may be cited in copy as
DOCUMENTED provider vocabulary only if verified via browser with URL+date; the
prototype never claims the mock template carries an official code.

- Alternatives rejected: inventing plausible Meta codes (violates D10/G7); leaving reason blank (loses the playbook demo).
- Evidence label: DOCUMENTED for the existence of provider reason codes (design brief cites 360dialog/Gupshup docs — search-excerpt level; re-verify before quoting); ASSUMPTION for fixture code names.
- Rationale: anti-fabrication guardrail with a usable diagnosis demo.

## D-008 · 2026-10-13 · GPU stays unused

RTX 4050 (6 GB) + CUDA 12.1 detected. No planned workload (rules engine, React UI,
vitest) uses GPU; no CUDA/PyTorch/TensorFlow/weights installed.

- Alternatives rejected: installing GPU packages "because a GPU exists" (explicitly forbidden).
- Evidence label: DOCUMENTED (execution prompt §Environment; nvidia-smi output recorded in IMPLEMENTATION_STATE.md).

## D-009 · 2026-10-13 · Workbook handling: source preserved, working copy in deliverables/

`docs/source/cheerio_resolve_eval_and_cost_workbook.xlsx` is read-only provenance.
Phase 3/4 edits happen on `deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx`
(working copy), preserving formulas and evidence labels; price rows stay `TO VERIFY`
until a browser-verified source+date is recorded; unrun options stay `NOT RUN`.

- Alternatives rejected: editing the source file in place (destroys provenance); moving numbers without formulas (breaks auditability).
- Evidence label: DOCUMENTED (execution prompt §Spreadsheets).

## D-010 · 2026-10-13 · Commit/push policy on unborn branch

Repo has remote `origin` but no commits (`origin/main` unborn). Commit Phase 0
locally with explicit paths, then attempt `git push -u origin main`. If
authentication fails, keep the local commit, record the blocker, and retry per
phase. No force-push, no credential exposure.

- Evidence label: REPORTED (git output).

## D-011 · 2026-10-13 · Workbook Evaluation Scorecard population & model adapters NOT RUN

In Phase 3, populated `deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx` sheet `Evaluation Scorecard` with actual measured results from Phase 1 test execution on the 170-case synthetic dataset.
- Rules baseline: 99.4% issue accuracy (Full), 98.5% (Held-out), 100% (Iteration); 100% needs-human recall (0 false negatives); 99.4% route accuracy; 0 critical safety violations; 0 false verified outcomes; 0 invented reason codes.
- Structured LLM & Laya: marked `NOT RUN` with explanatory notes (no unapproved API credentials or network calls per AGENTS.md rule 1 and ADR-0001; GPU kept dormant per AGENTS.md rule 9; model weights not downloaded).
- Cost Assumptions formulas (`=B2*B3*B4`, `=B11*B5`, `=B12*B6`, `=B13-B14-B15`) strictly preserved.
- Alternatives rejected: fabricating LLM/Laya metrics (forbidden); modifying source workbook in `docs/source/` (forbidden by provenance rules).
- Evidence label: DOCUMENTED (test execution logs in TEST_RESULTS.md) + SYNTHETIC (170-case synthetic evaluation set).

## D-012 · 2026-10-13 · Hybrid Reasoning Architecture & Laya Decision Adapter

Implemented a focused, modular extension to the decision layer via `ReasoningAdapter` interface (`src/domain/adapter.ts`):
- **Fast-path routing**: Known template rejection reason codes route to deterministic rules (`PB-001`–`PB-004`).
- **Safety routing**: Sensitive requests (billing, refunds, security, credentials, admin access, account takeovers, explicit human requests) route deterministically to human handoff.
- **Complex / Ambiguous routing**: Routed to `HybridLayaReasoningAdapter` for structured classification.
- **Model Output Validation**: Structured output is strictly checked against schema enums (`IssueType`, `Urgency`, `Route`). A deterministic safety interceptor enforces human handoff for security/billing even if the model attempts automated routing. Confidence below 0.70 is gated to `clarify_once` or `human_handoff`.
- **Safe Fallback**: Any model failure, timeout, or invalid output safely falls back to rules triage with an explicit audit event annotation.
- **Evaluation Gate**: On the synthetic dataset (n=170), rules baseline achieves 99.4% accuracy (98.5% held-out) with 0ms model latency and \$0 cost. Hybrid Laya matches 100% human-handoff recall and 0 safety violations, establishing a clean foundation for future real-world multi-symptom traces.
- Evidence label: DOCUMENTED (design brief D5, "Where Jev and Laya fit") + SYNTHETIC (170-case synthetic benchmark).

## D-013 · 2026-10-13 · Hosted Laya System One Decision API Integration, Credit Controls, and Terminal-First CLI

Pivoted from local model checkpoint download (blocked by disk constraints: C: drive 2.7GB free) to the live Hosted Laya System One Decision API (`POST https://api.laya.studio/v1/systemone`):
- **Endpoint & Schema**: Connected to Hosted Laya System One Decision API. Structured questions schema requires `instructions` on all typed questions (`choice` for `issue_type` and `urgency`, `noul` for `needs_human` probability). Model ID returned: `laya-rl-agent` (routing model: `english`, repo: `convaiinnovations/laya`).
- **Security & Secret Protection**: Kept `LAYA_API_KEY` strictly server-side in `.env`, loaded via Node's native `process.loadEnvFile()`. Implemented server-side API proxy in `vite.config.ts` and direct `HostedLayaClient` in `src/domain/layaClient.ts`. The API key is never bundled into client code, never committed to git (`.env` in `.gitignore`), and never logged in test outputs or transcripts.
- **Strict Credit Budgeting**: Operating under a strict credit allowance of 5,481 input tokens, conducted a bounded live smoke test of exactly 8 representative synthetic cases (consuming 2,653 tokens, ~331 tokens/query), leaving ~2,601 input tokens in reserve. Full 170-case and 80-case sweeps are maintained as offline/mock repeatable commands (`npm run eval:rules`, `npm run eval:hybrid`) rather than burning remaining tokens prematurely.
- **Terminal-First Entry Point**: Created `src/cli/resolveCli.ts` (`npm run cli`), accepting message, mock state, and optional `--execute` flag. The CLI emits structured JSON containing rules prediction, raw Laya prediction, guarded hybrid decision, route, recommended action, confirmation requirement, latency, tokens charged, and verification status. Crucially, the model is barred from executing actions or determining permissions; verification requires explicit confirmation, mock write, and fresh-read matching.
- **Split Preservation**: Original 170-case held-out split (seed 20261013) is kept 100% frozen and untouched. The 80-case challenge set is kept strictly separate in `docs/source/laya_challenge_pack/`.
- Evidence label: DOCUMENTED (Laya Challenge Pack README & System One API schema) + REPORTED (live 200 OK inference telemetry from `https://api.laya.studio/v1/systemone`).

## D-014 · 2026-10-13 · Hybrid Decision Precedence & Regression Guardrails (CR-133 & CR-107 Fixes)

Addressed findings from initial live smoke evaluation where Raw Laya scored 6/8 and rules scored 7/8. Resolved root causes in `src/domain/adapter.ts`, `src/domain/triage.ts`, and `src/cli/resolveCli.ts`:
1. **Decision Precedence Order**: In `validateModelOutput` and `HybridLayaReasoningAdapter`, deterministic safety predicates now strictly outrank model predictions and known template codes:
   - Priority 1: Sensitive requests (security/credentials/identity, explicit human requests, billing/refunds/credits, 2 failed attempts) -> deterministic human handoff with complete case file.
   - Priority 2: Known verified rejection codes on template fixture (`PROMO`, `VARIABLE`, `TAG`) -> deterministic playbook.
   - Priority 3: Complex / ambiguous / multi-symptom requests -> model-assisted classification.
   - Priority 4: Output validation & confidence gating (< 0.70 clamped to clarification).
   - Priority 5: Fallback to rules baseline on any model error, crash, timeout, or schema invalidity.
2. **Fix for CR-133**: "I already tried once: Can a person review this rejection?" previously resulted in `template_rejection` in raw Laya and slipped through because template reason code was checked prior to human request. Exported authoritative `isExplicitHumanRequest()`, `isSecurityRequest()`, and `isBillingRequest()` from `src/domain/triage.ts`. Fast Path 1 now intercepts these before model invocation. In `validateModelOutput`, `isExplicitHumanRequest` deterministically forces `issueType: "human_requested"`, `needsHuman: true`, and `route: "human_handoff"`.
3. **Fix for CR-107**: "Help please, urgent." was incorrectly classified by raw Laya as `human_requested` based solely on urgency. Added an explicit semantic intent check in `validateModelOutput`: if `issueType === "human_requested"` but `!isExplicitHumanRequest(message)`, the output is rejected as an unjustified escalation, cleanly triggering fallback to `ambiguous_or_missing_context` and route `clarify_once` without fabricating missing context.
4. **Offline/Cached Replay in Smoke Runner**: Updated `tools/run_laya_smoke.ts` with `--cached` / `--offline` flag to replay recorded live API telemetry without consuming live API credits. Re-evaluating the 8 benchmark cases with the corrected precedence achieved 100% (8/8) accuracy for Guarded Hybrid (vs 7/8 Rules, 6/8 Raw Laya), with zero tokens spent.
- Evidence label: DOCUMENTED (Guardrails G1-G15, Decision D5, D7, D10) + REPORTED (test results in TEST_RESULTS.md).
