import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  ClipboardList,
  Compass,
  PackageSearch,
  Settings2,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import SectionEyebrow from "@/components/SectionEyebrow";
import ScrollReveal from "@/components/ScrollReveal";

type Stage = {
  id: string;
  index: string;
  title: string;
  description: string;
  icon: LucideIcon;
  imageSrc: string;
  imageAlt: string;
  bullets: string[];
};

const STAGES: readonly Stage[] = [
  {
    id: "discover",
    index: "01",
    title: "Understand your operation",
    description:
      "We start with a discovery conversation — substrates, throughput, finishing, environment. Honest scoping, no upsell pressure.",
    icon: ClipboardList,
    imageSrc: "/images/how-we-work/discovery-operation.webp",
    imageAlt:
      "Industrial consultation workbench with substrate samples and printing workflow planning",
    bullets: [
      "On-site or virtual walkthrough",
      "Workflow & substrate audit",
      "Volume + ROI sanity-check",
    ],
  },
  {
    id: "match",
    index: "02",
    title: "Match the right machine",
    description:
      "We recommend from 10+ international brands based on what your work actually needs — not whatever happens to be on the shelf.",
    icon: Compass,
    imageSrc: "/images/how-we-work/machine-matching.webp",
    imageAlt:
      "Technical visualization of large-format printing machines being compared for selection",
    bullets: [
      "Solvent, UV, laser, lamination, flatbed",
      "Side-by-side spec comparison",
      "Demo & sample prints where available",
    ],
  },
  {
    id: "source",
    index: "03",
    title: "Source & dispatch",
    description:
      "Ready stock of popular models and parts, secure warehouse handling in Ahmedabad, and road dispatch across India when you're ready.",
    icon: PackageSearch,
    imageSrc: "/images/how-we-work/dispatch-logistics.webp",
    imageAlt:
      "Crated industrial printing machinery prepared for warehouse dispatch and road logistics",
    bullets: ["Pan-India road logistics", "Insured handling", "Transparent timelines"],
  },
  {
    id: "install",
    index: "04",
    title: "Install & train",
    description:
      "Calibration, profile setup, and operator training on your floor — so the machine is producing revenue, not sitting in a crate.",
    icon: Settings2,
    imageSrc: "/images/how-we-work/install-training.webp",
    imageAlt:
      "Technician calibrating a large-format printer during operator training in a workshop",
    bullets: [
      "On-site commissioning",
      "Operator + supervisor training",
      "Color & media profiling",
    ],
  },
  {
    id: "support",
    index: "05",
    title: "Support, parts & uptime",
    description:
      "Long-term after-sales partnership — service requests, spare parts, and engineering help, all tracked through the ElkaTech service portal.",
    icon: LifeBuoy,
    imageSrc: "/images/how-we-work/support-uptime.webp",
    imageAlt:
      "Close-up of industrial printer maintenance parts with diagnostic support lighting",
    bullets: [
      "Portal-tracked service tickets",
      "Spares + consumables",
      "Engineer assignment & visit history",
    ],
  },
] as const;

const N = STAGES.length;

const clampStepIndex = (raw: number) =>
  Math.min(N - 1, Math.max(0, Math.floor(raw)));

const StickyStorySection = () => {
  const shouldReduceMotion = useReducedMotion();
  // Bind scroll progress to the desktop track wrapper, not the <section>.
  // The wrapper provides the entire scroll distance for the pinned story; the
  // section itself just contains it. On viewports below `lg` the wrapper is
  // display:none and the ref's rect collapses to zero — the motion values
  // resolve to their initial state and the (unrendered) sticky panel just
  // doesn't see them. The mobile path uses normal in-flow ScrollReveal.
  const desktopTrackRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: desktopTrackRef,
    offset: ["start start", "end end"],
  });

  const smoothed = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.5,
  });
  const progress = shouldReduceMotion ? scrollYProgress : smoothed;

  // The stepper rail fill is a smooth motion value — it's the only thing
  // that should animate *continuously* on this section. Stage content
  // switches discretely.
  const railFill = useTransform(progress, [0, 1], ["0%", "100%"]);

  // Mirror the discrete active-step index into React state so AnimatePresence
  // can swap a single keyed panel. The functional setState prevents
  // re-renders when the floor() of progress hasn't actually changed, so the
  // component renders at most N times across the full scroll.
  const [activeStep, setActiveStep] = useState(0);
  useMotionValueEvent(progress, "change", (latest) => {
    const next = clampStepIndex(latest * N);
    setActiveStep((prev) => (prev === next ? prev : next));
  });

  const active = STAGES[activeStep];

  return (
    <section
      id="process"
      className="relative scroll-mt-24 bg-background"
    >
      <div className="absolute inset-x-0 top-0 h-px section-divider" />

      {/* Mobile fallback: stacked cards in natural flow. Also used whenever
          the user prefers reduced motion — pinned storytelling is replaced
          with normal readable flow so the page is comfortable for everyone.
          The section's height collapses to this content's height — no dead
          space. */}
      <div className={shouldReduceMotion ? "" : "lg:hidden"}>
        <div className="container mx-auto px-4 py-20 md:px-6">
          <div className="mb-12 max-w-2xl">
            <SectionEyebrow>How we work</SectionEyebrow>
            <h2 className="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              From inquiry to{" "}
              <span className="text-gradient-accent">long-term partnership</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Five steps that turn an industrial machinery purchase into a productive line on your floor — and a partner you can call years later.
            </p>
          </div>
          <ol className="space-y-5">
            {STAGES.map((stage) => (
              <li
                key={stage.id}
                className="group relative isolate overflow-hidden rounded-2xl border border-border bg-card p-6"
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.06] via-transparent to-cyan-400/5 opacity-80" />
                <div className="relative z-10">
                  <div className="mb-5 overflow-hidden rounded-xl border border-border/80 bg-navy-gradient shadow-[0_20px_55px_-28px_rgba(14,165,233,0.5)]">
                    <img
                      src={stage.imageSrc}
                      alt={stage.imageAlt}
                      loading="lazy"
                      className="aspect-video h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <stage.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-display text-[11px] uppercase tracking-[0.18em] text-accent">
                        Step {stage.index}
                      </p>
                      <h3 className="mt-1 font-display text-lg font-semibold text-foreground">
                        {stage.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {stage.description}
                      </p>
                      <ul className="mt-3 space-y-1.5">
                        {stage.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Desktop sticky storytelling. The wrapper owns the full scroll
          distance (≈ N × 70vh). Inside, the sticky child fills the viewport
          beneath the navbar and centers its content. When the wrapper's
          bottom passes the viewport, the child un-sticks cleanly and the
          next section appears right after — no dead space. Suppressed
          entirely under prefers-reduced-motion (stacked layout above is
          shown at all viewport sizes instead). */}
      <div
        ref={desktopTrackRef}
        className={shouldReduceMotion ? "hidden" : "hidden lg:block"}
        style={{ height: `calc(${N} * 70vh)` }}
      >
        <div className="sticky top-24 flex h-[calc(100vh-6rem)] items-center">
          <div className="container mx-auto grid grid-cols-12 gap-10 px-6">
            <div className="col-span-6 flex flex-col justify-center">
              <ScrollReveal variant="rise" amount={0.2}>
                <SectionEyebrow>How we work</SectionEyebrow>
              </ScrollReveal>
              <ScrollReveal variant="rise" delay={0.08} amount={0.2}>
                <h2 className="mt-1 font-display text-4xl font-semibold tracking-tight text-foreground xl:text-5xl">
                  From inquiry to{" "}
                  <span className="text-gradient-accent">long-term partnership</span>
                </h2>
              </ScrollReveal>
              <ScrollReveal variant="fade" delay={0.16} amount={0.2}>
                <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
                  Five steps that turn an industrial machinery purchase into a productive line on your floor — and a partner you can call years later.
                </p>
              </ScrollReveal>

              <div className="mt-10 flex gap-6">
                <div className="relative w-px overflow-hidden rounded-full bg-border/80">
                  <motion.div
                    style={{ height: railFill }}
                    className="absolute inset-x-0 top-0 bg-gradient-to-b from-accent via-accent/80 to-cyan-300/70"
                  />
                </div>
                <ol className="flex flex-col gap-6">
                  {STAGES.map((stage, i) => {
                    const isActive = i === activeStep;
                    return (
                      <li
                        key={stage.id}
                        className="-ml-[15px] flex items-center gap-3"
                      >
                        <span
                          className={
                            "block h-3 w-3 rounded-full border-2 border-accent bg-background transition-transform duration-300 " +
                            (isActive ? "scale-100" : "scale-[0.6]")
                          }
                        />
                        <span
                          className={
                            "font-display text-sm font-medium tracking-tight text-foreground transition-opacity duration-300 " +
                            (isActive ? "opacity-100" : "opacity-45")
                          }
                        >
                          <span className="mr-3 font-mono text-[11px] tracking-widest text-accent">
                            {stage.index}
                          </span>
                          {stage.title}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>

            {/* Right column: the visual card. The static frame backgrounds
                stay mounted; only the active stage's content swaps inside
                an AnimatePresence so old text exits fully before new text
                enters — no glyph overlap. */}
            <div className="col-span-6 flex items-center justify-center">
              <div className="relative min-h-[640px] w-full max-w-lg">
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[28px] border border-border/80 bg-card shadow-[0_30px_90px_-30px_rgba(15,23,42,0.35)]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[28px] opacity-60 dark:opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.10) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                    maskImage:
                      "radial-gradient(ellipse at center, black 40%, transparent 85%)",
                    WebkitMaskImage:
                      "radial-gradient(ellipse at center, black 40%, transparent 85%)",
                  }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_70%_22%,rgba(14,165,233,0.18),transparent_55%)]"
                />

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 flex flex-col justify-between rounded-[28px] p-8 xl:p-10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-display text-[11px] uppercase tracking-[0.18em] text-accent">
                        Step {active.index}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-background/80 shadow-inner shadow-black/[0.04]">
                        <active.icon className="h-6 w-6 text-accent" />
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-border/80 bg-navy-gradient shadow-[0_24px_70px_-32px_rgba(14,165,233,0.55)]">
                      <img
                        src={active.imageSrc}
                        alt={active.imageAlt}
                        loading="lazy"
                        className="aspect-video h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground xl:text-3xl">
                        {active.title}
                      </h3>
                      <p className="mt-3 min-h-[5rem] text-sm leading-relaxed text-muted-foreground xl:text-base">
                        {active.description}
                      </p>
                      <ul className="mt-5 space-y-2.5">
                        {active.bullets.map((b) => (
                          <li
                            key={b}
                            className="flex items-start gap-2.5 text-sm text-foreground/80"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StickyStorySection;
