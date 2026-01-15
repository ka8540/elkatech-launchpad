import { motion, type Variants } from "framer-motion";
import { Printer, PanelTop, Wrench, ArrowUpRight } from "lucide-react";

const solutions = [
  {
    icon: Printer,
    title: "Printing Solutions",
    description:
      "Industrial-grade printing equipment and consumables for high-volume commercial operations. Quality materials that deliver consistent results.",
    features: ["Commercial Printers", "Consumables", "Maintenance Support"],
  },
  {
    icon: PanelTop,
    title: "Signage Solutions",
    description:
      "Complete signage systems for indoor and outdoor applications. From design consultation to installation support.",
    features: ["LED Signage", "Display Systems", "Custom Fabrication"],
  },
  {
    icon: Wrench,
    title: "Industrial Support & Service",
    description:
      "Comprehensive technical support and maintenance services to keep your operations running smoothly.",
    features: ["Technical Support", "Preventive Maintenance", "Spare Parts"],
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const SolutionsSection = () => {
  return (
    <section id="solutions" className="py-24 md:py-32 bg-background relative">
      {/* Section Header */}
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Our Solutions
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Industrial Solutions,{" "}
            <span className="text-gradient-accent">Engineered Right</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Comprehensive printing and signage solutions tailored for businesses
            that demand precision and reliability.
          </p>
        </motion.div>

        {/* Solutions Grid */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {solutions.map((solution) => (
            <motion.div
              key={solution.title}
              variants={itemVariants}
              className="group relative bg-card rounded-2xl p-8 border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-card cursor-pointer"
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-xl bg-navy-gradient flex items-center justify-center mb-6 group-hover:shadow-glow transition-shadow duration-300">
                <solution.icon className="w-7 h-7 text-accent" />
              </div>

              {/* Content */}
              <h3 className="font-display text-xl font-semibold text-foreground mb-3 flex items-center gap-2">
                {solution.title}
                <ArrowUpRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                {solution.description}
              </p>

              {/* Features */}
              <ul className="space-y-2">
                {solution.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Hover gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SolutionsSection;
