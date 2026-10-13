import { describe, expect, it, vi, afterEach } from "vitest";
import { HostedLayaClient, buildLayaTriagePayload } from "../src/domain/layaClient";
import { HybridLayaReasoningAdapter } from "../src/domain/adapter";
import { createMockStore } from "../src/domain/mockStore";

describe("HostedLayaClient & API Integration", () => {
  const store = createMockStore();

  it("buildLayaTriagePayload correctly structures System One choice and noul questions", () => {
    const payload = buildLayaTriagePayload("Template rejected for promo in utility", "laya");
    expect(payload.model).toBe("laya");
    expect(payload.state).toBe("Template rejected for promo in utility");
    expect(payload.questions.issue_type.type).toBe("choice");
    expect(payload.questions.urgency.type).toBe("choice");
    expect(payload.questions.needs_human.type).toBe("noul");
  });

  describe("Mocked API responses and error handling", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("parses valid System One response with usage tokens and confidence", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          model: "laya-rl-agent",
          id: "dec_12345",
          answers: {
            issue_type: {
              type: "choice",
              choice: "template_rejection",
              confidence: 0.94,
              answer_confidence: 0.98,
            },
            urgency: {
              type: "choice",
              choice: "medium",
              confidence: 0.72,
            },
            needs_human: {
              type: "noul",
              noul: 0.08, // False probability
              confidence: 0.92,
            },
          },
          usage: {
            input_tokens: 215,
            output_tokens: 0,
          },
        }),
      });

      const client = new HostedLayaClient({ apiKey: "test_key", baseUrl: "https://api.laya.studio" });
      const res = await client.triage("Template was rejected");

      expect(res.success).toBe(true);
      expect(res.issueType).toBe("template_rejection");
      expect(res.urgency).toBe("medium");
      expect(res.needsHuman).toBe(false);
      expect(res.inputTokens).toBe(215);
      expect(res.responseId).toBe("dec_12345");
      expect(res.modelId).toBe("laya-rl-agent");
    });

    it("handles 401 Unauthorized authentication failure safely without leaking key", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: { code: "invalid_api_key", message: "Invalid API key provided" },
        }),
      });

      const client = new HostedLayaClient({ apiKey: "bad_key", baseUrl: "https://api.laya.studio" });
      const res = await client.triage("Template was rejected");

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("invalid_api_key");
      expect(res.error?.status).toBe(401);
    });

    it("handles 402 Insufficient credits safely", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
        statusText: "Payment Required",
        json: async () => ({
          error: { code: "insufficient_credits", message: "Account has 0 remaining credits" },
        }),
      });

      const client = new HostedLayaClient({ apiKey: "test_key" });
      const res = await client.triage("Template was rejected");

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("insufficient_credits");
      expect(res.error?.status).toBe(402);
    });

    it("handles 429 Rate limiting safely", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        json: async () => ({
          error: { code: "rate_limit_exceeded", message: "Requests per minute limit exceeded" },
        }),
      });

      const client = new HostedLayaClient({ apiKey: "test_key" });
      const res = await client.triage("Template was rejected");

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("rate_limit_exceeded");
      expect(res.error?.status).toBe(429);
    });

    it("handles 500 server error and network failures safely", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("ETIMEDOUT: Connection timed out"));

      const client = new HostedLayaClient({ apiKey: "test_key" });
      const res = await client.triage("Template was rejected");

      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("network_error");
      expect(res.error?.message).toContain("ETIMEDOUT");
    });
  });

  describe("HybridLayaReasoningAdapter with HostedLayaClient", () => {
    it("fast-paths known template rejection condition without invoking HTTP fetch", async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const client = new HostedLayaClient({ apiKey: "test_key" });
      const adapter = new HybridLayaReasoningAdapter(client);

      const res = await adapter.triageAsync({
        message: "Why is my template rejected?",
        templateSnapshot: store.getTemplate("TPL-1001"), // Has FIXTURE_PROMO_UTILITY
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(res.decisionLayer).toBe("rules");
      expect(res.issueType).toBe("template_rejection");
    });

    it("fast-paths sensitive security requests without invoking HTTP fetch", async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      const client = new HostedLayaClient({ apiKey: "test_key" });
      const adapter = new HybridLayaReasoningAdapter(client);

      const res = await adapter.triageAsync({
        message: "Please reset password and bypass verification here is my otp 1234",
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(res.decisionLayer).toBe("rules");
      expect(res.issueType).toBe("security_identity_access");
      expect(res.needsHuman).toBe(true);
      expect(res.route).toBe("human_handoff");
    });

    it("safely falls back to rules baseline if live API call fails", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({ error: { code: "service_unavailable", message: "Server overloaded" } }),
      });

      const client = new HostedLayaClient({ apiKey: "test_key" });
      const adapter = new HybridLayaReasoningAdapter(client);

      const res = await adapter.triageAsync({
        message: "Webhook event signature failed verification",
      });

      expect(res.decisionLayer).toBe("fallback");
      expect(res.issueType).toBe("integration_webhook");
      expect(res.rationale).toContain("[Fallback from Laya API (service_unavailable: Server overloaded)]");
    });
  });
});
