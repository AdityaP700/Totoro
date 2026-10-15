# FAILURES AND LEARNINGS

Running log of failed commands/tests, diagnosis, attempted fixes, unresolved issues.

## 2026-10-13 · Phase 0

### F-001 · `cp` of dataset files from Downloads failed (files not there)
- Command: `cp AGENT_EXECUTION_PROMPT.md DATASET_SCHEMA.md ... docs/source/` run with cwd `Downloads`.
- Error: `cannot stat 'DATASET_SCHEMA.md'` (and 3 more) — the dataset pack files live in `D:/Development/Projects/core/`, not Downloads.
- Fix: re-ran the copy with cwd `core/`. All 5 files + workbook copied. No impact.

### F-002 · Tool-call interruption mid-Phase-0
- The parallel batch (Read implementation plan + Explore agent + venv creation) was interrupted by the user/environment.
- Diagnosis: interruption, not command failure. On resume: venv + openpyxl install had completed (`openpyxl 3.1.5` import OK); the Explore agent and Read were re-issued.
- Learning: check partial side effects after an interruption before re-running state-changing steps.

### F-003 · openpyxl not available in system Python
- `python -c "import openpyxl"` → ModuleNotFoundError in system Python 3.11.9.
- Fix: created project-local `.venv` and installed `openpyxl==3.1.5` (pinned in `requirements.txt`). No GPU/ML packages installed (deliberate).

### 2026-10-13 · Phase 1

### F-004 · Proposal serialization mismatch in `checkExactChange`
- Error: `Error: Proposal serialization mismatch — refusing to confirm.` thrown by `ResolveSession.approveProposal()`.
- Diagnosis: `exactSnapshot` in `stateMachine.ts` initialized keys in order `{ text, category }`. Meanwhile, `checkExactChange` in `mockStore.ts` inserted changed fields first into `beforeObj` (e.g. `category`), and untouched fields later (e.g. `text`). Because `JSON.stringify({"text": ..., "category": ...}) !== JSON.stringify({"category": ..., "text": ...})`, exact string comparison failed despite identical data.
- Fix: initialized `beforeObj` and `afterObj` with `{ text: template.text, category: template.category }` before applying change overrides, guaranteeing canonical key ordering.

### F-005 · Hinglish detection failed on punctuation
- Error: `expected 'en' to be 'hinglish'` on `"template reject ho gaya bhai, help karo"`.
- Diagnosis: `guessLanguage` used space-bounded regex `/ (word) /i`. Punctuation like `bhai,` prevented match.
- Fix: replaced with word boundary regex `/\b(word)\b/i`.

### F-006 · Missed escalation CR-142 in triage rules
- Error: CR-142 `"I approved it, but I don't see any action history."` routed to `clarify_once` instead of `human_handoff`.
- Diagnosis: `STATE_CONFLICT` rule only checked `action history ... (missing|don't see)`. The user message placed `don't see` before `action history`.
- Fix: updated pattern to match both `(action history ... don't see)` and `(don't see ... action history)`. Also refined state conflict keywords (`says/shows connected/rejected/approved/pending/active ... but`) so delivery symptoms (`campaign says sent but...`) are not misclassified as state conflicts.

### F-007 · TypeScript build error on ambient node modules
- Error: `error TS2307: Cannot find module 'node:fs'`.
- Diagnosis: `@types/node` was omitted from dependencies to maintain zero external network dependencies, while `tsconfig.json` included `vite/client` only. Top-level `declare module` in `dataset.ts` was rejected as invalid module augmentation.
- Fix: created ambient script `src/node.d.ts` declaring `node:fs` and `node:path` without top-level imports/exports, and cleaned unused type imports. Build passed with zero errors.

### F-008 · SQLite UNIQUE constraint failed: cases.session_id on evidence expansion / terminal session follow-up
- Error: `UNIQUE constraint failed: cases.session_id` triggered when clicking "Show supporting evidence".
- Diagnosis:
  1. Frontend suggestion chip "Show supporting evidence" was wired to `handleRunQuery` which sent a new request to `/api/resolve` instead of toggling UI state.
  2. When `/api/resolve` handled a follow-up on a session in terminal status (`PENDING` or `HANDOFF`), it called `createNewSession(workspaceId, { sessionId: body.sessionId })`. This allocated a new `ResolveSession` with a new `caseId` (CAS-...) but reused the client's `sessionId`.
  3. `persistence.ts` `saveCase()` executed `INSERT INTO cases`, throwing `UNIQUE constraint failed: cases.session_id` because `session_id` has a unique constraint.
  4. Furthermore, `saveCase()` did not check for existing `(workspace_id, session_id)` pairs before inserting, and the database lacked a `busy_timeout` configuration.
- Fix:
  1. Converted "Show supporting evidence" buttons in `page.tsx` to pure read-only UI state toggles (`setShowEvidenceSection(prev => !prev)`). They make no network calls and create no cases.
  2. In `persistence.ts`, implemented `saveCase()` upsert logic: check for existing case by `(workspaceId, sessionId)`. If found, execute `UPDATE` in-place; otherwise `INSERT`. Added `PRAGMA busy_timeout = 5000;`.
  3. In `/api/resolve`, continued the existing session for terminal states, appending messages and recording audit events without creating new duplicate cases.
  4. In `sessionRegistry.ts`, ensured `createNewSession` generates a fresh unique session ID if the requested one is already persisted.
  5. Added regression tests 13, 14, 15 to `tests/apiIntegration.test.ts`.

### F-009 · Inadvertent entity coupling on non-template complaints
- Error: End-to-end tests revealed:
  1. A vague WhatsApp message delivery complaint was diagnosed as `FIXTURE_INVALID_VARIABLE_FORMAT`, matched to `PB-002`, and given an irrelevant template-variable correction proposal.
  2. A duplicate-payment complaint was correctly triaged to `billing_refund` and escalated to human handoff, but displayed state and template evidence were still bound to `TPL-1002` (an unrelated order update template).
- Diagnosis:
  1. `autoDetectTemplateId()` in `sessionRegistry.ts` contained a loose fallback keyword regex that defaulted unmapped messages to `TPL-1001` or `TPL-1002` if any generic keyword matched.
  2. `ResolveSession` in `stateMachine.ts` loaded the template snapshot into state before running triage, and `diagnose()` evaluated `template.reasonCode` unconditionally without verifying if `triage.issueType === "template_rejection"`.
  3. Non-template issues (delivery, webhooks, WABA, billing) lacked dedicated diagnostic playbooks, falling through to generic template policies.
  4. UI components defaulted to mock template IDs (`"TPL-1001"`) and `"WhatsApp Template"` even when `templateSnapshot` was null.
- Fix:
  1. In `stateMachine.ts`, made `templateId` optional (`string | null`). Replaced loose auto-detect with strict regex requiring explicit template IDs (`TPL-\d{4}`) or explicit phrases (`template <name>`).
  2. If triage detects a sensitive non-template zone (`billing_refund`, `security_identity_access`, `human_requested`), `templateId` and `templateSnapshot` are immediately severed (`null`).
  3. In `playbookRegistry.ts`, enforced that reason code and template snapshot matching ONLY applies when `issueType === "template_rejection"` or `!issueType`. Added dedicated non-template playbooks (`PB-DELIVERY-STATUS-CHECK`, `PB-INTEGRATION-ENDPOINT-CHECK`, `PB-WABA-REGISTRATION-CHECK`, `PB-CHATBOT-FLOW-CHECK`) with read-only diagnoses and null proposals.
  4. For unmapped template rejections, the engine transitions to `CLARIFY_ONCE` asking the user for their template ID/name rather than binding to an arbitrary fixture.
  5. In `TechnicalDetailsInspector.tsx` and `page.tsx`, removed all hardcoded fallback template IDs and statuses; unmapped entities clearly show `"None (No template entity)"` and `"NOT_APPLICABLE"`.
### F-010 · Premature delivery diagnosis and status badge during template rejection clarification
- Error: UI screenshots showed a template rejection inquiry ("Why is my WhatsApp template being rejected?") displaying delivery diagnostics ("Messages were sent successfully...", "Check message status") and an contradictory "Diagnosis verified" status badge while clarification was pending.
- Diagnosis: `workspace/page.tsx` fell back to hardcoded delivery copy when API responses returned null `diagnosisSummary` and `recommendedNextStep` for unmapped templates. `sessionRegistry.ts` also matched delivery playbooks on unmapped states.
- Fix: Suppressed `diagnosisSummary` and `recommendedNextStep` in `sessionRegistry.ts` and `page.tsx` when `triage.issueType === "template_rejection"` without a proposal, or when `stage === "CLARIFY_ONCE"`. Created a dedicated "What would help" card with inline input for rejection details and WhatsApp Manager guidance. Added REGRESSION 6 in `tests/apiIntegration.test.ts`.

### F-011 · Repetitive diagnosis and re-recommending completed checks across multi-turn follow-ups
- Error: When a user stated that they had already performed a recommended check (and delivery status was still pending), Totoro re-recommended the exact same check ("Check message status") and repeated stale assistant explanations for follow-ups like "hi" or "what chlk".
- Diagnosis:
  1. `handleFollowUp` in `stateMachine.ts` incremented `attemptsFailed` but did not record `check_message_status` in `completedChecks` or `userReportedEvidence`, and asserted simulated carrier transit without evidence.
  2. For non-matching conversational follow-ups ("hi", "what chlk"), `handleFollowUp` fell through to default without updating `customExplanation`, causing `buildResolveResponse` to repeat the stale Turn 2 assistant text.
  3. `buildResolveResponse` evaluated playbooks against `record.originalMessage` and ignored `s.completedChecks`.
  4. `workspace/page.tsx` fell back to `check_message_status` when `recommendedNextStep` was null and the primary CTA button unconditionally invoked `handleCheckMessageStatus`.
- Fix:
  1. Marked `check_message_status` in `state.completedChecks` and recorded `userReportedEvidence` labeled `[REPORTED]`.
  2. Adhered to Rule 4 by stating that carrier queue telemetry cannot be verified without provider data and asking a targeted question (dispatch timing or carrier concentration). Enforced G8 escalation if attempts >= 2.
  3. Added greeting detector (`isGreeting`) and typo/unclear detector (`isUnclearOrTypo`) in `handleFollowUp`, along with a dynamic conversational fallback.
  4. In `sessionRegistry.ts`, prioritized `s.recommendedNextStep` and filtered out any action present in `s.completedChecks`.
  5. In `workspace/page.tsx`, removed delivery fallback, added secondary CTA support, and dispatched primary/secondary CTAs dynamically by action type.
  6. Added Test 25 to `tests/apiIntegration.test.ts` reproducing the full 5-message conversation flow.

### F-012 · Cross-case conversation contamination between payment and WhatsApp delivery
- Error: An order payment inquiry ("I paid ₹2,499 for order ORD-4821. Money was deducted, but my order still says payment pending.") received WhatsApp delivery diagnostics, asked which WhatsApp feature was affected, and showed a delivery-specific clarification form upon follow-up ("I already checked my bank statement...").
- Diagnosis:
  1. `triage.ts` lacked rules matching payment deductions, bank debits, or order payment pending text, causing Turn 1 to fall through to `FALLBACK_AMBIGUOUS` with the WhatsApp-specific clarification question.
  2. In `conversationGraph.ts` (and `stateMachine.ts`), Pattern 5 matched `lower.includes("already checked")` unconditionally without gating on `state.caseContext.issueType === "message_delivery"`, emitting WhatsApp delivery headline, completed check `check_message_status`, and carrier delivery next steps.
  3. `validateProposalNode()` lacked context invariants verifying domain consistency between proposed actions and the active case's issue category.
- Fix:
  1. Expanded `BILLING` in `src/domain/triage.ts` to detect payment deductions, debited bank accounts, and order payment disputes.
  2. Gated delivery check pattern strictly to `isDeliveryIssue || hasDeliveryKeywords`.
  3. Added isolated Pattern 5B for payment/billing follow-up (bank statement checked, debit confirmed, recorded as `[REPORTED]`, escalated to finance specialist, suppressed repeating checks).
  4. Enforced domain context invariant in `validateProposalNode()` and preserved proposal text in `handoffNode()`.
  5. Added minimal structured server logging (`sessionId`, `caseId`, `threadId`, `issueCategory`, `selectedRoute`, `responseCaseId`) in `/api/resolve` and `conversationGraph.ts`.
  6. Verified 100% session isolation with `scratch/verify_isolation.ps1`.

### F-013 · Business analytics inquiry hijacked by support recovery state machine and UI components
- Error: Live browser testing of a 4-turn founder revenue analysis inquiry ("Our revenue dropped this week. Help me figure out why.") resulted in generic ambiguous acknowledgements, a header displaying "Escalated to human support", a 5-stage support investigation timeline, and a specialist assignment card.
- Diagnosis:
  1. `/api/resolve/route.ts` did not invoke LangGraph on Turn 1 for newly opened sessions; it only called `createNewSession()`. Because "Our revenue dropped..." did not match WhatsApp template rules, `triage.ts` assigned `ambiguous_or_missing_context` and entered `stage = "CLARIFY_ONCE"` with a WhatsApp feature question.
  2. On Turn 2+, `/api/resolve/route.ts` checked `stage === "CLARIFY_ONCE"` and called `session.clarify()`. The domain state machine's single-question limit treated follow-up input as still ambiguous and invoked `this.handoff()`, immediately escalating to a human specialist. LangGraph was never executed on ANY turn.
  3. `workspace/page.tsx` and `sessionRegistry.ts` lacked business domain guards. When `stage === "HANDOFF"` or `isMandatoryHumanZone` evaluated true, the workspace unconditionally rendered the support 5-stage timeline, specialist queue banner, and rose escalation badge.
- Fix:
  1. In `/api/resolve/route.ts`, if `isBusinessRequest(message)` evaluates true on Turn 1, `runConversationTurn` is invoked immediately following session creation. On Turn 2+, `isBusinessSession` ensures all follow-up turns route through LangGraph, bypassing `session.clarify()`.
  2. In `src/domain/conversationGraph.ts`, added matchers 8D1 (revenue drop + 4 drivers + DB limitation), 8D2 (comparison period update + hypothesis invalidation), 8D3 (data requirement categories), and 8D4 (disconnected DB knowns vs. unknowns). In `validateProposalNode`, mapped all 4 turns strictly to `targetRoute = "analyze_data"`. In `persistResponseNode`, set `stage = "RESOLVED"` and cleared support artifacts (`clarify`, `handoffReason`, `specialistAssignment`).
  3. In `sessionRegistry.ts` (`buildResolveResponse`), return `category = "Business Analytics"`, `statusBadge = "Analysis active"`, `stage = "RESOLVED"`, `diagnosisSummary = null`, and suppress support fallback CTAs.
  4. In `workspace/page.tsx`, defined `isBusinessCategory` and guarded `isMandatoryHumanZone`, `isHumanHandoffStage`, the 5-stage investigation timeline, specialist assignment banner, and `diagnosisSummary`.
  5. Added regression test `F0` in `tests/businessScenarios.test.ts` verifying all 4 turns route to `analyze_data`, and Test 26 in `tests/apiIntegration.test.ts` verifying complete HTTP API contracts. 198/198 tests pass.

## Unresolved issues
- None (all 198 tests across 17 test suites passing; Next.js 16 and Vite builds clean).

