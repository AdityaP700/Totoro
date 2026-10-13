import type { MockTemplate } from "../domain/types";

/**
 * MOCK workspace identifiers. These are fixture values, not real Cheerio or
 * Meta resources (G7). The prototype never contacts any real system.
 */
export const MOCK_WORKSPACE = {
  sourceLabel: "MOCK" as const,
  workspaceId: "WS-DEMO-001",
  accountId: "ACC-DEMO-77",
  wabaId: "WABA-DEMO-42",
};

/**
 * The three required rejected-template fixtures (implementation handoff §7).
 * Reason codes are fixture codes (FIXTURE_*) — deliberately NOT asserted as
 * official provider reason strings (D-007, D10, G7). Every value here is mock.
 */
export const MOCK_TEMPLATES: MockTemplate[] = [
  {
    id: "TPL-1001",
    name: "festive_offer_blast",
    language: "en",
    category: "UTILITY",
    text: "Diwali Mega Sale! Flat 50% OFF on everything. Shop now: {{1}} Limited stock — grab the deal today!",
    status: "REJECTED",
    reasonCode: "FIXTURE_PROMO_UTILITY",
    reasonCodeProvenance: "FIXTURE_CODE_NOT_ASSERTED_AS_OFFICIAL",
    lastUpdated: "2026-10-12T09:24:00Z",
    sourceLabel: "MOCK",
    simulatedResubmitOutcome: "pending",
  },
  {
    id: "TPL-1002",
    name: "order_update_v3",
    language: "en",
    category: "UTILITY",
    text: "Your order {{1} has been shipped. Track it here: {{2}}. Reply STOP to opt out.",
    status: "REJECTED",
    reasonCode: "FIXTURE_INVALID_VARIABLE_FORMAT",
    reasonCodeProvenance: "FIXTURE_CODE_NOT_ASSERTED_AS_OFFICIAL",
    lastUpdated: "2026-10-12T11:02:00Z",
    sourceLabel: "MOCK",
    simulatedResubmitOutcome: "pending",
  },
  {
    id: "TPL-1003",
    name: "payment_reminder_aug",
    language: "en",
    category: "MARKETING",
    text: "Hi {{1}}, your payment of {{2}} is due on {{3}}. Pay now to avoid late fees.",
    status: "REJECTED",
    reasonCode: "FIXTURE_TAG_CONTENT_MISMATCH",
    reasonCodeProvenance: "FIXTURE_CODE_NOT_ASSERTED_AS_OFFICIAL",
    lastUpdated: "2026-10-11T16:40:00Z",
    sourceLabel: "MOCK",
    // Simulated provider-side failure: resubmission does not clear the state,
    // exercising the "Could not verify" failure path (T7).
    simulatedResubmitOutcome: "no_change",
  },
];

/** Playbook match targets for the fixtures above (kept beside the data). */
export const FIXTURE_REASON_CODES = [
  "FIXTURE_PROMO_UTILITY",
  "FIXTURE_INVALID_VARIABLE_FORMAT",
  "FIXTURE_TAG_CONTENT_MISMATCH",
] as const;
