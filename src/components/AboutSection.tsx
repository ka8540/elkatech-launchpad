import { motion } from "framer-motion";
import { Heart, Users, HandshakeIcon, Target } from "lucide-react";

const values = [
  {
    icon: Heart,
    title: "Customer-First Philosophy",
    description:
      "Every decision we make starts with understanding your business needs and challenges.",
  },
  {
    icon: Users,
    title: "Long-term Relationships",
    description:
      "We're not just selling machinery — we're building partnerships that last for years.",
  },
  {
    icon: HandshakeIcon,
    title: "Honest Guidance",
    description:
      "We provide straightforward advice to help you make informed decisions for your business.",
  },
  {
    icon: Target,
    title: "Reliable Support",
    description:
      "Our commitment extends beyond the sale — we stand by you through every step.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const AboutSection = () => {
  return (
    <section
      id="about"
      className="py-24 md:py-32 bg-steel-gradient relative overflow-hidden"
    >
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Content */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            layout={false}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              About Elkatech
            </span>

            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Partners Beyond <span className="text-gradient-accent">the Purchase</span>
            </h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p className="text-lg">
                Elkatech is an Ahmedabad-based importer, wholesaler, and distributor
                of industrial printing and signage machinery. We serve printing
                businesses, advertising agencies, fabrication shops, and
                manufacturers across India.
              </p>
              <p>
                We understand that investing in industrial machinery is a
                significant decision for your business. That's why we focus on
                building trust through honest guidance, transparent communication,
                and reliable after-sales support.
              </p>
              <p>
                Our commitment is simple: to be the partner you can depend on — not
                just for a single purchase, but for your business journey ahead.
              </p>
            </div>
          </motion.div>

          {/* Right Column - Values */}
            <motion.div
              className="grid sm:grid-cols-2 gap-4"
              layout
              transition={{ layout: { duration: 0.35, ease: "easeOut" } }}
            >
              {values.map((value) => (
                <motion.div
                  key={value.title}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{
                    duration: 0.55,
                    ease: "easeOut",
                    layout: { duration: 0.35, ease: "easeOut" },
                  }}
                  style={{ willChange: "transform, opacity" }}
                  className="group p-5 rounded-xl bg-card border border-border hover:border-accent/30 hover:shadow-soft transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors duration-300">
                    <value.icon className="w-5 h-5 text-accent" />
                  </div>

                  <h3 className="font-display font-semibold text-foreground mb-1.5">
                    {value.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

        </div>
      </div>
    </section>
  );
};

export default AboutSection;
