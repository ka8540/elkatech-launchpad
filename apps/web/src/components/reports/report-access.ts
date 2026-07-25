import {
  canManageReports,
  canReopenReport,
  canViewAllReports,
  REPORT_AREA_LABELS,
  REPORT_BROWSER_LABELS,
  REPORT_OS_LABELS,
  REPORT_SEVERITY_DESCRIPTIONS,
  REPORT_SEVERITY_LABELS,
  REPORT_STATUS_LABELS,
  type IssueReportRow,
  type ReportArea,
  type ReportSeverity,
  type ReportStatus,
  type Role,
} from "@elkatech/contracts";

/**
 * Pure logic for the Issue Reports console: labels, badge tones, which status
 * moves an actor may make, and the shape of the filter state. Kept out of the
 * components so the RBAC surface is unit-testable and cannot drift from the
 * gateway's own checks — same arrangement as `users/user-access.ts`.
 */

export const REPORT_STATUS_OPTIONS: Array<{ value: ReportStatus; label: string }> = (
  ["new", "working", "resolved"] as const
).map((value) => ({ value, label: REPORT_STATUS_LABELS[value] }));

export const REPORT_SEVERITY_OPTIONS: Array<{
  value: ReportSeverity;
  label: string;
  description: string;
}> = (["low", "medium", "high", "blocking"] as const).map((value) => ({
  value,
  label: REPORT_SEVERITY_LABELS[value],
  description: REPORT_SEVERITY_DESCRIPTIONS[value],
}));

export const REPORT_AREA_OPTIONS: Array<{ value: ReportArea; label: string }> = (
  [
    "login",
    "account",
    "service_requests",
    "attachments",
    "machines",
    "dashboard",
    "notifications",
    "other",
  ] as const
).map((value) => ({ value, label: REPORT_AREA_LABELS[value] }));

/* ── Badge tones ───────────────────────────────────────────────────────────
 * Three tones carry the whole table: neutral for settled states, accent for
 * "someone is on it", warning for anything demanding attention. Deliberately
 * narrow so a dense table stays readable instead of turning into confetti.
 */
export const REPORT_STATUS_BADGE_CLASSES: Record<ReportStatus, string> = {
  new: "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  working: "border-[var(--lp-accent)]/45 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
  resolved: "border-emerald-400/40 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300",
};

export const REPORT_SEVERITY_BADGE_CLASSES: Record<ReportSeverity, string> = {
  low: "border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 text-[var(--lp-ink-soft)]",
  medium: "border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300",
  high: "border-amber-400/45 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  blocking: "border-rose-400/45 bg-rose-400/10 text-rose-700 dark:text-rose-300",
};

export function reportStatusLabel(status: ReportStatus): string {
  return REPORT_STATUS_LABELS[status];
}

export function reportSeverityLabel(severity: ReportSeverity): string {
  return REPORT_SEVERITY_LABELS[severity];
}

export function reportAreaLabel(area: ReportArea): string {
  return REPORT_AREA_LABELS[area];
}

export function reportBrowserLabel(value: string | null): string {
  if (!value) return "—";
  return (REPORT_BROWSER_LABELS as Record<string, string>)[value] ?? value;
}

export function reportOsLabel(value: string | null): string {
  if (!value) return "—";
  return (REPORT_OS_LABELS as Record<string, string>)[value] ?? value;
}

/* ── Transitions ───────────────────────────────────────────────────────────
 * Mirrors services/service-desk/src/report-workflow.ts. The server is
 * authoritative; this exists so a button is never offered for a move the API
 * would reject.
 */
const TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  new: ["working"],
  working: ["resolved"],
  resolved: ["working"],
};

export function allowedTransitionsFor(role: Role, status: ReportStatus): ReportStatus[] {
  if (!canManageReports(role)) return [];
  return TRANSITIONS[status].filter((next) => {
    // Reopening undoes a recorded resolution, so it is narrower than the rest
    // of report management.
    if (status === "resolved" && next === "working") return canReopenReport(role);
    return true;
  });
}

/** Wording for the button that performs a transition. */
export function transitionLabel(from: ReportStatus, to: ReportStatus): string {
  if (from === "resolved" && to === "working") return "Reopen report";
  if (to === "working") return "Start working";
  if (to === "resolved") return "Mark resolved";
  return `Move to ${REPORT_STATUS_LABELS[to]}`;
}

/** Whether this actor sees the console's assignment and note controls at all. */
export function canActOnReports(role: Role): boolean {
  return canManageReports(role);
}

/** The staff console is currently Admin-only, so its actor always sees all rows. */
export function seesEveryReport(role: Role): boolean {
  return canViewAllReports(role);
}

/* ── Filters ───────────────────────────────────────────────────────────────
 * Note what is absent: there is no customer/reporter-identity filter. The
 * reporter reference is searchable because it is the anonymous handle; nothing
 * that identifies a person is queryable from this page.
 */
export type ReportFilters = {
  search: string;
  status: ReportStatus | "all";
  severity: ReportSeverity | "all";
  area: ReportArea | "all";
  assignee: string | "all";
  from: string;
  to: string;
};

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  search: "",
  status: "all",
  severity: "all",
  area: "all",
  assignee: "all",
  from: "",
  to: "",
};

export function hasActiveFilters(filters: ReportFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.severity !== "all" ||
    filters.area !== "all" ||
    filters.assignee !== "all" ||
    filters.from !== "" ||
    filters.to !== ""
  );
}

/** Filters → query string for `/api/reports`. Empty and "all" values are
 *  dropped so the URL stays readable and the server sees only real filters. */
export function buildReportQuery(
  filters: ReportFilters,
  page: { limit: number; offset: number },
): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.severity !== "all") params.set("severity", filters.severity);
  if (filters.area !== "all") params.set("area", filters.area);
  if (filters.assignee !== "all") params.set("assignee", filters.assignee);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("limit", String(page.limit));
  params.set("offset", String(page.offset));
  return params.toString();
}

/** Relative time for the table's Reported / Last updated columns. */
export function formatReportTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatReportDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Phrasing for a history row. Falls back to a humanised event type rather
 *  than dropping rows we do not have copy for. */
export function describeReportEvent(eventType: string): string {
  const known: Record<string, string> = {
    report_created: "Report submitted",
    status_changed: "Status changed",
    report_reopened: "Report reopened",
    report_assigned: "Assigned",
    report_reassigned: "Reassigned",
    note_added: "Note added",
    resolution_recorded: "Resolution recorded",
    request_linked: "Linked to service request",
    request_unlinked: "Service request unlinked",
    attachment_added: "Attachment added",
    reporter_identified: "Reporter identified by an admin",
  };
  return known[eventType] ?? eventType.replace(/_/g, " ");
}

/** Local summary for the metric row when only rows are on hand (tests, and the
 *  brief window before the server summary lands). */
export function summariseReports(reports: IssueReportRow[]) {
  return {
    new: reports.filter((r) => r.status === "new").length,
    working: reports.filter((r) => r.status === "working").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    blocking: reports.filter((r) => r.severity === "blocking" && r.status !== "resolved").length,
  };
}
