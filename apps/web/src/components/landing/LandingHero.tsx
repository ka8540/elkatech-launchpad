import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Headset } from "lucide-react";
import { useRef } from "react";
import { toPublicAsset } from "@/lib/assets";
import { BRANDS, CAPABILITIES, TRUST_STATS } from "@/components/landing/landingData";

// The hero is a constant graphite "stage" in both light and dark themes —
// the machine renders are shot on graphite, so a dark frame reads as the most
// premium and stays visually consistent across themes.
const COPPER = "#d2823f";
const IVORY = "#f1efe9";

const LandingHero = () => {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const imageY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 70]);
  const gridY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, 40]);
  const contentY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [0, -30]);
  const fade = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.9, 0.55]);

  const fadeUp = reduce ? { opacity: 0 } : { opacity: 0, y: 22 };
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <section
      ref={ref}
      id="top"
      className="lp-grain relative isolate min-h-[100svh] overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 78% 8%, #23262d 0%, var(--lp-graphite-2) 34%, var(--lp-graphite) 78%)",
      }}
    >
      {/* Blueprint grid */}
      <motion.div
        aria-hidden
        style={{
          y: gridY,
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "76px 76px",
          maskImage: "radial-gradient(ellipse at 60% 40%, black 28%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at 60% 40%, black 28%, transparent 80%)",
        }}
        className="pointer-events-none absolute inset-0 -z-[1]"
      />
      {/* Copper ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10%] top-[-12%] h-[640px] w-[640px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(210,130,63,0.22), transparent 62%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, var(--lp-bg))" }}
      />

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-[1200px] flex-col px-5 pb-10 pt-28 sm:px-8 lg:px-10 lg:pt-32">
        <motion.div
          style={{ y: contentY, opacity: fade }}
          className="grid flex-1 items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8"
        >
          {/* Copy */}
          <div className="max-w-xl">
            <motion.div
              initial={fadeUp}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.2 : 0.6, ease }}
              className="mb-6 inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5"
              style={{ borderColor: "rgba(241,239,233,0.16)", background: "rgba(241,239,233,0.04)" }}
            >
              <span className="relative flex h-2 w-2">
                {!reduce && (
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full"
                    style={{ background: COPPER, opacity: 0.7 }}
                  />
                )}
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COPPER }} />
              </span>
              <span
                className="lp-mono text-[10px] uppercase tracking-[0.22em] sm:text-[11px]"
                style={{ color: "rgba(241,239,233,0.72)" }}
              >
                Industrial Machinery · Ahmedabad, India
              </span>
            </motion.div>

            <motion.h1
              initial={fadeUp}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.2 : 0.7, ease, delay: reduce ? 0 : 0.08 }}
              className="lp-display text-[2.6rem] font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-[4.4rem]"
              style={{ color: IVORY }}
            >
              Machines that
              <br />
              <span style={{ color: COPPER }}>print, cut &amp; cure</span>
              <br />
              at industrial scale.
            </motion.h1>

            <motion.p
              initial={fadeUp}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.2 : 0.7, ease, delay: reduce ? 0 : 0.16 }}
              className="mt-6 max-w-lg text-base leading-relaxed sm:text-lg"
              style={{ color: "rgba(241,239,233,0.7)" }}
            >
              ElkaTech imports, wholesales and distributes printing, cutting, engraving,
              lamination and signage-production machinery — backed by honest guidance and
              dependable after-sales support across India.
            </motion.p>

            <motion.div
              initial={fadeUp}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.2 : 0.7, ease, delay: reduce ? 0 : 0.24 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <a
                href="#products"
                className="group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_20px_50px_-16px_rgba(210,130,63,0.7)] transition-transform hover:-translate-y-0.5"
                style={{ background: COPPER }}
              >
                Explore Products
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#service"
                className="group inline-flex items-center justify-center gap-2 rounded-full border px-7 py-3.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/[0.06]"
                style={{ color: IVORY, borderColor: "rgba(241,239,233,0.26)" }}
              >
                <Headset className="h-4 w-4" style={{ color: COPPER }} />
                Request Service
              </a>
            </motion.div>

            {/* Stats */}
            <motion.dl
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0.2 : 0.7, ease, delay: reduce ? 0 : 0.32 }}
              className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4"
              style={{ borderColor: "rgba(241,239,233,0.1)", background: "rgba(241,239,233,0.06)" }}
            >
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="px-4 py-4" style={{ background: "rgba(8,9,11,0.5)" }}>
                  <dd className="lp-display text-2xl font-bold" style={{ color: IVORY }}>
                    {s.value}
                  </dd>
                  <dt
                    className="mt-1 text-[10px] uppercase tracking-[0.13em]"
                    style={{ color: "rgba(241,239,233,0.55)" }}
                  >
                    {s.label}
                  </dt>
                </div>
              ))}
            </motion.dl>
          </div>

          {/* Machine stage */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduce ? 0.3 : 1, ease, delay: reduce ? 0 : 0.2 }}
            className="relative hidden lg:block"
          >
            <div
              className="relative overflow-hidden rounded-3xl border"
              style={{ borderColor: "rgba(241,239,233,0.12)" }}
            >
              <span
                className="lp-mono absolute left-4 top-4 z-20 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.2em]"
                style={{ background: "rgba(8,9,11,0.6)", color: COPPER }}
              >
                Featured · Giant Inkjet 5M
              </span>
              <motion.img
                src={toPublicAsset("images/inject.png")}
                alt="ElkaTech giant-format industrial inkjet printer"
                style={{ y: imageY, scale: 1.12 }}
                className="aspect-[4/3] w-full object-cover"
                loading="eager"
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "linear-gradient(to top, rgba(8,9,11,0.55), transparent 55%)" }}
              />
              {!reduce && (
                <div
                  className="lp-scan pointer-events-none absolute inset-x-0 top-0 h-12"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent, rgba(210,130,63,0.16), transparent)",
                  }}
                />
              )}
              <div
                className="pointer-events-none absolute bottom-0 left-0 h-1 w-full"
                style={{ background: COPPER }}
              />
            </div>
            <div
              className="lp-mono mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.18em]"
              style={{ color: "rgba(241,239,233,0.5)" }}
            >
              <span>Solvent · UV · Laser · Lamination</span>
              <span>Pan-India dispatch</span>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Capabilities marquee */}
      <div
        className="relative z-10 overflow-hidden border-y py-3.5"
        style={{ borderColor: "rgba(241,239,233,0.08)", background: "rgba(8,9,11,0.4)" }}
      >
        <div className="lp-marquee-track flex w-max items-center gap-8">
          {[...CAPABILITIES, ...BRANDS, ...CAPABILITIES, ...BRANDS].map((item, i) => (
            <span key={i} className="flex items-center gap-8">
              <span
                className="lp-mono whitespace-nowrap text-xs uppercase tracking-[0.18em]"
                style={{ color: "rgba(241,239,233,0.55)" }}
              >
                {item}
              </span>
              <span className="h-1 w-1 rounded-full" style={{ background: COPPER }} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
