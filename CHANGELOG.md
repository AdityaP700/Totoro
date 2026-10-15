# CHANGELOG

User-visible changes. (Internal engineering notes live in the other continuity files.)

## 2026-10-15 — Founder Revenue Analytics Route Preservation & Support UI Leakage Suppression (D-027, F-013)

- **Founder Business Analytics Flow & Route Preservation**:
  - Eliminated the bug where business analytics queries (e.g. *"Our revenue dropped this week. Help me figure out why."*) were falsely routed through support triage as ambiguous tickets, trapped in single-turn clarification, and escalated to human support.
  - Initial business messages now trigger LangGraph immediately on Turn 1 (`runConversationTurn`), sustaining `analyze_data` routing across the complete multi-turn sequence:
    1. Turn 1 (*"Our revenue dropped this week..."*): Identifies the 4 primary drivers (traffic, conversion, AOV, cancellations) and discloses lack of direct DB connection.
    2. Turn 2 (*"Compare October 1–7 with October 8–14."*): Dynamically updates comparison date range and records explicit hypothesis invalidation.
    3. Turn 3 (*"What data do you need to confirm the cause?"*): Enumerates the 4 structured data categories required to prove root causes.
    4. Turn 4 (*"We don't have production database access connected yet..."*): Accurately contrasts what can vs cannot be concluded with strict evidence labeling (`[LIMITATION]`, `[REPORTED]`, `[UNKNOWN]`).
  - Verified route telemetry log: `["analyze_data", "analyze_data", "analyze_data", "analyze_data"]`.
- **Elimination of Support UI Leakage on Business Sessions**:
  - Replaced the misleading `"Escalated to human support"` header badge with `"Analysis active"`.
  - Suppressed the 5-stage support diagnostic timeline and specialist-assignment queue banner for all business analytics cases.
  - Resets support artifacts (`clarify`, `handoffReason`, `specialistAssignment`, `diagnosisSummary`) to `null` and assigns `stage = "RESOLVED"` to maintain a clean business copilot interface.
- **Verification**:
  - Added Scenario `F0` in `tests/businessScenarios.test.ts` verifying all 4 turns select `analyze_data` and record invalidations without escalation.
  - Added Test 26 in `tests/apiIntegration.test.ts` testing the complete HTTP API `/api/resolve` cycle across all 4 turns.
  - All 198 tests passing across 17 test files (100% passing). Both Vite and Next.js production builds compile cleanly.

## 2026-10-15 — General-Purpose Operational Assistant, Capability Boundaries & 12 Multi-Turn Business Scenarios

- **Everyday Operational Scenarios Across 6 Business Domains**:
  - Expanded conversational support beyond WhatsApp/Instagram recovery to everyday operational challenges for founders, salespeople, managers, freelancers, operations, and support specialists.
  - Handled 12 distinct multi-turn scenarios:
    - *Founder Metrics (`F1`)*: Answered conversion inquiries with explicit financial database limitation disclosures; updated date ranges dynamically upon fact correction (`Oct 1 to Oct 7`) and cleanly invalidated prior conclusions.
    - *Founder Prioritization (`F2`)*: Dynamically re-ranked tasks when time-sensitive enterprise lead deadlines emerged, elevating the expiring opportunity to #1 priority.
    - *Sales Outreach & Capability Boundaries (`S1`)*: Drafted cold sales emails cleanly; explicitly refused fake outbound sending requests, disclosing disconnected email integrations and preserving drafts for review (`drafted_for_review`).
    - *Sales Objection & Constraints (`S2`)*: Maintained budget ceilings ($5,000) across objection-handling turns and adapted proposals to phased milestones.
    - *Management Progress Synthesis (`M1`)*: Synthesized reported blockers from team updates without speculating or fabricating project completion dates.
    - *Management Dependency Chains (`M2`)*: Tracked cross-team dependencies (backend auth blocking frontend checkout) and surfaced the root cause.
    - *Freelancer Invoicing (`W1`)*: Drafted professional overdue payment reminders for invoices ($1,200); refused automated dispatch over disconnected external accounting systems.
    - *Freelancer Payment Terms Correction (`W2`)*: Updated terms from Net 30 to Net 15, invalidating prior schedules and updating the reminder cadence.
    - *Operations Delivery Telemetry (`O1`)*: Disclosed courier API limits and incorporated ground hold evidence (ORD-901, ORD-902).
    - *Operations Inventory Variance (`O2`)*: Flagged 30-unit discrepancies between physical and ledger inventory without guessing root causes.
    - *Customer Support Thresholds (`C1`)*: Strictly enforced the G8 two-failed-attempt rule, transferring difficult recovery cases to specialists with structured dossiers.
    - *Cross-Session Isolation (`X1`)*: Maintained 100% memory and state isolation between interleaved concurrent sessions.
- **LangGraph Routing & Capability Boundary Enforcement**:
  - Added new operational nodes: `draftContentNode`, `prioritizePlanNode`, and `analyzeDataNode`.
  - Prohibited fake execution: unintegrated operations (e.g., `send_email`, `send_external_invoice`) are safely declined with explicit limitations, while drafted content is preserved intact.
  - Preserved deterministic safety guardrails G1–G15 and scoped billing human handoffs to customer disputes without blocking invoicing drafting.
- **Automated Regression Suite**:
  - Added `tests/businessScenarios.test.ts` (12/12 passing). Total suite: 196/196 passing across 17 test files.

## 2026-10-15 — Cross-Case Conversation Isolation & Payment Context Guardrail

- **Eliminated Cross-Case Conversation Contamination**:
  - Payment and order inquiries (e.g. `"I paid ₹2,499 for order ORD-4821. Money was deducted, but my order still says payment pending."`) are now strictly triaged as `billing_refund` and escalated to human support under mandatory safety policy G10, with zero template or delivery leakage.
  - Conversational follow-ups in a payment case (e.g. `"I already checked my bank statement. The debit is definitely there. Don't ask me to check it again."`) remain strictly in the payment domain, record bank statement verification and debit evidence with `[REPORTED]` provenance, mark `check_bank_statement` as completed, avoid repeating the check, and prompt only for missing payment references (such as bank UTR numbers) while routing to finance specialists.
- **Strict Domain Context Invariants in Conversation Graph**:
  - Gated delivery check patterns strictly to `message_delivery` issue domains.
  - Added domain invariant checks in `validateProposalNode`: proposals containing WhatsApp delivery diagnostics or template mutations are discarded when the active case is `billing_refund` or non-WhatsApp.
- **Minimal Structured Server Logging**:
  - Added structured telemetry logging in `/api/resolve` and `conversationGraph.ts` capturing `sessionId`, `caseId`, `threadId`, `issueCategory`, `selectedRoute`, and `responseCaseId`.
- **Verification**:
  - Verified with automated isolation probe across multi-turn payment and delivery sessions running concurrently; 100% domain isolation confirmed.

## 2026-10-15 — Multi-Turn Follow-Up Intent Understanding & Completed Check Elimination

- **Eliminated Repetitive Diagnoses & Completed Checks**:
  - When the operator indicates they have already performed the recommended check (e.g., delivery status is still pending), Totoro acknowledges the check, records the result as user-reported evidence with explicit label `[REPORTED]`, marks `check_message_status` as completed, and strictly never re-recommends that check again in the session.
  - Totoro adheres to Rule 4 by avoiding fabricated facts (no simulated carrier handset transit or outage assertion without provider evidence) and asks a targeted question (dispatch timeframe or mobile carrier) to isolate batch vs route delays.
  - If 2 attempts have failed, Totoro enforces policy G8 with immediate specialist handoff.
- **Natural Conversational Interaction (Greetings & Clarifications)**:
  - Greetings (e.g. `"hi"`, `"hello"`, `"hey"`) during an active troubleshooting case are acknowledged naturally (`"Hi! I'm here. Would you like to continue troubleshooting the pending WhatsApp deliveries?"`) while strictly preserving case context, completed checks, and active triage without rerunning diagnosis or repeating stale responses.
  - Typos or unclear queries (e.g. `"what chlk"`) prompt a polite clarification request (`"I didn't quite catch that. Did you mean to ask about the delivery check, or would you like me to explain the next step in simpler terms?"`) without inventing technical evidence or repeating prior diagnoses.
- **Interactive Action Buttons & Secondary CTAs**:
  - The primary CTA button dynamically dispatches based on the active recommendation action type: `clarify` focuses the chat composer; `human` / `request_specialist` opens the specialist handoff modal; `check_message_status` executes the diagnostic check; `approve` applies the simulated resubmission.
  - Added secondary CTA support for quick escalation to human support or proposal editing.
- **Verification**:
  - Added Test 25 to `tests/apiIntegration.test.ts` executing the complete 5-step reproduction sequence; all 184 vitest tests passing across 16 test files; Next.js 16 production build compiles with 0 errors across 21 routes.

## 2026-10-15 — Template Rejection Clarification, Delivery Decoupling & "What Would Help" Card

- **Decoupled Delivery Telemetry from Template Rejection**:
  - Eliminated accidental delivery fallbacks (`"Delivery Diagnostic"` category, carrier delivery receipts text, `"Check message status"` CTA) in the workspace and session API.
  - Template rejection inquiries without an attached template or reason code now stay strictly in the template recovery domain with zero carrier or message delivery leakage.
- **Dedicated "What would help" Interaction Card**:
  - Replaced premature diagnosis panels with a focused card during clarification (`Needs details`):
    - Plain-English guidance: `"Open the rejected template in WhatsApp Manager and share the rejection reason shown there. You can also provide the template name or ID if it's available. I haven't verified the rejection reason yet, so I won't recommend a delivery-status check."`
    - Inline rejection detail input field with `"Submit details"` button directly calling `/api/resolve`.
    - Expandable step-by-step guidance card explaining where to find the rejection reason banner in Meta Business Suite / WhatsApp Manager.
- **Context-Aware Quick Action Options**:
  - The 3 quick action buttons at the bottom update during clarification to:
    1. *Share the rejection reason — Help identify the appropriate fix* (focuses input).
    2. *Explain where to find it — Get step-by-step guidance* (expands step-by-step guidance).
    3. *Request a specialist — Get human assistance* (opens human handoff modal).
- **Refined Enterprise Workspace Hierarchy**:
  - Header displays title `WhatsApp template rejection`, subtitle `Template support · Updated just now`, and dynamic amber `Needs details` status pill.
  - 3-column diagnosis summary and action CTAs are suppressed while in clarification; simulated action disclaimer is de-emphasized.
- **Automated Regression Coverage**: Added REGRESSION 6 in `tests/apiIntegration.test.ts`. All 182 vitest tests passing across 16 test files. Root Vite build and Next.js 16 production build compile with 0 errors across 21 routes.

## 2026-10-15 — End-to-End Recovery Quality Audit & Multi-Turn Intelligence (20 Scenarios Across 4 Levels)

- **Comprehensive 20-Scenario Quality Audit**: Executed and automated the 20-scenario audit across Problem Understanding, Evidence Matching, Multi-Turn Continuity, and Safety/Verification (`tests/recoveryQualityAudit20.test.ts`).
- **Multi-Turn Conversational Memory & Continuity**:
  - Implemented `ResolveSession.prototype.handleFollowUp(message)` wired to `/api/resolve` and `sessionRegistry.ts`.
  - The assistant now retains case context across turns, incorporates newly supplied evidence, avoids asking for already provided information, dynamically switches active diagnostics when templates are approved, acknowledges completed checks, and enforces the 2-failed-attempt escalation threshold (G8).
- **Triage & Classification Improvements**:
  - Filtered explicit negations of template rejection (e.g. "There is no template rejection error") in `triage.ts`, correctly classifying delivery issues as `message_delivery`.
  - Added `ambiguous_not_working_properly` rule to request a single targeted clarification without presenting an overwhelming technical questionnaire.
  - Added message keyword playbook matching for variable format and category mismatch when reason codes are missing.
- **Safety, Adversarial & Resilience Safeguards**:
  - Broadened prompt injection pattern to detect and reject adversarial override attempts (e.g. "Ignore all previous rules"), maintaining deterministic safety policy and audit logs.
  - Detected and isolated duplicate charge / billing inquiries occurring within messaging conversations, routing to `billing_refund` and human-led review.
  - Handled persistence and storage failures gracefully without exposing raw database errors.
- **Plain-Language Explanations**: Provided everyday language breakdowns for category mismatches and status discrepancies without technical rule IDs or raw fixture names.
- **Automated Regression Suite**: Added `tests/recoveryQualityAudit20.test.ts` (20/20 tests passing). Total test count: 181/181 passing across 16 test files. Root and Next.js builds clean.

## 2026-10-15 — Request-to-Fixture Decoupling & Laya Invocation Audit

- Decoupled non-template support requests from template fixtures:
  - Vague delivery complaints, billing questions, webhook issues, and WABA registration inquiries no longer inherit unrelated template entities (`TPL-1001`/`TPL-1002`/`TPL-1003`) or template rejection codes (`FIXTURE_INVALID_VARIABLE_FORMAT`).
  - Added dedicated non-template diagnostic playbooks (`PB-DELIVERY-STATUS-CHECK`, `PB-INTEGRATION-ENDPOINT-CHECK`, `PB-WABA-REGISTRATION-CHECK`, `PB-CHATBOT-FLOW-CHECK`) that provide read-only diagnostic guidance with zero write proposals.
  - Handled unmapped template rejections cleanly: when an issue is classified as `template_rejection` without a template entity, the session enters `CLARIFY_ONCE` requesting the template ID/name, rather than guessing an arbitrary fixture.
  - In the frontend Technical Details inspector and Case header, unmapped entities display `"None (No template entity)"` and appropriate status (`Active` / `Escalated`) rather than defaulting to `"WhatsApp Template: Rejected"`.
- Audited Laya invocation and model routing:
  - Ensured deterministic rules engine (`rules-1.0`) is the default local and test baseline with zero network calls and zero cost.
  - Hosted Laya reasoning adapter activates only when `LAYA_API_KEY` is configured in the environment.
  - Diagnostic timeline and decision trace truthfully identify the active engine (`rules` vs `laya`), never claiming rules-only output was "Laya-generated".
- Added 5 automated regression tests in `tests/apiIntegration.test.ts` (all 143 tests passing).


## 2026-10-15 — Enterprise template selector and technical details inspector

- Replaced native `<select>` dropdown on New Request screen with custom, accessible `TargetTemplateSelector` popover: clear visual hierarchy distinguishing "AUTOMATIC" detection mode from "AVAILABLE TEMPLATES" (`TPL-1001`, `TPL-1002`, `TPL-1003`) with keyboard accessibility and zero unprompted case creation.
- Redesigned Technical Details section on Case screen into a structured diagnostic inspector (`TechnicalDetailsInspector`):
  - Collapsed by default with diagnostic event count and "View audit trace" toggle.
  - Execution summary: 4-cell grid for policy, state source, verification, and latency with plain-language explanations.
  - Diagnostic timeline: vertical timeline translating internal event codes (`CASE_OPENED`, `STATE_READ`, `TRIAGED`, `DIAGNOSED`, `FIX_PROPOSED`, `HANDOFF_CREATED`) into readable titles with expandable technical payloads.
  - Evidence & rule trace: clearly separated rule explanation, evidence keys, and unverified boundary limitations.
  - Raw log viewer: neutral monospace container with text wrapping, copyable trace, and clipboard copy button.

## 2026-10-15 — Evidence-expansion fix, database idempotency & typography polish

- Fixed SQLite unique constraint error (`UNIQUE constraint failed: cases.session_id`) on expanding or collapsing supporting evidence: converted buttons into pure client-side toggles with zero redundant network or database operations.
- Added idempotent upsert logic in SQLite persistence (`saveCase`) and configured `PRAGMA busy_timeout = 5000;`.
- Refactored UI typography to standard desktop hierarchy: 30–34px title, 19–22px section titles, 16–17px conversation prose, 14–16px interactive controls, and 12–13px metadata.
- Cleaned up visual presentation with subtle neutral borders, restrained single blue accent (`bg-blue-600`), and anchored composer with safe scroll padding (`pb-44`).
- Maintained authentic template fixtures (`TPL-1001` festive_offer_blast, `TPL-1002` order_update_v3, `TPL-1003` payment_reminder_aug) without fallback substitutions.

## 2026-10-15 — Persistent demo workspace foundation

- Added a SQLite migration-backed persistence layer for demo workspaces, onboarding preferences, cases, conversation turns, and evidence metadata.
- Added a signed HttpOnly demo-workspace cookie, durable case restoration, and workspace-scoped history APIs.
- Added case-linked, non-public CSV/TXT/Markdown/XLSX/DOCX evidence uploads with file-type, ZIP/XML, path, encryption, macro, and size safety checks.
- Added deployment documentation for persistent single-instance SQLite storage.
- Next continuation pipeline: source preview/linking/mapping and deterministic analytics are being completed before case export, rename, reconsider, and final end-to-end validation.
- Completed UI continuation: linked sources now preview extracted content, confirm detected status mappings, unlink safely, and display deterministic CSV metrics; history restores, renames, and exports persisted investigations; workspace renders ordered messages and audit events with a continuing composer.
- Refined the active workspace into a focused chat canvas: removed duplicate read-only panels from the primary flow, retained only live recovery cards, evidence, and composer; sidebar search and new-request paths now start real new investigations; action results update the live timeline.
- Header-level New Request now uses the same explicit reset route as the sidebar control.
- Hotfix: case headings now use compact structured titles; the primary stream shows only operator and plain-language assistant messages; internal events are preserved under Activity log; proposal uses amber pending treatment; composer supports multiline text and Enter/Shift+Enter behavior.

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

## 2026-10-13 — Hybrid Reasoning Architecture & Laya Decision Adapter Extension

- Added `ReasoningAdapter` interface (`src/domain/adapter.ts`) decoupling the decision layer from UI and action execution.
- Implemented `RulesReasoningAdapter` for deterministic rules triage with zero latency and zero cost.
- Implemented `HybridLayaReasoningAdapter`:
  - Known template rejections fast-path to deterministic rules.
  - Sensitive requests (billing, security, identity, explicit human requests) fast-path to human handoff.
  - Complex and ambiguous queries query Laya structured classifier with safe rules fallback.
  - Added strict JSON schema validation, deterministic safety interceptor, and confidence gating (<0.70 routes to clarification or handoff).
- Connected interactive reasoning engine switcher into `src/App.tsx` topbar.
- Added comprehensive unit test suite `tests/adapter.test.ts` (9 tests passing).

## 2026-10-13 — Backend-First Experiment Phase (Hosted Laya API & Terminal CLI)

- Integrated real Hosted Laya System One Decision API (`POST https://api.laya.studio/v1/systemone`) using model `laya` (`laya-rl-agent`).
- Implemented `HostedLayaClient` (`src/domain/layaClient.ts`) with typed System One question schemas, 10s timeout, and comprehensive error handling (401, 402, 429, 500, network error).
- Added secure server-side API proxy in `vite.config.ts`; `LAYA_API_KEY` stored exclusively in local `.env` and never leaked into client bundles or logs.
- Added terminal entry point CLI (`src/cli/resolveCli.ts` / `npm run cli`) emitting structured JSON with rules baseline, raw Laya prediction, guarded decision, route, recommended action, confirmation requirements, token usage, latency, and verified status.
- Added credit-controlled bounded smoke test (`tools/run_laya_smoke.ts` / `npm run eval:smoke`) over 8 representative synthetic cases: 100% API success, 2,653 tokens consumed (within 5,481 credit budget), 0 safety violations.
- Added evaluation suite runner (`tools/evaluate_suite.ts`) for repeatable commands: `npm run eval:rules`, `npm run eval:hybrid`, `npm run eval:smoke`.
- Added unit tests for Laya client (`tests/layaClient.test.ts`) and CLI (`tests/cli.test.ts`), bringing the full test suite to 43/43 passing tests.
- Authored comprehensive `README.md` and updated all continuity files.

## 2026-10-13 — Hybrid Decision Precedence & Regression Guardrails (CR-133 & CR-107 Fixes)

- Enforced strict decision precedence across `src/domain/adapter.ts`, `src/domain/triage.ts`, and `src/cli/resolveCli.ts`: deterministic safety rules strictly outrank model predictions and known template codes.
- Fixed CR-133: Explicit human requests ("I already tried once: Can a person review this rejection?") deterministically fast-path and override raw model outputs to `human_requested` and `route: "human_handoff"`.
- Fixed CR-107: Urgent or vague messages ("Help please, urgent.") are blocked from being classified as `human_requested` based on urgency alone; semantic intent validation rejects hallucinated escalations and safely falls back to `ambiguous_or_missing_context` / `clarify_once`.
- Added two-failed-attempts guardrail enforcement (G8) in `RulesReasoningAdapter` and `validateModelOutput` (`previousAttempts >= 2` forces human handoff).
- Added 6 regression tests in `tests/adapter.test.ts`, expanding the test suite to 49/49 passing tests.
- Added `--cached` / `--offline` flag to `tools/run_laya_smoke.ts`: replayed 8 benchmark cases against saved telemetry with 0 live tokens charged, demonstrating 100% (8/8) Guarded Hybrid accuracy vs 87.5% (7/8) Rules baseline and 75% (6/8) Raw Laya.
- Updated `tools/evaluate_suite.ts` to report rules baseline predictions and guarded final decisions separately with decision layer distribution metrics.

## 2026-10-13 — Product Capability Expansion (Phases 1–6) & Provider Comparison

- **Conversational Recovery (`src/domain/conversationalResponse.ts`)**: Built plain-language response layer converting internal machine-readable triage, mock template states, and verification records into clear customer explanations (`headline`, `whatIsWrong`, `evidenceExplanation`, `nextSteps`). Zero provider reason codes leaked, zero fabricated policies or approval claims, max 1 single question for ambiguous cases, transparent reasons for transfers (security, billing, 2 failed attempts).
- **Reusable Playbook Registry (`src/domain/playbookRegistry.ts`)**: Implemented typed, extensible recovery playbooks with explicit entry conditions, required/conflicting evidence handling, permitted mock actions, confirmation requirements (`customerConfirmed: false`), expected post-action states, fresh-read verification rules, and handoff triggers for known issues (PB-001 through PB-004, delivery delay, webhook failure, security, billing, human requested, ambiguous).
- **Uncertainty-Aware Decision Layer (`src/domain/uncertainty.ts`)**: Added conservative evaluation layer categorizing operational evidence into `SUFFICIENT_TO_PROCEED`, `MISSING_EVIDENCE_CLARIFIABLE`, `CONFLICTING_EVIDENCE_INVESTIGATE`, and `UNSAFE_OR_SENSITIVE_HUMAN_REVIEW`. Raw model confidence is treated strictly as uncalibrated (flagged if model/rules disagree or evidence is missing).
- **Constrained Template Drafting (`src/domain/templateDrafter.ts`)**: Added drafting validator with deterministic syntactic checks: sequential variable numbering (`{{1}}`, `{{2}}`), category rules (promotional text blocked in utility), secrets/credentials blocked, length limits. Creates unconfirmed proposals; model cannot self-approve.
- **Structured Case Audit Trail (`src/domain/evidenceTrail.ts`)**: Added comprehensive audit logging (`CaseAuditTrail`) capturing the entire lifecycle: original request, evidence signals, rules vs model triage, guardrail outcomes, playbook actions, simulated executions, fresh-read verification results, and telemetry.
- **Multi-Provider Comparison (`src/domain/groqClient.ts`, `tools/compare_providers.ts`)**:
  - Integrated Groq LLM API (`openai/gpt-oss-120b`) with structured JSON mode and timeout/error handling.
  - Benchmarked Rules baseline, Hosted Laya System One (`laya-rl-agent`), Groq, and Guarded Hybrid on identical 8-case suite.
  - Guarded Hybrid achieved 100% (8/8) accuracy with 0 critical safety violations, outperforming all raw standalone models.
- **CLI Enhancements (`src/cli/resolveCli.ts`)**: Added customer-facing explanations and complete audit trails to stdout JSON output; added `--provider <laya|groq>` selection flag.
- **Expanded Test Suite**: Added 29 new tests across 6 new test files (`conversational.test.ts`, `playbooks.test.ts`, `uncertainty.test.ts`, `templateDrafter.test.ts`, `evidenceTrail.test.ts`, `groqClient.test.ts`), bringing total passing test suite to 78/78 tests in 11 test files. Strict build (`npm run build`) clean.

## 2026-10-14 — End-to-End Execution Reality Check & Six-Case Matrix

- **Active Pipeline Integration (`src/cli/resolveCli.ts`)**: Connected previously standalone modules into the authoritative terminal recovery pipeline:
  - Uncertainty assessment actively gates routing (`MISSING_EVIDENCE_CLARIFIABLE` -> `clarify`, `CONFLICTING_EVIDENCE_INVESTIGATE` -> `human_handoff`, `UNSAFE_OR_SENSITIVE_HUMAN_REVIEW` -> `human_handoff`, `SUFFICIENT_TO_PROCEED` -> `safe_playbook`).
  - Active evaluation of playbook preconditions (`category == UTILITY`, `status == REJECTED`) from `defaultPlaybookRegistry`.
  - Failed fresh-read verification (Case F) dynamically triggers escalation to human support with clear explanation.
  - Conversational explanations and structured audit trails emitted on all terminal executions.
- **New Mock Fixtures (`src/data/templates.ts`)**: Added `TPL-1004` (rejected template with missing reason code on dashboard) and `TPL-1005` (approved template for testing status conflict handling).
- **End-to-End Matrix Test Suite (`tests/e2eMatrix.test.ts`)**: Authored 7 tests validating the 6 realistic operational categories (Cases A–F) against the CLI entry point. All 7 passed. Total test suite expanded to 85/85 tests across 12 files.
- **Audit Report (`docs/audits/end_to_end_execution_matrix.md`)**: Fully documented the end-to-end execution paths, component interactions, runtime traces, guardrail decisions, playbook evaluations, and fresh-read outcomes with zero fabricated output.

## 2026-10-14 — Adversarial Stress Testing, Defect Remediation & Concurrency Benchmark

- **Adversarial Test Suite (`tests/adversarial.test.ts`)**: Built hostile 36-test suite testing 20 threat categories and edge scenarios A–H: vague messages, Hinglish mixing, mid-flow cancellations, conflicting states, invalid identifiers, prompt injections, `--execute` abuse on sensitive operations, tampered before/after states, parameter injection, unsafe model outputs, provider timeouts/429s/malformed JSON, playbook precondition violations, TOCTOU state drift, duplicate idempotency key replays, action crashes, unallowlisted operations, unavailable fresh reads, retry exhaustion (G8), registry/issue-type inconsistencies, and property-based randomized fuzzing.
- **Defect Remediation**:
  - Fixed prompt injection regular expression matching consecutive words (`ignore all previous instructions`, `dan mode`, `jailbreak`) in `src/domain/triage.ts`.
  - Added Hinglish human agent phrases (`human agent`, `agent se baat`, `baat karwao`, `kisi human`) to `HUMAN_REQUEST` rules in `src/domain/triage.ts`.
  - Decoupled `options.customAdapter` from Step 2 rules baseline in `src/cli/resolveCli.ts`; provider timeouts, 429s, or exceptions now cleanly fall back to deterministic rules baseline with `decision_layer: "fallback"`.
  - Reused existing session confirmation records in `src/domain/stateMachine.ts` on duplicate clicks, preventing proposal serialization mismatches on already-mutated templates.
  - Added `hasIdempotencyKey(key)` in `MockStore` and front-door check in `resolveCli.ts` to immediately intercept duplicate confirmation replays before action evaluation (G11).
  - Enforced `target.status === "REJECTED"` check in `src/domain/mockStore.ts` before applying `resubmit_template`, rejecting state drift with `before_after_mismatch`.
  - Added `updateTemplate(id, mutator)` to `MockStore` interface to support controlled in-place state drift simulation without breaking store encapsulation.
- **Concurrency & Fault-Injection Benchmark (`tools/concurrency_benchmark.ts`)**: Tested 200 triage requests across concurrency levels 5, 10, 20, 50 with 25% active fault injection (10% rate-limit, 5% timeout, 5% state drift, 5% missing template):
  - 0 unhandled crashes (100% crash-free).
  - 0 cross-session data contamination events (100% isolated).
  - 0 duplicate executions.
  - Sub-5ms p95 latency even at 50 concurrent requests.
- **Audit Report (`docs/audits/adversarial_stress_test.md`)**: Fully documented the 20-category audit matrix, failure modes, root causes, remediations, and benchmark metrics.
- **Test Suite**: Total tests expanded to 121/121 passing tests across 13 test files. Production build (`npm run build`) passes cleanly.

## 2026-10-15 — Next.js UI Integration to Domain Recovery Engine

- **Next.js Route Handlers (`frontend/src/app/api/`)**:
  - `POST /api/resolve`: Connects chat queries to `ResolveSession` state machine and `createMockStore`; runs triage, evaluates playbooks, checks uncertainty, and supports multi-turn clarification questions.
  - `POST /api/action`: Enforces explicit user confirmation (G1), allowlist filtering (`resubmit_template`), precondition rechecks (TOCTOU guard), mock store execution, fresh-read verification (`verifyAgainstFreshRead`), and duplicate idempotency key detection (G11).
  - `GET /api/templates`: Exposes mock template fixtures (`TPL-1001`, `TPL-1002`, `TPL-1003`) for workspace contextual testing.
  - `GET /api/history`: Returns active session audit files from the server-side session registry.
  - `GET /api/reports`: Returns real recorded evaluation scorecard metrics (100% rules baseline accuracy, 170 synthetic test cases, 100% human-led zone enforcement) and session audit dossiers.
  - `GET` & `DELETE /api/session`: Retrieves session details and implements safe in-memory deletion.
  - `POST /api/settings/reset`: Restores mock fixtures to pristine state and clears active sessions.
- **In-Memory Server-Side Session Registry (`frontend/src/lib/server/sessionRegistry.ts`)**:
  - Maintains isolated `MockStore` instances per session to prevent cross-session contamination.
  - Transparently documents volatile in-memory storage model (local demo scope) versus production distributed persistence requirements.
- **Frontend Workspace & Navigation (`frontend/src/app/workspace/`)**:
  - Replaced static `getRecoveryProfile` in `workspace/page.tsx` with live `fetch('/api/resolve')` and `fetch('/api/action')`.
  - Added interactive before/after diff table with approve/decline/human buttons.
  - Added dedicated clarification response box for `CLARIFY_ONCE` stages.
  - Preserved 100% of the existing visual layout, typography, animations, styling, and video assets.
  - Connected `history/page.tsx`, `reports/page.tsx`, and `settings/page.tsx` to real backend endpoints.
- **Integration Test Suite (`tests/apiIntegration.test.ts`)**:
  - 12 comprehensive tests validating normal query, clarification, template rejection, human request, sensitive billing, mock execution + verification, state drift rejection, duplicate idempotency keys, session isolation, provider failure, and malformed requests.
  - All 133 tests pass across 14 test suites (`npm test`).
  - Next.js Turbopack production build compiles cleanly (`npm run frontend:build`).




