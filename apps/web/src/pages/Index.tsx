import { useState } from "react";
import Header from "@/components/Header";
import IntroAnimation from "@/components/IntroAnimation";
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

  return (
    <div className="min-h-screen bg-background">
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      <Header />
      <main>
        <HeroSection />
        <AboutSection />
        {/* <FeaturedSolutions /> */}
        <WorkSolutionsSection />
        <BrandsSection />
        <InfrastructureSection />
        <WhyElkatech />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
