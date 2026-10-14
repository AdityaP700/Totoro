import React from "react";

const footerColumns = [
  {
    title: "PRODUCT",
    links: ["Overview", "How it works", "Outcomes", "Trust", "FAQ"],
  },
  {
    title: "RESOURCES",
    links: ["Documentation", "Case Files", "Playbooks", "Trust Centre", "Changelog"],
  },
  {
    title: "RECOVERY",
    links: ["Rules Engine", "Mock State", "Guardrails", "GitHub", "Status"],
  },
  {
    title: "COMPANY",
    links: ["About", "Security", "Contact", "Privacy", "Terms"],
  },
];

export function Footer() {
  return (
    <footer className="relative w-full bg-[#09090b] overflow-hidden min-h-[750px] flex flex-col justify-between">
      {/* Main content */}
      <div className="relative z-10 max-w-[1400px] mx-auto px-8 md:px-12 pt-28 w-full flex-grow flex flex-col justify-between">
        
        {/* Top grid: brand left + columns right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 pb-16 border-b border-white/[0.06]">
          
          {/* Left Brand Block (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 select-none">
            {/* Logo + wordmark */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/70"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="3" />
                  <line x1="12" y1="2" x2="12" y2="5" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </div>
              <span className="text-[12px] font-sans font-semibold tracking-[0.14em] text-white/95 uppercase">
                Totoro
              </span>
            </div>

            {/* Product claim */}
            <h3 className="font-serif font-normal text-white/90 leading-tight tracking-tight" style={{ fontSize: "28px" }}>
              Context-aware issue recovery
              <br />
              with verified guardrails
            </h3>

            {/* Supporting copy */}
            <p className="text-[13px] text-white/40 font-sans leading-relaxed max-w-xs">
              Understand support issues, review verified context, and find a clear next step with explicit user approval at every stage.
            </p>

            <a
              href="/onboarding"
              className="inline-flex w-fit items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
            >
              Get Started with Totoro
            </a>

            {/* Social icons */}
            <div className="flex items-center gap-4 pt-2">
              {/* GitHub */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white/70 transition-colors"
                aria-label="GitHub"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              {/* X/Twitter */}
              <a
                href="#"
                className="text-white/30 hover:text-white/70 transition-colors"
                aria-label="X"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a
                href="#"
                className="text-white/30 hover:text-white/70 transition-colors"
                aria-label="LinkedIn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right Navigation Columns (8 cols) */}
          <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8 md:gap-6">
            {footerColumns.map((col) => (
              <div key={col.title} className="flex flex-col gap-5">
                <span className="text-[12px] font-sans font-semibold tracking-[0.18em] text-white/40 uppercase">
                  {col.title}
                </span>
                <nav className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <a
                      key={link}
                      href="#"
                      className="text-[14px] font-sans text-white/50 hover:text-white/90 transition-colors leading-none"
                    >
                      {link}
                    </a>
                  ))}
                </nav>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Trust / Legal Strip */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pt-10 pb-44 select-none">
          {/* Copyright */}
          <span className="text-[12px] text-white/30 font-sans">
            Copyright 2026 Totoro, Inc. All rights reserved.
          </span>

          {/* Trust claims */}
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-white/35 font-sans">
            <span className="flex items-center gap-1.5">
              Deterministic Rules
            </span>
            <span className="text-white/15">|</span>
            <span>Guarded Recovery</span>
            <span className="text-white/15">|</span>
            <span>Fresh Verification</span>
          </div>
        </div>
      </div>

      {/* Giant Background Wordmark - Clean White/Zinc Serif Signature */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 w-full pointer-events-none select-none overflow-hidden"
        style={{ lineHeight: 0.82 }}
      >
        <div
          className="font-serif font-light whitespace-nowrap w-full text-center select-none"
          style={{
            fontSize: "clamp(180px, 18vw, 420px)",
            color: "#ffffff",
            opacity: 0.08,
            letterSpacing: "-0.02em",
            transform: "translateY(5%)",
          }}
        >
          TOTORO
        </div>
      </div>
    </footer>
  );
}
