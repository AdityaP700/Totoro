# Phase 05 — Guardrails, Failure Paths, and Test Gate

## Goal
Prove the product behaves safely when information is missing, the user declines, the simulated action fails, or the issue needs a human.

## Mandatory tests
1. Known reason code selects the expected playbook.
2. Ambiguous user text does not override authoritative/mock state.
3. Missing/unknown reason never produces an invented diagnosis.
4. Decline means no state mutation.
5. No action-like operation occurs before explicit confirmation.
6. Confirmed operation affects only the intended mock record.
7. Fresh state read drives result label.
8. Pending is never shown as approved.
9. Failed verification shows “Could not verify” and offers human help.
10. Explicit human request immediately creates handoff.
11. Two failed attempts on same issue stop and escalate.
12. Billing/refund/credit/security/identity/access/ownership issues are human-led.
13. Missing permission never gets bypassed.
14. Duplicate confirmation is blocked and does not duplicate the write/event.
15. Case file contains original wording, state, checks, proposal, approval, attempted action/result, verification, timestamps, and correlation ID.
16. Mock and simulated values are visibly labelled.
17. Manager counts, if present, derive from event history.
18. Reset returns to known deterministic fixture state.

## Guardrails
Follow original brief G1–G15. Especially:
- application code owns actions;
- narrow allowlist;
- explicit confirmation;
- least privilege;
- verified means fresh state read matches expected state;
- stop after two failed attempts;
- immediate human escalation when requested or when issue is out of scope;
- minimal personal data;
- audit event with correlation ID;
- no unsupported claims.

## Failure behavior
On any unexpected error, show a calm error state with:
- what could/could not be verified;
- whether any simulated state change occurred;
- correlation ID;
- option to open the case file.

Do not swallow errors and render success. Do not loop automatically.

## Acceptance gate
Tests pass. If a test cannot be implemented due to the current stack, document why and provide a manual test. Never report an unrun test as passed.
