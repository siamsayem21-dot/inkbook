import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/sections/HeroSection";
import TrustStrip from "@/components/landing/sections/TrustStrip";
import HowItWorksSection from "@/components/landing/sections/HowItWorksSection";
import AIConsultantSection from "@/components/landing/sections/AIConsultantSection";
import ArtistMatchingSection from "@/components/landing/sections/ArtistMatchingSection";
import DashboardPreviewSection from "@/components/landing/sections/DashboardPreviewSection";
import PricingSection from "@/components/landing/sections/PricingSection";
import MigrationSection from "@/components/landing/sections/MigrationSection";
import FAQSection from "@/components/landing/sections/FAQSection";
import FinalCTASection from "@/components/landing/sections/FinalCTASection";

export default function HomePage() {
  return (
    <div className="bg-ink text-white min-h-screen font-inter">
      <Navbar />
      <HeroSection />
      <TrustStrip />
      <div className="gold-divider" />
      <HowItWorksSection />
      <div className="gold-divider" />
      <AIConsultantSection />
      <div className="gold-divider" />
      <ArtistMatchingSection />
      <div className="gold-divider" />
      <DashboardPreviewSection />
      <div className="gold-divider" />
      <PricingSection />
      <div className="gold-divider" />
      <MigrationSection />
      <div className="gold-divider" />
      <FAQSection />
      <div className="gold-divider" />
      <FinalCTASection />
      <div className="gold-divider" />
      <Footer />
    </div>
  );
}
