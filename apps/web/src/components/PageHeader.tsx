import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The single page header used across the portal.
 *
 * Every page had drifted into its own treatment — some with an icon chip, some
 * a bare `h1`, some wrapped in a decorated card with an eyebrow — so titles
 * started at different x-positions and descriptions wrapped at different
 * widths. One component keeps the optical baseline identical everywhere.
 *
 * Anatomy: copper icon chip │ title + one-line description │ optional action.
 */
export default function PageHeader({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Primary page action, right-aligned on desktop. */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="lp-display break-words text-2xl font-bold leading-tight text-[var(--lp-ink)] sm:text-3xl">
            {title}
          </h1>
          {description && (
            // Capped width so the sentence breaks on a deliberate line rather
            // than running the full table width and wrapping raggedly.
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--lp-ink-soft)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2 sm:pt-1">{action}</div>}
    </header>
  );
}
