import { motion } from "framer-motion";

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation = ({ onComplete }: IntroAnimationProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-gradient"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 2.2, ease: "easeInOut" }}
      onAnimationComplete={onComplete}
    >
      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo Mark */}
        <motion.div
          className="relative mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-accent"
          >
            <motion.rect
              x="10"
              y="10"
              width="60"
              height="60"
              rx="8"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.3, ease: "easeInOut" }}
            />
            <motion.path
              d="M25 30 L40 30 M25 40 L50 40 M25 50 L40 50"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "easeInOut" }}
            />
            <motion.circle
              cx="55"
              cy="45"
              r="8"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 1.2, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>

        {/* Brand Name */}
        <motion.h1
          className="font-display text-4xl md:text-5xl font-bold text-primary-foreground tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Elkatech
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="mt-3 text-steel-medium text-sm tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
        >
          Industrial Print Solutions
        </motion.p>

        {/* Glow Line */}
        <motion.div
          className="mt-6 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 120, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
        />
      </motion.div>
    </motion.div>
  );
};

export default IntroAnimation;
