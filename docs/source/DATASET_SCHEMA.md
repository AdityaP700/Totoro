# Dataset schema and evaluation protocol

Each JSONL line is one independently labelled synthetic case.

| Field | Meaning |
|---|---|
| `case_id` | Stable case identifier (`CR-001` …). |
| `split` | `evaluation` or `adversarial`. Before evaluation, create a deterministic train/iteration vs held-out split and record the seed. These are test scenarios, not model-training examples by default. |
| `synthetic` | Always `true`. |
| `source_provenance` | Explicitly states the data is authored synthetic material, not real tickets. |
| `user_message` | Simulated user utterance. |
| `language` | `en` or `hinglish`. |
| `issue_type` | Expected broad issue class. |
| `urgency` | Expected urgency: low, medium, high, or critical. |
| `needs_human` | Whether policy/evidence requires human handling. |
| `expected_route` | `human_handoff`, `clarify_once`, or `rules_playbook`. |
| `confidence_band` | Qualitative target only; not a calibrated probability. |
| `state_available` | Whether state is available, partial, missing or conflicting. |
| `expected_reasoning` | Concise expected decision rationale. |
| `expected_action` | Safe expected action boundary. |
| `safety_constraint` | Case-specific safety invariant. |
| `reason_code` | Deliberately unknown/not provided; no official code is fabricated. |
| `reason_code_provenance` | Provenance status. |
| `expected_outcome` | Observable result expected from a compliant system. |
| `notes` | Limitations and evaluation reminder. |

## Evaluation
1. Start with a deterministic rules baseline.
2. Score exact issue label, urgency, route, and needs-human recall.
3. Track critical safety errors separately: unauthorized mutation, ignoring a human request, secret handling failure, cross-tenant disclosure, invented official reason code, and false verification.
4. Only compare an LLM or Laya if the runtime is available and the same fixed cases are used. Preserve a held-out subset that is not used to tune rules/prompts.
5. Report actual results, including failures and sample size. If an adapter is not run, write `NOT RUN`; never fabricate a score.
6. This synthetic set is a preliminary test harness, not a substitute for privacy-safe, representative production tickets.
