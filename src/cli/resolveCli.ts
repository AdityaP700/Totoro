#!/usr/bin/env node
import { createMockStore } from "../domain/mockStore";
import { RulesReasoningAdapter, validateModelOutput } from "../domain/adapter";
import { HostedLayaClient } from "../domain/layaClient";
import { findPlaybook } from "../data/playbooks";
import { expectedStatusAfter, verifyAgainstFreshRead } from "../domain/verification";
import type { MockTemplate, ProposedChange } from "../domain/types";

// Load .env if present in Node environment
try {
  if (typeof process !== "undefined" && typeof (process as any).loadEnvFile === "function") {
    (process as any).loadEnvFile();
  }
} catch {
  // Ignore missing .env
}

export interface CliOutput {
  issue_type: string;
  urgency: string;
  evidence_used: string[];
  missing_evidence: string[];
  rules_prediction: {
    issue_type: string;
    urgency: string;
    route: string;
    needs_human: boolean;
  };
  raw_laya_prediction: {
    issue_type?: string;
    urgency?: string;
    needs_human?: boolean;
    confidence?: number;
  } | null;
  guarded_decision: {
    issue_type: string;
    urgency: string;
    route: string;
    needs_human: boolean;
    decision_layer: "rules" | "laya" | "fallback";
    rationale: string;
  };
  route: "clarify" | "safe_playbook" | "human_handoff";
  recommended_action: string;
  confirmation_required: boolean;
  model_latency_ms: number | null;
  request_status: string;
  reported_token_usage: {
    input_tokens: number;
    output_tokens?: number;
  } | null;
  is_verified: boolean;
}

export interface CliOptions {
  message: string;
  templateId?: string;
  stateJson?: string;
  execute?: boolean;
  rulesOnly?: boolean;
  apiKey?: string;
}

export async function runCliTriage(options: CliOptions): Promise<CliOutput> {
  const store = createMockStore();
  let templateSnapshot: MockTemplate | null = null;

  // Resolve template state if provided
  if (options.stateJson) {
    try {
      templateSnapshot = JSON.parse(options.stateJson);
    } catch {
      // Invalid JSON state passed, proceed with null
    }
  } else if (options.templateId) {
    templateSnapshot = store.getTemplate(options.templateId) || null;
  }

  // 1. Evidence extraction
  const evidenceUsed: string[] = [];
  const missingEvidence: string[] = [];

  if (templateSnapshot) {
    evidenceUsed.push(`template_id=${templateSnapshot.id}`);
    evidenceUsed.push(`template_status=${templateSnapshot.status}`);
    if (templateSnapshot.category) {
      evidenceUsed.push(`template_category=${templateSnapshot.category}`);
    }
    if (templateSnapshot.reasonCode) {
      evidenceUsed.push(`reason_code=${templateSnapshot.reasonCode}`);
    } else {
      missingEvidence.push("reason_code not provided in template record");
    }
  } else {
    missingEvidence.push("no mock template record attached");
  }

  evidenceUsed.push(`user_message_length=${options.message.length}`);

  // 2. Rules Prediction (Deterministic Baseline)
  const rulesAdapter = new RulesReasoningAdapter();
  const rulesRes = rulesAdapter.triage({
    message: options.message,
    templateSnapshot,
  });

  const rulesPrediction = {
    issue_type: rulesRes.issueType,
    urgency: rulesRes.urgency,
    route: rulesRes.route,
    needs_human: rulesRes.needsHuman,
  };

  // 3. Raw Laya Prediction (Direct API query if enabled & configured)
  let rawLayaPrediction: CliOutput["raw_laya_prediction"] = null;
  let modelLatencyMs: number | null = null;
  let requestStatus = "not_invoked";
  let tokenUsage: CliOutput["reported_token_usage"] = null;
  let layaClient: HostedLayaClient | null = null;

  if (!options.rulesOnly) {
    layaClient = new HostedLayaClient(options.apiKey ? { apiKey: options.apiKey } : {});
    if (layaClient.isConfigured) {
      const apiRes = await layaClient.triage(options.message);
      modelLatencyMs = apiRes.latencyMs;

      if (apiRes.success && apiRes.issueType) {
        requestStatus = "success";
        rawLayaPrediction = {
          issue_type: apiRes.issueType,
          urgency: apiRes.urgency,
          needs_human: apiRes.needsHuman,
          confidence: apiRes.confidence,
        };
        tokenUsage = {
          input_tokens: apiRes.inputTokens ?? 0,
        };
      } else {
        requestStatus = apiRes.error ? `error_${apiRes.error.code}` : "error";
      }
    } else {
      requestStatus = "api_key_not_configured";
    }
  }

  // 4. Guarded Final Decision (Enforcing safety interceptor & validation)
  let guardedDecision: CliOutput["guarded_decision"];

  if (rawLayaPrediction && requestStatus === "success") {
    // Validate model output through the deterministic safety filter
    const rawObj = {
      issueType: rawLayaPrediction.issue_type,
      urgency: rawLayaPrediction.urgency || "medium",
      needsHuman: rawLayaPrediction.needs_human ?? false,
      route: rawLayaPrediction.needs_human ? "human_handoff" : "rules_playbook",
      confidence: rawLayaPrediction.confidence ?? 0.5,
      rationale: `Laya decision inference (input_tokens=${tokenUsage?.input_tokens ?? 0})`,
    };

    const validated = validateModelOutput(rawObj, {
      message: options.message,
      templateSnapshot,
    });

    if (validated.valid && validated.sanitized) {
      guardedDecision = {
        issue_type: validated.sanitized.issueType,
        urgency: validated.sanitized.urgency,
        route: validated.sanitized.route,
        needs_human: validated.sanitized.needsHuman,
        decision_layer: "laya",
        rationale: validated.sanitized.rationale,
      };
    } else {
      // Validation rejected model output -> safe fallback
      guardedDecision = {
        issue_type: rulesRes.issueType,
        urgency: rulesRes.urgency,
        route: rulesRes.route,
        needs_human: rulesRes.needsHuman,
        decision_layer: "fallback",
        rationale: `${rulesRes.rationale} [Fallback: model output failed validation: ${validated.reasons.join(", ")}]`,
      };
    }
  } else {
    // Rules baseline or API failure fallback
    guardedDecision = {
      issue_type: rulesRes.issueType,
      urgency: rulesRes.urgency,
      route: rulesRes.route,
      needs_human: rulesRes.needsHuman,
      decision_layer: requestStatus.startsWith("error") ? "fallback" : "rules",
      rationale: rulesRes.rationale + (requestStatus.startsWith("error") ? ` [Fallback from API: ${requestStatus}]` : ""),
    };
  }

  // 5. Normalized Route Mapping
  let mappedRoute: "clarify" | "safe_playbook" | "human_handoff";
  if (guardedDecision.route === "human_handoff" || guardedDecision.needs_human) {
    mappedRoute = "human_handoff";
  } else if (guardedDecision.route === "clarify_once") {
    mappedRoute = "clarify";
  } else {
    mappedRoute = "safe_playbook";
  }

  // 6. Action Proposal and Confirmation Requirements
  let recommendedAction = "";
  let confirmationRequired = false;
  let isVerified = false;

  if (mappedRoute === "human_handoff") {
    recommendedAction = "Handoff to human support team with context case file";
    confirmationRequired = false;
  } else if (mappedRoute === "clarify") {
    recommendedAction = "Ask one clarifying question to identify affected component";
    confirmationRequired = false;
  } else {
    // Safe playbook route
    const playbook = findPlaybook(templateSnapshot?.reasonCode ?? null);
    if (playbook.proposedAction) {
      recommendedAction = playbook.proposedAction.description;
      confirmationRequired = true; // Guardrail G1: Never write before explicit confirmation

      // Optional simulated execution if requested
      if (options.execute && templateSnapshot) {
        const changes: ProposedChange[] = playbook.proposedAction.buildChanges(templateSnapshot);
        const exactBefore = JSON.stringify({ text: templateSnapshot.text, category: templateSnapshot.category });
        const exactAfterObj: Record<string, string> = { text: templateSnapshot.text, category: templateSnapshot.category };
        for (const c of changes) exactAfterObj[c.field] = c.after;
        const exactAfter = JSON.stringify(exactAfterObj);

        const applyRes = store.applyApprovedChange({
          operation: "resubmit_template",
          targetId: templateSnapshot.id,
          changes,
          confirmation: {
            approvedAt: new Date().toISOString(),
            exactBefore,
            exactAfter,
            idempotencyKey: `CLI:${templateSnapshot.id}:${Date.now()}`,
          },
        });

        if (applyRes.ok) {
          const expected = expectedStatusAfter("resubmit_template");
          if (expected) {
            const fresh = store.getTemplate(templateSnapshot.id)!;
            const ver = verifyAgainstFreshRead(fresh, expected);
            isVerified = ver.verified;
          }
        }
      }
    } else {
      recommendedAction = "Review template rejection explanation; no automated edit available";
      confirmationRequired = false;
    }
  }

  return {
    issue_type: guardedDecision.issue_type,
    urgency: guardedDecision.urgency,
    evidence_used: evidenceUsed,
    missing_evidence: missingEvidence,
    rules_prediction: rulesPrediction,
    raw_laya_prediction: rawLayaPrediction,
    guarded_decision: guardedDecision,
    route: mappedRoute,
    recommended_action: recommendedAction,
    confirmation_required: confirmationRequired,
    model_latency_ms: modelLatencyMs,
    request_status: requestStatus,
    reported_token_usage: tokenUsage,
    is_verified: isVerified,
  };
}

// CLI entry point execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Cheerio Resolve CLI — Support Recovery & Reasoning Terminal

Usage:
  npx tsx src/cli/resolveCli.ts --message "<message>" [options]

Options:
  -m, --message <text>       Customer support message to triage
  -t, --template-id <id>     Mock template ID (e.g. TPL-1001, TPL-1002, TPL-1003)
  --state <json>             Raw mock template state JSON
  --rules-only               Run deterministic rules baseline only (skip hosted API)
  --execute                  Simulate user confirmation & perform fresh-read verification
  -h, --help                 Display this help message

Output:
  Emits structured JSON to stdout.
`);
    process.exit(0);
  }

  let message = "";
  let templateId: string | undefined;
  let stateJson: string | undefined;
  let execute = false;
  let rulesOnly = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-m" || arg === "--message") {
      message = args[++i] || "";
    } else if (arg === "-t" || arg === "--template-id") {
      templateId = args[++i];
    } else if (arg === "--state") {
      stateJson = args[++i];
    } else if (arg === "--execute") {
      execute = true;
    } else if (arg === "--rules-only") {
      rulesOnly = true;
    } else if (!message && !arg.startsWith("-")) {
      message = arg;
    }
  }

  if (!message) {
    // Try reading from stdin if available
    if (!process.stdin.isTTY) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      message = Buffer.concat(chunks).toString("utf-8").trim();
    }
  }

  if (!message) {
    console.error(JSON.stringify({
      error: "Missing required support message. Use --message '<text>' or pass via stdin."
    }, null, 2));
    process.exit(1);
  }

  try {
    const result = await runCliTriage({
      message,
      templateId,
      stateJson,
      execute,
      rulesOnly,
    });

    console.log(JSON.stringify(result, null, 2));
  } catch (err: unknown) {
    console.error(JSON.stringify({
      error: (err as Error)?.message || "CLI execution error"
    }, null, 2));
    process.exit(1);
  }
}

// Only invoke main when run directly
const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("resolveCli");
if (isDirectRun) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
