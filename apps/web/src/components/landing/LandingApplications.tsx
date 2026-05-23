import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { APPLICATIONS } from "@/components/landing/landingData";
import LandingSectionHeading from "@/components/landing/LandingSectionHeading";

const ease = [0.22, 1, 0.36, 1] as const;

const LandingApplications = () => {
  const reduce = useReducedMotion();

  return (
    <section
      id="applications"
      className="relative scroll-mt-24 overflow-hidden py-20 md:py-28"
      style={{ background: "var(--lp-bg)" }}
    >
      <div className="lp-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">
        <LandingSectionHeading
          eyebrow="Industrial Applications"
          title="One supplier across the production line"
          description="From outdoor advertising to fabrication and personalised goods, ElkaTech machinery powers the work that signage and print businesses sell every day."
        />

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border sm:grid-cols-2 lg:grid-cols-3"
          style={{ borderColor: "var(--lp-line)", background: "var(--lp-line)" }}
        >
          {APPLICATIONS.map((a, i) => (
            <motion.div
              key={a.title}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: reduce ? 0.2 : 0.5, ease, delay: reduce ? 0 : Math.min(i * 0.05, 0.25) }}
              className="group relative p-7 transition-colors"
              style={{ background: "var(--lp-panel)" }}
            >
              <span className="lp-mono text-xs" style={{ color: "var(--lp-accent)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="lp-display mt-3 text-xl font-bold" style={{ color: "var(--lp-ink)" }}>
                {a.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--lp-faint)" }}>
                {a.description}
              </p>
              <ArrowRight
                className="mt-5 h-4 w-4 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                style={{ color: "var(--lp-accent)" }}
              />
              <span
                className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                style={{ background: "var(--lp-accent)" }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingApplications;
