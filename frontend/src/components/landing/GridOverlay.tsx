import React from "react";

export function GridOverlay() {
  return (
    <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden select-none">
      {/* 1. Fine repeating background grid — reduced to subtle texture */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-screen">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="fineGrid" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M 120 0 L 0 0 0 120" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fineGrid)" />
        </svg>
      </div>

      {/* 2. Key structural guides — softened */}
      <div className="absolute inset-0 mix-blend-screen opacity-[0.06]">
        {/* Left vertical guide */}
        <div className="absolute left-[10%] md:left-[16%] top-0 bottom-0 border-l border-zinc-600" />
        
        {/* Right vertical guide */}
        <div className="absolute right-[10%] md:right-[16%] top-0 bottom-0 border-r border-zinc-600" />
        
        {/* Top horizontal guide (under navbar) */}
        <div className="absolute left-0 right-0 top-20 border-b border-zinc-600" />
        
        {/* Bottom horizontal guide (above social proof) */}
        <div className="absolute left-0 right-0 bottom-20 border-t border-zinc-600" />
        
        {/* Little accent intersection markers (corners) */}
        <div className="absolute left-[16%] top-20 w-2 h-2 -ml-1 -mt-1 border-t border-l border-zinc-500" />
        <div className="absolute right-[16%] top-20 w-2 h-2 -mr-1 -mt-1 border-t border-r border-zinc-500" />
        <div className="absolute left-[16%] bottom-20 w-2 h-2 -ml-1 -mb-1 border-b border-l border-zinc-500" />
        <div className="absolute right-[16%] bottom-20 w-2 h-2 -mr-1 -mb-1 border-b border-r border-zinc-500" />

        {/* Coordinate Markers */}
        <div className="absolute left-[16%] top-20 ml-2 mt-2 text-[8px] font-mono text-zinc-600 select-none">01</div>
        <div className="absolute right-[16%] top-20 mr-2 mt-2 text-[8px] font-mono text-zinc-600 select-none">02</div>
        <div className="absolute left-[16%] bottom-20 ml-2 mb-2 text-[8px] font-mono text-zinc-600 select-none">03</div>
        <div className="absolute right-[16%] bottom-20 mr-2 mb-2 text-[8px] font-mono text-zinc-600 select-none">04</div>
      </div>
    </div>
  );
}
