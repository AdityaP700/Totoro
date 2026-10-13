import type { AllowlistedOperation, ProposedChange } from "../domain/types";

/**
 * Playbook store — rules as data (D4/P4). Editing explanations or corrections
 * here must not require UI changes.
 *
 * Playbooks match on fixture reason codes only. Unknown or absent codes must
 * never be guessed: the UNKNOWN_REASON playbook explains the limit and offers
 * human review (D10, G9, T3).
 */
export interface Playbook {
  id: string;
  match: {
    reasonCodes?: string[];
    /** Matches when the record has no usable reason code. */
    unknownReason?: boolean;
  };
  issueType: "template_rejection";
  explanation: string;
  evidenceFields: string[];
  proposedAction: {
    operation: AllowlistedOperation;
    description: string;
    buildChanges: (current: { text: string; category: string }) => ProposedChange[];
  } | null;
  needsHuman: boolean;
  escalationReason?: string;
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: "PB-001-PROMO-IN-UTILITY",
    match: { reasonCodes: ["FIXTURE_PROMO_UTILITY"] },
    issueType: "template_rejection",
    explanation:
      "The template is submitted as UTILITY but the content is promotional (an offer/discount). Categories must match the actual message purpose, so this content belongs in the MARKETING category. The prototype cannot promise Meta will approve a resubmission.",
    evidenceFields: ["category", "text", "reasonCode", "status"],
    proposedAction: {
      operation: "resubmit_template",
      description:
        "Change category UTILITY → MARKETING so the category matches the promotional content, then resubmit for review.",
      buildChanges: (current) => [
        {
          field: "category",
          before: current.category,
          after: "MARKETING",
          reason: "Content is promotional; MARKETING is the truthful category.",
        },
      ],
    },
    needsHuman: false,
  },
  {
    id: "PB-002-INVALID-VARIABLE-FORMAT",
    match: { reasonCodes: ["FIXTURE_INVALID_VARIABLE_FORMAT"] },
    issueType: "template_rejection",
    explanation:
      "The template text contains a malformed variable: '{{1}' is missing its closing brace. WhatsApp template variables must use matched double curly braces like {{1}}.",
    evidenceFields: ["text", "reasonCode", "status"],
    proposedAction: {
      operation: "resubmit_template",
      description:
        "Fix the malformed variable '{{1}' → '{{1}}' in the template text, then resubmit for review.",
      buildChanges: (current) => [
        {
          field: "text",
          before: current.text,
          after: current.text.replace(/\{\{(\d+)\}(?!\})/g, "{{$1}}"),
          reason: "Variables must be matched double braces; '{{1}' is malformed.",
        },
      ],
    },
    needsHuman: false,
  },
  {
    id: "PB-003-TAG-CONTENT-MISMATCH",
    match: { reasonCodes: ["FIXTURE_TAG_CONTENT_MISMATCH"] },
    issueType: "template_rejection",
    explanation:
      "The template content is a transactional payment reminder, but it is submitted as MARKETING. The recorded mismatch is between the category tag and the content purpose, so the truthful category is UTILITY.",
    evidenceFields: ["category", "text", "reasonCode", "status"],
    proposedAction: {
      operation: "resubmit_template",
      description:
        "Change category MARKETING → UTILITY so the category matches the payment-reminder content, then resubmit for review.",
      buildChanges: (current) => [
        {
          field: "category",
          before: current.category,
          after: "UTILITY",
          reason: "Content is a transactional reminder; UTILITY is the truthful category.",
        },
      ],
    },
    needsHuman: false,
  },
  {
    id: "PB-004-UNKNOWN-REASON",
    match: { unknownReason: true },
    issueType: "template_rejection",
    explanation:
      "The rejection cause cannot be verified from the available record: there is no usable reason code, and the prototype must not guess one. A human review can check the provider-side record.",
    evidenceFields: ["status"],
    proposedAction: null,
    needsHuman: false,
    escalationReason: "Reason code missing or unclear — cause cannot be verified (T3).",
  },
];

export function findPlaybook(reasonCode: string | null): Playbook {
  if (reasonCode) {
    const hit = PLAYBOOKS.find((p) => p.match.reasonCodes?.includes(reasonCode));
    if (hit) return hit;
  }
  return PLAYBOOKS.find((p) => p.match.unknownReason === true)!;
}
