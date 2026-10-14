"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; businessName: string; teamName: string; role: string }>({
    name: "Support Lead",
    businessName: "Operations",
    teamName: "",
    role: "Support",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("totoro_onboarding_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          setUserProfile((prev) => ({
            ...prev,
            name: parsed.name?.trim() || "Support Lead",
            businessName: parsed.businessName?.trim() || "Customer Ops",
            teamName: parsed.teamName?.trim() || "",
            role: parsed.role || "Support",
          }));
        }
      } catch {
        // Ignore read errors
      }
    }
  }, []);

  const initials = userProfile.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "TO";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-zinc-950 font-sans">
      
      {/* 1. Left Sidebar Navigation */}
      <aside 
        className={`bg-[#fcfcfc] border-r border-zinc-200/50 flex flex-col justify-between transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        } flex-shrink-0`}
      >
        <div className="flex flex-col gap-6 p-4 overflow-y-auto flex-1 select-none">
          
          {/* Sidebar Header */}
          <div className="flex items-center justify-between">
            {!collapsed && (
              <Link href="/workspace" className="flex items-center gap-2 font-semibold text-zinc-900 text-sm">
                <div className="grid grid-cols-3 gap-0.5 w-3.5 h-3.5 rotate-45 flex-shrink-0">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-0.5 h-0.5 bg-zinc-900" />
                  ))}
                </div>
                <span className="tracking-wide uppercase font-sans text-xs">Totoro</span>
              </Link>
            )}
            
            {/* Collapse toggle button */}
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md hover:bg-zinc-200/40 text-zinc-500 hover:text-zinc-800 transition-colors mx-auto"
              aria-label="Toggle sidebar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* New Request Action Button */}
          {!collapsed ? (
            <Link 
              href="/workspace" 
              className="flex items-center justify-center gap-1.5 h-11 px-4 bg-zinc-950 hover:bg-zinc-900 text-white rounded-full text-xs font-semibold tracking-wide transition-all shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              New Request
            </Link>
          ) : (
            <Link 
              href="/workspace" 
              className="flex items-center justify-center w-11 h-11 mx-auto bg-zinc-950 hover:bg-zinc-900 text-white rounded-full transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </Link>
          )}

          {/* Search box with keyboard shortcut visual */}
          {!collapsed && (
            <div className="relative">
              <svg className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input 
                type="text" 
                placeholder="Search workspace..."
                className="w-full pl-9 pr-10 py-1.5 bg-zinc-100/60 border border-zinc-200/60 rounded-md text-[11px] text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition-colors"
              />
              <span className="absolute right-2.5 top-2.5 text-[9px] font-mono text-zinc-400 bg-zinc-200/50 px-1 rounded">⌘K</span>
            </div>
          )}

          {/* Sidebar Sections */}
          {!collapsed && (
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-3.5 mb-2 font-mono">
                Recent requests
              </span>
              {[
                { title: "Template Rejection (Header)", q: "Why was my WhatsApp template rejected?" },
                { title: "Webhook Delivery Timeout", q: "Webhook delivery failed after retry" },
                { title: "Billing Discrepancy", q: "Billing charge discrepancy for message batch" },
                { title: "Account Verification", q: "Account verification lockout" }
              ].map((recent) => (
                <Link
                  key={recent.title}
                  href={`/workspace?q=${encodeURIComponent(recent.q)}`}
                  className="flex items-center gap-2.5 px-3.5 py-2 rounded-md hover:bg-zinc-200/40 text-left transition-colors group font-sans font-medium text-[14px] text-zinc-600 hover:text-zinc-950"
                >
                  <svg className="text-zinc-400 group-hover:text-zinc-700 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span className="truncate">{recent.title}</span>
                </Link>
              ))}

              {/* Divider line */}
              <div className="h-[1px] bg-zinc-200/50 my-4 mx-3.5" />

              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-3.5 mb-2 font-mono">
                Workspace
              </span>

              {/* Workspace Navigation */}
              <Link 
                href="/workspace" 
                className={`flex items-center gap-2.5 py-2 rounded-md text-[14px] font-medium transition-colors font-sans ${
                  pathname === "/workspace" ? "bg-zinc-100 border-l-2 border-zinc-900 pl-3 text-zinc-950 font-semibold" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/40 pl-3.5"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><polyline points="9 3 9 21"></polyline></svg>
                Workspace
              </Link>
              <Link 
                href="/workspace/history" 
                className={`flex items-center gap-2.5 py-2 rounded-md text-[14px] font-medium transition-colors font-sans ${
                  pathname === "/workspace/history" ? "bg-zinc-100 border-l-2 border-zinc-900 pl-3 text-zinc-950 font-semibold" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/40 pl-3.5"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                History
              </Link>
              <Link 
                href="/workspace/reports" 
                className={`flex items-center gap-2.5 py-2 rounded-md text-[14px] font-medium transition-colors font-sans ${
                  pathname === "/workspace/reports" ? "bg-zinc-100 border-l-2 border-zinc-900 pl-3 text-zinc-950 font-semibold" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/40 pl-3.5"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                Reports
              </Link>
              <Link 
                href="/workspace/settings" 
                className={`flex items-center gap-2.5 py-2 rounded-md text-[14px] font-medium transition-colors font-sans ${
                  pathname === "/workspace/settings" ? "bg-zinc-100 border-l-2 border-zinc-900 pl-3 text-zinc-950 font-semibold" : "text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/40 pl-3.5"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Settings
              </Link>
            </div>
          )}
        </div>

        {/* Profile Footer */}
        <div className="p-4 border-t border-zinc-200/50 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-zinc-800 truncate leading-tight">{userProfile.name}</span>
                <span className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">{userProfile.businessName}</span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace Canvas Panel */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Top Header */}
        <header className="h-14 border-b border-zinc-200/50 px-6 flex items-center justify-between bg-white select-none flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
            <span>Totoro Workspace</span>
            <span className="text-zinc-300">/</span>
            <Link href="/workspace" className="hover:text-zinc-950 flex items-center gap-1">
              New Request
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </Link>
          </div>
          
          <div className="flex items-center gap-5">
            <span className="text-xs text-zinc-500 font-medium">Guarded Triage</span>
            <span className="text-zinc-300">•</span>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-xs text-zinc-500 hover:text-zinc-800 font-medium transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </a>
            <div className="w-1px h-4 bg-zinc-200" />
            <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-950 flex items-center justify-center text-[9px] font-bold text-white transition-all">
              {initials}
            </div>
          </div>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 overflow-y-auto relative bg-[#fafafa]">
          {children}
        </main>
      </div>
    </div>
  );
}
