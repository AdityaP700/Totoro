# Risk register — Cheerio Resolve implementation

| # | Risk | Likelihood | Impact | Mitigation | Owner / check |
|---|---|---|---|---|---|
| R1 | Prototype reads as a real Meta/Cheerio operation | M | High | Persistent MOCK/SIMULATED labels on every screen and event; local state only | T-audit every screen; acceptance checklist |
| R2 | "Verified" shown without matching fresh state | M | High | Verify step compares fresh mock read to expected outcome; tests T6/T7 | vitest state-machine tests |
| R3 | Triage invents a reason code or diagnosis from wording alone | M | Critical | Rules never emit provider codes; unknown → clarify-once or handoff (D10/G9) | 170-case eval; invented-code counter must be 0 |
| R4 | Needs-human case auto-resolved (missed escalation) | M | Critical | needs-human recall is a first-class eval metric; human-request keyword route forces HANDOFF | eval recall reported per split |
| R5 | Scope creep into design polish / dashboard / bot | M | M | Scope cuts in ADR-0001; DESIGN_HANDOFF.md defines the Codex boundary | per-phase diff review |
| R6 | Cost workbook implies false precision | M | M | Every number keeps an evidence label; prices only from verified source+date; NOT RUN rows stay NOT RUN | Phase 3/4 workbook review |
| R7 | Held-out contamination (tuning on held-out) | L | M | Fixed seed split recorded before tuning; rules developed on iteration split only | src/eval/split.ts + DECISION_LOG |
| R8 | Duplicate confirmation causes double simulated write | L | M | Idempotency key per case; duplicate submissions blocked (G11/T13) | vitest test |
| R9 | Secrets/PII in logs or case files | L | High | No secret collection by design; case file stores minimum fields; fixtures are synthetic | T14 copy-summary test |
| R10 | Environment drift (Node/Python versions, Windows paths) | M | L | Pinned requirements.txt; engines documented in AGENTS.md; paths via pathlib | setup check in TEST_RESULTS.md |
| R11 | Submission appears fully AI-authored (assignment policy) | M | High | All user-facing copy and the submission doc remain drafts for the user to rewrite; AI usage log maintained | Phase 4 list of files the user must rewrite |
| R12 | Push to GitHub blocked (no remote branch/credentials) | M | L | Local commits always; push attempted per phase; blocker reported, never worked around | git output recorded in IMPLEMENTATION_STATE.md |
