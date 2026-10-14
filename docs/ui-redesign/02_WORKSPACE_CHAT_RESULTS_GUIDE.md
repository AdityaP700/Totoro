# Totoro --- Workspace, Chat, and Results Adaptation Guide

## Objective

Adapt the existing QueryMind workspace/chat/results UI to Totoro. Reuse
the existing frontend implementation and component structure.

**Do not redesign the UI.** Preserve the sidebar, composer, content
width, typography, colors, spacing, cards, borders, buttons, result
layout, responsive behavior, and existing interactions. Change labels,
copy, suggestion content, and result fields only where necessary.

Do not change backend permissions, action approval, recovery, or
verification logic as part of this task.

## Workspace shell

Keep the existing workspace shell and routes. Reuse the current: -
Sidebar and recent items. - Main conversation/work area. - Composer and
send controls. - Suggested prompt cards. - Existing results/analysis
view. - History, reports, and settings pages where implemented.

Suggested label mapping, only where the current feature exists: -
`New Analysis` → `New conversation` or `New request` - `Recent analyses`
→ `Recent conversations` or `Recent requests` - `History` → `History` -
`Reports` → `Reports` - `Settings` → `Settings`

Use labels appropriate to Totoro's actual workflow. Do not add
navigation for unsupported integrations, automations, ticket management,
or multi-workspace features.

## Empty state

Keep the existing empty-state layout and composer.

Suggested copy for support/issue resolution: **Heading:** What can I
help you with?\
**Supporting text:** Describe the issue in your own words, and Totoro
will help you work through the next step.\
**Composer placeholder:** Describe what you need help with...

If Totoro's product purpose in the codebase differs, adapt the copy to
that purpose while preserving the same structure and length.

Keep existing keyboard behavior and multiline support. Keep attachments
only if implemented. Do not add decorative controls that do nothing.

## Suggested prompts

Reuse existing suggestion cards and show approximately 4--7 relevant
options. For a support/issue-resolution product, candidate prompts
are: - Explain why my request failed. - Help me understand this error. -
Check what information is missing. - Help me decide what to do next. -
Continue a previous issue. - Summarize this issue for someone else. -
Get additional help.

Only show suggestions that map to actual supported behavior. If
selected, a suggestion should prefill the composer or start a real
workflow.

If onboarding captures a role or business context, use it only to
reorder/rephrase prompts. Do not create a separate workspace per role,
change user permissions, or imply unavailable capabilities.

## Conversation behavior

-   Preserve conversation context between messages.
-   Show accurate loading/investigation status.
-   Ask focused clarification questions when necessary.
-   Do not repeat questions already answered.
-   Preserve user input when a request fails.
-   Show findings and evidence in existing compact cards.
-   Keep technical details collapsed by default where relevant.
-   Connect controls to real application behavior.

## Result hierarchy

Adapt existing result components to display only relevant information,
in this order where supported:

1.  **Summary / What I found** --- the main result in plain language.
2.  **Why this result** --- a concise explanation grounded in available
    evidence.
3.  **Recommended next step** --- one clear action.
4.  **Needs your input / Approval** --- only when necessary.
5.  **Action status** --- only when an action was actually attempted.
6.  **Outcome status** --- confirmed, unresolved, or awaiting review
    based on actual state.

Do not show every section if it does not apply. Preserve the existing
result-page layout and component hierarchy.

## Result states

Reuse existing visual treatments. Do not invent new visual patterns.

### Loading

Use the current loading indicator and a truthful message such as: \> I'm
checking the available information.

Only show progress stages that correspond to actual operations. Do not
invent percentages or completion estimates.

### Needs clarification

Example: \> I need one more detail to narrow this down. Could you share
the request ID?

Ask for the real missing detail. Preserve the conversation context.

### Findings

Show: - A concise summary. - Relevant observations. - Evidence/source
details if available. - Uncertainty or missing information where
relevant.

Distinguish observed facts from generated interpretation.

### Awaiting approval

Where the current backend supports approval: \> I've prepared a
suggested action. Please review it before proceeding.

Show approval/cancel controls only if they work. Never perform an action
before required approval.

### Action in progress

Display the actual execution state. Prevent duplicate submissions where
necessary. Do not invent percentages, timing, or success.

### Confirmed outcome

Use a success/verified state only when the application confirms the
expected outcome. Display confirmation evidence where available.

### Unresolved / needs review

Use a clear message such as: \> I couldn't confirm the outcome. This
needs further review.

Show a reason and next step if available. Offer human handoff only if
implemented. Never use color alone to communicate state.

## Existing QueryMind-specific result metrics

Inspect the current results UI and data model. Do not merely rename
metrics that do not make sense for Totoro.

-   **Generated ES\|QL:** remove from the default user-facing result
    unless Totoro genuinely uses ES\|QL and users need to inspect it. If
    relevant, place technical details in the existing expandable details
    area.
-   **Rows scanned:** show only if the workflow produces a meaningful,
    real count.
-   **Latency:** show only if real timing exists and is useful.
-   **Confidence percentage:** never invent. Display only if genuinely
    computed and meaningful.
-   **Source index:** replace with a human-readable source label only
    when the source is known and relevant.
-   **Verification status:** show the real state, not a hardcoded green
    check.
-   **Analyst summary:** adapt to a plain-language summary grounded in
    actual results.

Omit unsupported or unavailable metrics rather than filling the existing
cards with fake values. Preserve the layout by hiding unused fields or
using existing empty/conditional states; do not redesign the card.

## History, reports, and settings

-   Keep current page structure and working functionality.
-   History items may show title, preview, last activity, and status
    when available.
-   Reports must use real data. If none exists, use the existing empty
    state.
-   Do not fabricate counts, trends, confidence, or success percentages.
-   Keep settings aligned with fields the application actually persists,
    including onboarding profile/business context where supported.
-   Do not imply that deleting a conversation deletes backend
    records/audit logs unless that behavior is real.

## Technical and implementation constraints

-   Preserve the existing UI design.
-   Reuse current components, styles, and dependencies.
-   Do not add a second chat interface.
-   Do not change backend business logic or authorization.
-   Do not expose secrets or internal keys.
-   Do not show an action as successful before confirmation.
-   Do not add inert buttons or mock integrations.
-   Preserve working routes and keyboard accessibility.

## Acceptance checklist

-   [ ] Workspace visuals remain unchanged.
-   [ ] QueryMind-specific copy is replaced with accurate Totoro
    wording.
-   [ ] Empty state and composer are adapted.
-   [ ] Suggestions map to supported behavior.
-   [ ] Results distinguish summary, evidence, recommendation, approval,
    action status, and outcome as applicable.
-   [ ] No fabricated metrics or success states.
-   [ ] Unsupported QueryMind/ES\|QL details are removed or hidden
    appropriately.
-   [ ] History, reports, and settings continue to work where
    implemented.
-   [ ] Loading, errors, and unresolved states are honest.
-   [ ] Backend safety and verification logic remain unchanged.
