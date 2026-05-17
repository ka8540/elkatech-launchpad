import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Work & Solutions", href: "#work" },
  { label: "Brands", href: "#brands" },
  { label: "Why Us", href: "#why-us" },
  { label: "Contact", href: "#contact" },
];

const ShinyText = ({ children }: { children: ReactNode }) => {
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
      animate={{ backgroundPosition: ["-220% center", "220% center"] }}
      transition={{ duration: 3, ease: "linear", repeat: Infinity }}
    >
      {children}
    </motion.span>
  );
};

const ElkatechMark = () => {
  return (
    <a href="#home" className="flex items-center gap-2 text-white transition-opacity hover:opacity-90">
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="12"
          y="12"
          width="76"
          height="76"
          rx="12"
          stroke="hsl(var(--accent))"
          strokeWidth="2.5"
          fill="none"
        />
        <path d="M30 30 L55 30" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 50 L50 50" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 70 L55 70" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 30 L30 70" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <circle cx="68" cy="50" r="6" fill="hsl(var(--accent))" />
      </svg>
      <span className="font-display text-lg font-bold">Elkatech</span>
    </a>
  );
};

const DesktopNav = () => {
  return (
    <nav className="hidden items-center gap-8 rounded-full border border-white/15 bg-black/20 px-8 py-4 backdrop-blur-md lg:flex">
      {navItems.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="text-sm text-white/75 transition-colors hover:text-white"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
};

const MobileMenu = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="mt-4 rounded-3xl border border-white/15 bg-black/60 p-3 backdrop-blur-md lg:hidden"
        >
          <nav className="flex flex-col">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="rounded-2xl px-4 py-3 text-sm text-white/75 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/login"
              onClick={onClose}
              className="mt-2 rounded-2xl border border-white/15 px-4 py-3 text-sm text-white transition hover:bg-white/10"
            >
              Service Portal
            </a>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const HeroSection = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <section id="home" className="relative min-h-screen overflow-hidden bg-black text-white">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 h-full w-full object-cover"
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="absolute inset-0 z-[1] bg-black/30" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-6 sm:px-8 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="py-6"
        >
          <div className="flex items-center justify-between gap-4">
            <ElkatechMark />
            <DesktopNav />

            <a
              href="/login"
              className="hidden rounded-full border border-white/15 px-5 py-2.5 text-sm text-white transition hover:bg-white/10 lg:inline-flex"
            >
              Service Portal
            </a>

            <button
              type="button"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((open) => !open)}
              className="rounded-full border border-white/15 p-3 text-white transition hover:bg-white/10 lg:hidden"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 grid grid-cols-1 gap-6 lg:mt-14 lg:grid-cols-2"
        >
          <p className="max-w-xl text-sm leading-relaxed text-white/75 md:text-base">
            Elkatech helps printing, signage, and fabrication businesses source reliable industrial
            machinery with honest guidance and long-term support.
          </p>
          <p className="max-w-xl text-sm leading-relaxed text-white/75 md:text-base lg:ml-auto lg:text-right">
            Trusted machinery solutions for commercial printing businesses across India.
          </p>
        </motion.div>

        <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-6 text-center text-xs uppercase tracking-[0.18em] text-white/75 md:text-sm"
          >
            Industrial Printing & Signage Machinery
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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
