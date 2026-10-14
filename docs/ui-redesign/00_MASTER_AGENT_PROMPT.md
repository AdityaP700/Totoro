# Totoro UI Adaptation --- Master Agent Instructions

## Objective

Adapt the existing Totoro application using the supplied **QueryMind
frontend folder** as the source of truth for the existing visual design,
layout, UI components, animations, and video assets. The QueryMind
folder contains the landing page and workspace/chat UI; reuse it rather
than building a new design.

Totoro is the product name. Replace QueryMind branding and
product-specific copy with Totoro content appropriate to the actual
Totoro product. The existing frontend is a **reference implementation
and starting point**, not a reason to preserve QueryMind's product
identity or analytics-specific copy.

## Hard constraints

1.  **Do not redesign the visual UI.** Keep the existing layout,
    spacing, typography, colors, component shapes, card styling,
    background treatment, video, animations, responsive behavior, and
    interaction patterns wherever they already exist.
2.  Change content, labels, product branding, CTA destinations, relevant
    result fields, and required integration behavior only.
3.  Do not remove, replace, re-encode, crop, or break the existing
    video/background assets. Inspect how the assets are referenced and
    preserve their paths and playback behavior.
4.  Reuse existing components, styles, dependencies, routes, and state
    management wherever practical. Avoid a parallel implementation or a
    second chat UI.
5.  Add the first-run onboarding flow and integrate it into the existing
    routing. After onboarding, the user must land in the existing
    workspace/chat experience.
6.  Do not change backend business logic, authorization, recovery/action
    approval, or verification logic as part of this UI task.
7.  Do not fabricate metrics, source data, confidence scores, successful
    actions, connected integrations, or verification results.
8.  Do not add buttons or navigation that do nothing.
9.  Do not assume a capability exists just because it appears in a
    mockup. Inspect the code and connect UI to real functionality;
    otherwise omit it or label it as a demo.
10. Keep existing working routes and behavior intact.

## First: inspect before editing

Before changing files:

1.  Inspect the repository structure, package scripts, framework,
    router, component structure, CSS/theme setup, and current
    application entry points.
2.  Locate the QueryMind landing page, workspace/chat, results view,
    video/background assets, and all references to QueryMind,
    Elasticsearch, ESQL, and analytics.
3.  Locate Totoro's current product logic and intended user journey. Do
    not replace the product domain with assumptions from the reference
    UI.
4.  Identify existing auth/session and persistence behavior before
    deciding how to detect first-time versus returning users.
5.  Write a short implementation plan and identify files to change. Then
    implement in small, testable steps.
6.  Do not create a new design system or rewrite the app wholesale.

## Product adaptation

-   Use **Totoro** as the product name in the UI, page titles, metadata,
    labels, and copy where appropriate.
-   Remove QueryMind-specific branding and copy from user-facing
    screens.
-   Preserve the existing page structure and UI style.
-   Keep the product's actual purpose, backend integrations, and
    capabilities as defined by the Totoro codebase and project
    requirements. Do not blindly copy QueryMind's Elasticsearch/ES\|QL
    terminology into Totoro unless Totoro actually uses those
    technologies.
-   Use the three accompanying guides:
    -   `01_LANDING_PAGE_GUIDE.md`
    -   `02_WORKSPACE_CHAT_RESULTS_GUIDE.md`
    -   `03_ONBOARDING_INTEGRATION_GUIDE.md`

## Integration order

### Phase 1 --- Audit and baseline

-   Run the existing app using the repository's documented commands.
-   Verify the current landing page, video/background, workspace, result
    view, navigation, and responsive behavior.
-   Record existing routes and interactions so they can be
    regression-tested.

### Phase 2 --- Landing page content

-   Follow `01_LANDING_PAGE_GUIDE.md`.
-   Keep the current visual structure and video asset.
-   Update only content, brand references, and CTA routing.

### Phase 3 --- Onboarding

-   Follow `03_ONBOARDING_INTEGRATION_GUIDE.md`.
-   Add the onboarding flow using existing design tokens and components.
-   Connect completion to the existing workspace; do not create a second
    workspace.

### Phase 4 --- Workspace and results

-   Follow `02_WORKSPACE_CHAT_RESULTS_GUIDE.md`.
-   Adapt the existing chat/composer, suggestions, result cards, and
    statuses.
-   Preserve real backend behavior and distinguish findings, actions,
    and verified outcomes.

### Phase 5 --- Test and report

-   Run lint, type-check, tests, and build scripts that already exist.
-   Manually test new-user, returning-user (only if supported), skipped
    onboarding, Back/Next, workspace entry, chat submit, loading,
    errors, results, and responsive layout.
-   Verify video/background assets still load and play as before.
-   Search for leftover QueryMind branding and misleading
    product-specific labels.
-   Report files changed, routes affected, tests run, limitations, and
    any feature that could not be integrated because the backend does
    not support it.

## Definition of done

-   Totoro branding and copy are consistent.
-   Existing QueryMind frontend visuals, video, layout, and responsive
    behavior are preserved.
-   Landing-page CTAs route correctly.
-   Onboarding works and leads into the existing workspace.
-   The workspace and results display Totoro-relevant content based on
    real application capabilities.
-   Existing routes and working behavior remain intact.
-   No fake data, metrics, integrations, or success states are presented
    as real.
-   Build/tests pass, or any pre-existing/new failures are clearly
    reported.
