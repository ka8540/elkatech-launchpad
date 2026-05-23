import { motion, useReducedMotion } from "framer-motion";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "default" | "on-graphite";
};

const ease = [0.22, 1, 0.36, 1] as const;

const LandingSectionHeading = ({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "default",
}: Props) => {
  const reduce = useReducedMotion();
  const ink = tone === "on-graphite" ? "#f1efe9" : "var(--lp-ink)";
  const soft = tone === "on-graphite" ? "rgba(241,239,233,0.66)" : "var(--lp-faint)";

  return (
    <div
      className={`mb-12 max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: reduce ? 0.2 : 0.5, ease }}
        className={`mb-4 flex items-center gap-2.5 ${align === "center" ? "justify-center" : ""}`}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--lp-accent)" }} />
        <span
          className="lp-mono text-[11px] uppercase tracking-[0.24em]"
          style={{ color: "var(--lp-accent)" }}
        >
          {eyebrow}
        </span>
      </motion.div>
      <motion.h2
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, filter: "blur(6px)" }}
        whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: reduce ? 0.2 : 0.65, ease, delay: reduce ? 0 : 0.08 }}
        className="lp-display text-3xl font-extrabold leading-[1.05] tracking-tight md:text-[2.6rem]"
        style={{ color: ink }}
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: reduce ? 0.2 : 0.6, ease, delay: reduce ? 0 : 0.16 }}
          className="mt-4 text-[15px] leading-relaxed md:text-base"
          style={{ color: soft }}
        >
          {description}
        </motion.p>
      )}
    </div>
  );
};

export default LandingSectionHeading;
