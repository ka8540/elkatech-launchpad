import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type SiteHeaderProps = {
  useHomeAnchors?: boolean;
};

const SECTION_HASHES = [
  { label: "Home", hash: "#home" },
  { label: "About", hash: "#about" },
  { label: "Work & Solutions", hash: "#work" },
  { label: "Brands", hash: "#brands" },
  { label: "Why Us", hash: "#why-us" },
  { label: "Contact", hash: "#contact" },
];

const SiteHeader = ({ useHomeAnchors = false }: SiteHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  const navItems = SECTION_HASHES.map(({ label, hash }) => ({
    label,
    href: useHomeAnchors ? hash : `/${hash}`,
  }));
  const hasGlassShell = isScrolled || isMenuOpen;

  return (
    <header className="pointer-events-none fixed left-0 right-0 top-3 z-50 px-4 lg:top-4">
      <div
        ref={headerRef}
        className="relative mx-auto w-full max-w-[calc(100vw-2rem)] lg:w-fit lg:max-w-[1180px]"
      >
        <div
          className={`pointer-events-auto relative flex h-12 w-full items-center justify-between gap-4 overflow-hidden rounded-full border px-4 transition-all duration-300 ease-out before:pointer-events-none before:absolute before:inset-x-5 before:top-px before:h-px before:bg-white/15 before:transition-opacity before:duration-300 before:content-[''] lg:h-14 lg:min-h-[56px] lg:w-fit lg:gap-8 lg:px-5 ${
            hasGlassShell
              ? "border-white/10 bg-[#07111f]/75 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl before:opacity-100"
              : "border-white/10 bg-[#07111f]/75 shadow-none backdrop-blur-2xl before:opacity-0 lg:border-transparent lg:bg-[#020817]/25 lg:backdrop-blur-sm"
          }`}
        >
          <a href={useHomeAnchors ? "#home" : "/"} className="flex shrink-0 items-center gap-2">
            <svg
              width="30"
              height="30"
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
              <path
                d="M30 50 L50 50"
                stroke="hsl(var(--accent))"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <path d="M30 70 L55 70" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <path d="M30 30 L30 70" stroke="white" strokeWidth="4" strokeLinecap="round" />
              <circle cx="68" cy="50" r="6" fill="hsl(var(--accent))" />
            </svg>
            <span className="font-display text-lg font-bold text-white">Elkatech</span>
          </a>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-white/75 transition-colors duration-200 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex [&_button:hover]:bg-white/10 [&_button]:text-white">
            <a
              href="/login"
              className="rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/10"
            >
              Service Portal
            </a>
            <ThemeToggle />
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="rounded-full border border-white/10 p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -8, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -8, scale: 0.98 }
              }
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute left-0 right-0 top-[calc(100%+0.75rem)] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[#07111f]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:hidden"
            >
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-2xl px-4 py-3 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/[0.08] hover:text-white"
                  >
                    {item.label}
                  </a>
                ))}
                <a
                  href="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="mt-2 block w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:border-white/20 hover:bg-white/10"
                >
                  Service Portal
                </a>
                <div className="flex items-center gap-2 px-4 pt-3 [&_button:hover]:bg-white/10 [&_button]:text-white">
                  <ThemeToggle />
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default SiteHeader;
