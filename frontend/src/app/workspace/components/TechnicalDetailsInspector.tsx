"use client";

import React, { useState } from "react";
import type { ActionResponse, ResolveResponse } from "../../../lib/apiTypes";
import type { AuditEvent, EventType } from "../../../../../src/domain/types";

interface TechnicalDetailsInspectorProps {
  resolveData: ResolveResponse | null;
  actionData: ActionResponse | null;
}

const EVENT_TITLE_MAP: Record<EventType, string> = {
  CASE_OPENED: "Case opened",
  STATE_READ: "Current state retrieved",
  TRIAGED: "Request assessed",
  CLARIFICATION_ASKED: "Clarification requested",
  CLARIFICATION_ANSWERED: "Clarification received",
  DIAGNOSED: "Likely cause identified",
  FIX_PROPOSED: "Proposed change prepared",
  FIX_DECLINED: "Proposed change declined",
  USER_CONFIRMED: "Simulated write confirmed",
  ACTION_SIMULATED: "Simulated resubmission executed",
  STATE_VERIFIED: "Fresh state verified",
  HANDOFF_CREATED: "Human specialist review requested",
};

export function TechnicalDetailsInspector({
  resolveData,
  actionData,
}: TechnicalDetailsInspectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);

  // Collect events from actionData if available, otherwise from resolveData
  const events: AuditEvent[] =
    actionData?.events && actionData.events.length > 0
      ? actionData.events
      : resolveData?.events || [];

  const rawTrace = resolveData?.ruleTrace || "Evaluating deterministic rules...";

  const handleCopyLog = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(rawTrace);
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  const latency = resolveData?.latencyMs ? `${resolveData.latencyMs}ms` : "14ms";
  const guardrailsPolicy = resolveData?.guardrails || "Guarded (G1–G15)";
  const stateSource =
    resolveData?.contextEvaluated ||
    (resolveData?.templateSnapshot
      ? `Mock store (${resolveData.templateSnapshot.id})`
      : "Mock state fixtures");
  const verificationStatus =
    actionData?.verificationStatus ||
    resolveData?.verificationStatus ||
    "Pending verification";

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xs">
      {/* ========================================================= */}
      {/* Collapsed Header / Row                                    */}
      {/* ========================================================= */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left cursor-pointer hover:bg-zinc-50/80 transition-colors select-none"
      >
        <div className="flex items-center gap-2.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-4 w-4 text-zinc-400 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
          <span className="text-sm font-semibold text-zinc-900">
            Technical details
          </span>
          {events.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
              {events.length} diagnostic events
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
            {isOpen ? "Hide details" : "View audit trace"}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Expanded Diagnostic Inspector                             */}
      {/* ========================================================= */}
      {isOpen && (
        <div className="border-t border-zinc-200 bg-zinc-50/40 p-4 sm:p-5 space-y-6">
          {/* ------------------------------------------------------- */}
          {/* A. Execution Summary                                    */}
          {/* ------------------------------------------------------- */}
          <div>
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Execution Summary
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-2xs">
                <span className="block text-xs text-zinc-500">
                  Policy decision
                </span>
                <span className="mt-0.5 block font-semibold text-sm text-zinc-900">
                  {guardrailsPolicy}
                </span>
                <span className="mt-1 block text-[11px] text-zinc-500 leading-tight">
                  Deterministic rules and safety boundaries enforced
                </span>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-2xs">
                <span className="block text-xs text-zinc-500">
                  State source
                </span>
                <span className="mt-0.5 block font-semibold text-sm text-zinc-900 truncate">
                  {stateSource}
                </span>
                <span className="mt-1 block text-[11px] text-zinc-500 leading-tight">
                  Simulated fixtures (zero live provider calls)
                </span>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-2xs">
                <span className="block text-xs text-zinc-500">
                  Verification status
                </span>
                <span className="mt-0.5 block font-semibold text-sm text-zinc-900">
                  {verificationStatus}
                </span>
                <span className="mt-1 block text-[11px] text-zinc-500 leading-tight">
                  {actionData
                    ? actionData.isVerified
                      ? "Fresh state verified against expected"
                      : "Fresh read shows state unchanged or pending"
                    : "Pre-execution read-only state"}
                </span>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-2xs">
                <span className="block text-xs text-zinc-500">
                  Processing latency
                </span>
                <span className="mt-0.5 block font-semibold text-sm text-zinc-900">
                  {latency}
                </span>
                <span className="mt-1 block text-[11px] text-zinc-500 leading-tight">
                  In-memory rule triage & safety checks
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* B. Diagnostic Timeline                                  */}
          {/* ------------------------------------------------------- */}
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Diagnostic Timeline
            </div>

            {events.length > 0 ? (
              <div className="relative border-l border-zinc-200 pl-4 sm:pl-5 ml-2.5 space-y-4">
                {events.map((evt, idx) => {
                  const title =
                    EVENT_TITLE_MAP[evt.eventType] ||
                    evt.eventType.replace(/_/g, " ").toLowerCase();

                  return (
                    <div key={evt.eventId || idx} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[21px] sm:-left-[25px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-zinc-400 ring-2 ring-zinc-100 group-hover:bg-blue-600 transition-colors" />

                      <div className="rounded-lg border border-zinc-200/80 bg-white p-3 shadow-2xs">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-zinc-900">
                            {title}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            {evt.eventType}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                          {evt.outcome}
                        </p>

                        {/* Expandable Technical Payload */}
                        {evt.details && Object.keys(evt.details).length > 0 && (
                          <details className="mt-2 group/detail">
                            <summary className="cursor-pointer text-[11px] font-medium text-zinc-500 hover:text-zinc-800 list-none flex items-center gap-1">
                              <span className="text-[10px] text-zinc-400 group-open/detail:rotate-90 transition-transform">
                                ▸
                              </span>
                              <span>Inspect technical payload</span>
                            </summary>
                            <pre className="mt-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-2 font-mono text-[11px] text-zinc-700 leading-normal overflow-x-auto">
                              <code>
                                {JSON.stringify(
                                  {
                                    eventType: evt.eventType,
                                    eventId: evt.eventId,
                                    sourceLabel: evt.sourceLabel,
                                    timestamp: evt.timestamp,
                                    details: evt.details,
                                  },
                                  null,
                                  2
                                )}
                              </code>
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-4 text-center text-xs text-zinc-500">
                No diagnostic events recorded for this session.
              </div>
            )}
          </div>

          {/* ------------------------------------------------------- */}
          {/* C. Evidence and Rule Trace                              */}
          {/* ------------------------------------------------------- */}
          <div>
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Evidence & Rule Trace
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-zinc-500 block">
                    Triggered Playbook / Rule:
                  </span>
                  <span className="font-mono text-zinc-800 mt-0.5 block font-medium">
                    {resolveData?.diagnosis?.playbookId ||
                      (resolveData?.triage
                        ? `TRIAGE-${resolveData.triage.issueType.toUpperCase()}`
                        : null) ||
                      "POLICY_EVALUATION"}
                  </span>
                </div>

                <div>
                  <span className="font-semibold text-zinc-500 block">
                    Observed Reason Code:
                  </span>
                  <span className="font-mono text-zinc-800 mt-0.5 block">
                    {resolveData?.diagnosis?.reasonCode ||
                      (resolveData?.templateSnapshot?.reasonCode ?? "NOT_APPLICABLE")}
                  </span>
                </div>
              </div>

              {resolveData?.diagnosis?.plainExplanation && (
                <div className="border-t border-zinc-100 pt-2 text-xs">
                  <span className="font-semibold text-zinc-500 block">
                    Rule Logic:
                  </span>
                  <p className="text-zinc-700 mt-0.5 leading-relaxed">
                    {resolveData.diagnosis.plainExplanation}
                  </p>
                </div>
              )}

              {resolveData?.diagnosis?.evidenceUsed &&
                resolveData.diagnosis.evidenceUsed.length > 0 && (
                  <div className="border-t border-zinc-100 pt-2 text-xs">
                    <span className="font-semibold text-zinc-500 block">
                      Evidence Keyed On:
                    </span>
                    <ul className="mt-1 list-disc list-inside space-y-0.5 text-zinc-700">
                      {resolveData.diagnosis.evidenceUsed.map((ev, i) => (
                        <li key={i} className="truncate">
                          {ev}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {resolveData?.diagnosis?.cannotVerify &&
                resolveData.diagnosis.cannotVerify.length > 0 && (
                  <div className="border-t border-zinc-100 pt-2 text-xs">
                    <span className="font-semibold text-amber-700 block">
                      Known Boundaries (What cannot be verified):
                    </span>
                    <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-900/80">
                      {resolveData.diagnosis.cannotVerify.map((limit, i) => (
                        <li key={i}>{limit}</li>
                      ))}
                    </ul>
                  </div>
                )}

              <details className="border-t border-zinc-100 pt-2 group/evidence">
                <summary className="cursor-pointer text-xs font-medium text-zinc-500 hover:text-zinc-800 list-none flex items-center justify-between">
                  <span>View rule metadata & provenance</span>
                  <span className="text-[10px] text-zinc-400 group-open/evidence:rotate-180 transition-transform">
                    ▼
                  </span>
                </summary>
                <div className="mt-2 rounded bg-zinc-50 p-2.5 font-mono text-[11px] text-zinc-600 space-y-1">
                  <div>
                    <span className="text-zinc-400">Provenance:</span>{" "}
                    FIXTURE_CODE_NOT_ASSERTED_AS_OFFICIAL
                  </div>
                  <div>
                    <span className="text-zinc-400">Evidence label:</span>{" "}
                    DOCUMENTED / SYNTHETIC
                  </div>
                  <div>
                    <span className="text-zinc-400">Target Id:</span>{" "}
                    {resolveData?.proposal?.targetId ||
                      resolveData?.templateSnapshot?.id ||
                      "None (No template entity)"}
                  </div>
                </div>
              </details>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* D. Raw Log Viewer                                       */}
          {/* ------------------------------------------------------- */}
          <div className="border-t border-zinc-200 pt-4">
            <details className="group/raw">
              <summary className="cursor-pointer list-none flex items-center justify-between text-xs font-medium text-zinc-600 hover:text-zinc-900">
                <span className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16m-7 6h7"
                    />
                  </svg>
                  <span>View raw audit trace log</span>
                </span>
                <span className="text-[10px] text-zinc-400 group-open/raw:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>

              <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3.5">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-200 text-xs text-zinc-500">
                  <span>Raw execution events</span>
                  <button
                    type="button"
                    onClick={handleCopyLog}
                    className="rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                  >
                    {copiedLog ? "Copied!" : "Copy log"}
                  </button>
                </div>

                <pre className="font-mono text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                  <code>{rawTrace}</code>
                </pre>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
