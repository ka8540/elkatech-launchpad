import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";

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
  const videoY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [0, 140]);
  const ambientY = useTransform(scrollYProgress, [0, 1], shouldReduceMotion ? [0, 0] : [0, 80]);
  const heroFade = useTransform(scrollYProgress, [0, 0.65, 1], [1, 0.85, 0.55]);
  // Apple-style content lift: the headline + CTAs drift up and dim as the
  // hero scrolls away, so the next section "takes over" instead of cutting in.
  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [0, -90]
  );
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.7, 0.15]);
  const contentBlur = useTransform(scrollYProgress, [0, 0.7, 1], [0, 1.5, 4]);
  const contentFilter = useTransform(
    contentBlur,
    (b) => (shouldReduceMotion ? "none" : `blur(${b}px)`)
  );

  return (
    <section
      ref={heroRef}
      id="home"
      className="relative min-h-screen overflow-hidden bg-black text-white"
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
      <div className="absolute inset-x-0 bottom-0 z-[5] h-44 bg-gradient-to-b from-transparent via-[#050b14]/60 to-[#050b14]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 sm:px-8 lg:px-10">
        <motion.div
          style={{ y: contentY, opacity: contentOpacity, filter: contentFilter }}
          className="flex flex-1 flex-col items-center justify-center pb-24 pt-28 text-center md:pb-28 md:pt-32"
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
            className="text-center text-5xl font-medium !leading-[0.88] tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
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

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...heroTransition, delay: shouldReduceMotion ? 0 : 0.36 }}
          className="mb-14 grid w-full grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur md:mb-20 md:grid-cols-4"
        >
          {TRUST_STATS.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 bg-[#040d1c]/55 px-5 py-5 md:px-6 md:py-6"
            >
              <span className="font-display text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {stat.value}
              </span>
              <span className="text-[11px] uppercase tracking-[0.16em] text-white/55 md:text-xs">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
