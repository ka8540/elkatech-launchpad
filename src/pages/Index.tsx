import { useState, useEffect } from "react";
import IntroAnimation from "@/components/IntroAnimation";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FeaturedSolutions from "@/components/FeaturedSolutions";
import AboutSection from "@/components/AboutSection";
import WorkSolutionsSection from "@/components/WorkSolutionsSection";
import BrandsSection from "@/components/BrandsSection";
import InfrastructureSection from "@/components/InfrastructureSection";
import WhyElkatech from "@/components/WhyElkatech";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (!showIntro) {
      // Small delay to ensure smooth transition after intro
      const timer = setTimeout(() => setContentReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      {!showIntro && (
        <>
          <Header />
          <main className={contentReady ? "animate-in fade-in duration-500" : "opacity-0"}>
            <HeroSection />
            <FeaturedSolutions />
            <AboutSection />
            <WorkSolutionsSection />
            <BrandsSection />
            <InfrastructureSection />
            <WhyElkatech />
            <ContactSection />
          </main>
          <Footer />
        </>
      )}
    </div>
  );
};

export default Index;
