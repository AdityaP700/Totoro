import React from "react";

const sampleQuery = "Why was my request rejected?";

export function InteractiveDemoCTA() {
  return (
    <section className="w-full bg-[#f7f7f4] px-6 py-18 border-t border-black/[0.06]">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-black/[0.08] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr]">
          <div className="p-8 md:p-12">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Try the product
            </span>
            <h2 className="mt-4 max-w-2xl font-serif text-4xl font-light leading-[1.05] tracking-tight text-zinc-950 md:text-6xl">
              Resolve support issues with verified steps.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-zinc-600">
              Start with your issue description, review verified context, or open the workspace to diagnose your first case.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/onboarding" className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800">
                Get Started
              </a>
              <a
                href={`/workspace?q=${encodeURIComponent(sampleQuery)}`}
                className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50"
              >
                Run sample diagnosis
              </a>
              <a href="/workspace" className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100">
                Open Workspace
              </a>
            </div>
          </div>

          <div className="border-t border-black/[0.06] bg-zinc-950 p-6 text-white lg:border-l lg:border-t-0">
            <div className="flex h-full min-h-[300px] flex-col justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.04] p-5">
              <div>
                <div className="mb-4 flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Live sample</span>
                  <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold text-emerald-300">Ready</span>
                </div>
                <p className="text-sm font-medium text-zinc-300">{sampleQuery}</p>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-white p-4 text-zinc-950">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">Verified diagnosis</span>
                  <p className="mt-2 text-xl font-semibold leading-snug">
                    Template parameter #1 is missing an example value in the template header.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
                    <div className="font-mono text-base text-white">Guarded</div>
                    <div className="text-[10px] text-zinc-500">Safety</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
                    <div className="font-mono text-base text-white">Active</div>
                    <div className="text-[10px] text-zinc-500">State</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-3">
                    <div className="font-mono text-base text-white">Fresh</div>
                    <div className="text-[10px] text-zinc-500">Read</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
