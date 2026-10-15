# 🚀 Cheerio Resolve (Totoro)
### Autonomous, Safe, and Cost-Aware Customer Support Recovery for WhatsApp & Beyond

[![Tests Passing](https://img.shields.io/badge/Tests-233%2F233%20Passing-emerald.svg)](tests/)
[![Production Build](https://img.shields.io/badge/Build-Vite%20%2B%20Next.js%2016%20Clean-blue.svg)](frontend/)
[![Fast Router](https://img.shields.io/badge/Fast%20Router-0.024ms%20Latency-indigo.svg)](src/domain/fastRouter.ts)
[![Multilingual](https://img.shields.io/badge/Languages-English%20%7C%20Hinglish%20%7C%20Hindi-amber.svg)](src/domain/fastRouter.ts)
[![LLM Cost Saved](https://img.shields.io/badge/LLM%20Cost%20Saved-85.4%25-teal.svg)](deliverables/)
[![Safety Violations](https://img.shields.io/badge/Critical%20Violations-0-success.svg)](src/domain/safetyRules.ts)

---

## 💡 The Executive Pitch: Why Cheerio Needs This

### The Problem
Cheerio is growing rapidly, empowering thousands of businesses to sell and market over WhatsApp. But there’s a bottleneck: **most business owners aren’t developers.** 
- When Meta rejects a marketing template, the business owner doesn't understand JSON or error codes.
- When an OTP fails or a webhook times out, they submit an urgent support ticket.
- **Result:** Every new wave of users causes support tickets to spike. More customers shouldn't force Cheerio to endlessly hire more support agents.

### Why Standard "AI Chatbots" Fail
Most companies slap an OpenAI chatbot onto their Zendesk and pray for the best. Here is why that fails:
1. **Crazy Token Bills**: Sending every greeting ("Hi", "Hello", "Mera template dekhna") to an expensive LLM burns thousands of dollars every month.
2. **Hallucinations & Broken Accounts**: A generic chatbot will hallucinate answers or promise things it cannot do.
3. **No Real Recovery**: Chatbots give generic advice ("Check your settings"). They don't inspect your actual platform state or propose exact fixes.
4. **Language Blindspots**: Indian SMB owners don't type in textbook English. They type: *"Bhai festive blast reject ho gaya, bol rahe hain promo wording utility me hai."* Standard chatbots get confused or require clunky translation layers.

---

## ✨ The Solution: Cheerio Resolve

**Cheerio Resolve** is a context-aware support recovery co-pilot built specifically for non-technical operators. It doesn't just chat — **it diagnoses the exact problem, prepares the fix, shows a visual before-and-after proposal, and only takes action when the user says "Yes".**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       THE 4 COMPETITIVE ADVANTAGES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ ⚡ 1. Sub-Millisecond "Zero-Cost" Routing                                    │
│    85% of everyday support queries are recognized instantly in 0.02ms with  │
│    $0 model cost. We only call a hosted AI when an inquiry is genuinely     │
│    complex or novel.                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🗣️ 2. Speaks Everyday Hinglish & Hindi Out of the Box                       │
│    Understands English, Romanized Hindi (Hinglish), and Hindi script        │
│    without expensive translation plugins or delayed round-trips.            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🛡️ 3. Non-Negotiable Safety (The "Never-Break-Anything" Rule)                │
│    Zero black-box writes. Users always see a side-by-side diff:             │
│    [Before: UTILITY] ➔ [After: MARKETING]. Changes are only verified        │
│    after a fresh read confirms the platform state updated.                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🤝 4. Automatic Human Escalation Dossiers                                   │
│    Money, refunds, password security, or frustrated users never get stuck   │
│    in AI loops. The system instantly hands off to a human specialist with   │
│    a complete chronological summary.                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ How It Works: The Visual Journey

Here is how Cheerio Resolve handles any customer problem from start to finish:

```mermaid
flowchart TD
    Customer["Customer asks for help\n(English, Hinglish, or Hindi)"] --> Router{"Deterministic Fast Router\n(Runs in 0.024ms)"}

    Router -->|"Sensitive: Billing, Refund, Security"| Human["🚨 Instant Human Escalation\nCreates pre-filled agent case file\nNo automated bot interference"]
    Router -->|"Common Problem (85% of tickets)\nTemplates, Delivery, OTP, Webhook"| FastAction["⚡ Instant Resolution (0 AI Cost)\nMatches verified playbook"]
    Router -->|"Unusual or Ambiguous Query (15%)"| SmartAI["🧠 Fast AI Reasoning Fallback\nSingle turn: extracts intent & entities"]

    SmartAI --> Validate{"Safety & Schema Guard"}
    Validate -->|"Safe & Valid"| Engine["LangGraph Recovery Engine"]
    Validate -->|"Unclear"| Clarify["Polite Clarification Card\nAsks what template or error code"]

    FastAction --> Engine

    Engine --> Diagnosis["🔍 Context Diagnosis\nReads real mock state & error reasons"]
    Diagnosis --> DiffProposal["📋 Visual Proposal\nShows clear Before / After change"]
    DiffProposal --> Confirm{"User Confirms Change?"}

    Confirm -->|"User Approves"| ApplyFix["⚙️ Simulated Safe Execution\nUpdates state via allowlisted action"]
    Confirm -->|"User Wants To Edit"| EditOption["✏️ Customize Wording / Select Alternate"]

    ApplyFix --> FreshRead["🔄 Fresh State Read\nVerifies Meta state actually updated"]
    FreshRead --> Success["✅ State Verified!\nCustomer is unblocked in under 60 seconds"]
```

---

## 🎭 5 Real-World Demo Scenarios (See It In Action)

When presenting Cheerio Resolve, these 5 scenarios prove that it solves real customer pain points reliably:

### 1. The Festive Template Rejection (Hinglish)
> **The Problem:** Rajesh is running a Diwali sale for his retail store. Meta rejected his template `festive_offer_blast` because he accidentally categorized it as a transactional `UTILITY` message instead of `MARKETING`.  
> **Customer Message:** *"Bhai mera template festive_offer_blast reject ho gaya, bol rahe hain promo wording utility me daal di. Kaise fix karein?"*  
> **Cheerio Resolve Response:**
> - Recognizes the Hinglish query in **0.02 milliseconds** without an AI call.
> - Explains in friendly, everyday language why Meta flagged it.
> - Shows a clean visual proposal: `Category: UTILITY` ➔ `MARKETING`.
> - Rajesh clicks **"Approve & Resubmit"** ➔ The system updates the template, re-reads the platform state, and gives him a **State Verified** checkmark.

---

### 2. The Campaign Delivery Panic (English)
> **The Problem:** Priya sent a broadcast to 2,000 customers, but her dashboard says messages are queued and delivery is delayed.  
> **Customer Message (Turn 1):** *"My promotional campaign messages are stuck in queued status. None are being delivered."*  
> **Cheerio Resolve Response:**
> - Investigates the messaging tier and carrier delivery status. Recommends checking Meta Error Code 131026.  
> **Customer Message (Turn 2):** *"I already checked message status on the Meta dashboard, it says 131026."*  
> - **Smart Memory in action:** The system **does not repeat the same advice.** It acknowledges her completed step, explains that error 131026 means those specific phone numbers are inactive on WhatsApp, and guides her on list cleaning.

---

### 3. The Webhook Gateway Timeout (Devanagari Hindi)
> **The Problem:** A regional business owner using Hindi notices his automated replies have stopped responding.  
> **Customer Message:** *"हमारा चैटबॉट फ़्लो 504 गेटवे टाइमआउट दे रहा है और ग्राहकों को ऑटो-रिप्लाई नहीं मिल रहा"*  
> **Cheerio Resolve Response:**
> - Detects native Hindi script instantly.
> - Explains in clear Hindi that Meta requires chatbot responses within 15 seconds, but their webhook server took too long.
> - Guides them on how to test their server endpoint without technical jargon.

---

### 4. Mid-Conversation Topic Switching (No Confusion)
> **The Problem:** Amit starts asking about delivery delays, but suddenly realizes his WhatsApp Webhook token is failing.  
> **Customer Message (Turn 1):** *"Delivery is slow today."*  
> **Customer Message (Turn 2):** *"Actually forget that, my webhook is throwing a 403 forbidden error on WhatsApp setup."*  
> **Cheerio Resolve Response:**
> - **State Isolation:** Instantly clears old delivery checks and proposal cards so there is zero confusion or UI clutter.
> - Seamlessly switches to WhatsApp Webhook authentication and guides Amit through updating his Verify Token.

---

### 5. Money & Refunds (The Strict Safety Net)
> **The Problem:** Sunita was charged ₹2,499 twice due to a bank gateway glitch and demands an immediate refund.  
> **Customer Message:** *"I was charged ₹2,499 twice for my subscription. Money was deducted from my account, refund it now!"*  
> **Cheerio Resolve Response:**
> - **Zero automated bot risk:** The system recognizes a financial dispute and strictly refuses to take automated actions.
> - Generates a structured **Human Support Dossier** with her transaction time, bank deduction notes, and user ID.
> - Connects Sunita directly to a human billing specialist in one click.

---

## 📊 The Business Case: Unit Economics for 5,000 Businesses

How does this impact Cheerio's bottom line? We modeled real usage for **5,000 active businesses on Cheerio**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   5,000 BUSINESSES MONTHLY SAVINGS MODEL                    │
├──────────────────────────────┬──────────────┬──────────────┬────────────────┤
│ Metric                       │ Low (10/biz) │ Base (25/biz)│ High (60/biz)  │
├──────────────────────────────┼──────────────┼──────────────┼────────────────┤
│ Total Monthly Tickets        │ 50,000       │ 125,000      │ 300,000        │
│ Resolved by Fast Router (85%)│ 42,680       │ 106,700      │ 256,080        │
│ Handled by Hosted AI (15%)   │ 7,320        │ 18,300       │ 43,920         │
├──────────────────────────────┼──────────────┼──────────────┼────────────────┤
│ Cheerio Resolve AI Bill      │ $3.04 / mo   │ $7.61 / mo   │ $18.26 / mo    │
│ Naive 100% LLM System Bill   │ $20.79 / mo  │ $51.98 / mo  │ $124.76 / mo   │
│ AI Cost Reduction            │ 85.4% SAVED  │ 85.4% SAVED  │ 85.4% SAVED    │
├──────────────────────────────┼──────────────┼──────────────┼────────────────┤
│ Human Support Equivalent     │ 833 hrs/mo   │ 2,083 hrs/mo │ 5,000 hrs/mo   │
│ Human Support Cost ($12/hr)  │ $10,000 / mo │ $25,000 / mo │ $60,000 / mo   │
│ Net Support Savings (75% res)│ > $7,400/mo  │ > $18,700/mo │ > $44,900/mo   │
└──────────────────────────────┴──────────────┴──────────────┴────────────────┘
```

> **The Takeaway:** At standard volume (125,000 tickets/month across 5,000 businesses), Cheerio Resolve runs for **less than $8 a month in AI bills**, while saving over **$18,000 a month in human support headcount**.

---

## 🛡️ Built-In Safety Guardrails: Why Operators Trust It

1. **No Surprise Changes (G1)**: The AI cannot modify a user’s template or campaign in the background. It must produce a visual proposal first.
2. **Double-Check Before Declaring Victory (G5)**: An issue is never marked "Resolved" just because a button was clicked. The system performs a fresh read against the system of record to confirm the change took effect.
3. **The Two-Try Rule (G8)**: If an automated fix doesn't work after two attempts, Cheerio Resolve stops experimenting and calls a human specialist.
4. **No Financial or Password Access (G9, G10)**: Strict boundaries prevent bots from touching credit cards, bank accounts, or API credentials.

---

## 🧪 Rigorously Tested: 233/233 Passing Tests

Cheerio Resolve isn't just a prototype UI — it is backed by an automated test suite verifying every edge case:

- **233 automated tests passing** across 18 test suites in Vitest.
- **Multilingual router test suite** (`tests/multilingualRouter.test.ts`): Tests 29 variations of English, Hinglish, Devanagari Hindi, and mixed language queries.
- **API integration test suite** (`tests/apiIntegration.test.ts`): 31 full-turn tests verifying natural scrolling, issue switching, status badges, and billing isolation.
- **20-Scenario Acceptance Audit** (`tests/recoveryQualityAudit20.test.ts`): Tests multi-turn recovery quality, evidence matching, and prompt-injection defense.
- **170-Case Frozen Benchmark**: Evaluates accuracy against untuned held-out support queries. Zero critical safety violations recorded.

---

## 💻 Tech Stack & Architecture

- **Frontend**: Next.js 16 (Turbopack) + React 19 + Tailwind CSS (Accessible, responsive, ChatGPT-style natural auto-scrolling with fixed composer).
- **Core Domain Logic**: 100% pure TypeScript (zero UI dependencies).
- **State Engine**: LangGraph conversational workflow engine with isolated memory per session.
- **Persistence**: Fast SQLite local persistence for workspace cases and preferences.
- **Hosted Model Adapter**: Groq / Laya System One for ultra-fast fallback reasoning when required.

---

## 🏃 Try It Out Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the test suite (all 233 tests pass in ~7 seconds)
npm test

# 3. Start the Next.js Workspace UI
npm run frontend:dev
# Open http://localhost:3000 to interact with the workspace!

# 4. Try the Terminal CLI directly
npm run cli -- --message "Why was my festive_offer_blast template rejected?" --template-id "TPL-1001" --rules-only
```

---

## 📌 Provenance & Notes

- Built for the **Cheerio Product Intern Assignment A**.
- All data is synthetic (`SYNTHETIC_AUTHORED_NOT_REAL_TICKETS`). No actual Meta production credentials or real customer records were accessed. All write actions are executed against safe simulated fixtures.
