import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";
import { useRef, type ReactNode, type RefObject } from "react";

type ParallaxLayerProps = Omit<HTMLMotionProps<"div">, "style"> & {
  // Distance in pixels the layer travels along Y across its target's scroll
  // range. Positive values move down as you scroll, negative move up.
  offset?: number;
  // Optional scroll target (defaults to the layer's own element). Pass a
  // parent section ref to bind the parallax to a larger scroll range.
  target?: RefObject<HTMLElement>;
  // Fade the layer out toward the end of the scroll range.
  fadeOut?: boolean;
  // Spring smoothing of the scroll progress for buttery motion. Set to
  // `null` to disable smoothing (snappier, no overshoot).
  smooth?: boolean;
  children?: ReactNode;
};

// Thin parallax layer driven by framer-motion's useScroll. Tracks either the
// element's own viewport intersection or a passed-in target ref (e.g. the
// outer section), then translates Y by `offset` and optionally fades. Honors
// prefers-reduced-motion by collapsing the transform to zero.
const ParallaxLayer = ({
  offset = -60,
  target,
  fadeOut = false,
  smooth = true,
  children,
  ...rest
}: ParallaxLayerProps) => {
  const shouldReduceMotion = useReducedMotion();
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollTarget = (target ?? innerRef) as RefObject<HTMLElement>;

  const { scrollYProgress } = useScroll({
    target: scrollTarget,
    offset: ["start end", "end start"],
  });

  const smoothed = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 24,
    mass: 0.5,
  });
  const source = smooth ? smoothed : scrollYProgress;

  const yRange = shouldReduceMotion ? [0, 0] : [-offset, offset];
  const y = useTransform(source, [0, 1], yRange);
  const opacity = useTransform(source, [0, 0.7, 1], fadeOut ? [1, 0.85, 0.55] : [1, 1, 1]);

  return (
    <motion.div ref={innerRef} style={{ y, opacity }} {...rest}>
      {children}
    </motion.div>
  );
};

export default ParallaxLayer;
