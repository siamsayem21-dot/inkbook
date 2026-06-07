import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/sections/HeroSection";
import StatsSection from "@/components/landing/sections/StatsSection";
import ProblemSection from "@/components/landing/sections/ProblemSection";
import PlatformSection from "@/components/landing/sections/PlatformSection";
import WorkflowSection from "@/components/landing/sections/WorkflowSection";
import ProofSection from "@/components/landing/sections/ProofSection";
import PricingSection from "@/components/landing/sections/PricingSection";
import CTASection from "@/components/landing/sections/CTASection";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#090909]">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <ProblemSection />
        <PlatformSection />
        <WorkflowSection />
        <ProofSection />
        <PricingSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
