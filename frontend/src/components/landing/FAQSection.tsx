"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const faqItems = [
  {
    q: "What is Totoro?",
    a: "Totoro helps users understand support issues, review verified context, and identify an appropriate recovery step using deterministic rules and guided assistance.",
  },
  {
    q: "Does Totoro resolve every issue automatically?",
    a: "No. High-consequence or ambiguous cases require explicit user approval, missing information clarification, or escalation to human support.",
  },
  {
    q: "Can I review a suggested action?",
    a: "Yes. Every action displays a clear before/after diff and requires your explicit confirmation before any simulation or update executes.",
  },
  {
    q: "How do I know whether an issue is resolved?",
    a: "Totoro performs a fresh state read matching the expected outcome. It never treats a pending submission as verified without fresh verification.",
  },
  {
    q: "What if Totoro needs more information?",
    a: "It asks a single focused follow-up question. If state is contradictory or missing, it packages the full case file for human escalation.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="w-full border-t border-black/[0.06] bg-[#fbfbfa] px-6 py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 rounded-[30px] border border-black/[0.06] bg-white p-6 shadow-[0_14px_44px_rgba(0,0,0,0.025)] md:p-8 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
            FAQ
          </span>
          <h2 className="mt-4 font-serif text-4xl font-light leading-[1.05] tracking-tight text-zinc-950">
            Questions, answered.
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-600">
            The short version: Totoro helps teams understand, verify, and resolve issues safely.
          </p>
        </div>

        <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
          {faqItems.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.q} className="py-3">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-zinc-400">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="text-[15px] font-semibold text-zinc-900">{item.q}</span>
                  </span>
                  <span className="font-mono text-lg text-zinc-400">{isOpen ? "-" : "+"}</span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <p className="pl-8 pr-8 pt-2 text-sm leading-6 text-zinc-600">{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
