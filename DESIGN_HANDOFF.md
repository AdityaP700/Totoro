# DESIGN_HANDOFF.md — Codex Design Handoff Specification

**Product:** Cheerio Resolve (Assignment A Prototype)  
**Implementation Owner:** Antigravity (Functional prototype, domain logic, state machine, tests)  
**Design Owner (Next Pass):** Codex (Visual design, typography, spacing, presentation refinement)  
**Status:** Functional UI complete; ready for visual styling pass  
**Stack:** React 18 + TypeScript + Vite (Vanilla CSS in `src/styles.css`, zero external UI frameworks)

---

## 1. Executive Summary & Boundaries

Cheerio Resolve is a context-aware recovery workflow for rejected WhatsApp message templates. The domain logic (`src/domain/`) is strictly separated from the presentation components (`src/ui/components/`). The user interface currently uses semantic, accessible HTML5 elements with basic responsive styling in `src/styles.css`.

### What Codex May Safely Change
- **Visual styling and themes**: Colors, font families, font sizes, line heights, shadows, borders, border radii, and iconography.
- **CSS Custom Properties**: Editing tokens in `:root` inside `src/styles.css` (e.g., `--color-primary`, `--color-surface`, `--radius-md`).
- **Layout & Spacing**: Grid/Flexbox adjustments, padding, margins, card layouts, and responsive breakpoints.
- **Micro-interactions & transitions**: Focus rings, button hover effects, subtle accordion transitions, loading spinners.
- **Visual hierarchy**: Typography weight hierarchy, badge styling, status pill chips, before/after diff highlight styling.

### What Codex MUST NOT Change (Non-Negotiable Guardrails)
1. **Guardrail G1 / D3 (Confirmation Gate)**: No simulated write operation may execute without explicit confirmation tied to the exact before/after change (`S3Proposal.tsx` button triggers confirmation state before calling `onConfirmAndSubmit`).
2. **Guardrail G2 / D8 (Allowlist)**: Only `category` and `text` edits are mutable. Rejection reason codes or status fields must never be editable.
3. **Guardrail G5 / D6 (Fresh-Read Verification)**: "Submitted / Pending Review" is **never** "Verified". The UI must distinguish between:
   - `SIMULATED_PENDING_REVIEW` (written to mock provider, awaiting approval).
   - `VERIFIED` (fresh read matches expected state).
   - `COULD_NOT_VERIFY` (fresh read indicates status mismatch or failed update).
4. **Guardrail G4 / G7 (Labels & Provenance)**: Visible `MOCK` / `SIMULATED` banners and source provenance tags (`DOCUMENTED`, `REPORTED`, `HYPOTHESIS`, `ASSUMPTION`, `SYNTHETIC`) must remain visible. Do not hide or remove them.
5. **Guardrail G8–G12 (Human-Led Zones)**: Billing, security, credential, abusive content, conflicting state, or 2+ failed attempts must route to the complete case file (`S5CaseFile.tsx`).
6. **State Machine & Data Contracts**: Do not bypass or alter `ResolveSession` transitions or modify component prop types.

---

## 2. Screen Inventory (S1–S6)

The application consists of 6 screens orchestrated via tabs and guided sequential buttons:

| Screen ID | Component | File Path | Primary Responsibility |
|---|---|---|---|
| **S1** | `S1TemplateList` | `src/ui/components/S1TemplateList.tsx` | WhatsApp template catalog, fixture switcher (`TPL-1001`, `TPL-1002`, `TPL-1003`), filter, and entry trigger ("Why isn't this working?"). |
| **S2** | `S2Diagnosis` | `src/ui/components/S2Diagnosis.tsx` | Diagnostic explanation, evidence checklist, known boundaries ("What cannot be verified"), and optional user clarification questions. |
| **S3** | `S3Proposal` | `src/ui/components/S3Proposal.tsx` | Side-by-side exact before/after diff viewer, per-change rationales, scope boundary disclosure, confirmation gate, and decline option. |
| **S4** | `S4Outcome` | `src/ui/components/S4Outcome.tsx` | Simulated submission feedback, 2-second fresh-read verification check, correlation ID, audit event summary, and outcome state. |
| **S5** | `S5CaseFile` | `src/ui/components/S5CaseFile.tsx` | Structured human escalation file, diagnostic context, attempted actions, clipboard copy button, and SLA expectation banner. |
| **S6** | `S6ManagerView` | `src/ui/components/S6ManagerView.tsx` | Manager dashboard with aggregated session metrics, top issue frequencies, and full chronological audit event timeline. |

---

## 3. Screen Specifications & State Matrix

### Screen S1: Template List & Context Entry (`S1TemplateList.tsx`)
- **Props**:
  - `templates: TemplateRecord[]`: Array of template fixtures.
  - `selectedTemplateId: string | null`: Currently active template ID.
  - `onSelectTemplate: (id: string) => void`: Select template callback.
  - `onStartDiagnosis: (templateId: string) => void`: Triggers transition to S2.
- **Key States**:
  - *Loaded*: Renders table of templates with Status (`REJECTED`, `APPROVED`, etc.), reason code, and last updated timestamp.
  - *Active selection*: Highlights selected row; activates "Why isn't this working?" primary CTA.
  - *Filter*: Input field filters by template name or ID.
  - *Fixture switch chips*: Direct 1-click pills to test `TPL-1001` (Flash Sale), `TPL-1002` (OTP Alert), or `TPL-1003` (Account Verification).

### Screen S2: Context-Aware Diagnosis (`S2Diagnosis.tsx`)
- **Props**:
  - `template: TemplateRecord`: Selected template record.
  - `diagnosis: DiagnosisReport | null`: Generated diagnostic report.
  - `onAnswerClarification: (answer: string) => void`: Submits clarification.
  - `onProceedToProposal: () => void`: Proceeds to S3 (rules playbook).
  - `onEscalateToHuman: (reason?: string) => void`: Escalates to S5 (case file).
- **Key States**:
  - *Empty/No Diagnosis*: Info card prompting user to select a template from S1.
  - *Playbook Available*: Renders issue summary, confidence level, evidence list with provenance badges, "What cannot be verified" box, and "Review Fix Proposal" CTA.
  - *Escalation Required*: Renders escalation notice (e.g. for billing/security issues) with "Handoff to Support Agent" CTA.
  - *Clarification Active*: Displays clarifying question with options or custom text input.

### Screen S3: Proposed Fix & Confirmation Gate (`S3Proposal.tsx`)
- **Props**:
  - `proposal: ProposedFix | null`: The concrete proposal from domain playbook.
  - `onConfirmAndSubmit: () => void`: Submits simulated fix to mock store.
  - `onDecline: () => void`: Declines fix proposal.
  - `onBackToDiagnosis: () => void`: Returns to S2.
- **Key States**:
  - *Diff View*: Side-by-side or stacked Before/After diff (`Original` vs `Proposed`) with highlighted line differences.
  - *Rationale List*: List of reasons for each change with policy reference tags.
  - *Confirmation Gate*: Before submission, user must check an explicit acknowledgement or click "I confirm this fix" to unlock "Submit Update".
  - *Decline State*: "Decline Proposal" button provides a safe exit path without mutating mock state.

### Screen S4: Outcome & Fresh-Read Verification (`S4Outcome.tsx`)
- **Props**:
  - `outcome: OutcomeReport | null`: Output from submission and fresh read.
  - `onViewCaseFile: () => void`: Navigates to S5.
  - `onViewManagerAudit: () => void`: Navigates to S6.
  - `onResetDemo: () => void`: Resets session to S1.
- **Key States**:
  - *Verifying (Loading)*: Displays animated spinner or pulse indicator with message: `"Performing fresh-read verification against mock store..."`.
  - *SIMULATED_PENDING_REVIEW*: Successfully written; WhatsApp approval is pending (never falsely marked "Approved").
  - *VERIFIED*: Fresh read confirms simulated state matches expected payload.
  - *COULD_NOT_VERIFY*: State mismatch detected during fresh read; offers handoff to human support.
  - *DECLINED*: User declined proposal; displays audit trail with option to escalate or return to catalog.

### Screen S5: Support Escalation Case File (`S5CaseFile.tsx`)
- **Props**:
  - `caseFile: CaseFile | null`: Complete structured handoff dossier.
  - `onResetDemo: () => void`: Resets session.
- **Key States**:
  - *Rendered Dossier*: Displays Case File ID, severity badge, reason code, checks performed, attempted self-recovery actions, and recommended human action.
  - *Interactive Copy*: "Copy Case Summary" button formats full Markdown case file and copies to clipboard with temporary `"✓ Copied to clipboard!"` confirmation.

### Screen S6: Manager Analytics & Audit Timeline (`S6ManagerView.tsx`)
- **Props**:
  - `events: AuditEvent[]`: Full chronological audit log of all domain events.
  - `totalSessions: number`: Total sessions counter.
- **Key States**:
  - *KPI Summary Cards*: Total Sessions, Rules Baseline Share, Human Escalations, Safety Violations (always 0).
  - *Audit Table*: Filterable timeline of timestamped events with actor, event type, correlation ID, and payload preview.

---

## 4. Design Tokens & Styling Guide

The current application uses CSS variables in `src/styles.css`:

```css
:root {
  /* Typography */
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;

  /* Colors */
  --color-primary: #1e40af;       /* Cheerio / Enterprise Blue */
  --color-primary-hover: #1d4ed8;
  --color-surface: #ffffff;
  --color-surface-muted: #f8fafc;
  --color-border: #e2e8f0;
  --color-text: #0f172a;
  --color-text-muted: #64748b;

  /* Status Colors */
  --color-success: #15803d;       /* Green for Verified / Approved */
  --color-warning: #b45309;       /* Amber for Pending / Warning */
  --color-danger: #b91c1c;        /* Red for Rejected / Escalated */
  --color-info: #0369a1;          /* Cyan for Info / Simulation */

  /* Spacing & Radii */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

### Codex Guidance for Styling Pass:
- Maintain **WCAG 2.1 AA** color contrast ratio (minimum 4.5:1 for normal text).
- Use responsive design for mobile (≥360px), tablet (≥768px), and desktop (≥1024px).
- Avoid heavy icon libraries (prefer lightweight SVG or Lucide icons if added).
- Keep file sizes minimal; do not install large external UI component libraries (MUI, AntD, Chakra) that increase bundle weight.

---

## 5. End-to-End Test Journeys for Validation

Codex can verify that design changes have not broken functionality using these test flows:

1. **Journey 1: Happy Path (Fix & Resubmit)**
   - Click `TPL-1001` (Promotional Sale).
   - Click `"Why isn't this working?"` -> opens S2 Diagnosis.
   - Click `"Review Fix Proposal"` -> opens S3 Proposal.
   - Notice the diff: category changes from `UTILITY` to `MARKETING`, URL placeholder removed.
   - Check confirmation box and click `"Confirm and Resubmit"` -> opens S4 Outcome.
   - Status verifies as `SIMULATED_PENDING_REVIEW` with fresh read confirmation.
2. **Journey 2: Decline Path**
   - In S3 Proposal, click `"Decline Proposal"`.
   - Opens S4 Outcome in `DECLINED` state; audit trail records refusal without mutating store.
3. **Journey 3: Escalation / Safety Path**
   - Click `TPL-1002` (Account verification with suspected credential/policy issue) or in S2 click `"Transfer to Support Agent"`.
   - Opens S5 Case File with full diagnostic context and one-click clipboard copy.

---

## 6. Verification Commands
- `npm test`: Runs domain unit tests and 170-case evaluation benchmark.
- `npm run build`: Executes `tsc -b && vite build` in strict mode.
- `npm run dev`: Boots local development server at `http://localhost:5173`.
