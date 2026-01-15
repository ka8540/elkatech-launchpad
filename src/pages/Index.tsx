import { useState } from "react";
import IntroAnimation from "@/components/IntroAnimation";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SolutionsSection from "@/components/SolutionsSection";
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
        <SolutionsSection />
        <WhyElkatech />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
