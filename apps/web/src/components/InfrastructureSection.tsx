import { motion } from "framer-motion";
import {
  Package,
  Truck,
  Shield,
  CheckCircle,
  Building2,
  BadgeCheck,
  CreditCard,
  Banknote,
  Receipt,
} from "lucide-react";

const features = [
  {
    icon: Package,
    title: "Stock Availability",
    description: "Ready inventory of popular machinery models and spare parts for quick delivery.",
  },
  {
    icon: Shield,
    title: "Secure Storage",
    description: "Organized storage & handling to protect machinery until dispatch.",
  },
  {
    icon: Truck,
    title: "Efficient Dispatch",
    description: "Road transport across India for reliable, timely delivery.",
  },
];

const factsheet = {
  basic: [
    ["Nature of Business", "Wholesaler / Distributor"],
    [
      "Additional Business",
      "Factory / Manufacturing, Retail Business, Import, Export, Office / Sale Office, Supplier of Services, Warehouse / Depot, Recipient of Goods or Services",
    ],
    ["Company CEO", "Jayesh Kharadi"],
    ["Total Number of Employees", "11 to 25 People"],
    ["GST Registration Date", "04-08-2017"],
    ["Legal Status of Firm", "Partnership"],
    ["Annual Turnover", "₹ 1.5 – 5 Cr"],
    [
      "GST Partner Name",
      "Jayesh Dhanjibhai Kharadi, Vishakha Jayesh Kharadi",
    ],
  ] as Array<[string, string]>,

  statutory: [
    ["Import Export Code (IEC)", "AAPFV0858C"],
    ["TAN No.", "AHMV0*****"],
    ["GST No.", "24AAPFV0858C1Z4"],
  ] as Array<[string, string]>,

  paymentModes: ["Credit Card", "Cash", "Cheque", "DD"],
  shipmentMode: "By Road",

  mission:
    "To provide best in the industry printers to customers, with increasing value of their money. To innovate, implement and optimize our business in order to continuously improve and exceed customer expectation on quality and cost.",
  vision:
    "To become a benchmark in the signage industries by providing state-of-the-art printing technologies. Our vision is to become a leading signage company in India. The company will establish itself as a strategic supplier of Digital Printers by delighting its customers and satisfying its service.",
  goals:
    "We want to become a major diversified, transnational, integrated Company with national leadership and a strong environment conscience. Consistent with our motto and the vision, the company will strive to further expands its product base by providing products with continuous improvements in existing range with higher efficiency.",
};

function FactRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border/60 last:border-b-0">
      <div className="col-span-5 text-sm text-muted-foreground">{k}</div>
      <div className="col-span-7 text-sm text-foreground">{v}</div>
    </div>
  );
}

const InfrastructureSection = () => {
  return (
    <section
      id="infrastructure"
      className="py-24 md:py-32 bg-steel-gradient relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid-pattern-sm" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        {/* ✅ TOP: 2-column layout only for image + features */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: image */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-2xl bg-navy-gradient overflow-hidden relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden relative">
                <img
                  src="/images/elkatech.png"
                  alt="Elkatech Warehouse Facility, Ahmedabad, Gujarat"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>

              <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-accent/10 blur-2xl" />
              <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-accent/5 blur-xl" />
              <div className="absolute inset-0 bg-grid-pattern-light" />
            </div>

            {/* overlay stat */}
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
                  <p className="font-display font-semibold text-foreground">Shipment Mode</p>
                  <p className="text-sm text-muted-foreground">{factsheet.shipmentMode}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: intro + feature cards */}
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
              Our Warehouse & <span className="text-gradient-accent">Facilities</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Based in Ahmedabad, Gujarat, our infrastructure supports smooth operations, secure
              storage, and efficient delivery across India.
            </p>

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

        {/* ✅ BOTTOM: full width content AFTER the 2 columns */}
        <div className="mt-16">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border bg-card p-6 md:p-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-accent" />
              <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                Factsheet
              </h3>
            </div>

            {/* ✅ half-half grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="rounded-2xl border bg-background overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-accent" />
                  <p className="text-sm font-semibold text-foreground">Basic Information</p>
                </div>
                <div className="divide-y">
                  {factsheet.basic.map(([k, v]) => (
                    <FactRow key={k} k={k} v={v} />
                  ))}
                </div>
              </div>

              {/* Statutory + Payment/Shipment */}
              <div className="space-y-6">
                <div className="rounded-2xl border bg-background overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-accent" />
                    <p className="text-sm font-semibold text-foreground">Statutory Profile</p>
                  </div>
                  <div className="divide-y">
                    {factsheet.statutory.map(([k, v]) => (
                      <FactRow key={k} k={k} v={v} />
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-background overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-accent" />
                    <p className="text-sm font-semibold text-foreground">
                      Packaging / Payment Details
                    </p>
                  </div>

                  <div className="px-4 py-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Payment Mode
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {factsheet.paymentModes.map((m) => (
                        <span
                          key={m}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/30 border border-border text-xs text-foreground"
                        >
                          {m === "Credit Card" && <CreditCard className="w-3.5 h-3.5 text-accent" />}
                          {m === "Cash" && <Banknote className="w-3.5 h-3.5 text-accent" />}
                          {(m === "Cheque" || m === "DD") && (
                            <CheckCircle className="w-3.5 h-3.5 text-accent" />
                          )}
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mission / Vision / Goals -> full width, AFTER half-half */}
            <div className="mt-8 rounded-2xl border bg-background p-5 md:p-6">
              <p className="text-sm font-semibold text-foreground mb-3">Our Mission • Vision • Goals</p>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  <span className="text-foreground font-semibold">Mission:</span> {factsheet.mission}
                </p>
                <p>
                  <span className="text-foreground font-semibold">Vision:</span> {factsheet.vision}
                </p>
                <p>
                  <span className="text-foreground font-semibold">Goals:</span> {factsheet.goals}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default InfrastructureSection;
