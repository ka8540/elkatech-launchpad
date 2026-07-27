import { Link, useLocation } from "react-router-dom";
import type { ApprovalStatus, RequestStatus, Role } from "@elkatech/contracts";
import { cn } from "@/lib/utils";
import { getRequestStatusLabel, REQUEST_STATUS_BADGE_CLASSES } from "@/lib/request-status";
import { APPROVAL_LABELS, REMOVED_USER_LABEL, roleLabel } from "@/lib/activity";
import { customerMachineProfileState } from "@/lib/customer-machine-navigation";

/* ── Shared table chrome ─────────────────────────────────────────────────── */

const linkClasses =
  "rounded-sm font-medium text-[var(--lp-accent)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45";

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--lp-line)] lp-card">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      // Headers wrap rather than forcing the column wider than its share —
      // "Last Recorded Activity" would otherwise blow the layout out past the
      // content area whenever the sidebar is expanded.
      className={cn(
        "px-3 py-2.5 text-left align-bottom lp-mono text-[10px] font-medium uppercase leading-[1.3] tracking-[0.14em] text-[var(--lp-faint)]",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2.5 align-middle", className)}>{children}</td>;
}

export function Tr({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--lp-line)] transition-colors last:border-0 hover:bg-[var(--lp-panel-2)]/50",
        className,
      )}
    >
      {children}
    </tr>
  );
}

/* ── Badges ──────────────────────────────────────────────────────────────── */

export function RoleBadge({ role, muted = false }: { role: Role; muted?: boolean }) {
  const tone: Record<Role, string> = {
    admin: "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    owner: "border-violet-400/35 bg-violet-400/10 text-violet-700 dark:text-violet-300",
    support: "border-sky-400/35 bg-sky-400/10 text-sky-700 dark:text-sky-300",
    engineer: "border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
    customer: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  };
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        muted ? "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]" : tone[role],
      )}
    >
      {roleLabel(role)}
    </span>
  );
}

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const tone: Record<ApprovalStatus, string> = {
    approved: "border-emerald-400/35 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
    pending_approval: "border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300",
    rejected: "border-rose-400/35 bg-rose-400/10 text-rose-700 dark:text-rose-300",
    suspended: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  };
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        tone[status],
      )}
    >
      {APPROVAL_LABELS[status]}
    </span>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
        REQUEST_STATUS_BADGE_CLASSES[status],
      )}
    >
      {getRequestStatusLabel(status)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const tone: Record<string, string> = {
    urgent: "border-rose-400/35 bg-rose-400/10 text-rose-700 dark:text-rose-300",
    high: "border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300",
    normal: "border-sky-400/35 bg-sky-400/10 text-sky-700 dark:text-sky-300",
    low: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
  };
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
        tone[priority] ?? tone.low,
      )}
    >
      {priority}
    </span>
  );
}

/** A person whose account no longer exists. Deliberately not a link and never
 *  resolved to another account. */
export function RemovedUserBadge() {
  return (
    <span
      aria-disabled="true"
      title="This account was permanently removed"
      className="inline-flex cursor-not-allowed whitespace-nowrap rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lp-faint)] opacity-80"
    >
      {REMOVED_USER_LABEL}
    </span>
  );
}

/* ── Entity links — always visible text, never icon-only ─────────────────── */

export function PersonLink({
  id,
  name,
  className,
}: {
  id: string | null | undefined;
  name: string | null | undefined;
  className?: string;
}) {
  if (!id || !name) return <RemovedUserBadge />;
  return (
    <Link to={`/app/activity/${id}`} className={cn(linkClasses, className)}>
      {name}
    </Link>
  );
}

export function RequestLink({
  id,
  label,
  className,
}: {
  id: string;
  label: string;
  className?: string;
}) {
  return (
    <Link to={`/app/requests/${id}`} className={cn(linkClasses, className)}>
      {label}
    </Link>
  );
}

/** Machines live under the customer's machine profile, which is owner/admin
 *  only — callers pass `canView` so support never sees a link it cannot open. */
export function MachineLink({
  customerId,
  label,
  canView,
}: {
  customerId: string | null | undefined;
  label: string | null | undefined;
  canView: boolean;
}) {
  const location = useLocation();
  if (!label) return <span className="text-[var(--lp-faint)]">—</span>;
  if (!canView || !customerId) {
    return <span className="text-[var(--lp-ink-soft)]">{label}</span>;
  }
  return (
    <Link
      to={`/app/machines/${customerId}`}
      state={customerMachineProfileState(location.pathname, location.search)}
      className={linkClasses}
    >
      {label}
    </Link>
  );
}

/* ── States ──────────────────────────────────────────────────────────────── */

export function TableMessage({
  colSpan,
  children,
  tone = "muted",
}: {
  colSpan: number;
  children: React.ReactNode;
  tone?: "muted" | "error";
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={cn(
          "px-3 py-10 text-center text-sm",
          tone === "error" ? "text-rose-600 dark:text-rose-300" : "text-[var(--lp-faint)]",
        )}
      >
        {children}
      </td>
    </tr>
  );
}

export function SkeletonRows({ colSpan, rows = 5 }: { colSpan: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-b border-[var(--lp-line)] last:border-0">
          <td colSpan={colSpan} className="px-3 py-3">
            <div
              className="h-5 w-full animate-pulse rounded bg-[var(--lp-panel-2)]"
              aria-hidden="true"
            />
          </td>
        </tr>
      ))}
    </>
  );
}
