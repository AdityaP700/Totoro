# Cheerio Resolve — Submission Draft & Assignment Reconciliation

> **IMPORTANT NOTICE FOR USER:**  
> This document is a structured draft prepared by the implementation agent. In accordance with the Cheerio assignment instructions and academic integrity rules, **you must personally review, rewrite, and adapt this narrative into your own authentic voice** before final submission. Do not submit raw AI-generated text without personal review and editing.

---

## 1. Executive Summary & Vision

**Cheerio Resolve** is an intelligent, context-aware support recovery flow designed to eliminate support ticket friction for Indian SMBs using the WhatsApp Business Platform. 

When a marketing or transactional template is rejected by Meta's automated moderation, business owners are typically confronted with cryptic error codes or vague policy citations. Cheerio Resolve shifts the user experience from reactive ticket filing to immediate self-service recovery:
1. **Reads Current Context**: Automatically fetches the rejected template state, message text, and reason code from local mock fixtures.
2. **Context-Aware Diagnosis**: Translates technical policy violations (e.g., promotional copy under `UTILITY`, malformed parameter format) into plain, jargon-free explanations.
3. **Deterministic Fix Proposal**: Computes an exact before/after diff for allowable modifications (`category`, `text`), providing clear rationale for each change.
4. **Explicit Confirmation Gate (Guardrail G1)**: Never mutates state without unambiguous user confirmation.
5. **Fresh-Read Verification (Guardrail G5)**: Performs a post-action read against the provider state; strictly differentiates between `SIMULATED_PENDING_REVIEW` and `VERIFIED`, preventing false promises of instant approval.
6. **Graceful Escalation (Guardrails G8–G12)**: Human-led zones (billing, security, identity, abusive text, repeated failure) automatically compile a complete, structured **Case File** with copyable Markdown to hand off to human support agents.

---

## 2. Assignment Requirements Reconciliation Matrix

| Requirement (Assignment A) | Cheerio Resolve Implementation | Verification / Evidence | Status |
|---|---|---|---|
| **Context-Aware Triage** | Evaluates template state, message text, and reason codes without hallucinations. Supports English and Hinglish phrases. | `src/domain/triage.ts`, 170-case evaluation benchmark (`tests/evaluation.test.ts`). 99.4% issue accuracy. | **COMPLETE** |
| **Recovery Playbooks** | Modular playbooks for category mismatches (`PB-001`), variable formatting (`PB-002`), URL parameters (`PB-003`), and unknown reasons (`PB-004`). | `src/data/playbooks.ts`, acceptance tests T1, T2, T3 in `tests/domain.test.ts`. | **COMPLETE** |
| **Safe Execution & Guardrails** | Strict allowlist module (`resubmit_template` only), before/after diff checking, idempotency keys, and zero unconfirmed writes. | `src/domain/mockStore.ts`, `src/domain/allowlist.ts`, acceptance tests T4, T5, T11, T13. | **COMPLETE** |
| **Fresh-Read State Verification** | Re-reads mock store state after action; pending review is never labeled verified. | `src/domain/verification.ts`, acceptance tests T6, T7. | **COMPLETE** |
| **Human Support Escalation** | Full structured case file with correlation ID, attempted steps, diagnosis, and copyable Markdown. | `src/domain/caseFile.ts`, `src/ui/components/S5CaseFile.tsx`, acceptance tests T8, T9, T10, T14. | **COMPLETE** |
| **Interactive UI Prototype** | Functional screens S1–S6 (Catalog, Diagnosis, Proposal diff, Outcome, Case File, Manager Dashboard). | `src/ui/components/S1-S6`, `src/App.tsx`, `src/styles.css`, static build via Vite. | **COMPLETE** |
| **Cost & Evaluation Model** | Working spreadsheet workbook with Evaluation Scorecard populated from real test execution and formulas intact. | `deliverables/cheerio_resolve_eval_and_cost_workbook.xlsx`, populated via `tools/populate_workbook.py`. | **COMPLETE** |
| **Codex Design Handoff** | Explicit contracts, component boundaries, state matrix, and guardrail rules for visual design pass. | `DESIGN_HANDOFF.md`. | **COMPLETE** |

---

## 3. Reviewer Screenshot Checklist

When taking screenshots of the prototype for your presentation or submission deck, capture these essential states:

- [ ] **Screenshot 1 — Screen S1 (Template Catalog):** Showing template `TPL-1001` selected with status `REJECTED`, reason code `FIXTURE_PROMO_UTILITY`, and the prominent `"Why isn't this working?"` button.
- [ ] **Screenshot 2 — Screen S2 (Context-Aware Diagnosis):** Showing the plain-language diagnostic explanation, confidence badge, evidence checklist with `DOCUMENTED`/`REPORTED` tags, and the "What cannot be verified" transparency box.
- [ ] **Screenshot 3 — Screen S3 (Proposed Fix Diff):** Showing the side-by-side Before/After diff (`UTILITY` -> `MARKETING`, URL variable fixed), the confirmation checkbox, and the `"Confirm and Resubmit"` CTA.
- [ ] **Screenshot 4 — Screen S4 (Verified Outcome):** Showing the fresh-read state indicator: `SIMULATED_PENDING_REVIEW` with confirmation that state was re-read from mock store.
- [ ] **Screenshot 5 — Screen S5 (Human Escalation Dossier):** Triggered either via `TPL-1003` failure or manual escalation, showing Case ID `CASE-xxxx`, checks run, and the `"Copy Case Summary"` button.
- [ ] **Screenshot 6 — Screen S6 (Manager Analytics):** Showing the KPI cards (Total Sessions, Escalation Share, Safety Violations = 0) and the full chronological audit event log table.

---

## 4. Concise Demo Walkthrough Script

Use this script during live demonstrations or video walkthroughs:

1. **Introduction (15s)**: *"This is Cheerio Resolve, a recovery flow for WhatsApp message templates rejected by Meta. It runs entirely on deterministic rules with zero hallucinations and zero external API dependencies."*
2. **Catalog & Context (30s)**: *"On Screen 1, we see our WhatsApp templates. Template TPL-1001 was rejected. Instead of forcing the business owner to submit a support ticket, they click 'Why isn't this working?'"*
3. **Diagnosis (30s)**: *"Screen 2 immediately diagnoses the root cause: promotional language was submitted under a Utility template category. Notice our transparency box explaining what cannot be automatically verified."*
4. **Proposed Fix & Confirmation (30s)**: *"Screen 3 displays an exact before-and-after diff. Per Guardrail G1, no change can be applied without explicit user confirmation. The user reviews the change and clicks Confirm and Resubmit."*
5. **Fresh-Read Verification (30s)**: *"Screen 4 shows the outcome. Critically, per Guardrail G5, we never claim the template is approved—it is marked 'Simulated Pending Review' after a fresh read from our mock store confirms the update."*
6. **Failure & Escalation (30s)**: *"When a fix cannot be verified (Template TPL-1003) or for human-led concerns like billing or security, Screen 5 produces a complete structured Case File. The user can copy the dossier to clipboard in one click for human support agents."*
7. **Manager View (15s)**: *"Finally, Screen 6 provides a full audit trail and manager KPIs showing zero safety violations across all sessions."*

---

## 5. Unresolved Risks & Future Work

1. **Synthetic Dataset Generalization**: While the rules engine scored 99.4% on the 170 synthetic cases, real-world customer tickets contain broader slang, unformatted image attachments, and regional dialects beyond the synthetic sample. Production deployment should implement continuous rule tuning based on real ticket audits.
2. **Provider Policy Shifts**: Meta frequently updates WhatsApp template categorization policies (e.g., rules around mixed transactional/promotional content). The playbook table (`src/data/playbooks.ts`) is designed to be updated via configuration rather than code refactoring.
3. **Multi-turn Clarification**: Currently, the system limits clarification to one question before human handoff (G13). With a fine-tuned small language model (like Laya, if evaluated in future phases), multi-turn guided drafting could be supported safely.

---

## 6. Honest AI Usage Log

In accordance with transparent disclosure standards:

- **AI Tools Used:** Antigravity / Gemini Agentic Workflow.
- **Role of AI:** Code scaffolding, deterministic regex tuning against the iteration dataset split, test implementation (Vitest), CSS layout generation, and workbook population scripting.
- **Role of Human (You):** Reviewing architectural decisions, setting guardrails (G1–G15), validating ethical boundaries (zero fake claims of approval, human-led escalation for billing/security), reviewing code diffs, and rewriting the submission narrative into your personal authentic voice.
- **Verification Guarantee:** 100% of tests (19/19) and static builds were executed and verified locally. Zero synthetic data was fabricated or treated as real Meta ground truth.
