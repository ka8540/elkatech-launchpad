import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, Boxes, Check, Handshake, ShieldCheck, Truck } from "lucide-react";
import LandingSectionHeading from "@/components/landing/LandingSectionHeading";

const ease = [0.22, 1, 0.36, 1] as const;

const STRENGTHS = [
  {
    icon: Boxes,
    title: "Importer & wholesaler",
    description:
      "Direct sourcing of trusted international brands means sharper pricing and genuine machines — not grey-market risk.",
  },
  {
    icon: Handshake,
    title: "Honest machine matching",
    description:
      "We recommend the right machine for your media and volume, even when that means a smaller sale.",
  },
  {
    icon: Truck,
    title: "Pan-India dispatch",
    description:
      "Crated, insured logistics with clear timelines and coordination from our floor to yours.",
  },
  {
    icon: ShieldCheck,
    title: "Dependable after-sales",
    description:
      "Genuine parts, inks and responsive support that protect your uptime long after installation.",
  },
];

const GUARANTEES = [
  "On-site installation & operator training",
  "Genuine spare parts & ink supply",
  "Demonstrations before you commit",
  "7+ years of industry relationships",
  "Support across 10+ machine brands",
];

const LandingWhyChoose = () => {
  const reduce = useReducedMotion();

  return (
    <section
      id="strengths"
      className="relative scroll-mt-24 py-20 md:py-28"
      style={{ background: "var(--lp-bg-2)" }}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <LandingSectionHeading
              eyebrow="Why ElkaTech"
              title="A machinery partner, not just a vendor"
              description="ElkaTech is the rebranded identity of V J Enterprise — a name printers and signage houses across India have relied on for years."
            />

            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {STRENGTHS.map((s, i) => (
                <motion.div
                  key={s.title}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: reduce ? 0.2 : 0.5, ease, delay: reduce ? 0 : i * 0.08 }}
                >
                  <span
                    className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border"
                    style={{ borderColor: "var(--lp-line)", background: "var(--lp-panel)" }}
                  >
                    <s.icon className="h-5 w-5" style={{ color: "var(--lp-accent)" }} />
                  </span>
                  <h3 className="lp-display text-lg font-bold" style={{ color: "var(--lp-ink)" }}>
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--lp-faint)" }}>
                    {s.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Guarantee panel — graphite stage */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: reduce ? 0.3 : 0.7, ease }}
            className="lp-grain relative overflow-hidden rounded-3xl border p-8 md:p-10"
            style={{
              borderColor: "rgba(241,239,233,0.12)",
              background:
                "radial-gradient(120% 80% at 80% 0%, var(--lp-graphite-2), var(--lp-graphite) 75%)",
            }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(210,130,63,0.25), transparent 65%)" }}
            />
            <span className="lp-mono text-[11px] uppercase tracking-[0.24em]" style={{ color: "#d2823f" }}>
              The ElkaTech promise
            </span>
            <h3 className="lp-display mt-4 text-2xl font-extrabold leading-tight" style={{ color: "#f1efe9" }}>
              Equipment that keeps earning
            </h3>
            <ul className="mt-7 space-y-4">
              {GUARANTEES.map((g, i) => (
                <motion.li
                  key={g}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: 14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: reduce ? 0.2 : 0.45, ease, delay: reduce ? 0 : 0.1 + i * 0.07 }}
                  className="flex items-start gap-3"
                >
                  <span
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(210,130,63,0.16)" }}
                  >
                    <Check className="h-3 w-3" style={{ color: "#d2823f" }} />
                  </span>
                  <span className="text-sm leading-relaxed" style={{ color: "rgba(241,239,233,0.82)" }}>
                    {g}
                  </span>
                </motion.li>
              ))}
            </ul>
            <div
              className="mt-8 flex items-center gap-3 border-t pt-6"
              style={{ borderColor: "rgba(241,239,233,0.1)" }}
            >
              <BadgeCheck className="h-8 w-8" style={{ color: "#d2823f" }} />
              <p className="text-sm" style={{ color: "rgba(241,239,233,0.7)" }}>
                ELKATECH INDIA PRIVATE LIMITED · Ahmedabad, Gujarat
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LandingWhyChoose;
