import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ClipboardList,
  Compass,
  PackageSearch,
  Settings2,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import SectionEyebrow from "@/components/SectionEyebrow";
import ScrollReveal from "@/components/ScrollReveal";

type Stage = {
  id: string;
  index: string;
  title: string;
  description: string;
  icon: LucideIcon;
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
    bullets: ["Pan-India road logistics", "Insured handling", "Transparent timelines"],
  },
  {
    id: "install",
    index: "04",
    title: "Install & train",
    description:
      "Calibration, profile setup, and operator training on your floor — so the machine is producing revenue, not sitting in a crate.",
    icon: Settings2,
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
    bullets: [
      "Portal-tracked service tickets",
      "Spares + consumables",
      "Engineer assignment & visit history",
    ],
  },
] as const;

const N = STAGES.length;

// Each stage owns a slice of the section's 0→1 scroll progress. Adjacent
// slices overlap slightly via `bleed` so panels cross-fade rather than
// hard-switch.
const SLICE = 1 / N;
const BLEED = SLICE * 0.4;

function stageOpacityRange(i: number) {
  const start = i * SLICE;
  const end = (i + 1) * SLICE;
  return {
    input: [
      Math.max(start - BLEED, 0),
      start,
      end,
      Math.min(end + BLEED, 1),
    ] as const,
    opacity: [0, 1, 1, 0] as const,
    y: [24, 0, 0, -24] as const,
  };
}

const StickyStorySection = () => {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const smoothed = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.5,
  });
  const progress = shouldReduceMotion ? scrollYProgress : smoothed;

  // Hooks are called in a fixed order at the top of the component — one
  // pair per stage. STAGES has a stable length so the call order is stable
  // across renders.
  const r0 = stageOpacityRange(0);
  const r1 = stageOpacityRange(1);
  const r2 = stageOpacityRange(2);
  const r3 = stageOpacityRange(3);
  const r4 = stageOpacityRange(4);

  const op0 = useTransform(progress, [...r0.input], [...r0.opacity]);
  const op1 = useTransform(progress, [...r1.input], [...r1.opacity]);
  const op2 = useTransform(progress, [...r2.input], [...r2.opacity]);
  const op3 = useTransform(progress, [...r3.input], [...r3.opacity]);
  const op4 = useTransform(progress, [...r4.input], [...r4.opacity]);

  const y0 = useTransform(progress, [...r0.input], [...r0.y]);
  const y1 = useTransform(progress, [...r1.input], [...r1.y]);
  const y2 = useTransform(progress, [...r2.input], [...r2.y]);
  const y3 = useTransform(progress, [...r3.input], [...r3.y]);
  const y4 = useTransform(progress, [...r4.input], [...r4.y]);

  const stageMotion = [
    { opacity: op0, y: y0 },
    { opacity: op1, y: y1 },
    { opacity: op2, y: y2 },
    { opacity: op3, y: y3 },
    { opacity: op4, y: y4 },
  ];

  const activeIndex = useTransform(progress, (p) => {
    const clamped = Math.min(Math.max(p, 0), 0.999);
    return Math.floor(clamped * N);
  });

  const railFill = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id="process"
      ref={sectionRef}
      className="relative bg-background"
      // Each stage gets ~80vh of scroll for comfortable reading; an extra
      // viewport of buffer lets the sticky inner area enter and exit cleanly.
      style={{ height: `calc(${N} * 80vh + 100vh)` }}
    >
      <div className="absolute inset-x-0 top-0 h-px section-divider" />

      {/* Mobile fallback: stacked cards, no pinning. The sticky layout only
          renders at lg+ so smaller viewports get a clean linear story. */}
      <div className="lg:hidden">
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
                <div className="relative z-10 flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <stage.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-[11px] uppercase tracking-[0.18em] text-accent">
                      Stage {stage.index}
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
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Desktop sticky storytelling */}
      <div className="hidden lg:block">
        <div className="sticky top-0 flex h-screen items-center">
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
                  {STAGES.map((stage, i) => (
                    <StepperItem
                      key={stage.id}
                      stage={stage}
                      index={i}
                      activeIndex={activeIndex}
                    />
                  ))}
                </ol>
              </div>
            </div>

            <div className="col-span-6 flex items-center justify-center">
              <div className="relative aspect-[4/5] w-full max-w-md">
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

                {STAGES.map((stage, i) => (
                  <motion.div
                    key={stage.id}
                    style={{ opacity: stageMotion[i].opacity, y: stageMotion[i].y }}
                    className="absolute inset-0 flex flex-col justify-between rounded-[28px] p-8 xl:p-10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-display text-[11px] uppercase tracking-[0.2em] text-accent">
                        Stage {stage.index}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/80 bg-background/80 shadow-inner shadow-black/[0.04]">
                        <stage.icon className="h-6 w-6 text-accent" />
                      </div>
                    </div>

                    <div>
                      <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground xl:text-3xl">
                        {stage.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground xl:text-base">
                        {stage.description}
                      </p>
                      <ul className="mt-5 space-y-2.5">
                        {stage.bullets.map((b) => (
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
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

type StepperItemProps = {
  stage: Stage;
  index: number;
  activeIndex: MotionValue<number>;
};

const StepperItem = ({ stage, index, activeIndex }: StepperItemProps) => {
  const titleOpacity = useTransform(activeIndex, (i) => (i === index ? 1 : 0.45));
  const dotScale = useTransform(activeIndex, (i) => (i === index ? 1.0 : 0.6));

  return (
    <li className="-ml-[15px] flex items-center gap-3">
      <motion.span
        style={{ scale: dotScale }}
        className="block h-3 w-3 rounded-full border-2 border-accent bg-background"
      />
      <motion.span
        style={{ opacity: titleOpacity }}
        className="font-display text-sm font-medium tracking-tight text-foreground"
      >
        <span className="mr-3 font-mono text-[11px] tracking-widest text-accent">
          {stage.index}
        </span>
        {stage.title}
      </motion.span>
    </li>
  );
};

export default StickyStorySection;
