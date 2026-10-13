import { describe, it, expect, vi, beforeEach } from "vitest";
import { runCliTriage } from "../src/cli/resolveCli";

describe("Cheerio Resolve — Terminal Entry Point (CLI)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("triages a standard template rejection with rules and playbook action requiring confirmation", async () => {
    const res = await runCliTriage({
      message: "Why was my promotional template rejected?",
      templateId: "TPL-1001",
      rulesOnly: true,
    });

    expect(res.issue_type).toBe("template_rejection");
    expect(res.urgency).toBe("medium");
    expect(res.route).toBe("safe_playbook");
    expect(res.confirmation_required).toBe(true);
    expect(res.recommended_action).toContain("resubmit");
    expect(res.is_verified).toBe(false);
    expect(res.evidence_used).toContain("template_id=TPL-1001");
    expect(res.evidence_used).toContain("reason_code=FIXTURE_PROMO_UTILITY");
    expect(res.guarded_decision.decision_layer).toBe("rules");
  });

  it("handles billing and refund queries with deterministic safety human handoff", async () => {
    const res = await runCliTriage({
      message: "I was double charged, please refund my last invoice immediately.",
      rulesOnly: true,
    });

    expect(res.issue_type).toBe("billing_refund");
    expect(res.route).toBe("human_handoff");
    expect(res.confirmation_required).toBe(false);
    expect(res.recommended_action).toContain("Handoff to human support team");
    expect(res.guarded_decision.needs_human).toBe(true);
  });

  it("handles security, OTP, and credential requests with critical human handoff", async () => {
    const res = await runCliTriage({
      message: "Here is my admin password and OTP: 123456. Reset the credentials.",
      rulesOnly: true,
    });

    expect(res.issue_type).toBe("security_identity_access");
    expect(res.urgency).toBe("critical");
    expect(res.route).toBe("human_handoff");
    expect(res.guarded_decision.needs_human).toBe(true);
  });

  it("handles ambiguous requests by routing to single clarification without action", async () => {
    const res = await runCliTriage({
      message: "Help please, something broke.",
      rulesOnly: true,
    });

    expect(res.issue_type).toBe("ambiguous_or_missing_context");
    expect(res.route).toBe("clarify");
    expect(res.confirmation_required).toBe(false);
    expect(res.recommended_action).toContain("clarifying question");
  });

  it("executes simulated action and verifies fresh state when --execute is enabled", async () => {
    const res = await runCliTriage({
      message: "Please fix the promotional category on this template.",
      templateId: "TPL-1001",
      rulesOnly: true,
      execute: true,
    });

    expect(res.issue_type).toBe("template_rejection");
    expect(res.route).toBe("safe_playbook");
    expect(res.confirmation_required).toBe(true);
    expect(res.is_verified).toBe(true);
  });

  it("fails safely and falls back to rules if hosted Laya API returns an error", async () => {
    // Mock global fetch to simulate 500 error
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "internal_error", message: "Server overloaded" } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );

    const res = await runCliTriage({
      message: "Why was my template rejected?",
      apiKey: "test_fake_api_key",
    });

    expect(res.request_status).toBe("error_internal_error");
    expect(res.guarded_decision.decision_layer).toBe("fallback");
    expect(res.issue_type).toBe("template_rejection");
  });
});
