import { cn } from "@/lib/utils";

type SectionEyebrowProps = {
  children: React.ReactNode;
  tone?: "navy" | "light";
  className?: string;
};

// Shared "industrial precision" eyebrow used above every section heading.
// Pairs a short accent rule with a small pill label so the public landing has
// a consistent rhythm without falling into generic SaaS pill chips.
const SectionEyebrow = ({ children, tone = "light", className }: SectionEyebrowProps) => {
  const isNavy = tone === "navy";

  return (
    <div
      className={cn(
        "mb-5 inline-flex items-center gap-3",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-px w-8",
          isNavy ? "bg-accent/60" : "bg-accent/70"
        )}
      />
      <span
        className={cn(
          "rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]",
          isNavy
            ? "border-white/15 bg-white/[0.04] text-accent"
            : "border-accent/20 bg-accent/[0.06] text-accent"
        )}
      >
        {children}
      </span>
    </div>
  );
};

export default SectionEyebrow;
