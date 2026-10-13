import type { IssueType, Urgency } from "./types";

export interface LayaSystemOnePayload {
  model: string;
  state: string | Record<string, unknown>;
  questions: Record<string, LayaQuestion>;
}

export type LayaQuestion =
  | {
      type: "choice";
      instructions: string;
      criteria: Record<string, string>;
    }
  | {
      type: "noul";
      instructions: string;
    }
  | {
      type: "score";
      instructions: string;
      criteria: string[] | Record<string, string>;
    };

export interface LayaChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  answer_confidence?: number;
  probabilities?: Record<string, number>;
}

export interface LayaNoulAnswer {
  type: "noul";
  noul: number; // Probability of true
  confidence: number;
  answer_confidence?: number;
}

export interface LayaSystemOneResponse {
  id?: string;
  model: string;
  answers: {
    issue_type?: LayaChoiceAnswer;
    urgency?: LayaChoiceAnswer;
    needs_human?: LayaNoulAnswer;
    [key: string]: unknown;
  };
  usage?: {
    input_tokens: number;
    output_tokens?: number;
    state_tokens?: number;
  };
  routing?: {
    model?: string;
    repo?: string;
    reason?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface LayaClientConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
}

export interface LayaInferenceResult {
  success: boolean;
  issueType?: IssueType;
  urgency?: Urgency;
  needsHuman?: boolean;
  confidence?: number;
  inputTokens?: number;
  latencyMs: number;
  modelId?: string;
  responseId?: string;
  error?: {
    code: string;
    message: string;
    status?: number;
  };
  rawResponse?: LayaSystemOneResponse;
}

const ISSUE_TYPE_CRITERIA: Record<string, string> = {
  template_rejection: "WhatsApp template rejected by Meta due to policy, formatting, or category mismatch",
  billing_refund: "Billing queries, payment issues, refund requests, invoice questions",
  security_identity_access: "OTP, password reset, account ownership, credentials, admin access, hacking",
  message_delivery: "WhatsApp messages failing to deliver, stuck in queue, or delivery timeout",
  number_waba_setup: "Phone number registration, WABA account setup, display name verification",
  chatbot_flow: "Chatbot logic, automated quick replies, or interactive flow builder issues",
  integration_webhook: "Webhook failures, API delivery errors, event subscriptions, retries",
  human_requested: "Customer explicitly asking to speak to a human, live agent, or support team",
  state_conflict_or_stale: "Status in dashboard conflicts with live WhatsApp state or action history",
  ambiguous_or_missing_context: "Vague, incomplete, or unclassifiable message lacking context",
};

const URGENCY_CRITERIA: Record<string, string> = {
  low: "Non-urgent question or routine inquiry",
  medium: "Standard template issue affecting upcoming campaign",
  high: "Active marketing campaign blocked or live business disruption",
  critical: "Security compromise, credential exposure, financial loss, or account takeover",
};

/**
 * Builds the standard System One request payload for WhatsApp support recovery triage.
 */
export function buildLayaTriagePayload(message: string, model = "laya"): LayaSystemOnePayload {
  return {
    model,
    state: message.trim(),
    questions: {
      issue_type: {
        type: "choice",
        instructions: "What is the primary support issue type described in this message?",
        criteria: ISSUE_TYPE_CRITERIA,
      },
      urgency: {
        type: "choice",
        instructions: "What is the urgency level of this customer request?",
        criteria: URGENCY_CRITERIA,
      },
      needs_human: {
        type: "noul",
        instructions: "Does this request require human support handling per safety policy?",
      },
    },
  };
}

/**
 * Client for the hosted Laya System One Decision API.
 * Never logs credentials or exposes secrets.
 */
export class HostedLayaClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: LayaClientConfig = {}) {
    // Read from env if running in server-side Node
    let envKey: string | undefined;
    let envBaseUrl: string | undefined;
    let envModel: string | undefined;

    if (typeof process !== "undefined" && process.env) {
      envKey = process.env.LAYA_API_KEY;
      envBaseUrl = process.env.LAYA_BASE_URL;
      envModel = process.env.LAYA_MODEL;
    }

    this.apiKey = config.apiKey || envKey;
    this.baseUrl = (config.baseUrl || envBaseUrl || "https://api.laya.studio").replace(/\/+$/, "");
    this.model = config.model || envModel || "laya";
    this.timeoutMs = config.timeoutMs ?? 10000;
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Executes typed decision inference via POST /v1/systemone.
   */
  async triage(message: string): Promise<LayaInferenceResult> {
    if (!this.isConfigured) {
      return {
        success: false,
        latencyMs: 0,
        error: {
          code: "missing_api_key",
          message: "LAYA_API_KEY is not configured in server environment",
        },
      };
    }

    const payload = buildLayaTriagePayload(message, this.model);
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/v1/systemone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        let errorData: { code?: string; message?: string } = {};
        try {
          const errJson = (await response.json()) as { error?: { code?: string; message?: string } };
          errorData = errJson.error || {};
        } catch {
          errorData = { message: response.statusText };
        }

        return {
          success: false,
          latencyMs,
          error: {
            code: errorData.code || `http_${response.status}`,
            message: errorData.message || `API request failed with status ${response.status}`,
            status: response.status,
          },
        };
      }

      const data = (await response.json()) as LayaSystemOneResponse;
      return this.parseResponse(data, latencyMs);
    } catch (err: unknown) {
      const latencyMs = Date.now() - start;
      const isAbort = (err as Error)?.name === "AbortError";
      return {
        success: false,
        latencyMs,
        error: {
          code: isAbort ? "timeout" : "network_error",
          message: isAbort ? `Request timed out after ${this.timeoutMs}ms` : (err as Error)?.message || "Unknown network error",
        },
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Parses and validates raw API response into typed inference result.
   */
  parseResponse(data: LayaSystemOneResponse, latencyMs: number): LayaInferenceResult {
    if (!data.answers || typeof data.answers !== "object") {
      return {
        success: false,
        latencyMs,
        error: {
          code: "invalid_response",
          message: "API response missing 'answers' field",
        },
        rawResponse: data,
      };
    }

    const issueAnswer = data.answers.issue_type;
    const urgencyAnswer = data.answers.urgency;
    const needsHumanAnswer = data.answers.needs_human;

    const issueType = (issueAnswer?.choice as IssueType) || undefined;
    const urgency = (urgencyAnswer?.choice as Urgency) || undefined;
    
    // In noul questions, noul is the probability that the condition is TRUE
    const trueProb = typeof needsHumanAnswer?.noul === "number" ? needsHumanAnswer.noul : undefined;
    const needsHuman = trueProb !== undefined ? trueProb >= 0.5 : undefined;

    const confidence = issueAnswer?.confidence ?? issueAnswer?.answer_confidence ?? 0.5;
    const inputTokens = data.usage?.input_tokens ?? 0;

    return {
      success: true,
      issueType,
      urgency,
      needsHuman,
      confidence,
      inputTokens,
      latencyMs,
      modelId: data.model,
      responseId: data.id,
      rawResponse: data,
    };
  }
}
