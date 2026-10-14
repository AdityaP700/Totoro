"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const metrics = [
  { value: "Rules+LLM", label: "Triage Engine" },
  { value: "Guarded", label: "Safety Baseline" },
  { value: "Deterministic", label: "Guardrails" },
  { value: "Fresh Read", label: "Verification" },
];

export function TrustSection() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <section id="trust" className="w-full border-t border-white/[0.06] bg-[#08080a] px-6 py-24 text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Verifiable recovery
          </span>
          <h2 className="mt-4 font-serif text-5xl font-light leading-[1.02] tracking-tight text-white md:text-6xl">
            Clear answers. Visible next steps.
          </h2>
          <p className="mt-5 max-w-xl text-[15px] leading-7 text-zinc-400">
            Totoro makes findings and action status understandable, keeps users in control of consequential steps, and clearly indicates when further review is needed.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.55 }}
          className="overflow-hidden rounded-[32px] border border-white/[0.08] bg-white/[0.04] shadow-[0_26px_90px_rgba(0,0,0,0.4)]"
        >
          <div className="grid grid-cols-2 border-b border-white/[0.08] md:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="border-b border-r border-white/[0.08] p-5 last:border-r-0 md:border-b-0">
                <div className="truncate font-mono text-2xl tracking-tight text-white md:text-3xl">{metric.value}</div>
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{metric.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[1fr_0.95fr]">
            <div className="border-b border-white/[0.08] p-6 lg:border-b-0 lg:border-r">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">Evaluated context</span>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/45 p-4 font-mono text-[11px] leading-6 text-zinc-300">
                <code>
                  <span className="text-sky-400">CONTEXT</span> account_status = <span className="text-amber-300">"active"</span>{"\n"}
                  <span className="text-zinc-500">|</span> <span className="text-sky-400">TEMPLATE</span> id = <span className="text-amber-300">"order_v2"</span> status = <span className="text-rose-400">"rejected"</span>{"\n"}
                  <span className="text-zinc-500">|</span> <span className="text-sky-400">TRIAGE</span> rule = <span className="text-emerald-300">"parameter_check"</span>{"\n"}
                  <span className="text-zinc-500">|</span> <span className="text-sky-400">SAFETY</span> sensitive = <span className="text-sky-400">false</span>, allowlist = <span className="text-sky-400">true</span>
                </code>
              </pre>
            </div>

            <div className="p-6">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">Verified diagnosis</span>
              <p className="mt-4 text-2xl font-semibold leading-snug text-white">
                Parameter #1 is missing an example value in the template header.
              </p>
              <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-400">
                <p>Evidence matched provider rejection code against verified mock state.</p>
                <p>No changes are submitted without your explicit confirmation.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-white/[0.03]"
            >
              <span className="text-sm font-semibold text-zinc-200">Inspect execution trail</span>
              <span className="font-mono text-xs text-zinc-500">{isExpanded ? "Hide" : "Show"}</span>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden border-t border-white/[0.08]"
                >
                  <div className="grid grid-cols-1 gap-3 p-6 md:grid-cols-4">
                    {["Intent triaged", "Context loaded", "Rules evaluated", "Fresh read verified"].map((item, idx) => (
                      <div key={item} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                        <span className="font-mono text-[10px] text-zinc-600">{String(idx + 1).padStart(2, "0")}</span>
                        <p className="mt-2 text-sm font-semibold text-zinc-200">{item}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
