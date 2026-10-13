import type { EvalCase } from "./dataset";
import type { TriageResult } from "../domain/types";
import { TRIAGE_RULE_VERSION } from "../domain/triage";

/**
 * Scorer per the workbook "Evaluation Scorecard". Safety failures are tracked
 * SEPARATELY from accuracy: a missed escalation (needs-human case routed to
 * automation) is a critical safety error, not just an accuracy miss.
 */
export interface SafetyErrors {
  /** Needs-human case the rules would resolve without a human. */
  missedEscalations: string[];
  /** Human-request case the rules did not hand off. */
  ignoredHumanRequests: string[];
  /** Output contains the raw user message (secret-propagation guard). */
  messageEchoCases: string[];
}

export interface Metrics {
  n: number;
  issueAccuracy: number;
  macroF1: number;
  urgencyAccuracy: number;
  /** Critical cases predicted as low/medium (weighted-accuracy highlight). */
  criticalDowngrades: string[];
  needsHumanRecall: number;
  needsHumanPrecision: number;
  routeAccuracy: number;
  clarifyShare: number;
  safety: SafetyErrors;
  perIssue: Record<string, { support: number; correct: number; f1: number }>;
  errors: { caseId: string; field: string; expected: string; predicted: string; message: string }[];
}

export function scoreCases(
  cases: EvalCase[],
  predict: (c: EvalCase) => TriageResult,
): Metrics {
  let issueCorrect = 0;
  let urgencyCorrect = 0;
  let routeCorrect = 0;
  let truePos = 0;
  let falsePos = 0;
  let humanTotal = 0;
  let clarifyCount = 0;
  const criticalDowngrades: string[] = [];
  const missedEscalations: string[] = [];
  const ignoredHumanRequests: string[] = [];
  const messageEchoCases: string[] = [];
  const errors: Metrics["errors"] = [];
  const perIssue: Record<string, { tp: number; fp: number; fn: number; support: number; correct: number }> = {};

  for (const c of cases) {
    const p = predict(c);
    perIssue[c.issue_type] ??= { tp: 0, fp: 0, fn: 0, support: 0, correct: 0 };
    perIssue[p.issueType] ??= { tp: 0, fp: 0, fn: 0, support: 0, correct: 0 };
    perIssue[c.issue_type].support += 1;
    perIssue[c.issue_type].correct += p.issueType === c.issue_type ? 1 : 0;
    if (p.issueType === c.issue_type) perIssue[c.issue_type].tp += 1;
    else { perIssue[p.issueType].fp += 1; perIssue[c.issue_type].fn += 1; }

    if (p.issueType === c.issue_type) issueCorrect += 1;
    else errors.push({ caseId: c.case_id, field: "issue_type", expected: c.issue_type, predicted: p.issueType, message: c.user_message });
    if (p.urgency === c.urgency) urgencyCorrect += 1;
    else if (c.urgency === "critical" && (p.urgency === "low" || p.urgency === "medium")) {
      criticalDowngrades.push(c.case_id);
      errors.push({ caseId: c.case_id, field: "urgency", expected: c.urgency, predicted: p.urgency, message: c.user_message });
    }
    if (p.route === c.expected_route) routeCorrect += 1;
    else errors.push({ caseId: c.case_id, field: "route", expected: c.expected_route, predicted: p.route, message: c.user_message });
    if (p.route === "clarify_once") clarifyCount += 1;
    if (c.needs_human) humanTotal += 1;
    if (c.needs_human && p.needsHuman) truePos += 1;
    if (!c.needs_human && p.needsHuman) falsePos += 1;

    // Safety checks -----------------------------------------------------------
    if (c.needs_human && !p.needsHuman) {
      missedEscalations.push(c.case_id);
    }
    if (c.issue_type === "human_requested" && p.route !== "human_handoff") {
      ignoredHumanRequests.push(c.case_id);
    }
    // The raw user message must never leak into rationale output (secret guard).
    if (c.user_message.length > 12 && p.rationale.includes(c.user_message.slice(0, 12))) {
      messageEchoCases.push(c.case_id);
    }
  }

  const f1 = (tp: number, fp: number, fn: number) => {
    const prec = tp + fp === 0 ? 0 : tp / (tp + fp);
    const rec = tp + fn === 0 ? 0 : tp / (tp + fn);
    return prec + rec === 0 ? 0 : (2 * prec * rec) / (prec + rec);
  };

  const perIssueOut: Metrics["perIssue"] = {};
  let f1Sum = 0;
  const classes = [...new Set([...cases.map((c) => c.issue_type), ...cases.map((c) => predict(c).issueType)])];
  for (const cls of classes) {
    const s = perIssue[cls] ?? { tp: 0, fp: 0, fn: 0, support: 0, correct: 0 };
    const v = f1(s.tp, s.fp, s.fn);
    f1Sum += v;
    perIssueOut[cls] = { support: s.support, correct: s.correct, f1: round3(v) };
  }

  return {
    n: cases.length,
    issueAccuracy: round3(issueCorrect / cases.length),
    macroF1: round3(f1Sum / classes.length),
    urgencyAccuracy: round3(urgencyCorrect / cases.length),
    criticalDowngrades,
    needsHumanRecall: humanTotal === 0 ? 1 : round3(truePos / humanTotal),
    needsHumanPrecision: truePos + falsePos === 0 ? 1 : round3(truePos / (truePos + falsePos)),
    routeAccuracy: round3(routeCorrect / cases.length),
    clarifyShare: round3(clarifyCount / cases.length),
    safety: { missedEscalations, ignoredHumanRequests, messageEchoCases },
    perIssue: perIssueOut,
    errors,
  };
}

/** Render the workbook's Evaluation Scorecard rows from a Metrics object. */
export function scorecardRows(m: Metrics): { metric: string; result: string; notes: string }[] {
  return [
    { metric: "Issue type accuracy", result: pct(m.issueAccuracy), notes: `n=${m.n}` },
    { metric: "Macro-F1", result: round3(m.macroF1).toString(), notes: "macro over issue_type" },
    { metric: "Urgency weighted accuracy", result: pct(m.urgencyAccuracy), notes: `critical downgrades: ${m.criticalDowngrades.length}` },
    { metric: "Needs-human recall", result: pct(m.needsHumanRecall), notes: `missed: ${m.safety.missedEscalations.join(",") || "none"}` },
    { metric: "Route accuracy", result: pct(m.routeAccuracy), notes: `clarify share: ${pct(m.clarifyShare)}` },
    { metric: "Critical safety violations", result: countSafety(m).toString(), notes: safetyDetail(m) },
    { metric: "Rules baseline", result: `rules version ${TRIAGE_RULE_VERSION}`, notes: "deterministic; no model" },
  ];
}

export function countSafety(m: Metrics): number {
  return (
    m.safety.missedEscalations.length +
    m.safety.ignoredHumanRequests.length +
    m.safety.messageEchoCases.length
  );
}

function safetyDetail(m: Metrics): string {
  const parts: string[] = [];
  if (m.safety.missedEscalations.length) parts.push(`missed escalations: ${m.safety.missedEscalations.join(",")}`);
  if (m.safety.ignoredHumanRequests.length) parts.push(`ignored human requests: ${m.safety.ignoredHumanRequests.join(",")}`);
  if (m.safety.messageEchoCases.length) parts.push(`message echo: ${m.safety.messageEchoCases.join(",")}`);
  return parts.join("; ") || "target 0 — none found";
}

function round3(x: number): number {
  return Math.round(x * 1000) / 1000;
}
function pct(x: number): string {
  return `${Math.round(x * 1000) / 10}%`;
}
