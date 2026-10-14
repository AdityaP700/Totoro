"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

const ROLES = [
  { id: "founder", label: "Founder / Business owner", desc: "Overseeing operations and customer satisfaction" },
  { id: "freelancer", label: "Freelancer / Consultant", desc: "Advising clients and solving technical snags" },
  { id: "pm", label: "Product manager", desc: "Tracking product experience and recurring defects" },
  { id: "support", label: "Customer support", desc: "Investigating user requests and rejection notices" },
  { id: "ops", label: "Operations", desc: "Managing delivery health and system workflows" },
  { id: "team", label: "Team member", desc: "Collaborating on team tasks and resolution actions" },
  { id: "dev", label: "Developer / Technical", desc: "Debugging APIs, schemas, and template parameters" },
  { id: "other", label: "Other", desc: "Custom role or specific operational focus" },
];

export interface OnboardingProfile {
  name: string;
  role: string;
  customRole: string;
  businessName: string;
  website: string;
  description: string;
  teamName: string;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [profile, setProfile] = useState<OnboardingProfile>({
    name: "",
    role: "support",
    customRole: "",
    businessName: "",
    website: "",
    description: "",
    teamName: "",
  });

  // Load prior profile if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("totoro_onboarding_profile");
        if (saved) {
          const parsed = JSON.parse(saved);
          setProfile((prev) => ({ ...prev, ...parsed }));
        }
      } catch {
        // Ignore localStorage read errors
      }
    }
  }, []);

  const handleFinish = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("totoro_onboarding_profile", JSON.stringify(profile));
        localStorage.setItem("totoro_onboarding_completed", "true");
      } catch {
        // Ignore write error
      }
    }
    void fetch("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    const dest = queryParam ? `/workspace?q=${encodeURIComponent(queryParam)}` : "/workspace";
    router.push(dest);
  };

  const handleSkip = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("totoro_onboarding_completed", "true");
      } catch {
        // Ignore
      }
    }
    void fetch("/api/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    const dest = queryParam ? `/workspace?q=${encodeURIComponent(queryParam)}` : "/workspace";
    router.push(dest);
  };

  const getRoleDisplayName = () => {
    if (profile.role === "other" && profile.customRole.trim()) {
      return profile.customRole.trim();
    }
    const found = ROLES.find((r) => r.id === profile.role);
    return found ? found.label : "Not specified";
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-white flex flex-col justify-between selection:bg-zinc-800">
      {/* Background radial glow */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black" />

      {/* Header bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-6 max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 select-none group">
          <div className="grid grid-cols-3 gap-0.5 w-3.5 h-3.5 rotate-45">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="w-1 h-1 bg-white" />
            ))}
          </div>
          <span className="tracking-wide font-sans text-xs font-semibold uppercase text-zinc-300 group-hover:text-white transition-colors">
            Totoro
          </span>
        </Link>

        {/* 3-dash progress indicator */}
        <div className="flex items-center gap-1.5" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-white"
                  : s < step
                  ? "w-4 bg-zinc-400"
                  : "w-4 bg-zinc-800"
              }`}
            />
          ))}
        </div>

        {/* Skip button */}
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition-colors px-2 py-1"
        >
          Skip
        </button>
      </header>

      {/* Main step container */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden rounded-[28px] border border-white/[0.12] bg-zinc-950/70 p-6 md:p-8 shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              >
                <div className="mb-6">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Step 01 / 03
                  </span>
                  <h1 className="mt-2 font-serif text-3xl font-light text-white md:text-4xl">
                    Let's personalize Totoro.
                  </h1>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Tell us a little about yourself so we can tailor suggestions to your typical recovery workflows.
                  </p>
                </div>

                {/* Name field (optional) */}
                <div className="mb-6">
                  <label htmlFor="user-name" className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2">
                    Name <span className="text-zinc-600">(Optional)</span>
                  </label>
                  <input
                    id="user-name"
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="What should we call you?"
                    className="w-full h-12 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/35 transition-colors"
                  />
                </div>

                {/* Role selection */}
                <div className="mb-6">
                  <span className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-3">
                    What best describes your role?
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[290px] overflow-y-auto pr-1">
                    {ROLES.map((r) => {
                      const isSelected = profile.role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setProfile({ ...profile, role: r.id })}
                          className={`rounded-2xl border p-3.5 text-left transition-all flex flex-col justify-between ${
                            isSelected
                              ? "border-white bg-white/[0.1] text-white shadow-sm ring-1 ring-white/20"
                              : "border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/20 hover:bg-white/[0.05]"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm font-semibold">{r.label}</span>
                            <span
                              className={`h-2 w-2 rounded-full transition-all ${
                                isSelected ? "bg-emerald-400 scale-125" : "bg-transparent border border-zinc-700"
                              }`}
                            />
                          </div>
                          <p className="mt-1 text-xs text-zinc-400 leading-normal">{r.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Conditional input when Other is selected */}
                  {profile.role === "other" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <input
                        type="text"
                        value={profile.customRole}
                        onChange={(e) => setProfile({ ...profile, customRole: e.target.value })}
                        placeholder="Specify your role or focus..."
                        className="w-full h-11 rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/40 transition-colors"
                      />
                    </motion.div>
                  )}
                </div>

                {/* Navigation actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                  <span className="text-xs text-zinc-500">Takes less than a minute</span>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-11 rounded-xl bg-white px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 flex items-center gap-2"
                  >
                    Continue
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden rounded-[28px] border border-white/[0.12] bg-zinc-950/70 p-6 md:p-8 shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              >
                <div className="mb-6">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Step 02 / 03
                  </span>
                  <h1 className="mt-2 font-serif text-3xl font-light text-white md:text-4xl">
                    Give Totoro some context.
                  </h1>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Add optional business context to ground issue diagnosis. All fields are optional and can be edited later.
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="biz-name" className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Business or product name <span className="text-zinc-600">(Optional)</span>
                    </label>
                    <input
                      id="biz-name"
                      type="text"
                      value={profile.businessName}
                      onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                      placeholder="e.g., Acme Cloud, Northwind Store"
                      className="w-full h-11 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/35 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="team-name" className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Team or organization <span className="text-zinc-600">(Optional)</span>
                    </label>
                    <input
                      id="team-name"
                      type="text"
                      value={profile.teamName}
                      onChange={(e) => setProfile({ ...profile, teamName: e.target.value })}
                      placeholder="e.g., Customer Operations, Support Tier 2"
                      className="w-full h-11 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/35 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="website-url" className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Website or help-center URL <span className="text-zinc-600">(Optional)</span>
                    </label>
                    <input
                      id="website-url"
                      type="url"
                      value={profile.website}
                      onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                      placeholder="https://help.example.com"
                      className="w-full h-11 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/35 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="biz-desc" className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      Short description <span className="text-zinc-600">(Optional)</span>
                    </label>
                    <textarea
                      id="biz-desc"
                      value={profile.description}
                      onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                      placeholder="e.g., We send order confirmations and support updates via WhatsApp and Webhooks."
                      rows={2}
                      className="w-full rounded-xl border border-white/[0.1] bg-white/[0.04] p-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/35 transition-colors resize-none"
                    />
                  </div>
                </div>

                {/* Navigation actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="h-11 rounded-xl border border-white/[0.12] bg-transparent px-5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="h-11 rounded-xl bg-white px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 flex items-center gap-2"
                  >
                    Continue
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden rounded-[28px] border border-white/[0.12] bg-zinc-950/70 p-6 md:p-8 shadow-[0_28px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl"
              >
                <div className="mb-6">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
                    Step 03 / 03 — All set
                  </span>
                  <h1 className="mt-2 font-serif text-3xl font-light text-white md:text-4xl">
                    You're ready to go.
                  </h1>
                  <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                    Your profile is configured. Totoro will use this context to prioritize recovery suggestions.
                  </p>
                </div>

                {/* Summary Card */}
                <div className="mb-6 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-zinc-500">Workspace summary</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-[11px] font-mono uppercase text-zinc-500">Name</span>
                      <p className="mt-1 font-medium text-white">{profile.name.trim() || "Not specified"}</p>
                    </div>

                    <div>
                      <span className="block text-[11px] font-mono uppercase text-zinc-500">Role</span>
                      <p className="mt-1 font-medium text-white">{getRoleDisplayName()}</p>
                    </div>

                    <div>
                      <span className="block text-[11px] font-mono uppercase text-zinc-500">Business / Org</span>
                      <p className="mt-1 font-medium text-white">
                        {profile.businessName.trim() || profile.teamName.trim() || "Default organization"}
                      </p>
                    </div>

                    <div>
                      <span className="block text-[11px] font-mono uppercase text-zinc-500">Context Source</span>
                      <p className="mt-1 font-medium text-white">
                        {profile.website.trim() || profile.description.trim() ? "Custom context provided" : "Standard issue recovery"}
                      </p>
                    </div>
                  </div>

                  {queryParam && (
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3 text-xs text-emerald-300">
                      <span className="font-mono uppercase tracking-wider text-[10px] text-emerald-400/80 block mb-1">
                        Pending request to analyze:
                      </span>
                      "{queryParam}"
                    </div>
                  )}
                </div>

                {/* Navigation actions */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="h-11 rounded-xl border border-white/[0.12] bg-transparent px-5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleFinish}
                    className="h-11 rounded-xl bg-white px-6 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 flex items-center gap-2 shadow-lg"
                  >
                    Start a conversation
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer copyright */}
      <footer className="relative z-20 py-4 text-center text-[11px] text-zinc-600 font-sans select-none">
        Totoro © 2026. Guarded recovery with deterministic rules and explicit approvals.
      </footer>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 text-sm">Loading onboarding...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
