import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/sections/HeroSection";
import ProblemSection from "@/components/landing/sections/ProblemSection";
import AIConsultantSection from "@/components/landing/sections/AIConsultantSection";
import ArtistMatchingSection from "@/components/landing/sections/ArtistMatchingSection";
import QuotesDepositsSection from "@/components/landing/sections/QuotesDepositsSection";
import StatsSection from "@/components/landing/sections/StatsSection";
import OwnerSection from "@/components/landing/sections/OwnerSection";
import WhiteLabelSection from "@/components/landing/sections/WhiteLabelSection";
import WorkflowSection from "@/components/landing/sections/WorkflowSection";
import ProjectSection from "@/components/landing/sections/ProjectSection";
import AIFollowUpSection from "@/components/landing/sections/AIFollowUpSection";
import MigrationSection from "@/components/landing/sections/MigrationSection";
import TrustMetricsSection from "@/components/landing/sections/TrustMetricsSection";
import TestimonialsSection from "@/components/landing/sections/TestimonialsSection";
import PricingSection from "@/components/landing/sections/PricingSection";
import CTASection from "@/components/landing/sections/CTASection";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", isolation: "isolate" }}>
      <Navbar />
      <main>
        {/* 1 — Hero */}
        <HeroSection />
        {/* 2 — The Problem */}
        <ProblemSection />
        {/* 3 — AI Consultation */}
        <AIConsultantSection />
        {/* 4 — Artist Matching */}
        <ArtistMatchingSection />
        {/* 5 — Quote & Deposit */}
        <QuotesDepositsSection />
        {/* 6 — Business Outcomes */}
        <StatsSection />
        {/* 7 — Owner Dashboard */}
        <OwnerSection />
        {/* 8 — White-Label Booking */}
        <WhiteLabelSection />
        {/* 9 — The Workflow */}
        <WorkflowSection />
        {/* 10 — Project Board */}
        <ProjectSection />
        {/* 11 — AI Follow-Up */}
        <AIFollowUpSection />
        {/* 12 — Why Studios Switch */}
        <MigrationSection />
        {/* 13 — Proof: Metrics */}
        <TrustMetricsSection />
        {/* 14 — Proof: Testimonials */}
        <TestimonialsSection />
        {/* 15 — Pricing */}
        <PricingSection />
        {/* 16 — Final CTA */}
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
