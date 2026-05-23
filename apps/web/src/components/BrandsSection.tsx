import StableReveal from "@/components/StableReveal";
import SectionEyebrow from "@/components/SectionEyebrow";
import ScrollReveal from "@/components/ScrollReveal";

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
    <section
      id="brands"
      className="relative overflow-hidden bg-background py-20 md:py-28"
    >
      <div className="absolute inset-x-0 top-0 h-px section-divider" />
      <div className="pointer-events-none absolute inset-0 ambient-surface-left" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <ScrollReveal variant="rise" className="flex justify-center" distance={18}>
            <SectionEyebrow>Trusted Partners</SectionEyebrow>
          </ScrollReveal>
          <ScrollReveal variant="blur-rise" delay={0.08} distance={28}>
            <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Brands We <span className="text-gradient-accent">Work With</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="rise" delay={0.16} distance={22}>
            <p className="text-lg text-muted-foreground">
              We source from internationally recognized manufacturers known for reliability,
              precision engineering, and long service life.
            </p>
          </ScrollReveal>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
          {brands.map((brand, index) => (
            <StableReveal
              key={brand}
              variant="card"
              delay={Math.min(index * 0.05, 0.24)}
              className="group relative isolate flex h-20 items-center justify-center overflow-hidden rounded-xl border border-border/80 bg-card/80 transition-[border-color,box-shadow,background-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-accent/45 hover:shadow-[0_22px_60px_-25px_rgba(14,165,233,0.4)] md:h-24"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="pointer-events-none absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="relative z-10 font-display text-lg font-semibold text-muted-foreground transition-colors duration-300 group-hover:text-foreground md:text-xl">
                {brand}
              </span>
            </StableReveal>
          ))}
        </div>

        <StableReveal
          variant="fade"
          delay={0.18}
          className="mt-8 text-center text-xs text-muted-foreground/80"
        >
          <p>* Logos and brand assets are property of their respective owners.</p>
        </StableReveal>
      </div>
    </section>
  );
};

export default BrandsSection;
