import { motion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  {
    title: "Solvent & Eco-Solvent Printers",
    description:
      "Wide-format printing for outdoor advertising, flex banners, vinyl, and vehicle wraps.",
    applications: ["Flex Banners", "Vinyl Printing", "Outdoor Signage", "Vehicle Wraps"],
    industries: ["Advertising Agencies", "Print Houses", "Signage Companies"],
    image: "images/Solvent.png",
    href: "/solvent-printers",
  },
  {
    title: "UV Printers (Roll-to-Roll / Mesh Belt)",
    description:
      "UV printing for flexible media with instant curing—ideal for signage and specialty applications.",
    applications: ["Backlit Media", "Flex & Vinyl", "Wall Graphics", "Promotional Prints"],
    industries: ["Signage Manufacturers", "Commercial Printers", "Branding Agencies"],
    image:
      "https://img.freepik.com/premium-photo/view-beautiful-digital-uv-printing-machine_994615-885.jpg",
    href: "/uv-printers",
  },
  {
    title: "Laser Engraving & Cutting Machines (CO2)",
    description:
      "High-precision CO2 laser cutting & engraving for acrylic, MDF, wood, fabric, and more.",
    applications: ["Acrylic Cutting", "Wood Engraving", "Signage Components", "Fabric Cutting"],
    industries: ["Gift & Trophy Makers", "Sign Makers", "Industrial Manufacturers"],
    image:
      "https://www.re-thinkingthefuture.com/wp-content/uploads/2025/06/gp5043-How-Fiber-Laser-Cutting-Machines-Are-Revolutionizing-Metal-Furniture-Manufacturing-web.jpg?w=999",
    href: "/laser-cutting-machines",
  },
  {
    title: "Lamination Machines (Cold / Heat)",
    description:
      "Print finishing and protection for banners, posters, and signage—durability that lasts.",
    applications: ["Cold Lamination", "Heat Lamination", "Poster Protection", "Print Finishing"],
    industries: ["Print Houses", "Photo Studios", "Commercial Printers"],
    image: "images/Laminatiom.png",
    href: "/lamination-machines",
  },
  {
    title: "Desktop UV Printer (A3)",
    description:
      "Compact UV printer for personalized printing on rigid items—phone cases, gifts, tiles, bottles.",
    applications: ["Phone Cases", "Tiles", "Glass Bottles", "Acrylic & Wood"],
    industries: ["Gift Shops", "Custom Printing", "Small Businesses"],
    image: "images/Desktop_Image.png",
    href: "/desktop-uv-printer",
  },
  {
    title: "Giant Format Inkjet Printer (5M)",
    description:
      "High-speed, large-width inkjet printing for banners, hoardings, and large commercial jobs.",
    applications: ["Hoardings", "Banners", "Outdoor Branding", "Large Format Signage"],
    industries: ["Outdoor Advertising", "Commercial Printers", "Signage Companies"],
    image: "images/inject.png",
    href: "/inject-printer",
  },
  {
    title: "UV Flatbed Printer (2513)",
    description:
      "Industrial flatbed UV printing on rigid substrates like acrylic, glass, PVC, wood, metal, boards.",
    applications: ["Acrylic Boards", "PVC Boards", "Glass Printing", "Wood & Metal Printing"],
    industries: ["Interior Fabrication", "Signage Manufacturers", "Acrylic Fabricators"],
    image: "images/Flatbed.png",
    href: "/flatbed-uv-printer",
  },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
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

const WorkSolutionsSection = () => {
  return (
    <section id="work" className="py-24 md:py-32 bg-navy-gradient relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/3 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent text-sm font-medium mb-4">
            Work & Solutions
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Complete Industrial <span className="text-accent">Machinery Solutions</span>
          </h2>
          <p className="text-white/70 text-lg">
            Explore our machinery categories tailored for commercial printing, signage, and
            fabrication workflows.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
        >
          {categories.map((category) => (
            <motion.div
              key={category.title}
              variants={itemVariants}
              className="group bg-white/5 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-accent/30 hover:bg-white/10 transition-all duration-300"
            >
              <div className="relative h-72 md:h-80 overflow-hidden">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(215,60%,8%)] via-[hsl(215,60%,8%)]/40 to-transparent" />
              </div>

              <div className="p-6 md:p-8">
                <div className="mb-4">
                  <h3 className="font-display text-xl font-semibold text-white mb-2">
                    {category.title}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {category.description}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-white/60 uppercase tracking-wider mb-2">
                    Typical Applications
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.applications.map((app) => (
                      <span
                        key={app}
                        className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-xs"
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-xs text-white/60 uppercase tracking-wider mb-2">
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

                {/* CTA -> link to the category page */}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="group/btn border-white/20 bg-white/10 text-white hover:bg-white/15 hover:border-accent/50"
                >
                  <a href={category.href}>
                    Explore Products
                    <ArrowRight className="ml-2 w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                  </a>
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default WorkSolutionsSection;
