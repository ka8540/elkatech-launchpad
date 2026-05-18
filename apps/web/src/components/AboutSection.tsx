import { Heart, Users, HandshakeIcon, Target } from "lucide-react";
import StableReveal from "@/components/StableReveal";

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
      className="py-24 md:py-32 bg-steel-gradient relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-px section-divider" />
      <div className="pointer-events-none absolute inset-0 ambient-surface-left" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Content */}
          <div>
            <StableReveal variant="section">
              <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
                About Elkatech
              </span>
            </StableReveal>

            <StableReveal variant="section" delay={0.08}>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
                Partners Beyond <span className="text-gradient-accent">the Purchase</span>
              </h2>
            </StableReveal>

            <StableReveal variant="section" delay={0.16}>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
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
          </div>

          {/* Right Column - Values */}
          <div className="grid sm:grid-cols-2 gap-4">
            {values.map((value, index) => (
              <StableReveal
                key={value.title}
                variant="card"
                delay={Math.min(index * 0.06, 0.24)}
                className="group relative isolate overflow-hidden rounded-xl border border-border bg-card p-5 transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-blue-400/40 hover:shadow-[0_20px_70px_rgba(14,165,233,0.12)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 transition-[background-color,box-shadow] duration-300 group-hover:bg-accent/20 group-hover:shadow-glow">
                    <value.icon className="w-5 h-5 text-accent" />
                  </div>

                  <h3 className="font-display font-semibold text-foreground mb-1.5">
                    {value.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
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
