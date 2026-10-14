"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { ResolveResponse, ActionResponse } from "../../lib/apiTypes";
import { useWorkspace } from "../../lib/workspaceContext";

const allSuggestions = [
  {
    q: "Why was my WhatsApp template rejected?",
    desc: "Check parameter mismatches, category guidelines, and formatting rules.",
    roleTags: ["support", "ops", "pm"],
    templateId: "TPL-1001",
  },
  {
    q: "Template order_update_v3 has invalid variable format",
    desc: "Inspect bracket formatting, missing placeholders, and syntax requirements.",
    roleTags: ["ops", "dev", "support"],
    templateId: "TPL-1002",
  },
  {
    q: "Payment reminder template rejected for tag mismatch",
    desc: "Simulate provider resubmit failure, mismatch diagnosis, and escalation.",
    roleTags: ["support", "founder", "team"],
    templateId: "TPL-1003",
  },
  {
    q: "I want a refund for the billing overcharge",
    desc: "Enforce human-led billing policy guardrails (G8–G12) with audit dossier.",
    roleTags: ["founder", "ops", "support"],
  },
  {
    q: "Account verification lockout and ownership change",
    desc: "Escalate access and identity recovery through safety guardrails.",
    roleTags: ["support", "team", "founder"],
  },
  {
    q: "Help me, something is broken in my setup",
    desc: "Trigger single focused clarifying question without guessing missing state.",
    roleTags: ["support", "dev", "pm"],
  },
];

const mockTemplates = [
  { id: "auto", label: "Auto-detect from message" },
  { id: "TPL-1001", label: "TPL-1001 (festive_offer_blast — Promo/Utility mismatch)" },
  { id: "TPL-1002", label: "TPL-1002 (order_update_v3 — Variable format fix)" },
  { id: "TPL-1003", label: "TPL-1003 (payment_reminder_aug — Unverified provider failure)" },
];

function deriveCaseTitle(data: ResolveResponse | null, fallback: string | null): string {
  const issue = data?.triage?.issueType;
  const titles: Record<string, string> = {
    template_rejection: "WhatsApp template rejection",
    billing_refund: "Billing discrepancy inquiry",
    security_identity_access: "Account access & verification",
    integration_webhook: "Webhook delivery failure",
    message_delivery: "Message delivery issue",
    ambiguous_or_missing_context: "Issue investigation",
  };
  return titles[issue || ""] || fallback?.slice(0, 50) || "Issue investigation";
}

function WorkspacePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    setActiveTitle,
    setStatusBadge,
    userProfile,
    addRecentRequest,
    refreshRecentRequests,
  } = useWorkspace();

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
  const [showEvidenceSection, setShowEvidenceSection] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [showEditProposal, setShowEditProposal] = useState(false);
  const [editedCategory, setEditedCategory] = useState("Utility");

  // Evidence sources
  const [sourcesLibrary, setSourcesLibrary] = useState<
    Array<{
      id: string;
      originalName: string;
      status: string;
      sizeBytes: number;
      profile: Record<string, unknown>;
      extractedText: string;
      caseId: string | null;
    }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<{
    available: boolean;
    reason?: string;
    totalRecords?: number;
    uniqueRecords?: number;
    statusBreakdown?: Record<string, number>;
  } | null>(null);

  const [resolveData, setResolveData] = useState<ResolveResponse | null>(null);
  const [actionData, setActionData] = useState<ActionResponse | null>(null);

  // Filter prioritized suggestions based on onboarding role
  const userRole = (userProfile.role || "support").toLowerCase();
  const prioritizedSuggestions = useMemo(() => {
    const matching = allSuggestions.filter((s) => s.roleTags.includes(userRole));
    const nonMatching = allSuggestions.filter((s) => !s.roleTags.includes(userRole));
    return [...matching, ...nonMatching].slice(0, 4);
  }, [userRole]);

  // Sync active title and status badge with layout context
  useEffect(() => {
    if (actionData) {
      setStatusBadge(actionData.statusBadge || "Execution complete");
    } else if (resolveData) {
      const title = customTitle || deriveCaseTitle(resolveData, activeQuery);
      setActiveTitle(title);
      setStatusBadge(resolveData.statusBadge || "Awaiting approval");
    } else {
      setActiveTitle("New request");
      setStatusBadge("Ready");
    }
  }, [resolveData, actionData, customTitle, activeQuery, setActiveTitle, setStatusBadge]);

  const handleRunQuery = async (text: string, templateOverride?: string) => {
    if (!text.trim()) return;
    const targetText = text.trim();
    if (!activeQuery) setActiveQuery(targetText);
    setLoading(true);
    setErrorMessage(null);
    setActionData(null);
    setShowTechnical(false);

    try {
      const templateToUse =
        templateOverride || (selectedTemplateId !== "auto" ? selectedTemplateId : undefined);
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: targetText,
          templateId: templateToUse,
          userRole: userProfile.role || undefined,
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

      const computedTitle = deriveCaseTitle(data, targetText);
      setCustomTitle(computedTitle);
      setActiveTitle(computedTitle);
      setStatusBadge(data.statusBadge || "Awaiting approval");

      // Add to recent requests
      const subtitle = `${data.templateSnapshot?.id || data.proposal?.targetId || "general"} · just now`;
      addRecentRequest({
        id: data.sessionId,
        title: computedTitle,
        subtitle,
        q: targetText,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to analyze request with backend.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadSources = async (caseId?: string) => {
    const res = await fetch(`/api/evidence${caseId ? `?caseId=${encodeURIComponent(caseId)}` : ""}`);
    if (res.ok) {
      const data = await res.json();
      setSourcesLibrary(data.sources || []);
    }
  };

  const handleUpload = async (file: File) => {
    if (!resolveData?.caseId) return;
    setUploading(true);
    setErrorMessage(null);
    try {
      const data = new FormData();
      data.set("file", file);
      data.set("caseId", resolveData.caseId);
      const res = await fetch("/api/evidence", { method: "POST", body: data });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Upload failed.");
      }
      await loadSources(resolveData.caseId);
      setShowEvidenceSection(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (resolveData?.caseId) void loadSources(resolveData.caseId);
  }, [resolveData?.caseId]);

  useEffect(() => {
    if (!resolveData?.caseId) return;
    void fetch(`/api/analytics?caseId=${encodeURIComponent(resolveData.caseId)}`)
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => setAnalytics(null));
  }, [resolveData?.caseId, sourcesLibrary.length]);

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
      setStatusBadge(data.statusBadge || "Verified read");
      setResolveData((prev) => (prev ? { ...prev, stage: data.stage, events: data.events } : prev));
      void refreshRecentRequests();
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
      setStatusBadge(data.statusBadge || "Declined");
      setResolveData((prev) => (prev ? { ...prev, stage: data.stage, events: data.events } : prev));
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
          customReason: "Customer requested human specialist support.",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Request failed with status ${res.status}`);
      }

      const data: ActionResponse = await res.json();
      setActionData(data);
      setStatusBadge(data.statusBadge || "Escalated to human support");
      setResolveData((prev) => (prev ? { ...prev, stage: data.stage, events: data.events } : prev));
      void refreshRecentRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Human handoff request failed.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // URL search params effect
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      handleReset();
      return;
    }
    const q = searchParams.get("q");
    const restoreSessionId = searchParams.get("sessionId");
    if (restoreSessionId) {
      void fetch(`/api/session?sessionId=${encodeURIComponent(restoreSessionId)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((data: ResolveResponse | null) => {
          if (data) {
            setResolveData(data);
            setSessionId(data.sessionId);
            setActiveQuery(data.customerExplanation.headline);
            const title = deriveCaseTitle(data, data.customerExplanation.headline);
            setCustomTitle(title);
            setActiveTitle(title);
            setStatusBadge(data.statusBadge || "Awaiting approval");
          }
        })
        .catch(() => setErrorMessage("Unable to restore this investigation."));
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
    setShowEvidenceSection(false);
    setIsRenaming(false);
    setCustomTitle("");
    setActiveTitle("New request");
    setStatusBadge("Ready");
    router.push("/workspace");
  };

  const handleSaveRename = async () => {
    if (!customTitle.trim()) return;
    setIsRenaming(false);
    setActiveTitle(customTitle.trim());
    if (sessionId) {
      try {
        await fetch("/api/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, title: customTitle.trim() }),
        });
        void refreshRecentRequests();
      } catch {
        // Ignore
      }
    }
  };

  const displayName = userProfile.name?.trim() || "Sarah";
  const displayRole = userProfile.role || "Support";
  const displayBusiness = userProfile.businessName || "Totoro";

  const caseHeadline = customTitle || deriveCaseTitle(resolveData, activeQuery);
  const templateIdDisplay =
    resolveData?.templateSnapshot?.id ||
    resolveData?.proposal?.targetId ||
    (selectedTemplateId !== "auto" ? selectedTemplateId : "payment_due_v2");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[800px] flex-col px-4 py-8 md:px-8">
      <AnimatePresence mode="wait">
        {!activeQuery ? (
          /* ========================================================= */
          /* 1. WELCOME SCREEN (Reference Screenshot Image 2)           */
          /* ========================================================= */
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto flex w-full flex-1 flex-col justify-center gap-7 py-6"
          >
            {/* Greeting Header */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-100/80 px-4 py-1.5 text-sky-900 font-semibold text-base sm:text-lg shadow-2xs">
                <span>Welcome, {displayName}!</span>
                <span>👋</span>
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                How can I help you today?
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-zinc-500 max-w-lg leading-relaxed">
                Configured for {displayRole} at {displayBusiness} — diagnosing WhatsApp rejections, enforcing deterministic safety guardrails, and guiding recovery.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
                <span className="font-semibold">Error:</span> {errorMessage}
              </div>
            )}

            {/* Main Prompt Card */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_12px_40px_rgba(0,0,0,0.03)]">
              {/* Target context selector */}
              <div className="mb-3 flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  Target context:
                </span>
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
                placeholder="Describe what you need help with or paste a rejection error..."
                rows={3}
                className="w-full resize-none bg-transparent text-sm leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleRunQuery(query);
                  }
                }}
              />

              <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                <span className="text-[11px] font-medium text-zinc-400">Press Enter to analyze</span>
                <button
                  type="button"
                  onClick={() => handleRunQuery(query)}
                  disabled={!query.trim() || loading}
                  className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:bg-zinc-100 disabled:text-zinc-300 transition-all"
                >
                  {loading ? "Analyzing rules..." : "Analyze issue"}
                </button>
              </div>
            </div>

            {/* Quick Suggested Prompt Cards */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-1">
                Suggested for {displayRole}
              </span>
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
                    className="group rounded-xl border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50/80 shadow-2xs"
                  >
                    <span className="text-xs font-semibold text-zinc-900 group-hover:text-black">
                      {suggestion.q}
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-zinc-500">
                      {suggestion.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ========================================================= */
          /* 2. ACTIVE CASE VIEW (Reference Screenshot Image 1)         */
          /* ========================================================= */
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex w-full flex-col gap-6 pb-40"
          >
            {/* Case Title Bar */}
            <div className="flex items-start justify-between border-b border-zinc-200/80 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="rounded-lg border border-zinc-300 px-2 py-1 text-lg font-bold text-zinc-900 outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename();
                          if (e.key === "Escape") setIsRenaming(false);
                        }}
                      />
                      <button
                        onClick={handleSaveRename}
                        className="rounded-md bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-950">
                        {caseHeadline}
                      </h1>
                      <button
                        onClick={() => {
                          setIsRenaming(true);
                          setCustomTitle(caseHeadline);
                        }}
                        className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                        title="Rename case"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                        <span>Rename</span>
                      </button>
                    </>
                  )}
                </div>
                <p className="font-mono text-xs text-zinc-400">
                  {templateIdDisplay} · Last updated just now
                </p>
              </div>

              {/* Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                  aria-label="More actions"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>

                {showMenuDropdown && (
                  <div className="absolute right-0 top-9 z-30 w-48 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-lg text-xs">
                    <button
                      onClick={() => {
                        setShowMenuDropdown(false);
                        router.push(`/workspace/reports`);
                      }}
                      className="w-full px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50"
                    >
                      View Case Dossier in Reports
                    </button>
                    <button
                      onClick={() => {
                        setShowMenuDropdown(false);
                        handleReset();
                      }}
                      className="w-full px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50"
                    >
                      Start New Request
                    </button>
                    <div className="my-1 h-px bg-zinc-100" />
                    <button
                      onClick={() => {
                        setShowMenuDropdown(false);
                        if (sessionId && navigator.clipboard) {
                          void navigator.clipboard.writeText(sessionId);
                          alert(`Copied Case ID: ${sessionId}`);
                        }
                      }}
                      className="w-full px-3 py-2 text-left text-zinc-700 hover:bg-zinc-50"
                    >
                      Copy Case Session ID
                    </button>
                  </div>
                )}
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
                <span className="font-semibold">Error:</span> {errorMessage}
              </div>
            )}

            {/* Conversation Flow */}
            <div className="flex flex-col gap-5">
              {/* User Inquiry Bubble (Right-aligned) */}
              <div className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-tr-xs border border-zinc-200/80 bg-zinc-100/90 p-4 text-xs sm:text-sm leading-relaxed text-zinc-900 shadow-2xs">
                  {activeQuery}
                </div>
              </div>

              {/* Totoro Assistant Prose Explanation (Left-aligned) */}
              <div className="flex flex-col gap-2 text-xs sm:text-sm leading-relaxed text-zinc-800">
                {loading ? (
                  <div className="rounded-xl bg-zinc-50 p-4 text-xs text-zinc-400">
                    Evaluating deterministic rules against mock state...
                  </div>
                ) : (
                  <>
                    <p className="font-normal text-zinc-800">
                      {actionData
                        ? actionData.customerExplanation.whatIsWrong
                        : resolveData?.customerExplanation.whatIsWrong ||
                          `Based on the mock state read, template ${templateIdDisplay} was submitted under the Utility category, but contains promotional wording resulting in a tag mismatch.`}
                    </p>
                    {resolveData?.customerExplanation.evidenceExplanation && (
                      <p className="text-zinc-600">
                        {resolveData.customerExplanation.evidenceExplanation}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Horizontal Inspection Strip Card (Reference Screenshot Image 1) */}
              <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 items-center">
                  {/* Col 1: Current state */}
                  <div>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      Current state
                    </span>
                    <span className="mt-1 inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                      {resolveData?.templateSnapshot?.status || "Rejected"}
                    </span>
                  </div>

                  {/* Col 2: Category */}
                  <div>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      Category
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-zinc-900">
                      {resolveData?.templateSnapshot?.category || resolveData?.category || "Marketing"}
                    </span>
                  </div>

                  {/* Col 3: Reason */}
                  <div>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                      Reason
                    </span>
                    <span className="mt-1 block truncate font-mono text-xs text-zinc-700">
                      {resolveData?.triage?.issueType === "template_rejection"
                        ? resolveData?.diagnosis?.reasonCode || resolveData?.diagnosis?.playbookId || "FIXTURE_TAG_CONTENT_MISMATCH"
                        : resolveData?.triage?.issueType || "POLICY_CHECK"}
                    </span>
                  </div>

                  {/* Col 4: View Evidence Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowEvidenceSection(!showEvidenceSection)}
                      className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors"
                    >
                      <span>View evidence</span>
                      <span>{showEvidenceSection ? "▲" : "⌵"}</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Evidence Details Drawer */}
                {showEvidenceSection && (
                  <div className="mt-3 border-t border-zinc-100 pt-3 text-xs space-y-3">
                    <div className="rounded-lg bg-zinc-50 p-3 text-zinc-700 leading-relaxed font-sans">
                      <span className="font-semibold text-zinc-900 block mb-1">State Evidence:</span>
                      {resolveData?.evidence || "Inspected mock template state and policy constraints."}
                    </div>

                    {/* Uploaded Evidence files */}
                    {sourcesLibrary.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-mono text-[10px] font-semibold uppercase text-zinc-400">
                          Linked Evidence Files ({sourcesLibrary.length})
                        </span>
                        {sourcesLibrary.map((s) => (
                          <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs">
                            <span className="font-medium text-zinc-800">{s.originalName}</span>
                            <button
                              onClick={() => setExpandedSource(expandedSource === s.id ? null : s.id)}
                              className="text-zinc-500 underline hover:text-zinc-800"
                            >
                              {expandedSource === s.id ? "Close" : "Preview"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Proposed Change Card (Reference Screenshot Image 1) */}
              {resolveData?.proposal && !actionData && resolveData.stage !== "HANDOFF" && (
                <div className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs space-y-4">
                  <div>
                    <h2 className="text-sm font-bold text-zinc-950">Proposed change</h2>
                    <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
                      To resolve the rejection, Totoro can reclassify the template or adjust parameters to match Meta transaction guidelines. Recommended path:
                    </p>
                  </div>

                  {/* Inline Pill Diff */}
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 space-y-2">
                    {resolveData.proposal.changes && resolveData.proposal.changes.length > 0 ? (
                      resolveData.proposal.changes.map((c) => (
                        <div key={c.field} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-zinc-800 font-mono">{c.field}</span>
                          <span className="text-zinc-300">|</span>
                          <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-rose-700 line-through">
                            {c.before}
                          </span>
                          <span className="text-zinc-400">→</span>
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono font-semibold text-emerald-700">
                            {c.after}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-zinc-800 font-mono">Category</span>
                        <span className="text-zinc-300">|</span>
                        <span className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-mono text-rose-700 line-through">
                          Marketing
                        </span>
                        <span className="text-zinc-400">→</span>
                        <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono font-semibold text-emerald-700">
                          {editedCategory}
                        </span>
                      </div>
                    )}
                    <p className="text-[11px] text-zinc-600 leading-relaxed pt-1">
                      {resolveData.proposal.description ||
                        "Changes category to Utility and adjusts parameter formatting to conform to Meta transaction policies."}
                    </p>
                  </div>

                  {/* Edit Proposal inline drawer if requested */}
                  {showEditProposal && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 space-y-2 text-xs">
                      <span className="font-semibold text-zinc-900 block">Edit Proposed Action:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">Target Category:</span>
                        <select
                          value={editedCategory}
                          onChange={(e) => setEditedCategory(e.target.value)}
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs"
                        >
                          <option value="Utility">Utility</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Authentication">Authentication</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowEditProposal(false)}
                          className="rounded-md bg-zinc-900 px-2.5 py-1 text-white text-xs font-semibold"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleApproveAction}
                      disabled={actionLoading}
                      className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition-all"
                    >
                      {actionLoading ? "Executing simulated write..." : "Approve simulated resubmission"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditProposal(!showEditProposal)}
                      disabled={actionLoading}
                      className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Edit proposal
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestHuman}
                      disabled={actionLoading}
                      className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Request human review
                    </button>
                  </div>

                  {/* Guardrail Disclaimer Note */}
                  <p className="font-mono text-[10px] text-zinc-400">
                    * All actions are simulated against mock fixtures. No real Meta/Cheerio API calls are made.
                  </p>
                </div>
              )}

              {/* Multi-turn Clarification (if triage asks) */}
              {resolveData?.stage === "CLARIFY_ONCE" && !actionData && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-800 block">
                    Clarification required
                  </span>
                  <p className="text-xs font-semibold text-zinc-900">
                    {resolveData.clarificationQuestion || "Please provide the missing template detail:"}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clarificationInput}
                      onChange={(e) => setClarificationInput(e.target.value)}
                      placeholder="Type your answer here..."
                      className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleClarifySubmit();
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClarifySubmit}
                      disabled={!clarificationInput.trim() || clarificationSubmitting}
                      className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {clarificationSubmitting ? "Submitting..." : "Submit Answer"}
                    </button>
                  </div>
                </div>
              )}

              {/* Post-Action Verification Outcome */}
              {actionData && (
                <div
                  className={`rounded-2xl border p-5 shadow-2xs space-y-3 ${
                    actionData.isVerified
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-rose-200 bg-rose-50/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        actionData.isVerified ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-900">
                      {actionData.verificationStatus}
                    </span>
                  </div>

                  {actionData.actionResult && (
                    <p className="rounded-lg border border-zinc-200/80 bg-white p-3 font-mono text-xs text-zinc-800">
                      {actionData.actionResult}
                    </p>
                  )}

                  {actionData.verification?.statement && (
                    <p className="text-xs font-medium text-zinc-800">
                      {actionData.verification.statement}
                    </p>
                  )}

                  {actionData.blocked && (
                    <p className="text-xs font-medium text-rose-700">
                      Blocked: {actionData.blocked}
                    </p>
                  )}
                </div>
              )}

              {/* Collapsible Technical Details Accordion */}
              <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-2xs">
                <button
                  type="button"
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-xs font-semibold text-zinc-800">
                    {showTechnical ? "▲ Hide technical details" : "⌵ Technical details (collapsed)"}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    Audit trace & rule log
                  </span>
                </button>

                {showTechnical && (
                  <div className="border-t border-zinc-100 p-4 space-y-4">
                    <div>
                      <span className="font-mono text-[10px] font-semibold uppercase text-zinc-400 block mb-2">
                        Rule checks & state trace
                      </span>
                      <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed text-zinc-300">
                        <code>{resolveData?.ruleTrace || "Evaluating deterministic rules..."}</code>
                      </pre>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                        <span className="block font-mono text-[9px] uppercase text-zinc-400">Policy</span>
                        <span className="font-semibold text-xs text-zinc-900">{resolveData?.guardrails || "G1–G15"}</span>
                      </div>
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                        <span className="block font-mono text-[9px] uppercase text-zinc-400">Read State</span>
                        <span className="font-semibold text-xs text-zinc-900">{resolveData?.contextEvaluated || "Mock state"}</span>
                      </div>
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                        <span className="block font-mono text-[9px] uppercase text-zinc-400">Latency</span>
                        <span className="font-semibold text-xs text-zinc-900">{resolveData?.latencyMs ? `${resolveData.latencyMs}ms` : "14ms"}</span>
                      </div>
                      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                        <span className="block font-mono text-[9px] uppercase text-zinc-400">Verification</span>
                        <span className="font-semibold text-xs text-zinc-900">{resolveData?.verificationStatus || "Pending read"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* 3. ANCHORED BOTTOM COMPOSER (Reference Screenshot Image 1) */}
            {/* ========================================================= */}
            <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 z-30 max-w-[760px] mx-auto">
              {/* Follow-up Suggestion Chips */}
              <div className="flex items-center gap-2 mb-2 overflow-x-auto py-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => handleRunQuery("Show supporting evidence and inspected mock state for this case")}
                  className="shrink-0 rounded-full border border-zinc-200 bg-white/95 px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                >
                  Show supporting evidence
                </button>
                <button
                  type="button"
                  onClick={() => handleRunQuery("What if I decline this proposed recovery action?")}
                  className="shrink-0 rounded-full border border-zinc-200 bg-white/95 px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                >
                  What if I decline?
                </button>
                <button
                  type="button"
                  onClick={handleRequestHuman}
                  className="shrink-0 rounded-full border border-zinc-200 bg-white/95 px-3 py-1 text-[11px] font-medium text-zinc-600 shadow-2xs hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                >
                  Request human specialist
                </button>
              </div>

              {/* Floating Pill Composer */}
              <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white/95 p-2 shadow-lg backdrop-blur-xs">
                {/* Paperclip attachment button */}
                <label
                  className="cursor-pointer rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                  title="Attach evidence source"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                  </svg>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.txt,.md,.markdown,.docx"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                      e.currentTarget.value = "";
                    }}
                    className="sr-only"
                  />
                </label>

                <input
                  type="text"
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (followUp.trim()) {
                        void handleRunQuery(followUp);
                        setFollowUp("");
                      }
                    }
                  }}
                  placeholder="Ask a follow-up or add context..."
                  className="flex-1 bg-transparent px-2 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                />

                {/* Upward arrow send button */}
                <button
                  type="button"
                  onClick={() => {
                    if (followUp.trim()) {
                      void handleRunQuery(followUp);
                      setFollowUp("");
                    }
                  }}
                  disabled={loading || !followUp.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-950 text-white shadow-xs hover:bg-zinc-800 disabled:opacity-30 transition-all shrink-0"
                  aria-label="Send message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="19" x2="12" y2="5"></line>
                    <polyline points="5 12 12 5 19 12"></polyline>
                  </svg>
                </button>
              </div>
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
