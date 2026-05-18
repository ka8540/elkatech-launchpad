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
    <section id="brands" className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px section-divider" />
      <div className="pointer-events-none absolute inset-0 ambient-surface-left" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <StableReveal variant="section">
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              Trusted Partners
            </span>
          </StableReveal>
          <StableReveal variant="section" delay={0.08}>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Brands We{" "}
              <span className="text-gradient-accent">Work With</span>
            </h2>
          </StableReveal>
          <StableReveal variant="section" delay={0.16}>
            <p className="text-muted-foreground text-lg">
              We work with internationally recognized brands known for reliability and performance.
            </p>
          </StableReveal>
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {brands.map((brand, index) => (
            <StableReveal
              key={brand}
              variant="card"
              delay={Math.min(index * 0.06, 0.24)}
              className="group relative isolate flex h-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-card transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-blue-400/40 hover:shadow-[0_20px_70px_rgba(14,165,233,0.12)] md:h-24"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative z-10 font-display text-lg md:text-xl font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                {brand}
              </span>
            </StableReveal>
          ))}
        </div>

        {/* Note */}
        <StableReveal variant="fade" delay={0.18} className="text-center text-sm text-muted-foreground mt-8">
          <p>* Logos and brand assets are property of their respective owners.</p>
        </StableReveal>
      </div>
    </section>
  );
};

export default BrandsSection;
