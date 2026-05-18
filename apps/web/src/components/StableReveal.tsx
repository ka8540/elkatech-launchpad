import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

type StableRevealVariant = "fade" | "section" | "card";

type StableRevealProps = Omit<
  HTMLMotionProps<"div">,
  "initial" | "whileInView" | "viewport" | "transition"
> & {
  delay?: number;
  once?: boolean;
  variant?: StableRevealVariant;
};

const revealStyles: Record<
  StableRevealVariant,
  {
    hidden: { opacity: number; filter?: string };
    visible: { opacity: number; filter?: string };
    duration: number;
    amount: number;
  }
> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    duration: 0.42,
    amount: 0.18,
  },
  section: {
    hidden: { opacity: 0, filter: "blur(6px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
    duration: 0.68,
    amount: 0.2,
  },
  card: {
    hidden: { opacity: 0, filter: "blur(5px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
    duration: 0.58,
    amount: 0.14,
  },
};

const StableReveal = ({
  delay = 0,
  once = true,
  variant = "fade",
  ...props
}: StableRevealProps) => {
  const shouldReduceMotion = useReducedMotion();
  const reveal = revealStyles[variant];

  return (
    <motion.div
      {...props}
      // This component intentionally avoids transform/scale/layout animations to prevent refresh-time layout shift.
      initial={shouldReduceMotion ? false : reveal.hidden}
      whileInView={reveal.visible}
      viewport={{ once, amount: reveal.amount }}
      transition={{
        duration: shouldReduceMotion ? 0.01 : reveal.duration,
        delay: shouldReduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    />
  );
};

export default StableReveal;
