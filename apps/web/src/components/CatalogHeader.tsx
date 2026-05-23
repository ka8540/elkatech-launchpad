import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PRODUCT_CATEGORIES } from "@/components/landing/landingData";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

const SECTION_LINKS = [
  { label: "Applications", hash: "#use-cases" },
  { label: "Service", pathname: "/", hash: "#service" },
  { label: "Contact", pathname: "/", hash: "#contact" },
];

const CatalogMark = () => (
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
      <path d="M30 30 L55 30" stroke="var(--lp-on-graphite)" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 50 L50 50" stroke="var(--lp-accent)" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 70 L55 70" stroke="var(--lp-on-graphite)" strokeWidth="4" strokeLinecap="round" />
      <path d="M30 30 L30 70" stroke="var(--lp-on-graphite)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="68" cy="50" r="6" fill="var(--lp-accent)" />
    </svg>
    <span
      className="text-[1.05rem] font-extrabold uppercase tracking-[0.14em]"
      style={{ color: "var(--lp-on-graphite)" }}
    >
      Elkatech
    </span>
  </span>
);

const CatalogHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const headerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setProductsOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen && !productsOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setProductsOpen(false);
      }
    };

    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setProductsOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen, productsOpen]);

  const solid = scrolled || menuOpen || productsOpen;
  const currentCategory = PRODUCT_CATEGORIES.find((category) => category.href === location.pathname);

  return (
    <header data-site-header className="pointer-events-none fixed inset-x-0 top-3 z-50 px-4 lg:top-4">
      <div
        ref={headerRef}
        className="relative mx-auto w-full max-w-[960px]"
        onMouseLeave={() => setProductsOpen(false)}
      >
        <div
          className={cn(
            "pointer-events-auto relative flex h-12 items-center justify-between gap-3 overflow-hidden rounded-2xl border px-3 transition-all duration-300 ease-out lg:px-4",
            solid
              ? "shadow-[0_18px_50px_-22px_rgba(0,0,0,0.55)] backdrop-blur-xl"
              : "backdrop-blur-[2px]"
          )}
          style={{
            backgroundColor: solid ? "color-mix(in srgb, var(--lp-graphite-2) 78%, transparent)" : "transparent",
            borderColor: solid ? "rgba(241,239,233,0.12)" : "transparent",
          }}
        >
          <Link to={{ pathname: "/", hash: "#top" }} className="flex items-center" aria-label="Elkatech home">
            <CatalogMark />
          </Link>

          <nav className="hidden items-center gap-0.5 lg:flex">
            <div className="relative" onMouseEnter={() => setProductsOpen(true)}>
              <button
                type="button"
                onClick={() => setProductsOpen((open) => !open)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors",
                  currentCategory ? "text-[var(--lp-on-graphite)]" : "text-[var(--lp-on-graphite-soft)] hover:text-[var(--lp-on-graphite)]"
                )}
              >
                Products
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", productsOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {productsOpen && (
                  <motion.div
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    transition={{ duration: shouldReduceMotion ? 0.1 : 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-0 top-[calc(100%+0.5rem)] w-[340px] overflow-hidden rounded-2xl border p-1.5 backdrop-blur-xl"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--lp-panel) 94%, transparent)",
                      borderColor: "var(--lp-line)",
                      boxShadow: "0 24px 60px -28px rgba(0,0,0,0.55)",
                    }}
                  >
                    {PRODUCT_CATEGORIES.map((category) => {
                      const active = category.href === location.pathname;
                      return (
                        <Link
                          key={category.href}
                          to={category.href}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                            active ? "bg-[var(--lp-panel-2)]" : "hover:bg-[var(--lp-panel-2)]"
                          )}
                        >
                          <span className="lp-mono text-[11px]" style={{ color: "var(--lp-accent)" }}>
                            {category.index}
                          </span>
                          <span className="text-sm font-medium text-[var(--lp-ink)]">{category.title}</span>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {SECTION_LINKS.map((item) => (
              <Link
                key={item.label}
                to={{ pathname: item.pathname ?? location.pathname, hash: item.hash }}
                className="rounded-full px-2.5 py-1.5 text-sm font-medium text-[var(--lp-on-graphite-soft)] transition-colors hover:text-[var(--lp-on-graphite)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="[&_button:hover]:bg-white/[0.06] [&_svg]:text-[var(--lp-accent)]">
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

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-xl border p-2 text-[var(--lp-on-graphite)] transition-colors hover:bg-white/[0.06] lg:hidden"
            style={{ borderColor: solid ? "rgba(241,239,233,0.16)" : "rgba(241,239,233,0.28)" }}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: shouldReduceMotion ? 0.1 : 0.2, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-x-0 top-[calc(100%+0.6rem)] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border p-3 backdrop-blur-xl lg:hidden"
              style={{
                backgroundColor: "color-mix(in srgb, var(--lp-panel) 96%, transparent)",
                borderColor: "var(--lp-line)",
                boxShadow: "0 24px 60px -26px rgba(0,0,0,0.5)",
              }}
            >
              <p className="lp-mono px-3 pb-1 pt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--lp-faint)]">
                Products
              </p>
              <div className="grid grid-cols-1 gap-0.5">
                {PRODUCT_CATEGORIES.map((category) => {
                  const active = category.href === location.pathname;
                  return (
                    <Link
                      key={category.href}
                      to={category.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                        active ? "bg-[var(--lp-panel-2)]" : "hover:bg-[var(--lp-panel-2)]"
                      )}
                    >
                      <span className="lp-mono text-[11px]" style={{ color: "var(--lp-accent)" }}>
                        {category.index}
                      </span>
                      <span className="text-sm font-medium text-[var(--lp-ink)]">{category.title}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="my-2 h-px bg-[var(--lp-line)]" />

              <div className="grid grid-cols-2 gap-1">
                {SECTION_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    to={{ pathname: item.pathname ?? location.pathname, hash: item.hash }}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--lp-ink-soft)] hover:bg-[var(--lp-panel-2)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Link
                  to="/login"
                  className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--lp-accent)" }}
                >
                  Service Portal
                </Link>
                <span className="[&_svg]:text-[var(--lp-accent)]">
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

export default CatalogHeader;
