# Cheerio Assignment A — Research & Decision Dossier
**Living source of truth | Last consolidated: 13 October 2026**

> **Purpose:** Preserve the research, product ideas, comparable products, reasoning, decisions, evidence caveats, and next steps for Cheerio Assignment A so the work can continue even if the original chat is lost.
>
> **Status:** This is a working research dossier, not the final 4-page assignment submission. It deliberately keeps useful alternatives and research history, while making one clear recommendation.

---

## 0. Executive decision — what we should build

### The recommendation

Build **Cheerio Resolve** (working name): a **context-aware setup and recovery flow** that helps a non-technical Cheerio customer understand and fix a WhatsApp setup problem, beginning with **one complete rejected-template journey**.

The primary prototype should be a **minimal in-product template/setup screen with a prominent “Why isn’t this working?” action**, not a generic chatbot. A WhatsApp-like chat can be used as the lightweight conversational entry or shown as a secondary entry point, but the main clickable journey must make the product state, proposed fix, confirmation, and verification visible.

**Product promise:** *Tell us what went wrong. Cheerio checks the relevant state, explains the reason in plain language, proposes the next safe action, and verifies the result—or hands the case to a human with the evidence already collected.*

This is the most concrete solution that combines the strongest research patterns without turning the assignment into a broad AI-agent platform.

### Why this solution

1. **It solves a real, bounded job:** get a blocked WhatsApp template back on the path to approval.
2. **It acts on context, not generic advice:** show the relevant template status/reason code and explain it.
3. **It removes unnecessary work:** one obvious action, one explanation, one proposed change—not a setup wizard or another dashboard.
4. **It is safer than an autonomous chatbot:** deterministic checks, allowlisted actions, explicit confirmation before changes, and post-action verification.
5. **It is buildable in two days:** mock the state and show one polished end-to-end scenario.
6. **It leaves a sensible expansion path:** the same resolution engine could later handle number/WABA setup, campaign delivery, chatbot flow issues, and integration errors.
7. **It fits Cheerio itself:** dogfood support inside the product where the failure happens; later, offer a WhatsApp entry that opens a prefilled resolution page.

### What we are not building

- Not a general-purpose “AI employee.”
- Not a generic support chatbot that only returns documentation.
- Not a new standalone SaaS dashboard with onboarding of its own.
- Not a full autonomous agent with unrestricted access to a customer's account.
- Not a complex typed-decision-model benchmark project (Jev/Laya) as the core product.
- Not an all-issues-at-once prototype.
- Not a promise that every case is automatically resolved.

### Important distinction

The assignment asks for a **scalable support approach**, not necessarily a fully working production integration. The prototype can use mocked Cheerio/Meta state, but must clearly demonstrate how a real implementation would check state, gate actions, verify results, and escalate safely.

---

## 1. Assignment frame and constraints

The working brief/context recovered from the earlier work:

- **Goal:** propose one approach for scaling Cheerio support for non-technical users.
- **Time constraint:** approximately two days.
- **Submission constraint:** approximately four pages, plus a clickable prototype and 3–4 screenshots.
- **Expected content:** top five issues, alternatives and prioritization, selected solution and scope, human handoff, three metrics plus a North Star and three-month target, clickable prototype, one end-to-end scenario, edge cases, and prototype link/screenshots.
- **Audience assumption:** product/business reviewers, not only engineers.
- **Research preference:** comprehensive external research, including company docs, startup products, and Reddit/community experiences; distinguish reliable implementation evidence from vendor claims and anecdotes.

**Do not let the research dossier leak wholesale into the four-page submission.** Use this file as the knowledge base; the submission should be decisive and concise.

---

## 2. Problem framing

### The user job

A non-technical business owner or campaign operator is trying to launch or run a WhatsApp campaign through Cheerio. Something in the setup or workflow fails. They do not necessarily know whether the cause is Meta policy, number verification, a template category, a messaging limit, a workflow condition, or an integration.

Their real job is not “get an AI answer.” It is:

> **Get back to sending/operating without wasting time, guessing at settings, or waiting for support to reconstruct the problem.**

### Primary persona: the solo operator

A working hypothesis combining two overlapping personas:
- Owner/operator of a small business.
- Marketing/CRM/campaign operator who is hands-on but not deeply technical.

Likely needs:
- Fix the problem quickly.
- Understand the cause in familiar language.
- Avoid breaking a live campaign.
- Know when a person needs to step in.
- Use familiar interaction patterns and not learn a new support system.

### Secondary persona: accountable manager

A CX/CRM/operations manager who wants:
- Fewer repeated tickets.
- Visibility into what the assistant checked and changed.
- Auditability, permissions, and predictable escalation.
- Confidence that a ticket was not marked solved merely because a message was sent.

### Anti-persona for a chat-first solution: the implementer

An agency, freelancer, or developer debugging APIs/webhooks may prefer:
- Exact error codes and payloads.
- Logs, docs, and technical diagnostics.
- Clear API behavior instead of conversational reassurance.

**Implication:** do not make a conversational bot the only support surface. For the chosen first journey, show the underlying template state and exact reason, not only chat bubbles.

### User psychology: evidence vs hypothesis

**Reported in prior research, but not necessarily Cheerio-specific:**
- WhatsApp is an important business channel in India; widely cited usage figures are directional and vary by source.
- Public service research reports that self-service often fails because people cannot find relevant help; some users abandon the issue when self-service fails.
- Public reviews of business messaging providers include praise for guided setup calls and complaints about slow or unclear support.
- Users often search third-party sources before contacting a company.

**Reasonable hypotheses to test, not established Cheerio facts:**
- Users fear changing settings because they might break a live campaign.
- Rejected templates create deadline pressure.
- Users describe issues in short, ambiguous phrases such as “nahi ho raha.”
- Users want a human for high-impact or account-specific issues.
- A visible explanation and exact proposed fix will create more trust than a generic bot response.

These hypotheses should be validated against Cheerio ticket data or a small set of user interviews before being presented as facts.

---

## 3. Top five support issues to prioritize

These are **hypotheses to validate with a ticket audit**, not a proven Cheerio ticket-volume ranking.

| Rank | Candidate issue | Why it matters | What a first version could do |
|---|---|---|---|
| 1 | WhatsApp template rejected, pending, or reclassified | Blocks the next campaign step; many failure reasons are structured or policy-related | Read status/reason code; explain it; lint text/category/variables; suggest a corrected version; confirm before resubmission; verify state |
| 2 | Number/WABA connection, display name, or verification | Setup depends on several external approval/configuration states that are hard for a non-expert to distinguish | Run read-only checks; show exactly which prerequisite is missing; guide the next step; escalate if Meta review is required |
| 3 | Campaign not delivering | Could involve opt-in, quality rating, messaging limits, template state, or the 24-hour messaging window | Check available delivery and account state; narrow down the likely cause; show the next diagnostic step; avoid claiming a cause without evidence |
| 4 | Chatbot/workflow flow not triggering | The user may not know whether a trigger, condition, channel, or flow is broken | Inspect configured trigger/conditions and recent execution state; show the failed step; recommend a safe correction |
| 5 | Integration/webhook/API errors | Important for technical users, but may need a different surface from the non-technical flow | Surface exact error, request/event ID, timestamp, and retry status; give a technical handoff rather than forcing chat |

**Billing disputes:** keep human-led in the first version. They may involve money, policy, and account-specific exceptions; explain available evidence but do not autonomously decide credits/refunds.

**Validation step:** sample recent support tickets, group by issue, measure volume/repeat contact/time-to-resolution, and replace this hypothesized ranking with observed frequency and cost.

---

## 4. Product concept and prototype scope

### Working name

**Cheerio Resolve** — a context-aware setup and recovery experience.

Name is provisional. The product idea matters more than the name.

### Primary experience

A user is on a WhatsApp template page and sees a rejected template. The page has a clear action:

**“Why isn’t this working?”**

Clicking it opens a compact diagnosis panel that:
1. Reads the current template status and reason code (mocked in the prototype).
2. Explains the issue in plain English/Hinglish.
3. Shows the exact part of the template that needs attention.
4. Proposes a corrected version and shows before/after.
5. Requires explicit confirmation before submitting/changing anything.
6. Checks the resulting state.
7. Shows either a verified outcome or a transparent failure/human handoff.

### One end-to-end scenario

**User:** “Template reject ho gaya bhai.”

**Prototype state:** a utility template contains promotional wording or has a category mismatch. The mocked state includes the rejection reason, current category, and current template text.

**Flow:**
1. **Entry:** show the rejected template in a plausible Cheerio-like screen; click “Why isn’t this working?”
2. **Diagnose:** “This template was rejected because the content looks promotional, but it is submitted as Utility.” Show the actual/mock reason code and explain what it means.
3. **Fix:** present a revised version or the appropriate category. Highlight what changed and why. Do not silently rewrite or resubmit.
4. **Confirm:** user clicks “Review and resubmit” / “Confirm change.” The action is explicit.
5. **Verify:** simulate a post-action state check. If the mocked status changes to pending/approved, report exactly that state. If not, say it is still unresolved.
6. **Escalate:** if the state cannot be checked or the fix fails, offer human support with transcript, template ID, rejection code, proposed change, checks run, and action attempted.

**Critical copy rule:** never say “approved” or “fixed” just because the user clicked confirm. Only say “verified” if the state check confirms the expected postcondition. If the prototype uses a simulated outcome, label it as a simulated state.

### Mock 2–3 realistic variants

- Promotional wording in a Utility template.
- Invalid/misformatted variables.
- Category mismatch or another known rejection reason.

Only one variant needs to be the polished main path. The others can demonstrate that the logic is reusable.

### Optional secondary entry point

A WhatsApp-like chat can accept a short informal description and return a concise diagnosis plus a deep link to a prefilled resolution page. This preserves the “meet users where they are” idea without making chat the whole product.

For the assignment, avoid spending time implementing two separate products. The in-product recovery panel is the primary demo; WhatsApp is an extension/secondary entry.

### Prevention layer: template preflight/linter

A useful second phase is a pre-submit checker that catches predictable template issues before submission:
- Category/content mismatch.
- Variable format/placement problems.
- Missing required fields or known formatting problems.
- Plain-language explanation of each warning.

This is a **prevention layer**, not the core prototype. It reduces avoidable failures before a support ticket exists. It must not claim to predict Meta approval with certainty.

---

## 5. Proposed solution architecture

The core is a small, shared **read → diagnose → propose → authorize → act → verify → escalate** engine. The UI/channel is an adapter, not the business logic itself.

### Logical flow

1. **Input/channel adapter**
   - In-product button/panel first.
   - Optional WhatsApp/chat entry later.
   - Preserve original user wording and language.

2. **Intent interpretation**
   - Map informal wording to a structured issue category.
   - Ask one clarifying question only when required.
   - Use rules for known phrases/codes and a lightweight model for ambiguous language.
   - Do not make promises about multiple regional languages until the paths are reviewed by fluent speakers.

3. **Context/state retrieval**
   - Read relevant template/account/workflow state using authorized APIs.
   - In prototype: use explicit mocked state fixtures.
   - Do not hallucinate state from the user’s description.

4. **Deterministic diagnosis**
   - Use reason-code mappings, validation rules, and product-specific policy.
   - Return evidence and a suggested next step.
   - If authoritative state is unavailable, say so.

5. **Action proposal**
   - Use an allowlist of narrow operations.
   - Show proposed changes and why they are needed.
   - Require confirmation before writes or live workflow changes.
   - Never expose arbitrary model-generated tool calls.

6. **Execution**
   - Application code enforces permissions and performs the action.
   - Keep action IDs and audit events.

7. **Verification**
   - Read the resulting state and compare it to a defined postcondition.
   - A response being sent is not resolution.
   - If verification fails, stop blind retries.

8. **Human handoff**
   - Escalate with the investigation already attached.
   - Human should not need to ask the user to repeat the whole story.

### Human handoff payload

- Account/workspace and template/workflow ID.
- Original user message and language.
- Structured issue category and urgency.
- Current state and relevant reason code.
- Checks run and their results.
- Proposed fix and whether it was accepted.
- Actions attempted and their results.
- Verification outcome.
- Recommended next step.
- Transcript and timestamps.

### Escalate immediately when

- User asks for a human.
- Billing/refund/financial exception is involved.
- Security, identity, access, or ownership changes are required.
- Proposed action is destructive or could materially disrupt a live campaign.
- Policy is ambiguous or state cannot be authoritatively checked.
- Repeated fixes fail.
- The same issue remains after a verified attempt.

### Technology stance

For this assignment, **do not lead with a model-stack decision**. A conventional LLM plus deterministic code may be sufficient. Use a typed decision layer (e.g. Jev or Laya) only if a labelled benchmark shows a meaningful advantage in accuracy, latency, cost, or operational simplicity.

Reasons not to overbuild:
- The decision-model ecosystem is new and its reported benchmarks are not a guarantee of performance on Cheerio support.
- Self-hosting a tiny classifier introduces packaging, monitoring, data, and evaluation work.
- Token costs for simple classification/explanation may be small compared with the cost of building and maintaining a specialized decision service.
- Negation and mixed-language input are exactly where a classifier must be tested, not assumed to work.

**If implementation were real:** start with rules for known codes, a standard model for ambiguous phrasing, schemas for every tool, and an evaluation set. Keep model output out of the permission boundary.

---

## 6. Alternatives considered and decision

| Approach | Benefit | Risk / limitation | Decision |
|---|---|---|---|
| 1. Fast Resolution Router | Checks real state, identifies issue, proposes safe next action, verifies | Needs state/API access; easy to over-scope | **Core solution** |
| 2. Regional-language guided resolution | Lower friction for non-technical users; one question at a time | Menus can be rigid; language quality can fail | **Borrow UX principles**; start with English/Hinglish and validate other languages |
| 3. Agent-native Resolution API/MCP | Reusable safe actions for other agents/channels | Too infrastructural as the headline product; does not itself solve the user’s immediate problem | **Future implementation pattern** |
| 4. Support Reliability Loop | Safe fallback, better human handling, learning from failures | Less compelling if presented only as internal tooling | **Build in from day one** via handoff/evaluation |
| 5. Standalone template linter | Prevents known failures before submission | Narrow; does not help with other setup issues | **Phase 2 prevention layer** |
| 6. Pure WhatsApp bot | Meets users in a familiar channel | May hide product state; risks being just another chatbot | Secondary entry only |
| 7. Generic help chatbot / broad AI agent | Easy to describe and demo | Generic answers, no reliable state, unclear action boundaries | Reject |

**Decision in one line:** a single embedded recovery journey, deterministic-first and verification-backed; conversational language support is a thin interface, not the product itself.

---

## 7. Research landscape — products and transferable implementation patterns

This is not a claim that every product below is a direct Cheerio competitor. They solve adjacent problems; the goal is to identify implementation patterns transferable to this assignment.

**Evidence labels**
- **Documented:** company/product documentation or a published engineering account describes the behavior/pattern.
- **Company-reported:** a company reports a metric; treat it as directional unless independently audited.
- **Community anecdote:** Reddit/social/community observations; useful for hypotheses, not representative statistics.
- **Inference:** our proposed transfer to Cheerio; must be validated.

### Highest-value references for this solution

| Product / reference | What it demonstrates | Transfer to Cheerio | Evidence caveat |
|---|---|---|---|
| **Shopify Sidekick** | Contextual assistant inside the merchant’s existing product; narrow actions, permission boundaries, confirmation before changes | Put “Why isn’t this working?” beside the failed setup; propose actions in context and preserve user control | Product documentation establishes patterns, not Cheerio outcomes |
| **Intercom Fin / Procedures** | Support agent follows defined procedures, uses knowledge/tools, supports approval checkpoints and escalation | Treat common issues as tested procedures rather than free-form improvisation; simulate complete conversations before launch | Vendor product docs; claims of effectiveness need independent validation |
| **Apify WhatsApp Template Validator** | Narrow, deterministic pre-submit validation plus optional AI rewriting | Add a template preflight linter to prevent predictable rejection tickets | Product example validates feasibility, not exact Cheerio issue prevalence |
| **Uber COTA** | Classifies tickets and recommends responses to human agents; published account describes staged ML evolution | Start with agent-assist for ambiguous/high-risk cases; use automation to prepare a better handoff before full autonomy | Uber reported over 10% resolution-time reduction for the English first version; not a guaranteed transferable result |
| **Zomato Nugget** | Customer support tooling/product used across Zomato/Blinkit/Hyperpure; WhatsApp and voice are part of the product story | Relevant India-scale analogue; automate bounded intents and keep escalation | Public scale/resolution figures are company-reported, not independently audited |
| **Meesho voice bot** | Hindi/English voice support at high volume for bounded customer intents | Keep automation narrow and grounded in known state; local language is valuable where quality can be validated | Company-reported figures; domain is narrower than all Cheerio support |
| **n8n** | Workflow nodes, deterministic orchestration, and human approval gates | Make checks/actions explicit, inspectable, and interruptible | Platform pattern; not a proof of support resolution |
| **Rasa CALM** | LLM interprets dialogue while code-defined flows retain control of business logic | Separate language understanding from the deterministic recovery procedure | Product architecture pattern; implementation choices depend on team |
| **Helpfeel** | Maps varied user wording to support knowledge | Translate user phrasing into the right issue category without requiring official terminology | Product positioning; validate on Cheerio wording |
| **Amazon Seller Assistant** | Contextual assistant within Seller Central, supports questions and seller-permitted actions | Keep support in the user’s work context and ask permission for impactful actions | Public product descriptions; not a direct template-recovery study |
| **OpenClaw / Instinct** | Messaging-channel entry can be separated from the agent runtime and tools | Treat WhatsApp as a channel adapter; reuse the same recovery engine in web/chat/API | Community/startup implementations vary in maturity and safety |
| **Actuity (actuity.tech)** | Public URL scan with no signup, evidence-backed site/agent-readiness diagnosis, optional bounded task, then specific fixes/re-checks | Strong analogy for “give me a useful result first”: inspect the relevant asset, show evidence, suggest the smallest fix, verify again | Early-stage product; its own terms describe a founder-run operation; do not infer market scale |
| **PayGate / x402** | API-first payment/capability pattern where a client can request a capability and satisfy a payment challenge without a conventional account-heavy consumer flow | Think in terms of a direct outcome and a narrow capability contract; hide unnecessary setup when it is not needed | ETHMumbai project is a prototype/project; x402 standard metrics are live site counters, not audited |
| **Vercel Agent Tools / MCP** | Integrations expose bounded actions; platform can handle authentication/configuration for tools | Later, expose small, well-described recovery actions for other agents rather than requiring browser clicking | Platform-specific implementation; do not assume all auth is automatic |
| **Zapier MCP** | Large integration catalogue exposed through a common interface; setup/credentials are handled by an integration platform | Make the capability easy for an agent to discover/use, but keep permissions explicit | App/action counts are vendor catalogue figures |
| **Arcade** | Agent-tool authentication, user tokens, OAuth, and governance | If external agents are added later, identity and permissions need a first-class design | Vendor claims; architecture is relevant, not required for this prototype |
| **A2A protocol** | Agent Cards describe agent identity/capabilities/skills/endpoints/auth; task messaging supports delegation | Future agents should be able to discover a safe recovery capability without navigating a human dashboard | Protocol standard; does not mean agent-to-agent usage is already a Cheerio requirement |
| **Stripe onboarding (historical case write-up)** | Segmented onboarding and tailored checklists; research led to adding “skip for now” for users who did not want the guided path | Ask one useful question only if it changes the experience; provide an escape hatch and do not force personalization | Secondary case-study source, not a current official Stripe experiment report |
| **Intercom Fin Agent API** | A support agent can be embedded as a tool or own a conversation with a defined handoff contract | Future integrations should clarify which agent owns the conversation and when it hands back | Product docs, not a requirement for this assignment |
| **Dify / Coze** | Visual workflow/agent builders with tools and controlled workflow steps | Useful for rapid prototyping or orchestrating bounded tasks, but not a reason to expose workflow complexity to customers | Platform capability is documented; not evidence that a specific workflow resolves Cheerio tickets |
| **Jira Service Management** | Links repetitive tickets/knowledge to incidents and engineering context | Cluster repeated failures and route systemic bugs to product/engineering rather than treating each as a one-off | General service-management pattern |
| **Parlant / GoRules ZEN** | Explicit business guidelines, rule tables, and auditable decisions | Keep policy gates explicit and reviewable by product/support | Tool capabilities vary; not required in the first build |
| **Exora (our own product idea)** | URL input → competitive analysis/outcome with little onboarding | Lead with an outcome, not a setup wizard; give value from the user’s supplied context | Our own product philosophy, not external evidence |
| **Karthik’s implementation (reference from our discussion)** | User-centric, low-friction onboarding (exact product/implementation details are not fully captured here) | Keep onboarding minimal and oriented around the user’s job | Do not invent details not present in the saved context |
| **ETHMumbai PayGATE** | Agent-first API/capability concept around x402 | Let an agent call a capability directly when appropriate; don’t force dashboard configuration for every use | Project-stage implementation; provider-side dashboard may still exist |
| **Exa (external product; not Exora)** | Search/research API | A possible research primitive for an Exora-like product, but not the same product as the user’s Exora | Keep the names separate |

### Broader regional landscape from earlier research

The earlier landscape looked beyond direct customer support products and included:
- **United States:** Instinct, OpenClaw, Shopify Sidekick, Uber COTA, Intercom Fin, Amazon Seller Assistant.
- **Europe:** n8n, Dust, Dify, Intercom Fin Agent API.
- **China:** Coze / Coze Studio workflows and plugins.
- **Singapore:** SleekFlow.
- **India:** Zomato Nugget, Meesho voice bot, Haptik/Interakt, Uniqor, SALIQ, SMSLocal, MyOperator.
- **Japan:** PKSHA Technology and Helpfeel.
- **Agent infrastructure:** Vercel Agent Tools, Zapier MCP, Arcade, A2A, Stagehand, Browserbase.
- **Other workflow/support references:** Jira Service Management, Rasa CALM, Parlant, GoRules ZEN, Apify template validator.

The purpose of this landscape is **pattern transfer**, not a claim that all these products are equally relevant or have independently proven outcomes.

---

## 8. Product philosophy connecting the research

Three kinds of simplicity emerged from the Exora, Actuity, PayGate, and agent-infrastructure discussion:

### A. User simplicity
The user supplies a goal or an asset, and the product gets to a useful result quickly.
- Do not force a long setup wizard before value.
- Ask only the questions needed to choose the right path.
- Offer a clear escape hatch.
- Personalization should be optional and useful, not a mandatory survey.

### B. Developer/operator simplicity
The system owns complexity that users should not have to manage.
- Use known product state and APIs.
- Expose narrow operations with schemas.
- Keep policy, permissions, and verification in code.
- Provide evidence and a clear handoff when the system cannot safely finish.

### C. Agent simplicity
A future agent should be able to discover and invoke a bounded capability without pretending to be a human navigating a dashboard.
- Give capabilities clear names, schemas, auth requirements, and outcomes.
- Separate channel/UI from the resolution engine.
- Do not require MCP/A2A/API infrastructure to be part of the initial customer-facing pitch.
- Agent access must still enforce identity, least privilege, rate limits, audit logs, and approval boundaries.

**Synthesis for Cheerio:** user-first surface, deterministic core, and future-compatible capability interfaces. Do not make “agent-first” an excuse to ignore the non-technical person who needs the fix today.

---

## 9. What the research does and does not establish

### Supported directional conclusions

- Contextual support is stronger than generic advice when the system can access reliable product state.
- Narrow actions and explicit permissions are safer than unconstrained action-taking.
- A response should not be considered a resolution until the result is checked.
- Human handoff should include the investigation already performed.
- Known validation errors can often be caught before the user submits or files a ticket.
- Low-friction onboarding and direct outcomes are useful design hypotheses.

### Not established yet

- The exact frequency/rank of Cheerio’s top five issues.
- Whether WhatsApp entry beats in-product entry for Cheerio’s actual users.
- What share of Cheerio tickets can safely be automated.
- Whether Hindi/Hinglish support is accurate enough for policy-sensitive diagnosis.
- Any specific autonomous-resolution target for month three.
- Cheerio’s current support cost, ticket volume, resolution time, or repeat-contact baseline.
- Whether Jev/Laya or a standard LLM is best for the issue classification step.
- Whether users will trust automated fixes without a human.

### Evidence hygiene

- Treat company-published metrics as **company-reported**, not independent fact.
- Treat Reddit and social posts as **qualitative anecdotes**, not population estimates.
- Treat broad customer-support research as directional unless the population and method match Cheerio.
- Do not present inferred user psychology as validated research.
- Do not reuse any product’s advertised resolution rate as Cheerio’s target.
- Record source URLs and access dates when finalizing the external research appendix.

---

## 10. Measurement plan

### North Star

**Verified resolution rate without repeat contact within 72 hours, among eligible in-scope support issues.**

Definition:
- Denominator: eligible issues that enter the recovery flow.
- Numerator: issues where the system’s postcondition is verified and the customer does not re-contact support about the same issue within 72 hours.
- Exclude cases that are explicitly human-only from the automation success denominator, but report them separately so the team does not hide difficult cases.
- Track issue mix and language; aggregate rates can be misleading if the issue mix changes.

This is a proposed metric definition, not an existing Cheerio baseline.

### Three supporting metrics

1. **Time to first useful diagnosis:** median and p90 time from entry to evidence-backed diagnosis/next step.
2. **Repeat-contact / re-open rate:** share of eligible cases that return about the same issue within 72 hours.
3. **Safe completion and escalation quality:** share of attempted fixes that pass post-action verification, plus false-resolution and missed-escalation rates. Report the components separately rather than hiding safety failures in one blended number.

Optional operational guardrails:
- Human handoff rate and time to human response.
- Cost per verified resolution vs current human-supported baseline.
- Incorrect diagnosis rate by issue and language.
- Percentage of cases where state could not be checked.
- User abandonment before a useful diagnosis.

### Three-month target

Do **not** claim a precise autonomous-resolution percentage before a baseline exists. The prior research draft floated a 25–35% share of in-scope tickets by month three, but that was an estimate, not an evidence-backed forecast.

Better assignment wording:
1. First measure the baseline and establish the eligible issue mix.
2. Pilot the rejected-template path and compare against current support.
3. Set a three-month improvement target after the first two weeks of observed data.
4. If the brief requires a numerical target now, label it **provisional** and tie it to a measurable baseline (for example, a relative improvement in verified resolution rather than an arbitrary autonomous-resolution rate).

An earlier draft suggested a **25% relative improvement** as a provisional target. Keep it clearly labelled as a target hypothesis, not a measured result.

---

## 11. Evaluation and learning plan

### Before a pilot
- Audit a representative sample of Cheerio support tickets.
- Label issue category, language, urgency, current resolution, time-to-resolution, repeat contact, and whether authoritative state was available.
- Select the first issue based on frequency × customer impact × diagnosability × safety × prototype feasibility.

### Prototype test set
Start with a small hand-labelled set of **100–300 scenarios** if an actual system is built. Include:
- Known template rejection codes.
- Ambiguous short descriptions.
- Mixed English/Hinglish.
- Negation (“not working,” “don’t change this,” “nahi ho raha”).
- Conflicting information.
- Missing state.
- Failed fix and retry.
- Human-required/billing/security cases.
- User explicitly asks for a human.
- Multiple issues in one message.

These are proposed evaluation sizes, not existing test results.

### Metrics for model/routing evaluation
- Macro-F1 or per-class precision/recall for issue routing.
- Recall on urgent and human-required cases.
- False escalation and missed escalation.
- Unsupported-claim rate.
- Post-action verification success.
- p50/p95 latency and cost per case.
- Repeat contact and verified resolution.
- Language-stratified results; do not average away weak performance in one language.

### Data sources mentioned in prior research
- Kaggle Customer Support on Twitter — useful to inspect conversation patterns, but old, English-heavy, B2C, and not a substitute for Cheerio-specific tickets. Check licence constraints before commercial use.
- Bitext customer-support dataset — possible exploratory training/evaluation resource; verify provenance, licence, and domain match.
- Structured customer-support ticket datasets — useful for operational analysis only after labels and provenance are checked.
- Synthetic Hindi/Hinglish examples — useful for coverage, but fluent reviewers should validate labels and expected paths.
- JourneyBench (EACL Industry 2026) — potentially relevant for evaluating multi-step support journeys; inspect the paper before using its results.

No external dataset establishes Cheerio’s actual issue distribution.

---

## 12. Edge cases the prototype/submission should acknowledge

| Edge case | Required behavior |
|---|---|
| The rejection reason is missing or unclear | Explain that the system cannot verify the cause; offer human review |
| The system suggests a change but cannot submit it | Provide copyable proposed text and state that no change was made |
| User declines the fix | Keep the original unchanged; offer explanation or human handoff |
| The proposed fix could alter live messaging behavior | Require explicit confirmation and show before/after |
| The post-action state does not change | Do not say “fixed”; stop retrying and escalate with evidence |
| Multiple possible causes | Ask one targeted question or run independent read-only checks; avoid guessing |
| User asks about billing/refund | Human-led path; provide evidence and route to support |
| Account permissions are insufficient | Do not bypass permissions; explain the blocker and hand off |
| User asks for a human | Escalate immediately; do not trap them in a bot loop |
| Language/intent is uncertain | Ask a short clarifying question and preserve original wording |
| External Meta review is pending | Explain that Cheerio cannot guarantee the external review outcome; show current status |
| Repeated failure or potential account restriction | Stop automated attempts and escalate |

---

## 13. Prototype build checklist (two-day scope)

### Day 1 — decision and main flow
- [ ] Create a plausible Cheerio-like template screen.
- [ ] Add one rejected template and a realistic reason code/state.
- [ ] Add “Why isn’t this working?”
- [ ] Show evidence-backed explanation.
- [ ] Show proposed correction and before/after.
- [ ] Add explicit confirmation.
- [ ] Show a verified success state and a failure/escalation state.
- [ ] Mock 2–3 variants behind the same interaction if time permits.

### Day 2 — polish and submission evidence
- [ ] Make the click path work end to end.
- [ ] Include a human handoff with context already filled.
- [ ] Include at least one safety/edge case.
- [ ] Capture 3–4 clear screenshots.
- [ ] Test the prototype as if you are a non-technical operator.
- [ ] Ensure no screen claims a real Meta approval if it is only mocked.
- [ ] Write the four-page narrative from the decision in Section 0, not from the full research landscape.
- [ ] Include the clickable link and state what is mocked.

### Screenshots to capture
1. Template screen with the rejected state and “Why isn’t this working?”
2. Diagnosis with evidence/reason code and plain-language explanation.
3. Proposed correction with before/after and confirmation.
4. Verified outcome or human handoff with context.

---

## 14. Draft four-page submission structure

**Page 1 — Problem and prioritization**
- User job and primary persona.
- Top five issue hypotheses and how they will be validated.
- Why template rejection is the first prototype.

**Page 2 — Chosen solution**
- Cheerio Resolve.
- One flow diagram: read → diagnose → propose → confirm → act → verify/escalate.
- Why it beats a generic chatbot or standalone dashboard.

**Page 3 — Prototype and reliability**
- Screenshots / clickable link.
- One end-to-end scenario.
- Edge cases and human handoff.

**Page 4 — Metrics, rollout, and trade-offs**
- North Star and three supporting metrics.
- Baseline-first three-month target.
- Safety and implementation trade-offs.
- Key research references and evidence caveats.

---

## 15. Research bibliography and retrieval map

The original work produced several separate documents. Keep them; this dossier is the index and decision layer, not a replacement for all source material.

### Prior documents to preserve
- `00_comparison_and_recommendation.docx` — four approaches and recommendation.
- `01_fast_resolution_router.docx` — architecture, UX, handoff, evaluation, prototype screens.
- `strategy.md` — broad critique, priority issue hypotheses, metrics, risks, and implementation decision.
- `strategy (1).md` — in-product “Why isn’t this working?” and WhatsApp-entry options.
- `strategy (2).md` — user/persona/psychology and workaround research.
- `strategy (3).md` — WhatsApp-native product landscape.
- `strategy (4).md` — global builder landscape.
- `strategy (5).md` — product-shaped prototype recommendation.
- `cheerio_assignment_a_research.xlsx` — research comparison spreadsheet (check that its rows and links are intact when reopened).
- Additional source documents on implementation pipelines and product landscape from the same research session.

### Important external references already identified
- Shopify Sidekick: https://www.shopify.com/sidekick and Shopify developer documentation for Sidekick extensions.
- Intercom Fin: https://www.intercom.com/fin and Intercom Help documentation for Procedures/Fin Agent API.
- Apify WhatsApp Template Validator: search the Apify Store for the WhatsApp Template Validator; verify the current exact listing URL before final citation.
- Uber COTA: Uber engineering/blog material describing Customer Obsession Ticket Assistant and the first-version English resolution-time result.
- Zomato Nugget: https://nugget.zomato.com/ (verify current product/metric claims on the site).
- OpenClaw: https://github.com/openclaw/openclaw (verify exact repository URL before citing if changed).
- Rasa: https://rasa.com/docs/ (CALM documentation).
- n8n: https://n8n.io/ (human approval/workflow docs).
- Actuity: https://actuity.tech/ (public URL scan, evidence-backed diagnosis, bounded task).
- PayGate project: ETHMumbai Devfolio project and its linked GitHub repository; distinguish the project from the x402 standard.
- x402: https://www.x402.org/ (official protocol and live ecosystem counters; counters are not independent audits).
- Vercel Agent Tools: Vercel AI/agent documentation.
- Zapier MCP: https://zapier.com/mcp (verify current scope/counts).
- Arcade: https://www.arcade.dev/ (tool auth/governance docs).
- A2A: https://a2a-protocol.org/ (Agent Card, auth, task messaging).
- Exora: https://www.adityaa.pro/ is the user's portfolio, not necessarily the Exora product URL; do not conflate Exora with Exa.
- Data exploration: https://www.kaggle.com/thoughtvector/customer-support-on-twitter ; https://github.com/bitext/customer-support-llm-chatbot-training-dataset ; JourneyBench paper: https://aclanthology.org/2026.eacl-industry.15/ ; Laya repository: https://github.com/NandhaKishorM/laya

**Citation hygiene:** re-open and verify every URL and current claim before using it in the final submission. Some references were identified in exploratory research and should not be treated as audited evidence.

---

## 16. Open questions / decisions not yet made

These are the only major unresolved questions worth revisiting; do not restart broad brainstorming without a reason.

1. **Primary entry point:** this dossier chooses in-product “Why isn’t this working?” as the main prototype, with WhatsApp as a secondary extension. If the actual assignment explicitly values WhatsApp-first support, revisit—but do not try to demo both as separate full products.
2. **Actual top-five ranking:** validate with Cheerio tickets if available; otherwise label as hypotheses.
3. **Exact three-month target:** baseline is missing. Use a provisional relative target and state the baseline-first plan.
4. **Prototype tool:** Figma, Lovable, v0, or another tool can be used; choose whichever yields a working clickable path fastest. Do not spend the two days on backend infrastructure.
5. **Language scope:** English/Hinglish in prototype; expand only after validation.
6. **Whether to use a typed decision model:** defer until a benchmark demonstrates value.
7. **Exact external source URLs/claims:** verify before final submission.

---

## 17. Final decision summary

If we had to start building now, without more brainstorming:

**Build one polished rejected-template recovery flow inside a lightweight Cheerio-like screen.** The user clicks “Why isn’t this working?”, sees a reason grounded in mocked current state, gets a specific proposed correction, confirms it, and sees either a verified state or a human handoff with the investigation attached. Add a small preflight linter as the next phase. Make the engine deterministic-first, use AI only for ambiguous language/explanation, and keep actions permissioned, confirmable, auditable, and verified.

This is a product, not a chatbot. The cleverness is not the model; it is **removing unnecessary steps while preserving evidence and control**.

