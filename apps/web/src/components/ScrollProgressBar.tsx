import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

// Thin top-edge progress indicator that fills as the user scrolls the page.
// Sits behind the floating navbar (z-40 vs nav z-50) so it never overlaps the
// pill header. Disabled gracefully under prefers-reduced-motion by collapsing
// the spring smoothing.
const ScrollProgressBar = () => {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const smoothed = useSpring(scrollYProgress, {
    stiffness: shouldReduceMotion ? 200 : 110,
    damping: shouldReduceMotion ? 40 : 28,
    mass: 0.4,
  });

  // Fade the bar in only after the user has begun scrolling, so it doesn't
  // distract on the hero.
  const opacity = useTransform(scrollYProgress, [0, 0.02, 0.04], [0, 0.8, 1]);

  return (
    <motion.div
      aria-hidden
      style={{ scaleX: smoothed, opacity, transformOrigin: "0% 50%" }}
      className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[2px] bg-gradient-to-r from-transparent via-accent to-cyan-300/80"
    />
  );
};

export default ScrollProgressBar;
