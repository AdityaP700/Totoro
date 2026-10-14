"use client";

import React, { useState } from "react";

export default function WorkspaceSettings() {
  const [resetting, setResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const handleReset = async () => {
    setResetting(true);
    setResetNotice(null);
    try {
      const res = await fetch("/api/settings/reset", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setResetNotice(data.message || "Fixtures restored to pristine state.");
      }
    } catch {
      setResetNotice("Failed to reset session registry.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-4xl flex-col gap-8 px-6 py-10 font-sans">
      <div className="border-b border-zinc-200 pb-5">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Environment & Guardrails
        </span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">
          Workspace Settings
        </h1>
        <p className="mt-1 text-sm text-zinc-500 leading-relaxed">
          Runtime configuration, safety policies, deterministic guardrails, and mock state lifecycle.
        </p>
      </div>

      {resetNotice && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          {resetNotice}
        </div>
      )}

      <div className="space-y-6">
        {/* Guardrails Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Deterministic Safety Guardrails</h2>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              Active (G1–G15)
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            All write operations require explicit confirmation with exact before/after diffs (G1). Real Cheerio and Meta API calls are strictly forbidden (G7).
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs font-mono">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
              <span className="font-semibold text-zinc-900 block">G1 — Explicit Confirmation</span>
              <span className="text-zinc-500 text-[11px]">Exact before/after change required</span>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
              <span className="font-semibold text-zinc-900 block">G2 — Allowlist Enforcement</span>
              <span className="text-zinc-500 text-[11px]">Only resubmit_template permitted</span>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
              <span className="font-semibold text-zinc-900 block">G5 — Fresh-Read Verification</span>
              <span className="text-zinc-500 text-[11px]">Pending != Verified without fresh state</span>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
              <span className="font-semibold text-zinc-900 block">G8–G12 — Human-Led Zones</span>
              <span className="text-zinc-500 text-[11px]">Billing, security, conflicts escalate</span>
            </div>
          </div>
        </div>

        {/* Persistence & Storage Model */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Session Storage Model</h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-700 border border-amber-200">
              In-Memory (Volatile)
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Sessions and mock template stores are currently held in the Node.js server runtime memory. State is isolated per session and resets on server restart. For distributed production deployments, external durable persistence (e.g. Redis, Postgres) is required.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              {resetting ? "Resetting..." : "Reset All Sessions & Restore Pristine Fixtures"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
