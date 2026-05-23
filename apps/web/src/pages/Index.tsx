import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LandingProductCategories from "@/components/landing/LandingProductCategories";
import LandingWhyChoose from "@/components/landing/LandingWhyChoose";
import LandingApplications from "@/components/landing/LandingApplications";
import LandingServiceSupport from "@/components/landing/LandingServiceSupport";
import LandingFinalCTA from "@/components/landing/LandingFinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";

// Premium industrial landing experience for ElkaTech. All landing styling is
// scoped under the `.lp` class so the global blue brand tokens used by the
// product-category and service-portal pages are never affected.
const Index = () => {
  return (
    <div className="lp min-h-screen" style={{ background: "var(--lp-bg)" }}>
      <LandingHeader />
      <main>
        <LandingHero />
        <LandingProductCategories />
        <LandingWhyChoose />
        <LandingApplications />
        <LandingServiceSupport />
        <LandingFinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
};

export default Index;
