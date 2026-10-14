"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { SessionSummary } from "../../../lib/apiTypes";

export default function WorkspaceHistory() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (sessionId: string, current: string) => {
    const title = window.prompt("Investigation title", current);
    if (!title?.trim()) return;
    setRenamingId(sessionId);
    try { const res = await fetch("/api/session", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, title }) }); if (res.ok) await fetchHistory(); }
    finally { setRenamingId(null); }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      const res = await fetch(`/api/session?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      }
    } catch {
      // Ignore
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-col gap-1 border-b border-zinc-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-xs font-semibold text-zinc-500">
            Recovery audit logs
          </span>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
            Recovery History
          </h1>
          <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">
            Active issue investigations, verified recovery actions, and human escalation case files.
          </p>
        </div>
        <Link
          href="/workspace?new=1"
          className="w-fit rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          New request
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-sm text-zinc-400">
          Loading saved investigations...
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
          <h2 className="text-base font-semibold text-zinc-900">No active recovery sessions</h2>
          <p className="mt-1 max-w-md text-xs text-zinc-500 leading-relaxed">
            Saved investigations will appear here and can be restored on this device.
          </p>
          <Link
            href="/workspace"
            className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-zinc-100 transition-colors"
          >
            Start an investigation
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.sessionId}
              className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between transition-all hover:border-zinc-300"
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
                      s.isVerified
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : s.needsHuman
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {s.statusBadge}
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    {s.caseId} • {s.templateId || "general"}
                  </span>
                </div>
                <p className="font-medium text-sm text-zinc-950 truncate max-w-xl">
                  {s.originalMessage}
                </p>
                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                  <span>{new Date(s.updatedAt).toLocaleTimeString()}</span>
                  <span>•</span>
                  <span>{s.eventCount} audit events</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Link
                  href={`/workspace?sessionId=${encodeURIComponent(s.sessionId)}`}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Restore
                </Link>
                <button type="button" onClick={() => void handleRename(s.sessionId, s.originalMessage)} disabled={renamingId === s.sessionId} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">{renamingId === s.sessionId ? "Saving..." : "Rename"}</button>
                <a href={`/api/export?sessionId=${encodeURIComponent(s.sessionId)}`} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">Export</a>
                <button
                  type="button"
                  onClick={() => handleDelete(s.sessionId)}
                  disabled={deletingId === s.sessionId}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === s.sessionId ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
