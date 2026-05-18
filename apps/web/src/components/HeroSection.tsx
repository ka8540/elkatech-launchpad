import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { type ReactNode } from "react";

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

const HeroSection = () => {
  const shouldReduceMotion = useReducedMotion();
  const heroInitial = shouldReduceMotion ? false : { opacity: 0, y: 20 };
  const heroTransition = { duration: shouldReduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-black text-white">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
        style={{ filter: "saturate(0.68) hue-rotate(-12deg) brightness(0.72) contrast(1.08)" }}
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-[1] bg-[#020817]/45" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/50 via-[#061426]/45 to-[#020817]/90" />
      <div className="absolute inset-0 z-[3] bg-[radial-gradient(circle_at_70%_40%,rgba(14,165,233,0.22),transparent_35%)]" />
      <div className="absolute inset-0 z-[4] bg-[#031121]/[0.18] mix-blend-color" />
      <div className="absolute inset-x-0 bottom-0 z-[5] h-44 bg-gradient-to-b from-transparent via-[#050b14]/60 to-[#050b14]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 sm:px-8 lg:px-10">
        <div className="flex flex-1 flex-col items-center justify-center pb-24 pt-28 text-center md:pb-28 md:pt-32">
          <motion.p
            initial={heroInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: shouldReduceMotion ? 0 : 0.08 }}
            className="mb-6 text-center text-xs uppercase tracking-[0.18em] text-white/75 md:text-sm"
          >
            Industrial Printing & Signage Machinery
          </motion.p>

          <motion.h1
            initial={heroInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: shouldReduceMotion ? 0 : 0.16 }}
            className="text-center text-5xl font-medium !leading-[0.85] tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
          >
            <span className="block text-white">Powering</span>
            <ShinyText>
              Industrial Printing
              <br />
              Machinery.
            </ShinyText>
          </motion.h1>

          <motion.a
            href="#work"
            initial={heroInitial}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...heroTransition, delay: shouldReduceMotion ? 0 : 0.24 }}
            className="group mx-auto mt-8 flex items-center gap-2 rounded-full border border-white/10 bg-black px-6 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-gray-900 md:px-8 md:py-4 md:text-base"
          >
            Explore Solutions
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
