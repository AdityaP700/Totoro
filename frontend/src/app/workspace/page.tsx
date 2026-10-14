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
    desc: "Inspect bracket formatting, missing placeholders, and parameter syntax.",
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

      // Add to recent requests with accurate template identity
      const templateSub = data.templateSnapshot
        ? `${data.templateSnapshot.name} (${data.templateSnapshot.id})`
        : data.category || "General";
      addRecentRequest({
        id: data.sessionId,
        title: computedTitle,
        subtitle: `${templateSub} · just now`,
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
  const templateIdentity = resolveData?.templateSnapshot
    ? `${resolveData.templateSnapshot.name} (${resolveData.templateSnapshot.id})`
    : resolveData?.proposal?.targetId || (selectedTemplateId !== "auto" ? selectedTemplateId : "WhatsApp Template");

  const explanationText =
    actionData
      ? actionData.customerExplanation.whatIsWrong
      : resolveData?.customerExplanation.whatIsWrong ||
        "Analyzing issue against deterministic rules and mock state...";

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[800px] flex-col px-4 py-8 md:px-6">
      <AnimatePresence mode="wait">
        {!activeQuery ? (
          /* ========================================================= */
          /* 1. WELCOME SCREEN (Mature Typography & Layout)            */
          /* ========================================================= */
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="mx-auto flex w-full flex-1 flex-col justify-center gap-6 py-6"
          >
            {/* Greeting Header */}
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
                How can I help you today, {displayName}?
              </h1>
              <p className="mt-2 text-sm text-zinc-600 max-w-xl leading-relaxed">
                Configured for {displayRole} at {displayBusiness}. Totoro diagnoses WhatsApp rejections, enforces safety guardrails, and guides simulated recovery.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <span className="font-semibold">Notice:</span> {errorMessage}
              </div>
            )}

            {/* Main Prompt Card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              {/* Target context selector */}
              <div className="mb-3.5 flex items-center justify-between border-b border-zinc-100 pb-3">
                <span className="text-xs font-medium text-zinc-500">
                  Target template context:
                </span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-800 outline-none hover:border-zinc-300"
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
                placeholder="Describe the issue you are experiencing or paste a template error..."
                rows={3}
                className="w-full resize-none bg-transparent text-[16px] leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleRunQuery(query);
                  }
                }}
              />

              <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                <span className="text-xs text-zinc-500">Press Enter to analyze</span>
                <button
                  type="button"
                  onClick={() => handleRunQuery(query)}
                  disabled={!query.trim() || loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:bg-zinc-100 disabled:text-zinc-400 transition-all"
                >
                  {loading ? "Analyzing rules..." : "Analyze issue"}
                </button>
              </div>
            </div>

            {/* Quick Suggested Scenarios */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-zinc-500">
                Suggested scenarios for {displayRole}
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
                    className="group rounded-lg border border-zinc-200 bg-white p-4 text-left transition-all hover:border-zinc-300 hover:bg-zinc-50/70 shadow-sm"
                  >
                    <span className="text-sm font-medium text-zinc-900 group-hover:text-blue-900 block">
                      {suggestion.q}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
                      {suggestion.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ========================================================= */
          /* 2. ACTIVE CASE VIEW (Refined Typography & Spacing)         */
          /* ========================================================= */
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex w-full flex-col gap-6 pb-44"
          >
            {/* Case Title Bar */}
            <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {isRenaming ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-lg font-semibold text-zinc-900 outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveRename();
                          if (e.key === "Escape") setIsRenaming(false);
                        }}
                      />
                      <button
                        onClick={handleSaveRename}
                        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                        {caseHeadline}
                      </h1>
                      <button
                        onClick={() => {
                          setIsRenaming(true);
                          setCustomTitle(caseHeadline);
                        }}
                        className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
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
                <p className="text-xs text-zinc-500">
                  {templateIdentity} · Updated just now
                </p>
              </div>

              {/* Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                  className="rounded-md border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                  aria-label="More actions"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                  </svg>
                </button>

                {showMenuDropdown && (
                  <div className="absolute right-0 top-9 z-30 w-52 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg text-sm">
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
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <span className="font-semibold">Notice:</span> {errorMessage}
              </div>
            )}

            {/* Conversation Flow */}
            <div className="flex flex-col gap-6">
              {/* User Inquiry Bubble (Right-aligned) */}
              <div className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-[75%] rounded-xl rounded-tr-sm border border-zinc-200/90 bg-zinc-100 px-4 py-3 text-[16px] leading-relaxed text-zinc-900 shadow-xs">
                  {activeQuery}
                </div>
              </div>

              {/* Totoro Assistant Prose Explanation (Left-aligned) */}
              <div className="flex flex-col gap-2 text-[16px] leading-7 text-zinc-800">
                {loading ? (
                  <div className="rounded-lg bg-zinc-50 p-4 text-sm text-zinc-500">
                    Evaluating deterministic rules against mock state...
                  </div>
                ) : (
                  <>
                    <p className="font-normal text-zinc-800">
                      {explanationText}
                    </p>
                    {resolveData?.customerExplanation.evidenceExplanation && (
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {resolveData.customerExplanation.evidenceExplanation}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Horizontal Inspection Strip Card */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 items-center">
                  {/* Col 1: Current state */}
                  <div>
                    <span className="block text-xs font-semibold text-zinc-500">
                      Current state
                    </span>
                    <span className="mt-1 inline-flex items-center rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                      {resolveData?.templateSnapshot?.status || "Rejected"}
                    </span>
                  </div>

                  {/* Col 2: Category */}
                  <div>
                    <span className="block text-xs font-semibold text-zinc-500">
                      Category
                    </span>
                    <span className="mt-1 block text-sm font-medium text-zinc-900">
                      {resolveData?.templateSnapshot?.category || resolveData?.category || "Marketing"}
                    </span>
                  </div>

                  {/* Col 3: Reason */}
                  <div>
                    <span className="block text-xs font-semibold text-zinc-500">
                      Reason code
                    </span>
                    <span className="mt-1 block truncate font-mono text-xs text-zinc-700">
                      {resolveData?.triage?.issueType === "template_rejection"
                        ? resolveData?.diagnosis?.reasonCode || resolveData?.diagnosis?.playbookId || "FIXTURE_TAG_CONTENT_MISMATCH"
                        : resolveData?.triage?.issueType || "POLICY_CHECK"}
                    </span>
                  </div>

                  {/* Col 4: Read-Only Evidence Toggle */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowEvidenceSection((prev) => !prev)}
                      className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <span>{showEvidenceSection ? "Hide evidence" : "View evidence"}</span>
                      <span className="text-xs">{showEvidenceSection ? "▲" : "▼"}</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Read-Only Evidence Panel */}
                {showEvidenceSection && (
                  <div className="mt-4 border-t border-zinc-100 pt-4 text-sm space-y-3">
                    <div className="rounded-lg bg-zinc-50 p-4 text-zinc-700 leading-relaxed border border-zinc-200/60 font-sans">
                      <span className="font-semibold text-zinc-900 block mb-1">State Evidence:</span>
                      {resolveData?.evidence || "Inspected mock template state and policy constraints."}
                    </div>

                    {resolveData?.templateSnapshot && (
                      <div className="rounded-lg bg-zinc-50 p-3.5 border border-zinc-200/60 text-xs space-y-1">
                        <span className="font-semibold text-zinc-900 block mb-1">Template Content ({resolveData.templateSnapshot.id}):</span>
                        <p className="font-mono text-zinc-700 bg-white p-2.5 rounded border border-zinc-200">
                          {resolveData.templateSnapshot.text}
                        </p>
                      </div>
                    )}

                    {/* Linked Evidence files */}
                    {sourcesLibrary.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-xs font-semibold text-zinc-500">
                          Linked Evidence Files ({sourcesLibrary.length})
                        </span>
                        {sourcesLibrary.map((s) => (
                          <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs">
                            <span className="font-medium text-zinc-800">{s.originalName}</span>
                            <button
                              onClick={() => setExpandedSource(expandedSource === s.id ? null : s.id)}
                              className="text-blue-600 hover:underline"
                            >
                              {expandedSource === s.id ? "Close preview" : "Preview text"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Proposed Change Card (G1 Guardrail) */}
              {resolveData?.proposal && !actionData && resolveData.stage !== "HANDOFF" && (
                <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Proposed change</h2>
                    <p className="mt-1 text-sm text-zinc-600 leading-relaxed">
                      To resolve the rejection, Totoro can reclassify the template or adjust parameters to match Meta transaction guidelines. Recommended path:
                    </p>
                  </div>

                  {/* Inline Pill Diff */}
                  <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/70 p-3.5 space-y-2">
                    {resolveData.proposal.changes && resolveData.proposal.changes.length > 0 ? (
                      resolveData.proposal.changes.map((c) => (
                        <div key={c.field} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-zinc-900 font-mono">{c.field}</span>
                          <span className="text-zinc-300">|</span>
                          <span className="rounded border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-mono text-xs text-rose-700 line-through">
                            {c.before}
                          </span>
                          <span className="text-zinc-400">→</span>
                          <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-800">
                            {c.after}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-zinc-900 font-mono">Category</span>
                        <span className="text-zinc-300">|</span>
                        <span className="rounded border border-rose-200 bg-rose-50 px-2.5 py-0.5 font-mono text-xs text-rose-700 line-through">
                          Marketing
                        </span>
                        <span className="text-zinc-400">→</span>
                        <span className="rounded border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-medium text-emerald-800">
                          {editedCategory}
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-zinc-600 leading-relaxed pt-1">
                      {resolveData.proposal.description ||
                        "Changes category to Utility and adjusts parameter formatting to conform to Meta transaction policies."}
                    </p>
                  </div>

                  {/* Edit Proposal inline drawer if requested */}
                  {showEditProposal && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 space-y-2 text-sm">
                      <span className="font-medium text-zinc-900 block">Edit Proposed Action:</span>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-600 text-xs">Target Category:</span>
                        <select
                          value={editedCategory}
                          onChange={(e) => setEditedCategory(e.target.value)}
                          className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs"
                        >
                          <option value="Utility">Utility</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Authentication">Authentication</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowEditProposal(false)}
                          className="rounded-md bg-zinc-900 px-3 py-1 text-white text-xs font-medium hover:bg-zinc-800"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleApproveAction}
                      disabled={actionLoading}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      {actionLoading ? "Executing simulated write..." : "Approve simulated resubmission"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditProposal(!showEditProposal)}
                      disabled={actionLoading}
                      className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Edit proposal
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestHuman}
                      disabled={actionLoading}
                      className="rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                    >
                      Request human review
                    </button>
                  </div>

                  {/* Guardrail Disclaimer Note */}
                  <p className="text-xs text-zinc-500">
                    * All actions are simulated against mock fixtures. No real Meta/Cheerio API calls are made.
                  </p>
                </div>
              )}

              {/* Multi-turn Clarification (if triage asks) */}
              {resolveData?.stage === "CLARIFY_ONCE" && !actionData && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                  <span className="text-xs font-semibold text-amber-900 block">
                    Clarification required
                  </span>
                  <p className="text-sm font-medium text-zinc-900">
                    {resolveData.clarificationQuestion || "Please provide the missing template detail:"}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clarificationInput}
                      onChange={(e) => setClarificationInput(e.target.value)}
                      placeholder="Type your answer here..."
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleClarifySubmit();
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleClarifySubmit}
                      disabled={!clarificationInput.trim() || clarificationSubmitting}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                    >
                      {clarificationSubmitting ? "Submitting..." : "Submit Answer"}
                    </button>
                  </div>
                </div>
              )}

              {/* Post-Action Verification Outcome */}
              {actionData && (
                <div
                  className={`rounded-xl border p-5 shadow-sm space-y-3 ${
                    actionData.isVerified
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-rose-200 bg-rose-50/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        actionData.isVerified ? "bg-emerald-600" : "bg-rose-600"
                      }`}
                    />
                    <span className="text-sm font-semibold text-zinc-900">
                      {actionData.verificationStatus}
                    </span>
                  </div>

                  {actionData.actionResult && (
                    <p className="rounded-lg border border-zinc-200 bg-white p-3 font-mono text-xs text-zinc-800">
                      {actionData.actionResult}
                    </p>
                  )}

                  {actionData.verification?.statement && (
                    <p className="text-sm font-medium text-zinc-800">
                      {actionData.verification.statement}
                    </p>
                  )}

                  {actionData.blocked && (
                    <p className="text-sm font-medium text-rose-700">
                      Blocked: {actionData.blocked}
                    </p>
                  )}
                </div>
              )}

              {/* Collapsible Technical Details Accordion */}
              <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowTechnical(!showTechnical)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-50 transition-colors"
                >
                  <span className="text-sm font-medium text-zinc-800">
                    {showTechnical ? "▲ Hide technical details" : "⌵ Technical details (collapsed)"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Audit trace & rule log
                  </span>
                </button>

                {showTechnical && (
                  <div className="border-t border-zinc-100 p-4 space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-zinc-500 block mb-2">
                        Rule checks & state trace
                      </span>
                      <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
                        <code>{resolveData?.ruleTrace || "Evaluating deterministic rules..."}</code>
                      </pre>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded border border-zinc-100 bg-zinc-50 p-3">
                        <span className="block text-xs text-zinc-500">Policy</span>
                        <span className="font-semibold text-sm text-zinc-900">{resolveData?.guardrails || "G1–G15"}</span>
                      </div>
                      <div className="rounded border border-zinc-100 bg-zinc-50 p-3">
                        <span className="block text-xs text-zinc-500">Read State</span>
                        <span className="font-semibold text-sm text-zinc-900">{resolveData?.contextEvaluated || "Mock state"}</span>
                      </div>
                      <div className="rounded border border-zinc-100 bg-zinc-50 p-3">
                        <span className="block text-xs text-zinc-500">Latency</span>
                        <span className="font-semibold text-sm text-zinc-900">{resolveData?.latencyMs ? `${resolveData.latencyMs}ms` : "14ms"}</span>
                      </div>
                      <div className="rounded border border-zinc-100 bg-zinc-50 p-3">
                        <span className="block text-xs text-zinc-500">Verification</span>
                        <span className="font-semibold text-sm text-zinc-900">{resolveData?.verificationStatus || "Pending read"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* 3. ANCHORED BOTTOM COMPOSER (Read-Only Chip Integration)  */ }
            {/* ========================================================= */}
            <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 z-30 max-w-[760px] mx-auto">
              {/* Follow-up Suggestion Chips */}
              <div className="flex items-center gap-2 mb-2 overflow-x-auto py-1 scrollbar-none">
                {/* Read-Only Supporting Evidence Toggle (Priority 1 Fix) */}
                <button
                  type="button"
                  onClick={() => setShowEvidenceSection((prev) => !prev)}
                  className="shrink-0 rounded-full border border-zinc-200 bg-white/95 px-3.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                >
                  {showEvidenceSection ? "Hide supporting evidence" : "Show supporting evidence"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRunQuery("What if I decline this proposed recovery action?")}
                  className="shrink-0 rounded-full border border-zinc-200 bg-white/95 px-3.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                >
                  What if I decline?
                </button>
                <button
                  type="button"
                  onClick={handleRequestHuman}
                  className="shrink-0 rounded-full border border-zinc-200 bg-white/95 px-3.5 py-1 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                >
                  Request human specialist
                </button>
              </div>

              {/* Floating Composer */}
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/95 p-2 shadow-lg backdrop-blur-xs">
                {/* Paperclip attachment button */}
                <label
                  className="cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
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
                  className="flex-1 bg-transparent px-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-30 transition-all shrink-0"
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
