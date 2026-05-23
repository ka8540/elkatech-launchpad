import { useState } from "react";
import Header from "@/components/Header";
import IntroAnimation from "@/components/IntroAnimation";
import HeroSection, { HeroStatsStrip } from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import WorkSolutionsSection from "@/components/WorkSolutionsSection";
import BrandsSection from "@/components/BrandsSection";
import StickyStorySection from "@/components/StickyStorySection";
import InfrastructureSection from "@/components/InfrastructureSection";
import WhyElkatech from "@/components/WhyElkatech";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ScrollProgressBar from "@/components/ScrollProgressBar";

const Index = () => {
  // Skip the intro overlay when the user lands with a section hash (e.g.
  // /#about). The intro otherwise covers the target section for ~950ms while
  // the ScrollManager is already scrolling to it.
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.location.hash;
  });

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      <ScrollProgressBar />
      <Header />
      <main>
        <HeroSection />
        <HeroStatsStrip />
        <AboutSection />
        <WorkSolutionsSection />
        <BrandsSection />
        <StickyStorySection />
        <InfrastructureSection />
        <WhyElkatech />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
