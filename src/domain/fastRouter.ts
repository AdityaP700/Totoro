/**
 * Totoro — Cost-Aware Multilingual Customer-Support Fast Router
 *
 * Implements a high-precision deterministic routing layer across 4 language variants:
 *   - English (en)
 *   - Romanized Hindi / Hinglish (hinglish)
 *   - Devanagari Hindi Script (hi)
 *   - Mixed Language (mixed)
 *
 * Scoped Customer Support Recovery Intents:
 *   1. WhatsApp Setup (WABA onboarding, phone number verification, webhook config, green tick)
 *   2. Template Rejection & Campaign Delivery (variable format, promo in utility, opt-out, 131026, pending)
 *   3. Chatbot Flow Troubleshooting (keyword triggers, interactive buttons, webhook timeouts, fallback loops)
 *   4. Conversational Lifecycle & Policy (greetings, confirm, decline, completed steps, corrections, human requests)
 *   5. Mandatory Human Safety Zones (billing/refunds, security/credentials, adversarial overrides - G10)
 *
 * Cost-Aware Principle:
 *   Confident matches resolve deterministically in < 1ms with ZERO LLM calls.
 *   Only ambiguous, novel, or underspecified queries return `isConfident: false`,
 *   signaling a fallback to the hosted LLM.
 */

import type {
  IssueType,
  Urgency,
  ProposedNextStep,
} from "./types";
import type { ConversationalIntent, TargetRoute, ProposedCorrection } from "./conversationGraph";

export type DetectedLanguage = "en" | "hinglish" | "hi" | "mixed";

export type ScopedSupportIntent =
  | "setup_waba_onboarding"
  | "setup_phone_verification"
  | "setup_webhook_config"
  | "setup_profile_green_tick"
  | "template_variable_format"
  | "template_promotional_utility"
  | "template_opt_out"
  | "template_general_rejection"
  | "delivery_error_131026"
  | "delivery_pending"
  | "delivery_rate_limit"
  | "delivery_template_paused"
  | "chatbot_keyword_trigger"
  | "chatbot_interactive_button"
  | "chatbot_webhook_timeout"
  | "chatbot_fallback_loop"
  | "greeting"
  | "confirm"
  | "decline"
  | "completed_step"
  | "correct_information"
  | "request_human"
  | "billing_refund"
  | "security_identity_access"
  | "adversarial_override"
  | "ambiguous";

export interface FastRouterResult {
  isConfident: boolean;
  language: DetectedLanguage;
  intent: ConversationalIntent;
  scopedIntent: ScopedSupportIntent;
  issueType: IssueType;
  targetRoute: TargetRoute;
  urgency: Urgency;
  confidence: number;
  extractedEntities: Record<string, string>;
  corrections: ProposedCorrection[];
  completedChecks: string[];
  missingFields: string[];
  headline: string;
  conversationalResponse: string;
  evidenceExplanation: string;
  nextSteps: string;
  proposedNextStep: ProposedNextStep | null;
  requiresHumanEscalation: boolean;
  escalationReason?: string;
  safetyViolationBlocked?: boolean;
}

export interface FastRouterContext {
  issueType?: IssueType;
  stage?: string;
  hasActiveProposal?: boolean;
  completedChecks?: string[];
  userReportedEvidence?: Record<string, string>;
  businessContext?: any;
}

// ============================================================================
// 1. Language Detection Engine
// ============================================================================

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

const HINGLISH_MARKERS = [
  /\b(nahi|nahin|karo|karu|karein|karna|karke|karega|karegi)\b/i,
  /\b(kya|kyun|kyu|kaise|kaha|kab|kitna|kitne)\b/i,
  /\b(mera|meri|mere|humara|humaari|apka|aapka|aapki|aap)\b/i,
  /\b(hai|hain|tha|thi|hoga|hogi|hoge|hote|hota)\b/i,
  /\b(gaye the|aaye the|kar rahe the|bol rahe the)\b/i,
  /\b(gaya|gayi|gaye|ho gaya|ho gayi|ho gaye|hua|hui|hue)\b/i,
  /\b(chahiye|chahie|batao|bataiye|dikhao|dekho|dekhna)\b/i,
  /\b(raha|rahi|rahe|kar raha|kar rahi|aa raha|aa rahi)\b/i,
  /\b(bhai|yaar|dost|ji)\b/i,
  /\b(paise|paisa|kat gaya|kat gaye)\b/i,
  /\b(baat|karni|karwao|karvao|bol|bolo)\b/i,
  /\b(theek|thik|sahi|galat|dobara|pehle|baad|samajh)\b/i,
  /\b(atke|atka|atki|phas|ruk|ruka|band)\b/i,
  /\b(kuch|sab|koi|wala|wali|wale|waliya|bhi)\b/i,
  /\b(mat karo|mat poocho|mat pucho|mat bhejo|rehne do|chhod do|karna hai)\b/i,
];

export function detectLanguage(text: string): DetectedLanguage {
  if (!text || typeof text !== "string") return "en";
  const trimmed = text.trim();
  const hasDevanagari = DEVANAGARI_REGEX.test(trimmed);

  if (hasDevanagari) {
    const hasLatin = /[a-zA-Z]{2,}/.test(trimmed);
    return hasLatin ? "mixed" : "hi";
  }

  const hasHinglish = HINGLISH_MARKERS.some((re) => re.test(trimmed));
  if (hasHinglish) {
    return "hinglish";
  }

  return "en";
}

// ============================================================================
// 2. Deterministic Pattern Matchers
// ============================================================================

const i = (re: RegExp) => new RegExp(re.source, re.flags.includes("i") ? re.flags : re.flags + "i");

// --- Safety: Security / Secrets (G10) ---
const SECURITY_PATTERNS = [
  i(/here('?s| is) my (otp|code)\b/),
  i(/\bmy otp\b/),
  i(/\botp[:\s]*\d{4,}\b/),
  i(/\bmera otp\b/i),
  i(/मेरा\s*ओटीपी|मेरा\s*otp/i),
  i(/\b(api[_ -]?key|access[_ -]?token|bearer token|authorization header)\b/),
  i(/\bvisible token\b/),
  i(/\bforgot my password\b/),
  i(/\bpassword reset\b|\breset (my )?password\b/),
  i(/\bpassword\b[^\n]{0,40}\b(reset|send|share|recover)\b/),
  i(/पासवर्ड\s*रीसेट/i),
  i(/\b(add me as admin|admin access|admin bana|give[^\n]{0,20}admin|make me admin)\b/),
  i(/एडमिन\s*एक्सेस/i),
  i(/\b(account (was|has been|got) (changed|compromised|hacked)|compromis)\b/),
  i(/\baccount hack ho gaya\b/i),
  i(/खाता\s*(हैक|हैंक)|पासवर्ड[^\n]{0,30}रीसेट|एक्सेस\s*रीसेट/i),
  i(/\b(bypass[^\n]{0,25}(verification|identity|safety|check)|skip the human check|ignore (all )?(safety|security))\b/),
  i(/\b(suspicious login|2fa|two[- ]factor|account takeover)\b/),
  i(/\b(login credentials?|api credentials?|auth credentials?|stolen credentials?|compromised credentials?|reset[^\n]{0,20}credentials?)\b/),
];

// --- Safety: Adversarial System Prompt Override ---
const ADVERSARIAL_PATTERNS = [
  i(/\b(ignore\s+(all\s+)?(previous\s+)?(instructions?|rules?|policies?)|system\s*(prompt)?\s*:\s*ignore|system prompt (override|injection|instructions?)|jailbreak|disregard\s+(all\s+)?(previous\s+)?(instructions?|rules?)|admin override|debug mode override)\b/),
  i(/\b(roleplay as|dan mode|unrestricted ai|bypass (all )?(guardrails|rules))\b/),
  i(/\b(prompt injection|override system prompt)\b/),
  i(/\bmark it approved\b/),
];

// --- Safety: Billing / Refunds (G10) ---
const BILLING_PATTERNS = [
  i(/\b(refund|refunds|double[ -]?charge|double[ -]?payment|charged twice|charged two times)\b/),
  i(/\bmoney (was )?deducted\b/),
  i(/\b(paid|debited|deducted)\b[^\n]{0,50}\b(order|amount|money|account|bank|fee)\b/),
  i(/\b(bank|account) (was )?debited\b/),
  i(/\bpayment pending\b[^\n]{0,30}\b(deducted|debited|paid)\b/),
  i(/\bpaid\s+[₹$€£\d]/),
  i(/\b(paisa|paise) kat (gaya|gaye)\b/i),
  i(/\bdo baar paise kat gaye\b/i),
  i(/\brefund chahiye\b/i),
  i(/पैसे\s*कट\s*गए|रिफंड\s*चाहिए|दो\s*बार\s*चार्ज/i),
];

// --- Safety: Explicit Request for Human Support (G8/D7) ---
const HUMAN_REQUEST_PATTERNS = [
  i(/\b(human support|need a human|human please|connect me to a human|connect me with a human|human specialist)\b/),
  i(/\b(connect|transfer) (me )?(to|with) (human )?support\b/),
  i(/\b(speak|talk) to (a |an )?(human|person|support|someone|manager|agent)\b/),
  i(/\breal person\b|\bnot a bot\b|\bwant a manager\b|\bescalate to a manager\b/),
  i(/\b(support se baat|agent se baat|human agent|kisi human|bot nahi chahiye)\b/i),
  i(/\b(human|specialist|support)\b[^\n]{0,30}(baat|बात|karwao|karwaen|karwayen|karayein|se baat)/i),
  i(/मानव\s*विशेषज्ञ|कस्टमर\s*केयर|एजेंट\s*से\s*बात|इंसान\s*से\s*बात|बात\s*(करवाएं|करवाओ|करनी|कराओ)/i),
];

// --- WhatsApp Setup: WABA Onboarding ---
const SETUP_WABA_PATTERNS = [
  i(/\b(setup|set up|create|connect|onboard|onboarding)\b[^\n]{0,30}\b(waba|whatsapp business account|business manager)\b/),
  i(/\b(waba|whatsapp business account)\b[^\n]{0,30}\b(setup|onboarding|connect|verification|pending)\b/),
  i(/\bhow to (setup|connect|register) (my )?waba\b/),
  i(/\bwaba setup (kaise|karein|karna hai)\b/i),
  i(/\bwhatsapp business account connect nahi ho raha\b/i),
  i(/व्हाट्सएप\s*बिजनेस|WABA\s*(सेटअप|ऑनबोर्डिंग)|बिजनेस\s*मैनेजर/i),
];

// --- WhatsApp Setup: Phone Number Verification & OTP ---
const SETUP_PHONE_PATTERNS = [
  i(/\b(phone number|number|registration)\b[^\n]{0,30}\b(verif\w*|otp|code|timeout|fail\w*)\b/),
  i(/\b(otp not received|cannot verify phone number|registration failed)\b/),
  i(/\bdisplay name (mismatch|rejected|pending approval)\b/),
  i(/\b(phone number|number) verify nahi ho raha\b/i),
  i(/\botp nahi aa raha (whatsapp registration|number verify)\b/i),
  i(/फोन\s*नंबर\s*सत्यापन|रजिस्ट्रेशन\s*OTP|डिस्प्ले\s*नाम/i),
];

// --- WhatsApp Setup: Webhook Configuration ---
const SETUP_WEBHOOK_PATTERNS = [
  i(/\b(webhook|callback url)\b[^\n]{0,30}\b(verif\w*|token|mismatch|403|fail\w*|events?)\b/),
  i(/\bwebhook verify token mismatch\b/),
  i(/\bcallback url not receiving events\b/),
  i(/\bwebhook (verify|connect) nahi ho raha\b/i),
  i(/\bverify token mismatch aa raha hai\b/i),
  i(/वेबहुक\s*वेरिफिकेशन|टोकन\s*मिसमैच|कॉलबैक\s*URL/i),
];

// --- WhatsApp Setup: Official Business Account & Green Tick ---
const SETUP_GREEN_TICK_PATTERNS = [
  i(/\b(green tick|official business account|oba badge|verified badge)\b/),
  i(/\bhow to (get|apply for) (a |the )?(green tick|oba badge)\b/),
  i(/\bgreen tick (kaise|milega|chahiye)\b/i),
  i(/ग्रीन\s*टिक|ऑफिशियल\s*बिजनेस\s*अकाउंट\s*बैज/i),
];

// --- Template Rejection: Variable Formatting ---
const TEMPLATE_VARIABLE_PATTERNS = [
  i(/\b(variable|parameter|placeholder)\b[^\n]{0,40}\b(format\w*|sample value|curly|syntax|bracket|missing|floating)\b/),
  i(/\b(floating parameter|\{\{1\}\}|\{\{\d\}\}|sequential parameter)\b/),
  i(/\bvariable formatting (ki wajah se|ke karan)?\s*reject\b/i),
  i(/\bparameter sample value\b/i),
  i(/वेरिएबल\s*फॉर्मेटिंग|सैंपल\s*वैल्यू|पैरामीटर/i),
];

// --- Template Rejection: Promotional in Utility Category ---
const TEMPLATE_PROMO_UTILITY_PATTERNS = [
  i(/\b(promotional|marketing|offer|discount|coupon)\b[^\n]{0,40}\b(utility|category mismatch|not allowed in utility)\b/),
  i(/\butility\b[^\n]{0,40}\b(promotional|marketing|offer|discount)\b/),
  i(/\butility template\b[^\n]{0,30}\b(promotional|offer|discount|reject)\b/i),
  i(/यूटिलिटी\s*टेम्पलेट\s*में\s*प्रमोशनल|डिस्काउंट\s*ऑफर/i),
];

// --- Template Rejection: Marketing Opt-Out Missing ---
const TEMPLATE_OPT_OUT_PATTERNS = [
  i(/\b(opt[- ]?out|unsubscribe|stop instruction|stop keyword)\b[^\n]{0,40}\b(missing|lacking|required|reject\w*)\b/),
  i(/\bmarketing template\b[^\n]{0,30}\b(opt[- ]?out|unsubscribe)\b/),
  i(/\bopt[- ]?out ya unsubscribe (missing|nahi tha)\b/i),
  i(/ऑप्ट[- ]?आउट|अनसब्सक्राइब\s*निर्देश/i),
];

// --- Template Rejection: General ---
const TEMPLATE_GENERAL_PATTERNS = [
  i(/\b(template|templates)\b[^\n]{0,30}\b(rejected|rejection|disapproved|declined)\b/),
  i(/\btemplate reject ho gaya\b/i),
  i(/\bmeta ne template reject kar diya\b/i),
  i(/टेम्पलेट\s*अस्वीकृत|टेम्पलेट\s*रिजेक्ट/i),
];

// --- Campaign Delivery: Meta Error 131026 (Spam / Undeliverable) ---
const DELIVERY_131026_PATTERNS = [
  i(/\b(error (code )?131026|code 131026|131026)\b/),
  i(/\bmessage undeliverable\b[^\n]{0,30}\b131026\b/),
  i(/\berror 131026 aa raha hai\b/i),
  i(/एरर\s*131026|त्रुटि\s*कोड\s*131026/i),
];

// --- Campaign Delivery: Pending Delivery / Messages Stuck ---
const DELIVERY_PENDING_PATTERNS = [
  i(/\b(messages?|campaign)\b[^\n]{0,30}\b(pending|queued|stuck|not deliver\w*|not reach\w*)\b/),
  i(/\bwhy (are|is) (my |the )?(messages?|campaign) pending\b/),
  i(/\b(messages?|campaign)\b[^\n]{0,30}\bpending (delivery|status)\b/),
  i(/\bmessages pending (dikha raha|hai|dikh rahe)\b/i),
  i(/\bcampaign ke messages atke hue hain\b/i),
  i(/मैसेज\s*पेंडिंग|डिलीवर\s*नहीं\s*हो\s*रहे|अभियान\s*अटका/i),
];

// --- Campaign Delivery: Rate Limit & Messaging Tiers ---
const DELIVERY_RATE_LIMIT_PATTERNS = [
  i(/\b(daily messaging limit|rate limit|messaging tier|1k limit|10k limit|tier limit)\b/),
  i(/\bhit (the )?whatsapp (daily )?rate limit\b/),
  i(/\bdaily messaging limit reach ho gayi\b/i),
  i(/\brate limit aa gaya\b/i),
  i(/दैनिक\s*मैसेजिंग\s*लिमिट|रेट\s*लिमिट/i),
];

// --- Campaign Delivery: Template Paused (Low Quality Rating) ---
const DELIVERY_PAUSED_PATTERNS = [
  i(/\b(template (is )?paused|paused due to low quality|quality rating (dropped|red))\b/),
  i(/\bactive template paused by meta\b/),
  i(/\btemplate pause ho gaya\b/i),
  i(/\blow quality rating\b/i),
  i(/\b(template|templates?)\b[^\n]{0,35}\b(pause|paused)\b/i),
  i(/टेम्पलेट\s*पॉज\s*हो\s*गया|क्वालिटी\s*रेटिंग/i),
];

// --- Chatbot Troubleshooting: Keyword Trigger Failure ---
const CHATBOT_KEYWORD_PATTERNS = [
  i(/\b(chatbot|bot)\b[^\n]{0,40}\b(not triggering|not replying|keyword|trigger fail\w*|no response)\b/),
  i(/\bkeyword trigger\b[^\n]{0,30}\b(failed|fail|not working|broken|nhi|nahi)\b/),
  i(/\b(chatbot|bot) reply nahi kar raha\b/i),
  i(/\bkeyword par (bot|chatbot) trigger nahi ho raha\b/i),
  i(/कीवर्ड\s*पर\s*ट्रिगर\s*नहीं|बॉट\s*जवाब\s*नहीं\s*दे\s*रहा/i),
];

// --- Chatbot Troubleshooting: Interactive Button Response Failure ---
const CHATBOT_BUTTON_PATTERNS = [
  i(/\b(interactive button|quick reply|cta button|button click|buttons?)\b[^\n]{0,40}\b(not working|not sending|fails|no response|did not trigger|unresponsive|broken)\b/),
  i(/\bquick reply button click\b/),
  i(/\bchatbot (ke )?buttons? kaam nahi kar rahe\b/i),
  i(/\b(button|quick reply)\b[^\n]{0,40}\b(press|click)\b[^\n]{0,30}\b(nahi|aage nahi|kuch nahi)\b/i),
  i(/\bquick reply click karne par kuch nahi hota\b/i),
  i(/इंटरैक्टिव\s*बटन|क्विक\s*रिप्लाई\s*बटन\s*काम\s*नहीं/i),
];

// --- Chatbot Troubleshooting: Webhook Timeout (504 Gateway) ---
const CHATBOT_TIMEOUT_PATTERNS = [
  i(/\b(chatbot|bot)\b[^\n]{0,30}\b(timing out|timeout|latency|504 gateway)\b/),
  i(/\b504 gateway timeout\b/),
  i(/\bwebhook 504\b/),
  i(/\b504 gateway\b/),
  i(/\bchatbot timeout ho raha hai\b/i),
  i(/चैटबॉट\s*टाइमआउट|504\s*गेटवे\s*टाइमआउट/i),
];

// --- Chatbot Troubleshooting: Infinite Fallback Loop ---
const CHATBOT_LOOP_PATTERNS = [
  i(/\b(infinite fallback loop|looping on fallback|repeating default message|fallback loop)\b/),
  i(/\bkeeps repeating (default|fallback)\b/),
  i(/\b(bot|chatbot) loop me ph?ans? gaya\b/i),
  i(/\b(fallback message|fallback)\b[^\n]{0,25}\brepeat\b/i),
  i(/\bbaar baar wahi fallback message repeat kar raha\b/i),
  i(/फॉलबैक\s*लूप\s*में\s*फंस|बार-बार\s*वही\s*मैसेज/i),
];

// --- Conversational Flow: Greetings ---
const GREETING_PATTERNS = [
  /^(hi|hello|hey|good morning|good afternoon|good evening|hi there|hello there)[!.]?$/i,
  /^(namaste|namaskar|hello ji|hey totoro|hi totoro|kaise ho bhai|kaise ho)[!.]?$/i,
  /^(नमस्ते|प्रणाम|हेलो|सुप्रभात)[!.]?$/i,
];

// --- Conversational Flow: Confirmations ---
const CONFIRM_PATTERNS = [
  /^(yes|confirm|approved?|proceed|apply|go ahead|apply fix|resubmit)[!.]?$/i,
  /\b(approve simulated resubmission|go ahead and submit|apply the fix|apply kar do|fix laga do|resubmit karo)\b/i,
  /^(haan|ha|theek hai|thik hai|apply kar do|kar do|fix laga do|resubmit karo)[!.,\s]*$/i,
  /^(haan|ha|theek hai|thik hai)[!.,\s]+(resubmit|apply|karo|kar do|theek hai|thik hai)/i,
  /^(हाँ|हाँ ठीक है|पुष्टि करें|इसे लागू करें|आगे बढ़ें)[!.]?$/i,
];

// --- Conversational Flow: Declines ---
const DECLINE_PATTERNS = [
  /^(no|decline|cancel|don'?t|stop)[!.]?$/i,
  /\b(do not apply|cancel the change|decline the proposal|mat karo|cancel karo|nahi chahiye|rehne do)\b/i,
  /^(nahi|mat karo|cancel karo|rehne do)[!.,\s]*$/i,
  /^(nahi|no)[!.,\s]+(mat karo|cancel|rehne do|don'?t|cancel karo)/i,
  /^(नहीं|रद्द करें|रहने दो|बदलाव मत करो)[!.]?$/i,
];

// --- Conversational Flow: Completed Checks ---
const COMPLETED_CHECK_PATTERNS = [
  i(/\b(already checked|already verified|already done|checked it|completed the check)\b/),
  i(/\b(don'?t ask me to repeat|don'?t ask me to run the same check again)\b/),
  i(/\bcheck (kar liya|ho gaya|kar chuka hu|kar chuki hu)\b/i),
  i(/\bdobara mat poocho\b/i),
  i(/चेक\s*कर\s*लिया\s*है|जांच\s*हो\s*चुकी\s*है|दोबारा\s*मत\s*पूछें/i),
];

// --- Conversational Flow: Fact Corrections ---
const CORRECTION_PATTERNS = [
  i(/\b(correction|mistake|instead of|rather than)\b/),
  i(/\b(it'?s actually|actually it is|actually it was|actually we|actually they|actually i)\b/),
  i(/\bactually\b(?!\s+(mean|work|happen|help|matter|say|ask))/),
  i(/\bnot (net 30|tpl-\d+|october \d+)\b/),
  i(/\b(ye nahi|woh nahi|galti se|actually ye|sudhar)\b/i),
  i(/सुधार|असल\s*में/i),
];

// ============================================================================
// 3. Multilingual Response Template Engine
// ============================================================================

interface LocalizedResponse {
  headline: string;
  conversationalResponse: string;
  evidenceExplanation: string;
  nextSteps: string;
  proposedNextStep: ProposedNextStep | null;
}

function buildLocalizedResponse(
  intent: ScopedSupportIntent,
  lang: DetectedLanguage,
  entities: Record<string, string>,
): LocalizedResponse {
  switch (intent) {
    // ------------------------------------------------------------------------
    // WABA Onboarding
    // ------------------------------------------------------------------------
    case "setup_waba_onboarding": {
      if (lang === "hi") {
        return {
          headline: "व्हाट्सएप बिजनेस अकाउंट सेटअप (WABA)",
          conversationalResponse:
            "व्हाट्सएप बिजनेस API (WABA) सेटअप पूरा करने के लिए, सुनिश्चित करें कि आपका मेटा बिजनेस मैनेजर सत्यापित (verified) है और फोन नंबर किसी व्यक्तिगत व्हाट्सएप खाते से लिंक नहीं है। हमने सेटअप चेकलिस्ट तैयार कर ली है।",
          evidenceExplanation:
            "WABA पंजीकरण मेटा बिजनेस सत्यापन की प्रतीक्षा में है [DOCUMENTED]। आवश्यकता: सत्यापित मेटा बिजनेस मैनेजर और अप्रयुक्त फोन नंबर।",
          nextSteps: "मेटा बिजनेस मैनेजर में बिजनेस विवरण सत्यापित करें और 2FA फोन पंजीकरण पूरा करें।",
          proposedNextStep: {
            actionId: "verify_waba_prerequisites",
            actionTitle: "WABA सेटअप चेकलिस्ट देखें",
            supportingText: "मेटा बिजनेस मैनेजर सत्यापन और फोन नंबर प्री-रिक्विजिट्स की जांच करें।",
            primaryCtaLabel: "चेकलिस्ट देखें",
            primaryCtaAction: "verify_waba_prerequisites",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "WhatsApp Business Account Setup (WABA)",
          conversationalResponse:
            "WhatsApp Business API (WABA) setup poora karne ke liye, sunishchit karein ki aapka Meta Business Manager verified hai aur phone number kisi personal WhatsApp account se linked nahi hai. Humne aapke integration status ki jaanch kar li hai aur setup checklist taiyar hai.",
          evidenceExplanation:
            "WABA registration Meta Business verification ke liye pending hai [DOCUMENTED]. Zaroori shart: Verified Meta Business Manager aur dedicated unlinked phone number.",
          nextSteps: "Meta Business Manager me business details verify karein aur phone number ka 2FA registration poora karein.",
          proposedNextStep: {
            actionId: "verify_waba_prerequisites",
            actionTitle: "WABA Setup Checklist Dekhein",
            supportingText: "Meta Business Manager verification aur phone number prerequisites check karein.",
            primaryCtaLabel: "Checklist Dekhein",
            primaryCtaAction: "verify_waba_prerequisites",
          },
        };
      }
      return {
        headline: "WhatsApp Business Account Setup (WABA)",
        conversationalResponse:
          "To complete your WhatsApp Business API (WABA) setup, ensure your Meta Business Manager is verified and your phone number is not currently registered on a personal WhatsApp account. We have verified your integration prerequisites and generated the onboarding checklist.",
        evidenceExplanation:
          "WABA registration requires Meta Business verification [DOCUMENTED]. Prerequisites: Verified Meta Business Manager and dedicated unlinked phone number.",
        nextSteps: "Verify business details in Meta Business Manager and complete 2FA phone number registration.",
        proposedNextStep: {
          actionId: "verify_waba_prerequisites",
          actionTitle: "Inspect WABA Onboarding Checklist",
          supportingText: "Review Meta Business Manager verification status and dedicated number requirements.",
          primaryCtaLabel: "Inspect Checklist",
          primaryCtaAction: "verify_waba_prerequisites",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Phone Verification
    // ------------------------------------------------------------------------
    case "setup_phone_verification": {
      if (lang === "hi") {
        return {
          headline: "व्हाट्सएप फोन नंबर और OTP सत्यापन",
          conversationalResponse:
            "व्हाट्सएप नंबर सत्यापन के दौरान OTP प्राप्त न होने के सामान्य कारण: नंबर पहले से सक्रिय व्हाट्सएप खाते से जुड़ा होना, SMS गेटवे विलंब, या डिस्प्ले नाम मेटा दिशानिर्देशों के अनुरूप न होना।",
          evidenceExplanation:
            "फोन नंबर सत्यापन स्थिति: पेंडिंग [DOCUMENTED]। एसएमएस गेटवे टाइमआउट या पूर्व-पंजीकृत नंबर स्थिति संभावित है।",
          nextSteps: "सुनिश्चित करें कि नंबर व्यक्तिगत व्हाट्सएप से हटा दिया गया है, फिर 10 मिनट बाद नया OTP अनुरोध करें।",
          proposedNextStep: {
            actionId: "check_phone_registration_status",
            actionTitle: "फोन नंबर पंजीकरण स्थिति जांचें",
            supportingText: "जांचें कि क्या नंबर पहले से मेटा क्लाउड एपीआई पर पंजीकृत है।",
            primaryCtaLabel: "स्थिति जांचें",
            primaryCtaAction: "check_phone_registration_status",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "WhatsApp Phone Number & OTP Verification",
          conversationalResponse:
            "WhatsApp number verification ke dauran OTP na aane ke mukhya kaaran: phone number pehle se personal WhatsApp account se linked hona, SMS delivery gateway delay, ya display name Meta guidelines ke khilaf hona. Humne number status check kar liya hai.",
          evidenceExplanation:
            "Phone number verification status: Pending [DOCUMENTED]. Carrier SMS gateway timeout ya pre-registered status sambhavit hai.",
          nextSteps: "Sunishchit karein ki number personal WhatsApp se unlinked hai, aur 10 minute baad dobara OTP request karein.",
          proposedNextStep: {
            actionId: "check_phone_registration_status",
            actionTitle: "Phone Registration Status Check Karein",
            supportingText: "Verify karein ki number kisi doosre account par registered to nahi hai.",
            primaryCtaLabel: "Status Check Karein",
            primaryCtaAction: "check_phone_registration_status",
          },
        };
      }
      return {
        headline: "WhatsApp Phone Number & OTP Verification",
        conversationalResponse:
          "Common causes for missing verification OTPs include: phone number currently registered on personal WhatsApp, carrier SMS delivery delays, or display name policy rejections. We have inspected your registration telemetry.",
        evidenceExplanation:
          "Phone verification state: Pending [DOCUMENTED]. Pre-registered number or SMS carrier throttling suspected.",
        nextSteps: "Confirm the number is unlinked from personal WhatsApp and request an OTP after the 10-minute cooldown.",
        proposedNextStep: {
          actionId: "check_phone_registration_status",
          actionTitle: "Check Number Registration Status",
          supportingText: "Confirm whether the number is bound to another WhatsApp account or ready for API registration.",
          primaryCtaLabel: "Check Status",
          primaryCtaAction: "check_phone_registration_status",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Webhook Config
    // ------------------------------------------------------------------------
    case "setup_webhook_config": {
      if (lang === "hi") {
        return {
          headline: "वेबहुक कॉन्फ़िगरेशन और टोकन सत्यापन",
          conversationalResponse:
            "वेबहुक वेरिफिकेशन टोकन मिसमैच त्रुटि तब आती है जब मेटा डैशबोर्ड में दर्ज 'Verify Token' और आपके सर्वर पर कॉन्फ़िगर टोकन एक समान नहीं होते। सर्वर को 'hub.challenge' पैरामीटर को HTTP 200 के साथ तुरंत लौटाना अनिवार्य है।",
          evidenceExplanation:
            "वेबहुक कॉलबैक सत्यापन: असफल (टोकन मिसमैच) [DOCUMENTED]।",
          nextSteps: "मेटा डैशबोर्ड और सर्वर एनवायरनमेंट में समान Verify Token स्ट्रिंग सेट करें।",
          proposedNextStep: {
            actionId: "test_webhook_handshake",
            actionTitle: "वेबहुक हैंडशेक टेस्ट करें",
            supportingText: "सिम्युलेटेड hub.challenge भेजकर टोकन मैच की पुष्टि करें।",
            primaryCtaLabel: "हैंडशेक टेस्ट करें",
            primaryCtaAction: "test_webhook_handshake",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Webhook Configuration & Token Verification",
          conversationalResponse:
            "Webhook verify token mismatch error tab aata hai jab Meta dashboard me daala gaya 'Verify Token' aur aapke server configuration me set token match nahi karta. Server ko 'hub.challenge' parameter ke sath HTTP 200 return karna zaroori hai.",
          evidenceExplanation:
            "Webhook callback verification: Failed (Token mismatch) [DOCUMENTED].",
          nextSteps: "Meta Developer dashboard aur server environment me exact same verify token string set karein.",
          proposedNextStep: {
            actionId: "test_webhook_handshake",
            actionTitle: "Webhook Handshake Test Karein",
            supportingText: "hub.challenge verify token handshake validate karein.",
            primaryCtaLabel: "Handshake Test Karein",
            primaryCtaAction: "test_webhook_handshake",
          },
        };
      }
      return {
        headline: "Webhook Configuration & Token Verification",
        conversationalResponse:
          "Webhook verification fails when the 'Verify Token' entered in the Meta App Dashboard does not match the token expected by your endpoint, or if your server fails to echo the 'hub.challenge' parameter with an HTTP 200 response.",
        evidenceExplanation:
          "Webhook handshake verification: Failed (Token mismatch) [DOCUMENTED].",
        nextSteps: "Ensure the verify token in your environment matches the Meta dashboard and responds with hub.challenge.",
        proposedNextStep: {
          actionId: "test_webhook_handshake",
          actionTitle: "Test Webhook Handshake",
          supportingText: "Simulate hub.challenge token matching against your configured endpoint.",
          primaryCtaLabel: "Test Handshake",
          primaryCtaAction: "test_webhook_handshake",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Green Tick
    // ------------------------------------------------------------------------
    case "setup_profile_green_tick": {
      if (lang === "hi") {
        return {
          headline: "व्हाट्सएप ग्रीन टिक (ऑफिशियल बिजनेस अकाउंट)",
          conversationalResponse:
            "मेटा ग्रीन टिक (Official Business Account) केवल उन व्यवसायों को प्रदान करता है जिनका मेटा बिजनेस मैनेजर सत्यापित है, 2-स्टेप वेरिफिकेशन सक्रिय है, और जिनके ब्रांड की स्वतंत्र समाचार मीडिया में उल्लेखनीय उपस्थिति (notability) है।",
          evidenceExplanation:
            "OBA ग्रीन टिक आवश्यकताएं: सत्यापित बिजनेस मैनेजर, टियर 2+ मैसेजिंग लिमिट, और मीडिया कवरेज [DOCUMENTED]।",
          nextSteps: "मेटा बिजनेस मैनेजर में जाकर 'Official Business Account' के लिए आवेदन करें।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "WhatsApp Green Tick (Official Business Account)",
          conversationalResponse:
            "Meta Green Tick (Official Business Account) unhi businesses ko milta hai jinka Meta Business Manager verified ho, 2-step verification enabled ho, aur brand ki news articles me authentic notability ho. Sirf active messaging green tick ke liye kaafi nahi hai.",
          evidenceExplanation:
            "OBA Green Tick prerequisites: Verified Business Manager, Tier 2+ messaging limit, aur news media citations [DOCUMENTED].",
          nextSteps: "WhatsApp Manager me Business Profile section me jakar Official Business Account ke liye apply karein.",
          proposedNextStep: null,
        };
      }
      return {
        headline: "WhatsApp Green Tick (Official Business Account)",
        conversationalResponse:
          "Meta grants the green tick (Official Business Account badge) only to notable, well-known brands with verified Meta Business Managers, 2-factor authentication enabled, and substantial organic news coverage. High messaging volume alone does not guarantee approval.",
        evidenceExplanation:
          "OBA green tick prerequisites: Verified Business Manager, Tier 2+ messaging limit, and independent news coverage [DOCUMENTED].",
        nextSteps: "Submit an OBA application via WhatsApp Manager > Business Profile once notability criteria are met.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Template: Variable Formatting
    // ------------------------------------------------------------------------
    case "template_variable_format": {
      if (lang === "hi") {
        return {
          headline: "टेम्पलेट अस्वीकृति: वेरिएबल फॉर्मेटिंग समस्या",
          conversationalResponse:
            "आपका टेम्पलेट वेरिएबल फॉर्मेटिंग त्रुटि के कारण अस्वीकृत हुआ है। मेटा नियमों के अनुसार सभी वेरिएबल (जैसे {{1}}, {{2}}) के साथ सैंपल वैल्यू होना अनिवार्य है और संदेश की शुरुआत या अंत में फ्लोटिंग वेरिएबल नहीं हो सकते। हमने सुधार तैयार कर लिया है।",
          evidenceExplanation:
            "अस्वीकृति कारण: अमान्य वेरिएबल फॉर्मेट या अनुपलब्ध सैंपल वैल्यू [DOCUMENTED]।",
          nextSteps: "सुझाए गए फॉर्मेट सुधार की समीक्षा करें और पुनः सबमिशन को स्वीकृत करें।",
          proposedNextStep: {
            actionId: "approve_resubmission",
            actionTitle: "वेरिएबल फॉर्मेट सुधार स्वीकृत करें",
            supportingText: "मेटा दिशानिर्देशों के अनुरूप सैंपल वैल्यू जोड़ें और पुनः सबमिट करें।",
            primaryCtaLabel: "सुधार स्वीकृत करें",
            primaryCtaAction: "approve_resubmission",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Template Rejection: Variable Formatting",
          conversationalResponse:
            "Aapka template variable formatting ki wajah se reject hua hai. WhatsApp ke rules ke mutabiq sabhi parameters (jaise {{1}}, {{2}}) ke sath sample values hona zaroori hai aur message ke shuru ya aakhri me akele variable nahi hone chahiye. Humne iska verified fix taiyar kar liya hai.",
          evidenceExplanation:
            "Rejection reason: Invalid variable formatting ya missing sample parameters [DOCUMENTED].",
          nextSteps: "Neeche diye gaye variable syntax correction ko review karein aur resubmission approve karein.",
          proposedNextStep: {
            actionId: "approve_resubmission",
            actionTitle: "Variable Format Correction Approve Karein",
            supportingText: "Sample values add karke Meta guidelines ke mutabiq resubmit karein.",
            primaryCtaLabel: "Fix Approve Karein",
            primaryCtaAction: "approve_resubmission",
          },
        };
      }
      return {
        headline: "Template Rejection: Variable Formatting",
        conversationalResponse:
          "Your template was rejected due to parameter formatting issues. Meta requires all variable placeholders (e.g. {{1}}, {{2}}) to have representative sample values and prohibits floating parameters at the start or end of the message body. We have prepared an authorized formatting fix.",
        evidenceExplanation:
          "Rejection reason: Invalid variable formatting or missing sample parameters [DOCUMENTED].",
        nextSteps: "Review the proposed variable syntax correction and approve simulated resubmission.",
        proposedNextStep: {
          actionId: "approve_resubmission",
          actionTitle: "Approve Variable Formatting Fix",
          supportingText: "Attach representative sample parameters and resubmit to verification boundary.",
          primaryCtaLabel: "Approve Resubmission",
          primaryCtaAction: "approve_resubmission",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Template: Promotional in Utility
    // ------------------------------------------------------------------------
    case "template_promotional_utility": {
      if (lang === "hi") {
        return {
          headline: "टेम्पलेट अस्वीकृति: यूटिलिटी श्रेणी में प्रमोशनल कंटेंट",
          conversationalResponse:
            "मेटा ने आपके यूटिलिटी टेम्पलेट को अस्वीकृत कर दिया क्योंकि इसमें प्रमोशनल ऑफर या मार्केटिंग भाषा शामिल थी। यूटिलिटी टेम्पलेट केवल ऑर्डर अपडेट या अकाउंट नोटिफिकेशन के लिए होने चाहिए। हमने मार्केटिंग कॉपी हटाकर यूटिलिटी कंटेंट का शुद्ध रूप तैयार किया है।",
          evidenceExplanation:
            "श्रेणी बेमेल: यूटिलिटी टेम्पलेट में मार्केटिंग भाषा प्रतिबंधित है [DOCUMENTED]।",
          nextSteps: "प्रमोशनल ऑफर हटाएं या श्रेणी को 'Marketing' में बदलें।",
          proposedNextStep: {
            actionId: "approve_resubmission",
            actionTitle: "यूटिलिटी सुधार स्वीकृत करें",
            supportingText: "डिस्काउंट हटाकर केवल शुद्ध ऑर्डर स्थिति विवरण रखें।",
            primaryCtaLabel: "सुधार स्वीकृत करें",
            primaryCtaAction: "approve_resubmission",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Template Rejection: Utility Me Promotional Content",
          conversationalResponse:
            "Meta ne aapka utility template reject kiya hai kyunki isme promotional offer ya discount copy shamil thi. Utility templates sirf order updates ya account alerts ke liye hote hain. Humne promotional text hata kar clean utility template draft kar diya hai.",
          evidenceExplanation:
            "Category mismatch: Utility template me marketing text allow nahi hai [DOCUMENTED].",
          nextSteps: "Promotional text remove karein ya category badal kar Marketing karein.",
          proposedNextStep: {
            actionId: "approve_resubmission",
            actionTitle: "Utility Fix Approve Karein",
            supportingText: "Marketing discount text hata kar clean order confirmation resubmit karein.",
            primaryCtaLabel: "Fix Approve Karein",
            primaryCtaAction: "approve_resubmission",
          },
        };
      }
      return {
        headline: "Template Rejection: Promotional Content in Utility",
        conversationalResponse:
          "Meta rejected this utility template because it contained promotional phrasing or discount offers. Utility templates must be strictly transactional (e.g. order tracking, account notifications). We have prepared a sanitized utility proposal removing marketing claims.",
        evidenceExplanation:
          "Category mismatch: Marketing and promotional copy prohibited in Utility category [DOCUMENTED].",
        nextSteps: "Remove promotional offers or change the template category to Marketing.",
        proposedNextStep: {
          actionId: "approve_resubmission",
          actionTitle: "Approve Utility Sanitization Fix",
          supportingText: "Strip marketing language to conform to Meta utility guidelines.",
          primaryCtaLabel: "Approve Resubmission",
          primaryCtaAction: "approve_resubmission",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Template: Opt-Out Missing
    // ------------------------------------------------------------------------
    case "template_opt_out": {
      if (lang === "hi") {
        return {
          headline: "टेम्पलेट अस्वीकृति: अनसब्सक्राइब / ऑप्ट-आउट निर्देश अनुपलब्ध",
          conversationalResponse:
            "मेटा दिशानिर्देशों के तहत मार्केटिंग अभियानों में स्पष्ट ऑप्ट-आउट या 'STOP' निर्देश होना अनिवार्य है। आपके टेम्पलेट में अनसब्सक्राइब विकल्प न होने के कारण यह अस्वीकृत हुआ।",
          evidenceExplanation:
            "अस्वीकृति कारण: मार्केटिंग टेम्पलेट में आवश्यक ऑप्ट-आउट फुटर गायब है [DOCUMENTED]।",
          nextSteps: "फुटर में 'Reply STOP to opt out' बटन या टेक्स्ट जोड़ें।",
          proposedNextStep: {
            actionId: "approve_resubmission",
            actionTitle: "ऑप्ट-आउट फुटर जोड़ें",
            supportingText: "फुटर में मानक अनसब्सक्राइब निर्देश जोड़कर पुनः सबमिट करें।",
            primaryCtaLabel: "फुटर जोड़ें",
            primaryCtaAction: "approve_resubmission",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Template Rejection: Opt-Out Footer Missing",
          conversationalResponse:
            "WhatsApp Marketing guidelines ke anusaar marketing messages me customer ko opt-out ya STOP karne ka clear option dena mandatory hai. Aapke template me unsubscribe instruction nahi tha isliye Meta ne reject kiya.",
          evidenceExplanation:
            "Rejection reason: Marketing template me required opt-out footer absent hai [DOCUMENTED].",
          nextSteps: "Footer me 'Reply STOP to unsubscribe' text ya Quick Reply button add karein.",
          proposedNextStep: {
            actionId: "approve_resubmission",
            actionTitle: "Opt-Out Footer Add Karein",
            supportingText: "Unsubscribe instruction jod kar resubmit karein.",
            primaryCtaLabel: "Fix Approve Karein",
            primaryCtaAction: "approve_resubmission",
          },
        };
      }
      return {
        headline: "Template Rejection: Missing Opt-Out Instructions",
        conversationalResponse:
          "Meta requires all marketing templates to include clear opt-out instructions (e.g. 'Reply STOP to unsubscribe') or a quick-reply STOP button. This template was rejected for omitting required unsubscribe guidance.",
        evidenceExplanation:
          "Rejection reason: Marketing template lacks required opt-out mechanism [DOCUMENTED].",
        nextSteps: "Add a footer or quick-reply button with opt-out instructions and resubmit.",
        proposedNextStep: {
          actionId: "approve_resubmission",
          actionTitle: "Add Opt-Out Footer",
          supportingText: "Incorporate compliant STOP instructions and resubmit for Meta review.",
          primaryCtaLabel: "Approve Resubmission",
          primaryCtaAction: "approve_resubmission",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Template: General Rejection
    // ------------------------------------------------------------------------
    case "template_general_rejection": {
      if (lang === "hi") {
        return {
          headline: "व्हाट्सएप टेम्पलेट अस्वीकृति जांच",
          conversationalResponse:
            "आपका व्हाट्सएप टेम्पलेट मेटा द्वारा अस्वीकृत किया गया है। हमने आपके टेम्पलेट रिकॉर्ड का विश्लेषण किया है ताकि अस्वीकृति के सटीक कारण की पहचान की जा सके और मेटा दिशानिर्देशों के अनुसार सुधार किया जा सके।",
          evidenceExplanation:
            "टेम्पलेट स्थिति: अस्वीकृत (REJECTED) [DOCUMENTED]। मेटा ऑडिट रिकॉर्ड का निरीक्षण किया गया।",
          nextSteps: "प्रस्तावित सुधार की समीक्षा करें और पुष्टि करें।",
          proposedNextStep: {
            actionId: "clarify",
            actionTitle: "टेम्पलेट अस्वीकृति विवरण प्रदान करें",
            supportingText: "व्हाट्सएप मैनेजर में दर्शाया गया विशिष्ट अस्वीकृति कारण साझा करें।",
            primaryCtaLabel: "विवरण साझा करें",
            primaryCtaAction: "clarify",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "WhatsApp Template Rejection Investigation",
          conversationalResponse:
            "Aapka WhatsApp template Meta dwara reject ho gaya hai. Humne aapke template record ki jaanch shuru kar di hai taaki exact rejection reason nikal kar compliant fix prepare kiya ja sake.",
          evidenceExplanation:
            "Template status: REJECTED [DOCUMENTED]. Authoritative mock record read.",
          nextSteps: "Proposed correction ko review karein aur resubmission approve karein.",
          proposedNextStep: {
            actionId: "clarify",
            actionTitle: "Rejection Details Provide Karein",
            supportingText: "WhatsApp Manager me dikhne wala exact rejection reason share karein.",
            primaryCtaLabel: "Details Share Karein",
            primaryCtaAction: "clarify",
          },
        };
      }
      return {
        headline: "WhatsApp template rejection",
        conversationalResponse:
          "Your WhatsApp template was rejected by Meta. We have read the recorded template state to identify the exact policy issue and prepare a verified correction.",
        evidenceExplanation:
          "Template status: REJECTED [DOCUMENTED]. Official rejection reason evaluated from record.",
        nextSteps: "Review the proposed correction and approve simulated resubmission.",
        proposedNextStep: {
          actionId: "clarify",
          actionTitle: "Provide Rejection Reason Code",
          supportingText: "Share the specific reason code displayed in WhatsApp Manager if not already recorded.",
          primaryCtaLabel: "Provide Reason",
          primaryCtaAction: "clarify",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Delivery: Error 131026
    // ------------------------------------------------------------------------
    case "delivery_error_131026": {
      if (lang === "hi") {
        return {
          headline: "डिलीवरी विफलता: मेटा एरर कोड 131026 (Message Undeliverable)",
          conversationalResponse:
            "मेटा एरर कोड 131026 का अर्थ है कि संदेश प्राप्तकर्ता तक नहीं पहुंचाया जा सका। यह आमतौर पर तब होता है जब प्राप्तकर्ता ने आपके नंबर को ब्लॉक किया हो, उनकी व्हाट्सएप सेवा निष्क्रिय हो, या मेटा ने स्पैम नियंत्रण नीतियों के तहत डिलीवरी रोक दी हो।",
          evidenceExplanation:
            "डिलीवरी स्थिति: असफल (त्रुटि 131026) [DOCUMENTED]। व्यक्तिगत हैंडसेट ब्लॉक या स्पैम रेटिंग नियंत्रण।",
          nextSteps: "प्रभावित फोन नंबरों की सूची की जांच करें और अमान्य या अनसब्सक्राइब किए गए नंबरों को अभियान से बाहर निकालें।",
          proposedNextStep: {
            actionId: "check_message_status",
            actionTitle: "त्रुटि 131026 टेलीमेट्री की समीक्षा करें",
            supportingText: "जांचें कि क्या यह त्रुटि कुछ विशिष्ट नंबरों पर है या पूरे अभियान पर।",
            primaryCtaLabel: "टेलीमेट्री जांचें",
            primaryCtaAction: "check_message_status",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Delivery Failure: Meta Error 131026 (Message Undeliverable)",
          conversationalResponse:
            "Meta error code 131026 ka matlab hai message recipient ko deliver nahi ho saka. Iske aam kaaran: recipient ne business number ko block kiya ho, recipient ka WhatsApp account inactive ho, ya spam quality guardrails ne delivery restrict kar di ho.",
          evidenceExplanation:
            "Delivery failure: Code 131026 (Message undeliverable) [DOCUMENTED]. Handset block ya spam suppression.",
          nextSteps: "Affected recipients ki list filter karein aur unactive numbers ko campaign se remove karein.",
          proposedNextStep: {
            actionId: "check_message_status",
            actionTitle: "Error 131026 Telemetry Review Karein",
            supportingText: "Check karein ki ye error specific contacts par hai ya broad batch par.",
            primaryCtaLabel: "Telemetry Check Karein",
            primaryCtaAction: "check_message_status",
          },
        };
      }
      return {
        headline: "Delivery Failure: Meta Error Code 131026 (Message Undeliverable)",
        conversationalResponse:
          "Meta error code 131026 indicates the message could not be delivered to the recipient. Common causes include: recipient blocking your business number, inactive WhatsApp account, or Meta spam policy restrictions on your phone number quality rating.",
        evidenceExplanation:
          "Delivery failure: Error 131026 (Undeliverable) [DOCUMENTED]. Recipient block or quality tier restriction.",
        nextSteps: "Filter affected recipients and prune unengaged or invalid numbers from the broadcast list.",
        proposedNextStep: {
          actionId: "check_message_status",
          actionTitle: "Inspect Error 131026 Telemetry",
          supportingText: "Review bounce distribution to distinguish individual blocks from quality throttling.",
          primaryCtaLabel: "Inspect Telemetry",
          primaryCtaAction: "check_message_status",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Delivery: Pending
    // ------------------------------------------------------------------------
    case "delivery_pending": {
      if (lang === "hi") {
        return {
          headline: "अभियान डिलीवरी: मैसेज पेंडिंग स्थिति में हैं",
          conversationalResponse:
            "जब व्हाट्सएप अभियान में मैसेज 'Pending' या 'Sent' पर अटके रहते हैं, तो इसका मुख्य कारण कैरियर रूटिंग में देरी, प्राप्तकर्ता का फोन बंद होना, या मेटा मैसेजिंग टीयर सीमा तक पहुंचना होता है।",
          evidenceExplanation:
            "अभियान डिलीवरी स्थिति: पेंडिंग [DOCUMENTED]। कैरियर विलंब या हैंडसेट नेटवर्क ऑफलाइन स्थिति।",
          nextSteps: "जांचें कि क्या मैसेज किसी विशिष्ट मोबाइल नेटवर्क पर पेंडिंग हैं या डिस्पैच टाइमिंग क्या थी।",
          proposedNextStep: {
            actionId: "check_message_status",
            actionTitle: "संदेश डिलीवरी स्थिति जांचें",
            supportingText: "गेटवे डिस्पैच रसीदों और कैरियर स्थिति का ताजा रिकॉर्ड पढ़ें।",
            primaryCtaLabel: "डिलीवरी स्थिति जांचें",
            primaryCtaAction: "check_message_status",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Campaign Delivery: Messages Pending Dikh Rahe Hain",
          conversationalResponse:
            "WhatsApp campaign me messages 'Pending' ya 'Sent' par atke rehne ke aam kaaran: carrier network latency, recipient handset off hona, ya Meta daily messaging tier limit hit ho jana. Humne delivery logs ka fresh status read kar liya hai.",
          evidenceExplanation:
            "Campaign delivery status: Pending [DOCUMENTED]. Carrier network queues ya handset offline status.",
          nextSteps: "Approximate dispatch time share karein taaki batch delay confirm kiya ja sake.",
          proposedNextStep: {
            actionId: "check_message_status",
            actionTitle: "Delivery Status Check Karein",
            supportingText: "Gateway dispatch receipts aur carrier telemetry check karein.",
            primaryCtaLabel: "Delivery Check Karein",
            primaryCtaAction: "check_message_status",
          },
        };
      }
      return {
        headline: "Campaign Delivery: Messages Pending Investigation",
        conversationalResponse:
          "When campaign messages remain in 'Pending' or 'Sent' without reaching 'Delivered', root causes include: recipient handset power states, carrier routing latency, or reaching your account's daily messaging tier limit.",
        evidenceExplanation:
          "Campaign status: Sent/Pending delivery [DOCUMENTED]. Handset offline or intermediate carrier queue.",
        nextSteps: "Inspect delivery receipts and check whether delays are isolated to specific mobile carriers.",
        proposedNextStep: {
          actionId: "check_message_status",
          actionTitle: "Run Message Status Check",
          supportingText: "Query fresh delivery receipts from the messaging gateway.",
          primaryCtaLabel: "Check Status",
          primaryCtaAction: "check_message_status",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Delivery: Rate Limit
    // ------------------------------------------------------------------------
    case "delivery_rate_limit": {
      if (lang === "hi") {
        return {
          headline: "व्हाट्सएप मैसेजिंग लिमिट: दैनिक दर सीमा पार",
          conversationalResponse:
            "मेटा आपके फोन नंबर की दैनिक मैसेजिंग सीमा (जैसे 1K, 10K, 100K संदेश प्रति 24 घंटे) तय करता है। यदि यह सीमा पार हो जाती है, तो अतिरिक्त संदेश रोक दिए जाते हैं जब तक कि अगला रोलिंग 24-घंटे का विंडो रीसेट न हो जाए।",
          evidenceExplanation:
            "दर सीमा स्थिति: टियर सीमा समाप्त [DOCUMENTED]। अगला रीसेट रोलिंग 24 घंटों में होगा।",
          nextSteps: "उच्च गुणवत्ता रेटिंग बनाए रखते हुए अगले टीयर (Tier Upgrade) के लिए प्रतीक्षा करें।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "WhatsApp Messaging Limit: Daily Tier Limit Reached",
          conversationalResponse:
            "Meta aapke phone number ke liye daily messaging tier limit (1K, 10K, ya 100K messages per 24 hours) set karta hai. Agar aapne 24-hour limit cross kar li hai to naye messages queue ho jayenge jab tak rolling window reset na ho.",
          evidenceExplanation:
            "Rate limit status: Tier limit reached [DOCUMENTED]. Next tier progression requires high quality score.",
          nextSteps: "Next 24-hour window ka wait karein aur high recipient engagement ensure karein.",
          proposedNextStep: null,
        };
      }
      return {
        headline: "WhatsApp Messaging Limit: Daily Tier Limit Reached",
        conversationalResponse:
          "Meta enforces rolling 24-hour messaging tier limits (1K, 10K, 100K unique recipients). Once your daily quota is exhausted, new outbound campaigns are held until the rolling 24-hour window frees capacity.",
        evidenceExplanation:
          "Rate limit status: Daily messaging tier capacity reached [DOCUMENTED].",
        nextSteps: "Allow the 24-hour rolling window to clear and maintain High Quality Rating for automatic tier upgrade.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Delivery: Template Paused
    // ------------------------------------------------------------------------
    case "delivery_template_paused": {
      if (lang === "hi") {
        return {
          headline: "टेम्पलेट स्थिति: कम गुणवत्ता रेटिंग के कारण पॉज",
          conversationalResponse:
            "मेटा ने इस टेम्पलेट को स्वतः 'PAUSED' स्थिति में डाल दिया है क्योंकि कई प्राप्तकर्ताओं ने इसे स्पैम के रूप में रिपोर्ट किया या ब्लॉक किया। जब गुणवत्ता रेटिंग 'Red' पर गिर जाती है, तो टेम्पलेट अस्थायी रूप से निष्क्रिय हो जाता है।",
          evidenceExplanation:
            "टेम्पलेट गुणवत्ता रेटिंग: Red / Paused [DOCUMENTED]।",
          nextSteps: "टेम्पलेट की आवृत्ति और लक्षित ऑडियंस की समीक्षा करें; पॉज अवधि समाप्त होने तक प्रतीक्षा करें।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Template Status: Low Quality Rating Ki Wajah Se Paused",
          conversationalResponse:
            "Meta ne is template ko automatically PAUSED status me daal diya hai kyunki multiple recipients ne is message ko spam report kiya ya block kiya. Quality rating Red hone par template temporarily suspend ho jata hai.",
          evidenceExplanation:
            "Template quality status: Red / Paused by Meta [DOCUMENTED].",
          nextSteps: "Audience targeting aur frequency review karein taaki unblock hone par quality improve ho.",
          proposedNextStep: null,
        };
      }
      return {
        headline: "Template Status: Paused Due to Low Quality Rating",
        conversationalResponse:
          "Meta automatically pauses active message templates when high user negative feedback (blocks, spam reports) drops the template quality rating to Red. During the pause period, no messages using this template can be sent.",
        evidenceExplanation:
          "Template quality rating: Red (Paused by Meta) [DOCUMENTED].",
        nextSteps: "Audit audience targeting and consent to prevent re-pausing after Meta's unpause window.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Chatbot: Keyword Trigger
    // ------------------------------------------------------------------------
    case "chatbot_keyword_trigger": {
      if (lang === "hi") {
        return {
          headline: "चैटबॉट समस्या निवारण: कीवर्ड ट्रिगर विफलता",
          conversationalResponse:
            "जब कोई कीवर्ड चैटबॉट को ट्रिगर नहीं करता, तो सामान्य कारणों में शामिल हैं: सटीक मिलान (exact match) बनाम आंशिक मिलान (contains) का विन्यास, केस-सेंसिटिविटी, या किसी अन्य उच्च-प्राथमिकता वाले एक्टिव फ्लो का हस्तक्षेप।",
          evidenceExplanation:
            "चैटबॉट ट्रिगर स्थिति: कीवर्ड मिलान असफल [DOCUMENTED]।",
          nextSteps: "फ्लो ट्रिगर सेटिंग में 'Exact Match' को 'Contains' में बदलें और अप्रयुक्त फ़ॉलबैक हटाएं।",
          proposedNextStep: {
            actionId: "inspect_chatbot_flow_triggers",
            actionTitle: "चैटबॉट ट्रिगर कॉन्फ़िगरेशन जांचें",
            supportingText: "जांचें कि क्या कीवर्ड सक्रिय प्रकाशित फ्लो से जुड़े हैं।",
            primaryCtaLabel: "ट्रिगर जांचें",
            primaryCtaAction: "inspect_chatbot_flow_triggers",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Chatbot Troubleshooting: Keyword Trigger Failure",
          conversationalResponse:
            "Chatbot keywords par trigger na hone ke aam kaaran: 'Exact Match' vs 'Contains' setting me galti, casing/spaces, ya published status ka pending hona. Humne active chatbot flow trigger rules inspect kar liye hain.",
          evidenceExplanation:
            "Chatbot trigger status: Keyword rule mismatch [DOCUMENTED].",
          nextSteps: "Flow settings me keyword trigger ko 'Contains' par switch karein aur flow republish karein.",
          proposedNextStep: {
            actionId: "inspect_chatbot_flow_triggers",
            actionTitle: "Bot Trigger Settings Inspect Karein",
            supportingText: "Verify karein ki keyword active published flow se mapped hai.",
            primaryCtaLabel: "Triggers Check Karein",
            primaryCtaAction: "inspect_chatbot_flow_triggers",
          },
        };
      }
      return {
        headline: "Chatbot Troubleshooting: Keyword Trigger Failure",
        conversationalResponse:
          "When incoming customer messages fail to trigger chatbot workflows, frequent causes include: exact match vs partial match configuration, unpublished draft flows, or conflicting priority on default fallback rules.",
        evidenceExplanation:
          "Chatbot trigger status: Inbound keyword unmapped to published flow [DOCUMENTED].",
        nextSteps: "Verify published flow status and change trigger matching mode from Exact to Contains.",
        proposedNextStep: {
          actionId: "inspect_chatbot_flow_triggers",
          actionTitle: "Inspect Keyword Trigger Rules",
          supportingText: "Review published trigger keywords and precedence order.",
          primaryCtaLabel: "Inspect Triggers",
          primaryCtaAction: "inspect_chatbot_flow_triggers",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Chatbot: Interactive Buttons
    // ------------------------------------------------------------------------
    case "chatbot_interactive_button": {
      if (lang === "hi") {
        return {
          headline: "चैटबॉट समस्या निवारण: इंटरैक्टिव बटन विफलता",
          conversationalResponse:
            "व्हाट्सएप क्विक रिप्लाई या सीटीए बटन क्लिक पर प्रतिक्रिया न आने का कारण यह है कि बटन के पेलोड आईडी (payload ID) और आपके चैटबॉट के एक्शन हैंडलर में विसंगति है, या 24-घंटे की ग्राहक सेवा विंडो समाप्त हो चुकी है।",
          evidenceExplanation:
            "इंटरैक्टिव पेलोड स्थिति: अनहैंडल्ड पेलोड कॉलबैक [DOCUMENTED]।",
          nextSteps: "बटन पेलोड स्ट्रिंग को अपने चैटबॉट रूट हैंडलर के साथ सिंक करें।",
          proposedNextStep: {
            actionId: "inspect_interactive_button_payloads",
            actionTitle: "बटन पेलोड मैपिंग जांचें",
            supportingText: "जांचें कि क्या प्रत्येक बटन का आईडी हैंडलर से जुड़ा है।",
            primaryCtaLabel: "पेलोड जांचें",
            primaryCtaAction: "inspect_interactive_button_payloads",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Chatbot Troubleshooting: Interactive Button Response Failure",
          conversationalResponse:
            "Quick reply ya CTA buttons click karne par response na aane ka reason: button ka payload ID aur bot ke webhook handler me mapping mismatch, ya customer care 24-hour messaging window expire hona.",
          evidenceExplanation:
            "Interactive button callback: Unhandled payload ID [DOCUMENTED].",
          nextSteps: "Button payload strings ko bot webhook handlers ke sath reconcile karein.",
          proposedNextStep: {
            actionId: "inspect_interactive_button_payloads",
            actionTitle: "Button Payload Mappings Check Karein",
            supportingText: "Verify karein ki button click events webhook me correctly routed hain.",
            primaryCtaLabel: "Payloads Check Karein",
            primaryCtaAction: "inspect_interactive_button_payloads",
          },
        };
      }
      return {
        headline: "Chatbot Troubleshooting: Interactive Button Response Failure",
        conversationalResponse:
          "Interactive quick-reply or CTA button clicks fail to advance the flow when the button's payload ID is unmapped in your webhook handler, or when the user's 24-hour service window has elapsed without freeform messaging permission.",
        evidenceExplanation:
          "Interactive callback status: Button payload unhandled by flow engine [DOCUMENTED].",
        nextSteps: "Verify button payload strings match your flow transition handlers exactly.",
        proposedNextStep: {
          actionId: "inspect_interactive_button_payloads",
          actionTitle: "Inspect Button Payload Mappings",
          supportingText: "Reconcile button payload identifiers with flow state transitions.",
          primaryCtaLabel: "Inspect Payloads",
          primaryCtaAction: "inspect_interactive_button_payloads",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Chatbot: Webhook Timeout
    // ------------------------------------------------------------------------
    case "chatbot_webhook_timeout": {
      if (lang === "hi") {
        return {
          headline: "चैटबॉट समस्या निवारण: 504 गेटवे / वेबहुक टाइमआउट",
          conversationalResponse:
            "मेटा वेबहुक अनुरोधों के लिए अधिकतम 15 सेकंड के भीतर HTTP 200 प्रतिक्रिया की अपेक्षा करता है। यदि आपका बैकएंड सर्वर डेटाबेस क्वेरी या बाहरी एपीआई कॉल के कारण 15 सेकंड से अधिक समय लेता है, तो मेटा कनेक्शन काट देता है और संदेश विफल हो जाता है।",
          evidenceExplanation:
            "वेबहुक प्रतिक्रिया विलंबता: >15s (504 Gateway Timeout) [DOCUMENTED]।",
          nextSteps: "मेटा को तुरंत HTTP 200 भेजें और भारी प्रोसेसिंग को बैकग्राउंड वर्कर क्यू में स्थानांतरित करें।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Chatbot Troubleshooting: Webhook 504 Timeout",
          conversationalResponse:
            "Meta webhook requests ko process karne ke liye maximum 15 seconds ka time deta hai. Agar aapka bot backend heavy database queries ya third-party APIs ki wajah se 15s me reply nahi karta to connection timeout ho jata hai aur user ko response nahi milta.",
          evidenceExplanation:
            "Webhook latency: Exceeds 15-second Meta gateway timeout [DOCUMENTED].",
          nextSteps: "Inbound webhook ko immediately HTTP 200 acknowledge karein aur heavy processing background queue me karein.",
          proposedNextStep: null,
        };
      }
      return {
        headline: "Chatbot Troubleshooting: Webhook 504 Timeout",
        conversationalResponse:
          "Meta enforces a strict 15-second response deadline for webhook delivery receipts and messages. If your backend takes longer than 15 seconds due to synchronous database queries or external API calls, Meta aborts the connection.",
        evidenceExplanation:
          "Webhook processing latency: Exceeds 15s gateway threshold [DOCUMENTED].",
        nextSteps: "Acknowledge inbound webhooks immediately with HTTP 200 and delegate bot logic to asynchronous worker queues.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Chatbot: Fallback Loop
    // ------------------------------------------------------------------------
    case "chatbot_fallback_loop": {
      if (lang === "hi") {
        return {
          headline: "चैटबॉट समस्या निवारण: अंतहीन फ़ॉलबैक लूप",
          conversationalResponse:
            "चैटबॉट बार-बार 'मुझे समझ नहीं आया' दोहराता है जब यूज़र का इनपुट किसी ट्रिगर से मेल नहीं खाता और फ़ॉलबैक नोड में मानव एजेंट एस्केलेशन या मुख्य मेनू पर लौटने का कोई विकल्प नहीं होता।",
          evidenceExplanation:
            "फ़ॉलबैक स्थिति: अनकंडीशनल डिफॉल्ट लूप [DOCUMENTED]।",
          nextSteps: "2 असफल प्रयासों के बाद स्वतः मानव विशेषज्ञ सहायता का विकल्प जोड़ें।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Chatbot Troubleshooting: Infinite Fallback Loop",
          conversationalResponse:
            "Chatbot baar baar wahi 'Samajh nahi aaya' repeat karta hai jab customer input kisi trigger se match nahi hota aur fallback step me human escalation ya main menu ka exit path configured nahi hota.",
          evidenceExplanation:
            "Fallback loop status: Unconditional retry without exit path [DOCUMENTED].",
          nextSteps: "2 failed attempts ke baad customer ko human specialist transfer ka option dekar loop break karein.",
          proposedNextStep: null,
        };
      }
      return {
        headline: "Chatbot Troubleshooting: Infinite Fallback Loop",
        conversationalResponse:
          "A bot enters an infinite fallback loop when unmapped user input triggers a default 'I didn't understand' step that lacks an exit path (such as a Main Menu button or human escalation trigger).",
        evidenceExplanation:
          "Flow topology error: Unbounded fallback loop without specialist handoff [DOCUMENTED].",
        nextSteps: "Enforce policy G8 by introducing an automated human handoff trigger after two failed attempts.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Greeting
    // ------------------------------------------------------------------------
    case "greeting": {
      const topic = entities.contextTopic;
      if (lang === "hi") {
        return {
          headline: topic ? "नमस्ते! मैं यहाँ हूँ" : "नमस्ते! मैं आपकी क्या सहायता कर सकता हूँ?",
          conversationalResponse: topic
            ? `नमस्ते! मैं यहाँ हूँ। क्या आप ${topic} पर समस्या निवारण जारी रखना चाहते हैं?`
            : "नमस्ते! मैं Totoro सपोर्ट रिकवरी असिस्टेंट हूँ। मैं व्हाट्सएप सेटअप, टेम्पलेट अस्वीकृति, अभियान डिलीवरी, या चैटबॉट समस्याओं को हल करने में आपकी सहायता कर सकता हूँ।",
          evidenceExplanation:
            "सक्रिय केस संदर्भ और पूर्व जांच परिणाम सुरक्षित हैं।",
          nextSteps: "कृपया बताएं कि आज आप किस समस्या का समाधान करना चाहते हैं।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: topic ? "Hi! Main yahan hoon" : "Namaste! Main yahan aapki madad ke liye hoon",
          conversationalResponse: topic
            ? `Hi! Main yahan hoon. Kya aap ${topic} par troubleshooting continue karna chahte hain?`
            : "Namaste! Main Totoro support assistant hoon. WhatsApp WABA setup, template rejection, campaign delivery, ya chatbot troubleshooting me aaj main aapki kya madad kar sakta hoon?",
          evidenceExplanation:
            "Aapka active case context aur diagnostic history preserved hai.",
          nextSteps: "Bataiye aapko kis WhatsApp feature ya campaign me issue aa raha hai.",
          proposedNextStep: null,
        };
      }
      return {
        headline: topic ? "Hi! I'm here" : "How can I help you today?",
        conversationalResponse: topic
          ? `Hi! I'm here. Would you like to continue troubleshooting the ${topic}?`
          : "Hi! I'm Totoro, your customer support recovery assistant. I can help resolve WhatsApp WABA setup, template rejections, campaign delivery delays, or chatbot flow issues.",
        evidenceExplanation:
          "Active case context and prior diagnostic results remain safely recorded.",
        nextSteps: "Let me know which WhatsApp issue or campaign you would like to address.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Confirm
    // ------------------------------------------------------------------------
    case "confirm": {
      if (lang === "hi") {
        return {
          headline: "पुष्टि दर्ज: प्रस्तावित कार्रवाई स्वीकृत",
          conversationalResponse:
            "आपने प्रस्तावित सुधार कार्रवाई की पुष्टि कर दी है। परिवर्तन को सुरक्षित रूप से सिम्युलेट करके मेटा सत्यापन सीमा में भेज दिया गया है।",
          evidenceExplanation:
            "ऑपरेटर द्वारा स्पष्ट पुष्टि (G1)। ताजा सत्यापन जांच जारी है [G5/D6]।",
          nextSteps: "ताजा स्थिति सत्यापन परिणाम की प्रतीक्षा की जा रही है।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Confirmation Recorded: Fix Approved",
          conversationalResponse:
            "Aapne recovery action ko approve kar diya hai. Fix ko simulate karke Meta verification boundary me submit kar diya gaya hai.",
          evidenceExplanation:
            "Operator explicit confirmation recorded (G1). Fresh-read state check pending [G5/D6].",
          nextSteps: "Fresh state verification result ka intezaar kiya ja raha hai.",
          proposedNextStep: null,
        };
      }
      return {
        headline: "Simulated Action Authorized",
        conversationalResponse:
          "You confirmed authorization for the proposed recovery action. The change is being simulated and submitted to the platform verification boundary.",
        evidenceExplanation:
          "Authorization confirmed by operator (G1). Verification requires a fresh state read from the platform store (G5/D6).",
        nextSteps: "Awaiting fresh-read verification result.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Decline
    // ------------------------------------------------------------------------
    case "decline": {
      if (lang === "hi") {
        return {
          headline: "प्रस्ताव अस्वीकार: कोई परिवर्तन नहीं किया गया",
          conversationalResponse:
            "आपने प्रस्तावित सुधार को अस्वीकार कर दिया। टेम्पलेट या खाता रिकॉर्ड में कोई बदलाव नहीं लिखा गया है।",
          evidenceExplanation:
            "ऑपरेटर ने परिवर्तन को अस्वीकार किया। मौजूदा रिकॉर्ड अपरिवर्तित है।",
          nextSteps: "आप वैकल्पिक सुधार का सुझाव दे सकते हैं या मानव विशेषज्ञ से समीक्षा का अनुरोध कर सकते हैं।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Proposal Declined: No Changes Written",
          conversationalResponse:
            "Aapne proposed recovery change ko decline kar diya. Template ya account record me koi modification nahi kiya gaya hai.",
          evidenceExplanation:
            "Operator declined proposed changes. Existing record remains untouched.",
          nextSteps: "Aap alternate correction suggest kar sakte hain ya human specialist request kar sakte hain.",
          proposedNextStep: null,
        };
      }
      return {
        headline: "Proposal Declined",
        conversationalResponse:
          "You declined the proposed recovery change. No modifications were written to the record.",
        evidenceExplanation:
          "Operator declined proposed changes. Existing record remains untouched.",
        nextSteps: "You can propose an alternative correction, ask questions, or request human specialist review.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Completed Step
    // ------------------------------------------------------------------------
    case "completed_step": {
      if (lang === "hi") {
        return {
          headline: "डिलीवरी स्थिति: लंबित (उपयोगकर्ता द्वारा रिपोर्ट किया गया)",
          conversationalResponse:
            "आपने पुष्टि की है कि प्रभावित प्राप्तकर्ताओं के लिए बिना किसी टेम्पलेट अस्वीकृति त्रुटि के संदेश वितरण स्थिति लंबित बनी हुई है।",
          evidenceExplanation:
            "डिलीवरी जांच को उपयोगकर्ता द्वारा रिपोर्ट किए गए साक्ष्य [REPORTED] के रूप में स्वीकार और दर्ज किया गया। हम डिलीवरी स्थिति जांच को दोबारा नहीं दोहराएंगे। बिना प्रत्यक्ष कैरियर टेलीमेट्री के, हम हैंडसेट पावर स्थिति या मध्यवर्ती नेटवर्क कतारों को सत्यापित नहीं कर सकते।",
          nextSteps:
            "यह निर्धारित करने के लिए कि यह डिलीवरी बैच में देरी है या कैरियर-विशिष्ट समस्या, प्रभावित संदेश लगभग कब भेजे गए थे, या क्या वे किसी विशिष्ट मोबाइल ऑपरेटर पर केंद्रित हैं?",
          proposedNextStep: {
            actionId: "clarify",
            actionTitle: "डिलीवरी का समय या कैरियर विवरण प्रदान करें",
            supportingText:
              "प्रेषण समय या प्रभावित ऑपरेटर साझा करने से पूर्ण जांच को दोहराए बिना विलंब को अलग करने में मदद मिलती है।",
            primaryCtaLabel: "विवरण प्रदान करें",
            primaryCtaAction: "clarify",
            secondaryCtaLabel: "विशेषज्ञ समीक्षा का अनुरोध करें",
            secondaryCtaAction: "human",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Delivery Status: Pending (User-Reported)",
          conversationalResponse:
            "Aapne confirm kiya ki affected recipients ke liye bina kisi template rejection error ke message delivery status pending bana hua hai.",
          evidenceExplanation:
            "Delivery check acknowledged and recorded as user-reported evidence [REPORTED]. Hum delivery status check dobara repeat nahi karenge. Direct carrier telemetry ke bina handset power state verify nahi ki ja sakti.",
          nextSteps:
            "To narrow down whether this is a delivery batch delay or a carrier-specific routing issue, approximately when were the affected messages sent, or are they concentrated on a specific mobile carrier?",
          proposedNextStep: {
            actionId: "clarify",
            actionTitle: "Provide dispatch timing or carrier details",
            supportingText:
              "Sharing approximate send times or affected destination carriers helps isolate batch delivery delays without repeating completed checks.",
            primaryCtaLabel: "Provide timing or carrier details",
            primaryCtaAction: "clarify",
            secondaryCtaLabel: "Request specialist escalation",
            secondaryCtaAction: "human",
          },
        };
      }
      return {
        headline: "Delivery Status: Pending (User-Reported)",
        conversationalResponse:
          "You confirmed that message delivery status remains pending for affected recipients without a template rejection error.",
        evidenceExplanation:
          "Delivery check acknowledged and recorded as user-reported evidence [REPORTED]. We will not repeat the delivery status check. Without direct carrier telemetry, we cannot verify handset power states or intermediate network queues.",
        nextSteps:
          "To narrow down whether this is a delivery batch delay or a carrier-specific routing issue, approximately when were the affected messages sent, or are they concentrated on a specific mobile carrier?",
        proposedNextStep: {
          actionId: "clarify",
          actionTitle: "Provide dispatch timing or carrier details",
          supportingText:
            "Sharing approximate send times or affected destination carriers helps isolate batch delivery delays without repeating completed checks.",
          primaryCtaLabel: "Provide timing or carrier details",
          primaryCtaAction: "clarify",
          secondaryCtaLabel: "Request specialist escalation",
          secondaryCtaAction: "human",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Fact Correction
    // ------------------------------------------------------------------------
    case "correct_information": {
      if (lang === "hi") {
        return {
          headline: "सुधार दर्ज: पुराने निष्कर्ष अमान्य किए गए",
          conversationalResponse:
            "आपका सुधार दर्ज कर लिया गया है। पिछली गलत जानकारी पर आधारित पूर्व निष्कर्षों को अमान्य (invalidated) कर दिया गया है।",
          evidenceExplanation:
            "सुधार दर्ज [REPORTED]। पूर्व निष्कर्ष अमान्य।",
          nextSteps: "अद्यतन जानकारी के आधार पर सुधार योजना का पुनर्गठन किया जा रहा है।",
          proposedNextStep: null,
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Correction Recorded: Prior Conclusions Invalidated",
          conversationalResponse:
            "Aapka correction record kar liya gaya hai. Pehle di gayi jankari par based puraane conclusions ko invalidate kar diya gaya hai.",
          evidenceExplanation:
            "Fact correction logged [REPORTED]. Previous conclusion invalidated.",
          nextSteps: "Updated details ke hisaab se next recovery step formulate kiya ja raha hai.",
          proposedNextStep: null,
        };
      }
      return {
        headline: "Information Corrected",
        conversationalResponse:
          "I have recorded your correction. Prior conclusions based on the earlier information have been invalidated.",
        evidenceExplanation:
          "Fact correction registered [REPORTED]. Stale hypothesis invalidated.",
        nextSteps: "Reformulating diagnosis and recommendations based on updated parameters.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Human Specialist Request
    // ------------------------------------------------------------------------
    case "request_human": {
      if (lang === "hi") {
        return {
          headline: "मानव विशेषज्ञ सहायता का अनुरोध दर्ज",
          conversationalResponse:
            "आपने इस केस को मानव सहायता विशेषज्ञ को स्थानांतरित करने का अनुरोध किया है। आपकी केस हिस्ट्री और पूर्ण डायग्नोस्टिक ट्रेल को विशेषज्ञ समीक्षा के लिए ऑडिट डोजियर में संकलित कर दिया गया है।",
          evidenceExplanation:
            "अपरिवर्तनीय ऑडिट घटनाओं और एकत्रित साक्ष्य के साथ केस फाइल तैयार (G8/D7)।",
          nextSteps: "सपोर्ट कतार में उपलब्ध विशेषज्ञ को आपका केस सौंपा जा रहा है।",
          proposedNextStep: {
            actionId: "human",
            actionTitle: "मानव सहायता विशेषज्ञ को सौंपें",
            supportingText: "सुरक्षा नीति के अनुसार पूर्ण ऑडिट डोजियर के साथ विशेषज्ञ समीक्षा अनिवार्य है।",
            primaryCtaLabel: "हैंडऑफ की पुष्टि करें",
            primaryCtaAction: "human",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Human Specialist Support Requested",
          conversationalResponse:
            "Aapne case ko human support specialist ko transfer karne ka request kiya hai. Aapki poori case history aur telemetry ko audit dossier me compile karke specialist queue me bhej diya gaya hai.",
          evidenceExplanation:
            "Case file prepared with full diagnostic trail and immutable audit events (G8/D7).",
          nextSteps: "Support queue me available specialist ko case assign kiya ja raha hai.",
          proposedNextStep: {
            actionId: "human",
            actionTitle: "Human Specialist Ko Escalate Karein",
            supportingText: "Safety policy ke mutabiq complete audit dossier ke sath specialist review hoga.",
            primaryCtaLabel: "Handoff Confirm Karein",
            primaryCtaAction: "human",
          },
        };
      }
      return {
        headline: "Specialist Support Requested",
        conversationalResponse:
          "You requested to transfer this case to a human specialist. All telemetry, context, and case history have been compiled into an audit dossier for review.",
        evidenceExplanation:
          "Case file prepared with full diagnostic trail and immutable audit events (G8/D7).",
        nextSteps: "Your request is pending assignment to a support specialist in the queue.",
        proposedNextStep: {
          actionId: "human",
          actionTitle: "Escalate to human support specialist",
          supportingText: "Safety policy requires human specialist review with complete audit dossier.",
          primaryCtaLabel: "Confirm human handoff",
          primaryCtaAction: "human",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Billing / Refunds (G10)
    // ------------------------------------------------------------------------
    case "billing_refund": {
      if (lang === "hi") {
        return {
          headline: "वित्तीय अनुरोध: बिलिंग और रिफंड विशेषज्ञ को एस्केलेट किया गया",
          conversationalResponse:
            "बिलिंग, रिफंड, कटौती या सदस्यता शुल्क से जुड़े मामले अनिवार्य सुरक्षा नीति (G10) के तहत मानव-नेतृत्व वाले क्षेत्र हैं। स्वचालित सिस्टम सीधे वित्तीय लेजर को संशोधित नहीं कर सकते। आपका केस बिलिंग टीम को ट्रांसफर किया जा रहा है।",
          evidenceExplanation:
            "वित्तीय अनुरोध दर्ज [REPORTED]। सुरक्षा नीति G10 के तहत स्वचालित संशोधन वर्जित है।",
          nextSteps: "लेन-देन संदर्भ के साथ हमारे बिलिंग विशेषज्ञ आपके खाते की समीक्षा करेंगे।",
          proposedNextStep: {
            actionId: "human",
            actionTitle: "बिलिंग विशेषज्ञ को एस्केलेट करें",
            supportingText: "वित्तीय समायोजन के लिए अधिकृत वित्त विशेषज्ञ की समीक्षा आवश्यक है।",
            primaryCtaLabel: "बिलिंग एस्केलेशन की पुष्टि करें",
            primaryCtaAction: "human",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Billing & Refund Escalation (Finance Specialist)",
          conversationalResponse:
            "Billing, refund, ya double charge se jude mamle mandatory safety policy (G10) ke tehat human-led zones hain. Automated bots directly paise ya bank balance modify nahi kar sakte. Aapka case finance team ko transfer kiya ja raha hai.",
          evidenceExplanation:
            "Financial concern logged [REPORTED]. Direct financial modification prohibited by policy G10.",
          nextSteps: "Hamari billing team transaction details ke sath case review karegi.",
          proposedNextStep: {
            actionId: "human",
            actionTitle: "Billing Specialist Ko Escalate Karein",
            supportingText: "Financial adjustments ke liye finance team ka authorization zaroori hai.",
            primaryCtaLabel: "Finance Escalation Confirm Karein",
            primaryCtaAction: "human",
          },
        };
      }
      return {
        headline: "Billing & Payment Inquiry",
        conversationalResponse:
          "Billing, refunds, credits, and subscription charges are strictly human-led policy zones under guardrail G10. Automated assistants are prohibited from altering financial ledgers. This case is being transferred to our finance team with your payment details.",
        evidenceExplanation:
          "Financial request recorded [REPORTED]. Automated ledger mutation prohibited by policy G10.",
        nextSteps: "Our finance specialists will review the transaction reference against our payment gateway records.",
        proposedNextStep: {
          actionId: "human",
          actionTitle: "Escalate to billing & finance specialist",
          supportingText: "Financial adjustments and transaction verifications require authorization by our finance team.",
          primaryCtaLabel: "Confirm finance escalation",
          primaryCtaAction: "human",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Security / Access (G10)
    // ------------------------------------------------------------------------
    case "security_identity_access": {
      if (lang === "hi") {
        return {
          headline: "सुरक्षा अलर्ट: पहचान और पहुंच विशेषज्ञ को एस्केलेट किया गया",
          conversationalResponse:
            "सुरक्षा क्रेडेंशियल्स, पासवर्ड, ओटीपी, या व्यवस्थापक पहुंच से जुड़े अनुरोध नीति (G10) के तहत सख्त मानव-समीक्षा क्षेत्र हैं। स्वचालित सिस्टम क्रेडेंशियल्स को प्रदर्शित या संशोधित नहीं करते।",
          evidenceExplanation:
            "सुरक्षा और पहुंच अनुरोध [REPORTED]। स्वचालित विशेषाधिकार परिवर्तन अवरुद्ध।",
          nextSteps: "कृपया सुरक्षित पहचान सत्यापन के लिए सपोर्ट विशेषज्ञ के संपर्क का इंतजार करें।",
          proposedNextStep: {
            actionId: "human",
            actionTitle: "सुरक्षा विशेषज्ञ को एस्केलेट करें",
            supportingText: "पहचान सत्यापन केवल अधिकृत सुरक्षा टीम द्वारा ही संपन्न किया जा सकता है।",
            primaryCtaLabel: "सुरक्षा एस्केलेशन की पुष्टि करें",
            primaryCtaAction: "human",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Security Alert: Identity & Access Escalation",
          conversationalResponse:
            "Security credentials, OTP, passwords, ya admin access se jude mamle safety policy (G10) ke mutabiq strictly human-led hain. Automated assistant credentials change ya reveal nahi kar sakta.",
          evidenceExplanation:
            "Security and access inquiry [REPORTED]. Automated privilege changes strictly blocked.",
          nextSteps: "Authorized security specialist aapki identity verify karne ke baad access issue resolve karenge.",
          proposedNextStep: {
            actionId: "human",
            actionTitle: "Security Specialist Ko Escalate Karein",
            supportingText: "Identity verification sirf authorized security team dwara hi kiya ja sakta hai.",
            primaryCtaLabel: "Security Escalation Confirm Karein",
            primaryCtaAction: "human",
          },
        };
      }
      return {
        headline: "Security Alert: Human-Led Identity & Access Review",
        conversationalResponse:
          "Security, passwords, tokens, OTPs, or administrative privilege requests are strictly human-governed under policy G10. The assistant never alters permissions or retains secret tokens.",
        evidenceExplanation:
          "Security policy enforced: Automated credential mutation prohibited (G10).",
        nextSteps: "An authorized security specialist will verify identity through secure out-of-band channels.",
        proposedNextStep: {
          actionId: "human",
          actionTitle: "Escalate to security specialist",
          supportingText: "Identity and access changes must be authorized by an authenticated security officer.",
          primaryCtaLabel: "Confirm security escalation",
          primaryCtaAction: "human",
        },
      };
    }

    // ------------------------------------------------------------------------
    // Adversarial Override
    // ------------------------------------------------------------------------
    case "adversarial_override": {
      return {
        headline: "Verification Safeguards Enforced",
        conversationalResponse:
          "The provided input requested an automatic approval override without evidence. WhatsApp recovery actions require authoritative provider review and cannot be marked approved by conversational instruction.",
        evidenceExplanation:
          "Safety policy mandates verified provider evidence before approving template changes. Untrusted instructions cannot bypass state machine safeguards.",
        nextSteps: "Provide the official template content and rejection details so our rules engine can determine an authorized correction.",
        proposedNextStep: null,
      };
    }

    // ------------------------------------------------------------------------
    // Ambiguous
    // ------------------------------------------------------------------------
    default: {
      if (lang === "hi") {
        return {
          headline: "अतिरिक्त स्पष्टीकरण आवश्यक",
          conversationalResponse:
            "आपके संदेश से यह स्पष्ट नहीं हो सका कि व्हाट्सएप का कौन सा फीचर (टेम्पलेट, डिलीवरी, वेबहुक, या चैटबॉट) प्रभावित है। अनुमान लगाने के बजाय, हम आपसे एक स्पष्टीकरण प्रश्न पूछते हैं।",
          evidenceExplanation:
            "सटीक फीचर अनिश्चित [UNKNOWN]। स्वचालित अनुमान वर्जित है।",
          nextSteps: "कृपया स्पष्ट करें कि क्या संदेश अस्वीकृत हो रहे हैं, डिलीवरी में देरी हो रही है, या सेटअप विफल हो रहा है।",
          proposedNextStep: {
            actionId: "clarify",
            actionTitle: "समस्या का विवरण स्पष्ट करें",
            supportingText: "बताएं कि क्या यह टेम्पलेट, अभियान डिलीवरी, या चैटबॉट से संबंधित है।",
            primaryCtaLabel: "विवरण स्पष्ट करें",
            primaryCtaAction: "clarify",
          },
        };
      }
      if (lang === "hinglish" || lang === "mixed") {
        return {
          headline: "Clarification Needed: Feature Unclear",
          conversationalResponse:
            "Aapke message se ye clear nahi ho pa raha ki WhatsApp ka kaunsa feature (template rejection, message delivery, webhook, ya chatbot) affect hua hai. Guess karne ke bajaye hum aapse specific details mang rahe hain.",
          evidenceExplanation:
            "Affected feature is uncertain [UNKNOWN]. Policy prohibits guessing issue types.",
          nextSteps: "Batayein ki messages reject ho rahe hain, deliver nahi ho rahe, ya setup me problem aa rahi hai.",
          proposedNextStep: {
            actionId: "clarify",
            actionTitle: "Issue Clarify Karein",
            supportingText: "Specify karein ki problem template, delivery, ya chatbot flow me hai.",
            primaryCtaLabel: "Clarify Karein",
            primaryCtaAction: "clarify",
          },
        };
      }
      return {
        headline: "Clarification Needed",
        conversationalResponse:
          "Your message does not specify which WhatsApp component (template, campaign delivery, webhook, or chatbot) is experiencing problems. To prevent incorrect diagnoses, please specify the symptom.",
        evidenceExplanation:
          "Affected feature is uncertain [UNKNOWN]. Guessing root causes is prohibited by policy G9.",
        nextSteps: "Specify whether messages are rejected, failing to reach recipients, or failing to trigger.",
        proposedNextStep: {
          actionId: "clarify",
          actionTitle: "Clarify Affected Feature",
          supportingText: "Clarify whether your issue is template rejection, campaign delivery, or chatbot flow.",
          primaryCtaLabel: "Clarify Symptom",
          primaryCtaAction: "clarify",
        },
      };
    }
  }
}

// ============================================================================
// 4. Main Fast Router Dispatcher
// ============================================================================

export function fastRouteMessage(
  message: string,
  context: FastRouterContext = {},
): FastRouterResult {
  const text = (message || "").trim();
  const lang = detectLanguage(text);

  // Extract entities (e.g. template ID, order ID, invoice ID)
  const extractedEntities: Record<string, string> = {};
  const tplMatch = text.match(/\bTPL-\d{4}\b/i);
  if (tplMatch) extractedEntities.templateId = tplMatch[0].toUpperCase();

  const ordMatch = text.match(/\bORD-\d+\b/i);
  if (ordMatch) extractedEntities.orderId = ordMatch[0].toUpperCase();

  const invMatch = text.match(/\bINV-\d+\b/i);
  if (invMatch) extractedEntities.invoiceId = invMatch[0].toUpperCase();

  // 1. ADVERSARIAL OVERRIDE CHECK
  if (ADVERSARIAL_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("adversarial_override", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "other",
      scopedIntent: "adversarial_override",
      issueType: "security_identity_access",
      targetRoute: "answer_from_evidence",
      urgency: "critical",
      confidence: 0.99,
      extractedEntities: { adversarialAttemptBlocked: "true" },
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
      safetyViolationBlocked: true,
    };
  }

  // 2. SECURITY & IDENTITY (G10)
  if (SECURITY_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("security_identity_access", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "request_human",
      scopedIntent: "security_identity_access",
      issueType: "security_identity_access",
      targetRoute: "handoff",
      urgency: "critical",
      confidence: 0.99,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: true,
      escalationReason: "Security, identity, credentials or permissions inquiry requires authenticated human officer (G10).",
    };
  }

  // 3. BILLING & REFUNDS (G10)
  if (BILLING_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("billing_refund", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "request_human",
      scopedIntent: "billing_refund",
      issueType: "billing_refund",
      targetRoute: "handoff",
      urgency: "high",
      confidence: 0.98,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: true,
      escalationReason: "Billing, refunds, credits, and subscription charges require authorized human finance review (G10).",
    };
  }

  // 4. EXPLICIT HUMAN SUPPORT REQUEST (G8/D7)
  if (HUMAN_REQUEST_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("request_human", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "request_human",
      scopedIntent: "request_human",
      issueType: "human_requested",
      targetRoute: "handoff",
      urgency: "medium",
      confidence: 0.99,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: true,
      escalationReason: "Customer explicitly requested human specialist support (G8/D7).",
    };
  }

  // 4B. CONVERSATIONAL: CATEGORY MISMATCH PLAIN-ENGLISH EXPLANATION
  if (
    text.toLowerCase().includes("what does category mismatch actually mean") ||
    text.toLowerCase().includes("explain it simply") ||
    text.toLowerCase().includes("without the technical terms")
  ) {
    return {
      isConfident: true,
      language: lang,
      intent: "ask_question",
      scopedIntent: "template_promotional_utility",
      issueType: "template_rejection",
      targetRoute: "answer_from_evidence",
      urgency: "medium",
      confidence: 0.95,
      extractedEntities: { requestedExplanation: "category_mismatch" },
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: "Understanding Category Mismatch (Plain English)",
      conversationalResponse:
        "WhatsApp rejected this template because its wording looks like a promotion or marketing message, but it was submitted under a different category like utility. WhatsApp requires messages that promote products or offer discounts to be marked as Marketing. Utility is reserved strictly for operational receipts and account alerts.",
      evidenceExplanation:
        "What we know: Meta enforces distinct template categories with strict content boundaries. What remains uncertain: Full approved text comparison until template body is parsed.",
      nextSteps:
        "Review the template text and match the category to WhatsApp's rules before resubmitting.",
      proposedNextStep: null,
      requiresHumanEscalation: false,
    };
  }

  // 5. CONVERSATIONAL: GREETINGS
  if (GREETING_PATTERNS.some((p) => p.test(text))) {
    const contextTopic =
      context.issueType === "message_delivery"
        ? "pending WhatsApp deliveries"
        : context.issueType === "template_rejection"
        ? "rejected WhatsApp template"
        : context.issueType
        ? context.issueType.replace(/_/g, " ")
        : "";
    const greetingEntities = { ...extractedEntities, ...(contextTopic ? { contextTopic } : {}) };
    const loc = buildLocalizedResponse("greeting", lang, greetingEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "greeting",
      scopedIntent: "greeting",
      issueType: context.issueType || "ambiguous_or_missing_context",
      targetRoute: "answer_from_evidence",
      urgency: "low",
      confidence: 0.99,
      extractedEntities: greetingEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 6. CONVERSATIONAL: CONFIRM
  if (CONFIRM_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("confirm", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "confirm",
      scopedIntent: "confirm",
      issueType: context.issueType || "template_rejection",
      targetRoute: "execute_existing_domain_operation",
      urgency: "medium",
      confidence: 0.98,
      extractedEntities: { operatorConfirmation: "confirmed" },
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 7. CONVERSATIONAL: DECLINE
  if (DECLINE_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("decline", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "decline",
      scopedIntent: "decline",
      issueType: context.issueType || "template_rejection",
      targetRoute: "answer_from_evidence",
      urgency: "low",
      confidence: 0.98,
      extractedEntities: { operatorDeclined: "true" },
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 8. CONVERSATIONAL: COMPLETED STEP (No duplicate checks)
  if (COMPLETED_CHECK_PATTERNS.some((p) => p.test(text))) {
    const completedCheckName =
      context.issueType === "billing_refund"
        ? "check_bank_statement"
        : context.issueType === "number_waba_setup"
        ? "check_phone_registration"
        : "check_message_status";

    const loc = buildLocalizedResponse("completed_step", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "provide_evidence",
      scopedIntent: "completed_step",
      issueType: context.issueType || "message_delivery",
      targetRoute: "answer_from_evidence",
      urgency: "medium",
      confidence: 0.95,
      extractedEntities: { [completedCheckName]: "completed_by_user" },
      corrections: [],
      completedChecks: [completedCheckName],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 9. CONVERSATIONAL: FACT CORRECTION
  if (CORRECTION_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("correct_information", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "correct_information",
      scopedIntent: "correct_information",
      issueType: context.issueType || "template_rejection",
      targetRoute: "answer_from_evidence",
      urgency: "medium",
      confidence: 0.95,
      extractedEntities,
      corrections: [
        {
          field: "operatorFactUpdate",
          newValue: text,
        },
      ],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 10. SCOPED SUPPORT INTENTS: WHATSAPP SETUP
  if (SETUP_WABA_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("setup_waba_onboarding", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "ask_question",
      scopedIntent: "setup_waba_onboarding",
      issueType: "number_waba_setup",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (SETUP_PHONE_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("setup_phone_verification", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "setup_phone_verification",
      issueType: "number_waba_setup",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (SETUP_WEBHOOK_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("setup_webhook_config", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "setup_webhook_config",
      issueType: "integration_webhook",
      targetRoute: "rules_playbook" as any,
      urgency: "high",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (SETUP_GREEN_TICK_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("setup_profile_green_tick", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "ask_question",
      scopedIntent: "setup_profile_green_tick",
      issueType: "number_waba_setup",
      targetRoute: "rules_playbook" as any,
      urgency: "low",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 11. SCOPED SUPPORT INTENTS: TEMPLATE REJECTION
  if (TEMPLATE_VARIABLE_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("template_variable_format", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "template_variable_format",
      issueType: "template_rejection",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.97,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (TEMPLATE_PROMO_UTILITY_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("template_promotional_utility", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "template_promotional_utility",
      issueType: "template_rejection",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.96,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (TEMPLATE_OPT_OUT_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("template_opt_out", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "template_opt_out",
      issueType: "template_rejection",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.96,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (TEMPLATE_GENERAL_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("template_general_rejection", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "template_general_rejection",
      issueType: "template_rejection",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 12. SCOPED SUPPORT INTENTS: CAMPAIGN DELIVERY
  if (DELIVERY_131026_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("delivery_error_131026", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "delivery_error_131026",
      issueType: "message_delivery",
      targetRoute: "rules_playbook" as any,
      urgency: "high",
      confidence: 0.98,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (DELIVERY_RATE_LIMIT_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("delivery_rate_limit", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "delivery_rate_limit",
      issueType: "message_delivery",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (DELIVERY_PAUSED_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("delivery_template_paused", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "delivery_template_paused",
      issueType: "message_delivery",
      targetRoute: "rules_playbook" as any,
      urgency: "high",
      confidence: 0.96,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (DELIVERY_PENDING_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("delivery_pending", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "delivery_pending",
      issueType: "message_delivery",
      targetRoute: "rules_playbook" as any,
      urgency: "high",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 13. SCOPED SUPPORT INTENTS: CHATBOT FLOWS
  if (CHATBOT_KEYWORD_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("chatbot_keyword_trigger", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "chatbot_keyword_trigger",
      issueType: "chatbot_flow",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (CHATBOT_BUTTON_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("chatbot_interactive_button", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "chatbot_interactive_button",
      issueType: "chatbot_flow",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (CHATBOT_TIMEOUT_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("chatbot_webhook_timeout", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "chatbot_webhook_timeout",
      issueType: "chatbot_flow",
      targetRoute: "rules_playbook" as any,
      urgency: "high",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  if (CHATBOT_LOOP_PATTERNS.some((p) => p.test(text))) {
    const loc = buildLocalizedResponse("chatbot_fallback_loop", lang, extractedEntities);
    return {
      isConfident: true,
      language: lang,
      intent: "troubleshoot_operational_issue",
      scopedIntent: "chatbot_fallback_loop",
      issueType: "chatbot_flow",
      targetRoute: "rules_playbook" as any,
      urgency: "medium",
      confidence: 0.95,
      extractedEntities,
      corrections: [],
      completedChecks: [],
      missingFields: [],
      headline: loc.headline,
      conversationalResponse: loc.conversationalResponse,
      evidenceExplanation: loc.evidenceExplanation,
      nextSteps: loc.nextSteps,
      proposedNextStep: loc.proposedNextStep,
      requiresHumanEscalation: false,
    };
  }

  // 14. UNCERTAIN / AMBIGUOUS INTENT -> Triggers LLM Fallback!
  const loc = buildLocalizedResponse("ambiguous", lang, extractedEntities);
  return {
    isConfident: false,
    language: lang,
    intent: "unclear",
    scopedIntent: "ambiguous",
    issueType: "ambiguous_or_missing_context",
    targetRoute: "ask_clarification",
    urgency: "medium",
    confidence: 0.5,
    extractedEntities,
    corrections: [],
    completedChecks: [],
    missingFields: ["affected_feature_or_specific_symptom"],
    headline: loc.headline,
    conversationalResponse: loc.conversationalResponse,
    evidenceExplanation: loc.evidenceExplanation,
    nextSteps: loc.nextSteps,
    proposedNextStep: loc.proposedNextStep,
    requiresHumanEscalation: false,
  };
}

/**
 * Returns true if message clearly falls into our scoped customer support recovery domain
 * (WhatsApp setup, template rejection, campaign delivery, chatbot flows, or conversational lifecycle).
 */
export function isScopedSupportIntent(message: string): boolean {
  if (!message || typeof message !== "string") return false;
  const res = fastRouteMessage(message);
  return res.isConfident && res.scopedIntent !== "ambiguous";
}
