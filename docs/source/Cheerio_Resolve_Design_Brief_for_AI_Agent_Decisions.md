# Cheerio Resolve: Design Brief for AI Agent Decisions

Oct 13, 2026 · @Aditya

## Purpose and how to use this brief

This brief tells an AI agent what Cheerio Resolve is, why it is shaped this way, and what it must never do, so the agent can make product, design and build decisions without re-deriving the strategy.

**The assignment.** Cheerio is a Meta Business Solution Provider whose users are mostly business owners and marketing teams, not engineers. Support cannot keep up as users grow, because people get stuck on setup (WhatsApp API, templates, chatbot flows, integrations) and raise tickets for things they could do themselves. The task is Assignment A: design and prototype a solution that resolves most of these queries without a human and involves a human where required. Deliverables are a doc of at most 4 pages, a clickable design prototype with 3 to 4 screenshots, a Google Sheet with cost and billing numbers, a mandatory AI chat log, and an optional 3 to 5 minute Loom. The deadline is 2 days. Fully AI-generated submissions are rejected, so the author's own reasoning must show.

**Order of precedence when instructions conflict**

1. The Guardrails section overrides everything else.
2. The Design decisions section overrides implementation suggestions.
3. Evidence labels decide how a claim may be worded (see below).
4. Everything else is guidance the agent may adapt.

**Evidence labels.** Every factual claim in this brief carries one of four labels, and the agent must carry them into anything it writes.

| Label | Meaning | How it may be worded |
| --- | --- | --- |
| Documented | Stated in official documentation or a published page | Stated as fact, with a source |
| Reported | Claimed by a company or a research note we have not verified | Attributed ("reported by") |
| Hypothesis | Our belief about Cheerio users or tickets, with no data yet | Marked as hypothesis |
| Assumption | A number or choice we picked to make the plan concrete | Marked as assumption in the sheet |

**What this brief is not.** It is not the final 4-page submission. The submission should be decisive and short, written from the decisions here, not from the research.

## Product promise and design decisions

**Promise.** The user should not have to understand the problem, explain it to support, and then work out the fix. Cheerio uses the context it already has to get them to a verified outcome, or hands the case to a human with the evidence already attached. The technical components exist to serve this promise, never the reverse.

**Name.** Cheerio Resolve (working name). It is a context-aware recovery flow inside the product, not a chatbot and not a new dashboard.

Each decision below cites the pattern it follows (P1 to P10, defined in the next section) and carries an evidence label.

| ID | Decision | Why | Follows | Label |
| --- | --- | --- | --- | --- |
| D1 | Start from a real failure inside the product. The primary entry is a "Why isn't this working?" action on the failed item, with context attached automatically. | The user cannot describe a setup problem reliably but can point at it. Winners began from a concrete scenario, not an empty chat. | P2, P8 | Hypothesis |
| D2 | Build one complete journey (rejected WhatsApp template) and show that the same engine extends to the other top issues. | Judges reward a small number of complete, validated journeys over a vague assistant that does everything. | P2, P6 | Documented pattern |
| D3 | The first step is read-only. Any change to the user's account waits for explicit approval. | The top Cowork winner returns a read-only outcome first and pauses every change for one-tap approval. | P1, P3 | Documented pattern |
| D4 | Keep policies and issue playbooks as data, separate from the conversation layer. | The top Operative winner stores its rulebook so it can change without touching the agent. | P4 | Documented pattern |
| D5 | Triage uses rules first, then a swappable decision layer that returns typed answers with a confidence score. Low confidence asks one question or escalates. | Confidence-based routing won a human-in-the-loop event; the model choice is an implementation detail, not a customer benefit. | P6, P5 | Documented pattern |
| D6 | Separate an attempted action from a verified result. Say "verified" only after re-reading state and matching the expected outcome. | Hackathon scoring weighs correct outcomes and judgement, and a fake success is the worst failure. | P7, P6 | Documented pattern |
| D7 | The human handoff is a product feature: a case file with the original message, state, checks run, proposed fix, approval and verification result, plus a correlation ID. | Winners showed review status, audit logging and correlation IDs on screen. | P5, P1 | Documented pattern |
| D8 | Read and write are separate capabilities. Reads are always allowed; writes go through a narrow allowlist. | One top-three agent splits a parent that reads from a child that writes. | P10, P1 | Documented pattern |
| D9 | Log every case as an event. One event history feeds three views: operator, manager, support agent. | Shows value beyond deflection without building three products. | P5, P6 | Hypothesis |
| D10 | Never invent facts. Unknown values appear as placeholders or an explicit "cannot verify". | Anti-fabrication was called out in a winning skill. | P3 | Documented pattern |
| D11 | Start with English and Hinglish. Do not promise other languages until fluent reviewers check the paths. | Language quality is untested for policy-sensitive diagnosis. | none | Assumption |

**Explicitly out of scope**

- A general-purpose AI employee or an all-issues bot.
- A new standalone dashboard with its own onboarding.
- Autonomous account changes without approval.
- Autonomous billing, refund or credit decisions.
- Promising that Meta will approve a template.
- Treating a model such as Jev or Laya as the product.

## Hackathon wins and products we adhere to

The workflow follows documented winners and judging criteria, not projects that merely sound similar. Ten patterns are listed. P1 to P5 and P10 come from a Microsoft winners page the author opened in full. P6 to P8 come from event pages seen as search excerpts only, so the agent should re-open them before quoting. P9 is reported by a research note and is unverified.

| ID | Project or event | Result | What it did | Pattern we borrow |
| --- | --- | --- | --- | --- |
| P1 | [Copilot Cowork Autonomous ITSM Platform](https://devblogs.microsoft.com/powerplatform/agent-academy-hackathon-winners/) | 1st, Cowork Collective track | A triage agent classifies a ticket, checks the knowledge base and returns a read-only outcome: resolve from the knowledge base, ask for detail, or propose an action. Any change pauses for one-tap manager approval, then a narrowly scoped service principal executes it and writes an audit record. | Read-only first, approval before any change, least-privilege execution, audit record |
| P2 | [Vehicle Insurance Self-Service Agent](https://devblogs.microsoft.com/powerplatform/agent-academy-hackathon-winners/) | 3rd, Recruit track | Two high-volume journeys (submit a claim, cancel a policy) decided from live data. A shared identity check escalates to a human after two failed attempts, and irreversible actions need explicit confirmation. | Few complete journeys, reusable steps, escalation after repeated failure, confirmation gate |
| P3 | [Client Kick-off Skill](https://devblogs.microsoft.com/powerplatform/agent-academy-hackathon-winners/) | 2nd, Cowork Collective track | A two-phase workflow with a hard stop between a read-only phase and an action phase. Each output needs per-item approval, and unknowns are flagged as placeholders. | Hard stop between reading and acting, no silent actions, anti-fabrication |
| P4 | [VendorGuard](https://devblogs.microsoft.com/powerplatform/agent-academy-hackathon-winners/) | 1st, Operative track; highest score of the whole event | An event-triggered pipeline scores a contract against a 15-rule rulebook stored in Dataverse, so the rules change without touching the agent. Reports are stored and queryable. | Playbooks and rules as data, structured report |
| P5 | [Engagement Hub](https://devblogs.microsoft.com/powerplatform/agent-academy-hackathon-winners/) | 2nd, Operative track | Structured analysis with risk flags, a confidence score, human-review status and a correlation ID. Duplicate-safe record creation, audit logging, and a Teams card for human review. | Confidence plus review status on every case, correlation ID, audit log |
| P6 | CallFlow, [AI Tinkerers Humans-in-the-Loop Agents Hackathon](https://la.aitinkerers.org/hackathons/h_tV5wkIy3tdE/results) | 1st | Confidence-based routing with real-time verification and monitoring. Routine inquiries resolve automatically and complex cases go to a human for approval. | Decide which cases are safe to resolve and which need a person |
| P7 | [London AI Hackathon, AI Transformation of Services](https://luma.com/ja5x0m76) | Scoring rules | 35% of the score is correct outcomes and 20% is judgement and safety. New escalation cases with conflicting information, failed actions and missing context are released 30 minutes before the deadline. | Design for ambiguity and failure, not only the happy path |
| P8 | [eGain AI Agent Hackathon](https://www.egain.com/?p=38451) | Judging criteria | Agents must answer questions, guide a process and offer an escalation path (at least two options), and take a real action. Criteria reward solving the request end to end and clear storytelling. | Answer, guide, escalate, act; fewer handoffs |
| P9 | CurePharma AI, Meta Llama Hackathon India | 1st, societal-good theme (reported, unverified) | A WhatsApp-based experience for medication information in regional languages. | A familiar channel plus a specific accessibility problem beats a generic bot |
| P10 | [FrostByte AI Advisor](https://devblogs.microsoft.com/powerplatform/agent-academy-hackathon-winners/) | 3rd, Operative track | A parent agent handles reads and analysis while a connected child agent performs every write. | Separate read capability from write capability |

**Judging criteria of the Microsoft event (documented).** Accuracy and relevance 25%, technical execution 25%, creativity and originality 15%, user experience and presentation 15%, reliability and safety 10%, use case impact 10%. Every entry needed a working agent, a demo video of at most five minutes, and an architecture overview showing components, data flow and integration points. Our own submission should mirror this: one working click path, a short Loom, one architecture picture.

**What the winners have in common (inferred from the above, not proven).**

1. One memorable scenario followed from input to outcome.
2. Visible evidence of judgement: an approval screen, a failed check, a handoff case.
3. Rules and playbooks kept apart from the conversational layer.
4. An audit trail the reviewer can see.
5. A clear boundary between what is implemented and what is roadmap.

**How the agent should use this section.** Borrow patterns, never copy projects. When a new design question arises, look for the closest pattern here before inventing one, and cite its ID in the answer.

## Architecture and initial implementation

One loop serves every issue: read real state, decide, propose, confirm, verify, then resolve or hand off with a case file. The channel (in-product button, WhatsApp or Telegram) is only an adapter around that loop.

&#91;embedded content: engine loop · 8 steps, 2 outcomes, 1 event log\]

Only the confirm step changes the user's account. A failed verification, low confidence, two failed attempts or a request for a human all end at a human with the case file attached.

| Component | Job | Initial implementation (prototype) | Follows |
| --- | --- | --- | --- |
| Channel adapter | Receive the problem and keep the original wording and language | Clickable screens. The in-product "Why isn't this working?" action is primary; a forwarded WhatsApp or Telegram message is optional | D1 |
| State reader | Read the template record and reason code from the source | A mocked fixture, labelled as mocked, with three variants | D10, G4 |
| Triage | Map the case to a playbook and decide whether a human is needed | Rules for known reason codes. A decision layer returns issue type, urgency and needs-human with a confidence score | D5, P6 |
| Playbook store | Hold issue playbooks and policy rules as data | A small rule table (JSON or sheet), editable without changing the screens | D4, P4 |
| Action gate | Allow only listed operations, after confirmation and a permission check | A confirm screen showing before and after | D3, D8, G1, G2 |
| Verifier | Re-read state and compare it to the expected outcome | A simulated state change, labelled simulated | D6, G5 |
| Case file and handoff | Package everything the human needs | The S5 screen with all case file fields | D7, P5 |
| Event log | Record every step with a correlation ID | A list that powers the optional manager view | D9, G11 |

**Where Jev and Laya fit.** They fit the triage step only. A typed-decision model answers a fixed set of questions with typed values and a confidence score, which matches the issue-type, urgency and needs-human questions. Laya is open, self-hosted and licensed Apache 2.0, and its own model card describes it as a base to specialise, not a zero-shot engine. Jev is a closed hosted API. Both publish benchmarks that this project has not reproduced, and a small typed-decision model is built for a short menu of answers, so keep the issue list under about twenty classes. Latency of classification is not the bottleneck for the user, who waits on state reads and Meta's review. For the assignment, name the decision layer as swappable, add a cost row in the sheet, and host nothing.

**If the triage were built for real, test it first.** Write 100 to 300 hand-labelled scenarios (a proposed size), including short ambiguous phrases, mixed English and Hinglish, negation, conflicting details, missing state, urgent and human-required cases, and an explicit request for a human. Compare three options: plain rules, a standard LLM with a structured output schema, and Laya or Jev. Score per-class precision and recall, recall on urgent and human-required cases, false and missed escalations, unsupported-claim rate, latency and cost, split by language so one weak language is not averaged away.

**Initial build order for the prototype**

1. Write the fixture for three rejected-template variants: promotional wording in a Utility template, a broken variable, and a category mismatch.
2. Build screens S1 to S5 and make the click path work end to end.
3. Wire a small state machine so confirm, pending, verified and handoff states are reachable.
4. Add at least two failure paths from the use case section.
5. Add the optional S6 manager view from the event list.
6. Capture the four screenshots, test the flow as a non-technical operator, then record the Loom.

## Practical use case: a rejected template, end to end

A small-business owner runs WhatsApp campaigns through Cheerio. Their template was submitted as Utility and has been rejected. They type "template reject ho gaya bhai" or tap "Why isn't this working?" on the template. All state below is a mocked fixture and the prototype must say so.

**Mock state fixture.** Template name, language, current category (Utility), current text (contains promotional wording), status (Rejected), rejection reason code, last updated time. Provider documentation shows real reason strings such as INVALID\_FORMAT, and a category mismatch that arrives as an incorrect-category event with the reason TAG\_CONTENT\_MISMATCH (documented, 360dialog and Gupshup docs). Meta's INVALID\_FORMAT reason does not say which part is wrong (reported by a WhatsApp partner), which is the gap the product fills.

**Happy path**

1. **Entry.** The user taps "Why isn't this working?" on the rejected template, or types a short message. The original wording and language are saved.
2. **Read state.** The system reads the template record and reason code. It does not infer state from the user's words.
3. **Triage.** A known reason code maps to a playbook by rule. An ambiguous message gets one clarifying question. A decision layer returns issue type, urgency and needs-human with a confidence score.
4. **Diagnose.** The screen shows the reason code, a plain-language explanation, and the exact line that needs attention.
5. **Propose.** The screen shows a before-and-after of the corrected text or category with a one-line reason per change. Nothing is submitted yet.
6. **Confirm.** The user taps "Review and resubmit". This is the only point where the account changes.
7. **Verify.** The system re-reads the template state. If it is Pending, the screen says submitted and waiting for Meta review. It says verified only when the state matches the expected outcome.
8. **Log.** Every step writes an event with a correlation ID.

**Failure and edge paths.** The prototype shows at least two of these.

| Situation | Required behaviour | Follows |
| --- | --- | --- |
| Reason code missing or unclear | Say the cause cannot be verified and offer human review | D10 |
| Fix cannot be submitted | Show copyable text and state that no change was made | D3 |
| User declines the fix | Leave the template unchanged and offer explanation or a human | D3 |
| State unchanged after resubmission | Do not say fixed, stop retrying, hand off with evidence | D6 |
| Meta review still pending | Show the real status and never claim approval | D6 |
| Two failed attempts on the same issue | Escalate to a human | P2 |
| User asks for a human | Escalate at once, no bot loop | D7 |
| Billing, refund or credit | Human-led, show the evidence only | D8 |
| Account permissions insufficient | Do not bypass, explain the blocker, hand off | P1 |
| Language or intent uncertain | Ask one short question, keep the original wording | D5 |
| Conflicting or missing information | Treat as unseen case: escalate with what is known | P7 |

**Case file the human receives.** Account and workspace, template ID, original message and language, issue type and urgency, current state and reason code, checks run and results, proposed fix and whether the user accepted it, actions attempted and results, verification outcome, recommended next step, transcript with timestamps, correlation ID.

**Prototype screens.** S1 template list with the rejected item. S2 diagnosis panel. S3 before-and-after with the confirm button. S4 pending or verified state, labelled simulated. S5 handoff case file. S6 optional manager view of recurring failure types from the event log. Screenshots for the submission are S2, S3, S4 and S5.

**Extending to the other top issues (hypothesis, ticket ranking not validated).** The same read, diagnose, propose, confirm, verify loop applies; only the state read and the playbook change.

| Issue | State the engine reads | First safe action |
| --- | --- | --- |
| Number or WABA connection, display name, verification | Connection and approval status | Show which prerequisite is missing and the next step |
| Campaign not delivering | Template state, quality rating, messaging limit, opt-in | Narrow the likely cause with evidence, never assert one without it |
| Chatbot flow not triggering | Trigger, conditions and recent execution state | Show the failing step and a safe correction |
| Integration or webhook error | Error code, event ID, timestamp, retry status | Technical handoff with exact details instead of chat |

## Guardrails

These rules override every other section. An agent making a decision must check it against this list first and cite the rule ID if it declines or changes an option.

| ID | Rule | Why |
| --- | --- | --- |
| G1 | The system never changes a user's account, template, flow or live campaign without an explicit confirmation shown before the change. | P1, P3 |
| G2 | Only application code performs actions, from a fixed allowlist of narrow operations. Model output never becomes a tool call and never sets permissions. | P1, P10 |
| G3 | Use the least privilege that works. If permissions are insufficient, explain the blocker and hand off; never work around it. | P1 |
| G4 | Read state from the real source. Never infer state from the user's description or from a model's guess. | D10 |
| G5 | Say "verified" only after re-reading state and matching the expected outcome. A sent message or a clicked button is not a resolution. | D6 |
| G6 | Never claim Meta approval. Report the real status (for example Pending) and that Meta's review is outside Cheerio's control. | D6 |
| G7 | Label every mocked, simulated or assumed value as such in screens, the doc and the sheet. | Evidence labels |
| G8 | Stop after two failed attempts on the same issue and escalate with evidence. No blind retries. | P2 |
| G9 | Low confidence, conflicting information or missing state leads to one clarifying question or a handoff, never a confident guess. | P6, P7 |
| G10 | Billing, refunds, credits, security, identity and ownership changes are human-led. The system may show evidence only. | D8 |
| G11 | Every case writes an audit event with a correlation ID, the checks run and the outcome. Duplicate submissions are blocked. | P5 |
| G12 | The handoff always carries the case file so the user never repeats their story. | D7 |
| G13 | Do not present company-reported metrics, model benchmarks or invented numbers as Cheerio results. Targets are provisional until a baseline exists. | Evidence labels |
| G14 | Never expose customer data beyond what the issue needs, and keep it out of prompts where a rule or lookup is enough. | Privacy |
| G15 | The author's reasoning must be visible and the AI log honest, including where AI was wrong. Fully AI-generated submissions are rejected. | Assignment policy |

**Escalate to a human immediately when**

- The user asks for a human.
- Billing, refund or any financial exception is involved.
- Security, identity, access or ownership must change.
- The action is destructive or could disrupt a live campaign.
- Policy is ambiguous, or state cannot be checked from the authoritative source.
- A verified attempt did not fix the issue.
- The same issue returns within 72 hours.

**Copy rules for every screen and message**

- Plain language first, exact reason code second.
- Name what changed and what did not.
- Use "submitted", "pending" or "verified"; avoid "fixed" or "approved" unless the state shows it.
- Offer a human on every failure screen.
- Keep the user's original wording in the handoff.

## Audience

There are two audiences: the people Cheerio Resolve serves, and the people judging the submission. They want different things, so one workflow is shown through several views, not several products. All persona needs are hypotheses until validated with Cheerio ticket data or a few interviews.

**Who the product serves (hypothesis)**

| Audience | Their job | What they need to see | View |
| --- | --- | --- | --- |
| Operator: owner or campaign marketer, hands-on but not technical (primary) | Get back to sending without guessing at settings or waiting for support | A plain explanation, the exact line at fault, one clear next action, and a safe confirm step | S2, S3, S4 |
| Accountable manager: CX, CRM or operations lead | Know what keeps going wrong and whether cases are really solved | Recurring failure types, unresolved cases, where humans step in, and the proof a case was verified | S6 from the event log |
| Support agent | Take over without asking the customer to start again | The case file: original message, state, checks run, proposed fix, approval, verification result | S5 |
| Implementer: agency or developer (anti-persona for chat-first) | Debug an API, webhook or integration | Exact error codes, event IDs, timestamps and retry status, not conversational reassurance | Technical handoff |

A chat window must never be the only support surface, because the implementer and some operators need the underlying state shown.

**Who judges the submission (inferred from the hackathon patterns and the brief)**

| Reviewer | What they look for | What to show them |
| --- | --- | --- |
| Product manager | Sharp problem choice, honest scope, a clear "what it won't do", prioritisation with reasons for rejected options | Top five issues with a stated reason for each rejected alternative, and the out-of-scope list |
| Operations or support lead | A real handoff and recovery from failure | The case file on screen and at least two failure paths in the prototype |
| Business or finance | Numbers that reconcile and assumptions that are labelled | A sheet whose figures match the doc, with a break-even view |
| Engineer | A feasible build with a clear permission boundary | One architecture picture, the verify step, and the swappable decision layer |
| Founder | Economics and a believable path from prototype to production | Cost per resolved case, savings against human support, and what is mocked |

**How the agent should use this section.** When a design choice trades one audience against another, favour the operator for the live flow, the support agent for the handoff, and the reviewer for how the work is presented. Write the submission in the author's voice, not as an AI summary.

## Evidence, metrics and decision rules

**What is established and what is not**

| Established (documented patterns) | Not established (do not state as fact) |
| --- | --- |
| Read-only first, approval before change, audit records and confidence-based routing appear in winning projects | Cheerio's real ticket volume, issue ranking, resolution time or support cost |
| Rejection reasons such as INVALID\_FORMAT and TAG\_CONTENT\_MISMATCH exist in provider documentation | Whether a WhatsApp entry beats an in-product entry for Cheerio users |
| Laya is an open, self-hosted typed-decision model on a 421M-parameter backbone, and its model card calls it a base to specialise, not a zero-shot engine | That Jev or Laya beats a standard LLM or plain rules on Cheerio classification |
| Jev is a closed hosted API reached through TypeSafe | Any month-three target, autonomous-resolution share or savings figure |

A vendor blog says about one in three templates is rejected on first review. Treat that as an anecdote from one partner, not a Cheerio statistic.

**Measures (proposed, no baseline yet)**

- **North Star:** verified resolution rate without repeat contact within 72 hours, among eligible in-scope issues. Report human-only cases separately so difficult cases are not hidden.
- **Metric 1:** time to first useful diagnosis, median and 90th percentile.
- **Metric 2:** repeat-contact rate on the same issue within 72 hours.
- **Metric 3:** safe completion and escalation quality: share of attempted fixes that pass verification, with false-resolution and missed-escalation rates reported separately.
- **Three-month target:** measure the baseline in the first two weeks, then set the target. If a number is required now, state a 25% relative improvement in verified resolution as a provisional assumption, never as a forecast.

**Numbers sheet plan (assignment Part 4).** One assumptions tab with every input labelled: queries per business per month, issue mix, resolution rate per issue, human cost per ticket, and model price per million input and output tokens with its source. Then the query estimate for 5,000 businesses, cost per query (tokens in and out, plus hosting), savings against human support, billing options with a priced recommendation and margin, and an audit tab with monthly checks and alert thresholds. Add a row comparing the triage cost of a standard LLM, Jev and Laya, all marked as assumptions to verify.

**Decision rules for the agent**

1. If an option adds a new surface (a dashboard, a second bot, a second product), reject it unless it serves the one journey directly.
2. If a claim has no evidence label, add one or remove the claim.
3. If an option needs real Cheerio or Meta access the assignment does not provide, mock it and label it.
4. The primary prototype is a clickable design (Lovable, v0 or a Claude artifact). A Telegram or WhatsApp bot is optional and comes last.
5. Work in this order: doc and prototype, then the sheet, then the prompt log, then the Loom, then any bot.
6. Use rules or a standard LLM with a structured schema for triage. Consider Jev or Laya only if a small labelled test beats those baselines on accuracy, latency, cost or simplicity.
7. When two options are otherwise equal, choose the one that shows a visible failure path.
8. If this brief and a user instruction conflict, follow the Guardrails, then ask the user.

**Open questions**

- Does Cheerio expose real ticket data, or must the issue ranking stay a hypothesis?
- Is a Telegram or WhatsApp bot link acceptable as a prototype, or is a design link required?
- Which model and price will the sheet assume, and from which source?
- Which languages beyond English and Hinglish are worth showing?

**Sources**

- [Meet the Agent Academy Hackathon Winners, Microsoft Power Platform Developer Blog, 18 June 2026](https://devblogs.microsoft.com/powerplatform/agent-academy-hackathon-winners/): opened in full.
- [AI Tinkerers Humans-in-the-Loop Agents Hackathon results](https://la.aitinkerers.org/hackathons/h_tV5wkIy3tdE/results), [London AI Hackathon](https://luma.com/ja5x0m76), [eGain AI Agent Hackathon](https://www.egain.com/?p=38451): seen as search excerpts only; re-open before citing.
- [Laya typed-decisions model card](https://huggingface.co/convaiinnovations/laya-typed-decisions) and [Laya explainer](https://dev.to/techaiwire/layas-typed-decisions-explained-2h7g): search excerpts only; benchmark figures are self-published.
- [360dialog template documentation](https://docs.360dialog.com/docs/waba-messaging/template-messaging) and [Gupshup system events](https://docs.gupshup.io/docs/system-events): search excerpts only.
- Project P9 and the CallFlow detail of a second evaluation layer come from a supplied research note and are unverified.
