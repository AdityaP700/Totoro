import type {
  AuditEvent,
  Diagnosis,
  DiagnosisSummary,
  InteractionState,
  MockTemplate,
  Proposal,
  RecommendedNextStep,
  SpecialistAssignment,
  Stage,
  TriageResult,
  VerificationResult,
} from "../../../src/domain/types";
import type { CustomerFacingResponse } from "../../../src/domain/conversationalResponse";
import type { CaseAuditTrail } from "../../../src/domain/evidenceTrail";

export interface ResolveRequest {
  sessionId?: string;
  message: string;
  templateId?: string;
  userRole?: string;
}

export interface ResolveResponse {
  sessionId: string;
  caseId: string;
  stage: Stage;
  interactionState: InteractionState;
  customerExplanation: CustomerFacingResponse;
  triage: TriageResult;
  diagnosis: Diagnosis | null;
  proposal: Proposal | null;
  clarificationQuestion?: string | null;
  handoffReason?: string | null;
  handoffRequestedAt?: string | null;
  specialistAssignment?: SpecialistAssignment | null;
  closedAt?: string | null;
  isVerified: boolean;
  events: AuditEvent[];
  templateSnapshot?: MockTemplate | null;
  ruleTrace: string;
  evidence: string;
  sources: string[];
  reasoningSteps: string[];
  executionVerification: [string, string][];
  latencyMs: number;
  auditTrail?: CaseAuditTrail;
  title: string;
  category: string;
  statusBadge: string;
  guardrails: string;
  contextEvaluated: string;
  verificationStatus: string;
  diagnosisSummary?: DiagnosisSummary | null;
  recommendedNextStep?: RecommendedNextStep | null;
  completedChecks?: string[];
  businessContext?: any;
  messages?: Array<{ role: "user" | "assistant"; text: string; timestamp: string }>;
}

export interface ActionRequest {
  sessionId: string;
  action:
    | "approve"
    | "decline"
    | "human"
    | "check_message_status"
    | "preview_human"
    | "cancel_human"
    | "assign_specialist"
    | "start_investigation"
    | "close_case";
  idempotencyKey?: string;
  customReason?: string;
  specialistName?: string;
  queue?: string;
}

export interface ActionResponse {
  sessionId: string;
  caseId: string;
  stage: Stage;
  interactionState: InteractionState;
  actionResult?: string | null;
  verification?: VerificationResult | null;
  isVerified: boolean;
  customerExplanation: CustomerFacingResponse;
  handoffReason?: string | null;
  handoffRequestedAt?: string | null;
  specialistAssignment?: SpecialistAssignment | null;
  closedAt?: string | null;
  events: AuditEvent[];
  templateAfter?: MockTemplate | null;
  auditTrail?: CaseAuditTrail;
  blocked?: string;
  error?: string;
  statusBadge: string;
  verificationStatus: string;
  executionVerification: [string, string][];
  diagnosisSummary?: DiagnosisSummary | null;
  recommendedNextStep?: RecommendedNextStep | null;
  completedChecks?: string[];
  businessContext?: any;
  attemptsFailed?: number;
  messages?: Array<{ role: "user" | "assistant"; text: string; timestamp: string }>;
}

export interface SessionSummary {
  sessionId: string;
  caseId: string;
  originalMessage: string;
  templateId?: string;
  stage: Stage;
  statusBadge: string;
  createdAt: string;
  updatedAt: string;
  eventCount: number;
  isVerified: boolean;
  needsHuman: boolean;
}

export interface ReportData {
  baselineAccuracy: number;
  datasetCasesCount: number;
  safetyScore: number;
  activeSessionsCount: number;
  verifiedRecoveriesCount: number;
  humanHandoffsCount: number;
  sessions: SessionSummary[];
}
