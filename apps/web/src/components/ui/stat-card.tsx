import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatAccent =
  | "copper"
  | "emerald"
  | "amber"
  | "steel"
  | "sky"
  | "rose";

const badgeMap: Record<StatAccent, string> = {
  copper:
    "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
  emerald:
    "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
  amber:
    "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  steel:
    "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  sky: "border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-300",
  rose: "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-300",
};

/**
 * The single stat tile used by every portal summary row.
 *
 * Tiles are equal height (`h-full`) and the count is pushed to the bottom with
 * `mt-auto`, so a label that wraps to two lines does not shove its own number
 * out of line with its neighbours' — the misalignment that showed up whenever
 * the sidebar was expanded and labels lost their single-line fit.
 */
export function StatCard({
  label,
  count,
  icon: Icon,
  accent,
  hint,
  active = false,
  onClick,
}: {
  label: string;
  count: number | string;
  icon: LucideIcon;
  accent: StatAccent;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const interactive = typeof onClick === "function";

  const body = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <p className="lp-mono min-w-0 break-words text-[10px] font-medium uppercase leading-4 tracking-[0.16em] text-[var(--lp-faint)]">
          {label}
        </p>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            badgeMap[accent],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <p className="lp-display mt-auto pt-3 text-3xl font-bold leading-none text-[var(--lp-ink)]">
        {count}
      </p>
      {hint && (
        <p className="mt-1.5 text-[11px] font-medium text-[var(--lp-faint)]">
          {hint}
        </p>
      )}
    </>
  );

  const className = cn(
    "relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl p-4 transition-colors duration-150 lp-card",
    "hover:border-[var(--lp-line-strong)]",
    active && "border-[var(--lp-accent)]/55 bg-[var(--lp-accent)]/[0.08]",
    interactive &&
      "text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/35",
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(className, "group w-full")}
      >
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}

/**
 * Wrapper for a row of `StatCard`s. Override the tile floor per row with
 * `style={{ "--lp-stat-min": "11rem" }}` when labels are unusually long.
 */
export function StatGrid({
  children,
  className,
  minTileWidth,
}: {
  children: React.ReactNode;
  className?: string;
  minTileWidth?: string;
}) {
  return (
    <div
      className={cn("lp-stat-grid", className)}
      style={
        minTileWidth
          ? ({ "--lp-stat-min": minTileWidth } as React.CSSProperties)
          : undefined
      }
    >
      {children}
    </div>
  );
}
