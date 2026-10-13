import type {
  MockTemplate,
  ProposedChange,
  TemplateCategory,
} from "./types";

export interface DraftValidationChecks {
  variablesValid: boolean;
  noProhibitedContent: boolean;
  categoryCompliant: boolean;
  lengthCompliant: boolean;
}

export interface DraftValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checks: DraftValidationChecks;
}

export interface DraftProposal {
  targetId: string;
  before: {
    text: string;
    category: TemplateCategory;
  };
  after: {
    text: string;
    category: TemplateCategory;
  };
  explanation: string;
  validation: DraftValidationResult;
  isEligibleForReview: boolean;
  /** Guardrail G1: Model never approves its own output. Always false initially. */
  customerConfirmed: false;
  changes: ProposedChange[];
}

const PROMOTIONAL_KEYWORDS = [
  /\b(\d+%\s*off|discount|sale|clearance|promo(?:tion)?|special offer|limited time deal|coupon|buy now|cashback|flat \d+ off|free gift)\b/i,
];

const PROHIBITED_KEYWORDS = [
  /\b(password|cvv|credit card number|debit card pin|atm pin|share your otp)\b/i,
];

/**
 * Deterministic validator for generated or proposed WhatsApp template drafts (Phase 4).
 * Enforces Meta/WhatsApp business policy constraints, variable formatting, and category rules.
 */
export function validateTemplateDraft(
  draftText: string,
  category: TemplateCategory,
  originalText?: string,
): DraftValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Length constraint (Meta limit: 1024 chars for body text)
  const lengthCompliant = draftText.trim().length > 0 && draftText.length <= 1024;
  if (!lengthCompliant) {
    if (draftText.trim().length === 0) {
      errors.push("Template text cannot be empty.");
    } else {
      errors.push(`Template text exceeds WhatsApp 1024 character limit (${draftText.length} chars).`);
    }
  }

  // 2. Variable Syntax Validation
  let variablesValid = true;

  // Detect unclosed/dangling variable braces like '{{1}' or '{1}}'
  const malformedBraces = /\{\{\d+\}(?!\})|(?<!\{)\{\d+\}\}/.test(draftText);
  if (malformedBraces) {
    variablesValid = false;
    errors.push("Malformed variable syntax: WhatsApp template variables must use matched double curly braces like {{1}}.");
  }

  // Extract all valid variables
  const varMatches = Array.from(draftText.matchAll(/\{\{(\d+)\}\}/g)).map((m) =>
    parseInt(m[1], 10),
  );

  if (varMatches.length > 0) {
    // Check 1-indexed sequential order: {{1}}, {{2}}, ...
    const sorted = [...varMatches].sort((a, b) => a - b);
    if (sorted[0] !== 1) {
      variablesValid = false;
      errors.push(`Variables must start at {{1}} (found {{${sorted[0]}}}).`);
    }

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] !== i + 1) {
        variablesValid = false;
        errors.push(`Variables must be numbered sequentially without gaps (missing {{${i + 1}}}).`);
        break;
      }
    }
  }

  // If original text had variables, ensure they were not accidentally dropped
  if (originalText) {
    const origVarCount = (originalText.match(/\{\{\d+\}\}/g) || []).length;
    if (origVarCount > 0 && varMatches.length === 0) {
      variablesValid = false;
      errors.push("Required dynamic variables from the original template are missing in the proposed draft.");
    }
  }

  // 3. Category Compliance Validation
  let categoryCompliant = true;

  if (category === "UTILITY") {
    // Utility cannot have promotional wording
    for (const re of PROMOTIONAL_KEYWORDS) {
      if (re.test(draftText)) {
        categoryCompliant = false;
        errors.push(
          "Category violation: Promotional terms (discounts, sales, offers) are not permitted in the UTILITY category.",
        );
        break;
      }
    }
  } else if (category === "AUTHENTICATION") {
    // Authentication must mention a verification code / OTP
    const hasCodePattern = /\b(code|otp|verification|pin)\b/i.test(draftText);
    if (!hasCodePattern) {
      categoryCompliant = false;
      errors.push(
        "Category violation: AUTHENTICATION templates must contain a one-time verification code or OTP reference.",
      );
    }
  }

  // 4. Prohibited Content / Sensitive Data Policy
  let noProhibitedContent = true;
  for (const re of PROHIBITED_KEYWORDS) {
    if (re.test(draftText)) {
      noProhibitedContent = false;
      errors.push("Policy violation: Template draft contains prohibited sensitive credentials or security phrases.");
      break;
    }
  }

  const valid =
    lengthCompliant && variablesValid && categoryCompliant && noProhibitedContent;

  return {
    valid,
    errors,
    warnings,
    checks: {
      variablesValid,
      noProhibitedContent,
      categoryCompliant,
      lengthCompliant,
    },
  };
}

/**
 * Creates a validated draft proposal.
 * Failed validation blocks the draft from being treated as an eligible fix.
 */
export function createDraftProposal(params: {
  originalTemplate: MockTemplate;
  proposedText: string;
  proposedCategory: TemplateCategory;
  explanation: string;
}): DraftProposal {
  const { originalTemplate, proposedText, proposedCategory, explanation } = params;

  const validation = validateTemplateDraft(
    proposedText,
    proposedCategory,
    originalTemplate.text,
  );

  const changes: ProposedChange[] = [];
  if (originalTemplate.category !== proposedCategory) {
    changes.push({
      field: "category",
      before: originalTemplate.category,
      after: proposedCategory,
      reason: "Correct category to match template purpose.",
    });
  }
  if (originalTemplate.text !== proposedText) {
    changes.push({
      field: "text",
      before: originalTemplate.text,
      after: proposedText,
      reason: "Apply validated formatting and wording corrections.",
    });
  }

  return {
    targetId: originalTemplate.id,
    before: {
      text: originalTemplate.text,
      category: originalTemplate.category,
    },
    after: {
      text: proposedText,
      category: proposedCategory,
    },
    explanation,
    validation,
    isEligibleForReview: validation.valid,
    customerConfirmed: false,
    changes,
  };
}
