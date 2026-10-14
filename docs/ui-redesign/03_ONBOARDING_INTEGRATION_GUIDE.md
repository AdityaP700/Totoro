# Totoro --- Onboarding and Routing Integration Guide

## Objective

Integrate a first-run onboarding flow into the existing Totoro
application, inspired by ZCode's guided onboarding.

The QueryMind frontend folder is the reference for existing visual
design. Reuse its design tokens and components. The onboarding should
feel native to Totoro and must route users into the **existing
workspace/chat UI**, not a newly built alternative.

Do not redesign the existing landing page or workspace.

## Interaction principles

Borrow these patterns from ZCode without copying its branding: - Three
steps with a compact progress indicator. - One primary decision per
step. - Selectable cards where appropriate. - Back navigation that
preserves entered values. - Clear Next/Finish buttons. - Optional
Skip. - A consistent brand panel on desktop only if it fits existing
styles. - On mobile, prioritize the form.

## Journey and routing

-   New user:
    `Landing page → Onboarding step 1 → Step 2 → Step 3 → Existing workspace`
-   Returning user: `Landing page → Existing workspace`, only if the
    current app reliably recognizes completed onboarding.
-   Skipped onboarding: `Skip → Existing workspace`, with
    profile/context editable later if settings support it.

Inspect existing router, auth/session, and persistence before
implementation. Do not invent auth or user recognition. If reliable
returning-user detection is not available, keep the flow functional and
document the limitation.

## Step 1 --- About you

**Heading:** Let's personalize Totoro.\
**Supporting text:** Tell us a little about yourself so we can tailor
your workspace.

Fields: - **Name** --- optional unless the app requires it. Placeholder:
`What should we call you?` - **Role** --- single-select cards: 1.
Founder / Business owner 2. Freelancer / Consultant 3. Product manager
4. Customer support 5. Operations 6. Team member 7. Developer /
Technical 8. Other

When `Other` is selected, reveal a short custom-role field. Hide it for
other roles.

Behavior: - Selected state is clear. - Inputs are accessible and
keyboard-operable. - Values survive Back/Next. - Avoid unnecessary
fields such as phone number, seniority, company size, or department. -
Role personalizes wording and suggested prompts only; it never changes
permissions or safety.

## Step 2 --- Your business or context

**Heading:** Give Totoro some context.\
**Supporting text:** Add a little context to make the experience more
relevant.

Fields: - Business or product name --- optional. - Website or
help-center URL --- optional. - Short description --- alternative to a
URL. - Team/organization name --- optional.

Example description: \> We run an online store and help customers with
orders, returns, and product questions.

Behavior: - This step is optional and skippable. - Do not require API
keys, integrations, CRM access, or support inbox connections just to
continue. - If website ingestion is genuinely implemented, show what was
retrieved and allow correction. - If it is not implemented, do not
pretend to crawl or analyze the website. Let users enter a description
instead. - A public URL does not imply access to private tickets or
customer data. - Preserve entered values when going Back. - Let users
edit context later only if the existing settings flow supports
persistence.

If Totoro's actual domain differs from customer support, adapt the
example and fields to the real product. Do not hardcode a business
category or workflow without checking the existing application.

## Step 3 --- Ready to go

**Heading:** You're all set.\
**Supporting text:** Your workspace is ready. Start with what you need
help with.

Show a compact summary in existing card/text components: - Name, if
provided. - Role. - Business/product name, if provided. -
Website/description status, if provided. - Neutral indication if context
was skipped.

**Primary CTA:** Start a conversation

Behavior: - Navigate to the existing workspace/chat route. - Show the
existing empty-chat state and personalized suggestions. - Do not create
a second dashboard or chat UI. - Do not imply website analysis or
connected data sources unless completed successfully.

## Personalization after onboarding

Use the selected role and available context to order or rephrase
existing suggestion cards. Keep one shared workspace.

For a support/issue-resolution product, possible prompt themes: -
Explain why a request failed. - Understand an error. - Identify missing
information. - Decide on a next step. - Continue a previous issue. -
Summarize an issue.

Use only prompts that match real implemented features. Adapt these
examples if Totoro's codebase defines a different product purpose.

## State and persistence

-   Inspect current persistence/session mechanisms first.
-   Reuse the existing mechanism; do not add a database or auth system
    solely for onboarding.
-   Store only fields the app can support.
-   Preserve form state between steps.
-   Avoid storing secrets or sensitive customer data.
-   Personalization cannot override permissions, approvals, or
    verification logic.
-   Do not claim onboarding completion persists across sessions unless
    it really does.

## Validation and edge cases

-   Validate only required fields.
-   Optional fields must not block progress.
-   Back retains all inputs.
-   Skip takes the user to the existing workspace.
-   Invalid values get clear, accessible error messages without clearing
    other fields.
-   Context retrieval failure must not block onboarding; explain the
    failure honestly.
-   No context is a valid state.
-   Avoid duplicate submissions where relevant.
-   Support keyboard navigation and visible focus.
-   On small screens, prioritize the form; do not force a large side
    panel into the viewport.

## Visual constraints

-   Use the QueryMind frontend's existing styles/components as the
    visual reference.
-   Do not copy ZCode's logo, blue gradient, or branding.
-   Do not introduce a new design system, illustration, animation
    system, or decorative gradient.
-   Keep typography, buttons, borders, spacing, and surfaces consistent
    with the existing app.
-   Preserve the landing-page video and existing workspace design.

## Acceptance checklist

-   [ ] Three-step onboarding is integrated into the existing router.
-   [ ] Role cards and `Other` conditional field work.
-   [ ] Business/context fields are optional.
-   [ ] Back/Next preserves values.
-   [ ] Skip routes to the existing workspace.
-   [ ] Finish routes to the existing workspace.
-   [ ] Personalization changes suggestions without changing
    permissions.
-   [ ] Returning-user routing uses only reliable existing
    persistence/session behavior.
-   [ ] No fake website ingestion or integration success.
-   [ ] Existing UI design and video assets are preserved.
-   [ ] Existing chat/workspace route remains the single workspace.
-   [ ] Mobile and keyboard accessibility are preserved.
-   [ ] Backend recovery, authorization, and verification logic remain
    unchanged.
