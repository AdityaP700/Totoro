# Cheerio Resolve — Agent Prompt Pack

This pack is for an agentic coding environment such as **Antigravity** or **Z Code**. It turns the initial design authority and implementation plan into a staged workflow with checkpoints, test gates, UI reference selection, mock data, and Git commits.

## Start here

1. Put these files and the two source documents in the same project/workspace:
   - `Cheerio Resolve Design Brief for AI Agent Decisions.docx` (the user's original brief)
   - `Cheerio_Resolve_Implementation_Plan_and_Agent_Handoff.md` (the implementation plan)
   - this prompt pack
2. Open `00_MASTER_AGENT_PROMPT.md` and send its entire contents to your coding agent.
3. Let the agent inspect the workspace and propose a plan before it changes files.
4. Run each phase prompt in order. Do not jump to visual polish before the core journey works.
5. After each phase, review the report and Git diff before allowing the next phase.

## Pack contents

- `00_MASTER_AGENT_PROMPT.md` — the top-level instructions and fixed design decisions.
- `01_PHASE_DISCOVERY_AND_UI_REFERENCES.md` — inspect source documents, repository, Dribbble/UI references, stack, and propose a minimal visual direction.
- `02_PHASE_FOUNDATION_AND_MOCK_DATA.md` — repository setup, types, fixtures, playbooks, state machine, event log.
- `03_PHASE_CORE_UI.md` — implement the initial minimalist responsive S1–S5 flow.
- `04_PHASE_DECISION_LAYER_LAYA.md` — rules-first triage and a replaceable Laya adapter; do not invent API details.
- `05_PHASE_GUARDRAILS_AND_FAILURE_TESTS.md` — confirmation, verification, escalation, and tests.
- `06_PHASE_POLISH_AND_SUBMISSION.md` — UI polish, screenshots, docs, cost sheet, AI log, Loom plan.
- `07_PHASE_COMMIT_AND_HANDOFF_TEMPLATE.md` — per-phase report, commit conventions, decision log, next-agent handoff.

## Important workflow

The two source documents are the starting design authority. The agent may identify contradictions or implementation constraints, but must not silently rewrite the product strategy. It should report proposed changes with the affected decision/guardrail IDs and wait for approval if the change affects scope, safety, or the primary journey.

**Never commit secrets, `.env` files, credentials, real customer data, or unreviewed generated binaries.**
