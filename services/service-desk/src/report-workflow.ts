import {
  canManageReports,
  canReopenReport,
  canViewAllReports,
  type ReportStatus,
  type Role,
} from "@elkatech/contracts";

/**
 * Issue-report lifecycle and visibility. Pure functions, no database — the
 * service-desk routes call these and also express the same visibility rule as
 * a SQL predicate, so the UI, the API and the query can never disagree about
 * who may see what.
 */

export type ReportActor = {
  id: string;
  role: Role;
};

export type WorkflowReport = {
  reporterUserId: string | null;
  assignedUserId: string | null;
  status: ReportStatus;
};

/**
 * The whole state machine. Three statuses, three legal moves — there is no
 * free-text status anywhere in the feature, and anything not listed here is
 * rejected before it reaches the database (which also has a check constraint).
 */
const statusTransitions: Record<ReportStatus, ReportStatus[]> = {
  new: ["working"],
  working: ["resolved"],
  resolved: ["working"],
};

/** Moving a resolved report back to working undoes a recorded resolution. */
export function isReopen(from: ReportStatus, to: ReportStatus): boolean {
  return from === "resolved" && to === "working";
}

export function isValidReportTransition(from: ReportStatus, to: ReportStatus): boolean {
  // Same-status "changes" only create noise in the history table.
  if (from === to) return false;
  return statusTransitions[from]?.includes(to) ?? false;
}

/**
 * Who may see the staff report projection. Customer ownership is checked by
 * `isReportOwner` on the separate `/reports/mine` routes.
 */
export function canViewReport(actor: ReportActor, _report: WorkflowReport): boolean {
  return canViewAllReports(actor.role);
}

/** Ownership check for the customer-safe projection only. */
export function isReportOwner(actorId: string, reporterUserId: string | null): boolean {
  return reporterUserId !== null && reporterUserId === actorId;
}

/** Whether this actor may take *any* staff action on the report. */
export function canManageReport(actor: ReportActor): boolean {
  return canManageReports(actor.role);
}

export function canTransitionReportTo(
  actor: ReportActor,
  report: WorkflowReport,
  next: ReportStatus,
): boolean {
  if (!canManageReport(actor)) return false;
  if (!isValidReportTransition(report.status, next)) return false;
  if (isReopen(report.status, next) && !canReopenReport(actor.role)) return false;
  return true;
}

/** Statuses this actor may move the report to right now. Drives the UI so a
 *  button is never offered for a move the API would reject. */
export function allowedReportTransitions(
  actor: ReportActor,
  report: WorkflowReport,
): ReportStatus[] {
  if (!canManageReport(actor)) return [];
  return (statusTransitions[report.status] ?? []).filter((next) =>
    canTransitionReportTo(actor, report, next),
  );
}
