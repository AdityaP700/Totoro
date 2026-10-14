import type {
  AllowlistedOperation,
  IssueType,
  MockTemplate,
  ProposedChange,
  TemplateStatus,
} from "./types";

/**
 * Reusable, typed recovery playbook schema (Phase 2).
 * Playbooks describe end-to-end recovery procedures as declarative rules and actions.
 */
export interface RecoveryPlaybook {
  id: string;
  issueType: IssueType;
  title: string;
  description: string;
  entryConditions: {
    requiredEvidence: string[];
    reasonCodes?: string[];
    matchesState?: (state: MockTemplate | null) => boolean;
  };
  evidenceHandling: {
    onMissingEvidence: "clarify" | "escalate" | "default_unknown";
    missingEvidenceQuestion?: string;
    onConflictingEvidence: "escalate_to_human";
  };
  permittedActions: Array<{
    operation: AllowlistedOperation | "none";
    description: string;
    preconditions: string[];
    requiresConfirmation: boolean;
    buildChanges?: (current: { text: string; category: string }) => ProposedChange[];
  }>;
  expectedPostActionState: {
    status: TemplateStatus | string;
    explanation: string;
  };
  verificationRules: {
    freshReadRequired: boolean;
    expectedStatus: TemplateStatus | string;
    maxRetries: number;
    failureHandoff: true;
  };
  humanHandoffConditions: string[];
}

export class PlaybookRegistry {
  private playbooks: Map<string, RecoveryPlaybook> = new Map();

  constructor() {
    this.registerDefaults();
  }

  register(playbook: RecoveryPlaybook): void {
    this.playbooks.set(playbook.id, playbook);
  }

  get(id: string): RecoveryPlaybook | undefined {
    return this.playbooks.get(id);
  }

  list(): RecoveryPlaybook[] {
    return Array.from(this.playbooks.values());
  }

  /**
   * Matches the most specific playbook given available context.
   */
  findForContext(context: {
    issueType?: IssueType;
    reasonCode?: string | null;
    templateSnapshot?: MockTemplate | null;
  }): RecoveryPlaybook {
    const { issueType, reasonCode, templateSnapshot } = context;

    // 0. Sensitive / human-led zones ALWAYS route to their dedicated escalation policy (G8, G10)
    // A stale template reasonCode must NEVER override a security, billing, or human escalation.
    if (issueType === "security_identity_access") {
      return this.playbooks.get("PB-SECURITY-IDENTITY-LOCKOUT")!;
    }
    if (issueType === "billing_refund") {
      return this.playbooks.get("PB-BILLING-FINANCIAL-AUDIT")!;
    }
    if (issueType === "human_requested") {
      return this.playbooks.get("PB-HUMAN-EXPLICIT-HANDOFF")!;
    }
    if (issueType === "ambiguous_or_missing_context") {
      return this.playbooks.get("PB-AMBIGUOUS-CLARIFICATION")!;
    }

    // 1. Reason code exact match (highest specificity for template issues ONLY)
    // A delivery or billing complaint must NEVER inherit a template reason code.
    if ((issueType === "template_rejection" || !issueType) && reasonCode) {
      for (const pb of this.playbooks.values()) {
        if (pb.entryConditions.reasonCodes?.includes(reasonCode)) {
          return pb;
        }
      }
    }

    // 2. State-matching entry conditions (for template issues ONLY)
    if ((issueType === "template_rejection" || !issueType) && templateSnapshot) {
      for (const pb of this.playbooks.values()) {
        if (pb.entryConditions.matchesState && pb.entryConditions.matchesState(templateSnapshot)) {
          return pb;
        }
      }
    }

    // 3. Issue type fallback match (most recently registered playbook takes precedence)
    if (issueType) {
      const playbooks = Array.from(this.playbooks.values()).reverse();
      for (const pb of playbooks) {
        if (pb.issueType === issueType) {
          return pb;
        }
      }
    }

    // 4. Default unknown reason playbook
    return this.playbooks.get("PB-004-UNKNOWN-REASON")!;
  }

  private registerDefaults(): void {
    // PB-001: Promotional in Utility
    this.register({
      id: "PB-001-PROMO-IN-UTILITY",
      issueType: "template_rejection",
      title: "Promotional Content in Utility Category",
      description:
        "Switches template category from UTILITY to MARKETING to match promotional discount/offer text.",
      entryConditions: {
        requiredEvidence: ["template_id", "status=REJECTED", "category=UTILITY"],
        reasonCodes: ["FIXTURE_PROMO_UTILITY"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Could you confirm the template ID that was rejected?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [
        {
          operation: "resubmit_template",
          description: "Change category UTILITY → MARKETING and resubmit for review.",
          preconditions: ["category == UTILITY", "status == REJECTED"],
          requiresConfirmation: true, // G1: explicit confirmation mandatory
          buildChanges: (curr) => [
            {
              field: "category",
              before: curr.category,
              after: "MARKETING",
              reason: "Content contains promotional offer; MARKETING is the truthful category.",
            },
          ],
        },
      ],
      expectedPostActionState: {
        status: "PENDING",
        explanation: "Template is resubmitted under MARKETING category with pending review status.",
      },
      verificationRules: {
        freshReadRequired: true,
        expectedStatus: "PENDING",
        maxRetries: 2,
        failureHandoff: true,
      },
      humanHandoffConditions: [
        "User declines proposed category change",
        "Fresh-read state does not match PENDING",
        "Two resubmission attempts failed",
      ],
    });

    // PB-002: Malformed Variable Syntax
    this.register({
      id: "PB-002-INVALID-VARIABLE-FORMAT",
      issueType: "template_rejection",
      title: "Malformed Variable Syntax Correction",
      description: "Fixes missing closing curly braces in template text variables (e.g. {{1} → {{1}}).",
      entryConditions: {
        requiredEvidence: ["template_id", "status=REJECTED", "text"],
        reasonCodes: ["FIXTURE_INVALID_VARIABLE_FORMAT"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Please share the template text containing the broken variable.",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [
        {
          operation: "resubmit_template",
          description: "Fix unclosed variable braces in template text and resubmit.",
          preconditions: ["status == REJECTED"],
          requiresConfirmation: true,
          buildChanges: (curr) => [
            {
              field: "text",
              before: curr.text,
              after: curr.text.replace(/\{\{(\d+)\}(?!\})/g, "{{$1}}"),
              reason: "WhatsApp template variables must use matched double braces {{n}}.",
            },
          ],
        },
      ],
      expectedPostActionState: {
        status: "PENDING",
        explanation: "Template resubmitted with corrected variable formatting.",
      },
      verificationRules: {
        freshReadRequired: true,
        expectedStatus: "PENDING",
        maxRetries: 2,
        failureHandoff: true,
      },
      humanHandoffConditions: [
        "User declines proposed variable correction",
        "Fresh read verification fails",
      ],
    });

    // PB-003: Category Tag Content Mismatch
    this.register({
      id: "PB-003-TAG-CONTENT-MISMATCH",
      issueType: "template_rejection",
      title: "Tag Content Mismatch Correction",
      description: "Corrects transactional message wrongly tagged as MARKETING back to UTILITY.",
      entryConditions: {
        requiredEvidence: ["template_id", "status=REJECTED", "category=MARKETING"],
        reasonCodes: ["FIXTURE_TAG_CONTENT_MISMATCH"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [
        {
          operation: "resubmit_template",
          description: "Change category MARKETING → UTILITY and resubmit.",
          preconditions: ["category == MARKETING", "status == REJECTED"],
          requiresConfirmation: true,
          buildChanges: (curr) => [
            {
              field: "category",
              before: curr.category,
              after: "UTILITY",
              reason: "Content is an operational receipt/reminder; UTILITY is the truthful category.",
            },
          ],
        },
      ],
      expectedPostActionState: {
        status: "PENDING",
        explanation: "Template resubmitted under UTILITY category.",
      },
      verificationRules: {
        freshReadRequired: true,
        expectedStatus: "PENDING",
        maxRetries: 2,
        failureHandoff: true,
      },
      humanHandoffConditions: [
        "User declines proposal",
        "Fresh read mismatch",
      ],
    });

    // PB-004: Unknown / Unverified Reason
    this.register({
      id: "PB-004-UNKNOWN-REASON",
      issueType: "template_rejection",
      title: "Unknown Rejection Cause — Evidence Escalation",
      description: "Handles rejections where no verifiable reason code is present; never guesses codes.",
      entryConditions: {
        requiredEvidence: ["status=REJECTED"],
        matchesState: (s) => !s?.reasonCode || s.reasonCode === "",
      },
      evidenceHandling: {
        onMissingEvidence: "escalate",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [], // No automated write action allowed without verified code
      expectedPostActionState: {
        status: "REJECTED",
        explanation: "No state change permitted without verified provider rejection code.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "REJECTED",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Reason code cannot be verified from available record (G9/T3)"],
    });

    // PB-SECURITY: Security, Credentials & Access
    this.register({
      id: "PB-SECURITY-IDENTITY-LOCKOUT",
      issueType: "security_identity_access",
      title: "Security & Credentials Protection Policy",
      description: "Prohibits automated modification of OTP, passwords, tokens, or tenant access.",
      entryConditions: {
        requiredEvidence: ["security_signal_detected"],
      },
      evidenceHandling: {
        onMissingEvidence: "escalate",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [], // Never permit writes on security/identity
      expectedPostActionState: {
        status: "HUMAN_ESCALATION",
        explanation: "Case securely locked and routed to human security team.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "HUMAN_ESCALATION",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Security, credentials, ownership, or OTP involved (G10)"],
    });

    // PB-BILLING: Financial & Invoicing Inquiries
    this.register({
      id: "PB-BILLING-FINANCIAL-AUDIT",
      issueType: "billing_refund",
      title: "Billing & Refund Escalation Policy",
      description: "Safeguards financial transactions, invoices, and credit allocations.",
      entryConditions: {
        requiredEvidence: ["billing_signal_detected"],
      },
      evidenceHandling: {
        onMissingEvidence: "escalate",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      expectedPostActionState: {
        status: "HUMAN_ESCALATION",
        explanation: "Dispute packaged into case file and transferred to billing department.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "HUMAN_ESCALATION",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Billing, double charges, refunds, or credits involved (G10)"],
    });

    // PB-HUMAN: Explicit Human Request
    this.register({
      id: "PB-HUMAN-EXPLICIT-HANDOFF",
      issueType: "human_requested",
      title: "Explicit Human Agent Transfer",
      description: "Immediate escalation upon user request without automated deflection loops.",
      entryConditions: {
        requiredEvidence: ["explicit_human_request"],
      },
      evidenceHandling: {
        onMissingEvidence: "escalate",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      expectedPostActionState: {
        status: "HUMAN_ESCALATION",
        explanation: "Immediate transfer to human agent with complete conversation history.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "HUMAN_ESCALATION",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["User explicitly requested human support (D7/G8)"],
    });

    // PB-AMBIGUOUS: Missing Context Clarification
    this.register({
      id: "PB-AMBIGUOUS-CLARIFICATION",
      issueType: "ambiguous_or_missing_context",
      title: "Single Focused Clarification",
      description: "Asks one clarifying question to isolate component when request is underspecified.",
      entryConditions: {
        requiredEvidence: ["underspecified_symptom"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Could you specify the template name or campaign you need help with?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      expectedPostActionState: {
        status: "AWAITING_CLARIFICATION",
        explanation: "No action taken until user provides the missing identifier.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "AWAITING_CLARIFICATION",
        maxRetries: 1,
        failureHandoff: true,
      },
      humanHandoffConditions: ["User fails to clarify after 1 question", "User requests human"],
    });

    // PB-DELIVERY: Message Delivery & Queue Monitoring
    this.register({
      id: "PB-DELIVERY-STATUS-CHECK",
      issueType: "message_delivery",
      title: "Message Delivery & Queue Monitoring Policy",
      description: "Monitors carrier delivery pipeline; never promises delivery or alters templates for delivery complaints.",
      entryConditions: {
        requiredEvidence: ["message_delivery_status"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Which campaign is affected, and roughly when was it sent?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      expectedPostActionState: {
        status: "MONITORED",
        explanation: "Delivery receipts depend on recipient handset connectivity and carrier network routing.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "MONITORED",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Delivery failure persists after carrier monitoring period"],
    });

    // PB-INTEGRATION: Webhook & API Connectivity
    this.register({
      id: "PB-INTEGRATION-ENDPOINT-CHECK",
      issueType: "integration_webhook",
      title: "Webhook & API Integration Health Check",
      description: "Inspects endpoint responsiveness, SSL validity, and webhook retry metadata.",
      entryConditions: {
        requiredEvidence: ["webhook_endpoint_status"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Which endpoint or CRM is affected, and when did the failures start?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      expectedPostActionState: {
        status: "DIAGNOSTIC_COMPLETED",
        explanation: "Webhook health check completed; no state mutation permitted without verified endpoint owner.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "DIAGNOSTIC_COMPLETED",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Persistent webhook 5xx failures or authentication revocation"],
    });

    // PB-WABA: Account & Number Setup
    this.register({
      id: "PB-WABA-REGISTRATION-CHECK",
      issueType: "number_waba_setup",
      title: "WhatsApp Business Account Verification Policy",
      description: "Guides business display name verification and two-step PIN setup.",
      entryConditions: {
        requiredEvidence: ["waba_registration_status"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Which number or WABA account is affected?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      expectedPostActionState: {
        status: "GUIDANCE_PROVIDED",
        explanation: "Verification guidance provided for Meta Business Manager.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "GUIDANCE_PROVIDED",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Business registration rejected by Meta"],
    });

    // PB-CHATBOT: Flow Logic & Triggers
    this.register({
      id: "PB-CHATBOT-FLOW-CHECK",
      issueType: "chatbot_flow",
      title: "Chatbot Flow Trigger Diagnostic",
      description: "Inspects flow publish state, keyword trigger rules, and interactive branch conditions.",
      entryConditions: {
        requiredEvidence: ["chatbot_flow_status"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Which flow is affected, and what should trigger it?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      expectedPostActionState: {
        status: "FLOW_INSPECTED",
        explanation: "Chatbot trigger rules evaluated without modifying live flow state.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "FLOW_INSPECTED",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Complex flow loop or custom webhook action failure"],
    });
  }
}

export const defaultPlaybookRegistry = new PlaybookRegistry();
