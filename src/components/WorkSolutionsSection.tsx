import { motion, type Variants } from "framer-motion";
import { ArrowRight, Printer, Layers, Cpu, Scissors, Sparkles, Type, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  {
    icon: Printer,
    title: "Solvent & Eco-Solvent Printing Solutions",
    description: "Wide-format printing for outdoor advertising, vehicle wraps, and flex banners.",
    applications: ["Flex Banners", "Vehicle Graphics", "Outdoor Signage", "Backlit Displays"],
    industries: ["Advertising Agencies", "Print Houses", "Signage Companies"],
  },
  {
    icon: Layers,
    title: "UV Printing Solutions (RTR & Flatbed)",
    description: "Versatile UV printing on rigid and flexible materials with instant curing.",
    applications: ["Acrylic Printing", "PVC Boards", "Glass & Metal", "Packaging Prototypes"],
    industries: ["Interior Designers", "Signage Manufacturers", "Packaging Industry"],
  },
  {
    icon: Cpu,
    title: "CNC Routing Solutions",
    description: "Precision cutting and engraving for wood, acrylic, aluminum, and composites.",
    applications: ["ACP Cutting", "Wood Carving", "3D Letters", "Furniture Components"],
    industries: ["Fabrication Shops", "Furniture Manufacturers", "Sign Makers"],
  },
  {
    icon: Scissors,
    title: "Laser Engraving & Cutting Solutions",
    description: "High-precision laser processing for intricate designs and industrial cutting.",
    applications: ["Acrylic Cutting", "Wood Engraving", "Metal Marking", "Fabric Cutting"],
    industries: ["Gift & Trophy Makers", "Industrial Manufacturers", "Textile Industry"],
  },
  {
    icon: Ruler,
    title: "Digital Cutting Solutions",
    description: "Automated cutting for vinyl, cardboard, foam, and flexible materials.",
    applications: ["Vinyl Cutting", "Packaging Prototyping", "Sticker Cutting", "Foam Cutting"],
    industries: ["Sign Shops", "Packaging Companies", "Craft & Print Shops"],
  },
  {
    icon: Sparkles,
    title: "Lamination & Finishing Solutions",
    description: "Professional lamination for print protection, enhancement, and durability.",
    applications: ["Hot & Cold Lamination", "UV Coating", "Photo Finishing", "Document Protection"],
    industries: ["Print Houses", "Photo Studios", "Commercial Printers"],
  },
  {
    icon: Type,
    title: "Letter Bending Solutions",
    description: "CNC channel letter bending for professional signage fabrication.",
    applications: ["Channel Letters", "3D Signage", "Metal Letters", "LED Signs"],
    industries: ["Signage Manufacturers", "Advertising Agencies", "Fabricators"],
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const WorkSolutionsSection = () => {
  return (
    <section id="work" className="py-24 md:py-32 bg-navy-gradient relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
            Work & Solutions
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
            Complete Industrial{" "}
            <span className="text-accent">Machinery Solutions</span>
          </h2>
          <p className="text-steel-medium text-lg">
            Explore our comprehensive range of printing, signage, and fabrication equipment designed for commercial and industrial applications.
          </p>
        </motion.div>

        {/* Categories Grid */}
        <motion.div
          className="grid md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          {categories.map((category) => (
            <motion.div
              key={category.title}
              variants={itemVariants}
              className="group bg-primary-foreground/5 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-primary-foreground/10 hover:border-accent/30 hover:bg-primary-foreground/10 transition-all duration-300"
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/30 transition-colors duration-300">
                  <category.icon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold text-primary-foreground mb-1">
                    {category.title}
                  </h3>
                  <p className="text-steel-medium text-sm leading-relaxed">
                    {category.description}
                  </p>
                </div>
              </div>

              {/* Applications */}
              <div className="mb-4">
                <p className="text-xs text-steel-medium uppercase tracking-wider mb-2">
                  Typical Applications
                </p>
                <div className="flex flex-wrap gap-2">
                  {category.applications.map((app) => (
                    <span
                      key={app}
                      className="px-2.5 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground/80 text-xs"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>

              {/* Industries */}
              <div className="mb-5">
                <p className="text-xs text-steel-medium uppercase tracking-wider mb-2">
                  Industries Served
                </p>
                <div className="flex flex-wrap gap-2">
                  {category.industries.map((ind) => (
                    <span
                      key={ind}
                      className="px-2.5 py-1 rounded-full border border-accent/30 text-accent text-xs"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <Button
                variant="outline"
                size="sm"
                className="group/btn border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:border-accent/50"
              >
                Enquire for Details
                <ArrowRight className="ml-2 w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WorkSolutionsSection;
