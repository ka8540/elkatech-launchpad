import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toPublicAsset } from "@/lib/assets";
import { SERVICE_STEPS } from "@/components/landing/landingData";
import LandingSectionHeading from "@/components/landing/LandingSectionHeading";

const ease = [0.22, 1, 0.36, 1] as const;

const LandingServiceSupport = () => {
  const reduce = useReducedMotion();

  return (
    <section
      id="service"
      className="relative scroll-mt-24 py-20 md:py-28"
      style={{ background: "var(--lp-bg-2)" }}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <LandingSectionHeading
            eyebrow="Service & Support"
            title="From first call to full production"
            description="Buying a machine is the start. Our team manages sizing, dispatch, installation and ongoing support so your investment runs reliably."
          />
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: reduce ? 0.2 : 0.5, ease }}
            className="mb-12 flex shrink-0 gap-3"
          >
            <Link
              to="/login"
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: "var(--lp-accent)" }}
            >
              Open Service Portal
            </Link>
            <a
              href="#contact"
              className="rounded-full border px-5 py-2.5 text-sm font-semibold transition-colors"
              style={{ borderColor: "var(--lp-line-strong)", color: "var(--lp-ink)" }}
            >
              Talk to us
            </a>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, filter: "blur(5px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: reduce ? 0.3 : 0.6, ease, delay: reduce ? 0 : i * 0.1 }}
              className="group flex flex-col overflow-hidden rounded-2xl border"
              style={{ background: "var(--lp-panel)", borderColor: "var(--lp-line)" }}
            >
              <div className="relative h-40 overflow-hidden" style={{ background: "var(--lp-graphite)" }}>
                <img
                  src={toPublicAsset(s.image)}
                  alt={s.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform [transition-duration:900ms] ease-out group-hover:scale-105"
                />
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(8,9,11,0.6), transparent 60%)" }}
                />
                <span
                  className="lp-mono absolute bottom-3 left-3 text-2xl font-bold"
                  style={{ color: "#f1efe9" }}
                >
                  {s.step}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="lp-display text-base font-bold" style={{ color: "var(--lp-ink)" }}>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--lp-faint)" }}>
                  {s.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: reduce ? 0.2 : 0.5, ease }}
          className="mt-8 inline-flex items-center gap-2 text-sm"
          style={{ color: "var(--lp-faint)" }}
        >
          <ArrowRight className="h-4 w-4" style={{ color: "var(--lp-accent)" }} />
          Existing customers can raise and track service requests in the portal.
        </motion.p>
      </div>
    </section>
  );
};

export default LandingServiceSupport;
