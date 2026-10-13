import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { GroqClient } from "../src/domain/groqClient";

describe("Phase 6 — Groq Client Adapter", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("handles unconfigured API key gracefully with clean error object", async () => {
    const client = new GroqClient({ apiKey: "" });
    expect(client.isConfigured).toBe(false);

    const res = await client.triage("Template was rejected");
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("unauthorized");
  });

  it("parses structured JSON choices into typed GroqApiResponse", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  issue_type: "template_rejection",
                  urgency: "medium",
                  needs_human: false,
                  confidence: 0.94,
                  rationale: "Promotional content in utility template",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 280, completion_tokens: 45 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const client = new GroqClient({ apiKey: "gsk_test_fake_key" });
    const res = await client.triage("Mera template reject ho gaya");

    expect(res.success).toBe(true);
    expect(res.issueType).toBe("template_rejection");
    expect(res.urgency).toBe("medium");
    expect(res.needsHuman).toBe(false);
    expect(res.confidence).toBe(0.94);
    expect(res.inputTokens).toBe(280);
    expect(res.outputTokens).toBe(45);
  });

  it("handles HTTP 429 rate limit errors without throwing unhandled exceptions", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { message: "Rate limit exceeded (TPM reached)" },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      ),
    );

    const client = new GroqClient({ apiKey: "gsk_test_fake_key" });
    const res = await client.triage("Help me with campaign");

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("http_429");
    expect(res.error?.message).toContain("Rate limit exceeded");
  });

  it("handles network timeout safely", async () => {
    globalThis.fetch = vi.fn().mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          const err = new Error("Request aborted");
          err.name = "AbortError";
          setTimeout(() => reject(err), 10);
        }),
    );

    const client = new GroqClient({ apiKey: "gsk_test_fake_key", timeoutMs: 50 });
    const res = await client.triage("Timeout test");

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("timeout");
  });
});
