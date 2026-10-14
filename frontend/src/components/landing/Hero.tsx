import React from "react";
import { Navbar } from "./Navbar";
import { HeroContent } from "./HeroContent";
import { SocialProof } from "./SocialProof";
import { GridOverlay } from "./GridOverlay";

export function Hero() {
  return (
    <section className="relative w-full min-h-screen bg-black overflow-hidden flex flex-col justify-between">

      {/* 1. Background Video — significantly reduced darkness for rich timelapse atmosphere */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-[0.80]"
          style={{ filter: "brightness(0.95) contrast(1.15)" }}
        >
          <source src="/TL2.mp4" type="video/mp4" />
        </video>
      </div>

      {/* Soft black overlay - reduced to let timelapse shine through */}
      <div className="absolute inset-0 z-[1] bg-black/40 pointer-events-none" />

      {/* 2. Grid Guide Lines */}
      <GridOverlay />

      {/* 3. Header Navbar */}
      <Navbar />

      {/* 4. Center Content */}
      <HeroContent />

      {/* 5. Footer Trust Bar */}
      <SocialProof />

    </section>
  );
}
