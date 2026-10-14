"use client";

import React from "react";
import { motion } from "motion/react";

const panels = [
  {
    label: "01 / Describe the issue",
    title: "Explain in everyday language",
    body: "Describe what went wrong in your own words without specialized jargon.",
    visual: (
      <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">Customer issue</span>
        <p className="mt-3 text-xl font-semibold leading-snug text-zinc-950">
          Template rejected: variable format mismatch in greeting header.
        </p>
      </div>
    ),
  },
  {
    label: "02 / Review the findings",
    title: "Inspect the context",
    body: "Totoro correlates reported symptoms with verified state and deterministic rules.",
    visual: (
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-left shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">Evaluated context</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <pre className="p-4 font-mono text-[11px] leading-6 text-zinc-300">
          <code>
            <span className="text-sky-400">RULE</span> template_format_check{"\n"}
            <span className="text-zinc-500">|</span> <span className="text-sky-400">PARAM</span> header_greeting = <span className="text-amber-300">"missing_param"</span>{"\n"}
            <span className="text-zinc-500">|</span> <span className="text-sky-400">STATUS</span> rejection_diagnosed{"\n"}
            <span className="text-zinc-500">|</span> <span className="text-sky-400">ACTION</span> propose_parameter_fix
          </code>
        </pre>
      </div>
    ),
  },
  {
    label: "03 / Choose what happens next",
    title: "Stay in control",
    body: "Review the recommended next step and confirm actions before execution.",
    visual: (
      <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300/80">Proposed recovery</span>
        <p className="mt-3 text-2xl font-semibold leading-snug text-white">
          Fix parameter definition and resubmit template.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["Guarded", "Review required", "Verified"].map((value) => (
            <div key={value} className="rounded-xl border border-white/[0.07] bg-white/[0.05] p-3 text-center">
              <div className="font-mono text-xs text-white">{value}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    dark: true,
  },
];

export function PipelineBento() {
  return (
    <section id="how-it-works" className="w-full border-t border-black/[0.06] bg-[#fbfbfa] px-6 py-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.55 }}
          className="max-w-2xl"
        >
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            How it works
          </span>
          <h2 className="mt-4 font-serif text-4xl font-light leading-[1.05] tracking-tight text-zinc-950 md:text-5xl">
            Understand the issue. Find the next step. Stay in control.
          </h2>
        </motion.div>

        <div className="grid min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-3">
          {panels.map((panel, idx) => (
            <motion.div
              key={panel.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.55, delay: idx * 0.08 }}
              className={`flex min-h-[360px] flex-col justify-between rounded-[28px] border p-5 shadow-[0_12px_36px_rgba(0,0,0,0.035)] ${
                panel.dark
                  ? "border-zinc-800 bg-zinc-950 text-white"
                  : "border-black/[0.06] bg-white text-zinc-950"
              }`}
            >
              <div>
                <span className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${panel.dark ? "text-zinc-500" : "text-zinc-400"}`}>
                  {panel.label}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{panel.title}</h3>
                <p className={`mt-2 text-sm leading-6 ${panel.dark ? "text-zinc-400" : "text-zinc-600"}`}>
                  {panel.body}
                </p>
              </div>
              <div className="mt-8">{panel.visual}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
