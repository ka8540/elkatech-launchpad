// src/pages/LaminationMachines.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// -------------------- TYPES --------------------
type Spec = [string, string];

type Product = {
  id: string;
  name: string;
  price: string;
  cta: string;
  brochureLabel: string;
  images: string[];
  specs: Spec[];
  highlights: string[];
};

// -------------------- DATA --------------------
const intro =
  "Leading Wholesaler of Molor ML1600K Cold Heat Lamination Machine and Inca L4-1700 Electric Laminating Machine from Ahmedabad.";

const products: Product[] = [
  {
    id: "molor-ml1600k",
    name: "Molor ML1600K Cold Heat Lamination Machine",
    price: "₹ 1,25,000 / Piece",
    cta: "Get Latest Price",
    brochureLabel: "Product Brochure",
    // Put your images in /public/images/lamination/molor-ml1600k/
    images: [
      "images/Molor ML1600K Cold Heat Lamination Machine/9-1.webp",
      "images/Molor ML1600K Cold Heat Lamination Machine/9-2.webp",
      "images/Molor ML1600K Cold Heat Lamination Machine/9-3.webp",
      "images/Molor ML1600K Cold Heat Lamination Machine/9-4.webp",
    ],
    specs: [
      ["Lamination Width", "1630 mm (64 Inch)"],
      ["Roller Type", "Silicone Rollers"],
      ["Feeding Mechanism", "Manual"],
      ["Model", "ML1600K"],
      ["Brand", "Molor"],
      ["Lamination Thickness", "35 mm (1.4 Inch)"],
      ["Voltage", "240 V"],
      ["Weight", "230 Kgs"],
      ["Preheating Time", "10 min"],
      ["Roller Lifting", "Air cylinder"],
    ],
    highlights: [
      "Durable laminator designed to reduce material cost and improve efficiency",
      "Works with post-printing materials, rigid displays, packing board, car wrapping, graphics, banners",
      "Compatible with common cold laminating films (bottom paper, bottom-free paper, polymer film)",
      "Heated upper roller (up to 60°C) for better lamination in low temp environments",
    ],
  },
  {
    id: "inca-l4-1700",
    name: "Inca L4-1700 Electric Laminating Machine",
    price: "₹ 17,00,000 / Piece",
    cta: "Get Latest Price",
    brochureLabel: "Product Brochure",
    // Put your images in /public/images/lamination/inca-l4-1700/
    images: [
      "images/Inca L4-1700 Electric Laminating Machine/10-1.webp",
      "images/Inca L4-1700 Electric Laminating Machine/10-2.webp",
      "images/Inca L4-1700 Electric Laminating Machine/10-3.webp",
    ],
    specs: [
      ["Automation Grade", "Automatic"],
      ["Number Of Rollers", "1"],
      ["Max Speed", "24 m/min"],
      ["Max Width", "1630 mm / 64 in."],
      ["Lifting Height", "40 mm / 1.5 in."],
      ["Motor Type", "250W motor"],
      ["Silicone Roller", "120 mm / 4.7 in."],
      ["Cutter Type", "4 ceramic knives (knob control)"],
      ["Pedal Type", "2 multi-functional foot pedal"],
      ["Winding Diameter", "200 mm / 8 in."],
      ["Model", "L4-1700"],
      ["Transmission", "Chain drive"],
    ],
    highlights: [
      "Automatic laminating workflow for consistent output",
      "High speed (up to 24 m/min) for production environments",
      "Integrated cutter + foot pedal controls",
      "Wide format (64 in.) support",
    ],
  },
];

// -------------------- UI COMPONENTS --------------------
function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const safeImages = useMemo(
    () => (Array.isArray(images) && images.length ? images : ["/images/placeholder.png"]),
    [images]
  );

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (safeImages.length <= 1) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % safeImages.length), 3500);
    return () => clearInterval(t);
  }, [safeImages.length]);

  const prev = () => setIdx((p) => (p - 1 + safeImages.length) % safeImages.length);
  const next = () => setIdx((p) => (p + 1) % safeImages.length);

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-muted/30">
      <div className="aspect-[4/3] w-full">
        <img
          src={safeImages[idx]}
          alt={alt}
          className="h-full w-full object-contain p-4"
          loading="lazy"
        />
      </div>

      {safeImages.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border bg-background/70 p-2 backdrop-blur hover:bg-background"
            aria-label="Previous image"
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border bg-background/70 p-2 backdrop-blur hover:bg-background"
            aria-label="Next image"
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {safeImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-6 bg-foreground" : "w-2.5 bg-foreground/30"
                }`}
                aria-label={`Go to image ${i + 1}`}
                type="button"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SpecsTable({ specs }: { specs: Spec[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="border-b bg-muted/30 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Specifications</p>
      </div>
      <div className="divide-y">
        {specs.map(([k, v]) => (
          <div key={k} className="grid grid-cols-12 gap-3 px-4 py-3">
            <div className="col-span-5 text-sm text-muted-foreground">{k}</div>
            <div className="col-span-7 text-sm text-foreground">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "About", href: "/#about" },
    { label: "Solutions", href: "/#solutions" },
    { label: "Work", href: "/#work" },
    { label: "Brands", href: "/#brands" },
    { label: "Why Us", href: "/#why-us" },
    { label: "Contact", href: "/#contact" },
  ];

  return (
    <div className="fixed left-0 right-0 top-0 z-40 lg:flex lg:justify-center lg:px-4 lg:pt-3">
      <motion.header
        className={`px-4 transition-all duration-300 md:px-6 lg:rounded-full ${
          isScrolled
            ? "bg-background/80 backdrop-blur-xl lg:border lg:border-border/50 shadow-soft"
            : "bg-background/30 backdrop-blur-sm lg:border lg:border-transparent"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex h-12 items-center justify-between gap-4 md:h-14 md:gap-8">
          <a href="/" className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="12" y="12" width="76" height="76" rx="12" stroke="hsl(var(--accent))" strokeWidth="2.5" fill="none" />
              <path d="M30 30 L55 30" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
              <path d="M30 50 L50 50" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" />
              <path d="M30 70 L55 70" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
              <path d="M30 30 L30 70" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
              <circle cx="68" cy="50" r="6" fill="hsl(var(--accent))" />
            </svg>

            <span className="hidden font-display text-lg font-bold text-foreground sm:block">Elkatech</span>
          </a>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeToggle />
          </div>

          <button
            className="rounded-lg p-2 transition-colors hover:bg-muted lg:hidden"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            type="button"
          >
            {isMenuOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>
        </div>

        {isMenuOpen && (
          <motion.div
            className="rounded-b-2xl border-t border-border bg-background py-4 lg:hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="flex items-center gap-2 px-3 pt-3">
                <ThemeToggle />
              </div>
            </nav>
          </motion.div>
        )}
      </motion.header>
    </div>
  );
}

// -------------------- PAGE --------------------
export default function LaminationMachinesPage() {
  // IMPORTANT: ensures when you navigate from Home -> this page, it starts from TOP
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* push content below fixed navbar */}
      <div className="pt-16 md:pt-20 lg:pt-24">
        {/* HERO */}
        <section className="relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.10),transparent),radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.06),transparent)] dark:bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.06),transparent),radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.04),transparent)]" />
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 md:pt-14">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold tracking-tight md:text-5xl"
            >
              Lamination Machines
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg"
            >
              {intro}
            </motion.p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#products"
                className="rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
              >
                View Products
              </a>
              <a
                href="#enquiry"
                className="rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-muted"
              >
                Send Enquiry
              </a>
            </div>
          </div>
        </section>

        {/* PRODUCTS */}
        <section id="products" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="space-y-10">
            {products.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.35, delay: i * 0.03 }}
                className="rounded-3xl border bg-card"
              >
                <div className="p-5 md:p-7">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-semibold md:text-2xl">{p.name}</h2>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold md:text-lg">{p.price}</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                      <ImageCarousel images={p.images} alt={p.name} />
                    </div>

                    <div className="space-y-6 lg:col-span-7">
                      <SpecsTable specs={p.specs} />

                      <div className="rounded-2xl border bg-muted/20 p-4">
                        <p className="text-sm font-semibold">Key Features</p>
                        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          {p.highlights.map((h) => (
                            <li key={h} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/60" />
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          className="rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
                          type="button"
                        >
                          {p.cta}
                        </button>
                        <button
                          className="rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-muted"
                          type="button"
                        >
                          Download Brochure
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
