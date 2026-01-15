import { motion } from "framer-motion";
import { ShieldCheck, HeartHandshake, Clock, MessageSquare } from "lucide-react";

const reasons = [
  {
    icon: ShieldCheck,
    title: "Trustworthy Sourcing",
    description:
      "We partner with verified manufacturers and suppliers to ensure every product meets stringent quality standards.",
  },
  {
    icon: HeartHandshake,
    title: "Professional Support",
    description:
      "Dedicated team of experts ready to assist with technical queries, installation guidance, and after-sales service.",
  },
  {
    icon: Clock,
    title: "Long-term Reliability",
    description:
      "Built for durability and performance. Our solutions are designed to deliver consistent results over time.",
  },
  {
    icon: MessageSquare,
    title: "Transparent Communication",
    description:
      "Clear pricing, honest timelines, and open dialogue. We believe trust is built through transparency.",
  },
];

const WhyElkatech = () => {
  return (
    <section id="why-us" className="py-24 md:py-32 bg-navy-gradient relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
            Where Technology{" "}
            <span className="text-accent">Meets Trust</span>
          </h2>
          <p className="text-steel-medium text-lg">
            We're committed to building lasting partnerships through quality,
            reliability, and exceptional service.
          </p>
        </motion.div>

        {/* Reasons Grid */}
        <motion.div
          className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.title}
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                },
              }}
              className="group flex gap-4 p-6 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 hover:bg-primary-foreground/10 hover:border-accent/30 transition-all duration-300"
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors duration-300">
                <reason.icon className="w-6 h-6 text-accent" />
              </div>

              {/* Content */}
              <div>
                <h3 className="font-display text-lg font-semibold text-primary-foreground mb-2">
                  {reason.title}
                </h3>
                <p className="text-steel-medium text-sm leading-relaxed">
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
