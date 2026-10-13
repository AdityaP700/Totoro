# Phase 02 — Foundation, Typed Mock Data, Playbooks, State Machine

## Goal
Create the minimum reliable foundation for the primary rejected-template journey before UI complexity.

## Tasks
1. Follow the approved stack and existing project conventions.
2. Define typed models for:
   - template fixture and statuses;
   - triage result;
   - playbook;
   - proposed operation;
   - case file;
   - audit event/correlation ID.
3. Add three deterministic mock variants:
   - promotional wording in a Utility template;
   - broken variable formatting;
   - category mismatch.
4. Use official provider reason codes only when the source has been checked. Otherwise use a clearly labelled internal/mock code.
5. Store playbooks separately from UI logic, preferably in JSON/TS data.
6. Implement an explicit state machine for entry, read, triage, diagnosis, proposal, confirmation, simulated action, verification, pending/resolved, decline, and handoff.
7. Implement an append-only in-memory event history for the prototype. Every event includes case ID, correlation ID, timestamp, type, outcome, source label, and minimal details.
8. Ensure reset behavior is deterministic. Avoid database setup unless the existing app truly requires persistence.
9. Add unit tests for state transitions, fixture selection, duplicate confirmation protection, and event generation.

## Rules
- No live Cheerio or Meta calls.
- No real customer data or credentials.
- Never label a mock state as authoritative.
- No action before confirmation.
- Do not call an LLM for deterministic known reason codes.

## Acceptance gate
- Three fixtures load.
- Playbooks can change without editing screen components.
- State transitions are testable.
- Every state-changing simulated action has a prior confirmation event.
- Verification is based on a fresh local-state read.
- Tests pass, or failures are documented before commit.
