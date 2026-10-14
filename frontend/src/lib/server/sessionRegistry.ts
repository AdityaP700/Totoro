/**
 * Cheerio Resolve — In-Memory Session Registry
 *
 * NOTE ON STORAGE & PERSISTENCE ARCHITECTURE:
 * This registry stores session state in the Node.js server process memory.
 * - Suitable for local prototyping, evaluation, and developer demonstration.
 * - State is volatile and isolated per Node process; server restart resets active sessions.
 * - PRODUCTION REQUIREMENT: In multi-instance or serverless production deployments,
 *   replace this in-memory map with a distributed database or cache (e.g. Redis,
 *   PostgreSQL) with optimistic locking or idempotency keys across requests.
 */

import { ResolveSession, detectTemplateIdFromText, type SessionDeps } from "../../../../src/domain/stateMachine";
import { createMockStore, type MockStore } from "../../../../src/domain/mockStore";
import { RulesReasoningAdapter } from "../../../../src/domain/adapter";
import { generateCustomerFacingResponse } from "../../../../src/domain/conversationalResponse";
import { buildCaseAuditTrail } from "../../../../src/domain/evidenceTrail";
import { assessRecoveryUncertainty } from "../../../../src/domain/uncertainty";
import { defaultPlaybookRegistry } from "../../../../src/domain/playbookRegistry";
import type { SessionSummary, ResolveResponse } from "../apiTypes";
import { repositories, type StoredCase } from "./persistence";

export interface ActiveSessionRecord {
  workspaceId: string;
  sessionId: string;
  caseId: string;
  session: ResolveSession;
  store: MockStore;
  userRole?: string;
  templateId: string;
  originalMessage: string;
  messages: Array<{ role: "user" | "assistant"; text: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
  lastActive: number;
}

// Global server-side registry (persists across Next.js API calls in same process)
const registry = new Map<string, ActiveSessionRecord>();

export function detectTemplateIdFromMessage(message: string): string | undefined {
  return detectTemplateIdFromText(message);
}

export function createNewSession(workspaceId: string, options: {
  message: string;
  templateId?: string;
  userRole?: string;
  sessionId?: string;
}): ActiveSessionRecord {
  let sessionId = options.sessionId;
  if (!sessionId || repositories.getCase(workspaceId, sessionId)) {
    sessionId = `SES-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  }
  const explicitTemplateId =
    options.templateId && options.templateId !== "auto"
      ? options.templateId
      : detectTemplateIdFromMessage(options.message);
  const store = createMockStore();

  let idCounter = 1000;
  const deps: SessionDeps = {
    store,
    now: () => new Date().toISOString(),
    newId: (prefix: string) => `${prefix}-${idCounter++}-${Date.now().toString(36).slice(-4)}`,
    reasoningAdapter: new RulesReasoningAdapter(),
  };

  const session = new ResolveSession(deps, {
    templateId: explicitTemplateId,
    message: options.message,
  });

  const nowStr = deps.now();
  const record: ActiveSessionRecord = {
    workspaceId,
    sessionId,
    caseId: session.state.caseId,
    session,
    store,
    userRole: options.userRole,
    templateId: session.state.templateId || explicitTemplateId || "",
    originalMessage: options.message,
    messages: [{ role: "user", text: options.message, timestamp: nowStr }],
    createdAt: nowStr,
    updatedAt: nowStr,
    lastActive: Date.now(),
  };

  registry.set(sessionId, record);
  persist(record);
  return record;
}

export function getSession(sessionId: string): ActiveSessionRecord | undefined;
export function getSession(workspaceId: string, sessionId: string): ActiveSessionRecord | undefined;
export function getSession(workspaceOrSessionId: string, maybeSessionId?: string): ActiveSessionRecord | undefined {
  const workspaceId = maybeSessionId ? workspaceOrSessionId : undefined;
  const sessionId = maybeSessionId || workspaceOrSessionId;
  const record = registry.get(sessionId);
  if (record && (!workspaceId || record.workspaceId === workspaceId)) {
    record.lastActive = Date.now();
    return record;
  }
  if (!workspaceId) return undefined;
  const stored = repositories.getCase(workspaceId, sessionId);
  if (!stored) return undefined;
  const restored = hydrate(stored);
  registry.set(sessionId, restored);
  return restored;
}

export function deleteSession(workspaceId: string, sessionId: string): boolean {
  if (registry.get(sessionId)?.workspaceId === workspaceId) registry.delete(sessionId);
  return repositories.deleteCase(workspaceId, sessionId);
}

export function listSessions(workspaceId: string): SessionSummary[] {
  const summaries: SessionSummary[] = [];
  for (const stored of repositories.listCases(workspaceId)) {
    const cached = registry.get(stored.sessionId);
    const record = cached?.workspaceId === workspaceId ? cached : hydrate(stored);
    const s = record.session.state;
    let statusBadge = "Diagnosing";
    if (s.stage === "PENDING" && s.verification?.verified) {
      statusBadge = "Verified (Pending Review)";
    } else if (s.stage === "HANDOFF") {
      statusBadge = "Human Escalation";
    } else if (s.stage === "PROPOSE" || s.stage === "CONFIRM") {
      statusBadge = "Action Proposed";
    } else if (s.stage === "CLARIFY_ONCE") {
      statusBadge = "Clarification Needed";
    }

    summaries.push({
      sessionId: record.sessionId,
      caseId: record.caseId,
      originalMessage: record.originalMessage,
      templateId: record.templateId,
      stage: s.stage,
      statusBadge,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      eventCount: s.events.length,
      isVerified: s.verification?.verified ?? false,
      needsHuman: s.stage === "HANDOFF" || (s.triage?.needsHuman ?? false),
    });
  }
  return summaries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function resetAllSessions(): void {
  registry.clear();
  // Kept for the legacy integration suite; never exposed as a product route.
  repositories.clearWorkspaceForTest("test-demo-workspace");
}

export function persist(record: ActiveSessionRecord): void {
  record.updatedAt = new Date().toISOString();
  repositories.saveCase({ id: record.caseId, workspaceId: record.workspaceId, sessionId: record.sessionId,
    title: record.originalMessage.slice(0, 100), templateId: record.templateId, originalMessage: record.originalMessage,
    state: record.session.state, templates: record.store.listTemplates(), createdAt: record.createdAt,
    updatedAt: record.updatedAt, messages: record.messages });
}

function hydrate(stored: StoredCase): ActiveSessionRecord {
  const store = createMockStore();
  (stored.templates as Array<Record<string, unknown>>).forEach((template) => store.updateTemplate(String(template.id), (target) => Object.assign(target, template)));
  let id = 0;
  const deps: SessionDeps = { store, now: () => new Date().toISOString(), newId: (prefix) => `${prefix}-${id++}`, reasoningAdapter: new RulesReasoningAdapter() };
  const session = new ResolveSession(deps, { templateId: stored.templateId || "TPL-1001", message: stored.originalMessage });
  Object.assign(session.state, stored.state);
  return { workspaceId: stored.workspaceId, sessionId: stored.sessionId, caseId: stored.id, session, store,
    templateId: stored.templateId, originalMessage: stored.originalMessage, messages: stored.messages,
    createdAt: stored.createdAt, updatedAt: stored.updatedAt, lastActive: Date.now() };
}

/**
 * Transforms an internal session state into the customer-facing response structure.
 */
export function buildResolveResponse(record: ActiveSessionRecord, latencyMs: number = 12): ResolveResponse {
  const session = record.session;
  const s = session.state;

  const uncertainty = assessRecoveryUncertainty({
    message: record.originalMessage,
    rulesResult: s.triage!,
    templateSnapshot: s.templateSnapshot,
    previousAttempts: s.attemptsFailed,
  });

  const customerExplanation = generateCustomerFacingResponse({
    triage: s.triage!,
    templateSnapshot: s.templateSnapshot,
    verification: s.verification,
    previousAttempts: s.attemptsFailed,
    uncertaintyStatus: uncertainty.status,
    hasStateConflict: uncertainty.signals.hasStateConflict,
    clarifyingQuestion: s.clarify?.question,
  });

  const playbook = defaultPlaybookRegistry.findForContext({
    reasonCode: s.templateSnapshot?.reasonCode,
    issueType: s.triage!.issueType,
    templateSnapshot: s.templateSnapshot,
  });

  const auditTrail = buildCaseAuditTrail({
    caseId: s.caseId,
    correlationId: s.correlationId,
    originalMessage: record.originalMessage,
    templateSnapshot: s.templateSnapshot,
    rulesResult: s.triage!,
    guardedDecision: s.triage!,
    uncertainty,
    playbook,
    customerConfirmed: s.confirmation !== null,
    actionExecuted: s.actionResult !== null,
    mockResult: s.verification?.verified ? "SIMULATED_PENDING_REVIEW" : s.actionResult,
    verification: s.verification,
    totalLatencyMs: latencyMs,
  });

  // Build rule evaluation trace from audit events
  const ruleTrace = s.events
    .map((e) => `[${e.eventType}] ${e.outcome}`)
    .join("\n");

  // Format inspected sources
  const sources = [
    "mock_store_fixtures",
    ...(s.templateSnapshot ? [`template:${s.templateSnapshot.id}`] : []),
    s.diagnosis?.playbookId ? `playbook:${s.diagnosis.playbookId}` : "deterministic_rules_1.0",
    s.triage?.issueType ? `issue:${s.triage.issueType}` : "general_triage",
  ];

  // Reasoning steps trace
  const reasoningSteps = [
    `1. Triaged symptom: "${s.triage?.issueType || "unknown"}" (urgency=${s.triage?.urgency || "medium"}).`,
    s.templateSnapshot
      ? `2. Inspected fresh mock state for ${s.templateSnapshot.id} (status=${s.templateSnapshot.status}, reasonCode=${s.templateSnapshot.reasonCode ?? "none"}).`
      : "2. Checked mock state store (no template record attached).",
    s.stage === "CLARIFY_ONCE"
      ? `3. Detected missing information — asked one focused clarifying question.`
      : s.diagnosis
      ? `3. Evaluated recovery playbook: ${s.diagnosis.playbookId} — evaluated deterministic rules.`
      : `3. Evaluated safety guardrails and policy constraints.`,
    s.proposal
      ? `4. Formulated exact before/after change: ${s.proposal.description} (Approval required).`
      : s.stage === "HANDOFF"
      ? `4. Escalated to human support: ${s.handoffReason || "Policy constraint"}.`
      : `4. Triage concluded with route: ${s.triage?.route}.`,
  ];

  // Execution verification items
  const executionVerification: [string, string][] = [
    ["Triage Route", s.triage?.route || "rules_playbook"],
    ["Mock State", s.templateSnapshot ? `Read (${s.templateSnapshot.status})` : "Verified context (No template attached)"],
    ["Safety Policy", s.triage?.needsHuman ? "Human Required" : s.proposal ? "Approval Required" : "Guarded Pass"],
  ];

  if (s.verification) {
    executionVerification.push([
      "Verification",
      s.verification.verified ? "Verified match (PENDING)" : "Failed fresh read",
    ]);
  }

  let statusBadge = "Diagnosis verified";
  if (s.stage === "CLARIFY_ONCE") {
    statusBadge = "Clarification needed";
  } else if (s.stage === "HANDOFF") {
    statusBadge = "Escalated to human support";
  } else if (s.stage === "PROPOSE" || s.stage === "CONFIRM") {
    statusBadge = "Approval required";
  } else if (s.stage === "PENDING" && s.verification?.verified) {
    statusBadge = "Verified read";
  }

  return {
    sessionId: record.sessionId,
    caseId: record.caseId,
    stage: s.stage,
    customerExplanation,
    triage: s.triage!,
    diagnosis: s.diagnosis,
    proposal: s.proposal,
    clarificationQuestion: s.clarify?.question,
    handoffReason: s.handoffReason,
    isVerified: s.verification?.verified ?? false,
    events: s.events,
    templateSnapshot: s.templateSnapshot,
    ruleTrace,
    evidence: customerExplanation.evidenceExplanation,
    sources,
    reasoningSteps,
    executionVerification,
    latencyMs,
    auditTrail,
    title: customerExplanation.headline,
    category: s.templateSnapshot?.category
      ? `WhatsApp Template (${s.templateSnapshot.category})`
      : s.triage?.issueType === "billing_refund"
      ? "Billing & Refund Inquiry"
      : s.triage?.issueType === "message_delivery"
      ? "Message Delivery"
      : s.triage?.issueType === "security_identity_access"
      ? "Security & Account Access"
      : "Cheerio Support Recovery",
    statusBadge,
    guardrails: s.triage?.needsHuman ? "Human-Led Escalation" : "Guarded",
    contextEvaluated: s.templateSnapshot
      ? `Mock state (${s.templateSnapshot.id})`
      : `Request context (${s.triage?.issueType ?? "general"})`,
    verificationStatus: s.verification?.verified
      ? "Verified read (MOCK)"
      : s.stage === "HANDOFF"
      ? "Handoff dossier"
      : s.stage === "CLARIFY_ONCE"
      ? "Clarification pending"
      : "Inspection complete",
    messages: record.messages,
  };
}
