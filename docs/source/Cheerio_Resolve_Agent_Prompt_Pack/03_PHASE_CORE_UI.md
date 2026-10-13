# Phase 03 — Minimal Responsive Core UI (S1–S5)

## Goal
Build the basic interface first: simple, calm, intuitive, responsive, and fully clickable. Visual polish is a later phase.

## Required screens
- **S1:** template list; rejected item; “Why isn’t this working?”; mock-data label.
- **S2:** diagnosis, status/reason, evidence, plain-language explanation, next action.
- **S3:** before/after comparison, reason for edits, explicit confirmation, decline.
- **S4:** result based on fresh mock-state read; Verified / Submitted—pending review / Could not verify; simulation label; correlation ID.
- **S5:** complete human handoff case file.

## Design rules
- Use the UI reference approved in Phase 01. If no reference was approved, use a restrained default design and do not imitate a random Dribbble shot.
- Prefer legibility and workflow clarity over decoration.
- Keep the current issue visible throughout the flow.
- Use responsive layout for desktop and narrow viewport.
- Status labels must be text, not color alone.
- Provide loading, empty, error, pending, success, and disabled states as relevant.
- Confirmation must clearly state the proposed change and its consequences.
- Human help must remain available on failure screens.
- Show mock/simulation labels near the relevant content, not only in a footer.
- Avoid excessive motion. Any animation should communicate a state change and respect reduced-motion preferences.

## Interaction requirements
- Main path is clickable from S1 to S4.
- Decline returns to a safe unchanged state and offers explanation/human help.
- Failed verification routes to S5.
- “I need a human” routes to S5 immediately.
- S5 is populated from current case/event state, not static unrelated placeholder copy.
- Add copy-case-summary interaction if low cost.

## Acceptance gate
A reviewer can complete the main path and at least two failure paths without developer narration. No backend or external API is required for this phase; local deterministic behavior is acceptable.
