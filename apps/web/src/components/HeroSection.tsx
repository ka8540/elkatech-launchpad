import { motion, type Variants } from "framer-motion";
import { ArrowRight, MessageCircle, Phone, Shield, Building2, CheckCircle } from "lucide-react";
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
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-steel-gradient" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm font-medium text-muted-foreground shadow-soft">
              <Building2 className="w-4 h-4 text-accent" />
              Industrial Machinery Distributor
            </span>
          </motion.div>

          {/* Main Tagline - Trust-focused */}
          <motion.h1
            variants={itemVariants}
            className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6"
          >
            Built on Trust.{" "}
            <span className="text-gradient-accent">Grown with You.</span>
          </motion.h1>

          {/* Emotional Supporting Line */}
          <motion.p
            variants={itemVariants}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-4 leading-relaxed font-light"
          >
            Your success is our commitment.
          </motion.p>

          {/* Business Description */}
          <motion.p
            variants={itemVariants}
            className="text-base md:text-lg text-muted-foreground/80 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Importer and distributor of industrial printing, signage, CNC, laser, and digital cutting machinery for commercial and industrial use across India.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            {/* Call Button */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="group min-w-[140px]"
            >
              <a href="tel:+917203033486">
                <Phone className="mr-2 w-4 h-4" />
                Call Now
              </a>
            </Button>

            {/* WhatsApp Button */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="group min-w-[160px]"
            >
              <a
                href="https://wa.me/917203033486"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 w-4 h-4" />
                WhatsApp Us
              </a>
            </Button>
          </motion.div>


          {/* Trust Highlights */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-8 border-t border-border/50"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-card/50 border border-border/50">
              <Shield className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Professional B2B Solutions</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-card/50 border border-border/50">
              <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Transparent Business Practices</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-card/50 border border-border/50">
              <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Long-term Customer Support</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2"
          animate={{ y: [0, 4, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <div className="w-1 h-2 bg-accent rounded-full" />
        </motion.div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
