import type {
  MockTemplate,
  TriageResult,
  VerificationResult,
} from "./types";

/**
 * CustomerFacingResponse provides non-technical, plain-language explanations
 * of internal diagnoses, evidence, and next steps (Phase 1).
 *
 * Rules:
 * 1. Plain language: no provider reason codes or raw regex terms.
 * 2. Grounded in evidence: states what was observed and what evidence supports it.
 * 3. Never invent facts: no unverified live approvals, no fabricated policies.
 * 4. Human-led clarity: clearly explains why sensitive or complex cases are transferred to a human.
 * 5. Exactly one question: asks only the single most useful missing piece of information.
 */
export interface CustomerFacingResponse {
  headline: string;
  whatIsWrong: string;
  evidenceExplanation: string;
  nextSteps: string;
  clarifyingQuestion?: string;
  requiresConfirmation: boolean;
  canAutomate: boolean;
  statusLabel: string;
}

export interface ConversationalContext {
  triage: TriageResult;
  templateSnapshot?: MockTemplate | null;
  verification?: VerificationResult | null;
  previousAttempts?: number;
  uncertaintyStatus?: string;
  hasStateConflict?: boolean;
  clarifyingQuestion?: string;
  actionBlockedReason?: string;
  actionFailureKind?: string;
}

/**
 * Converts machine-readable triage and state records into customer-facing explanations.
 */
export function generateCustomerFacingResponse(
  ctx: ConversationalContext,
): CustomerFacingResponse {
  const { triage, templateSnapshot, verification, previousAttempts = 0 } = ctx;
  const issueType = triage.issueType;

  // --- 0. Fresh-read verified state ---
  if (verification?.verified) {
    return {
      headline: "Recovery Successfully Verified",
      whatIsWrong: "The previous issue has been resolved and confirmed.",
      evidenceExplanation:
        verification.statement || "Fresh read confirms the updated state matches expected.",
      nextSteps: "Your template has been resubmitted and is in the expected status.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Verified & Resolved",
    };
  }

  // --- 0b. Fresh-read verification failed (Case F) ---
  if (verification && !verification.verified) {
    return {
      headline: "Recovery Verification Failed",
      whatIsWrong:
        "An automated resubmission was attempted, but the template status remained REJECTED upon fresh inspection.",
      evidenceExplanation:
        verification.statement ||
        "Fresh state verification failed: observed status does not match the expected post-action status.",
      nextSteps:
        "Because the automated recovery did not succeed, your case file has been escalated to human support for direct review.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Verification Failed — Escalated to Support",
    };
  }

  // --- 0c. Action Execution Blocked or Failed (State drift, duplicate submission, target not found) ---
  if (ctx.actionBlockedReason) {
    return {
      headline: "Automated Action Blocked",
      whatIsWrong: ctx.actionBlockedReason,
      evidenceExplanation:
        ctx.actionFailureKind === "duplicate_idempotency_key"
          ? "Our idempotency safeguards prevent duplicate submissions with the same authorization key."
          : ctx.actionFailureKind === "before_after_mismatch"
          ? "The template state changed between diagnosis and execution; the proposed edit no longer applies."
          : "Safety checks prevented the action from mutating state.",
      nextSteps:
        "The operation was aborted to protect your account state, and this case has been escalated to human support.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Action Blocked — Escalated to Support",
    };
  }

  // --- 1. Two or more previous failed attempts (G8) ---
  if (previousAttempts >= 2) {
    return {
      headline: "Transferring to a Support Specialist",
      whatIsWrong:
        "We noticed that two previous automated recovery attempts were unsuccessful.",
      evidenceExplanation:
        "To avoid repeated failures, our policy requires a support specialist to review the case directly.",
      nextSteps:
        "Your full diagnostic history has been compiled into a case file and handed off to human support.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Escalated to Support Specialist",
    };
  }

  // --- 2. Security, Identity, Credentials, OTP (G10) ---
  if (issueType === "security_identity_access") {
    return {
      headline: "Account Security & Credentials Verification",
      whatIsWrong:
        "This request involves account access, security credentials, or permissions.",
      evidenceExplanation:
        "For your security, automated agents are strictly prohibited from modifying credentials or bypassing verification checks.",
      nextSteps:
        "A verified support specialist will review your request and verify your identity through authorized security channels.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Security Review in Progress",
    };
  }

  // --- 3. Billing, Invoices, Refunds, Credits (G10) ---
  if (issueType === "billing_refund") {
    return {
      headline: "Billing & Payment Inquiry",
      whatIsWrong:
        "This request involves financial transactions, invoices, or credit adjustments.",
      evidenceExplanation:
        "Financial and billing operations must be handled directly by our finance and support team to ensure accurate accounting.",
      nextSteps:
        "Your inquiry and relevant transaction details have been safely forwarded to our billing team.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Transferred to Billing Team",
    };
  }

  // --- 4. Explicit Human Request (D7/G8) ---
  if (issueType === "human_requested") {
    return {
      headline: "Connecting You to a Human Agent",
      whatIsWrong: "You asked to speak with a human support representative.",
      evidenceExplanation:
        "We honor human support requests immediately without looping through automated suggestions.",
      nextSteps:
        "Your conversation context and current state have been attached to a support ticket for the next available agent.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Connecting to Support Agent",
    };
  }

  // --- 5. State Conflict or Stale Cache (G12) ---
  if (issueType === "state_conflict_or_stale" || ctx.hasStateConflict) {
    return {
      headline: "Status Discrepancy Detected",
      whatIsWrong:
        "There appears to be a contradiction between what you are seeing and our recorded system status.",
      evidenceExplanation:
        "The system record does not match the observed state, which may indicate a synchronization delay or stale dashboard view.",
      nextSteps:
        "We have logged the discrepancy and escalated this to an engineer to verify the live service state directly.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Investigating Status Discrepancy",
    };
  }

  // --- 6. Ambiguous or Missing Context (G9) ---
  if (
    issueType === "ambiguous_or_missing_context" ||
    triage.route === "clarify_once" ||
    (triage.route as string) === "clarify" ||
    ctx.uncertaintyStatus === "MISSING_EVIDENCE_CLARIFIABLE"
  ) {
    const singleQuestion =
      ctx.clarifyingQuestion ||
      (triage.missingInformation && triage.missingInformation.length > 0
        ? (triage.missingInformation[0] === "template_id"
            ? "Which template name or ID is experiencing the issue?"
            : triage.missingInformation[0])
        : "Could you share the specific template name, campaign, or error message you are seeing?");

    return {
      headline: "More Information Needed",
      whatIsWrong:
        "We could not pinpoint the exact cause because some critical context is missing.",
      evidenceExplanation:
        "We checked your message against known error patterns, but could not determine which component is affected.",
      nextSteps:
        "Please answer the single question below so we can find the right solution.",
      clarifyingQuestion: singleQuestion,
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Awaiting Your Clarification",
    };
  }

  // --- 7. Template Rejection Scenarios ---
  if (issueType === "template_rejection") {
    const reasonCode = templateSnapshot?.reasonCode || "";

    if (reasonCode.includes("PROMO") || reasonCode.includes("UTILITY")) {
      return {
        headline: "Promotional Content in Utility Template",
        whatIsWrong:
          "Your template contains promotional wording (such as a sale, discount, or offer), but was submitted under the Utility category.",
        evidenceExplanation:
          "WhatsApp rules require promotional messages to be categorized as Marketing. Utility templates are reserved strictly for operational updates.",
        nextSteps:
          "We can update the category from Utility to Marketing for you. This change requires your explicit confirmation before simulated submission.",
        requiresConfirmation: true,
        canAutomate: true,
        statusLabel: "Awaiting Your Confirmation",
      };
    }

    if (reasonCode.includes("VARIABLE") || reasonCode.includes("FORMAT")) {
      return {
        headline: "Malformed Variable Syntax in Template",
        whatIsWrong:
          "Your template text has an invalid variable format (such as a missing closing curly brace like '{{1}').",
        evidenceExplanation:
          "WhatsApp template variables must always use matched double curly braces (for example: {{1}}).",
        nextSteps:
          "We can correct the variable formatting in your template text. You will be able to review the exact before and after text before confirming.",
        requiresConfirmation: true,
        canAutomate: true,
        statusLabel: "Awaiting Your Confirmation",
      };
    }

    if (reasonCode.includes("TAG") || reasonCode.includes("MISMATCH")) {
      return {
        headline: "Category Tag Does Not Match Message Content",
        whatIsWrong:
          "Your template is an operational notification (like a bill reminder), but was submitted under the Marketing category.",
        evidenceExplanation:
          "Transactional receipts and account alerts belong in the Utility category so they are delivered reliably without promotional flags.",
        nextSteps:
          "We can update the category to Utility. Review the proposed change and confirm to proceed with simulated resubmission.",
        requiresConfirmation: true,
        canAutomate: true,
        statusLabel: "Awaiting Your Confirmation",
      };
    }

    // Template rejection with unknown / unverified reason
    return {
      headline: "Template Rejection Reason Unverified",
      whatIsWrong:
        "The template is marked as rejected, but the available record does not specify the provider rejection code.",
      evidenceExplanation:
        "Our safety policy prohibits guessing rejection codes when they are not documented in the system state.",
      nextSteps:
        "We recommend having a support specialist inspect the provider-side rejection log directly.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Manual Inspection Recommended",
    };
  }

  // --- 8. Webhook & Integration Connectivity ---
  if (issueType === "integration_webhook") {
    return {
      headline: "Webhook Delivery & Event Integration Issue",
      whatIsWrong:
        "Event notifications or lead updates are not reaching your configured webhook destination.",
      evidenceExplanation:
        "System checks indicate that your integration is active, but webhook event dispatches are failing or timing out.",
      nextSteps:
        "We recommend checking your server's SSL certificate and webhook endpoint responsiveness, or re-verifying the webhook URL.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Webhook Diagnostic Completed",
    };
  }

  // --- 9. Message Delivery Delay or Queue ---
  if (issueType === "message_delivery") {
    return {
      headline: "Message Delivery Delay",
      whatIsWrong:
        "Your campaign messages have been sent but are taking longer than usual to be marked as delivered.",
      evidenceExplanation:
        "Messages are queued in the delivery pipeline. WhatsApp delivery receipts depend on recipient handset connectivity.",
      nextSteps:
        "We are monitoring the dispatch queue. If delivery receipts do not update within 15 minutes, please check your number quality status.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Queue Monitored",
    };
  }

  // --- 10. Number / WABA Setup & Verification ---
  if (issueType === "number_waba_setup") {
    return {
      headline: "WhatsApp Business Account Setup Needed",
      whatIsWrong:
        "Your phone number or business display name is not fully verified on Meta's WhatsApp Business platform.",
      evidenceExplanation:
        "Meta requires business verification and certificate registration before numbers can send outbound broadcasts.",
      nextSteps:
        "Please ensure your Meta Business Manager verification is complete and the two-step verification PIN is registered.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Setup Guidance Provided",
    };
  }

  // --- 11. Chatbot Flow / Interactive Message ---
  if (issueType === "chatbot_flow") {
    return {
      headline: "Chatbot Flow or Keyword Trigger Issue",
      whatIsWrong:
        "Your automated bot is not triggering replies when customers send expected keywords.",
      evidenceExplanation:
        "Incoming messages are reaching the inbox, but the flow engine did not match any active keyword trigger.",
      nextSteps:
        "Review your chatbot keyword routing rules and verify that the fallback automation step is enabled.",
      requiresConfirmation: false,
      canAutomate: false,
      statusLabel: "Bot Flow Analyzed",
    };
  }

  // Default fallback
  return {
    headline: "Support Recovery Status",
    whatIsWrong: "We are reviewing your request.",
    evidenceExplanation: triage.rationale,
    nextSteps: triage.needsHuman
      ? "A support specialist will assist you."
      : "Please review the guidance above.",
    requiresConfirmation: false,
    canAutomate: false,
    statusLabel: "Diagnosis Completed",
  };
}
