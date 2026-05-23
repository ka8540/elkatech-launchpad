import {
  motion,
  useInView,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import { useRef, type ReactNode } from "react";

type ScrollRevealVariant = "rise" | "fade" | "blur-rise" | "mask-up";

type ScrollRevealProps = Omit<
  HTMLMotionProps<"div">,
  "initial" | "animate" | "variants" | "transition"
> & {
  variant?: ScrollRevealVariant;
  delay?: number;
  duration?: number;
  distance?: number;
  // Trigger the reveal once it has scrolled past `amount` of the element.
  amount?: number;
  // If true (default), only animate the first time the element enters view.
  once?: boolean;
  children?: ReactNode;
};

const buildVariants = (
  variant: ScrollRevealVariant,
  distance: number
): Variants => {
  switch (variant) {
    case "fade":
      return {
        hidden: { opacity: 0 },
        shown: { opacity: 1 },
      };
    case "blur-rise":
      return {
        hidden: { opacity: 0, y: distance, filter: "blur(8px)" },
        shown: { opacity: 1, y: 0, filter: "blur(0px)" },
      };
    case "mask-up":
      return {
        hidden: { opacity: 0, clipPath: "inset(100% 0% 0% 0%)" },
        shown: { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" },
      };
    case "rise":
    default:
      return {
        hidden: { opacity: 0, y: distance },
        shown: { opacity: 1, y: 0 },
      };
  }
};

// IntersectionObserver-based reveal built on framer-motion's `useInView`.
// Unlike StableReveal (which intentionally avoids transforms to stay layout-
// stable on cards), this is for hero/text/feature reveals where a small
// translate or clip animation adds the "Apple-style" cinematic feel without
// causing meaningful layout shift. Honors prefers-reduced-motion by skipping
// the transform component of the animation.
const ScrollReveal = ({
  variant = "rise",
  delay = 0,
  duration = 0.8,
  distance = 28,
  amount = 0.25,
  once = true,
  children,
  ...rest
}: ScrollRevealProps) => {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount, once });

  const effectiveVariants = buildVariants(
    shouldReduceMotion ? "fade" : variant,
    distance
  );

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "shown" : "hidden"}
      variants={effectiveVariants}
      transition={{
        duration: shouldReduceMotion ? 0.2 : duration,
        delay: shouldReduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
