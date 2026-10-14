"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export function Navbar() {
  const [targetHref, setTargetHref] = useState("/onboarding");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("totoro_onboarding_completed");
      if (completed === "true") {
        setTargetHref("/workspace");
      }
    }
  }, []);

  return (
    <nav className="relative z-50 flex items-center justify-between px-8 md:px-16 h-20 bg-transparent max-w-7xl mx-auto w-full">
      {/* Logo */}
      <div className="flex items-center gap-2 font-medium text-lg text-white select-none">
        <div className="grid grid-cols-3 gap-0.5 w-3.5 h-3.5 rotate-45">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="w-1 h-1 bg-white" />
          ))}
        </div>
        <span className="tracking-wide font-sans ml-1 text-sm font-semibold uppercase">Totoro</span>
      </div>

      {/* Nav Links — reduced opacity to make CTA dominant */}
      <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wider text-zinc-500 uppercase">
        <a href="#how-it-works" className="hover:text-white/80 transition-colors duration-200">
          How It Works
        </a>
        <a href="#features" className="hover:text-white/80 transition-colors duration-200">
          Outcomes
        </a>
        <a href="#trust" className="hover:text-white/80 transition-colors duration-200">
          Trust
        </a>
        <a href="#faq" className="hover:text-white/80 transition-colors duration-200">
          FAQ
        </a>
      </div>

      {/* CTA Button — solid button, not just underlined text */}
      <div>
        <Link
          href={targetHref}
          className="text-xs font-semibold tracking-wider text-zinc-950 bg-white hover:bg-zinc-100 transition-all px-5 py-2.5 rounded-xl uppercase"
        >
          Launch Workspace
        </Link>
      </div>
    </nav>
  );
}
