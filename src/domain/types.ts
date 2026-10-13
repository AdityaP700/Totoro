/**
 * Core domain types for Cheerio Resolve.
 *
 * Vocabulary note: issue/urgency/route values intentionally match the synthetic
 * evaluation dataset (docs/source/DATASET_SCHEMA.md) so the rules baseline can be
 * scored with exact-match metrics. The implementation handoff's illustrative
 * enums differ in casing; deviation recorded in DECISION_LOG.md.
 */

export type TemplateStatus = "REJECTED" | "PENDING" | "APPROVED" | "UNKNOWN";
export type TemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION";

/** Every mock value in the prototype carries this label (G7). */
export type SourceLabel = "MOCK" | "SIMULATED";

export interface MockTemplate {
  id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  text: string;
  status: TemplateStatus;
  /** Fixture code — never asserted as an official provider code (D-007, G7, D10). */
  reasonCode: string | null;
  reasonCodeProvenance: "FIXTURE_CODE_NOT_ASSERTED_AS_OFFICIAL";
  lastUpdated: string;
  sourceLabel: SourceLabel;
  /** What the simulated resubmission will do when the change is approved. */
  simulatedResubmitOutcome: "pending" | "no_change";
}

export type IssueType =
  | "template_rejection"
  | "number_waba_setup"
  | "message_delivery"
  | "chatbot_flow"
  | "integration_webhook"
  | "billing_refund"
  | "security_identity_access"
  | "human_requested"
  | "state_conflict_or_stale"
  | "ambiguous_or_missing_context";

export type Urgency = "low" | "medium" | "high" | "critical";
export type Route = "human_handoff" | "clarify_once" | "rules_playbook";
export type ConfidenceBand = "low" | "medium" | "high";

export interface TriageResult {
  issueType: IssueType;
  urgency: Urgency;
  needsHuman: boolean;
  route: Route;
  /** Rule-derived 0..1 score; not a calibrated probability. */
  confidence: number;
  confidenceBand: ConfidenceBand;
  rationale: string;
  missingInformation: string[];
  decisionLayer?: "rules" | "laya" | "groq" | "fallback";
  latencyMs?: number;
}

/** The single allowlisted write-like operation (G2/D8). */
export type AllowlistedOperation = "resubmit_template";

export interface ProposedChange {
  field: "text" | "category";
  before: string;
  after: string;
  reason: string;
}

export interface Proposal {
  operation: AllowlistedOperation;
  targetId: string;
  playbookId: string | null;
  description: string;
  changes: ProposedChange[];
  requiresConfirmation: true;
}

export interface ConfirmationRecord {
  approvedAt: string;
  /** Serialized exact before/after the user confirmed (G1). */
  exactBefore: string;
  exactAfter: string;
  idempotencyKey: string;
}

export type Stage =
  | "ENTRY"
  | "READ_STATE"
  | "TRIAGE"
  | "CLARIFY_ONCE"
  | "DIAGNOSE"
  | "PROPOSE"
  | "CONFIRM"
  | "APPLY_SIMULATED_ACTION"
  | "VERIFY"
  | "RESOLVED"
  | "PENDING"
  | "DECLINED"
  | "HANDOFF";

export type EventType =
  | "CASE_OPENED"
  | "STATE_READ"
  | "TRIAGED"
  | "CLARIFICATION_ASKED"
  | "CLARIFICATION_ANSWERED"
  | "DIAGNOSED"
  | "FIX_PROPOSED"
  | "FIX_DECLINED"
  | "USER_CONFIRMED"
  | "ACTION_SIMULATED"
  | "STATE_VERIFIED"
  | "HANDOFF_CREATED";

export interface AuditEvent {
  eventId: string;
  correlationId: string;
  caseId: string;
  timestamp: string;
  eventType: EventType;
  outcome: string;
  sourceLabel: SourceLabel;
  details: Record<string, unknown>;
}

export interface Diagnosis {
  playbookId: string | null;
  reasonCode: string | null;
  plainExplanation: string;
  /** Exact template field/line the playbook keyed on. */
  evidenceUsed: string[];
  cannotVerify: string[];
}

export interface VerificationResult {
  verified: boolean;
  observedStatus: TemplateStatus | "UNAVAILABLE";
  expectedStatus: TemplateStatus;
  statement: string;
}

export interface CaseState {
  caseId: string;
  correlationId: string;
  stage: Stage;
  originalMessage: string;
  language: string;
  templateId: string | null;
  templateSnapshot: MockTemplate | null;
  triage: TriageResult | null;
  clarify: { question: string; askedAt: string; answer: string | null } | null;
  diagnosis: Diagnosis | null;
  proposal: Proposal | null;
  confirmation: ConfirmationRecord | null;
  actionResult: string | null;
  verification: VerificationResult | null;
  attemptsFailed: number;
  declined: boolean;
  handoffReason: string | null;
  startedAt: string;
  updatedAt: string;
  events: AuditEvent[];
}
