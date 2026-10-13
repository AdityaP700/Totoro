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

### Unresolved issues
- None at Phase 0 close.
