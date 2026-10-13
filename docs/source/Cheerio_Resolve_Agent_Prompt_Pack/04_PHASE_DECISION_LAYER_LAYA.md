# Phase 04 — Rules-First Triage and Laya Adapter

## Goal
Use Laya as the intended decision-layer option, while ensuring the prototype still works if Laya access or integration is unavailable.

## Before integration
1. Check current official Laya documentation and actual user-provided access/package details.
2. Confirm supported API shape, authentication, request/response schema, pricing/licensing, latency limits, and error behavior from source material.
3. Do not invent endpoint names, package APIs, model behavior, or performance claims.
4. If the agent cannot access authoritative docs or credentials, report the blocker and use the local adapter stub.

## Design
- Known reason codes and known fixture conditions use deterministic rules first.
- Laya is only considered for ambiguous wording or structured classification.
- Define an adapter interface independent of the UI and application action layer.
- Expected typed result includes `issueType`, `urgency`, `needsHuman`, `confidence`, `rationale`, and `missingInformation`.
- Validate every result against an application-owned schema and allowlisted enum values.
- Treat confidence as uncalibrated unless evaluated. Use a conservative configured threshold and route low confidence to one clarifying question or handoff.
- Laya output must never directly call an action, set permissions, or modify template state.
- Do not send unnecessary customer data. Keep prompts minimal.

## Fallback behavior
If Laya is unavailable, errors, times out, or returns invalid output:
- known cases continue through rules;
- ambiguous cases ask one clarifying question or hand off;
- never silently pretend the Laya call succeeded;
- record a decision-layer status in the audit event;
- keep the UI responsive.

## Evaluation plan (not required to complete the clickable prototype)
A future test set of 100–300 labelled scenarios may compare rules, standard LLM structured output, and Laya. Cover English/Hinglish, negation, ambiguity, missing state, conflicting information, urgency, and explicit human requests. Measure per-class precision/recall, missed escalation, false escalation, unsupported claims, latency, cost, and language splits. Do not claim Laya wins without running this test.

## Acceptance gate
The app works end-to-end without live Laya access. If Laya is integrated, request/response validation and fallback tests pass, and no Laya output can execute an operation.
