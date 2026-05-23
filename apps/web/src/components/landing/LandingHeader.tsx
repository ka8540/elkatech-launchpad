import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { PRODUCT_CATEGORIES } from "@/components/landing/landingData";

const SECTION_LINKS = [
  { label: "Products", href: "#products" },
  { label: "Strengths", href: "#strengths" },
  { label: "Applications", href: "#applications" },
  { label: "Service", href: "#service" },
  { label: "Contact", href: "#contact" },
];

const LandingMark = ({ tone }: { tone: "light" | "ink" }) => (
  <span className="flex shrink-0 items-center gap-2.5">
    <svg width="30" height="30" viewBox="0 0 100 100" fill="none" aria-hidden>
      <rect
        x="12"
        y="12"
        width="76"
        height="76"
        rx="10"
        stroke="var(--lp-accent)"
        strokeWidth="2.5"
        fill="none"
      />
      <path
        d="M30 30 L55 30"
        stroke={tone === "light" ? "#f1efe9" : "var(--lp-ink)"}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M30 50 L50 50" stroke="var(--lp-accent)" strokeWidth="4" strokeLinecap="round" />
      <path
        d="M30 70 L55 70"
        stroke={tone === "light" ? "#f1efe9" : "var(--lp-ink)"}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M30 30 L30 70"
        stroke={tone === "light" ? "#f1efe9" : "var(--lp-ink)"}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="68" cy="50" r="6" fill="var(--lp-accent)" />
    </svg>
    <span
      className="lp-display text-[1.05rem] font-extrabold uppercase tracking-[0.14em]"
      style={{ color: tone === "light" ? "#f1efe9" : "var(--lp-ink)" }}
    >
      Elkatech
    </span>
  </span>
);

const LandingHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  // Solid (glass) when scrolled or menu open; otherwise it floats invisibly
  // over the graphite hero. The hero is dark in both themes, so the top state
  // always uses light text.
  const solid = scrolled || menuOpen;
  const tone: "light" | "ink" = solid ? "ink" : "light";
  const linkColor = solid ? "var(--lp-ink-soft)" : "rgba(241,239,233,0.78)";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-50 px-4 lg:top-4">
      <div
        ref={headerRef}
        className="relative mx-auto w-full max-w-[900px]"
        onMouseLeave={() => setProductsOpen(false)}
      >
        <div
          className={cn(
            "pointer-events-auto relative flex h-12 items-center justify-between gap-3 rounded-2xl border px-3 transition-all duration-300 ease-out lg:px-4",
            solid ? "shadow-[0_18px_50px_-22px_rgba(0,0,0,0.45)] backdrop-blur-xl" : "backdrop-blur-[2px]"
          )}
          style={{
            backgroundColor: solid ? "color-mix(in srgb, var(--lp-panel) 82%, transparent)" : "transparent",
            borderColor: solid ? "var(--lp-line)" : "transparent",
          }}
        >
          <a href="#top" className="flex items-center" aria-label="Elkatech home">
            <LandingMark tone={tone} />
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 lg:flex">
            <div className="relative" onMouseEnter={() => setProductsOpen(true)}>
              <a
                href="#products"
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors"
                style={{ color: linkColor }}
              >
                Products
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform", productsOpen && "rotate-180")}
                />
              </a>
              <AnimatePresence>
                {productsOpen && (
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-0 top-[calc(100%+0.5rem)] w-[330px] overflow-hidden rounded-2xl border p-1.5 backdrop-blur-xl"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--lp-panel) 94%, transparent)",
                      borderColor: "var(--lp-line)",
                      boxShadow: "0 24px 60px -28px rgba(0,0,0,0.5)",
                    }}
                  >
                    {PRODUCT_CATEGORIES.map((c) => (
                      <Link
                        key={c.href}
                        to={c.href}
                        className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--lp-panel-2)]"
                      >
                        <span
                          className="lp-mono text-[11px]"
                          style={{ color: "var(--lp-accent)" }}
                        >
                          {c.index}
                        </span>
                        <span
                          className="text-sm font-medium"
                          style={{ color: "var(--lp-ink)" }}
                        >
                          {c.title}
                        </span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {SECTION_LINKS.slice(1).map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors"
                style={{ color: linkColor }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right cluster */}
          <div className="hidden items-center gap-2 lg:flex">
            <span
              className={cn(
                "[&_button:hover]:bg-transparent",
                solid ? "[&_svg]:text-[var(--lp-ink-soft)]" : "[&_svg]:text-[#f1efe9]"
              )}
            >
              <ThemeToggle />
            </span>
            <Link
              to="/login"
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--lp-glow)] transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: "var(--lp-accent)" }}
            >
              Service Portal
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-xl border p-2 transition-colors lg:hidden"
            style={{
              color: tone === "light" ? "#f1efe9" : "var(--lp-ink)",
              borderColor: solid ? "var(--lp-line)" : "rgba(241,239,233,0.28)",
            }}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-x-0 top-[calc(100%+0.6rem)] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border p-3 backdrop-blur-xl lg:hidden"
              style={{
                backgroundColor: "color-mix(in srgb, var(--lp-panel) 96%, transparent)",
                borderColor: "var(--lp-line)",
                boxShadow: "0 24px 60px -26px rgba(0,0,0,0.5)",
              }}
            >
              <p className="lp-mono px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--lp-faint)" }}>
                Products
              </p>
              <div className="grid grid-cols-1 gap-0.5">
                {PRODUCT_CATEGORIES.map((c) => (
                  <Link
                    key={c.href}
                    to={c.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[var(--lp-panel-2)]"
                  >
                    <span className="lp-mono text-[11px]" style={{ color: "var(--lp-accent)" }}>
                      {c.index}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--lp-ink)" }}>
                      {c.title}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="my-2 h-px" style={{ backgroundColor: "var(--lp-line)" }} />

              <div className="grid grid-cols-2 gap-1">
                {SECTION_LINKS.slice(1).map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-[var(--lp-panel-2)]"
                    style={{ color: "var(--lp-ink-soft)" }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--lp-accent)" }}
                >
                  Service Portal
                </Link>
                <span className="[&_svg]:text-[var(--lp-ink-soft)]">
                  <ThemeToggle />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default LandingHeader;
