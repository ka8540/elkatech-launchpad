import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toPublicAsset } from "@/lib/assets";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/components/landing/landingData";
import LandingSectionHeading from "@/components/landing/LandingSectionHeading";

const ease = [0.22, 1, 0.36, 1] as const;

const CardImage = ({ category, className }: { category: ProductCategory; className?: string }) => (
  <div className={`relative overflow-hidden ${className ?? ""}`} style={{ background: "var(--lp-graphite)" }}>
    <img
      src={toPublicAsset(category.image)}
      alt={category.title}
      loading="lazy"
      className="h-full w-full object-cover transition-transform [transition-duration:900ms] ease-out group-hover:scale-[1.05]"
      style={category.imageKind === "shot" ? { filter: "saturate(0.95) contrast(1.02)" } : undefined}
    />
    {/* Graphite scrim keeps every image — render or product shot — cohesive */}
    <div
      className="pointer-events-none absolute inset-0"
      style={{ background: "linear-gradient(to top, rgba(8,9,11,0.78) 2%, rgba(8,9,11,0.18) 38%, transparent 70%)" }}
    />
    <span
      className="lp-mono absolute right-3 top-3 rounded-md px-2 py-1 text-[10px] uppercase tracking-[0.16em]"
      style={{ background: "rgba(8,9,11,0.5)", color: "#f1efe9" }}
    >
      {category.short}
    </span>
  </div>
);

const CategoryCard = ({ category, delay }: { category: ProductCategory; delay: number }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.3 : 0.6, ease, delay: reduce ? 0 : delay }}
    >
      <Link
        to={category.href}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1"
        style={{ background: "var(--lp-panel)", borderColor: "var(--lp-line)" }}
      >
        <CardImage category={category} className="h-52" />
        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="lp-mono text-xs" style={{ color: "var(--lp-accent)" }}>
              {category.index}
            </span>
            <span className="h-px flex-1" style={{ background: "var(--lp-line)" }} />
          </div>
          <h3 className="lp-display text-lg font-bold leading-tight" style={{ color: "var(--lp-ink)" }}>
            {category.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--lp-faint)" }}>
            {category.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {category.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border px-2.5 py-1 text-[11px]"
                style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink-soft)" }}
              >
                {t}
              </span>
            ))}
          </div>
          <span
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: "var(--lp-accent)" }}
          >
            Explore products
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

const FeatureCard = ({ category }: { category: ProductCategory }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: reduce ? 0.3 : 0.7, ease }}
      className="sm:col-span-2 lg:col-span-3"
    >
      <Link
        to={category.href}
        className="group grid overflow-hidden rounded-3xl border transition-all duration-300 hover:-translate-y-1 md:grid-cols-2"
        style={{ background: "var(--lp-panel)", borderColor: "var(--lp-line)" }}
      >
        <CardImage category={category} className="min-h-[260px] md:min-h-[340px]" />
        <div className="flex flex-col justify-center p-7 md:p-10">
          <div className="mb-3 flex items-center gap-3">
            <span className="lp-mono text-sm" style={{ color: "var(--lp-accent)" }}>
              {category.index}
            </span>
            <span
              className="lp-mono rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]"
              style={{ borderColor: "var(--lp-line)", color: "var(--lp-faint)" }}
            >
              Best seller
            </span>
          </div>
          <h3 className="lp-display text-2xl font-extrabold leading-tight md:text-3xl" style={{ color: "var(--lp-ink)" }}>
            {category.title}
          </h3>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed" style={{ color: "var(--lp-faint)" }}>
            {category.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {category.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border px-3 py-1 text-xs"
                style={{ borderColor: "var(--lp-line)", color: "var(--lp-ink-soft)" }}
              >
                {t}
              </span>
            ))}
          </div>
          <span
            className="mt-7 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform group-hover:translate-x-1"
            style={{ background: "var(--lp-accent)" }}
          >
            Explore products
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
};

const LandingProductCategories = () => {
  const [feature, ...rest] = PRODUCT_CATEGORIES;

  return (
    <section
      id="products"
      className="relative scroll-mt-24 py-20 md:py-28"
      style={{ background: "var(--lp-bg)" }}
    >
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-10">
        <LandingSectionHeading
          eyebrow="Product Range"
          title="Pick the machinery built for your floor"
          description="Seven core categories spanning printing, cutting, engraving and finishing. Select a category to view the full machine line-up and specifications."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard category={feature} />
          {rest.map((c, i) => (
            <CategoryCard key={c.href} category={c} delay={Math.min(i * 0.06, 0.3)} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingProductCategories;
