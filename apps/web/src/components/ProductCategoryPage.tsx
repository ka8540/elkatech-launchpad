import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText, Wrench } from "lucide-react";
import IntroAnimation from "@/components/IntroAnimation";
import SiteHeader from "@/components/SiteHeader";
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

function ImageCarousel({ images, alt }: { images: string[]; alt: string }) {
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
    if (safeImages.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setIdx((current) => (current + 1) % safeImages.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [safeImages.length]);

  const prev = () => setIdx((current) => (current - 1 + safeImages.length) % safeImages.length);
  const next = () => setIdx((current) => (current + 1) % safeImages.length);

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
            {safeImages.map((image, imageIndex) => (
              <button
                key={`${image}-${imageIndex}`}
                onClick={() => setIdx(imageIndex)}
                className={`h-1.5 rounded-full transition-all ${
                  imageIndex === idx ? "w-6 bg-foreground" : "w-2.5 bg-foreground/30"
                }`}
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
  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="border-b bg-muted/30 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Specifications</p>
      </div>
      <div className="divide-y">
        {specs.map(([label, value]) => (
          <div key={label} className="grid grid-cols-12 gap-3 px-4 py-3">
            <div className="col-span-5 text-sm text-muted-foreground">{label}</div>
            <div className="col-span-7 text-sm text-foreground">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const ProductCategoryPage = ({ title, intro, products }: ProductCategoryPageProps) => {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showIntro && <IntroAnimation onComplete={() => setShowIntro(false)} />}
      <SiteHeader />

      <div className="pt-16 md:pt-20 lg:pt-24">
        <section className="relative">
          <div className="absolute inset-x-0 top-0 h-px section-divider" />
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.10),transparent),radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.06),transparent)] dark:bg-[radial-gradient(60%_60%_at_20%_10%,rgba(255,255,255,0.06),transparent),radial-gradient(50%_50%_at_80%_10%,rgba(255,255,255,0.04),transparent)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 ambient-surface-left" />
          <div className="mx-auto max-w-6xl px-4 pb-10 pt-10 md:pt-14">
            <StableReveal variant="section">
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{title}</h1>
            </StableReveal>

            <StableReveal variant="section" delay={0.08}>
              <p className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">{intro}</p>
            </StableReveal>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#products"
                className="rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
              >
                View Products
              </a>
              <Link
                to="/app/requests/new"
                className="rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-muted"
              >
                Open Service Portal
              </Link>
            </div>
          </div>
        </section>

        <section id="products" className="mx-auto max-w-6xl px-4 pb-16">
          <div className="space-y-10">
            {products.map((product, index) => (
              <StableReveal
                key={product.id}
                variant="card"
                delay={Math.min(index * 0.06, 0.24)}
                className="group relative isolate overflow-hidden rounded-3xl border bg-card transition-[border-color,box-shadow,background-color] duration-300 ease-out hover:border-blue-400/40 hover:shadow-[0_20px_70px_rgba(14,165,233,0.12)]"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 p-5 md:p-7">
                  <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-semibold md:text-2xl">{product.name}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold md:text-lg">{product.price}</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                      <ImageCarousel images={product.images} alt={product.name} />
                    </div>

                    <div className="space-y-6 lg:col-span-7">
                      <SpecsTable specs={product.specs} />

                      <div className="rounded-2xl border bg-muted/20 p-4">
                        <p className="text-sm font-semibold">Key Features</p>
                        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          {product.highlights.map((highlight) => (
                            <li key={highlight} className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-foreground/60" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={`/app/requests/new?product=${encodeURIComponent(product.id)}`}
                          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90"
                        >
                          <Wrench className="h-4 w-4" />
                          Request Service
                        </Link>
                        {product.brochureUrl && (
                          <a
                            href={product.brochureUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold hover:bg-muted"
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
      </div>
    </div>
  );
};

export default ProductCategoryPage;
