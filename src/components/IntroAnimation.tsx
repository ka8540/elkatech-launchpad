import { motion } from "framer-motion";
import { useEffect } from "react";

interface IntroAnimationProps {
  onComplete: () => void;
}

const IntroAnimation = ({ onComplete }: IntroAnimationProps) => {
  // Use a simple timer instead of onAnimationComplete to avoid multiple triggers
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // 2 seconds total intro duration
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.5, delay: 1.8, ease: "easeInOut" }}
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1.2, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </div>

      <motion.div
        className="flex flex-col items-center relative z-10"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Logo Mark - Geometric E */}
        <motion.div
          className="relative mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer frame */}
            <motion.rect
              x="12"
              y="12"
              width="76"
              height="76"
              rx="12"
              stroke="hsl(var(--accent))"
              strokeWidth="2.5"
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeInOut" }}
            />
            
            {/* E letter strokes */}
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <motion.path
                d="M30 30 L55 30"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.6, ease: "easeOut" }}
              />
              <motion.path
                d="M30 50 L50 50"
                stroke="hsl(var(--accent))"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.75, ease: "easeOut" }}
              />
              <motion.path
                d="M30 70 L55 70"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3, delay: 0.9, ease: "easeOut" }}
              />
              {/* Vertical bar */}
              <motion.path
                d="M30 30 L30 70"
                stroke="hsl(var(--foreground))"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
              />
            </motion.g>

            {/* Tech dot accent */}
            <motion.circle
              cx="68"
              cy="50"
              r="6"
              fill="hsl(var(--accent))"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: 1.1, ease: "easeOut" }}
            />
          </svg>

          {/* Subtle glow effect on logo */}
          <motion.div
            className="absolute inset-0 blur-xl bg-accent/20 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          />
        </motion.div>

        {/* Brand Name */}
        <motion.h1
          className="font-display text-5xl md:text-6xl font-bold text-foreground tracking-tight"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          Elkatech
        </motion.h1>

        {/* Tagline */}
        <motion.p
          className="mt-4 text-muted-foreground text-sm tracking-[0.25em] uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          Built on Trust. Grown with You.
        </motion.p>

        {/* Elegant line divider */}
        <motion.div
          className="mt-8 h-[1px] bg-gradient-to-r from-transparent via-accent to-transparent"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 160, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        />
      </motion.div>
    </motion.div>
  );
};

export default IntroAnimation;
