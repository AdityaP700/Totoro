# Cheerio Resolve --- Implementation Plan & Agent Handoff

**Status:** Draft implementation plan derived from the 17-page *Cheerio
Resolve: Design Brief for AI Agent Decisions* (13 October 2026).\
**Purpose:** Give a downstream AI agent enough context to finalize the
design and implement a credible prototype without reconstructing the
prior conversation.\
**Important:** This is an implementation plan, not the final four-page
assignment submission. The human author must review, adapt, and
contribute their own reasoning.

------------------------------------------------------------------------

## 1. Executive decision

Build **Cheerio Resolve**, a context-aware recovery flow inside the
existing product---not a general chatbot and not a new standalone
dashboard.

The prototype demonstrates one complete journey: a non-technical
business owner has a rejected WhatsApp template and needs to understand
what happened, decide what to do, and either reach a verified state or
hand the case to a human without repeating the story.

### Product promise

> The user should not have to understand the problem, explain it to
> support, and then work out the fix. Cheerio uses the context it
> already has to get them to a verified outcome, or hands the case to a
> human with the evidence already attached.

### Primary demonstration

1.  User opens a rejected template and selects **"Why isn't this
    working?"**
2.  The prototype reads a clearly labelled mock template record.
3.  Rules map known reason codes to a playbook; uncertain cases ask one
    question or escalate.
4.  The user sees the diagnosis and a before/after correction.
5.  The user explicitly confirms before the simulated write action.
6.  The prototype re-reads simulated state and accurately shows pending,
    verified, or failed.
7.  If unresolved, a support case file appears with evidence and a
    correlation ID.

### What is deliberately not being built

-   A general-purpose AI employee or all-issues bot.
-   A new dashboard with separate onboarding.
-   A production Cheerio or Meta integration.
-   Autonomous account, template, flow, campaign, billing, refund, or
    credit changes.
-   A Telegram/WhatsApp bot as the primary prototype.
-   A self-hosted Laya model or production Jev integration.
-   A claim that Meta approved a template.
-   A claim that the prototype proves real-world support savings.

------------------------------------------------------------------------

## 2. Source of truth and decision precedence

Use the attached design brief as the initial source of truth. If
instructions conflict, follow this order:

1.  **Guardrails G1--G15** override all other instructions.
2.  **Design decisions D1--D11** override implementation suggestions.
3.  **Evidence labels** govern how claims are worded.
4.  Remaining guidance may be adapted if the agent explains why.

The downstream agent must not silently change a settled decision. For
any proposed change, state: - decision ID affected; - evidence or
implementation constraint prompting the change; - user impact; - safer
or simpler alternative; - whether human approval is needed.

### Evidence labels

  -----------------------------------------------------------------------
  Label                   Meaning                 Required writing style
  ----------------------- ----------------------- -----------------------
  Documented              Supported by official   State as fact and cite
                          documentation or a      the source
                          published page          

  Reported                Claimed by a company or Attribute the claim
                          research note, not      
                          independently verified  

  Hypothesis              Belief about Cheerio    Call it a hypothesis
                          users/tickets without   
                          Cheerio-specific data   

  Assumption              A number or choice      Label it as an
                          selected to make the    assumption
                          plan concrete           
  -----------------------------------------------------------------------

Do not turn company-reported metrics, external benchmark claims,
estimated issue mix, or prototype results into Cheerio facts.

------------------------------------------------------------------------

## 3. Scope and audiences

### Primary user: operator

A business owner or campaign marketer who is hands-on but not technical.
Their job is to get back to sending a campaign without guessing at
settings or waiting for support. Show: - a plain-language explanation; -
the exact line or setting at fault; - one clear next action; - a
before/after comparison; - a safe confirmation step; - a truthful
result.

### Secondary user: support agent

They need to take over without asking the customer to start again. Show
a case file with: - original message and language; - template/account
identifiers; - current state and reason code; - checks and results; -
proposed fix and user approval/decline; - attempted action and result; -
verification status; - timestamps and correlation ID; - recommended next
step.

### Secondary user: accountable manager

Optional S6 view derived from the same event history. It may show counts
of mock cases by failure type, unresolved cases, human escalations, and
verification outcomes. It must not imply that mock counts are real
Cheerio analytics.

### Anti-persona: technical implementer

Do not force developers/agency implementers into a chat-only experience.
A real future technical handoff should preserve exact error codes, event
IDs, timestamps, and retry status. This is not the primary clickable
flow.

### Reviewer needs

-   **Product reviewer:** problem choice, prioritization, alternatives
    rejected, scope boundaries.
-   **Support/ops reviewer:** credible handoff and at least two failure
    paths.
-   **Business/finance reviewer:** reconciled spreadsheet figures and
    labelled assumptions.
-   **Engineering reviewer:** architecture, permission boundary,
    verification, swappable decision layer.
-   **Founder/recruiter:** economics, production path, and explicit
    statement of what is mocked.

------------------------------------------------------------------------

## 4. Prototype boundary

### In scope

-   Clickable screens S1--S5 and, if time permits, S6.
-   Three mock rejected-template variants.
-   Rules-first triage.
-   A small playbook/rule table stored separately from screen logic.
-   One explicit confirmation gate.
-   Simulated state transition and verification, clearly labelled.
-   At least two visible failure paths.
-   Case-file handoff and event log with correlation ID.
-   Basic keyboard-friendly and readable UI states.
-   Four assignment screenshots: S2, S3, S4, S5.
-   A short optional Loom (3--5 minutes).

### Out of scope

-   Real Cheerio credentials, APIs, customer records, or production
    account writes.
-   Real Meta resubmission or approval.
-   Live support-ticket analytics.
-   Production auth/permissions infrastructure.
-   Autonomous billing/refund/credit/security/identity/ownership
    decisions.
-   A second bot or standalone dashboard.
-   Full multilingual policy diagnosis beyond English and Hinglish.
-   Model hosting or claims that Laya/Jev outperforms a baseline.

**Prototype honesty rule:** every mock record, simulated operation,
assumed metric, and simulated outcome must be visibly labelled as such
in the UI and documentation.

------------------------------------------------------------------------

## 5. Core journey and state machine

### Main path

`ENTRY → READ_STATE → TRIAGE → DIAGNOSE → PROPOSE → CONFIRM → APPLY_SIMULATED_ACTION → VERIFY → RESOLVED_OR_PENDING`

Any uncertainty or unsafe condition can route to:

`CLARIFY_ONCE → TRIAGE`\
or\
`HANDOFF_WITH_CASE_FILE`

### State definitions

  ---------------------------------------------------------------------------------------------
  State                      Entry condition     UI result           Allowed next states
  -------------------------- ------------------- ------------------- --------------------------
  `ENTRY`                    User selects a      Template context    `READ_STATE`
                             rejected template   and "Why isn't this 
                                                 working?"           

  `READ_STATE`               Mock fixture is     Show status,        `TRIAGE`, `HANDOFF`
                             loaded              category, text,     
                                                 reason code, last   
                                                 update; label as    
                                                 mock                

  `TRIAGE`                   State and original  Issue type,         `DIAGNOSE`,
                             user wording        urgency,            `CLARIFY_ONCE`, `HANDOFF`
                             available           needs-human,        
                                                 confidence/reason   

  `CLARIFY_ONCE`             Missing/ambiguous   One short question; `TRIAGE`, `HANDOFF`
                             intent but safe to  retain original     
                             ask                 wording             

  `DIAGNOSE`                 Known               Plain-language      `PROPOSE`, `HANDOFF`
                             reason/playbook     explanation, exact  
                             matched             evidence and reason 
                                                 code                

  `PROPOSE`                  A safe candidate    Before/after text   `CONFIRM`, `DECLINED`,
                             correction exists   or category and     `HANDOFF`
                                                 reason for each     
                                                 change              

  `CONFIRM`                  User explicitly     Confirmation of     `APPLY_SIMULATED_ACTION`
                             approves proposed   exact proposed      
                             change              operation           

  `APPLY_SIMULATED_ACTION`   Confirmation        Label the action as `VERIFY`, `HANDOFF`
                             recorded            simulated; record   
                                                 event               

  `VERIFY`                   Simulated source    Compare actual mock `RESOLVED`, `PENDING`,
                             state is re-read    state with expected `HANDOFF`
                                                 state               

  `RESOLVED`                 Re-read state       "Verified" only for Terminal for this demo
                             matches expected    matching state      
                             outcome                                 

  `PENDING`                  State is pending    "Submitted;         `HANDOFF` or terminal
                             provider review     awaiting Meta       pending
                                                 review"             

  `DECLINED`                 User rejects        State unchanged;    `DIAGNOSE`, `HANDOFF`
                             proposal            explain no change   
                                                 was made            

  `HANDOFF`                  Human requested,    Complete case file  Terminal for prototype
                             unsafe, uncertain,  and correlation ID  
                             failed, or repeated                     
                             issue                                   
  ---------------------------------------------------------------------------------------------

The prototype should use a small explicit state machine, not a
collection of unrelated screen booleans. Resetting the demo must return
the state machine and event history to a known fixture state.

### Critical semantic distinction

-   **Attempted:** the prototype ran or simulated an operation.
-   **Submitted:** the status indicates submission/pending review.
-   **Verified:** a fresh state read matches the expected outcome.
-   **Approved:** only if authoritative state explicitly says approved.
-   Never label a button click or a successful function call as a
    resolution.

------------------------------------------------------------------------

## 6. Screen specification

### S1 --- Template list / entry

**Purpose:** establish context and make the recovery action obvious.

Required content: - a small mock template list; - one rejected template
visually identified; - status, category, and last-updated value; -
button: **"Why isn't this working?"**; - persistent but unobtrusive
**"Demo uses mock data"** label.

Primary action: open S2 with the selected template ID and fixture
context.

### S2 --- Diagnosis

**Purpose:** prove that the product reads context rather than asking the
user to restate everything.

Required content: - template name/ID and current status; - current
category and rejection reason code; - short plain-language diagnosis; -
the specific line or field that triggered the playbook; - evidence used
and what cannot be verified; - issue classification and whether human
review is needed; - a visible mock-data label.

Primary action: **"Review suggested change"**. Secondary action: **"Get
human help"**.

### S3 --- Before/after and confirmation

**Purpose:** make the proposed action understandable and require
explicit approval.

Required content: - original content and proposed content; - highlighted
difference; - one-line reason for each change; - clear statement of what
will and will not change; - explicit **"Review and resubmit"**
confirmation button; - cancel/decline path; - no write before
confirmation.

Primary action: transition only after confirmation. Decline must leave
the mock account state unchanged.

### S4 --- Result / verification

**Purpose:** distinguish the action from its verified outcome.

Required content: - action result and whether it was simulated; - fresh
mock state read; - expected versus observed status; - one of:
**Verified**, **Submitted --- pending review**, or **Could not
verify**; - a human-help option on every failure screen; - correlation
ID.

At least two variants should be reachable: 1. simulated state changes to
pending; 2. state does not change, so the product does not claim success
and offers handoff.

### S5 --- Human handoff case file

**Purpose:** demonstrate that escalation is a designed outcome, not a
dead end.

Required content: - case ID/correlation ID; - account/workspace and
template identifiers (mock values); - original user wording and
language; - current state, category, reason code; - issue type, urgency,
and confidence/reason; - checks run and results; - proposed correction
and whether user approved; - action attempted and result; - verification
outcome; - timestamps and recommended next step; - clear **"No verified
resolution yet"** status when applicable.

Include a **"Copy case summary"** interaction if practical. Do not
display unnecessary personal data.

### S6 --- Optional manager view

Build only after S1--S5 work. Show mock event counts by issue type,
verified/pending/handed-off cases, and recurring failures. Label the
data as simulated. It must be derived from the same event array rather
than separately hardcoded metrics.

### Screenshot plan

Capture: 1. S2 diagnosis; 2. S3 before/after confirmation; 3. S4 pending
or failed-verification state; 4. S5 human handoff case file.

S1 and S6 may appear in the live prototype but are not required in the
four screenshot slots.

------------------------------------------------------------------------

## 7. Mock data and playbooks

Use deterministic fixtures. Do not make the user wait for a live API
that the assignment does not provide.

### Suggested fixture schema

``` ts
type TemplateStatus = "REJECTED" | "PENDING" | "APPROVED" | "UNKNOWN";

type MockTemplate = {
  id: string;
  name: string;
  language: string;
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  text: string;
  status: TemplateStatus;
  reasonCode: string | null;
  lastUpdated: string;
  sourceLabel: "MOCK";
};
```

### Three required variants

1.  **Promotional wording in a Utility template**
    -   Mock reason code: use a documented provider reason only if
        source-confirmed; otherwise use a clearly labelled internal
        fixture code.
    -   Proposed action: explain category mismatch and show a possible
        category change or text correction.
    -   Do not promise approval.
2.  **Broken variable formatting**
    -   Show the exact variable/formatting issue in the mock text.
    -   Propose a correction that is understandable and reversible.
    -   If the authoritative reason is too vague to identify the exact
        defect, say the exact cause cannot be verified and hand off.
3.  **Category mismatch**
    -   Show the category and reason as separate fields.
    -   The playbook explains the mismatch and proposes a candidate
        correction.
    -   Explicit confirmation remains mandatory.

### Playbook schema

``` ts
type Playbook = {
  id: string;
  match: {
    reasonCodes?: string[];
    category?: string;
    fixtureCondition?: string;
  };
  issueType: string;
  explanation: string;
  evidenceFields: string[];
  proposedAction: {
    operation: string;
    description: string;
    requiresConfirmation: true;
  };
  needsHuman: boolean;
  escalationReason?: string;
};
```

Keep playbooks in a JSON file or similarly simple data store separate
from screen components. A change to explanation/rules should not require
rewriting the UI.

------------------------------------------------------------------------

## 8. Triage and decision layer

### Default approach

1.  **Rules first:** known authoritative reason codes and known fixture
    conditions map to known playbooks.
2.  **Decision layer second:** only for ambiguous user wording or cases
    that need structured classification.
3.  **Human route:** low confidence, missing authoritative state,
    conflicting information, unsafe actions, or an explicit human
    request.

### Typed result contract

``` ts
type TriageResult = {
  issueType:
    | "TEMPLATE"
    | "WABA_CONNECTION"
    | "CAMPAIGN_DELIVERY"
    | "CHATBOT_FLOW"
    | "INTEGRATION_WEBHOOK"
    | "UNKNOWN";
  urgency: "LOW" | "NORMAL" | "HIGH";
  needsHuman: boolean;
  confidence: number;
  rationale: string;
  missingInformation: string[];
};
```

Treat confidence as a model/rule output, not a calibrated probability
unless it has been evaluated. Choose and document a conservative
threshold as an assumption; below it, ask one question or escalate. The
prototype can use deterministic example outputs instead of a live model.

### Laya/Jev/LLM decision

Do not host Laya or integrate Jev into the primary demo unless a small
labelled evaluation shows a meaningful advantage. The brief says both
external benchmark claims are not reproduced in this project.

For a real evaluation, prepare 100--300 hand-labelled scenarios
covering: - short ambiguous phrases; - English/Hinglish mixing; -
negation; - conflicting details; - missing state; -
urgent/human-required cases; - explicit request for a human.

Compare rules, a standard LLM with structured output, and Laya/Jev.
Score per-class precision/recall, urgent and human-required recall,
false/missed escalations, unsupported-claim rate, latency, cost, and
language-specific performance. Do not allow an average score to hide a
weak language or dangerous missed escalation.

------------------------------------------------------------------------

## 9. Application interfaces and event log

The following are illustrative prototype functions, not existing Cheerio
APIs:

``` ts
getTemplateStatus(templateId)
diagnoseTemplate(template, userMessage)
proposeCorrection(template, playbook)
applyApprovedChange(templateId, approvedOperation)
verifyTemplateStatus(templateId, expectedOutcome)
createSupportHandoff(caseFile)
appendAuditEvent(event)
```

### Permission boundary

-   Reads may be available for diagnosis, subject to real permissions in
    production.
-   Writes are narrow allowlisted operations.
-   The model never selects permissions or invokes account-changing
    tools directly.
-   Application code validates the operation, target, current state, and
    explicit confirmation.
-   If the permission check fails, explain the blocker and hand off.
-   In the prototype, `applyApprovedChange` only mutates local mock
    state and is visibly labelled simulated.

### Event shape

``` ts
type AuditEvent = {
  eventId: string;
  correlationId: string;
  caseId: string;
  timestamp: string;
  eventType:
    | "CASE_OPENED"
    | "STATE_READ"
    | "TRIAGED"
    | "DIAGNOSED"
    | "FIX_PROPOSED"
    | "FIX_DECLINED"
    | "USER_CONFIRMED"
    | "ACTION_SIMULATED"
    | "STATE_VERIFIED"
    | "HANDOFF_CREATED";
  outcome: string;
  sourceLabel: "MOCK";
  details: Record<string, unknown>;
};
```

Use one correlation ID per case. Block duplicate confirmation
submissions in the prototype. Store only information required for the
case; do not add unnecessary personal data to prompts or logs.

------------------------------------------------------------------------

## 10. Failure cases and acceptance tests

At minimum, implement and test the following. The final submission
should visibly demonstrate at least two failure paths.

  ---------------------------------------------------------------------------------------------------
  ID                      Scenario                                            Expected result
  ----------------------- --------------------------------------------------- -----------------------
  T1                      Known rejection reason                              Correct playbook and
                                                                              evidence shown

  T2                      User writes "template reject ho gaya bhai"          Original wording
                                                                              retained; known state
                                                                              drives diagnosis

  T3                      Missing/unclear reason code                         No invented cause;
                                                                              offer human review

  T4                      User declines proposed fix                          No state change; offer
                                                                              explanation or human

  T5                      User confirms proposed fix                          Only the confirmed
                                                                              operation is simulated

  T6                      State changes to pending                            Show submitted/pending,
                                                                              never approved

  T7                      State remains rejected after attempt                Show "Could not
                                                                              verify"; stop retries;
                                                                              create handoff

  T8                      User requests human                                 Immediate handoff; no
                                                                              bot loop

  T9                      Two failed attempts on same issue                   Stop and escalate

  T10                     Billing/refund/credit/security/identity/ownership   Human-led; evidence
                          request                                             only

  T11                     Insufficient permission                             Do not bypass; explain
                                                                              and hand off

  T12                     Conflicting or missing state                        Ask one short question
                                                                              only if safe; otherwise
                                                                              hand off

  T13                     Duplicate confirm action                            No duplicate simulated
                                                                              write/event

  T14                     Copy case summary                                   Summary contains
                                                                              required fields and no
                                                                              unsupported success
                                                                              claim

  T15                     Reset demo                                          Returns to known
                                                                              fixture; event history
                                                                              reset or explicitly
                                                                              starts a new case
  ---------------------------------------------------------------------------------------------------

### Acceptance checklist

-   [ ] S1--S5 click path works from a clean reset.
-   [ ] All three fixtures are reachable.
-   [ ] Proposed before/after difference is visible.
-   [ ] No write-like action happens before explicit confirmation.
-   [ ] A fresh state read drives the displayed outcome.
-   [ ] "Verified" appears only on a matching expected state.
-   [ ] Pending is not represented as approval.
-   [ ] At least two failure paths lead to S5.
-   [ ] Handoff includes the original user message and correlation ID.
-   [ ] Every mock/simulated value is labelled.
-   [ ] Manager view, if built, derives from the event log.
-   [ ] Four screenshots are captured.
-   [ ] The author can explain every design choice and has edited the
    final submission in their own voice.

------------------------------------------------------------------------

## 11. Implementation sequence for a two-day assignment

### Phase 0 --- Confirm constraints (30 minutes)

-   Confirm the required prototype format and submission link
    requirements.
-   Create a deliverables checklist.
-   Identify anything the assignment environment does not provide; mark
    it for mocking.
-   Do not start with a Telegram bot.

**Exit condition:** scope and deliverables are visible in a checklist.

### Phase 1 --- Fixture and flow (45--60 minutes)

-   Define three mock templates.
-   Define playbooks and state transitions.
-   Pick two failure paths to demonstrate.
-   Agree on precise semantics for verified/pending/failed.

**Exit condition:** fixture JSON and state-transition table are stable.

### Phase 2 --- Primary screens (2--3 hours)

-   Build S1--S5 with consistent layout and clear status labels.
-   Wire the primary happy path.
-   Make the confirmation boundary visually unmistakable.
-   Ensure screens show context rather than forcing a long chat
    interaction.

**Exit condition:** a reviewer can click from rejected template to
result without explanation.

### Phase 3 --- Failure handling and event history (1--2 hours)

-   Add failed verification and human-request paths.
-   Populate a case file from the event history.
-   Add correlation ID and duplicate-action prevention.
-   Add optional S6 only if the primary path is solid.

**Exit condition:** the failure path is as credible as the happy path.

### Phase 4 --- Test and polish (45--60 minutes)

-   Run T1--T15 as relevant.
-   Test with a non-technical-user mindset.
-   Remove claims that cannot be supported.
-   Capture S2, S3, S4, S5 screenshots.

**Exit condition:** screenshots tell a coherent story and no state
claims contradict the simulated state.

### Phase 5 --- Four-page submission (60--90 minutes)

Recommended structure: 1. Problem, persona, evidence labels, and
top-five issue hypotheses. 2. Alternatives, prioritization, chosen
scope, and "won't do." 3. Flow, architecture, safety, handoff, and
screenshot. 4. Metrics, provisional target/baseline plan, economics
assumptions, and next steps.

Keep the document decisive. Do not paste the research dossier into the
submission.

### Phase 6 --- Cost sheet, AI log, Loom (60--90 minutes)

-   Build the assumptions/cost sheet after the product scope is stable.
-   Record model/provider price sources and date checked.
-   Mark query volume, issue mix, resolution rate, token usage, hosting,
    support cost, and target values as assumptions unless measured.
-   Include a cost row for rules, standard LLM, Jev, and Laya; use
    "verify" where prices/access are uncertain.
-   Maintain an honest AI chat log, including rejected suggestions or
    corrections.
-   Optional Loom: 3--5 minutes; show the happy path, one failure path,
    architecture, and what is mocked.

The sequence can overlap, but do not let spreadsheet estimates or bot
integration block the working click path.

------------------------------------------------------------------------

## 12. Metrics and economics

### North Star

**Verified resolution without repeat contact within 72 hours, among
eligible in-scope issues.** Report human-only cases separately so the
system does not appear better by excluding difficult cases silently.

### Supporting metrics

1.  Median and 90th-percentile time to first useful diagnosis.
2.  Repeat-contact rate for the same issue within 72 hours.
3.  Safe completion and escalation quality: attempted fixes that pass
    verification, false-resolution rate, and missed-escalation rate.

### Baseline and target

Cheerio-specific ticket volume, issue ranking, resolution time, and
support cost are unknown unless the assignment supplies data. Measure a
baseline first. If a three-month number is required, the brief proposes
a **25% relative improvement in verified resolution** as a provisional
assumption, not a forecast.

### Spreadsheet structure

1.  **Assumptions:** businesses, queries/business/month, issue mix,
    eligible share, resolution by issue, human cost/ticket, model price,
    tokens, hosting.
2.  **Volume:** estimated monthly query volume for 5,000 businesses (or
    assignment-specified scale).
3.  **Cost per query/case:** model input/output, hosting, and human
    review.
4.  **Savings and break-even:** compare costs against human-only support
    with explicit assumptions.
5.  **Billing options:** priced recommendation, gross margin, and
    sensitivity to usage.
6.  **Decision-layer comparison:** rules, standard LLM, Jev, Laya;
    access/pricing/benchmark verification flags.
7.  **Audit:** monthly checks, owner, thresholds, and alerts.

Never invent a cost source or represent an assumption as a measured
result.

------------------------------------------------------------------------

## 13. Risk register

  -----------------------------------------------------------------------
  Risk                    Mitigation              Owner/check
  ----------------------- ----------------------- -----------------------
  Prototype appears to    Persistent              Design/build agent
  perform a real Meta     mock/simulation label;  
  operation               local-only state        
                          mutation                

  "Verified" is shown     Verify step compares    Build agent and test
  without state evidence  fresh state with        T6/T7
                          expected state          

  Model invents a         Rules for known codes;  T3
  rejection reason        unknown reason routes   
                          to handoff              

  Scope grows into a      Keep S1--S5 primary;    Product owner
  generic chatbot         reject unrelated        
                          surfaces                

  Decision API is added   Keep swappable;         Evaluation owner
  without value           evaluate against rules  
                          and structured LLM      

  Cost sheet implies      Label all assumptions;  Finance-sheet owner
  false precision         cite dated price        
                          sources                 

  Fake manager analytics  Derive from event log   Build agent
                          and label mock counts   

  User must repeat their  Preserve original       T14
  issue at handoff        message and all checks  

  Sensitive data is       Minimize                Design/build agent
  collected unnecessarily stored/prompted data    

  Fully AI-written        User reviews, edits,    Human author
  assignment undermines   and can defend each     
  authorship              decision; AI log is     
                          honest                  
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 14. Decisions still open

Do not block the prototype on these unless they change the core flow.

1.  Does Cheerio provide actual ticket data, or must issue ranking
    remain a hypothesis?
2.  Is a design prototype link mandatory, or is a bot link acceptable?
    The brief says design prototype first and bot last.
3.  Which model/provider will the cost sheet use, and what is the dated
    source for pricing?
4.  Which languages beyond English/Hinglish can be reviewed competently?
5.  Can the assignment provide any official Cheerio/Meta reference
    material to validate mock reason codes and proposed corrections?
6.  Should the optional manager view be built, or is time better spent
    improving the handoff/failure path?

Default if unanswered: build the design prototype, mock all unavailable
external state, use English/Hinglish only, and prioritize S1--S5 over S6
or a bot.

------------------------------------------------------------------------

## 15. Handoff instructions for the next AI agent

You are the implementation/design agent for **Cheerio Resolve**. Your
job is to turn this plan into a credible clickable prototype and
supporting assignment artifacts, not to reinvent the product strategy.

### First actions

1.  Read this handoff and the original 17-page design brief.
2.  Inspect the existing workspace/repository before creating files.
    Reuse any working prototype, fixtures, or design system already
    present.
3.  Report the existing files, stack, and any blockers before changing
    architecture.
4.  Create a task checklist tied to the phases above.
5.  Implement the S1--S5 path and two failure paths before optional
    features.
6.  Keep a short decision log. Any deviation must cite the affected D/G
    ID and explain why.

### Hard constraints

-   Follow G1--G15, especially explicit confirmation, least privilege,
    mock labels, truthful verification, and immediate human escalation
    when required.
-   Do not claim access to real Cheerio/Meta systems unless credentials
    and APIs are explicitly available.
-   Do not silently make up a reason code, live status, ticket
    distribution, model benchmark, price, or savings figure.
-   Do not build a general chatbot, new dashboard, or bot before the
    primary prototype works.
-   Do not integrate Laya/Jev merely to show technology. Keep the
    decision layer replaceable.
-   Do not say "approved" when the simulated or real status is pending.
-   Keep the author's own reasoning visible; provide drafts for review,
    not an unreviewed fully AI-authored final submission.

### Required outputs from the next agent

1.  Clickable prototype link or exact local project path.
2.  Four screenshots: S2, S3, S4, S5.
3.  Concise architecture/data-flow diagram.
4.  Updated four-page assignment draft with evidence labels.
5.  Cost spreadsheet with assumptions and source dates.
6.  Honest AI interaction log.
7.  Optional 3--5 minute Loom plan or recording.
8.  A short final report listing implemented features, mocked features,
    test results, open risks, and deviations from this plan.

### Definition of done

A non-technical reviewer can start from a rejected template, understand
a grounded diagnosis, inspect a proposed change, explicitly approve or
decline, see an accurately labelled simulated outcome, and---if the
outcome is uncertain or fails---open a complete case file without
repeating the original problem.

The project is not done merely because screens look polished. The click
path, failure handling, and truthful status semantics must work.

------------------------------------------------------------------------

## 16. Source and provenance note

This plan is derived primarily from the user's attached *Cheerio
Resolve: Design Brief for AI Agent Decisions*, dated 13 October 2026.
The brief's documented/reported/hypothesis/assumption distinctions
should be preserved in the final submission.

The project/event descriptions and model details in the original brief
were not independently re-verified as part of this implementation-plan
draft. Where a claim or price is needed in the final submission, reopen
the original source and confirm the current details. Treat external
vendor benchmarks as vendor-reported unless independently reproduced.

**Final instruction:** implement the smallest complete and honest
journey first. Add sophistication only when it improves user success,
safety, or evaluation quality.
