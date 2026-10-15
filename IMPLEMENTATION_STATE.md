# IMPLEMENTATION STATE

Last updated: 2026-10-13 (All Phases 0–4 PASSED — Prototype Complete)

## 2026-10-15 addendum — Persistent demo workspace foundation

- Next.js now persists workspace-scoped cases, conversation turns, preferences, mock state snapshots, and evidence metadata via SQLite.
- A signed HttpOnly demo cookie supplies the workspace scope; this is explicitly not authentication.
- The initial evidence attachment control accepts CSV, XLSX, TXT, Markdown, and DOCX only after bounded defensive validation. Storage is non-public under `TOTORO_DATA_DIR`.
- Next step: extend the initial source profile into confirmed mappings and deterministic report cards before representing advanced analytics as available.
- Current continuation pipeline: finish evidence preview/link/unlink/mapping → render deterministic CSV metrics → wire rename/export/history restore and continuous conversation controls → run regressions and update handoff.
- Completed continuation UI; next required work is manual browser acceptance against uploaded CSV and a restored case, plus tests for mappings/analytics/export before claiming full end-to-end coverage.
- UI refinement complete. Next validation: exercise sidebar search/new request, clarification, approval, human handoff, source upload/preview/unlink, restore, and export in the browser.
- Conversation hotfix validated by production frontend build and the 133-test suite. Remaining validation is the targeted browser walkthrough in the hotfix acceptance list.
- **Reference Screenshot Iteration (2026-10-15)**: Aligned Totoro workspace with primary visual reference screenshots (Images 1 & 2):
  - Created shared `WorkspaceProvider` and `useWorkspace` hook in `frontend/src/lib/workspaceContext.tsx` with synced onboarding personalization, recent requests, and collapsible sidebar state.
  - Updated `frontend/src/app/workspace/layout.tsx`: persistent desktop sidebar with `+ New request` pill, search `⌘K`, recent requests list with active blue accent indicator, bottom nav, user avatar, mobile drawer, and top header breadcrumb with colored status pill (`● Awaiting approval` / `● Verified read` / `● Escalated`).
  - Updated `frontend/src/app/workspace/page.tsx`: Image 2 welcome screen with personalized sky-blue greeting badge, role-tailored prompt cards, right-aligned user bubble, left-aligned prose explanation, horizontal 3-column inspection strip, proposed change pill diff, collapsible technical details, and anchored bottom composer with quick follow-up chips.
  - Updated `frontend/src/app/workspace/settings/page.tsx`: editable profile section for instant personalization updates.
  - Verification: All 133 vitest tests passed; Next.js 16 Turbopack production build compiled with 0 errors across all 21 routes.
- **Evidence-Expansion Fix & Design System Typography Polish (2026-10-15)**:
  - Root cause resolved for SQLite error: `UNIQUE constraint failed: cases.session_id` triggered on expanding supporting evidence. Converted evidence buttons to pure read-only UI state toggles (`setShowEvidenceSection(prev => !prev)`); added idempotent `saveCase()` update-in-place for `(workspaceId, sessionId)` in `persistence.ts`; added `PRAGMA busy_timeout = 5000;`; added session continuation and registry collision avoidance; sanitized server error responses.
  - Typography refactor: Established standard, mature type hierarchy (30–34px title, 19–22px section headings, 16–17px prose, 14–16px interactive controls, 12–13px metadata); eliminated aggressive uppercase tracking and emoji headers; anchored composer with safe scroll margin (`pb-44`).
  - Template identity preserved: Removed hardcoded `payment_due_v2` fallbacks; preserved authentic mock fixtures (`TPL-1001` festive_offer_blast, `TPL-1002` order_update_v3, `TPL-1003` payment_reminder_aug).
  - Verification: Added tests 13, 14, 15 to `tests/apiIntegration.test.ts`; all 136 vitest tests passing; Next.js 16 Turbopack production build compiled with 0 errors across all 21 routes.
- **Enterprise Template Selector & Technical Details Inspector Redesign (2026-10-15)**:
  - `TargetTemplateSelector`: Custom accessible dropdown replacing native select. Distinct "Automatic detection" mode vs manual selection from authentic templates (`TPL-1001`, `TPL-1002`, `TPL-1003`). Full keyboard navigation (Arrows, Enter, Space, Escape, Home, End, Tab), ARIA attributes, and outside-click dismissal. Selecting an option does not create a case or trigger an analysis until explicit submit.
  - `TechnicalDetailsInspector`: Replaced raw black terminal block with a structured diagnostic inspector collapsed by default. Includes 4-metric execution summary (Policy, State source, Verification, Latency) with plain explanations; vertical diagnostic timeline mapping domain events to human-readable titles/descriptions with expandable developer payloads; dedicated Evidence & Rule trace card; and a neutral, copyable raw log viewer.
  - Verification: Added tests 16 and 17 to `tests/apiIntegration.test.ts`; all 138 vitest tests passing; Next.js 16 Turbopack production build clean across all 21 routes; strict root Vite build clean.
- **Request-to-Fixture Decoupling and Laya Invocation Audit (2026-10-15)**:
  - Root causes identified and resolved for false fixture associations: (1) replaced broad keyword matching in `autoDetectTemplateId` with strict `detectTemplateIdFromText`, eliminating automatic fallback to `TPL-1001`; (2) made `StartOptions.templateId` optional and decoupled templates for non-template issues (`billing_refund`, `security_identity_access`, `human_requested`); (3) decoupled `diagnose()` so non-template issues route to dedicated inspection playbooks (`PB-DELIVERY-STATUS-CHECK`, `PB-INTEGRATION-ENDPOINT-CHECK`, `PB-WABA-REGISTRATION-CHECK`, `PB-CHATBOT-FLOW-CHECK`) with `proposal = null`; (4) unmapped template rejections route safely to `CLARIFY_ONCE` without guessing fixtures.
  - Laya Invocation Audit: Confirmed deterministic rules-only baseline (`RulesReasoningAdapter`) is default and runs with 0 network calls/keys. Hosted Laya / System One runs only when `LAYA_API_KEY` is configured. Audit logs truthfully distinguish rules, live Laya, and fallback decisions.
  - Verification: Added 5 targeted regression tests (tests 18–22) in `tests/apiIntegration.test.ts`; all 143 vitest tests passing across 14 test files; Next.js 16 Turbopack production build compiles with 0 errors across all 21 routes; strict Vite build clean.
- **End-to-End Recovery Quality Audit & Multi-Turn Intelligence (2026-10-15)**:
  - Implemented and automated all 20 mandatory acceptance scenarios across Level 1 (Problem Understanding: Tests 1–5), Level 2 (Evidence Matching: Tests 6–10), Level 3 (Multi-Turn Continuity: Tests 11–15), and Level 4 (Safety, Escalation, and Verification: Tests 16–20) based on `ChunkdUp_ retrieval and memory ideas (8).md`.
  - Resolved root causes by layer:
    1. Multi-turn continuity: implemented `ResolveSession.prototype.handleFollowUp(message)` connected via `/api/resolve` and `sessionRegistry.ts` to preserve case context, incorporate new evidence, switch topics to delivery diagnostics when templates are approved, acknowledge prior checks without repeating instructions, and enforce the 2-failed-attempt escalation threshold (G8).
    2. Input classification: added negation handling in `firstMatch` (`triage.ts`) to avoid classifying statements like "There is no template rejection error" as template rejections; added `ambiguous_not_working_properly` to `AMB_SPECIFIC` for targeted single-question clarification.
    3. Safety & Adversarial: expanded prompt injection regex to match `rules?` and `policies?`, immediately blocking override attempts and maintaining deterministic policy.
    4. Plain-language explanations: added structured plain-English breakdowns for category mismatches and status discrepancies without internal rule IDs or fixture names.
  - Created automated test suite `tests/recoveryQualityAudit20.test.ts` (20/20 tests passing). Total repository test count: 181/181 passing across 16 suites (including 170-case evaluation benchmark at 100% iteration split, 98.5% held-out split, 99.4% overall).
  - Production builds verified: `npm run build` clean (1.16s), `npm run frontend:build` clean (21/21 routes).
- **Template Rejection Clarification & Delivery Telemetry Decoupling (2026-10-15)**:
  - Root causes resolved: Eliminated delivery fallbacks (`"Delivery Diagnostic"` category, carrier delivery receipts text, `"Check message status"` CTA) in `sessionRegistry.ts` and `workspace/page.tsx`. Template rejection queries without an attached template or reason code now stay cleanly in the template recovery domain.
  - Dedicated "What would help" Card: Implemented targeted card with plain-language rejection guidance, inline input field for rejection reason or template ID (`TPL-XXXX`), submit button, and expandable step-by-step guidance for finding the reason code in Meta Business Suite / WhatsApp Manager.
  - Context-Aware Quick Options: Updated the 3 bottom quick actions during clarification to: (1) `Share the rejection reason — Help identify the appropriate fix` (focuses input); (2) `Explain where to find it — Get step-by-step guidance` (expands step-by-step guidance); (3) `Request a specialist — Get human assistance` (opens human handoff modal).
  - UI Quality & Non-Technical Copy: Subtitle updated to `Template support · Updated just now`; status badge displays amber `Needs details` pill (replacing generic "Active" or contradictory "Diagnosis verified"); 3-column diagnosis summary and action CTA suppressed while in clarification; simulated action disclaimer de-emphasized.
  - Regression Protection: Added REGRESSION 6 test in `tests/apiIntegration.test.ts` verifying `POST /api/resolve` for `"Why is my WhatsApp template being rejected?"` returns `category: "Template support"`, `statusBadge: "Needs details"`, and `recommendedNextStep: null`. All 182 vitest tests passing across 16 test files; Next.js 16 production build compiles with 0 errors across 21 routes; Vite build clean.
- **Multi-Turn Follow-Up Intent Understanding & Completed Check Elimination (2026-10-15)**:
  - Root causes resolved: (1) In `src/domain/stateMachine.ts`, operator reporting a check as completed incremented `attemptsFailed` but did not record `check_message_status` in `state.completedChecks` or `state.userReportedEvidence`, asserted fabricated carrier transit, and left `recommendedNextStep` unassigned; (2) In `handleFollowUp`, conversational inputs (greetings like "hi", typos/unclear like "what chlk", or general context) fell through without updating `customExplanation`, causing `buildResolveResponse` to repeat the stale assistant message from the previous turn; (3) In `sessionRegistry.ts`, `buildResolveResponse` hardcoded lookup against `record.originalMessage` and ignored `s.completedChecks`, causing `playbook.recommendedAction` to re-recommend `check_message_status` repeatedly; (4) In `frontend/src/app/workspace/page.tsx`, `useMemo` fallback re-recommended `check_message_status` and primary CTA clicked `handleCheckMessageStatus` regardless of action type.
  - Fixes applied:
    1. In `stateMachine.ts` Check 6: marked `check_message_status` as completed in `state.completedChecks`; recorded `userReportedEvidence` labeled `[REPORTED]`; prevented fabricated carrier telemetry (Rule 4); asked targeted dispatch timing/carrier question; updated `state.recommendedNextStep` with primary CTA `clarify` and secondary CTA `human`; enforced 2-attempt threshold (G8) with immediate specialist handoff if attempts >= 2.
    2. Added greeting detection (`isGreeting` for "hi", "hello", "hey", etc.) that responds naturally without rerunning diagnosis or repeating prior messages; added typo/unclear detection (`isUnclearOrTypo` for "what chlk", "chk", etc.) that asks for clarification without adding fake technical evidence; added dynamic fallback for general conversation.
    3. In `sessionRegistry.ts`: prioritized `s.recommendedNextStep`; ensured `s.completedChecks` strictly filters out completed actions from ever being recommended again; populated handoff CTA if stage is `HANDOFF`.
    4. In `workspace/page.tsx`: removed delivery fallback from `recommendedNextStep` memo; added secondary CTA support; updated primary and secondary buttons to dynamically dispatch based on action type (`clarify` focuses composer, `human`/`request_specialist` opens escalation modal, `approve` approves, `check_message_status` checks status).
  - Verification: Added Test 25 to `tests/apiIntegration.test.ts` executing the complete 5-message conversation sequence without repeating diagnoses or completed checks; all 184 vitest tests passing across 16 test files; Next.js 16 production build compiles with 0 errors across all 21 routes.
- **Cross-Case Conversation Isolation & Payment Context Guardrail (2026-10-15)**:
  - Root causes resolved:
    1. Initial Triage Flaw (`src/domain/triage.ts`): Expanded `BILLING` rule patterns to detect payment deductions, debited bank accounts, and order payment disputes (e.g. `I paid ₹2,499 for order ORD-4821. Money was deducted, but my order still says payment pending.`), correctly routing them to `issueType: "billing_refund"`, `route: "human_handoff"`, `needsHuman: true` instead of falling into `ambiguous_or_missing_context` with WhatsApp-specific questions.
    2. Follow-Up Interpreter Unscoped Regex (`src/domain/conversationGraph.ts` & `src/domain/stateMachine.ts`): Pattern 5 was triggering unconditionally on `lower.includes("already checked")` or `still pending`, wrongly assuming WhatsApp delivery diagnostics. Strictly gated delivery checks to `isDeliveryIssue || hasDeliveryKeywords`, and added isolated Pattern 5B for billing/payment debit confirmations (`check_bank_statement` recorded as `[REPORTED]`, escalated to finance specialist with order reference, suppressed repeating checks).
    3. Missing Domain Context Invariant: Added cross-case contamination check in `validateProposalNode()` in `conversationGraph.ts` that enforces domain boundaries (billing cases discard any WhatsApp delivery/template proposals and preserve finance escalation text in `handoffNode`).
    4. Structured Server Telemetry: Added minimal JSON logs tracking `sessionId`, `caseId`, `threadId`, `issueCategory`, `selectedRoute`, and `responseCaseId` in both `/api/resolve` and `conversationGraph.ts`.
  - Verification: Created `scratch/verify_isolation.ps1` and tested both payment and delivery sessions live. Verified 100% isolation with zero cross-case contamination. All checks passed.
- **General-Purpose Operational Assistant & 12 Multi-Turn Business Scenarios (2026-10-15)**:
  - Expanded Totoro beyond platform delivery recovery into an operational assistant for founders, salespeople, managers, freelancers, operations, and customer support.
  - Layer 1 Catalog & Scenarios Evaluated:
    - `F1`: Founder metrics date correction (invalidates prior conclusions; discloses database limitations).
    - `F2`: Founder dynamic task re-ranking (detects time-sensitive lead expiration; promotes to #1).
    - `S1`: Sales email drafting vs external sending (drafts email cleanly; explicitly refuses fake external sending; preserves draft for review).
    - `S2`: Sales objection handling with budget ceiling constraint (preserves \$5,000 ceiling; adapts messaging).
    - `M1`: Manager sprint blocker evidence synthesis (synthesizes `[REPORTED]` blocker facts without guessing completion dates).
    - `M2`: Manager blocker dependency tracking (links dependency chain; isolates unresolved root causes).
    - `W1`: Freelancer invoice reminder drafting vs direct dispatch boundary (drafts reminder; blocks automated dispatch without connected integration).
    - `W2`: Freelancer Net 30 -> Net 15 fact correction (updates entity; invalidates Net 30 payment schedule).
    - `O1`: Operations carrier telemetry limitation & North Hub hold evidence (discloses carrier API limits; incorporates order hold evidence).
    - `O2`: Operations 30-unit inventory discrepancy (flags variance without fabricating shrinkage/loss causes).
    - `C1`: Support G8 2-attempt failure escalation (escalates to specialist with complete diagnostic dossier).
    - `X1`: Interleaved cross-session state & memory isolation (100% state and memory isolation between concurrent sessions).
  - Layer 2 LangGraph.js Routing & Safety Strengthening:
    - Added typed business context and intent contracts (`BusinessDomain`, `ConversationalIntent`, `TargetRoute`, `BusinessContext`, `TurnTrace`).
    - Added dedicated operational nodes: `draftContentNode`, `prioritizePlanNode`, `analyzeDataNode`.
    - Enforced capability boundaries: refuses external actions (`send_email`, `send_external_invoice`) with explicit limitations; preserves drafts in state with `drafted_for_review`.
    - Emitted structured audit telemetry: `BUSINESS_TURN_TRACE` and `STATE_READ`.
  - Verification: Authored `tests/businessScenarios.test.ts` (12/12 passing). Total test suite: 196/196 passing across 17 test files.
- **Clean Onboarding Sidebar & Generalized Support Tagline (2026-10-15)**:
  - Removed pre-populated mock requests (`req-1` through `req-4`) from `defaultRecent` in `frontend/src/lib/workspaceContext.tsx`. New user signups now start with a clean state showing `"No requests yet"`.
  - Updated onboarding completion (`handleFinish`, `handleSkip`) to initialize `totoro_recent_requests` as `[]`, clearing legacy items.
  - Added filter in `WorkspaceProvider` to strip any lingering `req-*` mock requests from browser storage.
- **Landing Page Back Navigation from Workspace (2026-10-15)**:
  - Linked `TOTORO` brand logo in workspace sidebar to `/` (main landing page) with back indicator icon (`← TOTORO`) and tooltip.
  - Added dedicated clickable `← Totoro` back element to top workspace breadcrumb hierarchy leading to `/`.
  - Verification: 233/233 vitest tests passing; Next.js 16 production build clean.

## Current phase

**Phase 4 — Complete (Production Verification, Continuity Finalized, and Report Rendered)**

## Completed

- **Phase 0 (commit `57f4f63`, pushed to origin/main):** Source docs extracted to `docs/source/`; dataset audited (170 rows, 0 errors); workbook inspected; ADR-0001 written; risk register, decision log, and all continuity files created; `.venv` + openpyxl 3.1.5 initialized.
- **Phase 1 (commit `40a2326`, pushed to origin/main):**
  - Domain core: types, mock store with allowlist & idempotency key enforcement, playbooks data table, fresh-read verification, case file builder, event logging, `ResolveSession` state machine.
  - Acceptance tests: `tests/domain.test.ts` (15/15 passed) covering T1–T15 with deterministic injected deps.
  - Evaluation harness: `tests/evaluation.test.ts` (4/4 passed). Evaluated on 170-case synthetic benchmark with frozen seed-20261013 split:
    - Iteration split (n=105): 100% issue accuracy, 100% route accuracy, 100% needs-human recall, 0 critical safety violations.
    - Held-out split (n=65, untuned): 98.5% issue accuracy, 98.5% route accuracy, 100% needs-human recall, 0 critical safety violations.
    - Complete dataset (n=170): 99.4% issue accuracy, 99.4% route accuracy, 100% needs-human recall, 0 critical safety violations.
  - Strict TypeScript build: `npm run build` passes with zero errors.
- **Phase 2 (commit `f19b491`, pushed to origin/main):**
  - Thin presentation components S1–S6 implemented in `src/ui/components/`:
    - `S1TemplateList.tsx`: WhatsApp catalog with fixture switcher (`TPL-1001`, `TPL-1002`, `TPL-1003`), filters, and entry button.
    - `S2Diagnosis.tsx`: diagnostic explanation, evidence list, known limits ("What cannot be verified"), clarification handler, escalation button.
    - `S3Proposal.tsx`: side-by-side exact before/after diff viewer, per-change rationales, scope boundary, explicit confirmation gate, decline button.
    - `S4Outcome.tsx`: simulated submission feedback, fresh-read verification, distinct Pending vs Verified vs Could-Not-Verify vs Declined outcomes.
    - `S5CaseFile.tsx`: human escalation case file, structured metadata, and interactive clipboard copy button.
    - `S6ManagerView.tsx`: manager analytics KPIs and full chronological audit timeline table.
  - Connected end-to-end user journeys in `src/App.tsx` over `ResolveSession`: happy path, decline path, unverified failure path, human request escalation, and clean demo reset.
  - Authored `DESIGN_HANDOFF.md` with complete screen inventory, state matrix, component contracts, and Codex guardrails.
  - Strict build and tests clean (19/19 passing).
- **Phase 3 (commit `0d6d36b`, pushed to origin/main):**
  - Created working copy `deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx` (leaving `docs/source/` untouched).
  - Populated `Evaluation Scorecard` sheet with measured rules baseline metrics from Phase 1 test execution:
    - Issue type accuracy: 99.4% (Full), 98.5% (Held-out), 100% (Iteration)
    - Macro-F1: 0.995 (Full), 0.987 (Held-out), 1.000 (Iteration)
    - Urgency weighted accuracy: 99.4% (Full), 100% (Held-out), 99.0% (Iteration)
    - Needs-human recall: 100% across all splits (0 false negatives)
    - Route accuracy: 99.4% (Full), 98.5% (Held-out), 100% (Iteration)
    - Critical safety violations: 0 (Target 0)
    - False verified outcomes: 0 (Target 0)
    - Invented reason codes/facts: 0 (Target 0)
    - Clarification burden: 21.2% (1 focused question max)
  - Marked model comparison rows (`Structured LLM baseline`, `Laya adapter`) as `NOT RUN` with explanatory notes per AGENTS.md rules 1 & 9 and ADR-0001; zero metrics fabricated.
  - Verified `Cost Assumptions` formulas (`=B2*B3*B4`, `=B11*B5`, `=B12*B6`, `=B13-B14-B15`) and evidence labels preserved intact.
  - Tooling created in `tools/populate_workbook.py`.
- **Phase 4 (completed):**
  - Clean test verification: `npm test` passed (28/28 in 0.97s).
  - Clean build verification: `npm run build` passed (`tsc -b && vite build` in 1.63s).
  - Clean dataset audit: `.venv/Scripts/python tools/audit_dataset.py` passed (170/170 rows valid, 0 errors).
  - Reasoning Adapter Extension: Added `ReasoningAdapter` interface (`src/domain/adapter.ts`), `RulesReasoningAdapter`, `HybridLayaReasoningAdapter`, schema validation with deterministic safety interceptor, and comprehensive test suite (`tests/adapter.test.ts`).
  - Authored `SUBMISSION_DRAFT.md` (hybrid architecture breakdown, assignment reconciliation, screenshot checklist, demo walkthrough script, AI usage log).
  - Updated `HANDOFF.md` with full reviewer guide and commands.
  - All acceptance gates passed.
- **Backend-First Experiment Phase (Completed):**
  - Live Hosted Laya System One Decision API integrated via `HostedLayaClient` (`src/domain/layaClient.ts`) calling `POST https://api.laya.studio/v1/systemone` using model `laya` (`laya-rl-agent`).
  - Strict key isolation: `LAYA_API_KEY` stored exclusively in local `.env`, loaded via `process.loadEnvFile()`. Server-side proxy in `vite.config.ts`. Secret never exposed to client code, logs, or git.
  - Credit-controlled bounded smoke test (`tools/run_laya_smoke.ts` / `npm run eval:smoke`): 8 representative synthetic cases tested live (100% API success, 2,653 tokens consumed out of 5,481 credit budget, ~2,601 remaining).
  - Terminal-first CLI entry point (`src/cli/resolveCli.ts` / `npm run cli`): accepts message, mock state, and optional `--execute` flag; emits structured JSON with rules, raw Laya, and guarded hybrid decisions. Model cannot execute actions or determine permissions.
  - Repeatable evaluation suite (`tools/evaluate_suite.ts`) added: `npm run eval:rules`, `npm run eval:hybrid`, `npm run eval:smoke`.
  - Comprehensive documentation: created `README.md`, updated `DECISION_LOG.md` (D-013), `TEST_RESULTS.md`, `CHANGELOG.md`, `HANDOFF.md`.
  - Full test suite passes: 43/43 tests passing in vitest across 5 test files. Strict build passes (`tsc -b && vite build`).
- **Product Capability Expansion (Phases 1–6 Completed):**
  - Phase 1 (Conversational recovery): Plain-language explanations in `src/domain/conversationalResponse.ts` covering all issue types, zero leaked codes, max 1 question.
  - Phase 2 (Reusable recovery playbooks): Typed registry in `src/domain/playbookRegistry.ts` (`PB-001` - `PB-004`, delivery, webhook, security, billing, human, ambiguous).
  - Phase 3 (Uncertainty-aware recovery): Conservative decision layer in `src/domain/uncertainty.ts` with calibrated reliability tracking.
  - Phase 4 (Constrained template drafting): Validator in `src/domain/templateDrafter.ts` enforcing sequential `{{1}}` variables, promotional keyword exclusion in utility, and mandatory unconfirmed proposals.
  - Phase 5 (Evidence trail & audit): Structured lifecycle audit logs in `src/domain/evidenceTrail.ts`.
  - Phase 6 (Provider comparison): `GroqClient` in `src/domain/groqClient.ts` (`openai/gpt-oss-120b`). Multi-provider benchmark in `tools/compare_providers.ts` proving Guarded Hybrid achieves 100% (8/8) accuracy with 0 safety violations.
  - CLI updated (`src/cli/resolveCli.ts`) to return customer explanations, evidence trails, and support `--provider <laya|groq>`.
- **End-to-End Execution Reality Check & Six-Case Matrix (Completed):**
  - Integrated all expansion modules into the active CLI runtime (`src/cli/resolveCli.ts`): active uncertainty gating, playbook precondition enforcement, failed verification escalation (Case F), conversational response routing, and structured audit trails.
  - Added new mock fixtures (`TPL-1004` missing reason code, `TPL-1005` approved status) in `src/data/templates.ts`.
  - Authored comprehensive test suite `tests/e2eMatrix.test.ts` (7/7 tests passing) verifying Cases A, B, C1, C2, D, E, F.
  - Executed all 6 cases live through terminal CLI entry point (`npx tsx src/cli/resolveCli.ts`) with zero fabricated output, capturing complete JSON outputs and telemetry.
  - Generated audit report: `docs/audits/end_to_end_execution_matrix.md`.
- **Adversarial Stress Test, Reliability & Security Audit (Completed):**
  - Designed, built, and executed a hostile testing harness in `tests/harness/adversarialHarness.ts` (`FaultInjectableStore`, `FaultInjectableAdapter`) simulating timeouts, rate limits, TOCTOU state drift, and unavailable fresh reads.
  - Authored comprehensive 36-test hostile suite `tests/adversarial.test.ts` covering all 20 threat categories and edge scenarios A–H.
  - Discovered and resolved 7 engineering defects: prompt injection regex gap, Hinglish human agent regex gap, custom adapter timeout/exception CLI crash, state machine re-serialization on duplicate click, front-door idempotency key bypass, store copy immutability, and pre-execution status drift checks.
  - Created and executed concurrency benchmark `tools/concurrency_benchmark.ts` across 5, 10, 20, and 50 concurrent sessions under active fault injection: 0 unhandled crashes, 0 cross-session data contamination events, 0 duplicate executions, p95 latency < 4.3ms.
  - Produced comprehensive audit report: `docs/audits/adversarial_stress_test.md`.
  - Full test suite passes: 121/121 tests across 13 test files. Strict build passes (`tsc -b && vite build` in 1.30s).
- **UI API Integration Phase (Completed):**
  - Next.js App Router API endpoints implemented in `frontend/src/app/api/`:
    - `POST /api/resolve`: runs full diagnosis, evaluates playbooks, handles multi-turn clarification questions.
    - `POST /api/action`: enforces allowlist, rechecks preconditions, executes mock actions, evaluates fresh-read verification.
    - `GET /api/templates`: returns mock fixtures (`TPL-1001`, `TPL-1002`, `TPL-1003`).
    - `GET /api/history`: returns active sessions from in-memory session registry.
    - `GET /api/reports`: returns deterministic benchmark metrics and audit records.
    - `GET` & `DELETE /api/session`: single session retrieval and safe deletion.
    - `POST /api/settings/reset`: restores pristine fixtures and clears in-memory sessions.
  - Connected Next.js UI (`frontend/src/app/workspace/page.tsx`, `history/page.tsx`, `reports/page.tsx`, `settings/page.tsx`) to real API endpoints while preserving 100% of the visual layout, typography, animations, and styling.
  - Added comprehensive integration test suite `tests/apiIntegration.test.ts` (12 tests covering normal query, clarification, template rejection, human request, sensitive billing, mock execution + verification, state drift rejection, duplicate idempotency keys, session isolation, provider failure, and malformed requests).
  - All 133 tests pass across 14 test suites (`npm test`). Next.js Turbopack build succeeds with 17 static and dynamic routes (`npm run frontend:build`).

## Acceptance status

- Phase 0 gate: PASSED (commit `57f4f63`).
- Phase 1 gate: PASSED (commit `40a2326`).
- Phase 2 gate: PASSED (commit `f19b491`).
- Phase 3 gate: PASSED (commit `0d6d36b`).
- Phase 4 gate: PASSED (all tests, build, audits clean; deliverables, handoffs, and hybrid adapter complete).
- Backend-First Experiment gate: PASSED (live hosted Laya inference verified 200 OK, credit budget bounded at 2,653/5,481 tokens, CLI entry point working with structured JSON and verification guard, 43/43 tests passing, build clean).
- Hybrid Decision Precedence & Regression Guardrails gate: PASSED (CR-133 and CR-107 root-caused and fixed; deterministic safety precedence strictly enforced; 6 new regression tests added; 49/49 tests passing; build clean; cached smoke replay demonstrates 8/8 100% guarded hybrid accuracy with 0 live credits consumed).
- Product Capability Expansion (Phases 1–6) gate: PASSED (Conversational response, playbook registry, uncertainty assessment, template drafter, evidence trail, Groq integration, and multi-provider benchmark complete; 78/78 tests passing; strict build clean; Guarded Hybrid scores 8/8 100% with 0 safety violations).
- End-to-End Execution Reality Check gate: PASSED (All 6 execution categories verified live on real CLI; 85/85 tests passing across 12 test files; strict build clean; comprehensive audit matrix authored in `docs/audits/end_to_end_execution_matrix.md`).
- Adversarial Stress Test & Reliability Hardening gate: PASSED (All 20 threat categories tested; 36 hostile tests passing; 7 defects remediated; 200 concurrent requests benchmarked with 0 crashes and 0 contamination; strict build clean; audit report in `docs/audits/adversarial_stress_test.md`).
- UI API Integration & Recovery Engine Connection gate: PASSED (Next.js route handlers connected to domain state machine; workspace, history, reports, and settings functional; 133/133 tests passing; Turbopack production build clean).
- Evidence-Expansion Fix & Design System Typography Polish gate: PASSED (Zero SQLite uniqueness errors on evidence inspection, idempotent database upsert, standard typography scale applied, authentic fixtures preserved, 136/136 tests passing, Turbopack clean across 21 routes).
- Enterprise Template Selector & Technical Details Inspector Redesign gate: PASSED (Custom accessible popover selector, structured diagnostic inspector with execution summary, vertical timeline, evidence trace, and raw log viewer, 138/138 tests passing, Turbopack clean across 21 routes, Vite build clean).
- Operational Business Scenarios & Capability Boundaries gate: PASSED (All 12 multi-turn business scenarios F1–F2, S1–S2, M1–M2, W1–W2, O1–O2, C1, X1 verified; capability boundaries enforced; 196/196 tests passing across 17 test files).
- Founder Revenue Analytics & Support UI Leakage Remediation gate: PASSED (4-turn revenue drop journey routed 100% to analyze_data; support triage timeline, specialist banner, and human escalation badge completely suppressed for business domains; 198/198 tests passing across 17 test files; Vite and Next.js builds clean).
- Cost-Aware Multilingual Routing & Scaled 5,000-Business Benchmark gate: PASSED (Deterministic sub-millisecond fast router in domain layer covering English, Hinglish, Devanagari Hindi, and Mixed-Script across WhatsApp setup, template rejection, campaign delivery, chatbot flows, and conversational lifecycle; 5,000 synthetic message benchmark completed with 85.36% deterministic routing, 0.0245 ms average latency, 0 safety violations, and 85.36% cost savings; scaled cost model populated in `deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx` across 5,000 active businesses; 227/227 tests passing across 18 test files).
- UI Natural Chat Scrolling, Component Cleanup & Issue-Switch State Isolation gate: PASSED (Natural ChatGPT-style conversation auto-scrolling with user-scroll-intent detection; eliminated duplicate "View supporting evidence" and "Edit proposal" actions; full state reset and stale artifact clearance when switching issues delivery -> chatbot flow -> WhatsApp setup; semantic badge distinctions for "Investigation complete", "State verified", and "Issue resolved"; 233/233 tests passing across 18 test files; strict Vite and Next.js 16 production builds clean).

## Exact next command / task

The chat UI polish, natural scrolling, duplicate button cleanup, issue-switch state isolation, and multilingual turn 1 routing are complete and fully verified:
- `npm test`: run full 233-test suite across 18 test files.
- `npm run build`: run strict root Vite production build.
- `npm --prefix frontend run build`: run Next.js 16 production build.
- `npm run dev`: run local Vite prototype UI on http://localhost:5173.
- `npm run frontend:dev`: start Next.js frontend on http://localhost:3000.

