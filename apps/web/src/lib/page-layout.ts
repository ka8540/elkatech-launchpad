/**
 * Portal page containers.
 *
 * Every page had its own `mx-auto max-w-*` root — 6xl, 5xl, 7xl, 3xl, 1400px —
 * so each one centred itself at a different width and the content's left edge
 * jumped as you moved between pages. These containers are deliberately NOT
 * centred: the left edge is fixed by the shell's padding, so headers, toolbars
 * and tables line up across the whole portal in either sidebar state.
 */

/** Console pages — tables, dashboards, directories. Uses the full width left. */
export const PAGE_CONTAINER = "w-full min-w-0 space-y-5";

/**
 * Long-form pages — forms and reading content, where an unbounded measure hurts
 * legibility. Capped width but still left-aligned, so the left edge matches
 * every other page.
 */
export const PAGE_CONTAINER_READING = "w-full min-w-0 max-w-3xl space-y-5";

/** Primary action shown at the right side of a portal page header. */
export const PAGE_PRIMARY_ACTION =
  "h-10 rounded-full bg-[var(--lp-accent)] px-5 text-sm font-semibold text-[#fbfaf6] shadow-sm transition-colors hover:bg-[var(--lp-accent-2)]";
