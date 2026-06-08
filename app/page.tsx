import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/sections/HeroSection";
import CategoryStatementSection from "@/components/landing/sections/CategoryStatementSection";
import ProblemSection from "@/components/landing/sections/ProblemSection";
import CategorySection from "@/components/landing/sections/CategorySection";
import MigrationSection from "@/components/landing/sections/MigrationSection";
import AudienceSection from "@/components/landing/sections/AudienceSection";
import AIConsultantSection from "@/components/landing/sections/AIConsultantSection";
import FollowUpSection from "@/components/landing/sections/FollowUpSection";
import QuotesDepositsSection from "@/components/landing/sections/QuotesDepositsSection";
import ROISection from "@/components/landing/sections/ROISection";
import OwnerSection from "@/components/landing/sections/OwnerSection";
import WhiteLabelSection from "@/components/landing/sections/WhiteLabelSection";
import AIFollowUpSection from "@/components/landing/sections/AIFollowUpSection";
import StatsSection from "@/components/landing/sections/StatsSection";
import TestimonialsSection from "@/components/landing/sections/TestimonialsSection";
import OperatingSystemSection from "@/components/landing/sections/OperatingSystemSection";
import PricingSection from "@/components/landing/sections/PricingSection";
import CTASection from "@/components/landing/sections/CTASection";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0A", isolation: "isolate" }}>
      <Navbar />
      <main>
        {/* 1 — Category declaration + pipeline: Inquiry → Consultation → Follow-Up → Quote → Deposit → Booking */}
        <HeroSection />
        {/* 1b — Category statement: what kind of software InkBook is */}
        <CategoryStatementSection />
        {/* 2 — The real cost of disconnected tools */}
        <ProblemSection />
        {/* 3 — Why a new category exists */}
        <CategorySection />
        {/* 4 — Everything you use today, replaced */}
        <MigrationSection />
        {/* 4b — Built for solo artists and growing studios */}
        <AudienceSection />
        {/* 5 — AI Consultation: every inquiry qualified */}
        <AIConsultantSection />
        {/* 6 — AI Follow-Up: most studios don't lose leads, they stop following up */}
        <FollowUpSection />
        {/* 7 — Quote & Deposit: revenue protection */}
        <QuotesDepositsSection />
        {/* 7b — Simple ROI math */}
        <ROISection />
        {/* 8 — Owner revenue intelligence */}
        <OwnerSection />
        {/* 9 — White-label: your studio, your brand, your experience */}
        <WhiteLabelSection />
        {/* 10 — Client retention: aftercare + rebooking */}
        <AIFollowUpSection />
        {/* 11 — Results */}
        <StatsSection />
        {/* 12 — Why InkBook exists */}
        <TestimonialsSection />
        {/* 13b — One tool solves one step. InkBook runs the whole journey. */}
        <OperatingSystemSection />
        {/* 13 — Pricing */}
        <PricingSection />
        {/* 14 — Demo CTA */}
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
