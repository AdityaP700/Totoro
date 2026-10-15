# Totoro Multilingual Customer Support Fast Router — 5,000 Synthetic Message Benchmark Audit

**Timestamp:** `2026-10-15T10:54:30.020Z`  
**Dataset Provenance:** `[SYNTHETIC BENCHMARK]` (Authored synthetic multilingual support distribution)  
**Total Evaluated Messages:** **5,000**  
**Critical Safety Violations:** **0** (Target: 0 — All guardrails enforced)

---

## Executive Summary

Totoro's **Cost-Aware Multilingual Customer-Support Router** incorporates a deterministic, sub-millisecond Fast Router as Layer 1 in the domain layer. All confident customer support intents across WhatsApp setup, template rejections, campaign delivery delays, and chatbot troubleshooting are resolved deterministically with **zero LLM calls** and **sub-millisecond latency**.

The hosted LLM is reserved strictly as a single-turn structured fallback for ambiguous or novel requests.

| Metric | Measured Value | Target / Requirement | Status |
| :--- | :--- | :--- | :--- |
| **Total Synthetic Workload** | **5,000 messages** | 5,000 messages | PASS |
| **Deterministic Fast-Routed** | **4268 (85.4%)** | > 85.0% | **EXCEEDED** |
| **LLM Calls Required** | **732 (14.6%)** | < 15.0% | **EXCEEDED** |
| **LLM Calls Per Message** | **0.1464** | < 0.20 calls/msg | **PASS** |
| **Fast Router Average Latency** | **0.0245 ms** | < 1.0 ms | **PASS (< 0.1ms)** |
| **Fast Router p99 Latency** | **0.0741 ms** | < 5.0 ms | **PASS** |
| **Critical Safety Violations** | **0** | 0 | **PASS (Zero Violations)** |
| **Cost Savings vs 100% LLM** | **85.36%** | > 80.0% | **EXCEEDED** |

---

## 1. Workload Language Distribution

| Language | Code | Message Count | Percentage |
| :--- | :--- | :--- | :--- |
| **English** | `en` | 2000 | 40.0% |
| **Hinglish / Romanized Hindi** | `hinglish` | 1750 | 35.0% |
| **Devanagari Hindi Script** | `hi` | 750 | 15.0% |
| **Mixed-Script (Devanagari + Latin)** | `mixed` | 500 | 10.0% |
| **Total** | | **5000** | **100.0%** |

---

## 2. Category Distribution

| Category | Message Count | Share of Total |
| :--- | :--- | :--- |
| **WhatsApp Setup** | 796 | 15.9% |
| **Template Rejection** | 792 | 15.8% |
| **Campaign Delivery** | 730 | 14.6% |
| **Chatbot Flow Troubleshooting** | 726 | 14.5% |
| **Conversational Flow** | 830 | 16.6% |
| **Mandatory Safety Guardrails** | 724 | 14.5% |
| **Ambiguous / Novel Fallbacks** | 402 | 8.0% |

---

## 3. Latency Profile

All fast router pattern matching runs in memory using compiled pre-cached regex trees.

- **Fast Router Min:** `0.0026 ms`
- **Fast Router Mean:** `0.0245 ms`
- **Fast Router p50:** `0.0149 ms`
- **Fast Router p90:** `0.0323 ms`
- **Fast Router p95:** `0.0413 ms`
- **Fast Router p99:** `0.0741 ms`
- **Fast Router Max:** `13.2154 ms`

*Conclusion:* Over 99% of routed messages execute in less than 0.5ms on a single thread, completely eliminating LLM network overhead and inference cost for routine support tickets.

---

## 4. Cost & Token Economic Analysis

### Assumptions & Rates
- **Model:** Groq Hosted `llama-3.3-70b-versatile`
- **Input Rate:** `$0.59 / 1,000,000 tokens`
- **Output Rate:** `$0.79 / 1,000,000 tokens`
- **Average Tokens per Structured Turn:** `450 input tokens` + `180 output tokens`
- **Cost per Structured LLM Call:** `$0.0004077`

### Benchmark Workload Comparison (5,000 Messages)
| Scenario | LLM Calls | Cost (USD) | Cost / 1k Msgs | Savings |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline (100% LLM Calls)** | 5,000 | $2.0385 | $0.4077 | 0.0% |
| **Totoro Fast Router Hybrid** | **732** | **$0.2984** | **$0.0597** | **85.36%** |

---

## 5. Safety & Guardrail Verification

- **Billing & Refund (G10):** 100% routed immediately to Human Escalation dossier without automated balance writes.
- **Security & Identity (G10):** 100% routed to authenticated human review without leaking credentials.
- **Adversarial Prompt Overrides:** 100% intercepted with verification safeguards intact; zero system prompt leakage.
- **Completed Check Repetition:** Prevented repetition of already performed checks by logging `[REPORTED]` evidence.
