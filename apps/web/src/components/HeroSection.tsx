import { motion, type Variants } from "framer-motion";
import { ArrowRight, Building2, CheckCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const trustHighlights = [
  {
    icon: Shield,
    label: "Trusted sourcing",
  },
  {
    icon: CheckCircle,
    label: "Practical machine guidance",
  },
  {
    icon: CheckCircle,
    label: "Dependable after-sales support",
  },
];

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden bg-[#050b16] pt-20"
    >
      <div className="hero-industrial-background absolute inset-0" aria-hidden="true">
        <div className="hero-industrial-glow hero-industrial-glow-primary" />
        <div className="hero-industrial-glow hero-industrial-glow-secondary" />
        <div className="hero-industrial-beam" />
        <div className="hero-industrial-grid" />
        <div className="hero-industrial-noise" />
      </div>

      <div className="container relative z-10 mx-auto px-4 md:px-6">
        <motion.div
          className="mx-auto max-w-5xl text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent shadow-soft">
              <Building2 className="h-4 w-4" />
              Industrial Printing & Signage Machinery
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl font-bold leading-tight text-white md:text-6xl lg:text-7xl"
          >
            Powering Printing Businesses with{" "}
            <span className="text-gradient-accent">Reliable Industrial Machinery</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-white/70 md:text-lg"
          >
            Elkatech supplies commercial printing, signage, and fabrication businesses with trusted
            machinery, honest guidance, and dependable after-sales support across India.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button asChild variant="cta" size="lg" className="group min-w-[180px] rounded-full">
              <a href="#work">
                Explore Solutions
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="min-w-[150px] rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#contact">Contact Us</a>
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mx-auto mt-12 grid max-w-4xl gap-4 border-t border-white/10 pt-8 sm:grid-cols-3"
          >
            {trustHighlights.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/70 backdrop-blur-sm"
              >
                <Icon className="h-4 w-4 shrink-0 text-accent" />
                <span>{label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        <motion.div
          className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/20 p-2"
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <div className="h-2 w-1 rounded-full bg-accent" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
