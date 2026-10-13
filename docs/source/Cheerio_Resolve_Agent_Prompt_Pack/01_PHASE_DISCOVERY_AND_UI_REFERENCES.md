# Phase 01 — Discovery, Repository Audit, and UI Reference Selection

Use this prompt after the master prompt.

## Goal
Understand the two source documents, inspect the current workspace, and propose an implementation/design direction before writing product code.

## Tasks
1. Read the original DOCX and implementation-plan Markdown completely. Extract:
   - D1–D11 decisions;
   - G1–G15 guardrails;
   - primary journey;
   - screens S1–S6;
   - mock variants;
   - failure cases and acceptance tests;
   - assignment deliverables and deadline constraints.
2. Inspect the repo: stack, entry points, scripts, tests, current Git status, user changes, assets, design system, README, and dependency versions.
3. Inspect available Dribbble links, screenshots, UI templates, or design references in the workspace. Do not claim to have inspected references that are not accessible.
4. Recommend one visual direction suited to a minimalist, calm B2B operations product:
   - compact app shell;
   - clear status hierarchy;
   - readable diagnosis panel;
   - obvious before/after comparison;
   - prominent but non-alarming confirmation;
   - clear pending/verified/failed states;
   - useful handoff case file.
5. Compare candidate references based on usability, responsiveness, evidence density, implementation cost, accessibility, and fit to the assignment. If no references are available, ask the user to supply links/screenshots and propose a neutral wireframe only.
6. Recommend the smallest suitable frontend/backend setup based on the existing repo. A database is not required for the prototype unless a concrete need is found.
7. Explain where Laya would fit and what official documentation/access must be checked before integration.
8. Create/update:
   - `IMPLEMENTATION_STATE.md`
   - `DECISION_LOG.md`
   - `UI_REFERENCE_REVIEW.md`
   - `TEST_RESULTS.md`
9. Do not build the full UI yet. Wait for approval on any material design-reference choice or stack change.

## Output format
- What the source documents require.
- Repo findings and current Git status.
- Candidate UI references and recommendation.
- Proposed stack and why.
- Laya access/documentation status (verified vs unknown).
- Phase plan, exact file changes, acceptance criteria.
- Questions that truly block progress only.

## Acceptance gate
No product code is changed in this phase unless the user explicitly approves a small scaffold. User data and existing modifications remain untouched.
