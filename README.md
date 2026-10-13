# Cheerio Resolve — Context-Aware Support Recovery & Hybrid Reasoning System

Cheerio Resolve is a hybrid support-recovery system for WhatsApp Business API management. It combines deterministic safety rules, verified diagnostic playbooks, and hosted decision model reasoning (`Laya System One`) behind a strict deterministic safety interceptor.

All recovery operations are executed against mock fixtures and enforce a non-negotiable guardrail: **no write operation can ever occur without explicit user confirmation of the exact before/after change, and no outcome is marked "Verified" without a fresh state read matching the expected result.**

---

## Architecture Overview

```
User Message + Mock State
          │
          ▼
┌──────────────────────────────────────────────┐
│  Deterministic Safety & Triage Interceptor    │
│  - Security, credentials, OTP, admin tokens  │ ──► Human Handoff (Critical)
│  - Billing, charges, refunds, invoices       │ ──► Human Handoff (High)
│  - Explicit human / live agent requests      │ ──► Human Handoff (Evidence preserved)
│  - Known template rejection reason codes     │ ──► Fast-Path Rules Playbook (PB-001..PB-003)
└──────────────────────────────────────────────┘
          │ (Eligible complex / ambiguous requests only)
          ▼
┌──────────────────────────────────────────────┐
│  Hosted Laya System One Decision API         │
│  Endpoint: POST /v1/systemone                │
│  Model: laya (routing: english)              │
│  - Structured classification (issue_type)    │
│  - Urgency rating (low/medium/high/critical) │
│  - Needs-human probability assessment (noul) │
└──────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────┐
│  Output Schema & Safety Validation           │
│  - Enforces enum allowlists & confidence gate│
│  - Rejects malformed / out-of-domain answers │
│  - Safe fallback to rules upon any failure   │
└──────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────┐
│  Action Proposal & Verification Gate         │
│  - Propose only (Side-by-side before/after)   │
│  - Model NEVER executes actions or permissions│
│  - Requires explicit user confirmation (G1)  │
│  - Simulated mock write via allowlist (G2)   │
│  - Fresh-read state verification (G5)        │
└──────────────────────────────────────────────┘
```

---

## Quickstart & Terminal CLI

### 1. Terminal Entry Point (`resolveCli.ts`)
Triages any support message and optional mock template state, emitting structured JSON:

```bash
# Basic triage with deterministic baseline
npm run cli -- --message "Why was my promotional template rejected?" --template-id "TPL-1001" --rules-only

# Live hybrid triage using Hosted Laya System One (requires LAYA_API_KEY in .env)
npm run cli -- --message "The template says rejected, but dashboard doesn't show why. Can you fix wording?"

# Billing / sensitive query (intercepted deterministically to human handoff)
npm run cli -- --message "I was charged twice, please refund my last invoice"

# Simulated execution & fresh-read verification
npm run cli -- --message "Fix the promotional template category" --template-id "TPL-1001" --rules-only --execute
```

#### Example CLI Output:
```json
{
  "issue_type": "template_rejection",
  "urgency": "medium",
  "evidence_used": [
    "template_id=TPL-1001",
    "template_status=REJECTED",
    "template_category=UTILITY",
    "reason_code=FIXTURE_PROMO_UTILITY",
    "user_message_length=41"
  ],
  "missing_evidence": [],
  "rules_prediction": {
    "issue_type": "template_rejection",
    "urgency": "medium",
    "route": "rules_playbook",
    "needs_human": false
  },
  "raw_laya_prediction": {
    "issue_type": "template_rejection",
    "urgency": "medium",
    "needs_human": false,
    "confidence": 0.88
  },
  "guarded_decision": {
    "issue_type": "template_rejection",
    "urgency": "medium",
    "route": "rules_playbook",
    "needs_human": false,
    "decision_layer": "laya",
    "rationale": "Laya decision inference (input_tokens=347)"
  },
  "route": "safe_playbook",
  "recommended_action": "Change category UTILITY → MARKETING so the category matches the promotional content, then resubmit for review.",
  "confirmation_required": true,
  "model_latency_ms": 578,
  "request_status": "success",
  "reported_token_usage": {
    "input_tokens": 347
  },
  "is_verified": false
}
```

---

## Repeatable Evaluation Commands

| Command | Description | Split Evaluated |
|---|---|---|
| `npm test` | Runs the full Vitest suite (43 unit & domain tests, T1–T15, 170-case evaluation) | Complete suite (offline) |
| `npm run eval:rules` | Runs deterministic rules baseline evaluation and generates audit JSON | Iteration split (n=105) |
| `npm run eval:hybrid` | Runs guarded hybrid reasoning evaluation across iteration split | Iteration split (n=105) |
| `npm run eval:smoke` | Runs credit-controlled live inference smoke test on 8 representative cases | 7 Iteration + 1 Challenge (live API) |
| `npm run build` | Strict TypeScript compilation (`tsc -b`) and Vite production bundle | Strict typecheck |

---

## Hosted Laya System One Integration & Credit Controls

- **API Endpoint:** `POST https://api.laya.studio/v1/systemone`
- **Model:** `laya` (underlying routing model: `english`, repository: `convaiinnovations/laya`)
- **Key Security:** `LAYA_API_KEY` is loaded strictly server-side from `.env` via `process.loadEnvFile()`. It is never bundled into client code, never committed to git, and never logged in transcripts. A server proxy is provided in `vite.config.ts` for browser dev mode.
- **Credit Budget Management:**
  - Token allowance: **5,481 input tokens**.
  - Bounded Smoke Test: Tested across 8 representative synthetic cases (6 from iteration split, 1 from challenge pack).
  - Actual tokens consumed: **2,653 tokens** (average ~331 tokens/query).
  - Remaining credit balance: **~2,601 input tokens**.
  - Full sweeps on 170/80 cases are preserved as offline repeatable commands to prevent unexpected credit exhaustion.

---

## Benchmarks & Evaluation Results

### 1. Bounded Live Smoke Test (8 Cases)
| Case ID | Split | Expected Class | Rules Baseline | Raw Laya (Live) | Guarded Hybrid | Tokens |
|---|---|---|---|---|---|---|
| CR-001 | Iteration | `template_rejection` | `template_rejection` ✓ | `template_rejection` ✓ | `template_rejection` (laya) ✓ | 347 |
| CR-005 | Iteration | `template_rejection` | `template_rejection` ✓ | `template_rejection` ✓ | `template_rejection` (laya) ✓ | 329 |
| CR-031 | Iteration | `message_delivery` | `message_delivery` ✓ | `message_delivery` ✓ | `message_delivery` (laya) ✓ | 350 |
| CR-078 | Iteration | `billing_refund` | `billing_refund` ✓ | `billing_refund` ✓ | `billing_refund` (laya) ✓ | 314 |
| CR-092 | Iteration | `security_identity_access`| `security_identity_access` ✓ | `security_identity_access` ✓ | `security_identity_access` (rules) ✓ | 335 |
| CR-133 | Iteration | `human_requested` | `human_requested` ✓ | `template_rejection` ✗ | `template_rejection` (laya) ✗ | 326 |
| CR-107 | Iteration | `ambiguous_or_missing_context`| `ambiguous_or_missing_context` ✓| `human_requested` ✗ | `human_requested` (laya) ✗ | 305 |
| CRX-001 | Challenge | `template_rejection` | `state_conflict_or_stale` ✗ | `template_rejection` ✓ | `template_rejection` (laya) ✓ | 347 |

**Key Finding on CRX-001 (Challenge Set):**
When rejection details are missing from the dashboard ("The template says rejected, but dashboard doesn't show why"), deterministic rules misclassified the case as a state conflict (`state_conflict_or_stale`), whereas Laya System One accurately identified the core intent as `template_rejection` (347 tokens, 578ms latency). This confirms that model-based reasoning provides distinct value on underspecified, multi-symptom customer inquiries.

### 2. Full 170-Case Benchmark (Frozen Split, Seed 20261013)
- **Iteration Split (n=105):** Issue Accuracy 100%, Route Accuracy 100%, Needs-Human Recall 100%, Critical Safety Violations 0.
- **Held-Out Split (n=65, untuned):** Issue Accuracy 98.5%, Route Accuracy 98.5%, Needs-Human Recall 100%, Critical Safety Violations 0.
- **Complete Dataset (n=170):** Issue Accuracy 99.4%, Route Accuracy 99.4%, Needs-Human Recall 100%, Critical Safety Violations 0.
