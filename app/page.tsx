import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/sections/HeroSection";
import ProblemSection from "@/components/landing/sections/ProblemSection";
import WorkflowSection from "@/components/landing/sections/WorkflowSection";
import AudienceSection from "@/components/landing/sections/AudienceSection";
import ProductShowcaseSection from "@/components/landing/sections/ProductShowcaseSection";
import ROISection from "@/components/landing/sections/ROISection";
import TestimonialsSection from "@/components/landing/sections/TestimonialsSection";
import WhiteLabelSection from "@/components/landing/sections/WhiteLabelSection";
import CTASection from "@/components/landing/sections/CTASection";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", isolation: "isolate" }}>
      <Navbar />
      <main>
        {/* 1 — Hero: Turn tattoo inquiries into paid bookings */}
        <HeroSection />
        {/* 2 — Problem: The real cost of disconnected tools */}
        <ProblemSection />
        {/* 3 — How It Works: AI manages the entire client journey */}
        <WorkflowSection />
        {/* 4 — Why InkBook: Outcomes for solo artists and studios */}
        <AudienceSection />
        {/* 5 — Product: Your complete business, visible at a glance */}
        <ProductShowcaseSection />
        {/* 6 — ROI: What is one missed booking worth? */}
        <ROISection />
        {/* 7 — Social proof: Built from listening to tattoo artists */}
        <TestimonialsSection />
        {/* 8 — White label: Clients experience your studio, not InkBook */}
        <WhiteLabelSection />
        {/* 9 — Final CTA: The studios that move first */}
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
