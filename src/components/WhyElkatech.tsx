import { motion } from "framer-motion";
import { MessageSquare, HeartHandshake, Lightbulb, Clock, Building, CheckCircle } from "lucide-react";

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
      <div className="absolute top-0 left-0 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Reliability You Can{" "}
            <span className="text-gradient-accent">Count On</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            We believe in building trust through actions, not just words. Here's what sets us apart.
          </p>
        </motion.div>

        {/* Reasons Grid */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 },
            },
          }}
        >
          {reasons.map((reason) => (
            <motion.div
              key={reason.title}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              className="group flex items-start gap-4 p-6 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-soft transition-all duration-300"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-navy-gradient flex items-center justify-center group-hover:shadow-glow transition-shadow duration-300">
                <reason.icon className="w-5 h-5 text-accent" />
              </div>

              {/* Content */}
              <div>
                <h3 className="font-display text-base font-semibold text-foreground mb-1.5">
                  {reason.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {reason.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WhyElkatech;
