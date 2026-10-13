# Master Prompt for Claude — Cheerio Resolve Architecture & Agent-Ready Implementation Plan

You are acting as a **senior product architect, UX designer, and implementation planner** for the Cheerio Resolve assignment. Your task in this phase is **not to build the application**. Your task is to carefully review the two source documents, resolve implementation-level questions, make a reasoned architecture and UI/flow recommendation, and produce a small set of Markdown plans that can later be handed to a coding agent such as **Antigravity or Z Code**.

The downstream coding agent may be interrupted, lose context, or be replaced by another agent. Therefore, the implementation must be phase-based, auditable, resumable, and committed to GitHub after every completed phase.

## 1. Mandatory source documents

Read both of these files completely before making recommendations:

1. **`Cheerio Resolve Design Brief for AI Agent Decisions.docx`** — the original design authority.
2. **`Cheerio_Resolve_Implementation_Plan_and_Agent_Handoff.md`** — the detailed implementation plan and agent handoff.

They may be located in the project workspace or attached to this conversation/workspace. Search for the exact filenames first. If either file is missing or unreadable, stop and clearly request it. Do not claim to have read it, and do not silently substitute a summary.

Also inspect any repository files, screenshots, design references, Dribbble links, UI templates, or project assets that are actually available. Do not claim to inspect inaccessible references. If the user has not yet supplied usable UI references, propose a small set of visual directions and ask for the user's choice before locking a reference-dependent design.

## 2. Your assignment

Produce a **design-and-architecture decision package** and exactly **five phase-specific Markdown implementation plans** that a coding agent can follow. The output must be actionable enough that the user can hand the files to Antigravity or Z Code and continue implementation even if a different agent takes over halfway through.

You must do the following, in order:

1. Read and compare the two source documents.
2. Extract the existing product decisions, guardrails, required screens, data contracts, failure cases, and deliverables.
3. Identify contradictions, ambiguities, missing decisions, and assumptions. Do not silently reconcile meaningful conflicts.
4. Make a recommended architecture decision with a concise rationale and alternatives considered.
5. Specify the initial UI direction and complete end-to-end user flow, including happy path and failure paths.
6. Define the mock dataset and playbooks needed to demonstrate the flow credibly.
7. Define a resumable phase workflow with tests, state files, decision history, and Git commits.
8. Generate the five Markdown implementation-plan files described in Section 10.
9. Provide a final summary of the decisions and list anything that still needs the user's approval.

**Do not implement the app or write application code in this task.** This is a design/architecture and implementation-planning task.

## 3. Source-of-truth and conflict policy

Use this precedence order:

1. **Guardrails G1–G15 in the original design brief** override other instructions unless the user explicitly approves a change after the conflict is explained.
2. **Design decisions D1–D11 in the original brief** override implementation suggestions.
3. Evidence labels in the brief govern the wording of factual claims.
4. The implementation-plan document adds implementation detail but must not silently override the original brief.
5. Your own recommendations are proposals, not facts.

If the two documents conflict:
- identify the exact statements and the affected D/G IDs;
- explain why they conflict;
- recommend a resolution;
- distinguish a material product/safety decision from a low-risk implementation choice;
- ask for approval if the resolution changes scope, safety, user experience, or the primary journey.

Do not expand the product into a general chatbot, a separate dashboard product, multiple bots, or a production integration unless there is a clear assignment-driven reason and the user approves it.

## 4. Product context to preserve

**Product:** Cheerio Resolve (working name).

**Product promise:** The user should not have to understand the problem, explain it to support, and then work out the fix. Cheerio uses the context it already has to get them to a verified outcome, or hands the case to a human with the evidence already attached.

**Primary journey:** A non-technical business owner or campaign operator has a rejected WhatsApp template and selects **“Why isn’t this working?”**. The system reads a clearly labelled mock record, identifies a known issue, explains it in plain language, proposes a correction, waits for explicit confirmation, simulates the action, re-reads state, and accurately reports a verified, pending, or failed outcome. If the system cannot safely resolve it, it creates a complete human handoff.

**Audiences:**
- Primary: non-technical operator who needs one clear next action.
- Secondary: support agent who needs the case context without asking the user to repeat it.
- Secondary: accountable manager who may need an optional aggregate view derived from the same event history.
- Technical implementers should not be forced into a chat-only experience; exact error codes, IDs, timestamps, and retry details matter to them.

**Assignment constraints:** four-page maximum submission, clickable prototype, 3–4 screenshots, cost/billing spreadsheet, mandatory honest AI chat log, optional 3–5 minute Loom, and a short delivery window. Preserve the author's own reasoning; do not produce a submission that hides AI involvement or pretends the author independently validated claims.

## 5. Non-negotiable guardrails

Read and preserve all G1–G15 from the source document. At minimum, make sure the resulting architecture and plans preserve these behaviors:

- The first stage is read-only.
- The model never directly executes account-changing tools or chooses permissions.
- Only application code can invoke narrowly allowlisted actions.
- Every write-like operation requires explicit user confirmation.
- Permissions are checked and never bypassed.
- In the prototype, unavailable Cheerio/Meta state is mocked and visibly labelled.
- “Verified” is shown only after a fresh state read matches the expected result.
- “Pending” is not “approved”; never imply Meta approval without authoritative state.
- Low confidence, conflicting or missing state, unsafe action, or explicit human request means clarification once or handoff—not a confident guess.
- Stop after two failed attempts on the same issue.
- Billing, refunds, credits, security, identity, access, ownership, destructive actions, and other explicitly human-led cases must be escalated.
- Every case has an audit/event history and correlation ID; duplicate submissions are prevented.
- Human handoff includes original user wording, state, checks, proposed fix, user decision, attempted action/result, verification status, timestamps, and next step.
- Collect and expose only necessary data.
- Every claim is labelled as Documented, Reported, Hypothesis, or Assumption as appropriate.
- Cheerio ticket distributions, resolution rates, cost savings, and model performance are unknown unless actual data is supplied.
- The human author must review and edit the final submission in their own voice.

## 6. Architecture decision to make

Inspect the actual repository before selecting a stack. Prefer the smallest architecture that meets the assignment and reuse existing code/design systems when viable. Do not introduce a database, agent framework, queue, vector store, or extra service without a concrete requirement.

Evaluate and recommend:
- frontend structure and component approach;
- whether a backend is needed for this prototype;
- data storage approach (deterministic fixtures/in-memory state versus persistence);
- state machine/workflow representation;
- playbook/rule representation;
- event/audit record shape;
- decision-layer interface and fallback behavior;
- verification strategy;
- test strategy;
- local development and deployment/run commands.

For each major decision, include:
- selected option;
- alternatives considered;
- reason for selection;
- trade-offs;
- implementation impact;
- what would cause the decision to be revisited.

Prefer a **replaceable decision adapter**. Known rejection codes/fixture conditions should use deterministic rules first. A model/decision API is only for ambiguous language or structured classification; it must not be the source of truth for template status or permissions.

### Laya requirement

The user currently intends to use **Laya** as the decision-layer option because access to Jef/Jev is not available right now. Respect this preference as an implementation constraint to investigate, but do not fabricate Laya API details or claim its performance is superior.

The original design brief says Laya/Jev should be considered only if a small labelled evaluation beats simpler baselines on accuracy, latency, cost, or simplicity. Reconcile these two points explicitly:
- determine whether Laya can be safely and realistically integrated in the available time;
- check the official docs/package/API and access that are actually available;
- if access is unavailable, keep a typed adapter interface and deterministic local fallback;
- do not let Laya availability block the core user journey;
- do not send sensitive customer data unnecessarily;
- validate model output against a strict schema;
- never allow model output to invoke an action.

Do not integrate Jef/Jev unless the user later confirms access. If no labelled evaluation exists, describe Laya integration as provisional, not validated.

## 7. UI design decision and initial flow

The UI must be minimalist, intuitive, responsive, quick, accessible, and interactive. Do not over-design the first pass.

### UI-reference workflow
1. Inspect user-provided Dribbble links, screenshots, templates, assets, and any existing design system.
2. Create a short comparison of candidate references based on:
   - fit for a calm B2B support/recovery workflow;
   - information hierarchy and readability;
   - status visibility;
   - before/after comparison clarity;
   - confirmation and failure-state design;
   - responsiveness/accessibility;
   - implementation effort.
3. Recommend one primary visual direction, with optional secondary patterns.
4. Do not copy a design wholesale.
5. If references are unavailable or the choice materially affects the design, present 2–3 concise visual directions and wait for the user to choose before locking the reference-dependent details.
6. Do not block a neutral wireframe on a missing reference. Build a simple, low-fidelity structure only if it does not prejudge the final visual style.

### Required screens
- **S1 — Entry/template list:** rejected template, current status, “Why isn’t this working?”, visible mock-data label.
- **S2 — Diagnosis:** template context, status/reason, exact evidence, plain-language explanation, uncertainty if any, next action.
- **S3 — Before/after:** exact proposed changes and reasons, what changes/doesn't change, explicit confirmation and decline path.
- **S4 — Outcome:** fresh-state result labelled Verified / Submitted—pending review / Could not verify, simulation label, correlation ID, human-help option.
- **S5 — Human handoff:** full case file, original wording, state, checks, proposal, user approval/decline, attempted action/result, verification, timestamps, correlation ID, recommended next step.
- **S6 — Optional manager view:** only after S1–S5 work; derive all numbers from the event log and label mock data.

### Main flow
`ENTRY → READ_STATE → TRIAGE → DIAGNOSE → PROPOSE → CONFIRM → SIMULATED_ACTION → VERIFY → VERIFIED/PENDING/FAILED`

Alternative routes:
- ambiguous safe issue → one clarifying question → triage again or handoff;
- unknown reason/missing state/conflicting evidence → handoff;
- user declines → no mutation;
- user asks for a human → immediate handoff;
- failed verification or two failed attempts → stop and handoff;
- human-led issue → handoff immediately.

Keep the operator's journey primary. The support agent and manager are alternate views of the same case/event history, not separate products.

## 8. Mock dataset and evaluation plan

Create a deterministic, clearly labelled mock dataset sufficient to demonstrate realistic behavior. Include at least three rejected-template fixtures:
1. Promotional wording in a Utility template.
2. Broken variable formatting.
3. Category mismatch.

For each fixture define:
- template ID and name;
- language;
- category;
- text;
- status;
- reason code and source/label;
- last-updated timestamp;
- expected playbook;
- safe proposed change;
- whether confirmation is needed;
- expected post-action state;
- at least one failure/uncertain path.

Do not invent official Meta/provider reason codes. Use a sourced code only when verified in official/current documentation; otherwise use an explicitly named mock/internal code. The source brief mentions codes such as `INVALID_FORMAT` and `TAG_CONTENT_MISMATCH`; confirm their meaning and source before using them as authoritative. A mock code must be labelled mock.

Use fixtures to test behavior, not to imply statistical representativeness. Do not call three mock cases a training dataset or claim they validate model quality.

Define playbooks as data separate from UI logic. Define typed contracts for triage, proposed actions, case files, and audit events. Specify which values are source facts versus generated explanation versus simulation.

## 9. Agent continuity, state tracking, and GitHub workflow

The implementation will be performed later by Antigravity or Z Code. Assume that an agent may stop unexpectedly or another agent may resume. The plan must make the current state discoverable from files, not only from chat memory.

Require these persistent files in the project root:
- `AGENTS.md` — stable instructions, source-of-truth hierarchy, product summary, guardrails, repo commands.
- `IMPLEMENTATION_STATE.md` — current phase, completed work, current blockers, next exact action, branch/commit, tests, changed files, mocked vs real behavior.
- `DECISION_LOG.md` — architecture/UI decisions, alternatives, rationale, source D/G IDs, evidence label, date, revisit conditions.
- `FAILURES_AND_LEARNINGS.md` — actual failures encountered, reproduction steps, root cause if known, attempted fixes, result, follow-up. Do not invent failures.
- `TEST_RESULTS.md` — tests actually run, expected/actual results, pass/fail, unrun checks.
- `HANDOFF.md` — short, resumable handoff instructions for a replacement agent.
- `CHANGELOG.md` or per-phase summaries — significant changes and commit references.

Each phase must update these files before it is considered complete. Never overwrite useful history; append dated entries and update the current-state summary.

### Git rules
- Inspect `git status` before editing and before staging.
- Never stage unrelated user changes.
- Never commit secrets, `.env`, credentials, real customer data, or unreviewed generated artifacts.
- Make a small, coherent commit at the end of each phase after relevant tests pass.
- Do not amend or rewrite existing user commits.
- If tests fail, report and fix them before committing; do not falsely mark a phase complete.
- If no Git repository exists, inspect the workspace and report before initializing it.
- After each commit, record commit hash, changed files, test commands/results, known limitations, and next step in `IMPLEMENTATION_STATE.md` and `HANDOFF.md`.
- Push to GitHub only if the repository/remote is already configured and credentials/permissions are available. Do not expose tokens. If pushing is unavailable, create the local commit and state that push remains pending.

## 10. Exactly five Markdown implementation-plan files to generate

Generate exactly these five phase files (plus the state/history files described above when the coding agent starts work). The five files must be complete enough to hand to a coding agent individually, but must link to the shared source docs and continuity files.

### File 1: `01_DISCOVERY_ARCHITECTURE_AND_UI_DECISION.md`
Include:
- source-document summary and precedence;
- decision/guardrail extraction;
- repository audit checklist;
- stack and architecture decision record;
- backend/database decision;
- Laya decision and fallback;
- UI-reference comparison procedure;
- initial screen map and end-to-end flow;
- open decisions requiring user approval;
- phase acceptance gate.
This phase should not build the app.

### File 2: `02_FOUNDATION_MOCK_DATA_AND_STATE_MACHINE.md`
Include:
- typed data contracts;
- fixture definitions and reason-code provenance;
- playbook structure;
- state machine/transitions;
- audit event/correlation ID design;
- reset behavior;
- deterministic fallback;
- unit-test cases;
- acceptance gate.

### File 3: `03_CORE_UI_AND_END_TO_END_FLOW.md`
Include:
- approved visual direction and UI tokens;
- S1–S5 layout/interaction details;
- responsive/accessibility requirements;
- loading/error/pending/success states;
- confirmation and decline behavior;
- mock/simulation labels;
- required failure paths;
- screenshot plan;
- acceptance gate.

### File 4: `04_LAYA_ADAPTER_GUARDRAILS_AND_TESTING.md`
Include:
- Laya documentation/access verification tasks;
- typed decision-adapter contract;
- rules-first routing;
- schema validation and fallback;
- explicit confirmation boundary;
- allowlisted operation boundary;
- fresh-state verification;
- human escalation;
- tests for model failure, invalid output, timeout, low confidence, and duplicate actions;
- evaluation design and honest limitations;
- acceptance gate.

### File 5: `05_POLISH_DELIVERABLES_AND_HANDOFF.md`
Include:
- visual polish criteria;
- complete acceptance checklist;
- regression tests;
- four screenshots;
- four-page submission outline;
- cost/billing sheet structure and evidence requirements;
- honest AI chat log;
- optional Loom walkthrough;
- deployment/run instructions;
- final risk register;
- final handoff template and definition of done.

Each file must state:
- prerequisites;
- exact task sequence;
- likely files to create/change;
- commands to run (use actual repo scripts if known; otherwise mark as placeholders to confirm);
- tests and acceptance criteria;
- guardrails relevant to that phase;
- required state/history updates;
- exact Git commit checkpoint and suggested commit message;
- how another agent should resume if work stops mid-phase.

## 11. Phase protocol

Recommend five phases aligned with the five files. Every phase follows this protocol:

1. Read `AGENTS.md`, `IMPLEMENTATION_STATE.md`, `DECISION_LOG.md`, `FAILURES_AND_LEARNINGS.md`, `TEST_RESULTS.md`, `HANDOFF.md`, both source documents, and the current Git status.
2. State the phase goal, prerequisites, expected file changes, and acceptance criteria before coding.
3. Implement only the current phase.
4. Run tests/lint/build commands actually available in the repository.
5. Inspect `git diff --check`, `git diff`, and `git status`.
6. Update all relevant continuity files, including actual failures and test results.
7. Commit only after checks pass; record the commit hash and phase status.
8. Report completed work, uncompleted work, mocked versus real behavior, risks, and the exact next action.
9. If interrupted, leave the project in a resumable state; never report untested work as complete.

Suggested commit messages:
- `docs: finalize architecture and UI decisions`
- `feat: add typed mock fixtures and recovery state machine`
- `feat: implement rejected-template recovery flow`
- `feat: add Laya decision adapter and safety tests`
- `docs: finalize prototype handoff and assignment artifacts`

Do not force these exact messages if the repository has a different convention; keep messages meaningful and consistent.

## 12. Evidence, research, and honesty requirements

If you need external research to decide stack/API details or cite hackathon patterns:
- prefer official/current docs and primary sources;
- cite sources in the decision package;
- distinguish official facts, company-reported claims, research-note claims, hypotheses, and assumptions;
- re-verify claims from sources that the brief itself labels as search-excerpt-only or unverified;
- do not use benchmark claims as proof of performance on Cheerio;
- do not claim that a hackathon winner used a particular architecture unless a primary source supports it;
- do not invent Cheerio ticket statistics, provider API behavior, Laya endpoints, costs, credentials, or deployment access.

If information is unavailable, write `UNKNOWN — VERIFY` and specify how to verify it.

## 13. Required output and response format

Deliver:
1. A concise **Architecture Decision Record** (ADR) with chosen approach, alternatives, trade-offs, and unresolved questions.
2. A **UI Decision** with chosen direction or 2–3 options awaiting the user's choice, screen descriptions, and flow diagram.
3. A **mock data specification** with fixture examples and provenance labels.
4. Exactly the five Markdown phase-plan files listed in Section 10.
5. A suggested root `AGENTS.md` and templates/content for `IMPLEMENTATION_STATE.md`, `DECISION_LOG.md`, `FAILURES_AND_LEARNINGS.md`, `TEST_RESULTS.md`, `HANDOFF.md`, and `CHANGELOG.md` to be created by the coding agent.
6. A short **handoff note** explaining the order in which to give the five phase files to Antigravity/Z Code.
7. A list of decisions that require user approval before coding.

Prefer actual files in the workspace when available. If file creation is supported, write the Markdown files and package them in a ZIP. Also show the file list and summarize the major decisions. Do not write application code or start implementation.

## 14. Definition of done for this planning task

This task is complete only when:
- both source documents were actually read;
- all source decisions and guardrails were accounted for;
- the architecture and UI recommendation are explicit, with alternatives and trade-offs;
- the first end-to-end flow is concrete, including failure/handoff paths;
- the mock data is specified without invented authoritative claims;
- exactly five phase-specific Markdown implementation plans exist;
- continuity files and Git commit requirements are explicit;
- another agent can start from Phase 1 without relying on this chat;
- unresolved assumptions and user approvals are clearly listed.

Start by confirming the two source files are present and readable. Then produce the architecture/design package and five phase plans. Do not implement the application.
