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
  6. Added 5 regression tests in `tests/apiIntegration.test.ts`.

## Unresolved issues
- None (143/143 tests passing across 14 test suites; Turbopack production build clean; Vite strict TypeScript build clean).
