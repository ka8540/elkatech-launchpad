import { MessageSquare, HeartHandshake, Lightbulb, Clock, Building, CheckCircle } from "lucide-react";
import StableReveal from "@/components/StableReveal";
import SectionEyebrow from "@/components/SectionEyebrow";
import ScrollReveal from "@/components/ScrollReveal";

const reasons = [
  {
    icon: MessageSquare,
    title: "Transparent Communication",
    description: "Clear pricing, honest timelines, and straightforward advice. No hidden surprises.",
  },
  {
    icon: HeartHandshake,
    title: "Dependable After-Sales Mindset",
    description: "Our relationship doesn't end at the sale. We're here for the long run.",
  },
  {
    icon: Lightbulb,
    title: "Practical, Business-Oriented Solutions",
    description: "We recommend what works for your business, not just what we stock.",
  },
  {
    icon: Clock,
    title: "Long-Term Support Focus",
    description: "Building partnerships that grow with your business over time.",
  },
  {
    icon: Building,
    title: "Suitable for SMBs",
    description: "Solutions and support tailored for small and mid-scale businesses.",
  },
  {
    icon: CheckCircle,
    title: "Trusted Sourcing",
    description: "We work with reputable international brands known for quality.",
  },
];

const WhyElkatech = () => {
  return (
    <section id="why-us" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-x-0 top-0 h-px section-divider" />
      <div className="pointer-events-none absolute inset-0 ambient-surface-right" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <ScrollReveal variant="rise" className="flex justify-center" distance={18}>
            <SectionEyebrow>Why Choose Us</SectionEyebrow>
          </ScrollReveal>
          <ScrollReveal variant="blur-rise" delay={0.08} distance={28}>
            <h2 className="mb-4 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              Reliability You Can{" "}
              <span className="text-gradient-accent">Count On</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="rise" delay={0.16} distance={22}>
            <p className="text-lg text-muted-foreground">
              We believe in building trust through actions, not just words. Here's what sets us apart.
            </p>
          </ScrollReveal>
        </div>

        {/* Reasons Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((reason, index) => (
            <StableReveal
              key={reason.title}
              variant="card"
              delay={Math.min(index * 0.06, 0.24)}
              className="group relative isolate flex items-start gap-4 overflow-hidden rounded-xl border border-border bg-card p-6 transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-blue-400/40 hover:shadow-[0_20px_70px_rgba(14,165,233,0.12)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Icon */}
              <div className="relative z-10 flex-shrink-0 w-11 h-11 rounded-lg bg-navy-gradient flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
                <reason.icon className="w-5 h-5 text-accent" />
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="font-display text-base font-semibold text-foreground mb-1.5">
                  {reason.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {reason.description}
                </p>
              </div>
            </StableReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyElkatech;
