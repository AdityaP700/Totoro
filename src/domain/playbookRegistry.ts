import type {
  AllowlistedOperation,
  DiagnosisSummary,
  IssueType,
  MockTemplate,
  ProposedChange,
  TemplateStatus,
} from "./types";

/**
 * Reusable, typed recovery playbook schema.
 * Playbooks describe end-to-end recovery procedures as declarative rules and actions.
 */
export interface RecoveryPlaybook {
  id: string;
  version?: string;
  platform?: "whatsapp" | "webhook" | "general";
  subcategory?: string;
  issueType: IssueType;
  title: string;
  description: string;
  riskLevel?: "low" | "medium" | "high" | "critical";
  priority?: number;
  entryConditions: {
    requiredEvidence: string[];
    reasonCodes?: string[];
    matchesState?: (state: MockTemplate | null) => boolean;
    applicability?: (context: { message: string; evidence?: Record<string, unknown>; attempts?: number }) => boolean;
  };
  exclusions?: string[];
  evidenceHandling: {
    onMissingEvidence: "clarify" | "escalate" | "default_unknown";
    missingEvidenceQuestion?: string;
    onConflictingEvidence: "escalate_to_human";
  };
  diagnosticSteps?: string[];
  permittedActions: Array<{
    operation: AllowlistedOperation | "check_message_status" | "none";
    description: string;
    preconditions: string[];
    requiresConfirmation: boolean;
    buildChanges?: (current: { text: string; category: string }) => ProposedChange[];
  }>;
  recommendedAction?: {
    title: string;
    subtitle: string;
    primaryCtaLabel: string;
    primaryCtaAction: string;
    secondaryCtaLabel?: string;
    secondaryCtaAction?: string;
  };
  diagnosisSummary?: DiagnosisSummary;
  responseVariants?: {
    initial?: string;
    clarification?: string;
    evidence_received?: string;
    diagnostic_completed?: string;
    issue_persists?: string;
    recovery_unavailable?: string;
    handoff_proposed?: string;
    handoff_pending?: string;
    specialist_assigned?: string;
    resolution_verified?: string;
    request_submitted?: string;
    awaiting_confirmation?: string;
    executing?: string;
    verifying?: string;
    resolved?: string;
    handoff_requested?: string;
    [key: string]: string | undefined;
  };
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
   * Deterministic matching order (Order 1 to 8):
   * 1. Mandatory safety constraints & human review (security, billing)
   * 2. Explicit human-assistance requests (human_requested)
   * 3. Ambiguous / missing context clarification (ambiguous_or_missing_context)
   * 4. Platform & category matching with applicability checks
   * 5. Reason code exact match (for template issues)
   * 6. State-matching entry conditions
   * 7. Issue type fallback match
   * 8. Stable deterministic tie-breaker
   */
  findForContext(context: {
    issueType?: IssueType;
    reasonCode?: string | null;
    templateSnapshot?: MockTemplate | null;
    message?: string;
    previousAttempts?: number;
    evidence?: Record<string, unknown>;
  }): RecoveryPlaybook {
    const { issueType, reasonCode, templateSnapshot, message = "", previousAttempts = 0 } = context;

    // 1. Mandatory safety constraints and human-led zones ALWAYS route to dedicated policy (G8, G10)
    if (issueType === "security_identity_access") {
      return this.playbooks.get("PB-SECURITY-IDENTITY-LOCKOUT")!;
    }
    if (issueType === "billing_refund") {
      return this.playbooks.get("PB-BILLING-FINANCIAL-AUDIT")!;
    }

    // 2. Explicit human-assistance requests
    if (issueType === "human_requested") {
      return this.playbooks.get("PB-HUMAN-EXPLICIT-HANDOFF")!;
    }

    // 3. Ambiguous or missing context
    if (issueType === "ambiguous_or_missing_context") {
      return this.playbooks.get("PB-AMBIGUOUS-CLARIFICATION")!;
    }

    // 4. Message delivery: evaluate specific delivery playbooks
    if (issueType === "message_delivery") {
      const lower = message.toLowerCase();
      // 4a. Persistent delivery failure
      if (
        previousAttempts > 0 ||
        lower.includes("still not") ||
        lower.includes("already checked") ||
        lower.includes("persistent") ||
        lower.includes("continues to fail") ||
        lower.includes("repeatedly") ||
        lower.includes("for over") ||
        lower.includes("multiple hours")
      ) {
        const persistentPb = this.playbooks.get("PB-DELIVERY-PERSISTENT");
        if (persistentPb) return persistentPb;
      }
      // 4b. Partial delivery
      if (
        lower.includes("partial") ||
        lower.includes("only some") ||
        lower.includes("subset") ||
        lower.includes("50%") ||
        lower.includes("half of our") ||
        lower.includes("half of the") ||
        lower.includes("part of the list")
      ) {
        const partialPb = this.playbooks.get("PB-DELIVERY-PARTIAL");
        if (partialPb) return partialPb;
      }
      // 4c. Insufficient evidence
      if (
        lower.includes("insufficient") ||
        lower.includes("no details") ||
        lower.includes("missing context") ||
        lower.includes("lacking telemetry") ||
        (lower.trim().length > 0 &&
          lower.trim().length < 25 &&
          !lower.includes("campaign") &&
          !lower.includes("order") &&
          !lower.includes("customer") &&
          !lower.includes("whatsapp"))
      ) {
        const insuffPb = this.playbooks.get("PB-DELIVERY-INSUFFICIENT-EVIDENCE");
        if (insuffPb) return insuffPb;
      }
      // 4d. Delayed delivery confirmation (default delivery playbook)
      return (
        this.playbooks.get("PB-DELIVERY-STATUS-CHECK") ||
        this.playbooks.get("PB-DELIVERY-DELAYED-CONFIRMATION")!
      );
    }

    // 5. Reason code exact match (highest specificity for template issues ONLY)
    if ((issueType === "template_rejection" || !issueType) && reasonCode) {
      for (const pb of this.playbooks.values()) {
        if (pb.entryConditions.reasonCodes?.includes(reasonCode)) {
          return pb;
        }
      }
    }

    // 6. State-matching entry conditions (for template issues ONLY)
    if ((issueType === "template_rejection" || !issueType) && templateSnapshot) {
      for (const pb of this.playbooks.values()) {
        if (pb.entryConditions.matchesState && pb.entryConditions.matchesState(templateSnapshot)) {
          return pb;
        }
      }
    }

    // 6b. Message keyword match for template rejections when no explicit reason code is provided
    if ((issueType === "template_rejection" || !issueType) && !reasonCode && message) {
      const lower = message.toLowerCase();
      if (lower.includes("variable") || lower.includes("placeholder") || lower.includes("brace") || lower.includes("format")) {
        const varPb = this.playbooks.get("PB-002-INVALID-VARIABLE-FORMAT");
        if (varPb) return varPb;
      }
      if (lower.includes("category mismatch") || lower.includes("mismatch") || lower.includes("tag")) {
        const catPb = this.playbooks.get("PB-003-TAG-CONTENT-MISMATCH");
        if (catPb) return catPb;
      }
      if (lower.includes("promotional") || lower.includes("promo")) {
        const promoPb = this.playbooks.get("PB-001-PROMO-IN-UTILITY");
        if (promoPb) return promoPb;
      }
    }

    // 7. Issue type fallback match (most recently registered playbook takes precedence)
    if (issueType) {
      const playbooks = Array.from(this.playbooks.values()).reverse();
      for (const pb of playbooks) {
        if (pb.issueType === issueType) {
          return pb;
        }
      }
    }

    // 8. Stable deterministic tie-breaker
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

    // PB-DELIVERY-STATUS-CHECK: Delayed delivery confirmation
    this.register({
      id: "PB-DELIVERY-STATUS-CHECK",
      version: "1.0.0",
      platform: "whatsapp",
      subcategory: "delayed_receipt",
      issueType: "message_delivery",
      title: "Delayed Delivery Confirmation",
      description: "Monitors carrier delivery pipeline; distinguishes sent vs confirmed delivered and checks message status.",
      entryConditions: {
        requiredEvidence: ["message_delivery_status"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Which campaign is affected, and roughly when was it sent?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [
        {
          operation: "check_message_status",
          description: "Check message delivery status against carrier gateway telemetry.",
          preconditions: ["message_delivery_status == available"],
          requiresConfirmation: false,
        },
      ],
      recommendedAction: {
        title: "Check the delivery status of an affected message to narrow down the issue.",
        subtitle: "This will help determine if the delay is temporary, limited to specific recipients, or a broader issue.",
        primaryCtaLabel: "Check message status",
        primaryCtaAction: "check_message_status",
        secondaryCtaLabel: "View supporting evidence",
        secondaryCtaAction: "view_supporting_evidence",
      },
      diagnosisSummary: {
        whatWeKnow: [
          "Messages were sent successfully from your dashboard.",
          "Delivery receipts have not been confirmed for several recipients.",
        ],
        whatRemainsUncertain: [
          "Whether this is a temporary delay or a persistent issue.",
          "The exact cause (e.g. recipient connectivity, carrier networks).",
        ],
        impact: [
          "Customers may not be receiving order updates.",
          "Ongoing campaign could be affected.",
        ],
      },
      responseVariants: {
        request_submitted:
          "I've checked the available information. Your campaign messages have been sent, but they are taking longer than usual to be marked as delivered.",
        awaiting_confirmation:
          "Ready to query carrier dispatch telemetry for unconfirmed messages. Approval requested.",
        executing:
          "Querying carrier gateway dispatch logs and queue status...",
        verifying:
          "Verifying carrier delivery telemetry receipts against expected mock state...",
        resolved:
          "Checked delivery telemetry for recent outbound campaign batches. Upstream carrier handoff is confirmed (HTTP 200).",
        handoff_requested:
          "Specialist assistance requested. Your request has been recorded. No specialist has been assigned yet. Status: Pending assignment.",
        initial:
          "I've checked the available information. Your campaign messages have been sent, but they are taking longer than usual to be marked as delivered. I don't see evidence yet that recipients have received them. Let's investigate further.",
        diagnostic_completed:
          "Checked delivery telemetry for recent outbound campaign batches. Upstream carrier handoff is confirmed (HTTP 200), but handset delivery receipts are delayed in operator networks. No template formatting errors were found.",
        issue_persists:
          "Delivery confirmation continues to be missing after carrier check. Let's escalate this case to a messaging specialist.",
        handoff_proposed:
          "Further investigation is needed because the available information does not establish why delivery confirmation is missing.",
        handoff_pending:
          "Specialist assistance requested. Your request has been recorded. No specialist has been assigned yet. Status: Pending assignment.",
      },
      expectedPostActionState: {
        status: "MONITORED",
        explanation: "Delivery receipts depend on recipient handset connectivity and carrier network routing.",
      },
      verificationRules: {
        freshReadRequired: true,
        expectedStatus: "MONITORED",
        maxRetries: 1,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Delivery failure persists after carrier monitoring period"],
    });

    // PB-DELIVERY-PARTIAL: Partial message delivery
    this.register({
      id: "PB-DELIVERY-PARTIAL",
      version: "1.0.0",
      platform: "whatsapp",
      subcategory: "partial_delivery",
      issueType: "message_delivery",
      title: "Partial Message Delivery Check",
      description: "Isolates delivery failure affecting a specific subset of recipients or phone operators.",
      entryConditions: {
        requiredEvidence: ["recipient_sample_status"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Which phone numbers or country codes are failing?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [
        {
          operation: "check_message_status",
          description: "Inspect delivery status distribution across recipient carriers.",
          preconditions: [],
          requiresConfirmation: false,
        },
      ],
      recommendedAction: {
        title: "Inspect delivery status for affected recipient segment.",
        subtitle: "Isolates whether unconfirmed deliveries share specific telco carriers or country codes.",
        primaryCtaLabel: "Inspect recipient segment",
        primaryCtaAction: "check_message_status",
        secondaryCtaLabel: "View supporting evidence",
        secondaryCtaAction: "view_supporting_evidence",
      },
      diagnosisSummary: {
        whatWeKnow: [
          "Messages were delivered to a portion of your recipient list.",
          "A specific recipient subset has unconfirmed delivery receipts.",
        ],
        whatRemainsUncertain: [
          "Whether affected handsets are currently offline or roaming.",
          "Whether recipient telecom operators are throttling high-volume traffic.",
        ],
        impact: [
          "Inconsistent customer experience across recipient segments.",
        ],
      },
      responseVariants: {
        initial:
          "I've analyzed the recipient delivery distribution. Messages are reaching some customers, but a portion of deliveries remains unconfirmed. Let's narrow down the affected recipient segment.",
      },
      expectedPostActionState: {
        status: "PARTIAL_DIAGNOSED",
        explanation: "Segment telemetry analyzed.",
      },
      verificationRules: {
        freshReadRequired: true,
        expectedStatus: "PARTIAL_DIAGNOSED",
        maxRetries: 1,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Persistent operator routing block detected"],
    });

    // PB-DELIVERY-PERSISTENT: Persistent delivery failure after diagnostic steps
    this.register({
      id: "PB-DELIVERY-PERSISTENT",
      version: "1.0.0",
      platform: "whatsapp",
      subcategory: "persistent_failure",
      issueType: "message_delivery",
      title: "Persistent Message Delivery Failure",
      description: "Escalates delivery issues that continue failing after prior checks have been executed.",
      entryConditions: {
        requiredEvidence: ["prior_checks_completed"],
      },
      evidenceHandling: {
        onMissingEvidence: "escalate",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      recommendedAction: {
        title: "Escalate to Meta Messaging Infrastructure Specialist.",
        subtitle: "Prior diagnostic checks have been completed. Manual route inspection is recommended.",
        primaryCtaLabel: "Request specialist",
        primaryCtaAction: "request_specialist",
        secondaryCtaLabel: "View supporting evidence",
        secondaryCtaAction: "view_supporting_evidence",
      },
      diagnosisSummary: {
        whatWeKnow: [
          "Prior message status checks confirmed outbound dispatch.",
          "Delivery failure has persisted across multiple monitoring intervals.",
        ],
        whatRemainsUncertain: [
          "Whether an unannounced carrier network outage or WABA rate-limit is active.",
        ],
        impact: [
          "Automated troubleshooting cannot safely recover this delivery flow.",
        ],
      },
      responseVariants: {
        initial:
          "The message delivery failure appears persistent across multiple observation windows. Because automated recovery checks are exhausted, human escalation is the safest next step.",
      },
      expectedPostActionState: {
        status: "ESCALATION_PREPARED",
        explanation: "Case packaged for messaging infrastructure specialist.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "ESCALATION_PREPARED",
        maxRetries: 0,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Delivery checks exhausted without resolution"],
    });

    // PB-DELIVERY-INSUFFICIENT-EVIDENCE: Insufficient evidence
    this.register({
      id: "PB-DELIVERY-INSUFFICIENT-EVIDENCE",
      version: "1.0.0",
      platform: "whatsapp",
      subcategory: "insufficient_evidence",
      issueType: "message_delivery",
      title: "Insufficient Delivery Evidence",
      description: "Requests minimum necessary context when delivery complaint lacks campaign or timestamp data.",
      entryConditions: {
        requiredEvidence: ["missing_campaign_context"],
      },
      evidenceHandling: {
        onMissingEvidence: "clarify",
        missingEvidenceQuestion: "Which campaign is affected, and roughly when was it sent?",
        onConflictingEvidence: "escalate_to_human",
      },
      permittedActions: [],
      recommendedAction: {
        title: "Provide affected campaign name or dispatch timeframe.",
        subtitle: "Specific campaign or recipient details are required to retrieve delivery telemetry.",
        primaryCtaLabel: "Provide details",
        primaryCtaAction: "clarify",
      },
      diagnosisSummary: {
        whatWeKnow: [
          "A message delivery symptom was reported.",
          "No campaign identifier or recipient timestamps were provided.",
        ],
        whatRemainsUncertain: [
          "Which campaign or messaging queue requires diagnostic inspection.",
        ],
        impact: [
          "Cannot query carrier delivery telemetry without campaign context.",
        ],
      },
      responseVariants: {
        initial:
          "I can help investigate message delivery, but I need a bit more context. Could you share the affected campaign name or roughly when it was sent?",
      },
      expectedPostActionState: {
        status: "AWAITING_EVIDENCE",
        explanation: "Awaiting campaign context from operator.",
      },
      verificationRules: {
        freshReadRequired: false,
        expectedStatus: "AWAITING_EVIDENCE",
        maxRetries: 1,
        failureHandoff: true,
      },
      humanHandoffConditions: ["Operator unable to provide delivery context"],
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
