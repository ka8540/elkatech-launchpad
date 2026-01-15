import { motion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const solutions = [
  {
    title: "Solvent & Eco-Solvent Printers",
    description: "High-performance wide-format printing solutions for outdoor signage, banners, and vehicle wraps.",
    image: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=600&h=400&fit=crop&q=80",
  },
  {
    title: "UV Printers",
    description: "Versatile roll-to-roll and flatbed UV printing for rigid and flexible substrates.",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop&q=80",
  },
  {
    title: "CNC Routers",
    description: "Precision routing and cutting for wood, acrylic, aluminum, and composite materials.",
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=600&h=400&fit=crop&q=80",
  },
  {
    title: "Laser Cutting Machines",
    description: "High-precision laser engraving and cutting for industrial and commercial applications.",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600&h=400&fit=crop&q=80",
  },
  {
    title: "Lamination Machines",
    description: "Professional lamination and finishing equipment for print protection and enhancement.",
    image: "https://images.unsplash.com/photo-1586864387789-628af9feed72?w=600&h=400&fit=crop&q=80",
  },
  {
    title: "Letter Bending Solutions",
    description: "CNC channel letter bending machines for signage and fabrication shops.",
    image: "https://images.unsplash.com/photo-1563694983011-6f4d90358083?w=600&h=400&fit=crop&q=80",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const FeaturedSolutions = () => {
  return (
    <section id="solutions" className="py-24 md:py-32 bg-background relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/3 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Our Solutions
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Industrial Machinery{" "}
            <span className="text-gradient-accent">Categories</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Complete range of printing, signage, and fabrication equipment for your business needs.
          </p>
        </motion.div>

        {/* Solutions Grid */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {solutions.map((solution) => (
            <motion.div
              key={solution.title}
              variants={itemVariants}
              className="group relative bg-card rounded-2xl overflow-hidden border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-card cursor-pointer"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={solution.image} 
                  alt={solution.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="font-display text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  {solution.title}
                  <ArrowUpRight className="w-4 h-4 text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {solution.description}
                </p>
              </div>

              {/* Hover gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedSolutions;
