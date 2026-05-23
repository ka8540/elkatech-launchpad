import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4";

const ShinyText = ({ children }: { children: ReactNode }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.span
      className="block bg-clip-text text-transparent"
      style={{
        backgroundImage:
          "linear-gradient(100deg, #64CEFB 0%, #64CEFB 32%, #ffffff 50%, #64CEFB 68%, #64CEFB 100%)",
        backgroundSize: "220% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
      animate={
        shouldReduceMotion
          ? { backgroundPosition: "center" }
          : { backgroundPosition: ["-220% center", "220% center"] }
      }
      transition={
        shouldReduceMotion ? { duration: 0 } : { duration: 3, ease: "linear", repeat: Infinity }
      }
    >
      {children}
    </motion.span>
  );
};

const TRUST_STATS = [
  { value: "7+", label: "Years in the field" },
  { value: "10+", label: "International brands" },
  { value: "Pan-India", label: "Dispatch coverage" },
  { value: "₹1.5–5 Cr", label: "Annual turnover" },
];

const HeroStatsGrid = ({ className }: { className?: string }) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.dl
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: shouldReduceMotion ? 0.2 : 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left backdrop-blur sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {TRUST_STATS.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-1 bg-[#040d1c]/55 px-5 py-4 sm:px-6 sm:py-5"
        >
          <dt className="order-2 text-[11px] uppercase tracking-[0.16em] text-white/55 md:text-xs">
            {stat.label}
          </dt>
          <dd className="order-1 font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {stat.value}
          </dd>
        </div>
      ))}
    </motion.dl>
  );
};

const HeroSection = () => {
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const heroInitial = shouldReduceMotion ? false : { opacity: 0, y: 20 };
  const heroTransition = { duration: shouldReduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const };

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  // Subtle parallax on the video and ambient glow — disabled when the user
  // prefers reduced motion.
  const videoY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [0, 60]);
  const ambientY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [0, 36]);
  const heroFade = useTransform(scrollYProgress, [0, 0.75, 1], [1, 0.95, 0.82]);
  // Keep the hero motion subtle so anchor jumps don't leave blurred content
  // hanging behind the fixed navigation.
  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [0, -28]
  );
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.92, 0.68]);

  return (
    <section
      ref={heroRef}
      id="home"
      className="landing-anchor relative min-h-[calc(100svh-1rem)] overflow-hidden bg-black text-white lg:min-h-[min(960px,calc(100svh-80px))]"
    >
      <motion.div
        className="absolute inset-0 z-0"
        style={{ y: videoY, opacity: heroFade }}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "saturate(0.62) hue-rotate(-12deg) brightness(0.7) contrast(1.08)" }}
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
      </motion.div>
      <div className="absolute inset-0 z-[1] bg-[#020817]/55" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/55 via-[#061426]/55 to-[#020817]/95" />
      <motion.div
        style={{ y: ambientY }}
        className="absolute inset-0 z-[3] bg-[radial-gradient(circle_at_70%_38%,rgba(14,165,233,0.26),transparent_38%)]"
      />
      <div className="absolute inset-0 z-[4] bg-[#031121]/[0.2] mix-blend-color" />
      {/* Technical grid — only visible at very low opacity, evokes precision engineering. */}
      <div
        aria-hidden
        className="absolute inset-0 z-[4] opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.18) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 78%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 z-[5] h-28 bg-gradient-to-b from-transparent via-[#050b14]/55 to-[#050b14]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-1rem)] max-w-7xl flex-col justify-center px-6 pb-8 pt-24 sm:px-8 md:pb-10 md:pt-28 lg:min-h-[min(960px,calc(100svh-80px))] lg:px-10 lg:py-24">
        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="mx-auto flex w-full max-w-5xl flex-col items-center text-center"
        >
          <motion.div
            initial={heroInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: shouldReduceMotion ? 0 : 0.04 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 backdrop-blur-md"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={
                  "absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" +
                  (shouldReduceMotion ? "" : " animate-ping")
                }
              />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
            </span>
            <span className="text-[11px] uppercase tracking-[0.22em] text-white/80 md:text-xs">
              Industrial Printing &amp; Signage Machinery · Ahmedabad
            </span>
          </motion.div>

          <motion.h1
            initial={heroInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: shouldReduceMotion ? 0 : 0.14 }}
            className="text-center text-5xl font-medium !leading-[0.92] tracking-tighter sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl"
          >
            <span className="block text-white">Powering</span>
            <ShinyText>
              Industrial Printing
              <br />
              Machinery.
            </ShinyText>
          </motion.h1>

          <motion.p
            initial={heroInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: shouldReduceMotion ? 0 : 0.2 }}
            className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg"
          >
            Importers, wholesalers, and distributors of solvent, UV, laser, and flatbed
            machinery — backed by honest guidance and dependable after-sales support across India.
          </motion.p>

          <motion.div
            initial={heroInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: shouldReduceMotion ? 0 : 0.26 }}
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              to={{ pathname: "/", hash: "#work" }}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-[0_18px_45px_-12px_rgba(56,189,248,0.55)] transition hover:bg-white/95 md:text-base"
            >
              Explore Solutions
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to={{ pathname: "/", hash: "#contact" }}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-7 py-3.5 text-sm font-medium text-white backdrop-blur transition hover:border-white/35 hover:bg-white/[0.08] md:text-base"
            >
              <MessageCircle className="h-4 w-4 text-cyan-300" />
              Talk to our team
            </Link>
          </motion.div>
        </motion.div>

        <HeroStatsGrid className="mt-8 w-full md:mt-10" />
      </div>
    </section>
  );
};

// Optional standalone stats band for any future reuse. The landing page now
// renders the same grid inside the hero so the CTA and stats stay connected.
export const HeroStatsStrip = () => {
  return (
    <section
      aria-label="Elkatech at a glance"
      className="relative isolate overflow-hidden bg-[#050b14] py-6 md:py-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="container mx-auto px-4 md:px-6">
        <HeroStatsGrid />
      </div>
    </section>
  );
};

export default HeroSection;
