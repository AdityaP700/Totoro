import { describe, expect, it, vi } from "vitest";
import {
  HybridLayaReasoningAdapter,
  RulesReasoningAdapter,
  validateModelOutput,
  type ReasoningContext,
} from "../src/domain/adapter";
import { createMockStore } from "../src/domain/mockStore";
import { ResolveSession } from "../src/domain/stateMachine";
import { loadDataset } from "../src/eval/dataset";
import { buildSplit } from "../src/eval/split";

describe("ReasoningAdapter & Hybrid Architecture", () => {
  const store = createMockStore();

  const dummyDeps = {
    store,
    now: () => "2026-10-13T10:00:00.000Z",
    newId: (p: string) => `${p}-test-123`,
  };

  it("RulesReasoningAdapter executes deterministically with zero model latency", () => {
    const adapter = new RulesReasoningAdapter();
    expect(adapter.name).toBe("rules");
    expect(adapter.version).toBe("rules-1.0");

    const res = adapter.triage({
      message: "Template TPL-1001 was rejected for promo in utility",
      templateSnapshot: store.getTemplate("TPL-1001"),
    });

    expect(res.decisionLayer).toBe("rules");
    expect(res.issueType).toBe("template_rejection");
    expect(res.route).toBe("rules_playbook");
    expect(res.needsHuman).toBe(false);
  });

  it("HybridLayaReasoningAdapter fast-paths known template rejection reasons to rules without calling model", () => {
    const mockClassifier = vi.fn();
    const adapter = new HybridLayaReasoningAdapter(mockClassifier);

    const res = adapter.triage({
      message: "Why is my template rejected?",
      templateSnapshot: store.getTemplate("TPL-1001"), // has reasonCode FIXTURE_PROMO_UTILITY
    });

    expect(mockClassifier).not.toHaveBeenCalled();
    expect(res.decisionLayer).toBe("rules");
    expect(res.issueType).toBe("template_rejection");
    expect(res.route).toBe("rules_playbook");
  });

  it("HybridLayaReasoningAdapter fast-paths sensitive and security requests deterministically", () => {
    const mockClassifier = vi.fn();
    const adapter = new HybridLayaReasoningAdapter(mockClassifier);

    const res = adapter.triage({
      message: "Please reset password and bypass verification here is my otp 1234",
    });

    expect(mockClassifier).not.toHaveBeenCalled();
    expect(res.decisionLayer).toBe("rules");
    expect(res.issueType).toBe("security_identity_access");
    expect(res.needsHuman).toBe(true);
    expect(res.route).toBe("human_handoff");
    expect(res.urgency).toBe("critical");
  });

  it("validateModelOutput strictly enforces schema allowlist and rejects malformed outputs", () => {
    const ctx: ReasoningContext = { message: "Webhook not receiving status updates" };

    // Malformed null/empty
    const emptyCheck = validateModelOutput(null, ctx);
    expect(emptyCheck.valid).toBe(false);

    // Disallowed issue type
    const badIssue = validateModelOutput(
      {
        issueType: "invented_meta_error_code",
        urgency: "medium",
        needsHuman: false,
        route: "rules_playbook",
        confidence: 0.9,
        rationale: "Fake diagnosis",
      },
      ctx,
    );
    expect(badIssue.valid).toBe(false);
    expect(badIssue.reasons.some((r) => r.includes("disallowed issueType"))).toBe(true);
  });

  it("validateModelOutput deterministic safety interceptor overrides unsafe model predictions", () => {
    const ctx: ReasoningContext = {
      message: "Someone hacked my account, please change payment link destination url",
    };

    // Model naively predicts rules_playbook
    const naiveModelOutput = {
      issueType: "template_rejection",
      urgency: "low",
      needsHuman: false,
      route: "rules_playbook",
      confidence: 0.95,
      rationale: "I can fix your link",
    };

    const validated = validateModelOutput(naiveModelOutput, ctx);
    expect(validated.valid).toBe(true);
    expect(validated.sanitized?.issueType).toBe("security_identity_access");
    expect(validated.sanitized?.needsHuman).toBe(true);
    expect(validated.sanitized?.route).toBe("human_handoff");
    expect(validated.sanitized?.urgency).toBe("critical");
    expect(validated.sanitized?.rationale).toContain("Safety override");
  });

  it("validateModelOutput confidence policy downgrades low-confidence playbook routing to clarify_once", () => {
    const ctx: ReasoningContext = {
      message: "Something seems slow with messages today",
    };

    const lowConfidenceOutput = {
      issueType: "message_delivery",
      urgency: "medium",
      needsHuman: false,
      route: "rules_playbook",
      confidence: 0.55, // Below 0.70 threshold
      rationale: "Uncertain if delivery queue is delayed",
    };

    const validated = validateModelOutput(lowConfidenceOutput, ctx);
    expect(validated.valid).toBe(true);
    expect(validated.sanitized?.route).toBe("clarify_once");
    expect(validated.sanitized?.rationale).toContain("Confidence below 0.70 threshold");
  });

  it("HybridLayaReasoningAdapter safely falls back to rules if model errors or throws", () => {
    const errorClassifier = vi.fn().mockImplementation(() => {
      throw new Error("Laya service unavailable (HTTP 503)");
    });

    const adapter = new HybridLayaReasoningAdapter(errorClassifier);
    const res = adapter.triage({
      message: "Webhook event signature failed verification",
    });

    expect(errorClassifier).toHaveBeenCalled();
    expect(res.decisionLayer).toBe("fallback");
    expect(res.issueType).toBe("integration_webhook");
    expect(res.rationale).toContain("[Fallback from model decision layer]");
  });

  it("ResolveSession records adapter details in audit events", () => {
    const hybridAdapter = new HybridLayaReasoningAdapter();
    const session = new ResolveSession(
      { ...dummyDeps, reasoningAdapter: hybridAdapter },
      { templateId: "TPL-1001", message: "Why was this rejected?" },
    );

    const triageEvent = session.state.events.find((e) => e.eventType === "TRIAGED");
    expect(triageEvent).toBeDefined();
    expect(triageEvent?.details.adapter).toBe("hybrid-laya");
    expect(triageEvent?.details.version).toBe("laya-1.0-hybrid");
    expect(triageEvent?.details.decisionLayer).toBe("rules"); // fast-pathed to rules for TPL-1001
  });

  it("Evaluates Rules vs Hybrid-Laya on held-out cases: preserves 0 safety violations and 100% human recall", () => {
    const cases = loadDataset();
    const split = buildSplit(cases);
    const heldOutCases = split.heldOut;

    const rulesAdapter = new RulesReasoningAdapter();
    const hybridAdapter = new HybridLayaReasoningAdapter();

    let rulesViolations = 0;
    let hybridViolations = 0;
    let rulesMissedHuman = 0;
    let hybridMissedHuman = 0;

    for (const c of heldOutCases) {
      const rRules = rulesAdapter.triage({ message: c.user_message });
      const rHybrid = hybridAdapter.triage({ message: c.user_message });

      if (c.needs_human) {
        if (!rRules.needsHuman) rulesMissedHuman++;
        if (!rHybrid.needsHuman) hybridMissedHuman++;
      }

      // Safety checks: billing/security must not route to rules_playbook
      const isSensitive = c.issue_type === "security_identity_access" || c.issue_type === "billing_refund";
      if (isSensitive) {
        if (rRules.route === "rules_playbook") rulesViolations++;
        if (rHybrid.route === "rules_playbook") hybridViolations++;
      }
    }

    expect(rulesMissedHuman).toBe(0);
    expect(hybridMissedHuman).toBe(0);
    expect(rulesViolations).toBe(0);
    expect(hybridViolations).toBe(0);
  });

  describe("Hybrid Decision Precedence & Regression Guardrails", () => {
    it("CR-133 regression: explicit human request overrides raw model prediction to human_handoff", () => {
      const message = "I already tried once: Can a person review this rejection?";
      const ctx: ReasoningContext = { message };

      // 1. Validator test: Raw model erroneously predicts template_rejection
      const rawModelOutput = {
        issueType: "template_rejection",
        urgency: "low",
        needsHuman: false,
        route: "rules_playbook",
        confidence: 0.95,
        rationale: "Template was rejected, proposing template fix.",
      };

      const val = validateModelOutput(rawModelOutput, ctx);
      expect(val.valid).toBe(true);
      expect(val.sanitized?.issueType).toBe("human_requested");
      expect(val.sanitized?.route).toBe("human_handoff");
      expect(val.sanitized?.needsHuman).toBe(true);
      expect(val.sanitized?.rationale).toContain("Safety override: User explicitly requested human assistance");

      // 2. Adapter fast-path test: Classifier should never be called for explicit human request
      const mockClassifier = vi.fn().mockReturnValue(rawModelOutput);
      const adapter = new HybridLayaReasoningAdapter(mockClassifier);
      const res = adapter.triage(ctx);

      expect(mockClassifier).not.toHaveBeenCalled();
      expect(res.decisionLayer).toBe("rules");
      expect(res.issueType).toBe("human_requested");
      expect(res.route).toBe("human_handoff");
      expect(res.needsHuman).toBe(true);
    });

    it("CR-107 regression: urgency alone does not justify human_requested; rejects hallucination and falls back to clarify_once", () => {
      const message = "Help please, urgent.";
      const ctx: ReasoningContext = { message };

      // 1. Validator test: Raw model hallucinates human_requested based on 'urgent'
      const hallucinatedModelOutput = {
        issueType: "human_requested",
        urgency: "high",
        needsHuman: true,
        route: "human_handoff",
        confidence: 0.88,
        rationale: "User said urgent, so transferring to human.",
      };

      const val = validateModelOutput(hallucinatedModelOutput, ctx);
      expect(val.valid).toBe(false);
      expect(val.reasons.some((r) => r.includes("urgency or vague message does not justify human_requested"))).toBe(true);

      // 2. Adapter fallback test: Rejection triggers safe fallback to rules baseline
      const mockClassifier = vi.fn().mockReturnValue(hallucinatedModelOutput);
      const adapter = new HybridLayaReasoningAdapter(mockClassifier);
      const res = adapter.triage(ctx);

      expect(mockClassifier).toHaveBeenCalled();
      expect(res.decisionLayer).toBe("fallback");
      expect(res.issueType).toBe("ambiguous_or_missing_context");
      expect(res.route).toBe("clarify_once");
      expect(res.needsHuman).toBe(false);
      expect(res.rationale).toContain("[Fallback from model decision layer]");
    });

    it("Deterministic Safety: Security request overrides model proposal to critical human_handoff", () => {
      const message = "Here is my OTP: 123456. Please connect my number.";
      const ctx: ReasoningContext = { message };

      // Validator override
      const rawModelOutput = {
        issueType: "template_rejection",
        urgency: "low",
        needsHuman: false,
        route: "rules_playbook",
        confidence: 0.99,
        rationale: "I will connect your number.",
      };

      const val = validateModelOutput(rawModelOutput, ctx);
      expect(val.valid).toBe(true);
      expect(val.sanitized?.issueType).toBe("security_identity_access");
      expect(val.sanitized?.urgency).toBe("critical");
      expect(val.sanitized?.route).toBe("human_handoff");
      expect(val.sanitized?.needsHuman).toBe(true);

      // Adapter fast-path
      const mockClassifier = vi.fn().mockReturnValue(rawModelOutput);
      const adapter = new HybridLayaReasoningAdapter(mockClassifier);
      const res = adapter.triage(ctx);

      expect(mockClassifier).not.toHaveBeenCalled();
      expect(res.decisionLayer).toBe("rules");
      expect(res.issueType).toBe("security_identity_access");
      expect(res.route).toBe("human_handoff");
      expect(res.urgency).toBe("critical");
    });

    it("Deterministic Safety: Billing and credit requests override model proposal to human_handoff", () => {
      const message = "Can you add credits to my account?";
      const ctx: ReasoningContext = { message };

      // Validator override
      const rawModelOutput = {
        issueType: "message_delivery",
        urgency: "low",
        needsHuman: false,
        route: "rules_playbook",
        confidence: 0.90,
        rationale: "Will add credits.",
      };

      const val = validateModelOutput(rawModelOutput, ctx);
      expect(val.valid).toBe(true);
      expect(val.sanitized?.issueType).toBe("billing_refund");
      expect(val.sanitized?.route).toBe("human_handoff");
      expect(val.sanitized?.needsHuman).toBe(true);

      // Adapter fast-path
      const mockClassifier = vi.fn().mockReturnValue(rawModelOutput);
      const adapter = new HybridLayaReasoningAdapter(mockClassifier);
      const res = adapter.triage(ctx);

      expect(mockClassifier).not.toHaveBeenCalled();
      expect(res.decisionLayer).toBe("rules");
      expect(res.issueType).toBe("billing_refund");
      expect(res.route).toBe("human_handoff");
      expect(res.needsHuman).toBe(true);
    });

    it("Deterministic Safety: Two previous attempts deterministically forces human handoff (G8)", () => {
      const ctx: ReasoningContext = {
        message: "Why is the template rejected?",
        previousAttempts: 2,
      };

      const rawModelOutput = {
        issueType: "template_rejection",
        urgency: "medium",
        needsHuman: false,
        route: "rules_playbook",
        confidence: 0.95,
        rationale: "Proposing automated fix.",
      };

      // Validator test
      const val = validateModelOutput(rawModelOutput, ctx);
      expect(val.valid).toBe(true);
      expect(val.sanitized?.needsHuman).toBe(true);
      expect(val.sanitized?.route).toBe("human_handoff");
      expect(val.sanitized?.rationale).toContain("Two previous attempts failed; escalated with case file (G8)");

      // Adapter fast-path test
      const mockClassifier = vi.fn().mockReturnValue(rawModelOutput);
      const adapter = new HybridLayaReasoningAdapter(mockClassifier);
      const res = adapter.triage(ctx);

      expect(mockClassifier).not.toHaveBeenCalled();
      expect(res.decisionLayer).toBe("rules");
      expect(res.needsHuman).toBe(true);
      expect(res.route).toBe("human_handoff");
    });

    it("Deterministic Safety: Model crashes, nulls, and malformed outputs safely fall back to rules baseline", () => {
      // 1. Classifier throws error
      const throwingAdapter = new HybridLayaReasoningAdapter(() => {
        throw new Error("Laya API 500 internal server error");
      });
      const res1 = throwingAdapter.triage({ message: "What is the status of my campaign?" });
      expect(res1.decisionLayer).toBe("fallback");
      expect(res1.issueType).toBe("message_delivery");

      // 2. Classifier returns malformed object
      const malformedAdapter = new HybridLayaReasoningAdapter(() => ({
        issueType: "invented_category",
      } as any));
      const res2 = malformedAdapter.triage({ message: "What is the status of my campaign?" });
      expect(res2.decisionLayer).toBe("fallback");
      expect(res2.issueType).toBe("message_delivery");
    });
  });
});
