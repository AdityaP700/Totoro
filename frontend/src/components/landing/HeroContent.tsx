"use client";

import React from "react";
import { LeadCapture } from "./LeadCapture";

export function HeroContent() {
  return (
    <div className="relative z-20 mx-auto flex min-h-[calc(100vh-120px)] max-w-7xl select-none flex-col items-center justify-center gap-y-7 px-6 pb-16 pt-24 text-center">
      <div className="opacity-0 animate-fade-in font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400 md:text-xs">
        Context-aware issue recovery
      </div>

      <h1
        className="max-w-5xl font-serif font-light leading-[0.95] tracking-tight text-white"
        style={{ fontSize: "clamp(3.3rem, 7.6vw, 7.6rem)" }}
      >
        Resolve issues.
        <span className="block text-white/72">Get back to work.</span>
      </h1>

      <p className="max-w-2xl text-[15px] leading-7 text-zinc-300 md:text-[17px]">
        Totoro helps you understand support issues, review the available context, and find a clear next step.
      </p>

      <LeadCapture />

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1 font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-500">
        <span>Context aware</span>
        <span className="text-zinc-700">/</span>
        <span>Verified evidence</span>
        <span className="text-zinc-700">/</span>
        <span>Clear next steps</span>
      </div>
    </div>
  );
}
