import { motion } from "framer-motion";
import { Warehouse, Package, Truck, Shield, CheckCircle } from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Stock Availability",
    description: "Ready inventory of popular machinery models and spare parts for quick delivery.",
  },
  {
    icon: Shield,
    title: "Secure Storage",
    description: "Climate-controlled warehouse ensuring your machinery is protected until dispatch.",
  },
  {
    icon: Truck,
    title: "Efficient Dispatch",
    description: "Streamlined logistics with road transport across India for timely delivery.",
  },
];

const InfrastructureSection = () => {
  return (
    <section id="infrastructure" className="py-24 md:py-32 bg-steel-gradient relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Warehouse Visual */}
            <div className="aspect-[4/3] rounded-2xl bg-navy-gradient overflow-hidden relative">
              {/* Abstract warehouse representation */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Warehouse className="w-20 h-20 text-accent mx-auto mb-4 opacity-50" />
                  <p className="text-steel-medium text-sm">Warehouse Facility</p>
                  <p className="text-primary-foreground/60 text-xs mt-1">Ahmedabad, Gujarat</p>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-accent/10 blur-2xl" />
              <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-accent/5 blur-xl" />
              
              {/* Grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]" />
            </div>

            {/* Stats overlay */}
            <motion.div
              className="absolute -bottom-6 -right-6 bg-card rounded-xl p-5 shadow-card border border-border"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">Road Transport</p>
                  <p className="text-sm text-muted-foreground">Pan-India Delivery</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Content */}
          <motion.div
            initial={{ opacity: 0, x: 25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              Infrastructure
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Our Warehouse &{" "}
              <span className="text-gradient-accent">Facilities</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Based in Ahmedabad, Gujarat, our infrastructure is designed to ensure smooth operations, secure storage, and efficient delivery across India.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1, duration: 0.4 }}
                  className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:border-accent/30 transition-all duration-300"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default InfrastructureSection;
