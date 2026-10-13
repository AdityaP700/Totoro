import type {
  ConfidenceBand,
  IssueType,
  MockTemplate,
  Route,
  TriageResult,
  Urgency,
} from "./types";
import {
  triageMessage,
  isSecurityRequest,
  isExplicitHumanRequest,
  isBillingRequest,
} from "./triage";

export interface ReasoningContext {
  message: string;
  templateSnapshot?: MockTemplate | null;
  previousAttempts?: number;
}

export interface ReasoningAdapter {
  readonly name: string;
  readonly version: string;
  triage(ctx: ReasoningContext): TriageResult;
}

const ALLOWED_ISSUE_TYPES: ReadonlySet<IssueType> = new Set<IssueType>([
  "template_rejection",
  "number_waba_setup",
  "message_delivery",
  "chatbot_flow",
  "integration_webhook",
  "billing_refund",
  "security_identity_access",
  "human_requested",
  "state_conflict_or_stale",
  "ambiguous_or_missing_context",
]);

const ALLOWED_URGENCIES: ReadonlySet<Urgency> = new Set<Urgency>([
  "low",
  "medium",
  "high",
  "critical",
]);

const ALLOWED_ROUTES: ReadonlySet<Route> = new Set<Route>([
  "human_handoff",
  "clarify_once",
  "rules_playbook",
]);

export interface ValidationOutput {
  valid: boolean;
  sanitized?: TriageResult;
  reasons: string[];
}

/**
 * Validates raw model output against strict schema, allowlisted enums,
 * confidence policy, and deterministic safety rules.
 *
 * Guardrails enforced:
 * - Model output can never execute an action or bypass approval.
 * - Sensitive/security requests can never be downgraded to automated recovery.
 * - Confidence below 0.70 cannot auto-route to a playbook.
 * - Malformed, unsupported, or contradictory outputs are rejected.
 */
export function validateModelOutput(
  raw: unknown,
  ctx: ReasoningContext,
): ValidationOutput {
  const reasons: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, reasons: ["Model output is not a valid JSON object"] };
  }

  const obj = raw as Record<string, unknown>;

  // 1. Issue type validation
  const issueType = obj.issueType as IssueType;
  if (!ALLOWED_ISSUE_TYPES.has(issueType)) {
    reasons.push(`Invalid or disallowed issueType: "${String(obj.issueType)}"`);
  }

  // 2. Urgency validation
  const urgency = obj.urgency as Urgency;
  if (!ALLOWED_URGENCIES.has(urgency)) {
    reasons.push(`Invalid urgency level: "${String(obj.urgency)}"`);
  }

  // 3. Route validation
  let route = obj.route as Route;
  if (!ALLOWED_ROUTES.has(route)) {
    reasons.push(`Invalid route: "${String(obj.route)}"`);
  }

  // 4. Needs-human boolean validation & route consistency
  const needsHuman = Boolean(obj.needsHuman);
  if (needsHuman && route !== "human_handoff") {
    // Correct contradictory assignment: if needsHuman=true, route must be human_handoff
    route = "human_handoff";
  }

  // 5. Confidence validation & confidence gating
  let confidence = typeof obj.confidence === "number" ? obj.confidence : 0.5;
  if (isNaN(confidence) || confidence < 0 || confidence > 1) {
    confidence = 0.5;
    reasons.push("Confidence out of range [0, 1]; clamped to 0.5");
  }

  // 6. Rationale validation
  let rationale = typeof obj.rationale === "string" ? obj.rationale.trim() : "";
  if (!rationale) {
    rationale = "Model-assisted classification without detailed explanation.";
    reasons.push("Rationale was empty or non-string");
  }

  // 7. Missing information
  const missingInformation: string[] = Array.isArray(obj.missingInformation)
    ? obj.missingInformation.filter((x): x is string => typeof x === "string")
    : [];

  // --- Hallucination / Semantic Intent Check (Fix for CR-107) ---
  // A model cannot classify as human_requested unless the user message actually contains an explicit human request
  if (issueType === "human_requested" && !isExplicitHumanRequest(ctx.message)) {
    reasons.push(
      "Model classified as 'human_requested' without an explicit human request in user message (urgency or vague message does not justify human_requested)",
    );
    return { valid: false, reasons };
  }

  // --- Deterministic Safety Interceptor (Safety rules outrank model decision) ---
  const isSecurity = isSecurityRequest(ctx.message);
  const isHuman = isExplicitHumanRequest(ctx.message);
  const isBilling = isBillingRequest(ctx.message);
  const attemptsExceeded = (ctx.previousAttempts ?? 0) >= 2;

  let finalNeedsHuman = needsHuman;
  let finalRoute = route;
  let finalUrgency = urgency;
  let finalIssueType = issueType;

  if (isSecurity) {
    finalNeedsHuman = true;
    finalRoute = "human_handoff";
    finalUrgency = "critical";
    finalIssueType = "security_identity_access";
    rationale = "Safety override: Security, credentials, and identity requests require human verification.";
  } else if (isHuman) {
    // Fix for CR-133: Explicit human request ALWAYS routes to human handoff regardless of model prediction
    finalNeedsHuman = true;
    finalRoute = "human_handoff";
    finalUrgency = finalUrgency === "critical" ? "critical" : "medium";
    finalIssueType = "human_requested";
    rationale = "Safety override: User explicitly requested human assistance.";
  } else if (isBilling) {
    finalNeedsHuman = true;
    finalRoute = "human_handoff";
    finalUrgency = finalUrgency === "critical" ? "critical" : "high";
    finalIssueType = "billing_refund";
    rationale = "Safety override: Financial and billing inquiries require human handling.";
  } else if (attemptsExceeded) {
    finalNeedsHuman = true;
    finalRoute = "human_handoff";
    rationale = "Safety override: Two previous attempts failed; escalated with case file (G8).";
  } else if (
    finalIssueType === "security_identity_access" ||
    finalIssueType === "billing_refund" ||
    finalIssueType === "human_requested"
  ) {
    // Invariant: ANY sensitive issue type (whether detected by rules or predicted by model)
    // MUST strictly be assigned needsHuman=true and route="human_handoff" (G8, G10).
    finalNeedsHuman = true;
    finalRoute = "human_handoff";
  }

  // Confidence gating: low confidence cannot route directly to playbook
  if (confidence < 0.70 && finalRoute === "rules_playbook") {
    finalRoute = "clarify_once";
    rationale += " (Confidence below 0.70 threshold; routed to clarification)";
  }

  // Ensure needsHuman consistency: if human required, route must be human_handoff
  if (finalNeedsHuman && finalRoute !== "human_handoff") {
    finalRoute = "human_handoff";
  }

  const band: ConfidenceBand =
    confidence >= 0.85 ? "high" : confidence >= 0.65 ? "medium" : "low";

  // Critical failure if invalid schema or unallowlisted route
  if (
    !ALLOWED_ISSUE_TYPES.has(finalIssueType) ||
    !ALLOWED_URGENCIES.has(finalUrgency) ||
    !ALLOWED_ROUTES.has(finalRoute)
  ) {
    return { valid: false, reasons };
  }

  return {
    valid: true,
    sanitized: {
      issueType: finalIssueType,
      urgency: finalUrgency,
      needsHuman: finalNeedsHuman,
      route: finalRoute,
      confidence,
      confidenceBand: band,
      rationale,
      missingInformation,
      decisionLayer: "laya",
    },
    reasons,
  };
}

/**
 * Standard Rules Reasoning Adapter.
 * 100% deterministic, zero network calls, zero API costs.
 */
export class RulesReasoningAdapter implements ReasoningAdapter {
  readonly name = "rules";
  readonly version = "rules-1.0";

  triage(ctx: ReasoningContext): TriageResult {
    const start = Date.now();
    const result = triageMessage(ctx.message, {
      reasonCode: ctx.templateSnapshot?.reasonCode ?? null,
      stateStatus: ctx.templateSnapshot?.status,
    });
    if ((ctx.previousAttempts ?? 0) >= 2) {
      return {
        ...result,
        needsHuman: true,
        route: "human_handoff",
        rationale: "Safety override: Two previous attempts failed; escalated with case file (G8).",
        decisionLayer: "rules",
        latencyMs: Date.now() - start,
      };
    }
    return {
      ...result,
      decisionLayer: "rules",
      latencyMs: Date.now() - start,
    };
  }
}

import { HostedLayaClient } from "./layaClient";

export type LayaClassifierFn = (
  ctx: ReasoningContext,
) => Partial<TriageResult> | Promise<Partial<TriageResult>> | null;

/**
 * Hybrid Laya Reasoning Adapter.
 *
 * Implements the hybrid recovery architecture:
 * 1. Known template rejection reasons -> Fast path (Deterministic rules)
 * 2. Sensitive requests (billing, security, human requests) -> Fast path (Human handoff)
 * 3. Complex / ambiguous / multi-symptom requests -> Laya structured classification
 * 4. Output is validated against strict schema and safety guardrails.
 * 5. If model is unavailable, times out, or output is invalid -> Safe rules/clarify fallback.
 */
export class HybridLayaReasoningAdapter implements ReasoningAdapter {
  readonly name = "hybrid-laya";
  readonly version = "laya-1.0-hybrid";
  private readonly rulesAdapter = new RulesReasoningAdapter();
  private readonly classifier?: LayaClassifierFn;
  private readonly client?: HostedLayaClient;

  constructor(target?: LayaClassifierFn | HostedLayaClient) {
    if (target instanceof HostedLayaClient) {
      this.client = target;
    } else if (typeof target === "function") {
      this.classifier = target;
    } else {
      this.client = new HostedLayaClient();
    }
  }

  triage(ctx: ReasoningContext): TriageResult {
    const start = Date.now();

    // --- Fast Path 1: Sensitive request / explicit human request / 2 failed attempts (Safety overrides model) ---
    const isSecurity = isSecurityRequest(ctx.message);
    const isHuman = isExplicitHumanRequest(ctx.message);
    const isBilling = isBillingRequest(ctx.message);
    const attemptsExceeded = (ctx.previousAttempts ?? 0) >= 2;

    if (isSecurity || isHuman || isBilling || attemptsExceeded) {
      const res = this.rulesAdapter.triage(ctx);
      return {
        ...res,
        decisionLayer: "rules",
        latencyMs: Date.now() - start,
      };
    }

    // --- Fast Path 2: Known rejection code on template fixture ---
    const knownReason = ctx.templateSnapshot?.reasonCode;
    if (
      knownReason &&
      (knownReason.includes("PROMO") ||
        knownReason.includes("VARIABLE") ||
        knownReason.includes("TAG"))
    ) {
      const res = this.rulesAdapter.triage(ctx);
      return {
        ...res,
        decisionLayer: "rules",
        rationale: `Rules fast-path: template rejected with known verified condition (${knownReason}).`,
        latencyMs: Date.now() - start,
      };
    }

    // --- Complex / Ambiguous Path: Query Laya classifier if provided ---
    if (this.classifier) {
      try {
        const raw = this.classifier(ctx);
        // Synchronous resolution of classifier result
        if (raw && typeof raw === "object" && !("then" in raw)) {
          const validated = validateModelOutput(raw, ctx);
          if (validated.valid && validated.sanitized) {
            return {
              ...validated.sanitized,
              decisionLayer: "laya",
              latencyMs: Date.now() - start,
            };
          }
        }
      } catch {
        // Fall through to fallback on exception
      }
    }

    // --- Fallback: Rules baseline with fallback annotation ---
    const fallback = this.rulesAdapter.triage(ctx);
    return {
      ...fallback,
      decisionLayer: "fallback",
      rationale: `${fallback.rationale} [Fallback from model decision layer]`,
      latencyMs: Date.now() - start,
    };
  }

  async triageAsync(ctx: ReasoningContext): Promise<TriageResult> {
    const start = Date.now();

    // Fast Path 1: Sensitive request / explicit human request / 2 failed attempts
    const isSecurity = isSecurityRequest(ctx.message);
    const isHuman = isExplicitHumanRequest(ctx.message);
    const isBilling = isBillingRequest(ctx.message);
    const attemptsExceeded = (ctx.previousAttempts ?? 0) >= 2;

    if (isSecurity || isHuman || isBilling || attemptsExceeded) {
      const res = this.rulesAdapter.triage(ctx);
      return {
        ...res,
        decisionLayer: "rules",
        latencyMs: Date.now() - start,
      };
    }

    // Fast Path 2: Known rejection code on template fixture
    const knownReason = ctx.templateSnapshot?.reasonCode;
    if (
      knownReason &&
      (knownReason.includes("PROMO") ||
        knownReason.includes("VARIABLE") ||
        knownReason.includes("TAG"))
    ) {
      const res = this.rulesAdapter.triage(ctx);
      return {
        ...res,
        decisionLayer: "rules",
        rationale: `Rules fast-path: template rejected with known verified condition (${knownReason}).`,
        latencyMs: Date.now() - start,
      };
    }

    // Complex / Ambiguous: If hosted client is configured, call live API
    if (this.client && this.client.isConfigured) {
      const apiRes = await this.client.triage(ctx.message);
      if (apiRes.success && apiRes.issueType) {
        const raw = {
          issueType: apiRes.issueType,
          urgency: apiRes.urgency || "medium",
          needsHuman: apiRes.needsHuman ?? false,
          route: apiRes.needsHuman ? "human_handoff" : "rules_playbook",
          confidence: apiRes.confidence ?? 0.5,
          rationale: `Laya decision inference (model=${apiRes.modelId || "laya"}, tokens=${apiRes.inputTokens || 0})`,
        };
        const validated = validateModelOutput(raw, ctx);
        if (validated.valid && validated.sanitized) {
          return {
            ...validated.sanitized,
            decisionLayer: "laya",
            latencyMs: apiRes.latencyMs,
          };
        }
      }

      // If API failed or was invalid, fall back safely to rules
      const fallback = this.rulesAdapter.triage(ctx);
      const failReason = apiRes.error ? ` (${apiRes.error.code}: ${apiRes.error.message})` : "";
      return {
        ...fallback,
        decisionLayer: "fallback",
        rationale: `${fallback.rationale} [Fallback from Laya API${failReason}]`,
        latencyMs: Date.now() - start,
      };
    }

    // Otherwise use synchronous triage
    return this.triage(ctx);
  }
}
