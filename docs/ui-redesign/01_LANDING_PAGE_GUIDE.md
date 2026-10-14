# Totoro --- Landing Page Content and Integration Guide

## Objective

Adapt the existing QueryMind landing page for Totoro. The supplied
QueryMind frontend folder is the source of truth for the landing page's
**visual design and video/background assets**.

**Do not redesign the page.** Preserve the current section order,
layout, typography, colors, spacing, cards, imagery, video, animation,
buttons, footer, and responsive behavior. Update visible copy, product
name, and CTA destinations only.

## Before editing

-   Find the existing landing page and its component boundaries.
-   Identify the video/background asset, source path, poster/fallback,
    playback settings, and responsive behavior.
-   Preserve the asset and existing implementation. Do not replace it
    with a generated image or a different video.
-   Find all QueryMind-specific text and links.
-   Verify actual Totoro capabilities against the codebase before making
    claims.

## Branding

-   Product name: **Totoro**.
-   Replace user-facing QueryMind branding with Totoro.
-   Keep the existing logo/component structure if one exists; change its
    text/asset only if a Totoro brand asset is available.
-   Do not invent a new logo, new palette, or new typography.

## Hero

Use the existing hero composition and keep the video/background
unchanged.

Suggested copy for a support and issue-resolution product:

**Headline** \> Resolve issues. Get back to work.

**Description** \> Totoro helps you understand support issues, review
the available context, and find a clear next step.

**Primary CTA** \> Get Started

**Secondary CTA** \> See How It Works

If Totoro's actual purpose in the codebase differs, keep the same
concise structure but adjust the words to match the real product. Do not
claim unsupported capabilities.

### CTA behavior

-   `Get Started`: new users go to onboarding.
-   Returning users go to the existing workspace only if the current
    application can reliably identify them.
-   `See How It Works`: use existing in-page navigation/scroll behavior
    to the existing explanation section.
-   Preserve current button components and styling. Do not add new
    routes solely to make a CTA appear functional.

## Hero demo / existing preview

Reuse the current demo/preview container and its visual treatment.
Replace QueryMind-specific example content with a Totoro-relevant
example supported by the product.

Illustrative example if the product handles customer-support issues:

**User** \> Why was my request rejected?

**Totoro** \> I'll review the available information and help you
understand the next step.

**Finding** \> A required detail may be missing.

**Suggested next step** \> Review the required information before trying
again.

This is mock landing-page content, not a real investigation. If the
current design has a demo label, use it. Do not show fabricated latency,
confidence, record counts, or a "verified" status.

## Existing problem/comparison section

Keep its existing layout and section placement.

**Eyebrow** \> WHY TOTORO EXISTS

**Heading** \> Get from a question to a clear next step.

**Supporting copy** \> Explain what you need, review the information
available, and understand what to do next without navigating a
complicated workflow.

If there is already a two-column comparison, update its existing content
rather than changing the layout.

**Traditional workflow** 1. Gather context. 2. Investigate across
available information. 3. Decide what to do next.

**Totoro** 1. Describe the issue. 2. Review findings and evidence. 3.
Choose a supported next step.

## Existing "How it works" section

Reuse the existing number and arrangement of cards. Suggested copy:

**Heading** \> Understand the issue. Find the next step. Stay in
control.

**Card 1 --- Describe the issue** \> Explain what you need in everyday
language.

**Card 2 --- Review the findings** \> Understand what the available
context and evidence show.

**Card 3 --- Choose what happens next** \> Review the recommended next
step and confirm actions when required.

Only add "Verify the outcome" if the existing layout already has a
suitable card and the application genuinely verifies outcomes. Do not
add sections or cards just to fit the copy.

## Capabilities and trust

Adapt existing capability cards to actual Totoro features. Possible
themes, only where implemented: - Understand a request. - Review
relevant context. - Explain findings. - Recommend a next step. - Verify
an outcome. - Escalate for human review.

Suggested trust heading: \> Clear answers. Visible next steps.

Suggested copy: \> Totoro should make findings and action status
understandable, keep users in control of consequential steps, and
clearly indicate when further review is needed.

Do not claim autonomous resolution, guaranteed accuracy, human handoff,
or verification unless the codebase supports it.

## FAQ

Reuse the current accordion and styling. Replace QueryMind-specific
questions with questions relevant to Totoro's real capabilities. For a
support/issue-resolution product, candidate questions are:

1.  **What is Totoro?**\
    Totoro helps users understand an issue and identify an appropriate
    next step using the information available to the application.

2.  **Does Totoro resolve every issue automatically?**\
    No. Some issues may require more information, user approval, or
    human review.

3.  **Can I review a suggested action?**\
    Explain the real approval behavior supported by the application. Do
    not promise a review step if no such step exists.

4.  **How do I know whether an issue is resolved?**\
    Describe the actual verification mechanism. If the app cannot verify
    outcomes, say that the user should confirm the result.

5.  **What if Totoro needs more information?**\
    It should ask a focused follow-up question or explain the
    limitation, where supported.

If Totoro's real product domain differs, rewrite the questions
accordingly. Do not leave irrelevant support claims in the page.

## Footer, metadata, and navigation

-   Preserve existing footer layout, columns, spacing, and links that
    still apply.
-   Replace QueryMind branding in the footer and page metadata.
-   Remove QueryMind/Elasticsearch/ES\|QL-specific links unless those
    resources remain relevant to Totoro.
-   Do not invent documentation, pricing, social accounts, or product
    routes.
-   Update page title and meta description to use Totoro and the actual
    product description.

## Constraints

-   No visual redesign.
-   Do not remove or alter the existing video/background asset or its
    behavior.
-   No new sections, cards, animations, or gradients.
-   No backend changes as part of copy replacement.
-   No fabricated metrics or unsupported claims.
-   Preserve accessibility, responsive behavior, and working links.

## Acceptance checklist

-   [ ] All visible QueryMind branding is replaced where appropriate.
-   [ ] Existing layout and visual design remain unchanged.
-   [ ] Existing video/background asset still loads and behaves as
    before.
-   [ ] Hero content describes Totoro accurately.
-   [ ] Primary CTA routes to onboarding and secondary CTA uses existing
    in-page navigation.
-   [ ] Demo is clearly illustrative and contains no fake production
    metrics.
-   [ ] FAQ, footer, title, and metadata no longer misrepresent the
    product.
-   [ ] No new unsupported routes or capabilities are introduced.
