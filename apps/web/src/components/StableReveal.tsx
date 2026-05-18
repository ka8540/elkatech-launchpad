import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

type StableRevealProps = Omit<
  HTMLMotionProps<"div">,
  "initial" | "whileInView" | "viewport" | "transition"
> & {
  delay?: number;
};

const StableReveal = ({ delay = 0, ...props }: StableRevealProps) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      {...props}
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.38,
        delay: shouldReduceMotion ? 0 : delay,
        ease: "easeOut",
      }}
    />
  );
};

export default StableReveal;
