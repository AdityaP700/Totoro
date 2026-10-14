"use client";

import React from "react";
import { motion } from "motion/react";

export function Features() {
  return (
    <section id="features" className="w-full border-t border-black/[0.06] bg-[#f2f1ed] px-6 py-22">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="max-w-2xl">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Outcomes
          </span>
          <h2 className="mt-4 font-serif text-4xl font-light leading-[1.05] tracking-tight text-zinc-950 md:text-5xl">
            Built for people who need answers, not another support queue.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.55 }}
            className="overflow-hidden rounded-[30px] border border-black/[0.07] bg-white shadow-[0_14px_42px_rgba(0,0,0,0.035)]"
          >
            <div className="p-7">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Outcome 01</span>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
                Ask In Plain Language.
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-zinc-600">
                Describe the problem naturally without memorizing internal provider error codes or routing rules.
              </p>
            </div>
            <div className="border-t border-black/[0.06] bg-zinc-50 p-7">
              <div className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">Natural language issue</span>
                <p className="mt-3 text-2xl font-semibold leading-snug text-zinc-950">
                  My WhatsApp template was rejected for variable mismatch after last update.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="overflow-hidden rounded-[30px] border border-black/[0.07] bg-white shadow-[0_14px_42px_rgba(0,0,0,0.035)]"
          >
            <div className="p-7">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">Outcome 02</span>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950">
                Know Why The Recommendation Exists.
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-zinc-600">
                Every recovery path carries verified state evidence, rule evaluation, and clear confirmation requirements.
              </p>
            </div>
            <div className="border-t border-black/[0.06] bg-zinc-950 p-7 text-white">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <span className="font-mono text-[10px] text-zinc-500">Guardrails</span>
                  <div className="mt-2 font-mono text-3xl">Guarded</div>
                </div>
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <span className="font-mono text-[10px] text-zinc-500">Source</span>
                  <div className="mt-2 truncate font-mono text-2xl">template_state</div>
                </div>
                <div className="col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <span className="font-mono text-[10px] text-zinc-500">Evidence</span>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">
                    Rejection confirmed from provider mock fixtures. Parameter index #1 lacked sample payload.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
