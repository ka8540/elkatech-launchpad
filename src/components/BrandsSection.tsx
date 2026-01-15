import { motion } from "framer-motion";

const brands = [
  "Mimaki",
  "Gongzheng",
  "Yueming",
  "TigerTec",
  "SAGA",
  "Dobosen",
  "Kartech",
  "Alwin",
  "Oric",
  "Lanqi",
  "INCA",
];

const BrandsSection = () => {
  return (
    <section id="brands" className="py-20 md:py-28 bg-background relative">
      <div className="container mx-auto px-4 md:px-6">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-14"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Trusted Partners
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Brands We{" "}
            <span className="text-gradient-accent">Work With</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            We work with internationally recognized brands known for reliability and performance.
          </p>
        </motion.div>

        {/* Brands Grid */}
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
        >
          {brands.map((brand) => (
            <motion.div
              key={brand}
              variants={{
                hidden: { opacity: 0, scale: 0.95 },
                visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
              }}
              className="group flex items-center justify-center h-20 md:h-24 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-soft transition-all duration-300"
            >
              <span className="font-display text-lg md:text-xl font-semibold text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                {brand}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Note */}
        <motion.p
          className="text-center text-sm text-muted-foreground mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          * Logos and brand assets are property of their respective owners.
        </motion.p>
      </div>
    </section>
  );
};

export default BrandsSection;
