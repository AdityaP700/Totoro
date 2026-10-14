import React from "react";

const traditionalSteps = ["Gather context", "Investigate available info", "Decide what to do next"];
const totoroSteps = ["Describe the issue", "Review findings & evidence", "Choose supported next step"];

export function CompetitivePositioning() {
  return (
    <section className="w-full bg-[#f7f7f4] px-6 py-16 border-t border-black/[0.06]">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div className="max-w-xl">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Why Totoro exists
          </span>
          <h2 className="mt-4 font-serif text-4xl font-light leading-[1.05] tracking-tight text-zinc-950 md:text-5xl">
            Get from a question to a clear next step.
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Explain what you need, review the information available, and understand what to do next without navigating a complicated workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.025)]">
            <div className="mb-5 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Traditional workflow
              </span>
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">
                Manual triage
              </span>
            </div>
            <div className="space-y-2">
              {traditionalSteps.map((step, idx) => (
                <div key={step} className="flex items-center gap-3 rounded-xl border border-black/[0.05] bg-zinc-50 px-3 py-3">
                  <span className="font-mono text-[10px] text-zinc-400">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-medium text-zinc-700">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/[0.08] bg-zinc-950 p-5 text-white shadow-[0_18px_55px_rgba(0,0,0,0.22)]">
            <div className="mb-5 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Totoro
              </span>
              <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                Recovery loop
              </span>
            </div>
            <div className="space-y-2">
              {totoroSteps.map((step, idx) => (
                <div key={step} className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-3">
                  <span className="font-mono text-[10px] text-zinc-600">{String(idx + 1).padStart(2, "0")}</span>
                  <span className="text-sm font-semibold text-zinc-100">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
