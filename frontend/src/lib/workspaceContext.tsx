"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface OnboardingProfile {
  name: string;
  role: string;
  customRole: string;
  businessName: string;
  website: string;
  description: string;
  teamName: string;
}

export interface RecentRequestItem {
  id: string;
  title: string;
  subtitle: string;
  q: string;
  timestamp: number;
}

interface WorkspaceContextType {
  activeTitle: string;
  setActiveTitle: (title: string) => void;
  statusBadge: string;
  setStatusBadge: (badge: string) => void;
  userProfile: OnboardingProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<OnboardingProfile>>;
  recentRequests: RecentRequestItem[];
  addRecentRequest: (item: Omit<RecentRequestItem, "timestamp">) => void;
  refreshRecentRequests: () => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const defaultProfile: OnboardingProfile = {
  name: "",
  role: "support",
  customRole: "",
  businessName: "",
  website: "",
  description: "",
  teamName: "",
};

const defaultRecent: RecentRequestItem[] = [
  { id: "req-1", title: "WhatsApp template rejection", subtitle: "payment_due_v2 · 2 min ago", q: "Why was my WhatsApp template rejected?", timestamp: Date.now() - 120000 },
  { id: "req-2", title: "Webhook delivery timeout", subtitle: "campaign_123 · 3 hours ago", q: "Webhook delivery failed after retry", timestamp: Date.now() - 10800000 },
  { id: "req-3", title: "Billing discrepancy", subtitle: "invoice_9053 · 1 day ago", q: "Billing charge discrepancy for message batch", timestamp: Date.now() - 86400000 },
  { id: "req-4", title: "Account verification", subtitle: "user access · 2 days ago", q: "Account verification lockout", timestamp: Date.now() - 172800000 },
];

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeTitle, setActiveTitle] = useState<string>("WhatsApp template rejection");
  const [statusBadge, setStatusBadge] = useState<string>("Ready");
  const [userProfile, setUserProfile] = useState<OnboardingProfile>(defaultProfile);
  const [recentRequests, setRecentRequests] = useState<RecentRequestItem[]>(defaultRecent);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Load preferences from localStorage and /api/preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCollapsed = localStorage.getItem("totoro_sidebar_collapsed");
        if (savedCollapsed !== null) {
          setSidebarCollapsedState(savedCollapsed === "true");
        }

        const savedProfile = localStorage.getItem("totoro_onboarding_profile");
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setUserProfile((prev) => ({ ...prev, ...parsed }));
        }

        const savedRecent = localStorage.getItem("totoro_recent_requests");
        if (savedRecent) {
          const parsed = JSON.parse(savedRecent);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecentRequests(parsed);
          }
        }
      } catch {
        // Ignore read errors
      }
    }

    // Also fetch from API
    void fetch("/api/preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setUserProfile((prev) => ({ ...prev, ...data.profile }));
        }
      })
      .catch(() => undefined);
  }, []);

  const setSidebarCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setSidebarCollapsedState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("totoro_sidebar_collapsed", String(next));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  };

  const refreshRecentRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.sessions) && json.sessions.length > 0) {
          const formatted: RecentRequestItem[] = json.sessions.slice(0, 6).map((s: any, idx: number) => {
            const timeAgo = formatTimeAgo(s.updatedAt || s.createdAt);
            const templateSub = s.templateId ? `${s.templateId} · ` : "";
            return {
              id: s.sessionId || `session-${idx}`,
              title: s.title || (s.originalMessage ? s.originalMessage.slice(0, 36) : "Issue investigation"),
              subtitle: `${templateSub}${timeAgo}`,
              q: s.originalMessage || "",
              timestamp: new Date(s.updatedAt || s.createdAt || Date.now()).getTime(),
            };
          });
          setRecentRequests(formatted);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("totoro_recent_requests", JSON.stringify(formatted));
            } catch {
              // Ignore
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const addRecentRequest = useCallback((item: Omit<RecentRequestItem, "timestamp">) => {
    const newItem: RecentRequestItem = { ...item, timestamp: Date.now() };
    setRecentRequests((prev) => {
      const filtered = prev.filter((r) => r.id !== newItem.id && r.q !== newItem.q);
      const updated = [newItem, ...filtered].slice(0, 6);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("totoro_recent_requests", JSON.stringify(updated));
        } catch {
          // Ignore
        }
      }
      return updated;
    });
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        activeTitle,
        setActiveTitle,
        statusBadge,
        setStatusBadge,
        userProfile,
        setUserProfile,
        recentRequests,
        addRecentRequest,
        refreshRecentRequests,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

function formatTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}
