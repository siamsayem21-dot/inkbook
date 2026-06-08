import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/sections/HeroSection";
import ProblemSection from "@/components/landing/sections/ProblemSection";
import CategorySection from "@/components/landing/sections/CategorySection";
import MigrationSection from "@/components/landing/sections/MigrationSection";
import AIConsultantSection from "@/components/landing/sections/AIConsultantSection";
import ArtistMatchingSection from "@/components/landing/sections/ArtistMatchingSection";
import QuotesDepositsSection from "@/components/landing/sections/QuotesDepositsSection";
import OwnerSection from "@/components/landing/sections/OwnerSection";
import WhiteLabelSection from "@/components/landing/sections/WhiteLabelSection";
import AIFollowUpSection from "@/components/landing/sections/AIFollowUpSection";
import StatsSection from "@/components/landing/sections/StatsSection";
import TestimonialsSection from "@/components/landing/sections/TestimonialsSection";
import PricingSection from "@/components/landing/sections/PricingSection";
import CTASection from "@/components/landing/sections/CTASection";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", isolation: "isolate" }}>
      <Navbar />
      <main>
        {/* 1 — Category declaration + pipeline visual */}
        <HeroSection />
        {/* 2 — The cost of chaos (dollar-led) */}
        <ProblemSection />
        {/* 3 — Why this category exists + competitive positioning */}
        <CategorySection />
        {/* 4 — Everything you use today, replaced */}
        <MigrationSection />
        {/* 5 — AI Consultation workflow */}
        <AIConsultantSection />
        {/* 6 — Artist Matching */}
        <ArtistMatchingSection />
        {/* 7 — Quote & Deposit (mandatory revenue protection) */}
        <QuotesDepositsSection />
        {/* 8 — Owner revenue intelligence */}
        <OwnerSection />
        {/* 9 — White-label brand ownership */}
        <WhiteLabelSection />
        {/* 10 — Post-session automation */}
        <AIFollowUpSection />
        {/* 11 — Proof (single proof moment) */}
        <StatsSection />
        {/* 12 — Why InkBook exists (real artist pain + early access) */}
        <TestimonialsSection />
        {/* 13 — Pricing */}
        <PricingSection />
        {/* 14 — Demo booking CTA */}
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
