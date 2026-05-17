import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";

type LogoItem = {
  src: string;
  alt: string;
  gradient: string;
};

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260505_101331_74f9b798-3f00-4e86-8a01-377aa16ffeaa.mp4";

const logos: LogoItem[] = [
  {
    src: "https://svgl.app/library/procure.svg",
    alt: "Procure",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.28), rgba(14, 165, 233, 0.18))",
  },
  {
    src: "https://svgl.app/library/shopify.svg",
    alt: "Shopify",
    gradient: "linear-gradient(135deg, rgba(250, 204, 21, 0.32), rgba(253, 224, 71, 0.18))",
  },
  {
    src: "https://svgl.app/library/blender.svg",
    alt: "Blender",
    gradient: "linear-gradient(135deg, rgba(37, 99, 235, 0.26), rgba(56, 189, 248, 0.18))",
  },
  {
    src: "https://svgl.app/library/figma.svg",
    alt: "Figma",
    gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.28), rgba(192, 132, 252, 0.18))",
  },
  {
    src: "https://svgl.app/library/spotify.svg",
    alt: "Spotify",
    gradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.24), rgba(236, 72, 153, 0.18))",
  },
  {
    src: "https://svgl.app/library/lottielab.svg",
    alt: "Lottielab",
    gradient: "linear-gradient(135deg, rgba(250, 204, 21, 0.28), rgba(163, 230, 53, 0.18))",
  },
  {
    src: "https://svgl.app/library/google-cloud.svg",
    alt: "Google Cloud",
    gradient: "linear-gradient(135deg, rgba(125, 211, 252, 0.3), rgba(186, 230, 253, 0.18))",
  },
  {
    src: "https://svgl.app/library/bing.svg",
    alt: "Bing",
    gradient: "linear-gradient(135deg, rgba(34, 211, 238, 0.28), rgba(45, 212, 191, 0.18))",
  },
];

const scrollToContact = () => {
  document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
};

const FloatingHeroNav = () => {
  return (
    <div className="absolute bottom-10 left-1/2 z-30 max-w-[calc(100%-2rem)] -translate-x-1/2">
      <motion.nav
        aria-label="Hero quick links"
        className="flex items-center gap-1 bg-white/90 px-1.5 py-1.5 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-slate-200/40 backdrop-blur-2xl"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
          <span aria-hidden="true">✦</span>
        </div>

        <a
          href="#work"
          className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold text-slate-500 transition-colors hover:text-[#0a1b33]"
        >
          Products
        </a>

        <a
          href="#brands"
          className="whitespace-nowrap px-3 py-2 text-[12px] font-semibold text-slate-500 transition-colors hover:text-[#0a1b33]"
        >
          Docs
        </a>

        <a
          href="#contact"
          className="flex items-center gap-1 whitespace-nowrap bg-white px-5 py-2 rounded-full text-[12px] font-semibold text-[#0a1b33] border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all"
        >
          Get in touch
          <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </motion.nav>
    </div>
  );
};

const LogoCard = ({ logo }: { logo: LogoItem }) => {
  return (
    <div className="group relative h-24 w-40 shrink-0 flex items-center justify-center rounded-full bg-white border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all overflow-hidden">
      <div
        className="absolute inset-0 scale-150 opacity-0 transition-all duration-500 group-hover:scale-100 group-hover:opacity-100"
        style={{ backgroundImage: logo.gradient }}
      />
      <img
        src={logo.src}
        alt={logo.alt}
        loading="lazy"
        className="relative z-10 max-h-9 max-w-24 transition-all duration-500 group-hover:brightness-0 group-hover:invert"
      />
    </div>
  );
};

const LogoMarquee = () => {
  return (
    <div className="logo-marquee mt-10 overflow-hidden">
      <div className="logo-marquee-track flex w-max">
        {[0, 1].map((group) => (
          <div
            key={group}
            className="flex shrink-0 items-center gap-4 pr-4"
            aria-hidden={group === 1}
          >
            {logos.map((logo) => (
              <LogoCard key={`${group}-${logo.alt}`} logo={logo} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const HeroSection = () => {
  return (
    <section id="home" className="relative overflow-x-clip px-4 pb-6 pt-24 md:px-6 md:pb-8 md:pt-28">
      <div className="relative w-full max-w-[1400px] mx-auto rounded-[48px] bg-white border border-slate-200/50 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.03)] overflow-hidden h-[600px] flex flex-col">
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover scale-105 transition-transform duration-1000"
          >
            <source src={HERO_VIDEO_URL} type="video/mp4" />
          </video>
        </div>

        <div className="relative z-20 flex-1 px-8 md:px-16 pt-12 md:pt-16 flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1 className="font-display text-[42px] md:text-[56px] font-medium tracking-tight leading-[0.95] text-[#0a1b33]">
              Foundation of the
              <br />
              new digital epoch
            </h1>

            <p className="font-sans text-[14px] md:text-[15px] text-[#64748b] max-w-[460px] mt-5 leading-relaxed">
              Designing products, powering ecosystems and laying the foundation of a decentralized
              web for enterprises, builders and communities alike.
            </p>

            <motion.button
              type="button"
              className="bg-[#0a152d] text-white rounded-full px-6 py-3 text-sm font-semibold mt-7 shadow-sm"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.98 }}
              onClick={scrollToContact}
            >
              Contact Us
            </motion.button>
          </motion.div>
        </div>

        <FloatingHeroNav />
      </div>

      <div className="mx-auto w-full max-w-[1400px]">
        <LogoMarquee />
      </div>
    </section>
  );
};

export default HeroSection;
