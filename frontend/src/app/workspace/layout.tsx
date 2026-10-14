"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "../../lib/workspaceContext";

function WorkspaceLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    activeTitle,
    statusBadge,
    userProfile,
    recentRequests,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useWorkspace();

  const [search, setSearch] = useState("");
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Compute avatar initials from userProfile name
  const initials =
    (userProfile.name?.trim() || "Support Lead")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TL";

  // Filter recent requests based on search input
  const filteredRecent = recentRequests.filter((item) =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  // Format status badge color
  const badgeConfig = (() => {
    const s = (statusBadge || "").toLowerCase();
    if (s.includes("awaiting") || s.includes("propose") || s.includes("approval")) {
      return {
        dot: "bg-blue-500",
        pill: "bg-blue-50 text-blue-700 border-blue-200/80",
        label: statusBadge || "Awaiting approval",
      };
    }
    if (s.includes("verified") || s.includes("success") || s.includes("pass") || s.includes("complete")) {
      return {
        dot: "bg-emerald-500",
        pill: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        label: statusBadge || "Verified read",
      };
    }
    if (s.includes("escalat") || s.includes("human") || s.includes("handoff") || s.includes("block")) {
      return {
        dot: "bg-rose-500",
        pill: "bg-rose-50 text-rose-700 border-rose-200/80",
        label: statusBadge || "Escalated to human support",
      };
    }
    if (s.includes("clarif")) {
      return {
        dot: "bg-amber-500",
        pill: "bg-amber-50 text-amber-700 border-amber-200/80",
        label: statusBadge || "Clarification needed",
      };
    }
    return {
      dot: "bg-zinc-400",
      pill: "bg-zinc-100 text-zinc-700 border-zinc-200",
      label: statusBadge || "Ready",
    };
  })();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/workspace?q=${encodeURIComponent(search.trim())}&new=1`);
      setSearch("");
      if (mobileMenuOpen) setMobileMenuOpen(false);
    }
  };

  const navItems = [
    {
      href: "/workspace",
      label: "Workspace",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
      active: pathname === "/workspace",
    },
    {
      href: "/workspace/history",
      label: "History",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      active: pathname === "/workspace/history",
    },
    {
      href: "/workspace/reports",
      label: "Reports",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
      active: pathname === "/workspace/reports",
    },
    {
      href: "/workspace/settings",
      label: "Settings",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
      active: pathname === "/workspace/settings",
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between select-none">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-1">
          {!sidebarCollapsed && (
            <Link href="/workspace" className="flex items-center gap-2">
              <span className="font-mono text-sm font-black tracking-widest text-zinc-950">
                TOTORO
              </span>
            </Link>
          )}

          {/* Toggle sidebar button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-900 transition-colors mx-auto"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* New Request Button */}
        {!sidebarCollapsed ? (
          <Link
            href="/workspace?new=1"
            onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 shadow-xs hover:border-zinc-300 hover:bg-zinc-50 transition-all"
          >
            <span className="text-sm font-bold text-zinc-700">+</span>
            <span>New request</span>
          </Link>
        ) : (
          <Link
            href="/workspace?new=1"
            onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-xs hover:bg-zinc-50 transition-all"
            title="New request"
          >
            <span className="text-base font-bold">+</span>
          </Link>
        )}

        {/* Search bar */}
        {!sidebarCollapsed && (
          <form onSubmit={handleSearchSubmit} className="relative mt-1">
            <svg
              className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-zinc-200/80 bg-zinc-100/60 pl-8 pr-10 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
            />
            <span className="absolute right-2 top-2 rounded bg-zinc-200/60 px-1 py-0.5 font-mono text-[9px] text-zinc-500">
              ⌘K
            </span>
          </form>
        )}

        {/* Recent Requests Section */}
        {!sidebarCollapsed && (
          <div className="flex flex-col gap-1 mt-2">
            <span className="px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Recent requests
            </span>
            <div className="space-y-0.5">
              {filteredRecent.length === 0 ? (
                <span className="px-3 py-2 text-xs text-zinc-400">No requests yet</span>
              ) : (
                filteredRecent.map((item) => {
                  const isActive = activeTitle.toLowerCase().includes(item.title.toLowerCase()) || (pathname === "/workspace" && item.id === filteredRecent[0]?.id && !search);
                  return (
                    <Link
                      key={item.id}
                      href={`/workspace?q=${encodeURIComponent(item.q)}&new=1`}
                      onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
                      className={`group relative flex flex-col rounded-lg px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-[#f0f4f9] text-zinc-950"
                          : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-blue-600" />
                      )}
                      <span className="truncate text-xs font-medium">
                        {item.title}
                      </span>
                      <span className="mt-0.5 truncate font-mono text-[10px] text-zinc-400">
                        {item.subtitle}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        {!sidebarCollapsed && <div className="h-px bg-zinc-200/60 my-1" />}

        {/* Navigation Section */}
        <div className="flex flex-col gap-1">
          {!sidebarCollapsed && (
            <span className="px-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Workspace
            </span>
          )}
          {navItems.map((nav) => (
            <Link
              key={nav.href}
              href={nav.href}
              onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
              className={`flex items-center gap-3 rounded-lg py-2 transition-colors ${
                sidebarCollapsed ? "justify-center px-0" : "px-3"
              } ${
                nav.active
                  ? "bg-zinc-100 text-zinc-950 font-semibold"
                  : "text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-900 font-medium"
              }`}
              title={sidebarCollapsed ? nav.label : undefined}
            >
              <span className={nav.active ? "text-zinc-950" : "text-zinc-400"}>
                {nav.icon}
              </span>
              {!sidebarCollapsed && <span className="text-xs">{nav.label}</span>}
            </Link>
          ))}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="border-t border-zinc-200/60 p-3.5">
        <Link
          href="/workspace/settings"
          onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}
          className={`flex items-center gap-2.5 rounded-lg p-1 hover:bg-zinc-100/80 transition-colors ${
            sidebarCollapsed ? "justify-center" : ""
          }`}
          title="Account & Settings"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-bold text-white shadow-xs">
            {initials}
          </div>
          {!sidebarCollapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold text-zinc-800">
                {userProfile.name || "Support Lead"}
              </span>
              <span className="truncate text-[10px] text-zinc-400 font-mono">
                {userProfile.businessName || "Totoro"}
              </span>
            </div>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-zinc-950 font-sans">
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#fafafa] border-r border-zinc-200/70 transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        } shrink-0`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#fafafa] shadow-2xl transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {/* Top Header matching reference screenshot Image 1 */}
        <header className="h-14 border-b border-zinc-200/70 px-4 md:px-6 flex items-center justify-between bg-white select-none shrink-0">
          <div className="flex items-center gap-2 md:gap-3 text-xs">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 rounded-md text-zinc-600 hover:bg-zinc-100 md:hidden"
              aria-label="Open sidebar menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Breadcrumb */}
            <span className="text-zinc-500 font-normal">Workspace</span>
            <span className="text-zinc-300">/</span>
            <span className="font-semibold text-zinc-900 truncate max-w-[180px] sm:max-w-[320px]">
              {activeTitle || "Issue investigation"}
            </span>

            {/* Status Badge Pill */}
            <div className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badgeConfig.pill}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badgeConfig.dot}`} />
              <span>{badgeConfig.label}</span>
            </div>
          </div>

          {/* Right Header Utilities: Help + Avatar */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              Help
            </button>
            <div className="h-3 w-px bg-zinc-200" />
            <Link
              href="/workspace/settings"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
              title="Profile & Settings"
            >
              {initials}
            </Link>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto relative bg-white">
          {children}
        </main>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-semibold text-zinc-900">Totoro Support & Guardrails</h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-zinc-600 leading-relaxed">
              <p>
                <strong>Rules-First Recovery:</strong> Totoro evaluates deterministic policy rules across mock fixtures without external network dependencies.
              </p>
              <p>
                <strong>Safety Guardrail G1:</strong> No changes are submitted without your explicit confirmation displaying exact before/after diffs.
              </p>
              <p>
                <strong>Simulation Only:</strong> All operations are safely executed in mock fixtures. Real Cheerio and Meta API calls are never executed.
              </p>
              <p>
                <strong>Human-Led Zones:</strong> Billing disputes, security credentials, and verification failures automatically trigger complete human specialist handoffs.
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
    </WorkspaceProvider>
  );
}
