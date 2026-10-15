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

import { ResolveSession, detectTemplateIdFromText, deriveInteractionState, type SessionDeps } from "../../../../src/domain/stateMachine";
import { createMockStore, type MockStore } from "../../../../src/domain/mockStore";
import { RulesReasoningAdapter } from "../../../../src/domain/adapter";
import { generateCustomerFacingResponse } from "../../../../src/domain/conversationalResponse";
import { buildCaseAuditTrail } from "../../../../src/domain/evidenceTrail";
import { assessRecoveryUncertainty } from "../../../../src/domain/uncertainty";
import { defaultPlaybookRegistry } from "../../../../src/domain/playbookRegistry";
import type { SessionSummary, ResolveResponse } from "../apiTypes";
import { repositories, type StoredCase } from "./persistence";
import { isBusinessRequest } from "../../../../src/domain/conversationGraph";

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
  if (record) {
    record.lastActive = Date.now();
    return record;
  }
  const stored = (workspaceId ? repositories.getCase(workspaceId, sessionId) : undefined)
    || repositories.getCaseBySessionId?.(sessionId);
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
    let statusBadge = "Investigation complete";
    if (s.businessContext && s.businessContext.domain !== "platform_recovery" && s.businessContext.domain !== "customer_support") {
      statusBadge = "Analysis active";
    } else if (s.closedAt || s.stage === "RESOLVED") {
      statusBadge = "Issue resolved";
    } else if (s.verification?.verified) {
      statusBadge = "State verified";
    } else if (s.stage === "HANDOFF") {
      statusBadge = s.specialistAssignment ? "Specialist Assigned" : "Escalated to human support";
    } else if (s.stage === "PROPOSE" || s.stage === "CONFIRM") {
      statusBadge = "Approval required";
    } else if (s.stage === "CLARIFY_ONCE") {
      statusBadge = s.triage?.issueType === "template_rejection" ? "Needs details" : "Clarification needed";
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
  try {
    repositories.saveCase({ id: record.caseId, workspaceId: record.workspaceId, sessionId: record.sessionId,
      title: record.originalMessage.slice(0, 100), templateId: record.templateId, originalMessage: record.originalMessage,
      state: record.session.state, templates: record.store.listTemplates(), createdAt: record.createdAt,
      updatedAt: record.updatedAt, messages: record.messages });
  } catch (err) {
    console.warn("[SessionRegistry] Persistent storage sync skipped:", err);
  }
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

  if (s.customExplanation) {
    if (s.customExplanation.headline) customerExplanation.headline = s.customExplanation.headline;
    if (s.customExplanation.whatIsWrong) customerExplanation.whatIsWrong = s.customExplanation.whatIsWrong;
    if (s.customExplanation.evidenceExplanation) customerExplanation.evidenceExplanation = s.customExplanation.evidenceExplanation;
    if (s.customExplanation.nextSteps) customerExplanation.nextSteps = s.customExplanation.nextSteps;
  } else if (s.stage === "CLARIFY_ONCE" && s.triage?.issueType === "template_rejection") {
    customerExplanation.headline = "WhatsApp template rejection";
    customerExplanation.whatIsWrong =
      "Your WhatsApp template was rejected, but I don't yet have the rejection reason needed to recommend the right fix.";
    customerExplanation.evidenceExplanation =
      "Open the rejected template in WhatsApp Manager and share the rejection reason shown there. You can also provide the template name or ID if it's available. I haven't verified the rejection reason yet, so I won't recommend a delivery-status check.";
    customerExplanation.statusLabel = "Needs details";
  }

  const playbook = defaultPlaybookRegistry.findForContext({
    reasonCode: s.templateSnapshot?.reasonCode,
    issueType: s.triage!.issueType,
    templateSnapshot: s.templateSnapshot,
    message: record.originalMessage,
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

  const isBusinessDomain = Boolean(
    (s.businessContext &&
      s.businessContext.domain !== "platform_recovery" &&
      s.businessContext.domain !== "customer_support") ||
    isBusinessRequest(record.originalMessage)
  );

  const businessCategoryMap: Record<string, string> = {
    founder_metrics: "Business Analytics",
    sales_crm: "Sales Outreach",
    management_projects: "Project Management",
    freelancer_invoicing: "Invoicing & Billing",
    operations_inventory: "Operations & Inventory",
  };

  // Format inspected sources
  const sources = isBusinessDomain
    ? [
        "conversational_context",
        `domain:${s.businessContext?.domain || "founder_metrics"}`,
        ...(s.businessContext?.unsupportedCapabilitiesAttempted?.length
          ? [`disconnected_sources:${s.businessContext.unsupportedCapabilitiesAttempted.join(",")}`]
          : []),
      ]
    : [
        "mock_store_fixtures",
        ...(s.templateSnapshot ? [`template:${s.templateSnapshot.id}`] : []),
        s.diagnosis?.playbookId ? `playbook:${s.diagnosis.playbookId}` : "deterministic_rules_1.0",
        s.triage?.issueType ? `issue:${s.triage.issueType}` : "general_triage",
      ];

  // Reasoning steps trace
  const reasoningSteps = isBusinessDomain
    ? [
        `1. Interpreted operational context for domain: "${s.businessContext?.domain || "founder_metrics"}".`,
        s.businessContext?.entities && Object.keys(s.businessContext.entities).length > 0
          ? `2. Extracted operational entities: ${Object.entries(s.businessContext.entities).map(([k, v]) => `${k}=${v}`).join(", ")}.`
          : "2. Evaluated conversational context and historical parameters.",
        s.businessContext?.invalidatedConclusions && s.businessContext.invalidatedConclusions.length > 0
          ? `3. Handled correction / context update: invalidated prior conclusions.`
          : "3. Checked system capability boundaries and connected data sources.",
        s.recommendedNextStep
          ? `4. Prepared next step: ${s.recommendedNextStep.actionTitle}.`
          : "4. Synthesized operational findings and guidance.",
      ]
    : [
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
  const executionVerification: [string, string][] = isBusinessDomain
    ? [
        ["Domain", s.businessContext?.domain ? businessCategoryMap[s.businessContext.domain] || s.businessContext.domain : "Business Analytics"],
        ["Data Source", "User-Reported / In-Memory (No Production DB)"],
        ["Capability Boundary", "Analysis & Advisory (Safe / Read-Only)"],
      ]
    : [
        ["Triage Route", s.triage?.route || "rules_playbook"],
        ["Mock State", s.templateSnapshot ? `Read (${s.templateSnapshot.status})` : "Verified context (No template attached)"],
        ["Safety Policy", s.triage?.needsHuman ? "Human Required" : s.proposal ? "Approval Required" : "Guarded Pass"],
      ];

  if (!isBusinessDomain && s.verification) {
    executionVerification.push([
      "Verification",
      s.verification.verified ? "Verified match (PENDING)" : "Failed fresh read",
    ]);
  }

  let statusBadge = "Investigation complete";
  if (isBusinessDomain) {
    statusBadge = "Analysis active";
  } else if (s.closedAt || s.stage === "RESOLVED") {
    statusBadge = "Issue resolved";
  } else if (s.verification?.verified) {
    statusBadge = "State verified";
  } else if (s.stage === "CLARIFY_ONCE") {
    statusBadge = s.triage?.issueType === "template_rejection" ? "Needs details" : "Clarification needed";
  } else if (s.stage === "HANDOFF") {
    statusBadge = s.specialistAssignment ? "Specialist Assigned" : "Escalated to human support";
  } else if (s.stage === "PROPOSE" || s.stage === "CONFIRM") {
    statusBadge = "Approval required";
  } else if (s.stage === "PENDING" && s.verification?.verified) {
    statusBadge = "State verified";
  }

  const interactionState = s.interactionState || deriveInteractionState(s);

  // CRITICAL: NEVER populate a delivery diagnostic next step or diagnosis summary for template_rejection or clarification
  const isTemplateRejectionWithoutProposal =
    s.triage?.issueType === "template_rejection" && !s.proposal;

  const diagnosisSummary =
    isBusinessDomain || s.stage === "CLARIFY_ONCE" || isTemplateRejectionWithoutProposal
      ? null
      : s.diagnosis?.summary || (playbook && playbook.issueType === s.triage?.issueType ? playbook.diagnosisSummary : null) || null;

  let recommendedNextStep: any = null;
  if (s.recommendedNextStep !== undefined && s.recommendedNextStep !== null) {
    const rawStep = s.recommendedNextStep as any;
    const primaryLabel =
      rawStep.primaryCta?.label || rawStep.primaryCtaLabel || rawStep.actionLabel || "Proceed";
    const primaryAction =
      rawStep.primaryCta?.action || rawStep.primaryCtaAction || rawStep.actionType || rawStep.actionId || "proceed";
    const secondaryLabel =
      rawStep.secondaryCta?.label || rawStep.secondaryCtaLabel || rawStep.secondaryLabel;
    const secondaryAction =
      rawStep.secondaryCta?.action || rawStep.secondaryCtaAction || rawStep.secondaryAction;

    recommendedNextStep = {
      actionTitle: rawStep.actionTitle || rawStep.title || "",
      supportingText: rawStep.supportingText || rawStep.subtitle || rawStep.explanation || "",
      primaryCta: {
        label: primaryLabel,
        action: primaryAction,
      },
      secondaryCta: secondaryLabel
        ? {
            label: secondaryLabel,
            action: secondaryAction || "secondary",
          }
        : null,
    };
  } else if (!isBusinessDomain && s.proposal) {
    recommendedNextStep = {
      actionTitle: s.proposal.description,
      supportingText: "Operator authorization is required prior to applying simulated resubmission (G1).",
      primaryCta: {
        label: "Approve simulated resubmission",
        action: "approve_resubmission",
      },
      secondaryCta: {
        label: "Edit proposal",
        action: "edit_proposal",
      },
    };
  } else if (!isBusinessDomain && s.stage === "HANDOFF") {
    recommendedNextStep = {
      actionTitle: "Escalate to human support specialist",
      supportingText: s.handoffReason || "Policy guardrails require human specialist review with complete audit dossier.",
      primaryCta: {
        label: "Confirm human handoff",
        action: "human",
      },
      secondaryCta: null,
    };
  } else if (
    !isBusinessDomain &&
    playbook?.recommendedAction &&
    playbook.issueType === s.triage?.issueType &&
    s.stage !== "CLARIFY_ONCE" &&
    !isTemplateRejectionWithoutProposal
  ) {
    const isCompleted = s.completedChecks?.includes(playbook.recommendedAction.primaryCtaAction);
    if (!isCompleted) {
      recommendedNextStep = {
        actionTitle: playbook.recommendedAction.title,
        supportingText: playbook.recommendedAction.subtitle,
        primaryCta: {
          label: playbook.recommendedAction.primaryCtaLabel,
          action: playbook.recommendedAction.primaryCtaAction,
        },
        secondaryCta: playbook.recommendedAction.secondaryCtaLabel
          ? {
              label: playbook.recommendedAction.secondaryCtaLabel,
              action: playbook.recommendedAction.secondaryCtaAction || "view_supporting_evidence",
            }
          : null,
      };
    }
  }

  return {
    sessionId: record.sessionId,
    caseId: record.caseId,
    stage: s.stage,
    interactionState,
    customerExplanation,
    triage: s.triage!,
    diagnosis: s.diagnosis,
    proposal: s.proposal,
    clarificationQuestion: s.clarify?.question,
    handoffReason: s.handoffReason,
    handoffRequestedAt: s.handoffRequestedAt || null,
    specialistAssignment: s.specialistAssignment || null,
    closedAt: s.closedAt || null,
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
    category: isBusinessDomain
      ? (s.businessContext?.domain && businessCategoryMap[s.businessContext.domain]) || "Business Analytics"
      : s.triage?.issueType === "template_rejection"
      ? "Template support"
      : s.templateSnapshot?.category
      ? `WhatsApp Template (${s.templateSnapshot.category})`
      : s.triage?.issueType === "billing_refund"
      ? "Billing & Refund Inquiry"
      : s.triage?.issueType === "message_delivery"
      ? "Message Delivery"
      : s.triage?.issueType === "security_identity_access"
      ? "Security & Account Access"
      : "Cheerio Support Recovery",
    statusBadge,
    guardrails: isBusinessDomain ? "Guarded Copilot" : s.triage?.needsHuman ? "Human-Led Escalation" : "Guarded",
    contextEvaluated: isBusinessDomain
      ? `Operational context (${s.businessContext?.domain || "founder_metrics"})`
      : s.templateSnapshot
      ? `Mock state (${s.templateSnapshot.id})`
      : `Request context (${s.triage?.issueType ?? "general"})`,
    verificationStatus: isBusinessDomain
      ? "Analysis active"
      : s.closedAt || s.stage === "RESOLVED"
      ? "Issue resolved"
      : s.verification?.verified
      ? "State verified"
      : s.stage === "HANDOFF"
      ? "Handoff dossier"
      : s.stage === "CLARIFY_ONCE"
      ? "Clarification pending"
      : "Investigation complete",
    diagnosisSummary,
    recommendedNextStep,
    completedChecks: s.completedChecks || [],
    businessContext: s.businessContext,
    messages: record.messages,
  };
}
