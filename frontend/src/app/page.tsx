import { Hero } from "@/components/landing/Hero";
import { CompetitivePositioning } from "@/components/landing/CompetitivePositioning";
import { PipelineBento } from "@/components/landing/PipelineBento";
import { Features } from "@/components/landing/Features";
import { TrustSection } from "@/components/landing/TrustSection";
import { InteractiveDemoCTA } from "@/components/landing/InteractiveDemoCTA";
import { FAQSection } from "@/components/landing/FAQSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-black">
      <Hero />
      <CompetitivePositioning />
      <PipelineBento />
      <Features />
      <TrustSection />
      <InteractiveDemoCTA />
      <FAQSection />
      <Footer />
    </main>
  );
}
