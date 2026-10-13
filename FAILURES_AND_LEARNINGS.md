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

## Unresolved issues
- None at Phase 1 close (19/19 tests passing; clean strict build).
