import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";

const HERO_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Courses", href: "#courses" },
  { label: "Instructors", href: "#instructors" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Blog", href: "#blog" },
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

const BrandMark = () => {
  return (
    <a href="#home" className="flex items-center gap-3 text-white transition-opacity hover:opacity-90">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white">
        <span className="h-4 w-4 rounded-full bg-white" />
      </span>
      <span className="text-lg font-semibold tracking-tight">DesignPro</span>
    </a>
  );
};

const DesktopNav = () => {
  return (
    <div className="hidden items-center rounded-full border border-gray-700 px-2 py-2 lg:flex">
      {navItems.map((item) => (
        <a
          key={item.label}
          href={item.href}
          className="rounded-full px-4 py-2 text-sm text-white/80 transition-colors hover:text-white"
        >
          {item.label}
        </a>
      ))}
      <a
        href="#contact"
        className="group flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/80 transition-colors hover:text-white"
      >
        Contact us
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </a>
    </div>
  );
};

const MobileNav = ({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        onClick={onToggle}
        className="rounded-full border border-gray-700 p-3 text-white transition-colors hover:border-gray-500"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
    </div>
  );
};

const MobileMenu = ({ isOpen }: { isOpen: boolean }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mt-4 rounded-3xl border border-gray-700 bg-black/80 p-3 backdrop-blur-md lg:hidden"
        >
          <div className="flex flex-col">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-2xl px-4 py-3 text-sm text-white/80 transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <a
              href="#contact"
              className="group flex items-center gap-2 rounded-2xl px-4 py-3 text-sm text-white/80 transition-colors hover:text-white"
            >
              Contact us
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const HeroSection = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <section id="home" className="relative h-screen overflow-hidden bg-black font-sans text-white">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>

      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between gap-4">
          <BrandMark />
          <DesktopNav />
          <MobileNav isOpen={isMenuOpen} onToggle={() => setIsMenuOpen((open) => !open)} />
        </nav>

        <MobileMenu isOpen={isMenuOpen} />

        <div className="mt-8 grid gap-4 lg:mt-12 lg:grid-cols-2 lg:items-start">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl text-sm leading-relaxed text-white/80 md:text-base"
          >
            We deliver transformative programs that empower emerging product designers with
            cutting-edge expertise and vision to thrive globally.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-sm leading-relaxed text-white/80 md:text-base lg:justify-self-end lg:text-right"
          >
            8000+ Talented Designers Launched !
          </motion.p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-xs uppercase tracking-tight text-white/80 md:text-sm"
          >
            Seats for Next Program Opening Soon
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 text-5xl font-medium leading-[0.85] tracking-tighter sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl"
          >
            <span className="block text-white">Become</span>
            <ShinyText>Product Leader.</ShinyText>
          </motion.h1>

          <motion.a
            href="#contact"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-900 md:mt-10 md:px-8 md:py-4"
          >
            Apply for Next Enrollment
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </motion.a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
