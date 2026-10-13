# Phase Commit, State Tracking, and Handoff Template

## Git workflow

Before every phase:
1. Run `git status --short` and inspect existing changes.
2. Identify only the files owned by this phase.
3. Do not stage unrelated user changes or secrets.
4. Make a small, coherent change.
5. Run relevant tests/lint/build.
6. Inspect `git diff --check` and `git diff`.
7. Update state/decision/test files.
8. Commit only if checks pass and the user has not disabled commits.

If the repo has no Git metadata, report that first and propose initialization; do not overwrite or relocate existing files.

## Suggested commits
- `docs: record Cheerio Resolve implementation decisions`
- `feat: add typed fixtures and recovery state machine`
- `feat: build rejected-template recovery flow`
- `feat: add Laya decision adapter with safe fallback`
- `test: cover confirmation verification and escalation`
- `style: polish responsive recovery experience`
- `docs: prepare assignment and agent handoff`

Never amend/rewrite the user's existing commits. If tests fail, don't claim the phase is complete; either fix the failure or report it and ask before proceeding.

## IMPLEMENTATION_STATE.md template

```md
# Implementation State
Updated: YYYY-MM-DD HH:MM timezone

## Current phase
Phase XX — name

## Status
Not started | In progress | Blocked | Complete

## Repo/environment
- Stack:
- Start command:
- Test command:
- Git branch:
- Last commit:

## Completed
- ...

## Current files changed
- ...

## Validation
- Command:
- Result:
- Unrun checks and reason:

## Mocked vs real
- Mocked:
- Real:
- Unknown:

## Blockers/risks
- ...

## Next phase
- ...
```

## DECISION_LOG.md template

```md
# Decision Log

## YYYY-MM-DD — Decision title
- Context:
- Options considered:
- Decision:
- Why:
- Source decision/guardrail IDs:
- Evidence label:
- Consequences:
- Revisit when:
```

## TEST_RESULTS.md template

```md
# Test Results
Updated: YYYY-MM-DD

| Test | Command/steps | Expected | Actual | Status | Notes |
|---|---|---|---|---|---|
```

## Phase completion report

At the end of each phase, report:
- phase and commit hash;
- summary of what changed;
- files changed;
- tests actually run and outcomes;
- Git status after commit;
- screenshot or UI proof when applicable;
- deviations from source decisions and affected D/G IDs;
- mocked vs real behavior;
- blockers and next phase.

## Handoff report template

```md
# Handoff Report
## Product state
## What works
## What is mocked
## Architecture and data flow
## How to run
## Tests and results
## Screenshots/links
## Commits
## Guardrail compliance
## Known limitations
## Open decisions
## Recommended next action
```
