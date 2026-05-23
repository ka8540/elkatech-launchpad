import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Factory,
  FileText,
  Headset,
  PackageCheck,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import CatalogHeader from "@/components/CatalogHeader";
import { PRODUCT_CATEGORIES } from "@/components/landing/landingData";
import ProductPageBackground from "@/components/ProductPageBackground";
import StableReveal from "@/components/StableReveal";
import { toPublicAsset } from "@/lib/assets";

export type ProductSpec = [string, string];

export type ProductCategoryProduct = {
  id: string;
  name: string;
  price: string;
  cta?: string;
  brochureLabel?: string;
  brochureUrl?: string;
  images: string[];
  specs: ProductSpec[];
  highlights: string[];
};

type ProductCategoryPageProps = {
  title: string;
  intro: string;
  products: ProductCategoryProduct[];
};

type CategoryUseCase = {
  title: string;
  description: string;
};

type CategoryContext = {
  eyebrow: string;
  focus: string;
  supportNote: string;
  useCases: CategoryUseCase[];
  finalTitle: string;
  finalBody: string;
};

const DEFAULT_CONTEXT: CategoryContext = {
  eyebrow: "Industrial machinery catalog",
  focus: "Built for production shops that need dependable machine selection and clear technical detail.",
  supportNote:
    "ElkaTech keeps the catalog practical: visible product options, preserved specifications, brochure links and service-backed follow-up.",
  useCases: [
    {
      title: "Print production",
      description: "Machine options for commercial output, signage jobs and day-to-day shop workflows.",
    },
    {
      title: "Custom fabrication",
      description: "Equipment selection for businesses that work across boards, rolls, rigid media and finishing.",
    },
    {
      title: "Service-backed operations",
      description: "Product guidance with after-sales support for installation, parts and machine uptime.",
    },
  ],
  finalTitle: "Need help matching a machine to your workflow?",
  finalBody:
    "Share the media, floor space and production target. ElkaTech can help shortlist the right category and next service step.",
};

const CATEGORY_CONTEXT: Record<string, CategoryContext> = {
  "/solvent-printers": {
    eyebrow: "Wide-format solvent production",
    focus:
      "Solvent and eco-solvent printers for signage businesses producing banners, flex, vinyl and outdoor graphics at commercial volume.",
    supportNote:
      "Well suited to shops that need wide media handling, consistent drying and reliable throughput for outdoor display work.",
    useCases: [
      {
        title: "Banners and flex",
        description: "Outdoor advertising, hoardings, frontlit and backlit display production.",
      },
      {
        title: "Vinyl and vehicle graphics",
        description: "Durable roll-media output for wraps, decals, stickers and shop branding.",
      },
      {
        title: "High-volume print shops",
        description: "Production environments that need clear model comparison and dependable delivery.",
      },
    ],
    finalTitle: "Select a solvent printer with the right width and speed.",
    finalBody:
      "Compare the listed models, review the preserved specifications and request service support when you are ready to move forward.",
  },
  "/uv-printers": {
    eyebrow: "Instant-cure UV roll printing",
    focus:
      "UV printer options for roll media, specialty substrates and shops that need curing speed without a separate drying workflow.",
    supportNote:
      "Useful for businesses producing backlit media, soft signage and specialty roll-to-roll applications.",
    useCases: [
      {
        title: "Backlit and specialty media",
        description: "UV output for illuminated displays, film, soft signage and mixed roll substrates.",
      },
      {
        title: "Production UV workflows",
        description: "Instant curing helps reduce waiting time between print, finishing and dispatch.",
      },
      {
        title: "Flexible shop output",
        description: "Roll and hybrid UV options for teams handling varied signage orders.",
      },
    ],
    finalTitle: "Review UV printer options with clear technical context.",
    finalBody:
      "Use the product specifications and brochure links to compare the available machines before requesting service or sales follow-up.",
  },
  "/laser-cutting-machines": {
    eyebrow: "CO2 cutting and engraving",
    focus:
      "Laser cutting and engraving machines for sign makers and fabrication shops working with acrylic, wood, MDF and display components.",
    supportNote:
      "Best for teams that need a defined work area, software compatibility and dependable cutting support.",
    useCases: [
      {
        title: "Acrylic signage",
        description: "Cut letters, panels and display shapes for retail and architectural sign work.",
      },
      {
        title: "Wood and MDF engraving",
        description: "Engrave or cut wood-based materials for decor, branding and fabrication jobs.",
      },
      {
        title: "Production templates",
        description: "Repeatable cutting workflows for custom shop output and component preparation.",
      },
    ],
    finalTitle: "Choose a laser system around material and working area.",
    finalBody:
      "Review the listed cutting bed, controller and software details, then request guidance for installation or service planning.",
  },
  "/lamination-machines": {
    eyebrow: "Print finishing and protection",
    focus:
      "Cold and heat lamination machines for signage shops protecting banners, posters, vinyl graphics and rigid display work.",
    supportNote:
      "Finishing equipment helps extend print life, improve handling and prepare customer-ready display materials.",
    useCases: [
      {
        title: "Banner and poster finishing",
        description: "Protect printed media before delivery, installation or long-term display.",
      },
      {
        title: "Vinyl and wrap workflows",
        description: "Support graphics work where surface finish and durability matter.",
      },
      {
        title: "Wide-format shop production",
        description: "Pair lamination with printer output for a cleaner end-to-end workflow.",
      },
    ],
    finalTitle: "Add finishing capacity without cluttering production.",
    finalBody:
      "Compare width, roller, speed and automation details to match the laminator to your print shop workload.",
  },
  "/desktop-uv-printer": {
    eyebrow: "Compact rigid-media UV",
    focus:
      "Desktop UV printing for compact rigid substrates, personalized goods and smaller-format production inside print or gift businesses.",
    supportNote:
      "A practical fit for shops producing acrylic items, tiles, leather goods, bottles, boards and customized objects.",
    useCases: [
      {
        title: "Personalized products",
        description: "Print on gifts, cases, bottles, ceramic tiles and small rigid items.",
      },
      {
        title: "Rigid sample production",
        description: "Produce short-run jobs on acrylic, glass, wood, PVC and aluminum sheet.",
      },
      {
        title: "Compact shop workflows",
        description: "A3-format UV output where floor space and operator control matter.",
      },
    ],
    finalTitle: "Bring compact UV printing into a focused production space.",
    finalBody:
      "Use the preserved machine specifications to confirm media thickness, ink configuration and interface requirements.",
  },
  "/inkjet-printer": {
    eyebrow: "Giant-format inkjet output",
    focus:
      "Large-width inkjet printers for commercial signage operations producing hoardings, banners and outdoor branding work.",
    supportNote:
      "A strong fit for production teams that need wide print width, faster throughput and an industrial chassis.",
    useCases: [
      {
        title: "Hoardings and outdoor banners",
        description: "Wide-format output for large advertising jobs and city-scale display production.",
      },
      {
        title: "High-speed signage work",
        description: "Multi-head inkjet configurations for shops that process frequent large orders.",
      },
      {
        title: "Large-format dispatch",
        description: "Machine selection for workflows where print width and production timing drive the job.",
      },
    ],
    finalTitle: "Match inkjet width and throughput to your order volume.",
    finalBody:
      "Compare the listed models by print width, head count, speed and machine footprint before requesting support.",
  },
  "/flatbed-uv-printer": {
    eyebrow: "Rigid substrate UV printing",
    focus:
      "Flatbed UV printing for rigid boards, acrylic, glass, PVC, wood, metal and display materials used by signage and fabrication shops.",
    supportNote:
      "Useful when direct-to-substrate printing, media thickness and sharp output are central to the job.",
    useCases: [
      {
        title: "Acrylic, glass and PVC",
        description: "Direct print rigid display panels, decor items and signage surfaces.",
      },
      {
        title: "Wood and metal surfaces",
        description: "Support custom rigid-media production without mounting printed vinyl first.",
      },
      {
        title: "Board and panel workflows",
        description: "Flatbed handling for signage businesses producing customer-ready rigid graphics.",
      },
    ],
    finalTitle: "Evaluate flatbed UV around substrate and panel size.",
    finalBody:
      "Review the preserved print width, resolution, speed and media thickness details before planning installation or service.",
  },
};

function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
  const shouldReduceMotion = useReducedMotion();
  const safeImages = useMemo(() => {
    if (!Array.isArray(images) || images.length === 0) {
      return ["/images/elkatech.png"];
    }

    return images.map(toPublicAsset);
  }, [images]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [safeImages]);

  useEffect(() => {
    if (safeImages.length <= 1 || shouldReduceMotion) {
      return;
    }

    const timer = setInterval(() => {
      setIdx((current) => (current + 1) % safeImages.length);
    }, 4200);

    return () => clearInterval(timer);
  }, [safeImages.length, shouldReduceMotion]);

  const prev = () => setIdx((current) => (current - 1 + safeImages.length) % safeImages.length);
  const next = () => setIdx((current) => (current + 1) % safeImages.length);

  return (
    <div className="catalog-image-frame relative self-start overflow-hidden rounded-[8px] border">
      <div className="catalog-image-canvas flex aspect-[4/3] max-h-[320px] w-full items-center justify-center sm:aspect-[16/10] sm:max-h-[420px] lg:max-h-[460px]">
        <img
          src={safeImages[idx]}
          alt={alt}
          className="h-full max-h-full w-full max-w-full object-contain p-3 sm:p-5"
          loading="lazy"
        />
      </div>

      {safeImages.length > 1 && (
        <>
          <button
            onClick={prev}
            className="catalog-carousel-control absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border text-[var(--lp-ink)] shadow-sm backdrop-blur transition hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)]"
            aria-label="Previous image"
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={next}
            className="catalog-carousel-control absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border text-[var(--lp-ink)] shadow-sm backdrop-blur transition hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)]"
            aria-label="Next image"
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {safeImages.map((image, imageIndex) => (
              <button
                key={`${image}-${imageIndex}`}
                onClick={() => setIdx(imageIndex)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: imageIndex === idx ? "1.5rem" : "0.625rem",
                  backgroundColor:
                    imageIndex === idx ? "var(--lp-accent)" : "color-mix(in srgb, var(--lp-ink) 24%, transparent)",
                }}
                aria-label={`Go to image ${imageIndex + 1}`}
                type="button"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SpecsTable({ specs }: { specs: ProductSpec[] }) {
  if (specs.length === 0) {
    return null;
  }

  return (
    <div className="catalog-spec-table overflow-hidden rounded-[8px] border">
      <div className="border-b border-[var(--lp-line)] px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-[var(--lp-ink)]">Specifications</p>
      </div>
      <div className="divide-y divide-[var(--lp-line)]">
        {specs.map(([label, value], index) => (
          <div
            key={`${label}-${index}`}
            className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[minmax(120px,0.72fr)_minmax(0,1.28fr)] sm:gap-4 sm:px-5"
          >
            <div className="min-w-0 text-sm text-[var(--lp-faint)]">{label}</div>
            <div className="min-w-0 break-words text-sm font-medium leading-6 text-[var(--lp-ink)]">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ProductCategoryPage = ({ title, intro, products }: ProductCategoryPageProps) => {
  const location = useLocation();
  const category = PRODUCT_CATEGORIES.find((item) => item.href === location.pathname);
  const context = CATEGORY_CONTEXT[location.pathname] ?? DEFAULT_CONTEXT;
  const heroImage = toPublicAsset(category?.image ?? products[0]?.images[0] ?? "/images/elkatech.png");
  const heroTags = category?.tags ?? context.useCases.map((item) => item.title);
  const brochureCount = products.filter((product) => product.brochureUrl).length;
  const specCount = products.reduce((total, product) => total + product.specs.length, 0);
  const firstProductId = products[0]?.id;

  return (
    <div
      className="lp product-catalog lp-grain relative isolate min-h-screen overflow-hidden"
      style={{ background: "var(--lp-bg)", color: "var(--lp-ink)" }}
    >
      <CatalogHeader />
      <ProductPageBackground />

      <main className="relative z-10">
        <section className="relative min-h-[88svh] overflow-hidden pt-28 text-[var(--lp-on-graphite)] sm:pt-32 lg:pt-36">
          <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10 lg:pb-24">
            <div className="max-w-2xl">
              <StableReveal variant="section">
                <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--lp-accent)]" />
                  <span className="lp-mono text-[10px] uppercase tracking-[0.22em] text-[var(--lp-on-graphite-soft)] sm:text-[11px]">
                    {context.eyebrow}
                  </span>
                </div>
              </StableReveal>

              <StableReveal variant="section" delay={0.06}>
                <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.02] tracking-normal text-[var(--lp-on-graphite)] sm:text-6xl lg:text-7xl">
                  {title}
                </h1>
              </StableReveal>

              <StableReveal variant="section" delay={0.12}>
                <p className="mt-6 max-w-xl text-base leading-8 text-[var(--lp-on-graphite-soft)] sm:text-lg">
                  {category?.description ?? context.focus}
                </p>
              </StableReveal>

              <StableReveal variant="fade" delay={0.18}>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[rgba(241,239,233,0.58)]">
                  {intro}
                </p>
              </StableReveal>

              <StableReveal variant="fade" delay={0.24}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <a
                    href="#products"
                    className="group inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[0_20px_50px_-16px_var(--lp-glow)] transition-transform hover:-translate-y-0.5"
                    style={{ background: "var(--lp-accent)" }}
                  >
                    View Machines
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </a>
                  <Link
                    to="/login"
                    className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-[var(--lp-on-graphite)] backdrop-blur transition-colors hover:bg-white/[0.06]"
                  >
                    <Headset className="h-4 w-4 text-[var(--lp-accent)]" />
                    Service Portal
                  </Link>
                </div>
              </StableReveal>

              <StableReveal variant="fade" delay={0.3}>
                <dl className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-[8px] border border-white/10 bg-white/[0.06]">
                  <div className="bg-black/35 px-4 py-4">
                    <dd className="text-2xl font-bold text-[var(--lp-on-graphite)]">{products.length}</dd>
                    <dt className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[rgba(241,239,233,0.55)]">
                      Listed Machines
                    </dt>
                  </div>
                  <div className="bg-black/35 px-4 py-4">
                    <dd className="text-2xl font-bold text-[var(--lp-on-graphite)]">{brochureCount}</dd>
                    <dt className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[rgba(241,239,233,0.55)]">
                      Brochures
                    </dt>
                  </div>
                  <div className="bg-black/35 px-4 py-4">
                    <dd className="text-2xl font-bold text-[var(--lp-on-graphite)]">{specCount}</dd>
                    <dt className="mt-1 text-[10px] uppercase tracking-[0.13em] text-[rgba(241,239,233,0.55)]">
                      Technical Details
                    </dt>
                  </div>
                </dl>
              </StableReveal>
            </div>

            <StableReveal variant="card" delay={0.14} className="relative">
              <figure className="catalog-hero-machine relative overflow-hidden rounded-[8px] border">
                <div className="absolute left-4 top-4 z-10 rounded-md bg-black/55 px-2.5 py-1.5 backdrop-blur">
                  <span className="lp-mono text-[10px] uppercase tracking-[0.2em] text-[var(--lp-accent)]">
                    {category ? `${category.index} · ${category.short}` : "Catalog"}
                  </span>
                </div>
                <img
                  src={heroImage}
                  alt={`${title} machinery`}
                  className="aspect-[4/3] w-full object-contain p-5"
                  loading="eager"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[var(--lp-accent)]" />
              </figure>
              <div className="mt-3 flex flex-wrap gap-2">
                {heroTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-[var(--lp-on-graphite-soft)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </StableReveal>
          </div>
        </section>

        <section id="products" className="mx-auto max-w-[1200px] px-5 pb-16 pt-10 sm:px-8 lg:px-10 lg:pb-24">
          <StableReveal variant="section" className="mb-8 max-w-3xl">
            <p className="lp-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-accent)]">Product Lineup</p>
            <h2 className="mt-3 text-3xl font-bold tracking-normal text-[var(--lp-ink)] sm:text-4xl">
              Machines, images and specifications
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--lp-ink-soft)]">
              Compare product images, prices, specifications and brochures in one technical view.
            </p>
          </StableReveal>

          <div className="space-y-8">
            {products.map((product, index) => (
              <StableReveal
                key={product.id}
                variant="card"
                delay={Math.min(index * 0.06, 0.24)}
                className="catalog-product-panel group relative isolate overflow-hidden rounded-[8px] border transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-[var(--lp-accent)]"
              >
                <div className="relative z-10 p-5 sm:p-6 lg:p-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="lp-mono text-[11px] uppercase tracking-[0.2em] text-[var(--lp-accent)]">
                        Machine {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 max-w-3xl text-2xl font-bold tracking-normal text-[var(--lp-ink)] lg:text-3xl">
                        {product.name}
                      </h3>
                    </div>
                    <div className="w-fit rounded-full border border-[var(--lp-line)] bg-[var(--lp-panel-2)] px-4 py-2 text-sm font-bold text-[var(--lp-ink)]">
                      {product.price}
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                    <ImageCarousel images={product.images} alt={product.name} />

                    <div className="min-w-0 space-y-5">
                      <SpecsTable specs={product.specs} />

                      {product.highlights.length > 0 && (
                        <div className="catalog-feature-list rounded-[8px] border p-4 sm:p-5">
                          <p className="text-sm font-semibold text-[var(--lp-ink)]">Key features</p>
                          <ul className="mt-3 grid grid-cols-1 gap-2 text-sm leading-6 text-[var(--lp-ink-soft)] sm:grid-cols-2">
                            {product.highlights.map((highlight) => (
                              <li key={highlight} className="flex min-w-0 gap-2">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lp-accent)]" />
                                <span className="min-w-0">{highlight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <Link
                          to={`/app/requests/new?product=${encodeURIComponent(product.id)}`}
                          className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_-18px_var(--lp-glow)] transition-transform hover:-translate-y-0.5"
                          style={{ background: "var(--lp-accent)" }}
                        >
                          <Wrench className="h-4 w-4" />
                          Request Service
                        </Link>
                        {product.brochureUrl && (
                          <a
                            href={product.brochureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--lp-line-strong)] px-5 py-3 text-sm font-semibold text-[var(--lp-ink)] transition-colors hover:border-[var(--lp-accent)] hover:text-[var(--lp-accent)]"
                          >
                            <FileText className="h-4 w-4" />
                            {product.brochureLabel || "Download Brochure"}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </StableReveal>
            ))}
          </div>
        </section>

        <section id="use-cases" className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8 lg:px-10 lg:pb-24">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <StableReveal variant="section">
              <p className="lp-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-accent)]">Applications</p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal text-[var(--lp-ink)] sm:text-4xl">
                Where this category fits
              </h2>
              <p className="mt-4 text-base leading-7 text-[var(--lp-ink-soft)]">{context.focus}</p>
              <p className="mt-4 text-sm leading-7 text-[var(--lp-faint)]">{context.supportNote}</p>
            </StableReveal>

            <div className="grid gap-4 sm:grid-cols-3">
              {context.useCases.map((useCase, index) => (
                <StableReveal
                  key={useCase.title}
                  variant="card"
                  delay={Math.min(index * 0.06, 0.18)}
                  className="catalog-use-case rounded-[8px] border p-5"
                >
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--lp-line)] bg-[var(--lp-panel-2)] text-[var(--lp-accent)]">
                    {index === 0 && <Factory className="h-4 w-4" />}
                    {index === 1 && <PackageCheck className="h-4 w-4" />}
                    {index === 2 && <ShieldCheck className="h-4 w-4" />}
                  </div>
                  <h3 className="text-base font-semibold tracking-normal text-[var(--lp-ink)]">{useCase.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--lp-ink-soft)]">{useCase.description}</p>
                </StableReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-5 pb-20 sm:px-8 lg:px-10">
          <StableReveal variant="section" className="catalog-final-cta overflow-hidden rounded-[8px] border p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="max-w-2xl">
                <p className="lp-mono text-xs uppercase tracking-[0.2em] text-[var(--lp-accent)]">
                  Service-backed selection
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-normal text-[var(--lp-on-graphite)] sm:text-4xl">
                  {context.finalTitle}
                </h2>
                <p className="mt-4 text-base leading-7 text-[var(--lp-on-graphite-soft)]">{context.finalBody}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link
                  to={{ pathname: "/", hash: "#contact" }}
                  className="group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_44px_-18px_var(--lp-glow)] transition-transform hover:-translate-y-0.5"
                  style={{ background: "var(--lp-accent)" }}
                >
                  Contact ElkaTech
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to={firstProductId ? `/app/requests/new?product=${encodeURIComponent(firstProductId)}` : "/login"}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-[var(--lp-on-graphite)] transition-colors hover:bg-white/[0.06]"
                >
                  <Headset className="h-4 w-4 text-[var(--lp-accent)]" />
                  Request Service
                </Link>
              </div>
            </div>
          </StableReveal>
        </section>
      </main>
    </div>
  );
};

export default ProductCategoryPage;
