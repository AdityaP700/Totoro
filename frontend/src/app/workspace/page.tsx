"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { ResolveResponse, ActionResponse } from "../../lib/apiTypes";

const allSuggestions = [
  { q: "Why was my WhatsApp template rejected?", desc: "Check parameter mismatches and format rules", roleTags: ["support", "ops", "pm"], templateId: "TPL-1001" },
  { q: "Template order_update_v3 has invalid variable format", desc: "Inspect bracket formatting and parameter syntax", roleTags: ["ops", "dev", "support"], templateId: "TPL-1002" },
  { q: "Payment reminder template rejected for tag mismatch", desc: "Simulate provider resubmit failure and escalation", roleTags: ["support", "founder", "team"], templateId: "TPL-1003" },
  { q: "I want a refund for the billing overcharge", desc: "Verify billing human-led policy guardrails", roleTags: ["founder", "ops", "support"] },
  { q: "Account verification lockout and ownership change", desc: "Escalate access and identity recovery", roleTags: ["support", "team", "founder"] },
  { q: "Help me, something is broken in my setup", desc: "Trigger one focused clarifying question", roleTags: ["support", "dev", "pm"] },
];

const mockTemplates = [
  { id: "auto", label: "Auto-detect from message" },
  { id: "TPL-1001", label: "TPL-1001 (festive_offer_blast — Promo/Utility mismatch)" },
  { id: "TPL-1002", label: "TPL-1002 (order_update_v3 — Variable format fix)" },
  { id: "TPL-1003", label: "TPL-1003 (payment_reminder_aug — Unverified provider failure)" },
];

function WorkspacePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("auto");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [clarificationSubmitting, setClarificationSubmitting] = useState(false);
  const [clarificationInput, setClarificationInput] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [sourcesLibrary, setSourcesLibrary] = useState<Array<{ id: string; originalName: string; status: string; sizeBytes: number; profile: Record<string, unknown>; extractedText: string; caseId: string | null }>>([]);
  const [uploading, setUploading] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{ available: boolean; reason?: string; totalRecords?: number; uniqueRecords?: number; statusBreakdown?: Record<string, number> } | null>(null);

  const [resolveData, setResolveData] = useState<ResolveResponse | null>(null);
  const [actionData, setActionData] = useState<ActionResponse | null>(null);

  useEffect(() => {
    void fetch("/api/preferences").then((response) => response.ok ? response.json() : null).then((data) => { if (data?.profile?.role) setUserRole(data.profile.role); }).catch(() => undefined);
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("totoro_onboarding_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.role) setUserRole(parsed.role);
        }
      } catch {
        // Ignore read errors
      }
    }
  }, []);

  const prioritizedSuggestions = useMemo(() => {
    if (!userRole) return allSuggestions.slice(0, 4);
    const matching = allSuggestions.filter((s) => s.roleTags.includes(userRole));
    const nonMatching = allSuggestions.filter((s) => !s.roleTags.includes(userRole));
    return [...matching, ...nonMatching].slice(0, 4);
  }, [userRole]);

  const handleRunQuery = async (text: string, templateOverride?: string) => {
    if (!text.trim()) return;
    const targetText = text.trim();
    if (!activeQuery) setActiveQuery(targetText);
    setLoading(true);
    setErrorMessage(null);
    setActionData(null);
    setShowTechnical(false);

    try {
      const templateToUse = templateOverride || (selectedTemplateId !== "auto" ? selectedTemplateId : undefined);
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: targetText,
          templateId: templateToUse,
          userRole: userRole || undefined,
          sessionId: sessionId || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data: ResolveResponse = await res.json();
      setResolveData(data);
      setSessionId(data.sessionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze request with backend.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadSources = async (caseId?: string) => {
    const res = await fetch(`/api/evidence${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ""}`);
    if (res.ok) { const data = await res.json(); setSourcesLibrary(data.sources || []); }
  };

  const handleUpload = async (file: File) => {
    if (!resolveData?.caseId) return;
    setUploading(true); setErrorMessage(null);
    try {
      const data = new FormData(); data.set("file", file); data.set("caseId", resolveData.caseId);
      const res = await fetch("/api/evidence", { method: "POST", body: data });
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Upload failed."); }
      await loadSources(resolveData.caseId);
    } catch (error) { setErrorMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setUploading(false); }
  };

  useEffect(() => { if (resolveData?.caseId) void loadSources(resolveData.caseId); }, [resolveData?.caseId]);
  useEffect(() => { if (!resolveData?.caseId) return; void fetch(`/api/analytics?caseId=${encodeURIComponent(resolveData.caseId)}`).then((r) => r.json()).then(setAnalytics).catch(() => setAnalytics(null)); }, [resolveData?.caseId, sourcesLibrary.length]);

  const updateSource = async (id: string, body: Record<string, unknown>) => {
    const response = await fetch("/api/evidence", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...body }) });
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || "Unable to update source."); }
    if (resolveData?.caseId) await loadSources(resolveData.caseId);
  };

  const handleClarifySubmit = async () => {
    if (!clarificationInput.trim() || !sessionId) return;
    setClarificationSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: clarificationInput.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error ${res.status}`);
      }

      const data: ResolveResponse = await res.json();
      setResolveData(data);
      setClarificationInput("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Clarification request failed.";
      setErrorMessage(msg);
    } finally {
      setClarificationSubmitting(false);
    }
  };

  const handleApproveAction = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "approve",
          idempotencyKey: `WEB-${sessionId}-${Date.now()}`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Action failed with status ${res.status}`);
      }

      const data: ActionResponse = await res.json();
      setActionData(data);
      setResolveData((previous) => previous ? { ...previous, stage: data.stage, events: data.events } : previous);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval execution failed.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineAction = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "decline",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Decline failed with status ${res.status}`);
      }

      const data: ActionResponse = await res.json();
      setActionData(data);
      setResolveData((previous) => previous ? { ...previous, stage: data.stage, events: data.events } : previous);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decline request failed.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestHuman = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "human",
          customReason: "Customer requested live specialist support from proposal screen.",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed with status ${res.status}`);
      }

      const data: ActionResponse = await res.json();
      setActionData(data);
      setResolveData((previous) => previous ? { ...previous, stage: data.stage, events: data.events } : previous);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Human handoff request failed.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (searchParams.get("new") === "1") { handleReset(); return; }
    const q = searchParams.get("q");
    const restoreSessionId = searchParams.get("sessionId");
    if (restoreSessionId) {
      void fetch(`/api/session?sessionId=${encodeURIComponent(restoreSessionId)}`).then((response) => response.ok ? response.json() : null).then((data: ResolveResponse | null) => { if (data) { setResolveData(data); setSessionId(data.sessionId); setActiveQuery(data.customerExplanation.headline); } }).catch(() => setErrorMessage("Unable to restore this investigation."));
      return;
    }
    if (q) {
      setQuery(q);
      handleRunQuery(q);
    }
  }, [searchParams]);

  const handleReset = () => {
    setActiveQuery(null);
    setQuery("");
    setSessionId(null);
    setResolveData(null);
    setActionData(null);
    setErrorMessage(null);
    setShowTechnical(false);
    router.push("/workspace");
  };

  // Status badges & display metrics
  const statusBadge = actionData?.statusBadge || resolveData?.statusBadge || "Diagnosis verified";
  const title = resolveData?.title || "Issue Investigation";
  const answer = actionData
    ? actionData.customerExplanation.whatIsWrong
    : resolveData
    ? resolveData.customerExplanation.whatIsWrong
    : "Analyzing issue against deterministic rules and mock state...";
  const recommendedAction = actionData
    ? actionData.customerExplanation.nextSteps
    : resolveData
    ? resolveData.customerExplanation.nextSteps
    : "Reviewing available recovery paths...";
  const evidence = resolveData?.evidence || "Inspecting mock template state and policy constraints.";
  const ruleTrace = resolveData?.ruleTrace || "Evaluating deterministic rules...";
  const sources = resolveData?.sources || ["mock_store_fixtures", "provider_rules"];
  const reasoningSteps = resolveData?.reasoningSteps || [
    "1. Triaged customer symptom.",
    "2. Inspected mock state.",
    "3. Evaluated policy rules.",
  ];
  const executionVerification = actionData?.executionVerification || resolveData?.executionVerification || [
    ["Triage", "Rules baseline passed"],
    ["Context", "Mock state verified"],
    ["Safety", "Guarded"],
  ];
  const latency = resolveData ? `${resolveData.latencyMs}ms` : "14ms";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-6xl flex-col gap-8 px-5 py-10 md:px-8">
      <AnimatePresence mode="wait">
        {!activeQuery ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 py-10"
          >
            <div className="text-center">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Totoro workspace
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-950 md:text-5xl">
                What can I help you with?
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-7 text-zinc-600">
                Describe the issue in your own words, and Totoro will diagnose the problem, evaluate safety rules, and guide you through recovery.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <span className="font-semibold">Request failed:</span> {errorMessage}
              </div>
            )}

            <div className="rounded-[24px] border border-zinc-200 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.035)]">
              {/* Optional Mock Template Context Selector */}
              <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">Target context:</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-xs text-zinc-700 outline-none hover:border-zinc-300"
                >
                  {mockTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe what you need help with..."
                className="h-[82px] w-full resize-none bg-transparent text-[16px] leading-7 text-zinc-900 outline-none placeholder:text-zinc-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleRunQuery(query);
                  }
                }}
              />
              <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                <span className="text-xs font-medium text-zinc-400">Press Enter to analyze</span>
                <button
                  type="button"
                  onClick={() => handleRunQuery(query)}
                  disabled={!query.trim() || loading}
                  className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300"
                >
                  {loading ? "Analyzing..." : "Analyze issue"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {prioritizedSuggestions.map((suggestion) => (
                <button
                  key={suggestion.q}
                  type="button"
                  onClick={() => {
                    setQuery(suggestion.q);
                    if (suggestion.templateId) {
                      setSelectedTemplateId(suggestion.templateId);
                    }
                    handleRunQuery(suggestion.q, suggestion.templateId);
                  }}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <span className="text-sm font-semibold text-zinc-950">{suggestion.q}</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">{suggestion.desc}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mx-auto flex w-full max-w-[760px] flex-col gap-5 pb-24"
          >
            {/* Header with Title and Reset */}
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                  <span
                    className={`font-semibold ${
                      statusBadge.includes("Verified")
                        ? "text-emerald-600"
                        : statusBadge.includes("Escalated") || statusBadge.includes("Blocked")
                        ? "text-rose-600"
                        : statusBadge.includes("Clarification")
                        ? "text-amber-600"
                        : "text-zinc-700"
                    }`}
                  >
                    {statusBadge}
                  </span>
                  <span>/</span>
                  <span>{title}</span>
                  {sessionId && (
                    <>
                      <span>/</span>
                      <span className="text-zinc-400 font-mono text-[9px]">{sessionId}</span>
                    </>
                  )}
                </div>
                <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-zinc-950 md:text-5xl">
                  {activeQuery}
                </h1>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-fit rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950"
              >
                New request
              </button>
              {sessionId && <a href={`/workspace?q=${encodeURIComponent(activeQuery || "Review this investigation")}&reconsider=1`} className="w-fit rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">Reconsider</a>}
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <span className="font-semibold">Error:</span> {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5">
              <main className="flex flex-col gap-6">
                <section className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.025)]">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Conversation timeline</span>
                  <div className="mt-5 space-y-3" aria-live="polite">
                    {[...(resolveData?.messages || []).map((m) => ({ ...m, kind: "message" as const })), ...(resolveData?.events || []).map((e) => ({ role: "assistant" as const, text: e.outcome, timestamp: e.timestamp, kind: "event" as const, eventType: e.eventType }))].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((item, index) => (
                      <div key={`${item.kind}-${item.timestamp}-${index}`} className={`rounded-xl border p-3 ${item.role === "user" ? "ml-8 border-zinc-300 bg-zinc-950 text-white" : "mr-8 border-zinc-200 bg-zinc-50 text-zinc-800"}`}>
                        <div className="flex justify-between gap-2 font-mono text-[10px] uppercase tracking-wider opacity-60"><span>{item.kind === "event" ? item.eventType : item.role}</span><time>{new Date(item.timestamp).toLocaleTimeString()}</time></div><p className="mt-1 text-sm leading-6">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
                {/* 1. Summary / What I Found */}
                <section className="hidden rounded-[28px] border border-zinc-200 bg-white p-7 shadow-[0_16px_50px_rgba(0,0,0,0.03)] md:p-9">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                    Summary / What I found
                  </span>
                  {loading ? (
                    <div className="mt-8 h-32 rounded-2xl bg-zinc-50 p-6 text-sm text-zinc-400">
                      Totoro is reading state and evaluating deterministic recovery rules...
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      <p className="text-[22px] font-semibold leading-[1.45] text-zinc-950 md:text-2xl">
                        {answer}
                      </p>
                      {resolveData?.customerExplanation?.evidenceExplanation && (
                        <p className="text-[15px] leading-7 text-zinc-600">
                          {resolveData.customerExplanation.evidenceExplanation}
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {/* 2. Recommended Next Step / Interactive Action Zone */}
                <section
                  className={`rounded-[24px] border p-6 shadow-[0_10px_35px_rgba(0,0,0,0.025)] ${
                    actionData?.isVerified || (resolveData?.isVerified && !actionData)
                      ? "border-emerald-400/40 bg-emerald-50/60"
                      : actionData?.blocked || resolveData?.stage === "HANDOFF"
                      ? "border-rose-300/60 bg-rose-50/50"
                      : resolveData?.stage === "CLARIFY_ONCE"
                      ? "border-amber-300/60 bg-amber-50/50"
                      : "border-emerald-400/30 bg-emerald-50/40"
                  }`}
                >
                  <span
                    className={`font-mono text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      actionData?.isVerified
                        ? "text-emerald-800"
                        : actionData?.blocked || resolveData?.stage === "HANDOFF"
                        ? "text-rose-800"
                        : resolveData?.stage === "CLARIFY_ONCE"
                        ? "text-amber-800"
                        : "text-emerald-700"
                    }`}
                  >
                    {resolveData?.stage === "CLARIFY_ONCE"
                      ? "Clarification required"
                      : resolveData?.stage === "PROPOSE" && !actionData
                      ? "Proposed recovery action (Approval required)"
                      : actionData?.isVerified
                      ? "Recovery outcome verified"
                      : "Recommended next step"}
                  </span>

                  <p className="mt-3 text-[17px] font-semibold text-zinc-900 leading-relaxed">
                    {recommendedAction}
                  </p>

                  {/* Multi-turn Clarification Input */}
                  {resolveData?.stage === "CLARIFY_ONCE" && !actionData && (
                    <div className="mt-5 rounded-2xl border border-amber-200 bg-white p-4">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-amber-900 mb-2 font-mono">
                        {resolveData.clarificationQuestion || "Please provide the missing detail:"}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={clarificationInput}
                          onChange={(e) => setClarificationInput(e.target.value)}
                          placeholder="Type your answer here..."
                          className="flex-1 rounded-xl border border-zinc-200 px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleClarifySubmit();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleClarifySubmit}
                          disabled={!clarificationInput.trim() || clarificationSubmitting}
                          className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40"
                        >
                          {clarificationSubmitting ? "Submitting..." : "Submit Answer"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Proposed Action Approval Card (G1 Guardrail) */}
                  {resolveData?.proposal && !actionData && resolveData.stage !== "HANDOFF" && (
                    <div className="mt-5 space-y-4">
                      {resolveData.proposal.changes && resolveData.proposal.changes.length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-zinc-200 bg-zinc-50 font-mono uppercase text-zinc-500">
                              <tr>
                                <th className="p-3">Field</th>
                                <th className="p-3">Current Mock State</th>
                                <th className="p-3">Proposed Change (SIMULATED)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resolveData.proposal.changes.map((c) => (
                                <tr key={c.field} className="border-b border-zinc-100 font-mono last:border-0">
                                  <td className="p-3 font-semibold text-zinc-900">{c.field}</td>
                                  <td className="p-3 bg-rose-50/50 text-rose-700">{c.before}</td>
                                  <td className="p-3 bg-emerald-50/50 text-emerald-700 font-medium">{c.after}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleApproveAction}
                          disabled={actionLoading}
                          className="rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {actionLoading ? "Executing simulated write..." : "Approve & Resubmit (MOCK)"}
                        </button>
                        <button
                          type="button"
                          onClick={handleDeclineAction}
                          disabled={actionLoading}
                          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={handleRequestHuman}
                          disabled={actionLoading}
                          className="rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          Request Human Support
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-zinc-500">
                        * Guardrail G1: No state changes occur without explicit user approval. Actions are simulated in mock fixtures.
                      </p>
                    </div>
                  )}

                  {/* Post-Action Verification Outcome */}
                  {actionData && (
                    <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            actionData.isVerified
                              ? "bg-emerald-500"
                              : actionData.blocked
                              ? "bg-rose-500"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-900">
                          {actionData.verificationStatus}
                        </span>
                      </div>
                      {actionData.actionResult && (
                        <p className="text-sm text-zinc-700 font-mono bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                          {actionData.actionResult}
                        </p>
                      )}
                      {actionData.verification?.statement && (
                        <p className="text-sm text-zinc-800 font-medium">
                          {actionData.verification.statement}
                        </p>
                      )}
                      {actionData.blocked && (
                        <p className="text-sm text-rose-700 font-medium">
                          Blocked: {actionData.blocked}
                        </p>
                      )}
                    </div>
                  )}
                </section>

                {/* 3. Recovery Explanation */}
                <section className="hidden rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.025)]">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                    Recovery Explanation
                  </span>
                  <ul className="mt-5 space-y-4">
                    <li className="flex gap-3 text-[17px] leading-7 text-zinc-800">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-950" />
                      <span>{answer}</span>
                    </li>
                    <li className="flex gap-3 text-[17px] leading-7 text-zinc-800">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-950" />
                      <span>{evidence}</span>
                    </li>
                    <li className="flex gap-3 text-[17px] leading-7 text-zinc-800">
                      <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-950" />
                      <span>{recommendedAction}</span>
                    </li>
                  </ul>
                </section>

                {/* 4. Evidence & Context */}
                <section className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-[0_10px_35px_rgba(0,0,0,0.025)]">
                  <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                        Evidence & Context
                      </span>
                      <p className="mt-3 max-w-2xl text-[15px] leading-7 text-zinc-600">{evidence}</p>
                    </div>
                    {resolveData?.caseId && (
                      <label className="cursor-pointer rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
                        {uploading ? "Processing source..." : "Attach source"}
                        <input className="sr-only" type="file" accept=".csv,.xlsx,.txt,.md,.markdown,.docx" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleUpload(file); event.currentTarget.value = ""; }} />
                      </label>
                    )}
                  </div>

                  {sourcesLibrary.length > 0 && (
                    <div className="mt-5 space-y-2" aria-label="Case-linked evidence">
                      {sourcesLibrary.map((source) => (
                        <div key={source.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2"><div><span className="font-semibold text-zinc-900">{source.originalName}</span><span className="ml-2 font-mono text-zinc-500">{source.status} · {Math.ceil(source.sizeBytes / 1024)} KB</span></div><div className="flex gap-2"><button type="button" onClick={() => setExpandedSource(expandedSource === source.id ? null : source.id)} className="text-zinc-600 underline">{expandedSource === source.id ? "Hide" : "Preview"}</button><button type="button" onClick={() => void updateSource(source.id, { caseId: null }).catch((e) => setErrorMessage(e.message))} className="text-rose-700 underline">Unlink</button></div></div>
                          {expandedSource === source.id && <div className="mt-3 space-y-2 border-t border-zinc-200 pt-2"><p className="whitespace-pre-wrap text-zinc-700">{source.extractedText.slice(0, 1200) || "No extractable text; metadata is available."}</p>{Array.isArray(source.profile.headers) && <button type="button" onClick={() => void updateSource(source.id, { mapping: { status: (source.profile.headers as string[]).find((h) => /status|state|outcome/i.test(h)) || "" } }).catch((e) => setErrorMessage(e.message))} className="rounded-lg border border-zinc-300 px-2 py-1 text-zinc-700">Confirm detected status mapping</button>}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {analytics && <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4"><p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Deterministic source analysis</p>{analytics.available ? <><div className="mt-2 grid grid-cols-2 gap-3"><div><strong>{analytics.totalRecords}</strong><span className="ml-1 text-zinc-500">records</span></div><div><strong>{analytics.uniqueRecords}</strong><span className="ml-1 text-zinc-500">unique</span></div></div>{analytics.statusBreakdown && <div className="mt-3 space-y-1">{Object.entries(analytics.statusBreakdown).map(([label, count]) => <div key={label} className="flex justify-between text-zinc-700"><span>{label}</span><span>{count}</span></div>)}</div>}</> : <p className="mt-2 text-zinc-500">{analytics.reason}</p>}</div>}

                  <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { value: resolveData?.guardrails || "Guarded", label: "Safety Policy" },
                      { value: resolveData?.contextEvaluated || "Mock state", label: "State Read" },
                      { value: actionData?.verificationStatus || resolveData?.verificationStatus || "Pending check", label: "Verification" },
                      { value: resolveData?.category || "General", label: "Domain" },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                        <div className="truncate font-mono text-xl font-semibold text-zinc-950">{metric.value}</div>
                        <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 5. Technical Details (Accordion) */}
                <section className="hidden overflow-hidden rounded-[24px] border border-zinc-200 bg-white shadow-[0_10px_35px_rgba(0,0,0,0.025)]">
                  <button
                    type="button"
                    onClick={() => setShowTechnical(!showTechnical)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-zinc-50"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-zinc-950">Technical details</span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        Rule evaluation trace, inspected mock fixtures, and triage reasoning.
                      </span>
                    </span>
                    <span className="font-mono text-sm text-zinc-400">{showTechnical ? "-" : "+"}</span>
                  </button>
                  <AnimatePresence>
                    {showTechnical && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-zinc-200"
                      >
                        <div className="grid grid-cols-1 gap-5 p-6 lg:grid-cols-[1.25fr_0.75fr]">
                          <pre className="overflow-x-auto rounded-2xl bg-zinc-950 p-5 font-mono text-[12px] leading-7 text-zinc-300">
                            <code>{ruleTrace}</code>
                          </pre>
                          <div className="space-y-4">
                            <div>
                              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">Inspected fixtures</span>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {sources.map((source) => (
                                  <span key={source} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-xs text-zinc-700">
                                    {source}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400">Reasoning trace</span>
                              <ol className="mt-3 space-y-2 text-sm leading-6 text-zinc-600">
                                {reasoningSteps.map((step) => (
                                  <li key={step}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
                <form onSubmit={(event) => { event.preventDefault(); if (followUp.trim()) { void handleRunQuery(followUp); setFollowUp(""); } }} className="sticky bottom-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg">
                  <label htmlFor="follow-up" className="sr-only">Continue this investigation</label><div className="flex gap-2"><input id="follow-up" value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="Ask a follow-up or add context…" className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500" /><button type="submit" disabled={loading || !followUp.trim()} className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Send</button></div>
                </form>
              </main>

              {/* Aside: Verification */}
              <aside className="hidden flex-col gap-4">
                <div className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-[0_10px_35px_rgba(0,0,0,0.025)]">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                    Verification
                  </span>
                  <div className="mt-5 space-y-4">
                    {executionVerification.map(([label, val]) => (
                      <div key={label} className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                            val.toLowerCase().includes("verified") || val.toLowerCase().includes("pass")
                              ? "bg-emerald-500"
                              : val.toLowerCase().includes("failed") || val.toLowerCase().includes("human")
                              ? "bg-rose-500"
                              : "bg-amber-500"
                          }`}
                        />
                        <div>
                          <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</div>
                          <div className="text-sm font-semibold text-zinc-950">{val}</div>
                        </div>
                      </div>
                    ))}
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="font-mono text-3xl font-semibold text-zinc-950">{latency}</div>
                      <div className="mt-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Triage Time</div>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading workspace...</div>}>
      <WorkspacePageContent />
    </Suspense>
  );
}
