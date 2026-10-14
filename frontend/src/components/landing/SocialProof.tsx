import React from "react";

export function SocialProof() {
  const items = [
    "CUSTOMER SUPPORT",
    "OPERATIONS TEAMS",
    "INCIDENT RECOVERY",
    "AI-ASSISTED TRIAGE"
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 h-20 flex items-center justify-center border-t border-zinc-900 bg-black/80 backdrop-blur-md px-4 select-none">
      <div className="w-full max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[10px] tracking-[0.25em] font-medium text-zinc-500 uppercase font-sans">
        {items.map((item, index) => (
          <React.Fragment key={item}>
            <span>{item}</span>
            {index < items.length - 1 && (
              <span className="hidden md:inline text-zinc-800">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
