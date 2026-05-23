import { Heart, Users, HandshakeIcon, Target } from "lucide-react";
import StableReveal from "@/components/StableReveal";
import SectionEyebrow from "@/components/SectionEyebrow";

const values = [
  {
    icon: Heart,
    title: "Customer-First Philosophy",
    description:
      "Every decision we make starts with understanding your business needs and challenges.",
  },
  {
    icon: Users,
    title: "Long-term Relationships",
    description:
      "We're not just selling machinery — we're building partnerships that last for years.",
  },
  {
    icon: HandshakeIcon,
    title: "Honest Guidance",
    description:
      "We provide straightforward advice to help you make informed decisions for your business.",
  },
  {
    icon: Target,
    title: "Reliable Support",
    description:
      "Our commitment extends beyond the sale — we stand by you through every step.",
  },
];

const AboutSection = () => {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-steel-gradient py-24 md:py-32"
    >
      <div className="absolute inset-x-0 top-0 h-px section-divider" />
      <div className="pointer-events-none absolute inset-0 ambient-surface-left" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground) / 0.025) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.025) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 30%, black 30%, transparent 80%)",
        }}
      />
      <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left Column - Content */}
          <div>
            <StableReveal variant="section">
              <SectionEyebrow>About Elkatech</SectionEyebrow>
            </StableReveal>

            <StableReveal variant="section" delay={0.08}>
              <h2 className="mb-6 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl">
                Partners Beyond <span className="text-gradient-accent">the Purchase</span>
              </h2>
            </StableReveal>

            <StableReveal variant="section" delay={0.16}>
              <div className="space-y-4 leading-relaxed text-muted-foreground">
                <p className="text-lg">
                  Elkatech is an Ahmedabad-based importer, wholesaler, and distributor
                  of industrial printing and signage machinery. We serve printing
                  businesses, advertising agencies, fabrication shops, and
                  manufacturers across India.
                </p>
                <p>
                  We understand that investing in industrial machinery is a
                  significant decision for your business. That's why we focus on
                  building trust through honest guidance, transparent communication,
                  and reliable after-sales support.
                </p>
                <p>
                  Our commitment is simple: to be the partner you can depend on — not
                  just for a single purchase, but for your business journey ahead.
                </p>
              </div>
            </StableReveal>

            <StableReveal variant="section" delay={0.24} className="mt-8">
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/40 sm:grid-cols-3">
                {[
                  { value: "2017", label: "GST registered" },
                  { value: "Wholesale", label: "Trade model" },
                  { value: "Partnership", label: "Firm" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-1 bg-card px-4 py-4">
                    <dt className="font-display text-base font-semibold tracking-tight text-foreground">
                      {item.value}
                    </dt>
                    <dd className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </StableReveal>
          </div>

          {/* Right Column - Values */}
          <div className="grid gap-4 sm:grid-cols-2">
            {values.map((value, index) => (
              <StableReveal
                key={value.title}
                variant="card"
                delay={Math.min(index * 0.06, 0.24)}
                className="group relative isolate overflow-hidden rounded-2xl border border-border bg-card p-5 transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-accent/40 hover:shadow-[0_24px_70px_-22px_rgba(14,165,233,0.35)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="pointer-events-none absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative z-10">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 transition-[background-color,box-shadow] duration-300 group-hover:bg-accent/20 group-hover:shadow-glow">
                    <value.icon className="h-5 w-5 text-accent" />
                  </div>

                  <h3 className="mb-1.5 font-display font-semibold text-foreground">
                    {value.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {value.description}
                  </p>
                </div>
              </StableReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
