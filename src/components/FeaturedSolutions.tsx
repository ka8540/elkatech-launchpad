import { motion, type Variants } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";


const solutionRoutes: Record<string, string> = {
  "Solvent & Eco-Solvent Printers": "/solvent-printers",
  "UV Printers": "/uv-printers",
  "Laser Cutting Machines": "/laser-cutting-machines",
  "Lamination Machines": "/lamination-machines",
  "Desktop UV Printer": "/desktop-uv-printer",
  "Inject Printer": "/inject-printer",
  "Flatbed UV Printer": "/flatbed-uv-printer",
};


const solutions = [
  {
    title: "Solvent & Eco-Solvent Printers",
    description: "High-performance wide-format printing solutions for outdoor signage, banners, and vehicle wraps.",
    image: "images/Solvent.png",
  },
  {
    title: "UV Printers",
    description: "Versatile roll-to-roll and flatbed UV printing for rigid and flexible substrates.",
    image: "https://img.freepik.com/premium-photo/view-beautiful-digital-uv-printing-machine_994615-885.jpg",
  },
  {
    title: "Laser Cutting Machines",
    description: "High-precision laser engraving and cutting for industrial and commercial applications.",
    image: "https://www.re-thinkingthefuture.com/wp-content/uploads/2025/06/gp5043-How-Fiber-Laser-Cutting-Machines-Are-Revolutionizing-Metal-Furniture-Manufacturing-web.jpg?w=999",
  },
  {
    title: "Lamination Machines",
    description: "Industrial lamination machines for print finishing, protection, and surface enhancement.",
    image: "images/Laminatiom.png",
  },
  {
    title: "Desktop UV Printer",
    description: "Compact UV printers ideal for personalized printing on phone cases, gifts, tiles, and small rigid objects.",
    image: "images/Desktop_Image.png",
  },
  {
    title: "Inject Printer",
    description: "High-speed inkjet printers for commercial printing, signage, and large-format production.",
    image: "images/inject.png",
  },
  {
    title: "Flatbed UV Printer",
    description: "Industrial flatbed UV printer designed for direct printing on rigid materials such as acrylic, glass, wood, metal, PVC, and boards.",
    image: "images/Flatbed.png",
  }


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
  const navigate = useNavigate();
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
          {solutions.map((solution) => {
            const to = solutionRoutes[solution.title];

            return (
              <motion.div
                key={solution.title}
                variants={itemVariants}
                role="button"
                tabIndex={0}
                onClick={() => to && navigate(to)}
                onKeyDown={(e) => {
                  if (!to) return;
                  if (e.key === "Enter" || e.key === " ") navigate(to);
                }}
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

                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </motion.div>
            );
          })}


        </motion.div>
      </div>
    </section>
  );
};

export default FeaturedSolutions;
