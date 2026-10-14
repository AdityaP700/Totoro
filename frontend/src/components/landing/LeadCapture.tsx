"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { TypingAnimation } from "@/components/ui/typing-animation";

const suggestions = [
  "Why was my request rejected?",
  "Webhook delivery failed after retry",
  "Template rejected: variable format mismatch",
];

const sampleQuery = "Why was my request rejected?";

export function LeadCapture() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const runQuery = (value: string) => {
    const trimmed = value.trim();
    const isCompleted = typeof window !== "undefined" && localStorage.getItem("totoro_onboarding_completed") === "true";
    if (!trimmed) {
      router.push(isCompleted ? "/workspace" : "/onboarding");
      return;
    }
    if (isCompleted) {
      router.push(`/workspace?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push(`/onboarding?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runQuery(query || sampleQuery);
  };

  return (
    <div className="relative z-20 mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-[28px] border border-white/[0.12] bg-zinc-950/45 p-4 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-5">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.06] p-2 transition-colors focus-within:border-white/35"
        >
          <div className="relative min-h-[54px] flex-1">
            {query === "" && (
              <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-left text-sm text-zinc-500">
                <TypingAnimation
                  words={suggestions}
                  loop={true}
                  duration={44}
                  pauseDelay={2300}
                  deleteSpeed={24}
                />
              </div>
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-[54px] w-full bg-transparent px-4 text-[15px] text-white outline-none"
              aria-label="Ask Totoro"
            />
          </div>
          <button
            type="submit"
            className="h-11 shrink-0 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 md:px-5"
          >
            Get Started
          </button>
        </form>

        <div className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-[1fr_0.9fr]">
          <button
            type="button"
            onClick={() => runQuery(sampleQuery)}
            className="rounded-2xl border border-white/[0.1] bg-black/25 p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Sample issue</span>
            <p className="mt-2 text-sm font-medium leading-6 text-zinc-200">{sampleQuery}</p>
          </button>

          <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] p-4 text-left">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">Illustrative finding</span>
            <p className="mt-2 text-sm font-semibold leading-6 text-white">
              A required variable was empty. Review parameters before retrying.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[10px] font-medium text-zinc-500">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => runQuery(suggestion)}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 transition-colors hover:border-white/20 hover:text-white"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
