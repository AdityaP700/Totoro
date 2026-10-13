import type { IssueType, Urgency } from "./types";

export interface GroqClientOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export interface GroqApiResponse {
  success: boolean;
  issueType?: IssueType;
  urgency?: Urgency;
  needsHuman?: boolean;
  confidence?: number;
  rationale?: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  modelId: string;
  error?: {
    code: string;
    message: string;
  };
}

const GROQ_SYSTEM_PROMPT = `You are the diagnostic triage engine for Cheerio Resolve, a support recovery system for WhatsApp Business API and customer messaging.
Analyze the user message and return a strictly valid JSON object matching this schema:
{
  "issue_type": "template_rejection" | "number_waba_setup" | "message_delivery" | "chatbot_flow" | "integration_webhook" | "billing_refund" | "security_identity_access" | "human_requested" | "state_conflict_or_stale" | "ambiguous_or_missing_context",
  "urgency": "low" | "medium" | "high" | "critical",
  "needs_human": boolean,
  "confidence": number between 0.0 and 1.0,
  "rationale": "Concise non-technical reason for this classification"
}

Important Rules:
- If the user asks for a human ("talk to a human", "support agent", "manager"), issue_type MUST be "human_requested" and needs_human MUST be true.
- If the message involves billing, refund, double charge, invoice, or credit cards, issue_type MUST be "billing_refund" and needs_human MUST be true.
- If the message involves OTP, password, token, admin access, or account takeover, issue_type MUST be "security_identity_access", urgency MUST be "critical", and needs_human MUST be true.
- If the message is vague, incomplete, or underspecified (e.g. "help", "not working", "broken"), issue_type MUST be "ambiguous_or_missing_context". Urgency alone does NOT justify human_requested.
- If the message refers to template rejection (promotional language, variable format, category mismatch), issue_type MUST be "template_rejection".`;

/**
 * Client for Groq Cloud API using structured JSON mode (Phase 6).
 * Safe, bounded, zero secret leaks.
 */
export class GroqClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(options: GroqClientOptions = {}) {
    const envKey =
      typeof process !== "undefined" && process.env
        ? process.env.GROQ_API_KEY
        : undefined;
    this.apiKey = options.apiKey || envKey || "";
    this.model = options.model || "openai/gpt-oss-120b";
    this.timeoutMs = options.timeoutMs ?? 12000;
  }

  get isConfigured(): boolean {
    return this.apiKey.trim().length > 0;
  }

  async triage(message: string): Promise<GroqApiResponse> {
    const start = Date.now();

    if (!this.isConfigured) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        modelId: this.model,
        error: {
          code: "unauthorized",
          message: "GROQ_API_KEY is not configured.",
        },
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: GROQ_SYSTEM_PROMPT },
            { role: "user", content: message },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 300,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;

      if (!response.ok) {
        let errMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMessage = errData.error.message;
        } catch {
          // Ignore JSON parse failure on error body
        }

        return {
          success: false,
          latencyMs,
          modelId: this.model,
          error: {
            code: `http_${response.status}`,
            message: errMessage,
          },
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      const usage = data.usage;

      if (!content) {
        return {
          success: false,
          latencyMs,
          modelId: this.model,
          error: {
            code: "empty_response",
            message: "Groq returned empty response content.",
          },
        };
      }

      const parsed = JSON.parse(content);

      return {
        success: true,
        issueType: parsed.issue_type as IssueType,
        urgency: parsed.urgency as Urgency,
        needsHuman: Boolean(parsed.needs_human),
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.85,
        rationale: parsed.rationale || "Groq structured classification",
        latencyMs,
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        modelId: this.model,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === "AbortError";
      return {
        success: false,
        latencyMs: Date.now() - start,
        modelId: this.model,
        error: {
          code: isAbort ? "timeout" : "network_error",
          message: isAbort
            ? `Groq API timed out after ${this.timeoutMs}ms.`
            : (err.message || "Network request failed"),
        },
      };
    }
  }
}
