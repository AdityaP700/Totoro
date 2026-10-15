"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowRight,
  FileText,
  X,
  AlertTriangle,
  HelpCircle,
  FileCheck,
  UserCheck,
  RefreshCw,
  Search,
  ExternalLink,
  Check,
} from "lucide-react";
import type { ResolveResponse, ActionResponse } from "../../lib/apiTypes";
import { useWorkspace } from "../../lib/workspaceContext";
import { TargetTemplateSelector } from "./components/TargetTemplateSelector";
import { TechnicalDetailsInspector } from "./components/TechnicalDetailsInspector";
import {
  playSubmitSound,
  playFindingSound,
  playVerifiedSound,
  isSoundEnabled,
  setSoundEnabled,
} from "../../lib/soundEffects";

interface StagedAttachment {
  id: string;
  file: File;
  name: string;
  sizeFormatted: string;
}

interface ExtractedEvidenceItem {
  id: string;
  name: string;
  type: string;
  summary: string;
  timestamp: string;
}

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
    q: "Campaign messages sent but recipients report no delivery",
    desc: "Run carrier telemetry check to narrow down delayed vs persistent failure.",
    roleTags: ["ops", "support", "dev"],
    templateId: "TPL-1004",
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
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  // Primary conversation state
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("auto");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [clarificationSubmitting, setClarificationSubmitting] = useState(false);
  const [clarificationInput, setClarificationInput] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio design state
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);

  // Attachments and evidence extraction state
  const [stagedFiles, setStagedFiles] = useState<StagedAttachment[]>([]);
  const [turnAttachments, setTurnAttachments] = useState<Record<number, StagedAttachment[]>>({});
  const [parsingStatus, setParsingStatus] = useState<string | null>(null);
  const [extractedEvidenceCards, setExtractedEvidenceCards] = useState<ExtractedEvidenceItem[]>([]);

  // Collapsible investigation timeline state
  const [timelineExpanded, setTimelineExpanded] = useState<boolean>(false);

  // Disclosures & Modals
  const [showEvidenceSection, setShowEvidenceSection] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);
  const [showAlternativeChecks, setShowAlternativeChecks] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [showEditProposal, setShowEditProposal] = useState(false);
  const [editedCategory, setEditedCategory] = useState("Utility");
  const [showGuidance, setShowGuidance] = useState(false);

  // Evidence library
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

  // Backend response payloads
  const [resolveData, setResolveData] = useState<ResolveResponse | null>(null);
  const [actionData, setActionData] = useState<ActionResponse | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);
  const clarificationInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize sound preference from localStorage
  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
  }, []);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setSoundEnabledState(next);
  };

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

  // Stage files selected by user
  const handleStageFiles = (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const newAttachments: StagedAttachment[] = fileList.map((f) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      file: f,
      name: f.name,
      sizeFormatted: formatBytes(f.size),
    }));

    setStagedFiles((prev) => [...prev, ...newAttachments]);

    // Live parsing status simulation
    setParsingStatus("Reading attachment…");
    setTimeout(() => {
      setParsingStatus("Extracting relevant information…");
      setTimeout(() => {
        setParsingStatus("Attachment ready.");
        setTimeout(() => {
          setParsingStatus(null);
        }, 1200);
      }, 700);
    }, 500);
  };

  const handleRemoveStagedFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRunQuery = async (text: string, templateOverride?: string) => {
    if (!text.trim() || loading || clarificationSubmitting) return;
    const targetText = text.trim();

    // Trigger audio feedback (Sound 1: Submitted tap)
    playSubmitSound();

    // Determine current user turn index
    const currentUserTurnIndex = resolveData?.messages
      ? resolveData.messages.filter((m) => m.role === "user").length
      : 0;

    // Snapshot staged attachments for this turn
    if (stagedFiles.length > 0) {
      setTurnAttachments((prev) => ({
        ...prev,
        [currentUserTurnIndex]: [...stagedFiles],
      }));
    }

    const filesToUpload = [...stagedFiles];
    setStagedFiles([]); // Clear staged files from composer

    setPendingQuery(targetText);
    if (!activeQuery) setActiveQuery(targetText);
    setLoading(true);
    setErrorMessage(null);
    setActionData(null);
    setShowAlternativeChecks(false);

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
      setFollowUp("");

      // Trigger audio feedback (Sound 2: Finding received chime)
      playFindingSound();

      // Process uploaded files into evidence cards if present
      if (filesToUpload.length > 0 && data.caseId) {
        for (const staged of filesToUpload) {
          try {
            const formData = new FormData();
            formData.set("file", staged.file);
            formData.set("caseId", data.caseId);
            const uploadRes = await fetch("/api/evidence", { method: "POST", body: formData });
            if (uploadRes.ok) {
              const uploadJson = await uploadRes.json();
              const profile = uploadJson.source?.profile || {};
              setExtractedEvidenceCards((prev) => [
                ...prev,
                {
                  id: staged.id,
                  name: staged.name,
                  type: staged.name.split(".").pop()?.toUpperCase() || "FILE",
                  summary: profile.rows
                    ? `Extracted ${profile.rows} records across ${(profile.columns as string[])?.length || 0} fields.`
                    : `Parsed document: ${staged.name} (${staged.sizeFormatted}). State evidence recorded.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
                },
              ]);
            }
          } catch {
            // Non-critical file processing continuation
          }
        }
        void loadSources(data.caseId);
      }

      const computedTitle = deriveCaseTitle(data, targetText);
      setCustomTitle(computedTitle);
      setActiveTitle(computedTitle);
      setStatusBadge(data.statusBadge || "Awaiting approval");

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
      setPendingQuery(null);
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

  const handleUploadSingle = async (file: File) => {
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

  const handleClarifySubmit = async (overrideText?: string) => {
    const textToSubmit = (overrideText || clarificationInput).trim();
    if (!textToSubmit || !sessionId || clarificationSubmitting || loading) return;

    playSubmitSound();
    setPendingQuery(textToSubmit);
    setClarificationSubmitting(true);
    setErrorMessage(null);
    setActionData(null);

    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: textToSubmit,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server error ${res.status}`);
      }

      const data: ResolveResponse = await res.json();
      setResolveData(data);
      setClarificationInput("");
      playFindingSound();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Clarification request failed.";
      setErrorMessage(msg);
    } finally {
      setPendingQuery(null);
      setClarificationSubmitting(false);
    }
  };

  // Primary Action execution: Approve simulated resubmission
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
      setResolveData((prev) => (prev ? { ...prev, stage: data.stage, events: data.events, interactionState: data.interactionState, messages: data.messages || prev.messages } : prev));
      void refreshRecentRequests();

      // Trigger audio feedback (Sound 3: Verified confirmation tone)
      if (data.isVerified) {
        playVerifiedSound();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval execution failed.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Message Status Check (Simulated delivery verification)
  const handleCheckMessageStatus = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "check_message_status",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Check failed with status ${res.status}`);
      }

      const data: ActionResponse = await res.json();
      setActionData(data);
      setStatusBadge(data.statusBadge || "Verified read");
      setResolveData((prev) => (prev ? { ...prev, stage: data.stage, events: data.events, interactionState: data.interactionState, messages: data.messages || prev.messages } : prev));
      void refreshRecentRequests();

      // Trigger audio feedback (Sound 3: Verified confirmation tone)
      if (data.isVerified) {
        playVerifiedSound();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Message status check failed.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Human Handoff confirmation
  const handleConfirmHandoff = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    setErrorMessage(null);
    setShowHandoffModal(false);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "human",
          customReason: "Operator requested human specialist review.",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Handoff request failed with status ${res.status}`);
      }

      const data: ActionResponse = await res.json();
      setActionData(data);
      setStatusBadge(data.statusBadge || "Escalated to human support");
      setResolveData((prev) => (prev ? { ...prev, stage: data.stage, events: data.events, interactionState: data.interactionState, messages: data.messages || prev.messages } : prev));
      void refreshRecentRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Human handoff request failed.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Handoff (Withdraw escalation if permitted)
  const handleCancelHandoff = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "cancel_human",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Withdrawal failed with status ${res.status}`);
      }

      const data: ActionResponse = await res.json();
      setActionData(data);
      setStatusBadge(data.statusBadge || "Awaiting approval");
      setResolveData((prev) => (prev ? { ...prev, stage: data.stage, events: data.events, interactionState: data.interactionState } : prev));
      void refreshRecentRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Withdrawal request failed.";
      setErrorMessage(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Assign Specialist (simulated queue progression)
  const handleAssignSpecialist = async () => {
    if (!sessionId) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "assign_specialist",
          specialistName: "Priya Sharma",
          specialistTier: "Tier 2 WhatsApp Operations Specialist",
        }),
      });
      if (res.ok) {
        const data: ActionResponse = await res.json();
        setActionData(data);
        setResolveData((prev) => (prev ? { ...prev, stage: data.stage, events: data.events, interactionState: data.interactionState } : prev));
      }
    } catch {
      // Ignore
    } finally {
      setActionLoading(false);
    }
  };

  // Download Verification Proof (mock client export)
  const handleDownloadVerificationProof = () => {
    const proofText = [
      `============================================================`,
      `CHEERIO RESOLVE — VERIFICATION PROOF (SIMULATED)`,
      `============================================================`,
      `Case ID: ${resolveData?.caseId || sessionId || "UNKNOWN"}`,
      `Session ID: ${sessionId || "UNKNOWN"}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Verification Status: ${actionData?.verificationStatus || resolveData?.verificationStatus || "VERIFIED"}`,
      `Statement: ${actionData?.verification?.statement || "Observed state matches expected policy rules."}`,
      `Observed Status: ${actionData?.verification?.observedStatus || "APPROVED"}`,
      `Expected Status: ${actionData?.verification?.expectedStatus || "APPROVED"}`,
      `Idempotency Guardrail: G2 / G5 ENFORCED`,
      `============================================================`,
    ].join("\n");

    const blob = new Blob([proofText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification-proof-${sessionId || "case"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
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
    setFollowUp("");
    setClarificationInput("");
    setPendingQuery(null);
    setSessionId(null);
    setResolveData(null);
    setActionData(null);
    setErrorMessage(null);
    setShowEvidenceSection(false);
    setShowHandoffModal(false);
    setShowAlternativeChecks(false);
    setIsRenaming(false);
    setCustomTitle("");
    setStagedFiles([]);
    setTurnAttachments({});
    setExtractedEvidenceCards([]);
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
  const templateIdOnly =
    resolveData?.templateSnapshot?.id ||
    (resolveData?.proposal?.targetId?.startsWith("TPL-") ? resolveData.proposal.targetId : null);
  const isBusinessCategory = Boolean(
    resolveData?.category?.includes("Business") ||
    resolveData?.category?.includes("Sales") ||
    resolveData?.category?.includes("Project") ||
    resolveData?.category?.includes("Invoicing") ||
    resolveData?.category?.includes("Operations")
  );

  const templateCategory =
    resolveData?.category ||
    (resolveData?.triage?.issueType === "template_rejection"
      ? "Template support"
      : resolveData?.templateSnapshot?.category
      ? `WhatsApp Template (${resolveData.templateSnapshot.category})`
      : "Cheerio Support Recovery");

  // Derive interaction state
  const currentInteractionState =
    actionData?.interactionState || resolveData?.interactionState || (loading ? "triaging" : "idle");

  const isMandatoryHumanZone =
    !isBusinessCategory &&
    (resolveData?.triage?.issueType === "billing_refund" ||
      resolveData?.triage?.issueType === "security_identity_access" ||
      (actionData?.attemptsFailed ?? 0) >= 2);

  const isClarificationState = !isBusinessCategory && resolveData?.stage === "CLARIFY_ONCE" && !actionData;
  const isTemplateRejectionIssue = !isBusinessCategory && resolveData?.triage?.issueType === "template_rejection";
  const isMessageDeliveryIssue = !isBusinessCategory && resolveData?.triage?.issueType === "message_delivery";
  const isVerifiedOutcome = Boolean(actionData?.isVerified || resolveData?.isVerified);
  const isHumanHandoffStage = !isBusinessCategory && (resolveData?.stage === "HANDOFF" || isMandatoryHumanZone);

  // Laya-assisted vs Deterministic rules indicator
  const isLayaAssisted = resolveData?.triage?.decisionLayer === "laya";

  // Diagnosis Summary fallback derivation
  const diagnosisSummary = useMemo(() => {
    if (isBusinessCategory) {
      return null;
    }
    if (resolveData?.diagnosisSummary) {
      return resolveData.diagnosisSummary;
    }
    // Suppress fake delivery diagnosis when in clarification or template rejection
    if (resolveData?.stage === "CLARIFY_ONCE" || resolveData?.triage?.issueType === "template_rejection") {
      return null;
    }
    if (resolveData?.triage?.issueType === "message_delivery") {
      return {
        whatWeKnow: [
          resolveData?.templateSnapshot
            ? `Template "${resolveData.templateSnapshot.name}" is marked as ${resolveData.templateSnapshot.status}.`
            : "Messages are reported as sent by the customer campaign.",
          `Issue classified under message_delivery with ${resolveData.triage.urgency.toLowerCase()} urgency.`,
        ],
        whatRemainsUncertain: [
          "Whether the delivery delay is temporary network latency or persistent recipient failure.",
          "Whether destination carrier handset delivery receipts have been confirmed.",
        ],
        impact:
          resolveData?.triage?.urgency === "critical"
            ? "High impact: Customers may not be receiving expected updates or OTPs."
            : "Customers may not be receiving expected campaign messages.",
      };
    }
    return null;
  }, [resolveData]);

  // Recommended Next Step derivation
  const recommendedNextStep = useMemo(() => {
    if (resolveData?.stage === "CLARIFY_ONCE") {
      return null;
    }
    if (resolveData?.recommendedNextStep) {
      const step = resolveData.recommendedNextStep as any;
      const primaryLabel =
        step.primaryCta?.label || step.primaryCtaLabel || step.actionLabel || "Proceed";
      const primaryAction =
        step.primaryCta?.action || step.primaryCtaAction || step.actionType || step.actionId || "proceed";
      const secondaryLabel =
        step.secondaryCta?.label || step.secondaryCtaLabel || step.secondaryLabel;
      const secondaryAction =
        step.secondaryCta?.action || step.secondaryCtaAction || step.secondaryAction;

      return {
        title: step.actionTitle || step.title || "",
        explanation: step.supportingText || step.subtitle || step.explanation || "",
        actionLabel: primaryLabel,
        actionType: primaryAction,
        secondaryLabel,
        secondaryAction,
      };
    }
    if (resolveData?.proposal) {
      return {
        title: "Approve simulated resubmission to conform with WhatsApp policies",
        explanation:
          resolveData.proposal.description ||
          "Reclassifies template and aligns parameters with provider transaction guidelines.",
        actionLabel: "Approve simulated resubmission",
        actionType: "approve",
        secondaryLabel: undefined,
        secondaryAction: undefined,
      };
    }
    if (resolveData?.stage === "HANDOFF") {
      return {
        title: "Escalate to human support specialist",
        explanation:
          "Policy guardrails require human specialist review with complete audit dossier.",
        actionLabel: "Confirm human handoff",
        actionType: "human",
        secondaryLabel: undefined,
        secondaryAction: undefined,
      };
    }
    return null;
  }, [resolveData]);

  const explanationText =
    actionData
      ? actionData.customerExplanation.whatIsWrong
      : resolveData?.customerExplanation.whatIsWrong ||
        (resolveData?.triage?.issueType === "template_rejection"
          ? "Your WhatsApp template was rejected, but I don't yet have the rejection reason needed to recommend the right fix."
          : "I've checked the available information. Let's investigate further.");

  const conversationMessages = useMemo(() => {
    if (resolveData?.messages && resolveData.messages.length > 0) {
      return resolveData.messages;
    }
    if (activeQuery) {
      return [
        { role: "user" as const, text: activeQuery, timestamp: "just now" },
        { role: "assistant" as const, text: explanationText, timestamp: "just now" },
      ];
    }
    return [];
  }, [resolveData?.messages, activeQuery, explanationText]);

  const latestAssistantIndex = useMemo(() => {
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      if (conversationMessages[i].role === "assistant") return i;
    }
    return -1;
  }, [conversationMessages]);

  const formatMessageTime = (iso?: string) => {
    if (!iso || iso === "just now") return "just now";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "just now";
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "just now";
    }
  };

  useEffect(() => {
    if (conversationMessages.length > 0 || pendingQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages.length, pendingQuery]);

  // Brief assistant acknowledgement text (Section 2 Step 2)
  const getAssistantAcknowledgement = (index: number) => {
    if (isBusinessCategory) {
      return "I've analyzed your business request and structured the findings below:";
    }
    if (index === 1 && conversationMessages.length <= 2) {
      return isClarificationState
        ? "I'll look into this. Let me check the available evidence first."
        : "I'll look into this and evaluate platform guidelines against current state.";
    }
    if (isVerifiedOutcome) {
      return "Action confirmed. Here is the verified fresh state read:";
    }
    return "I've reviewed the issue you shared and examined the case records:";
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-[1040px] flex-col px-4 sm:px-6 lg:px-8 py-6">
      <AnimatePresence mode="wait">
        {!activeQuery ? (
          /* ========================================================= */
          /* 1. WELCOME SCREEN                                         */
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
              <h1 className="text-3xl font-semibold tracking-tight text-[#20242B] sm:text-4xl">
                How can I help you today, {displayName}?
              </h1>
              <p className="mt-2 text-sm text-[#68717D] max-w-xl leading-relaxed">
                Configured for {displayRole} at {displayBusiness}. Totoro diagnoses WhatsApp rejections, enforces safety guardrails, and guides simulated recovery.
              </p>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <span className="font-semibold">Notice:</span> {errorMessage}
              </div>
            )}

            {/* Main Prompt Card */}
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
              {/* Target context selector */}
              <div className="mb-4 border-b border-[#E5E7EB] pb-3.5">
                <TargetTemplateSelector
                  value={selectedTemplateId}
                  onChange={(newId) => setSelectedTemplateId(newId)}
                  disabled={loading}
                />
              </div>

              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Describe the issue you are experiencing or paste a template error..."
                rows={3}
                className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-[#20242B] outline-none placeholder:text-[#68717D]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleRunQuery(query);
                  }
                }}
              />

              <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-3">
                <span className="text-xs text-[#68717D]">Press Enter to analyze</span>
                <button
                  type="button"
                  onClick={() => handleRunQuery(query)}
                  disabled={!query.trim() || loading}
                  className="rounded-xl bg-[#356AE6] px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-[#2755C2] disabled:bg-zinc-100 disabled:text-zinc-400 transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Analyzing rules...</span>
                    </>
                  ) : (
                    <span>Analyze issue</span>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Suggested Scenarios */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-[#68717D]">
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
                    className="group rounded-xl border border-[#E5E7EB] bg-white p-4 text-left transition-all hover:border-slate-300 hover:bg-[#F8F9FB] shadow-2xs"
                  >
                    <span className="text-sm font-medium text-[#20242B] group-hover:text-[#356AE6] block">
                      {suggestion.q}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-[#68717D]">
                      {suggestion.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ========================================================= */
          /* 2. ACTIVE CONVERSATION WORKSPACE                          */
          /* ========================================================= */
          <motion.div
            key="active"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="flex w-full flex-col gap-6 pb-44 sm:pb-48"
          >
            {/* Header: Breadcrumb & Title Bar */}
            <div className="border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center gap-1.5 text-xs text-[#68717D] mb-1">
                <span>Workspace</span>
                <span>/</span>
                <span className="text-[#20242B] font-medium">{caseHeadline}</span>
              </div>

              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          className="rounded-lg border border-[#E5E7EB] px-2.5 py-1 text-lg font-semibold text-[#20242B] outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename();
                            if (e.key === "Escape") setIsRenaming(false);
                          }}
                        />
                        <button
                          onClick={handleSaveRename}
                          className="rounded-md bg-[#356AE6] px-3 py-1 text-xs font-medium text-white hover:bg-[#2755C2]"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-2xl font-semibold tracking-tight text-[#20242B]">
                          {caseHeadline}
                        </h1>
                        {templateIdOnly && (
                          <span className="inline-flex items-center rounded border border-[#E5E7EB] bg-[#F8F9FB] px-2 py-0.5 font-mono text-xs font-medium text-[#20242B]">
                            {templateIdOnly}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setIsRenaming(true);
                            setCustomTitle(caseHeadline);
                          }}
                          className="flex items-center gap-1 rounded p-1 text-xs text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                          title="Rename case"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-[#68717D]">
                    {templateCategory} · Updated just now
                  </p>
                </div>

                {/* Right Header Status & Overflow Menu */}
                <div className="flex items-center gap-3">
                  {isClarificationState || resolveData?.statusBadge === "Needs details" ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span>{resolveData?.statusBadge || "Needs details"}</span>
                    </div>
                  ) : resolveData?.stage === "HANDOFF" || isMandatoryHumanZone ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      <span>{resolveData?.statusBadge || "Human Escalation"}</span>
                    </div>
                  ) : actionData?.isVerified || resolveData?.isVerified ? (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{resolveData?.statusBadge || "Verified read"}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/70 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#356AE6]" />
                      <span>{resolveData?.statusBadge || "Active"}</span>
                    </div>
                  )}

                  <div className="relative">
                    <button
                      onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                      className="rounded-lg border border-[#E5E7EB] bg-white p-1.5 text-[#68717D] hover:bg-[#F8F9FB] hover:text-[#20242B] transition-colors"
                      aria-label="More actions"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="19" cy="12" r="1"></circle>
                        <circle cx="5" cy="12" r="1"></circle>
                      </svg>
                    </button>

                    {showMenuDropdown && (
                      <div className="absolute right-0 top-9 z-30 w-52 rounded-xl border border-[#E5E7EB] bg-white py-1 shadow-lg text-sm">
                        <button
                          onClick={() => {
                            setShowMenuDropdown(false);
                            router.push(`/workspace/reports`);
                          }}
                          className="w-full px-3 py-2 text-left text-[#20242B] hover:bg-[#F8F9FB]"
                        >
                          View Case Dossier in Reports
                        </button>
                        <button
                          onClick={() => {
                            setShowMenuDropdown(false);
                            handleReset();
                          }}
                          className="w-full px-3 py-2 text-left text-[#20242B] hover:bg-[#F8F9FB]"
                        >
                          Start New Request
                        </button>
                        <div className="my-1 h-px bg-[#E5E7EB]" />
                        <button
                          onClick={() => {
                            setShowMenuDropdown(false);
                            if (sessionId && navigator.clipboard) {
                              void navigator.clipboard.writeText(sessionId);
                              alert(`Copied Case ID: ${sessionId}`);
                            }
                          }}
                          className="w-full px-3 py-2 text-left text-[#20242B] hover:bg-[#F8F9FB]"
                        >
                          Copy Case Session ID
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <span className="font-semibold">Notice:</span> {errorMessage}
              </div>
            )}

            {/* ========================================================= */}
            {/* CONVERSATION TURNS (Exact Section 2 Structure)            */}
            {/* ========================================================= */}
            <div className="flex flex-col gap-6">
              {conversationMessages.map((msg, index) => {
                // 1. USER TURN: Clean rounded bubble + Attachment chips
                if (msg.role === "user") {
                  const userTurnIndex = conversationMessages
                    .slice(0, index + 1)
                    .filter((m) => m.role === "user").length - 1;
                  const attachments = turnAttachments[userTurnIndex] || [];

                  return (
                    <div key={index} className="flex flex-col items-end gap-2">
                      <div className="max-w-[78%] rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-4 text-[15px] leading-relaxed text-[#20242B] shadow-2xs">
                        {msg.text}
                      </div>

                      {/* User attachment chips */}
                      {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end max-w-[78%]">
                          {attachments.map((att) => (
                            <div
                              key={att.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1 text-xs text-[#20242B] shadow-2xs"
                            >
                              <FileText className="h-3.5 w-3.5 text-[#356AE6] shrink-0" />
                              <span className="font-medium truncate max-w-[160px]">{att.name}</span>
                              <span className="text-[#68717D] text-[11px] font-mono">({att.sizeFormatted})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                // 2. ASSISTANT TURN
                const isLatestAssistant = index === latestAssistantIndex;
                const acknowledgement = getAssistantAcknowledgement(index);

                return (
                  <div key={index} className="flex flex-col gap-3">
                    {/* Assistant Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#20242B] text-[11px] font-semibold text-white shadow-2xs">
                          T
                        </div>
                        <span className="text-xs font-semibold text-[#20242B]">Totoro</span>
                        <span className="text-zinc-400 text-xs">·</span>
                        <span className="text-xs text-[#68717D]">{formatMessageTime(msg.timestamp)}</span>
                      </div>

                      {/* Step 4: Model-assisted analysis badge (only when applicable) */}
                      {isLatestAssistant && (
                        <div>
                          {isLayaAssisted ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50/80 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                              <Sparkles className="h-3 w-3 text-[#356AE6]" />
                              Laya-assisted analysis
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 py-0.5 text-[11px] font-medium text-[#68717D]">
                              <ShieldCheck className="h-3 w-3 text-zinc-500" />
                              Deterministic analysis
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Step 2: Short assistant acknowledgement */}
                    <p className="text-sm text-[#68717D] italic">
                      {acknowledgement}
                    </p>

                    {/* Step 3: Compact investigation timeline (shown on latest assistant turn) */}
                    {isLatestAssistant && !isClarificationState && !isBusinessCategory && (
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FB] p-3 text-xs space-y-2">
                        <button
                          type="button"
                          onClick={() => setTimelineExpanded(!timelineExpanded)}
                          className="w-full flex items-center justify-between font-medium text-[#20242B] hover:text-[#356AE6] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Investigation complete (5 diagnostic stages evaluated)</span>
                          </div>
                          <span className="flex items-center gap-1 text-[11px] text-[#68717D]">
                            {timelineExpanded ? "Hide details" : "Show stages"}
                            {timelineExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </span>
                        </button>

                        {timelineExpanded && (
                          <div className="pt-2 border-t border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-5 gap-2 text-[11px]">
                            <div className="flex items-center gap-1.5 text-zinc-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>1. Understanding issue</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>2. Gathering evidence</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>3. Checking mock state</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>4. Comparing causes</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>5. Preparing recommendation</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step 5: Main diagnosis / finding in plain English */}
                    <div className="text-[15px] leading-7 text-[#20242B] space-y-2">
                      <p>{msg.text}</p>
                      {isLatestAssistant && resolveData?.customerExplanation.evidenceExplanation && (
                        <p className="text-sm text-[#68717D]">
                          {resolveData.customerExplanation.evidenceExplanation}
                        </p>
                      )}
                    </div>

                    {/* Extracted evidence card (Section 3) if attachments parsed */}
                    {isLatestAssistant && extractedEvidenceCards.length > 0 && (
                      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-2xs space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-[#20242B]">
                          <FileCheck className="h-4 w-4 text-[#356AE6]" />
                          <span>Evidence extracted from attachments</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-[#68717D]">
                          {extractedEvidenceCards.map((card) => (
                            <div key={card.id} className="rounded-lg bg-[#F8F9FB] p-2.5 border border-[#E5E7EB]">
                              <div className="flex items-center justify-between font-medium text-[#20242B] mb-0.5">
                                <span className="truncate max-w-[240px]">{card.name}</span>
                                <span className="font-mono text-[10px] text-zinc-400">{card.timestamp}</span>
                              </div>
                              <p className="text-[11px] leading-relaxed">{card.summary}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pending Turn: User bubble + Subtle 3-dot pulse typing indicator */}
              {(loading || clarificationSubmitting) && (
                <>
                  {pendingQuery && (
                    <div className="flex justify-end">
                      <div className="max-w-[78%] rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6] p-4 text-[15px] leading-relaxed text-[#20242B] shadow-2xs">
                        {pendingQuery}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#20242B] text-[11px] font-semibold text-white shadow-2xs">
                        T
                      </div>
                      <span className="text-xs font-semibold text-[#20242B]">Totoro</span>
                      <span className="text-zinc-400 text-xs">·</span>
                      <span className="text-xs text-[#68717D]">thinking...</span>
                    </div>

                    {/* Subtle 3-dot pulse indicator & active investigation */}
                    <div className="flex items-center gap-3 rounded-xl bg-[#F8F9FB] p-4 text-sm text-[#68717D] border border-[#E5E7EB]">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="h-2 w-2 rounded-full bg-[#356AE6] animate-pulse" />
                        <span className="h-2 w-2 rounded-full bg-[#356AE6] animate-pulse delay-150" />
                        <span className="h-2 w-2 rounded-full bg-[#356AE6] animate-pulse delay-300" />
                      </div>
                      <span className="text-xs sm:text-sm">
                        {conversationMessages.length > 0
                          ? "Analyzing follow-up and evaluating deterministic rules against mock state..."
                          : "Understanding the issue and evaluating deterministic rules against mock state..."}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div ref={messagesEndRef} />

              {/* ========================================================= */}
              {/* 3. DIAGNOSIS SUMMARY (Section 2 Step 6)                   */}
              {/* Compact structured panel: What we know, Uncertain, Impact */}
              {/* ========================================================= */}
              {diagnosisSummary && !isClarificationState && (
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-[#20242B] mb-3">
                    Diagnosis summary
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB] gap-4 md:gap-0">
                    {/* Column 1: What we know */}
                    <div className="md:pr-5">
                      <span className="block text-xs font-semibold text-[#68717D] uppercase tracking-wider mb-2">
                        What we know
                      </span>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-[#20242B] leading-normal">
                        {diagnosisSummary.whatWeKnow.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#356AE6] font-bold shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Column 2: What remains uncertain */}
                    <div className="pt-3 md:pt-0 md:px-5">
                      <span className="block text-xs font-semibold text-[#68717D] uppercase tracking-wider mb-2">
                        What remains uncertain
                      </span>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-[#20242B] leading-normal">
                        {diagnosisSummary.whatRemainsUncertain.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-500 font-bold shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Column 3: Impact */}
                    <div className="pt-3 md:pt-0 md:pl-5">
                      <span className="block text-xs font-semibold text-[#68717D] uppercase tracking-wider mb-2">
                        Impact
                      </span>
                      <p className="text-xs sm:text-sm text-[#20242B] leading-normal">
                        {Array.isArray(diagnosisSummary.impact)
                          ? diagnosisSummary.impact.join("; ")
                          : diagnosisSummary.impact}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 4. RECOMMENDED NEXT STEP (Section 2 Step 7)               */}
              {/* Prominent recommendation + Before/After Proposal Diff     */}
              {/* ========================================================= */}
              {recommendedNextStep && !isClarificationState && (
                <div className="rounded-2xl border border-blue-200 bg-[#EFF5FF]/40 p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#356AE6]" />
                    <h3 className="text-sm font-semibold text-[#20242B]">
                      Recommended next step
                    </h3>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#20242B]">
                      {recommendedNextStep.title}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-[#68717D] leading-relaxed">
                      {recommendedNextStep.explanation}
                    </p>
                  </div>

                  {/* Inline Before/After Proposal Diff (G1 Guardrail) if available */}
                  {resolveData?.proposal && !actionData && (
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 space-y-2">
                      <span className="text-xs font-semibold text-[#20242B] block">Proposed adjustment:</span>
                      {resolveData.proposal.changes && resolveData.proposal.changes.length > 0 ? (
                        resolveData.proposal.changes.map((c) => (
                          <div key={c.field} className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                            <span className="font-mono font-medium text-[#20242B]">{c.field}</span>
                            <span className="text-zinc-300">|</span>
                            <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-xs text-red-700 line-through">
                              {c.before}
                            </span>
                            <span className="text-zinc-400">→</span>
                            <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-medium text-emerald-800">
                              {c.after}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                          <span className="font-mono font-medium text-[#20242B]">Category</span>
                          <span className="text-zinc-300">|</span>
                          <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-xs text-red-700 line-through">
                            Marketing
                          </span>
                          <span className="text-zinc-400">→</span>
                          <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-medium text-emerald-800">
                            {editedCategory}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit Proposal inline drawer if requested */}
                  {showEditProposal && (
                    <div className="rounded-xl border border-[#E5E7EB] bg-white p-3.5 space-y-2 text-xs sm:text-sm">
                      <span className="font-medium text-[#20242B] block">Edit Proposed Action:</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#68717D] text-xs">Target Category:</span>
                        <select
                          value={editedCategory}
                          onChange={(e) => setEditedCategory(e.target.value)}
                          className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-1 text-xs text-[#20242B]"
                        >
                          <option value="Utility">Utility</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Authentication">Authentication</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowEditProposal(false)}
                          className="rounded-lg bg-[#20242B] px-3 py-1 text-white text-xs font-medium hover:bg-zinc-800"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Primary & Secondary Buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {resolveData?.proposal && !actionData ? (
                      <button
                        type="button"
                        onClick={handleApproveAction}
                        disabled={actionLoading}
                        className="h-10 rounded-xl bg-[#356AE6] px-4 text-sm font-medium text-white shadow-xs hover:bg-[#2755C2] disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {actionLoading ? "Executing simulated write..." : "Approve simulated resubmission"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const action = recommendedNextStep.actionType;
                          if (action === "check_message_status") {
                            handleCheckMessageStatus();
                          } else if (action === "human" || action === "request_specialist") {
                            setShowHandoffModal(true);
                          } else if (action === "clarify") {
                            composerInputRef.current?.focus();
                          } else if (action === "approve" || action === "approve_resubmission") {
                            handleApproveAction();
                          }
                        }}
                        disabled={actionLoading}
                        className="h-10 rounded-xl bg-[#356AE6] px-4 text-sm font-medium text-white shadow-xs hover:bg-[#2755C2] disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {actionLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin text-white" />
                            <span>Executing action...</span>
                          </>
                        ) : (
                          <span>{recommendedNextStep.actionLabel || "Take recommended action"}</span>
                        )}
                      </button>
                    )}

                    {recommendedNextStep.secondaryLabel && (
                      <button
                        type="button"
                        onClick={() => {
                          const secAction = recommendedNextStep.secondaryAction;
                          if (secAction === "human" || secAction === "request_specialist") {
                            setShowHandoffModal(true);
                          } else if (secAction === "edit_proposal") {
                            setShowEditProposal((prev) => !prev);
                          } else if (secAction === "view_supporting_evidence") {
                            setShowEvidenceSection((prev) => !prev);
                          }
                        }}
                        disabled={actionLoading}
                        className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#20242B] hover:bg-[#F8F9FB] transition-colors"
                      >
                        {recommendedNextStep.secondaryLabel}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowEvidenceSection((prev) => !prev)}
                      className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#68717D] hover:bg-[#F8F9FB] hover:text-[#20242B] transition-colors"
                    >
                      {showEvidenceSection ? "Hide supporting evidence" : "View supporting evidence"}
                    </button>

                    {resolveData?.proposal && !actionData && (
                      <button
                        type="button"
                        onClick={() => setShowEditProposal(!showEditProposal)}
                        disabled={actionLoading}
                        className="h-10 rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-sm font-medium text-[#68717D] hover:bg-[#F8F9FB] hover:text-[#20242B] transition-colors"
                      >
                        Edit proposal
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-[#68717D]">
                    * All actions are simulated against mock fixtures. No real Meta/Cheerio API calls are made.
                  </p>
                </div>
              )}

              {/* ========================================================= */}
              {/* 5. CONTEXT-SPECIFIC CLARIFICATION (Section 6)             */}
              {/* "Could you clarify?" panel with 3 prompt chips            */}
              {/* ========================================================= */}
              {isClarificationState && isTemplateRejectionIssue && (
                <div className="rounded-2xl border border-amber-200/90 bg-[#FEFBF6] p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      ?
                    </div>
                    <h3 className="text-sm font-semibold text-[#20242B]">
                      Could you clarify?
                    </h3>
                  </div>

                  <p className="text-sm text-zinc-700 leading-relaxed">
                    Your WhatsApp template was rejected, but the exact rejection reason has not been verified yet. Providing the rejection notice or template ID will help find the right fix without guessing.
                  </p>

                  {/* 3 Clickable Common Rejection Reason Chips */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-[#68717D]">
                      Select a common rejection category:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleClarifySubmit("Category mismatch: template content was flagged as marketing instead of utility.")}
                        className="rounded-lg border border-amber-300/80 bg-white px-3 py-1.5 text-xs font-medium text-[#20242B] hover:border-blue-400 hover:bg-[#EFF5FF] transition-all shadow-2xs"
                      >
                        Category mismatch (Utility vs Marketing)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClarifySubmit("Invalid variable format: parameter brackets or placeholders do not match format.")}
                        className="rounded-lg border border-amber-300/80 bg-white px-3 py-1.5 text-xs font-medium text-[#20242B] hover:border-blue-400 hover:bg-[#EFF5FF] transition-all shadow-2xs"
                      >
                        Invalid variables (e.g. &#123;&#123;1&#125;&#125; format)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleClarifySubmit("Promotional content in transactional template.")}
                        className="rounded-lg border border-amber-300/80 bg-white px-3 py-1.5 text-xs font-medium text-[#20242B] hover:border-blue-400 hover:bg-[#EFF5FF] transition-all shadow-2xs"
                      >
                        Promotional content in transactional template
                      </button>
                    </div>
                  </div>

                  {/* Inline rejection reason / template ID input */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                    <input
                      ref={clarificationInputRef}
                      type="text"
                      value={clarificationInput}
                      onChange={(e) => setClarificationInput(e.target.value)}
                      placeholder="Paste rejection notice or template ID (e.g. TPL-1001)..."
                      className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2.5 text-sm text-[#20242B] placeholder:text-[#68717D] outline-none focus:border-[#356AE6] focus:ring-1 focus:ring-[#356AE6]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleClarifySubmit();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleClarifySubmit()}
                      disabled={!clarificationInput.trim() || clarificationSubmitting}
                      className="rounded-xl bg-[#20242B] px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40 shadow-xs transition-colors shrink-0"
                    >
                      {clarificationSubmitting ? "Submitting..." : "Submit details"}
                    </button>
                  </div>

                  {/* Guidance Drawer */}
                  {showGuidance && (
                    <div className="rounded-xl border border-amber-200/70 bg-white p-4 text-xs text-zinc-700 space-y-2 mt-2">
                      <span className="font-semibold text-[#20242B] block text-xs">
                        Where to find the rejection reason in WhatsApp Manager:
                      </span>
                      <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-[#68717D]">
                        <li>Log in to Meta Business Suite / WhatsApp Manager for your business account.</li>
                        <li>In the left sidebar, click <strong>Account Tools</strong> &gt; <strong>Message Templates</strong>.</li>
                        <li>Locate the template with status <strong>Rejected</strong> and click on it.</li>
                        <li>Check the banner at the top of the template edit screen to view the rejection reason details.</li>
                        <li>Copy the reason text or notice and paste it into the field above.</li>
                      </ol>
                    </div>
                  )}

                  <div className="pt-2 border-t border-amber-100/80 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setShowGuidance(!showGuidance)}
                      className="font-medium text-[#356AE6] hover:underline"
                    >
                      {showGuidance ? "Hide instructions" : "Where to find rejection reason?"}
                    </button>
                    <span className="text-[11px] text-[#68717D]">
                      * Evaluates deterministic rules against mock fixtures.
                    </span>
                  </div>
                </div>
              )}

              {/* Multi-turn Clarification for generic issues (G9) */}
              {isClarificationState && !isTemplateRejectionIssue && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
                  <span className="text-xs font-semibold text-amber-900 block">
                    Clarification required
                  </span>
                  <p className="text-sm font-medium text-[#20242B]">
                    {resolveData?.clarificationQuestion || "Please provide the missing detail to continue diagnosis:"}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clarificationInput}
                      onChange={(e) => setClarificationInput(e.target.value)}
                      placeholder="Type your answer here..."
                      className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm text-[#20242B] outline-none focus:border-[#356AE6]"
                      disabled={clarificationSubmitting || loading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleClarifySubmit();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleClarifySubmit()}
                      disabled={!clarificationInput.trim() || clarificationSubmitting || loading}
                      className="rounded-xl bg-[#20242B] px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                    >
                      {clarificationSubmitting ? "Submitting..." : "Submit Answer"}
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 6. VERIFIED RESOLUTION PANEL (Section 6)                  */}
              {/* Green-tinted verification panel with checkmark            */}
              {/* ========================================================= */}
              {actionData && (
                <div
                  className={`rounded-2xl border p-5 shadow-xs space-y-3 ${
                    actionData.isVerified
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-red-200 bg-red-50/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`h-5 w-5 ${
                        actionData.isVerified ? "text-emerald-600" : "text-red-600"
                      }`}
                    />
                    <span className="text-sm font-semibold text-[#20242B]">
                      {actionData.verificationStatus || "Verification Result"}
                    </span>
                  </div>

                  {actionData.actionResult && (
                    <p className="rounded-xl border border-[#E5E7EB] bg-white p-3 font-mono text-xs text-[#20242B]">
                      {actionData.actionResult}
                    </p>
                  )}

                  {actionData.verification?.statement && (
                    <p className="text-sm font-medium text-[#20242B]">
                      {actionData.verification.statement}
                    </p>
                  )}

                  {actionData.blocked && (
                    <div className="text-sm font-medium text-red-700">
                      Blocked: {actionData.blocked}
                    </div>
                  )}
                </div>
              )}

              {/* Specialist / Escalation State Banner */}
              {!isBusinessCategory &&
                (currentInteractionState === "pending_assignment" ||
                currentInteractionState === "assigned" ||
                currentInteractionState === "in_progress" ||
                actionData?.specialistAssignment) && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-[#356AE6]" />
                      <span className="text-sm font-semibold text-[#20242B]">
                        {currentInteractionState === "assigned" || currentInteractionState === "in_progress"
                          ? "Assigned to Specialist"
                          : "Pending Specialist Assignment"}
                      </span>
                    </div>
                    <span className="text-xs text-blue-700 font-mono">
                      Queue: #1
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
                    {actionData?.specialistAssignment?.specialistName
                      ? `Assigned to ${actionData.specialistAssignment.specialistName} (${actionData.specialistAssignment.queue}). Active review in progress.`
                      : "Your complete case file and diagnostic audit trace have been recorded. No live external contact has been made (simulated workflow)."}
                  </p>

                  <div className="flex items-center gap-3 pt-1">
                    {!actionData?.specialistAssignment?.specialistName && (
                      <button
                        type="button"
                        onClick={handleAssignSpecialist}
                        disabled={actionLoading}
                        className="rounded-lg bg-[#20242B] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800"
                      >
                        Simulate assignment (Priya Sharma)
                      </button>
                    )}

                    {!isMandatoryHumanZone && (
                      <button
                        type="button"
                        onClick={handleCancelHandoff}
                        disabled={actionLoading}
                        className="rounded-lg border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#20242B] hover:bg-[#F8F9FB]"
                      >
                        Withdraw handoff request
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* 7. CONTEXTUAL ACTION CARDS (Section 2 Step 8)             */}
              {/* Up to 3 clear, clickable cards with outline icons and →   */}
              {/* ========================================================= */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {isClarificationState && isTemplateRejectionIssue ? (
                  <>
                    {/* Card 1: Share rejection reason */}
                    <button
                      type="button"
                      onClick={() => clarificationInputRef.current?.focus()}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Share rejection reason
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Help identify the exact fix
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* Card 2: Explain where to find it */}
                    <button
                      type="button"
                      onClick={() => setShowGuidance((prev) => !prev)}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <HelpCircle className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Explain where to find it
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Step-by-step guidance
                          </span>
                        </div>
                      </div>
                      <ArrowRight className={`h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform ${showGuidance ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
                    </button>

                    {/* Card 3: Request specialist */}
                    <button
                      type="button"
                      onClick={() => setShowHandoffModal(true)}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserCheck className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Request a specialist
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Escalate with case dossier
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </>
                ) : isVerifiedOutcome ? (
                  <>
                    {/* Verified Card 1: Download verification proof */}
                    <button
                      type="button"
                      onClick={handleDownloadVerificationProof}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-emerald-300 bg-emerald-50/50 px-4 py-3 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-emerald-800 transition-colors">
                            Download verification proof
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Fresh-read state audit record
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* Verified Card 2: Start new request */}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RefreshCw className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Start new request
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Investigate another template
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* Verified Card 3: View case dossier */}
                    <button
                      type="button"
                      onClick={() => router.push(`/workspace/reports`)}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ExternalLink className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            View case dossier
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Open full compliance report
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </>
                ) : isHumanHandoffStage ? (
                  <>
                    {/* Handoff Card 1: View case dossier in reports */}
                    <button
                      type="button"
                      onClick={() => router.push(`/workspace/reports`)}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/50 px-4 py-3 text-left transition-all hover:border-rose-300 hover:bg-rose-50 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-rose-700 shrink-0" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-rose-900 transition-colors">
                            View case dossier in reports
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Review escalations audit file
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-rose-600 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* Handoff Card 2: Update case notes */}
                    <button
                      type="button"
                      onClick={() => composerInputRef.current?.focus()}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileCheck className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Update case notes
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Append evidence or instructions
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* Handoff Card 3: Return to workspace */}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RefreshCw className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Return to workspace
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Start a new investigation
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </>
                ) : isMessageDeliveryIssue ? (
                  <>
                    {/* If check_message_status is completed, do NOT re-recommend checking message status */}
                    {resolveData?.completedChecks?.includes("check_message_status") ? (
                      <>
                        {/* Delivery Card 1 (Check Completed): View telemetry details */}
                        <button
                          type="button"
                          onClick={() => setShowEvidenceSection((prev) => !prev)}
                          className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#356AE6] bg-[#EFF5FF] px-4 py-3 text-left transition-all hover:bg-blue-100/60 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-4 w-4 text-[#356AE6] shrink-0" />
                            <div className="truncate">
                              <span className="block text-xs font-semibold text-[#356AE6]">
                                View telemetry details
                              </span>
                              <span className="block text-[11px] text-[#68717D] truncate">
                                Inspect gateway logs & queue receipts
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Delivery Card 2: Request specialist */}
                        <button
                          type="button"
                          onClick={() => setShowHandoffModal(true)}
                          className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserCheck className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                            <div className="truncate">
                              <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                                Request a specialist
                              </span>
                              <span className="block text-[11px] text-[#68717D] truncate">
                                Escalate pending deliveries
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Delivery Card 3: Run alternative check */}
                        <button
                          type="button"
                          onClick={() => setShowAlternativeChecks(!showAlternativeChecks)}
                          className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Search className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                            <div className="truncate">
                              <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                                Run a different check
                              </span>
                              <span className="block text-[11px] text-[#68717D] truncate">
                                Explore recipient phone & webhook tests
                              </span>
                            </div>
                          </div>
                          <ArrowRight className={`h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform ${showAlternativeChecks ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Delivery Card 1: Check message status */}
                        <button
                          type="button"
                          onClick={handleCheckMessageStatus}
                          disabled={actionLoading}
                          className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#356AE6] bg-[#EFF5FF] px-4 py-3 text-left transition-all hover:bg-blue-100/60 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Search className="h-4 w-4 text-[#356AE6] shrink-0" />
                            <div className="truncate">
                              <span className="block text-xs font-semibold text-[#356AE6]">
                                Check message status
                              </span>
                              <span className="block text-[11px] text-[#68717D] truncate">
                                Query simulated carrier gateway
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Delivery Card 2: View telemetry details */}
                        <button
                          type="button"
                          onClick={() => setShowEvidenceSection((prev) => !prev)}
                          className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                            <div className="truncate">
                              <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                                View telemetry details
                              </span>
                              <span className="block text-[11px] text-[#68717D] truncate">
                                Inspect delivery logs and receipts
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                        </button>

                        {/* Delivery Card 3: Request specialist */}
                        <button
                          type="button"
                          onClick={() => setShowHandoffModal(true)}
                          className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <UserCheck className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                            <div className="truncate">
                              <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                                Request a specialist
                              </span>
                              <span className="block text-[11px] text-[#68717D] truncate">
                                Escalate persistent delivery gaps
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {/* General Card 1: Ask follow-up */}
                    <button
                      type="button"
                      onClick={() => composerInputRef.current?.focus()}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Ask a follow-up
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Provide more details or context
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* General Card 2: Request specialist */}
                    <button
                      type="button"
                      onClick={() => setShowHandoffModal(true)}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserCheck className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Request a specialist
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Escalate to human support
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>

                    {/* General Card 3: Run alternative check */}
                    <button
                      type="button"
                      onClick={() => setShowAlternativeChecks(!showAlternativeChecks)}
                      className="group flex min-h-[58px] items-center justify-between rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-left transition-all hover:border-[#356AE6]/40 hover:bg-[#F8F9FB] shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Search className="h-4 w-4 text-[#68717D] shrink-0 group-hover:text-[#356AE6] transition-colors" />
                        <div className="truncate">
                          <span className="block text-xs font-semibold text-[#20242B] group-hover:text-[#356AE6] transition-colors">
                            Run a different check
                          </span>
                          <span className="block text-[11px] text-[#68717D] truncate">
                            Explore diagnostic telemetry
                          </span>
                        </div>
                      </div>
                      <ArrowRight className={`h-4 w-4 text-zinc-400 group-hover:text-[#356AE6] shrink-0 ml-1 transition-transform ${showAlternativeChecks ? "rotate-90" : "group-hover:translate-x-0.5"}`} />
                    </button>
                  </>
                )}
              </div>

              {/* Alternative Diagnostic Checks Drawer */}
              {showAlternativeChecks && (
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm space-y-2.5">
                  <span className="text-xs font-semibold text-[#68717D] uppercase tracking-wider block">
                    Supported Diagnostic Checks
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleCheckMessageStatus()}
                      className="rounded-xl border border-[#E5E7EB] p-3 text-left hover:border-[#356AE6] hover:bg-[#EFF5FF] transition-colors"
                    >
                      <span className="font-medium text-[#20242B] block">Query Carrier Telemetry</span>
                      <span className="text-[#68717D]">Check outbound carrier dispatch & receipt timestamps.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunQuery("Inspect template bracket and parameter syntax")}
                      className="rounded-xl border border-[#E5E7EB] p-3 text-left hover:border-[#356AE6] hover:bg-[#EFF5FF] transition-colors"
                    >
                      <span className="font-medium text-[#20242B] block">Verify Parameter Syntax</span>
                      <span className="text-[#68717D]">Inspect double bracket formatting and parameter ordering.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunQuery("Audit webhook endpoint delivery logs")}
                      className="rounded-xl border border-[#E5E7EB] p-3 text-left hover:border-[#356AE6] hover:bg-[#EFF5FF] transition-colors"
                    >
                      <span className="font-medium text-[#20242B] block">Audit Webhook Delivery</span>
                      <span className="text-[#68717D]">Test simulated callback server responses.</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunQuery("Verify recipient phone number E.164 compliance")}
                      className="rounded-xl border border-[#E5E7EB] p-3 text-left hover:border-[#356AE6] hover:bg-[#EFF5FF] transition-colors"
                    >
                      <span className="font-medium text-[#20242B] block">Verify E.164 Formatting</span>
                      <span className="text-[#68717D]">Validate international country code and length rules.</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded Supporting Evidence & Technical Details Disclosure */}
              {showEvidenceSection && (
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#68717D]">
                      Supporting State Evidence & Audit Trail
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowEvidenceSection(false)}
                      className="text-xs text-[#68717D] hover:text-[#20242B]"
                    >
                      Close
                    </button>
                  </div>

                  <div className="rounded-xl bg-[#F8F9FB] p-4 text-xs sm:text-sm text-[#20242B] leading-relaxed border border-[#E5E7EB] font-sans">
                    <span className="font-semibold text-[#20242B] block mb-1">State Evidence:</span>
                    {resolveData?.evidence || "Inspected mock template state and policy constraints."}
                  </div>

                  {resolveData?.templateSnapshot && (
                    <div className="rounded-xl bg-[#F8F9FB] p-3.5 border border-[#E5E7EB] text-xs space-y-1">
                      <span className="font-semibold text-[#20242B] block mb-1">
                        Template Content ({resolveData.templateSnapshot.id}):
                      </span>
                      <p className="font-mono text-zinc-800 bg-white p-2.5 rounded-lg border border-[#E5E7EB]">
                        {resolveData.templateSnapshot.text}
                      </p>
                    </div>
                  )}

                  {/* Linked Evidence files */}
                  {sourcesLibrary.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-xs font-semibold text-[#68717D]">
                        Linked Evidence Files ({sourcesLibrary.length})
                      </span>
                      {sourcesLibrary.map((s) => (
                        <div key={s.id} className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F8F9FB] px-3.5 py-2 text-xs">
                          <span className="font-medium text-[#20242B]">{s.originalName}</span>
                          <button
                            onClick={() => setExpandedSource(expandedSource === s.id ? null : s.id)}
                            className="text-[#356AE6] hover:underline"
                          >
                            {expandedSource === s.id ? "Close preview" : "Preview text"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Embedded Technical Details Inspector */}
                  <TechnicalDetailsInspector
                    resolveData={resolveData}
                    actionData={actionData}
                  />
                </div>
              )}
            </div>

            {/* ========================================================= */}
            {/* 8. ANCHORED BOTTOM COMPOSER (Section 2 Step 9)            */}
            {/* Sticky bottom, safe padding, attachments, sound toggle   */}
            {/* ========================================================= */}
            <div className="fixed bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-white via-white/95 to-transparent pt-4 pb-4">
              <div className="mx-auto w-full max-w-[1040px] px-4 sm:px-6 lg:px-8">
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-2.5 shadow-md flex flex-col gap-2">
                  {/* Staged file chips & live parsing status */}
                  {(stagedFiles.length > 0 || parsingStatus) && (
                    <div className="flex flex-wrap items-center gap-2 px-1 pt-0.5 pb-1 border-b border-[#E5E7EB]">
                      {stagedFiles.map((f) => (
                        <div
                          key={f.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] px-2.5 py-1 text-xs text-[#20242B]"
                        >
                          <FileText className="h-3.5 w-3.5 text-[#356AE6] shrink-0" />
                          <span className="font-medium truncate max-w-[180px]">{f.name}</span>
                          <span className="text-[#68717D] text-[10px]">({f.sizeFormatted})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStagedFile(f.id)}
                            className="text-zinc-400 hover:text-zinc-700 transition-colors ml-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {parsingStatus && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#356AE6] font-medium animate-pulse ml-1">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          {parsingStatus}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Composer Input Row */}
                  <div className="flex items-center gap-2">
                    {/* Paperclip attachment button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || loading}
                      className="cursor-pointer rounded-xl p-2 text-[#68717D] hover:bg-[#F8F9FB] hover:text-[#20242B] transition-colors"
                      title="Attach evidence source"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".csv,.xlsx,.txt,.md,.markdown,.docx,.pdf,.png,.jpg,.jpeg"
                      disabled={uploading}
                      onChange={(e) => {
                        if (e.target.files) handleStageFiles(e.target.files);
                        e.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />

                    {/* Sound toggle button (Section 4) */}
                    <button
                      type="button"
                      onClick={handleToggleSound}
                      className="rounded-xl p-2 text-[#68717D] hover:bg-[#F8F9FB] hover:text-[#20242B] transition-colors"
                      title={soundEnabled ? "Mute interaction sounds" : "Enable interaction sounds"}
                    >
                      {soundEnabled ? (
                        <Volume2 className="h-4 w-4 text-[#356AE6]" />
                      ) : (
                        <VolumeX className="h-4 w-4 text-zinc-400" />
                      )}
                    </button>

                    {/* Text input / composer */}
                    <input
                      ref={composerInputRef}
                      type="text"
                      value={followUp}
                      onChange={(e) => setFollowUp(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (followUp.trim() && !loading && !clarificationSubmitting) {
                            void handleRunQuery(followUp);
                          }
                        }
                      }}
                      disabled={loading || clarificationSubmitting}
                      placeholder={
                        loading || clarificationSubmitting
                          ? "Totoro is analyzing..."
                          : isClarificationState
                          ? "Tell me what happened…"
                          : "Ask a follow-up or add context…"
                      }
                      className="flex-1 bg-transparent px-2 text-sm text-[#20242B] placeholder:text-[#68717D] focus:outline-none disabled:opacity-50"
                    />

                    <span className="hidden sm:inline-block text-[11px] text-[#68717D] mr-1 select-none">
                      Press Enter to send
                    </span>

                    {/* Upward arrow send button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (followUp.trim() && !loading && !clarificationSubmitting) {
                          void handleRunQuery(followUp);
                        }
                      }}
                      disabled={loading || clarificationSubmitting || !followUp.trim()}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#356AE6] text-white shadow-xs hover:bg-[#2755C2] disabled:opacity-30 transition-all shrink-0"
                      aria-label="Send message"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Human Escalation Modal */}
            {showHandoffModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-2xs">
                <div className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-[#356AE6]" />
                      <h3 className="text-base font-semibold text-[#20242B]">
                        Request Specialist Escalation
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowHandoffModal(false)}
                      className="text-zinc-400 hover:text-zinc-700 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-3 text-sm text-[#68717D] leading-relaxed">
                    <p>
                      {isMandatoryHumanZone ? (
                        <span className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-800 block mb-2">
                          Mandatory Human-Led Zone (Guardrails G8–G12): This case requires certified specialist intervention.
                        </span>
                      ) : (
                        <span>
                          You are requesting to escalate this case to human support. A complete case file will be assembled and queued.
                        </span>
                      )}
                    </p>

                    <div className="rounded-xl bg-[#F8F9FB] p-3.5 text-xs space-y-1.5 border border-[#E5E7EB]">
                      <span className="font-semibold text-[#20242B] block">Case File dossier to be attached:</span>
                      <ul className="list-disc pl-4 space-y-1 text-[#68717D]">
                        <li>Original inquiry: &quot;{activeQuery}&quot;</li>
                        <li>Assessed issue: {resolveData?.triage?.issueType || "Delivery Diagnostic"}</li>
                        <li>Evidence and rule trace references</li>
                        <li>Audit log events ({resolveData?.events?.length || 0} events)</li>
                      </ul>
                    </div>

                    <p className="text-xs text-[#68717D]">
                      * Simulated workflow. Escalation is recorded in session history without making live external API calls.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                    <button
                      type="button"
                      onClick={() => setShowHandoffModal(false)}
                      className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#20242B] hover:bg-[#F8F9FB]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmHandoff}
                      disabled={actionLoading}
                      className="rounded-xl bg-[#356AE6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2755C2] shadow-xs"
                    >
                      {actionLoading ? "Escalating..." : "Confirm Escalation"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#68717D]">Loading workspace...</div>}>
      <WorkspacePageContent />
    </Suspense>
  );
}
