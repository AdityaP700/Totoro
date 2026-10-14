"use client";

import React, { useState } from "react";
import { useWorkspace } from "../../../lib/workspaceContext";

export default function WorkspaceSettings() {
  const { userProfile, setUserProfile } = useWorkspace();
  const [name, setName] = useState(userProfile.name || "Sarah Lin");
  const [role, setRole] = useState(userProfile.role || "support");
  const [businessName, setBusinessName] = useState(userProfile.businessName || "Fintech Core");
  const [teamName, setTeamName] = useState(userProfile.teamName || "Customer Operations");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedNotice, setProfileSavedNotice] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSavedNotice(null);

    const updated = {
      ...userProfile,
      name: name.trim(),
      role,
      businessName: businessName.trim(),
      teamName: teamName.trim(),
    };

    setUserProfile(updated);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("totoro_onboarding_profile", JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: updated }),
      });
      if (res.ok) {
        setProfileSavedNotice("Profile and workspace personalization updated successfully.");
      } else {
        setProfileSavedNotice("Saved locally to this browser.");
      }
    } catch {
      setProfileSavedNotice("Saved locally to this browser.");
    } finally {
      setSavingProfile(false);
      setTimeout(() => setProfileSavedNotice(null), 4000);
    }
  };

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
          Environment & Personalization
        </span>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
          Workspace Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500 leading-relaxed">
          Runtime configuration, user personalization, safety policies, and deterministic mock state.
        </p>
      </div>

      {profileSavedNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          {profileSavedNotice}
        </div>
      )}

      {resetNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          {resetNotice}
        </div>
      )}

      <div className="space-y-6">
        {/* Personalization Section */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-zinc-900">User Personalization</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                These settings personalize your welcome screen, prompt suggestions, and avatar.
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-sky-700 border border-sky-200">
              Active
            </span>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Your Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Lin"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Primary Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                >
                  <option value="support">Customer Support Lead</option>
                  <option value="ops">Operations & Reliability</option>
                  <option value="pm">Product Manager</option>
                  <option value="founder">Founder / Executive</option>
                  <option value="dev">Software Developer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Organization / Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Fintech Core"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Customer Operations"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-400"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 disabled:opacity-50 transition-all"
              >
                {savingProfile ? "Saving..." : "Save Personalization"}
              </button>
            </div>
          </form>
        </div>

        {/* Deterministic Guardrails Card */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
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
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Mock State & Reset</h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-amber-700 border border-amber-200">
              Local Fixture Storage
            </span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Mock template states and sessions are isolated in the local environment. You can restore all mock templates (TPL-1001, TPL-1002, TPL-1003) to their pristine un-recovered states at any time.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={resetting}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              {resetting ? "Restoring..." : "Reset All Sessions & Restore Pristine Fixtures"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
