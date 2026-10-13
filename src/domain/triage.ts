import type {
  ConfidenceBand,
  IssueType,
  Route,
  TriageResult,
  Urgency,
} from "./types";

/**
 * Deterministic rules-first triage (D5). Rules NEVER emit provider reason
 * codes, never produce tool calls, and never echo the raw user message
 * (secrets typed into a message must not propagate into rationales/logs).
 *
 * Rule order matters: first match wins. Order below is calibrated against the
 * dataset's iteration split only (seed-20261013 held-out is untouched by
 * tuning — see DECISION_LOG.md D-004).
 */
export const TRIAGE_RULE_VERSION = "rules-1.0";

interface RuleHit {
  issueType: IssueType;
  urgency: Urgency;
  needsHuman: boolean;
  route: Route;
  confidence: number;
  rationale: string;
  missingInformation?: string[];
}

type Rule = { name: string; patterns: RegExp[]; hit: RuleHit };

const i = (re: RegExp) => new RegExp(re.source, re.flags.includes("i") ? re.flags : re.flags + "i");

// --- 1. Security / identity / access / ownership / secrets: always human (G10) ---
const SECURITY: Rule = {
  name: "security_identity_access",
  patterns: [
    i(/here('?s| is) my (otp|code)\b/),
    i(/\bmy otp\b/),
    i(/\botp[:\s]*\d{4,}\b/),
    i(/\b(api[_ -]?key|access[_ -]?token|bearer token|authorization header)\b/),
    i(/\bvisible token\b/),
    i(/\bforgot my password\b/),
    i(/\breset it for me\b/),
    i(/\bpassword\b[^\n]{0,40}\b(reset|send|share|recover)\b/),
    i(/\b(ownership|workspace owner|business owner on this account|transfer[^\n]{0,20}workspace)\b/),
    i(/\b(add me as admin|admin access|admin bana|give[^\n]{0,20}admin|make me admin|teammate gave me permission)\b/),
    i(/\b(lost access|someone (changed|is using)|kisi aur ne change|account (was|has been|got) (changed|compromised|hacked)|compromis)\b/),
    i(/\b(bypass[^\n]{0,25}(verification|identity|safety|check)|skip the human check|ignore (all )?(safety|security))\b/),
    i(/\b(ignore\s+(all\s+)?(previous\s+)?instructions?|system\s*(prompt)?\s*:\s*ignore|system prompt (override|injection|instructions?)|jailbreak|disregard\s+(all\s+)?(previous\s+)?instructions?|admin override|debug mode override)\b/),
    i(/\b(roleplay as|dan mode|unrestricted ai|bypass (all )?(guardrails|rules))\b/),
    i(/\b(prompt injection|override system prompt)\b/),
    i(/\b(another customer|other customer|cross[- ]tenant|someone else'?s (campaign|account|data|logs))\b/),
    i(/\bdelete (all |every )?(customer|user) (records|data)\b/),
    i(/\b(payment link)[^\n]{0,40}(change|destination)\b|\bchange the destination url\b/),
    i(/\b(identity verify|identity verification|verify (my |the )?identity)\b/),
  ],
  hit: {
    issueType: "security_identity_access",
    urgency: "critical",
    needsHuman: true,
    route: "human_handoff",
    confidence: 0.97,
    rationale:
      "Security, identity, access or ownership is involved; policy requires human-led handling. The system may show evidence only and never changes credentials or permissions.",
  },
};

// --- 2. Explicit request for a human: immediate handoff, no bot loop (D7/G8) ---
const HUMAN_REQUEST: Rule = {
  name: "human_requested",
  patterns: [
    i(/\bhuman support\b/),
    i(/\bneed a human\b/),
    i(/\bhuman please\b/),
    i(/\bconnect me to a human\b/),
    i(/\b(speak|talk) to (a |an )?(human|person|support|someone|manager|agent)\b/),
    i(/\breal person\b/),
    i(/\bnot a bot\b/),
    i(/\bwant a manager\b/),
    i(/\b(escalate to a manager|please escalate|escalate karo)\b/),
    i(/\ba person (review|check|look)/),
    i(/\bperson review\b/),
    i(/\bcan someone check[^\n]{0,30}manually\b/),
    i(/\bcontacted support (twice|two times|again)\b/),
    i(/\bsupport se (contact|baat)\b/),
    i(/\b(human (agent|support|se)|agent se baat|baat karwao|baat karni|baat karo)\b/),
    i(/\bkisi human\b/),
    i(/\bbot nahi\b/),
    i(/\bsecond failed attempt\b/),
  ],
  hit: {
    issueType: "human_requested",
    urgency: "medium",
    needsHuman: true,
    route: "human_handoff",
    confidence: 0.97,
    rationale:
      "The user explicitly asked for a human. The request overrides automation; the case is handed off immediately with the evidence collected so far.",
  },
};

// --- 3. Billing / refunds / credits: human-led, evidence only (G10) ---
const BILLING: Rule = {
  name: "billing_refund",
  patterns: [
    i(/\brefund/),
    i(/\bdouble[ -]?(charge|payment)\b/),
    i(/\bcharg(ed|es)? (twice|two times|double)\b/),
    i(/\binvoice\b/),
    i(/\bbilling\b/),
    i(/\badd credits?\b/),
    i(/\bcancel my subscription\b/),
    i(/\bpayment (failed|issue|problem|ho gaya)\b/),
    i(/\bhow much[^\n]{0,40}(cost|charge)\b/),
    i(/\bcost estimate\b/),
    i(/\bplan price\b/),
    i(/\bthis campaign will cost\b/),
  ],
  hit: {
    issueType: "billing_refund",
    urgency: "high",
    needsHuman: true,
    route: "human_handoff",
    confidence: 0.95,
    rationale:
      "Billing, refunds or credits are involved. These are human-led decisions; the system can only preserve evidence and hand the case over.",
  },
};

// --- 4. Integration connectivity symptom (before the state-conflict rule): ---
// "connected but events/messages/leads are not arriving" is a webhook issue.
const INTEGRATION_CONNECTED_BUT_NOT_FLOWING: Rule = {
  name: "integration_connectivity",
  patterns: [
    i(/\b(connected|integration|webhook)\b[^\n]{0,40}\bbut\b[^\n]{0,40}\b(events?|messages?|leads?|deliveries?|notifications?)\b[^\n]{0,30}\b(not|stopped|aren'?t|are not|never|nahi|band)\b/),
  ],
  hit: {
    issueType: "integration_webhook",
    urgency: "high",
    needsHuman: false,
    route: "rules_playbook",
    confidence: 0.9,
    rationale:
      "The integration reports connected while expected events or messages are not arriving; connected does not prove events are flowing. The safe step is to compare last-sync evidence and delivery attempts.",
  },
};

// --- 5. Conflicting or stale state: treat as unseen case, escalate (G9/P7) ---
const STATE_CONFLICT: Rule = {
  name: "state_conflict_or_stale",
  patterns: [
    i(/(page says|screen says|record says|status says|case says)\b[^.;!?]*\bbut\b/),
    i(/\b(says|shows)\s+(connected|rejected|approved|pending|active)\b[^.;!?]*\bbut\b/),
    i(/\breason code says\b[^.;!?]*\bbut\b/),
    i(/\bsays (approved|resolved|connected|active)\b[^.;!?]*\bbut\b/),
    i(/\b(approved|resolved|connected)[^.;!?]*\b(yesterday|earlier|before)[^.;!?]*\b(now|pending|rejected|fail)/),
    i(/\bhasn'?t (been )?updated\b/),
    i(/\bnot updated in \d+ days?\b/),
    i(/\bno recent sync\b/),
    i(/\b(timed? ?out|timeout)[^.;!?]{0,40}\b(work|successful|hua)\b|\bdid it (actually )?work\b|\bactually successful\b/),
    i(/\bchanged after (i|we) approved\b/),
    i(/\b(action history|action log|audit log|event log)\b[^.;!?]{0,30}\b(missing|don'?t see|no |not there)\b|\b(missing|don'?t see|no |not seeing|cannot see|can'?t see)\b[^.;!?]{0,30}\b(action history|action log|audit log|event log)\b/),
    i(/\b(clicked|pressed) (retry|resubmit|confirm),? but\b/),
    i(/\breturned success but\b/),
    i(/\bfresh read\b/),
    i(/\b\d+ times? (in|within) (72|\d+) hours?\b/),
    i(/\bhappened \d+ times?\b/),
    i(/\bek screen\b/),
    i(/\bdoosri (screen|rejected)\b/),
    i(/\bconflicting (state|status|information)\b/),
  ],
  hit: {
    issueType: "state_conflict_or_stale",
    urgency: "high",
    needsHuman: true,
    route: "human_handoff",
    confidence: 0.93,
    rationale:
      "Observations conflict or the record looks stale. The system never picks a convenient state and never claims verification; it re-reads the authoritative state and escalates with both observations.",
  },
};

// --- 6. Ambiguity with specific shapes, matched before broad issue rules ---
const AMB_SPECIFIC: Rule[] = [
  {
    name: "ambiguous_two_templates_same_name",
    patterns: [i(/\btwo templates\b/), i(/\bsame name\b/)],
    hit: {
      issueType: "ambiguous_or_missing_context",
      urgency: "medium",
      needsHuman: false,
      route: "clarify_once",
      confidence: 0.6,
      rationale:
        "More than one template matches the description. Attaching the wrong record is a real risk, so the system asks one focused question instead of guessing.",
      missingInformation: ["which template (name or ID) is affected"],
    },
  },
  {
    name: "ambiguous_no_logs",
    patterns: [i(/\bno logs\b/), i(/\bdon'?t have logs\b/)],
    hit: {
      issueType: "ambiguous_or_missing_context",
      urgency: "medium",
      needsHuman: false,
      route: "clarify_once",
      confidence: 0.6,
      rationale:
        "Diagnosis needs minimum non-secret evidence (endpoint, timestamp, sanitized response). The system explains what is needed instead of inventing a cause.",
      missingInformation: ["sanitized log evidence or timestamps"],
    },
  },
  {
    name: "ambiguous_disable_production",
    patterns: [i(/\b(disable|turn off|shut down)\b[^\n]{0,30}\b(production|integration)\b/)],
    hit: {
      issueType: "integration_webhook",
      urgency: "medium",
      needsHuman: false,
      route: "clarify_once",
      confidence: 0.6,
      rationale:
        "Disabling a production integration is potentially disruptive. The system clarifies impact and scope first; no high-impact toggle happens without an approved control.",
      missingInformation: ["what the disable is meant to fix, and who authorizes it"],
    },
  },
  {
    name: "ambiguous_undo_wrong_approval",
    patterns: [i(/\bundo\b/), i(/\bwrong approval\b/), i(/\btyped the wrong\b/)],
    hit: {
      issueType: "ambiguous_or_missing_context",
      urgency: "high",
      needsHuman: true,
      route: "human_handoff",
      confidence: 0.85,
      rationale:
        "An approval was made in error and an undo is requested. Undoing or reversing an action is treated as potentially destructive and unclear in scope, so a human reviews what was actually changed before anything is touched.",
    },
  },
  {
    name: "ambiguous_two_matching_accounts",
    patterns: [i(/\btwo matching accounts?\b/), i(/\baccounts? with similar names?\b/)],
    hit: {
      issueType: "ambiguous_or_missing_context",
      urgency: "high",
      needsHuman: false,
      route: "clarify_once",
      confidence: 0.6,
      rationale:
        "Two candidate accounts match the description. Acting on the wrong one is a real risk, so the system asks one focused question to disambiguate before any step.",
      missingInformation: ["which account (ID or workspace) is affected"],
    },
  },
  {
    name: "ambiguous_translate_only",
    patterns: [i(/\btranslate\b/), i(/\bdon'?t change anything\b/)],
    hit: {
      issueType: "ambiguous_or_missing_context",
      urgency: "low",
      needsHuman: false,
      route: "clarify_once",
      confidence: 0.6,
      rationale:
        "The request is read-only (translation/explanation, no change). The system asks one question to identify what should be explained; no write path is offered.",
      missingInformation: ["which error or text should be explained"],
    },
  },
  {
    name: "ambiguous_dont_know_which",
    patterns: [i(/\bdon'?t know which\b/)],
    hit: {
      issueType: "ambiguous_or_missing_context",
      urgency: "medium",
      needsHuman: false,
      route: "clarify_once",
      confidence: 0.6,
      rationale:
        "The affected feature is not identifiable from the message. The system asks one concise question instead of guessing the issue type.",
      missingInformation: ["which feature or flow is failing"],
    },
  },
];

// --- 7. Bulk sends: destructive blast, human approval (destructive-action rule) ---
const BULK_SEND: Rule = {
  name: "bulk_send_guard",
  patterns: [
    i(/\b(send|resend|deliver)\b[^.;!?]{0,60}\b(all|everyone|every contact|\d{3,})\b[^.;!?]{0,60}\b(contacts?|customers?|recipients?|users?|numbers?|people)\b/),
  ],
  hit: {
    issueType: "message_delivery",
    urgency: "critical",
    needsHuman: true,
    route: "human_handoff",
    confidence: 0.95,
    rationale:
      "The request is a mass send to an entire contact base. Bulk messaging risks duplicate spam and cannot be authorized by the assistant; it needs explicit human approval of scope.",
  },
};

// --- 8. Duplicates: ask one question before anything (no blind retries) ---
const DUPLICATE_EVENTS: Rule = {
  name: "duplicate_delivery",
  patterns: [
    i(/\bsame message twice\b/),
    i(/\breceived[^\n]{0,30}(twice|two times)\b/),
    i(/\bduplicate (events?|messages?|webhooks?)\b/),
    i(/\bsending duplicate\b/),
  ],
  hit: {
    issueType: "message_delivery",
    urgency: "high",
    needsHuman: false,
    route: "clarify_once",
    confidence: 0.7,
    rationale:
      "Duplicate delivery risks duplicate side effects. The system inspects idempotency evidence and asks one focused question before any retry; no blind retries.",
    missingInformation: ["whether duplicates correlate with retries or one campaign"],
  },
  // issueType adjusted by keyword at runtime (integration duplicates)
};

// --- 9. Integration / webhook ---
const INTEGRATION: Rule = {
  name: "integration_webhook",
  patterns: [
    i(/\bwebhooks?\b/),
    i(/\bcrm\b/),
    i(/\bintegration\b/),
    i(/\bhttp ?40[13]\b/),
    i(/\b500 errors?\b/),
    i(/\bapi endpoint\b/),
    i(/\bevent (id|subscription)\b/),
  ],
  hit: {
    issueType: "integration_webhook",
    urgency: "high",
    needsHuman: false,
    route: "rules_playbook",
    confidence: 0.88,
    rationale:
      "The report points at an integration or webhook. The safe path is to inspect sanitized delivery evidence (timestamps, retry status, error class) and propose only allowlisted, confirmed steps.",
  },
};

// --- 10. Message delivery / campaigns ---
const DELIVERY: Rule = {
  name: "message_delivery",
  patterns: [
    i(/\bmeta (is )?down\b/),
    i(/\bprovider is down\b/),
    i(/\bis (meta|provider) down\b/),
    i(/\bdown right now\b/),
    i(/\bcampaign\b/),
    i(/\bdeliver(y|ed|ies)?\b/),
    i(/\bmessages?\b/),
    i(/\bsent\b/),
    i(/\bqueued\b/),
    i(/\bbulk\b/),
  ],
  hit: {
    issueType: "message_delivery",
    urgency: "high",
    needsHuman: false,
    route: "rules_playbook",
    confidence: 0.88,
    rationale:
      "The report concerns campaign or message delivery. The system distinguishes sent, delivered, read and failed from recorded events, and never promises delivery or retries without approval.",
  },
};

// --- 11. Chatbot flows ---
const CHATBOT: Rule = {
  name: "chatbot_flow",
  patterns: [
    i(/\bchatbot\b/),
    i(/\bbot\b/),
    i(/\bflow\b/),
    i(/\btrigger\b/),
    i(/\bbranch\b/),
    i(/\bpreview\b/),
  ],
  hit: {
    issueType: "chatbot_flow",
    urgency: "medium",
    needsHuman: false,
    route: "rules_playbook",
    confidence: 0.85,
    rationale:
      "The report concerns a chatbot flow. The system inspects publish state, trigger conditions and recent run evidence, and proposes only confirmed corrections.",
  },
};

// --- 12. Number / WABA setup ---
const WABA: Rule = {
  name: "number_waba_setup",
  patterns: [
    i(/\bwaba\b/),
    i(/\bdisplay name\b/),
    i(/\bwhatsapp number\b/),
    i(/\b(number|no\.)[^\n]{0,30}(connect\w*|verif\w*|otp|code|workspace)\b/),
    i(/\bconnect[^\n]{0,20}(number|workspace)\b/),
    i(/\b(connect nahi|connect kaise|nahi ho raha|can'?t connect|not connecting)\b/),
    i(/\b(connect|connecting)[^\n]{0,20}(number|account|workspace)\b/),
  ],
  hit: {
    issueType: "number_waba_setup",
    urgency: "medium",
    needsHuman: false,
    route: "rules_playbook",
    confidence: 0.85,
    rationale:
      "The report concerns number/WABA setup. The system reads the recorded connection state, shows which prerequisite is missing, and never bypasses ownership or identity checks.",
    missingInformation: [],
  },
};

// --- 13. Template rejection ---
const TEMPLATE: Rule = {
  name: "template_rejection",
  patterns: [
    i(/\btemplates?\b/),
    i(/\brejection\b/),
    i(/\brejected\b/),
    i(/\bvariable\b/),
    i(/\butility\b/),
    i(/\bmarketing copy\b/),
    i(/\bappeal\b/),
  ],
  hit: {
    issueType: "template_rejection",
    urgency: "medium",
    needsHuman: false,
    route: "rules_playbook",
    confidence: 0.9,
    rationale:
      "The report concerns a template rejection. The system reads the recorded status and reason code, explains only what the record supports, and proposes a minimal confirmed edit.",
  },
};

// --- Clarify transforms applied to a rules_playbook hit ---
const CLARIFY_TRANSFORMS: {
  name: string;
  patterns: RegExp[];
  missing: string[];
  rationale: string;
}[] = [
  {
    name: "already_tried_once",
    patterns: [i(/^i already tried once\b/)],
    missing: ["what was already tried and what exactly failed"],
    rationale:
      "The user reports a prior attempt. The system asks one focused question about what was tried before suggesting another fix; repeated failures escalate to a human.",
  },
  {
    name: "reason_code_missing",
    patterns: [i(/\breason (code )?(is )?(missing|blank|unclear|not provided|not shown|empty)\b/)],
    missing: ["the rejection reason from the template record"],
    rationale:
      "No usable rejection reason is available. The cause cannot be verified from the user's wording, so the system offers human review instead of guessing.",
  },
  {
    name: "less_promotional_keep_offer",
    patterns: [i(/\bless promotional\b/), i(/\bkeep the same offer\b/)],
    missing: ["the template's actual message purpose"],
    rationale:
      "The request could disguise promotional content as Utility. The system asks what the message is truly for and offers only a truthful category or content correction.",
  },
  {
    name: "policy_question_can_i",
    patterns: [i(/^can i\b/), i(/^kya main\b/)],
    missing: ["confirmation against current provider policy"],
    rationale:
      "This is a policy question rather than a broken state. The system answers only from verified documentation; without it, one question and a support route.",
  },
  {
    name: "check_whether",
    patterns: [i(/\bcan you check whether\b/)],
    missing: ["the authoritative status to read"],
    rationale:
      "The user asks whether something is true. The system reads only available recorded state and labels its source; without authoritative state it says so and asks.",
  },
];

// --- 14. Catch-all ambiguity ---
const AMBIGUOUS: Rule = {
  name: "ambiguous_or_missing_context",
  patterns: [
    i(/\bhelp\b/),
    i(/\bkuch bhi\b/),
    i(/\bkaam nahi\b/),
    i(/\b(not|isn'?t|ain'?t|never) working\b/),
    i(/\bbroken\b/),
    i(/\bfail(ed|ing|ure)?\b/),
    i(/\berror\b/),
    i(/\bissue\b/),
    i(/\bproblem\b/),
    i(/\bwhy did it\b/),
    i(/\bdon'?t know\b/),
    i(/\byaad nahi\b/),
    i(/\bangry\b/),
    i(/\bmake everything\b/),
    i(/\bautomatically\b/),
    i(/\bfix the thing\b/),
    i(/\bfrom yesterday\b/),
    i(/\bclicked the button\b/),
    i(/\bstatus is blank\b/),
    i(/\blast update is unknown\b/),
    i(/\berror code\b/),
    i(/\bit keeps happening\b/),
  ],
  hit: {
    issueType: "ambiguous_or_missing_context",
    urgency: "medium",
    needsHuman: false,
    route: "clarify_once",
    confidence: 0.55,
    rationale:
      "The message does not identify an affected feature. The system asks one concise question (or offers a human) instead of guessing the issue type.",
    missingInformation: ["which feature is affected"],
  },
};

const RULES_IN_ORDER: Rule[] = [
  SECURITY,
  HUMAN_REQUEST,
  BILLING,
  INTEGRATION_CONNECTED_BUT_NOT_FLOWING,
  STATE_CONFLICT,
  ...AMB_SPECIFIC,
  BULK_SEND,
  DUPLICATE_EVENTS,
  TEMPLATE,
  INTEGRATION,
  CHATBOT,
  WABA,
  DELIVERY,
  AMBIGUOUS,
];

function firstMatch(message: string): { rule: Rule; hit: RuleHit } | null {
  for (const rule of RULES_IN_ORDER) {
    if (rule.patterns.some((p) => p.test(message))) {
      return { rule, hit: { ...rule.hit } };
    }
  }
  return null;
}

function band(confidence: number): ConfidenceBand {
  return confidence >= 0.9 ? "high" : confidence >= 0.65 ? "medium" : "low";
}

/** Hinglish/en guess — only en and hinglish are supported (D11). Coarse by design. */
export function guessLanguage(message: string): "en" | "hinglish" {
  return /\b(nahi|karo|karu|kya|mera|hai|gaya|chahiye|karun|raha|bhai|milna)\b/i.test(message)
    ? "hinglish"
    : "en";
}

/**
 * Deterministic message triage. `context` carries recorded state when the
 * session has it (the 170-case evaluation passes message only).
 */
export function triageMessage(
  message: string,
  _context?: { reasonCode?: string | null; stateStatus?: string },
): TriageResult {
  const text = message.trim();
  const matched = firstMatch(text);

  let hit: RuleHit;
  if (matched) {
    hit = { ...matched.hit };
  } else {
    // Fall through to ambiguity: never guess an issue type (G9).
    hit = { ...AMBIGUOUS.hit };
  }

  // Duplicate-delivery rule: choose the issue type from surrounding keywords.
  if (matched?.rule.name === "duplicate_delivery") {
    if (/\b(webhooks?|integration|events?)\b/i.test(text)) {
      hit = {
        ...hit,
        issueType: "integration_webhook",
        rationale:
          "Duplicate events indicate a retry/idempotency problem. The system inspects event IDs and retry metadata and asks one question before any retry; no blind retries.",
      };
    } else {
      hit = { ...hit, issueType: "message_delivery" };
    }
  }

  // Clarify transforms (only for playbook-routed hits).
  if (hit.route === "rules_playbook") {
    for (const t of CLARIFY_TRANSFORMS) {
      if (t.patterns.some((p) => p.test(text))) {
        hit = {
          ...hit,
          route: "clarify_once",
          confidence: Math.min(hit.confidence, 0.6),
          rationale: t.rationale,
          missingInformation: t.missing,
        };
        break;
      }
    }
  }



  return {
    issueType: hit.issueType,
    urgency: hit.urgency,
    needsHuman: hit.needsHuman,
    route: hit.route,
    confidence: hit.confidence,
    confidenceBand: band(hit.confidence),
    rationale: hit.rationale,
    missingInformation: hit.missingInformation ?? [],
  };
}

/** Check whether user message matches deterministic security, credentials, or access patterns */
export function isSecurityRequest(message: string): boolean {
  return SECURITY.patterns.some((re) => re.test(message));
}

/** Check whether user message matches an explicit request for human assistance */
export function isExplicitHumanRequest(message: string): boolean {
  return HUMAN_REQUEST.patterns.some((re) => re.test(message));
}

/** Check whether user message matches billing, refund, invoice, or credit patterns */
export function isBillingRequest(message: string): boolean {
  return BILLING.patterns.some((re) => re.test(message));
}
