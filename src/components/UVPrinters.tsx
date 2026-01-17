// src/pages/UVPrinters.tsx
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, FileText, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import IntroAnimation from "@/components/IntroAnimation";


// -------------------- TYPES --------------------
type Spec = [string, string];

type Product = {
  id: string;
  name: string;
  price: string;
  cta: string;
  brochureLabel: string;
  brochureUrl?: string;
  images: string[];
  specs: Spec[];
  highlights: string[];
};

// -------------------- DATA --------------------
const uvIntro =
  "Offering you a complete choice of products which include Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer, Allwin Giant Hybrid UV Printer and Allwin 3.2 Double Rows Pinch Roller UV Printer.";

const products: Product[] = [
  {
    id: "dc1800uv",
    name: "Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer",
    price: "₹ 14,00,000 / Piece",
    cta: "Get Latest Price",
    brochureLabel: "Product Brochure",
    brochureUrl:"https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+DC1800UV+Mesh+Belt+1.8M+UV+Inkjet+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-1.webp",
      "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-2.webp",
      "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-3.webp",
      "images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-4.webp"
    ],
    specs: [
      ["Usage/Application", "Roll: Ceiling Film, Vinyl, Backlit, Fabric, Wall paper, Leather, etc. Flat: PVC board, Foam board"],
      ["Printing Width (mm)", "1800 mm"],
      ["Ink Type", "Flexible UV Ink"],
      ["Brand", "Gongzheng"],
      ["Print Head", "8"],
      ["Weight", "1366 kgs"],
      ["Power Consumption", "Single phase, 50Hz/AC, 220V±10%, 5A (Printer + UV Controller)"],
      ["Model", "ThunderJet DC1800UV"],
      ["Ink Tank", "1000 ml"],
      ["Roll Diameter", "Max. 300 mm"],
      ["Roll Weight", "Max. 50 kgs"],
      ["Printing Speed", "720×1800 dpi"],
    ],
    highlights: [
      "Mesh Belt System",
      "Multi-layer Printing Application",
      "White Ink Recirculation System",
      "Intelligent Heating Unit",
    ],
  },

  {
    id: "allwin-giant-hybrid",
    name: "Allwin Giant Hybrid UV Printer",
    price: "₹ 35,00,000 / Piece",
    cta: "Get Latest Price",
    brochureLabel: "Product Brochure",
    brochureUrl:"https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+Giant+Hybrid+UV+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Allwin Giant Hybrid UV Printer/6-1.webp",
      "images/Allwin Giant Hybrid UV Printer/6-2.webp",
    ],
    specs: [
      ["Usage/Application", "Posters Printing"],
      ["Printing Width", "6.6 m"],
      ["Print Resolution", "2160 dpi"],
      ["Print Speed", "235 m2/h"],
      ["Printheads", "40"],
      ["Printhead Cleaning System", "Automatic"],
      ["Voltage", "440 V"],
      ["Power", "10 kW"],
    ],
    highlights: [
      "6.6m ultra-wide production",
      "2160 dpi output",
      "235 m2/h speed",
      "Automatic printhead cleaning",
    ],
  },

  {
    id: "allwin-3-2-pinch-roller",
    name: "Allwin 3.2 Double Rows Pinch Roller UV Printer",
    price: "₹ 21,00,000 / Piece",
    cta: "Get Latest Price",
    brochureLabel: "Product Brochure",
    brochureUrl:"https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+3.2+Double+Rows+Pinch+Roller+UV+Printer+-+PDF+Catalogue.pdf",
    images: [
      "images/Allwin 3.2 Double Rows Pinch Roller UV Printer/7-1.webp",
      "images/Allwin 3.2 Double Rows Pinch Roller UV Printer/7-2.webp",
    ],
    specs: [
      ["Usage/Application", "Posters Printing"],
      ["Printing Width (mm)", "3.2 m"],
      ["Ink Type", "UV Ink"],
      ["Brand", "Allwin"],
      ["Print Head", "KONICA10241-6PL / 10241-13PL / 1024A"],
      ["Weight", "1135 kg"],
      ["Power Consumption", "220 VAC, 50 Hz"],
      ["Printing Resolution", "2160 dpi"],
    ],
    highlights: [
      "3.2m width for large media",
      "Konica head options",
      "2160 dpi resolution",
      "Production-ready UV workflow",
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
    setIdx(0);
  }, [safeImages.join("|")]);

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
      <div className="px-4 py-3 border-b bg-muted/30">
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
    <div className="fixed top-0 left-0 right-0 z-40 lg:flex lg:justify-center lg:px-4 lg:pt-3">
      <motion.header
        className={`transition-all duration-300 px-4 md:px-6 lg:rounded-full ${
          isScrolled
            ? "bg-background/80 backdrop-blur-xl lg:border lg:border-border/50 shadow-soft"
            : "bg-background/30 backdrop-blur-sm lg:border lg:border-transparent"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between h-12 md:h-14 gap-4 md:gap-8">
          <a href="/" className="flex items-center gap-2">
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
              <path d="M30 30 L55 30" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
              <path d="M30 50 L50 50" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" />
              <path d="M30 70 L55 70" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
              <path d="M30 30 L30 70" stroke="hsl(var(--foreground))" strokeWidth="4" strokeLinecap="round" />
              <circle cx="68" cy="50" r="6" fill="hsl(var(--accent))" />
            </svg>

            <span className="font-display text-lg font-bold text-foreground hidden sm:block">
              Elkatech
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
          </div>

          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            type="button"
          >
            {isMenuOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
          </button>
        </div>

        {isMenuOpen && (
          <motion.div
            className="lg:hidden py-4 border-t border-border bg-background rounded-b-2xl"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 px-3 py-2.5 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-3 px-3 flex items-center gap-2">
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
export default function UVPrintersPage() {
   const [showIntro, setShowIntro] = useState(true);

  // ✅ Always start from top on navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
        {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      <Header />

      {/* push content below fixed navbar */}
      <div className="pt-16 md:pt-20 lg:pt-24">
        {/* HERO */}
        <section className="relative">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.10),transparent),radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.06),transparent)] dark:bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.06),transparent),radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.04),transparent)]" />
          <div className="mx-auto max-w-6xl px-4 pt-10 pb-10 md:pt-14">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-bold tracking-tight"
            >
              UV Printers
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-4 max-w-3xl text-base md:text-lg text-muted-foreground"
            >
              {uvIntro}
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
                    <h2 className="text-xl md:text-2xl font-semibold">{p.name}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base md:text-lg font-bold">{p.price}</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-5">
                      <ImageCarousel images={p.images} alt={p.name} />
                    </div>

                    <div className="lg:col-span-7 space-y-6">
                      <SpecsTable specs={p.specs} />

                      <div className="rounded-2xl border bg-muted/20 p-4">
                        <p className="text-sm font-semibold">Key Features</p>
                        <ul className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
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
                        {p.brochureUrl && (
                           <a
                                href={p.brochureUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-muted inline-flex items-center gap-2"
                            >
                                <FileText className="h-4 w-4" />
                                Download Brochure
                            </a>
                        )} 

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
