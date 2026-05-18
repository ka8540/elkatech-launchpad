import StableReveal from "@/components/StableReveal";

const brands = [
  "Mimaki",
  "Gongzheng",
  "Yueming",
  "TigerTec",
  "SAGA",
  "Dobosen",
  "Kartech",
  "Alwin",
  "Oric",
  "Lanqi",
  "INCA",
];

const BrandsSection = () => {
  return (
    <section id="brands" className="py-20 md:py-28 bg-background relative">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <StableReveal className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Trusted Partners
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Brands We{" "}
            <span className="text-gradient-accent">Work With</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            We work with internationally recognized brands known for reliability and performance.
          </p>
        </StableReveal>

        {/* Brands Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {brands.map((brand, index) => (
            <StableReveal
              key={brand}
              delay={index * 0.03}
              className="group flex items-center justify-center h-20 md:h-24 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-soft transition-all duration-300"
            >
              <span className="font-display text-lg md:text-xl font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                {brand}
              </span>
            </StableReveal>
          ))}
        </div>

        {/* Note */}
        <StableReveal delay={0.12} className="text-center text-sm text-muted-foreground mt-8">
          <p>* Logos and brand assets are property of their respective owners.</p>
        </StableReveal>
      </div>
    </section>
  );
};

export default BrandsSection;
