import type { RequestStatus, RequestStatusGroup } from "@elkatech/contracts";

export type { RequestStatusGroup };

export const REQUEST_STATUS_GROUPS: Record<
  RequestStatusGroup,
  {
    label: string;
    shortLabel: string;
    title: string;
    description: string;
  }
> = {
  all: {
    label: "All Requests",
    shortLabel: "All",
    title: "Service Requests",
    description: "Track active machinery service requests, updates, and support activity in one place.",
  },
  open: {
    label: "Open",
    shortLabel: "Open",
    title: "Open Requests",
    description: "Requests that are new or waiting for initial service review.",
  },
  in_progress: {
    label: "In Progress",
    shortLabel: "In Progress",
    title: "In-Progress Requests",
    description: "Requests assigned to the service team or actively being worked.",
  },
  pending: {
    label: "Pending / New",
    shortLabel: "Pending",
    title: "Pending Requests",
    description: "Requests waiting on customer input or the next service follow-up.",
  },
  resolved: {
    label: "Resolved / Finished",
    shortLabel: "Resolved",
    title: "Resolved Requests",
    description: "Finished requests that can be reviewed or reopened by the team if needed.",
  },
  archived: {
    label: "Archived",
    shortLabel: "Archived",
    title: "Archived Requests",
    description: "Closed or cancelled requests kept for service history.",
  },
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  new: "New",
  triaged: "Open",
  assigned: "Assigned",
  in_progress: "In Progress",
  waiting_for_customer: "Waiting",
  resolved: "Resolved",
  closed: "Archived",
};

export const REQUEST_STATUS_DESCRIPTIONS: Record<RequestStatus, string> = {
  new: "New service request awaiting review.",
  triaged: "Reviewed and ready for assignment.",
  assigned: "Assigned to a service engineer.",
  in_progress: "Service work is in progress.",
  waiting_for_customer: "Waiting for customer input or confirmation.",
  resolved: "Finished by the service team.",
  closed: "Archived for history.",
};

export const REQUEST_STATUS_BADGE_CLASSES: Record<RequestStatus, string> = {
  new: "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
  triaged: "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  assigned: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  in_progress: "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
  waiting_for_customer: "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  resolved: "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
  closed: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
};

/**
 * Mirror of backend services/service-desk/src/workflow.ts statusTransitions.
 * `assigned` is set only by /claim and /assign — never a /status target.
 * Reopen (`resolved|closed → new`) is admin-only; UI filtering happens in
 * RequestDetailPage.getAllowedStatuses, backend enforcement lives in
 * workflow.ts canTransitionRequestTo.
 */
export const REQUEST_STATUS_WORKFLOW: Record<RequestStatus, RequestStatus[]> = {
  new: ["triaged", "closed"],
  triaged: ["in_progress", "waiting_for_customer", "resolved", "closed"],
  assigned: ["triaged", "in_progress", "waiting_for_customer", "resolved", "closed"],
  in_progress: ["waiting_for_customer", "resolved", "closed"],
  waiting_for_customer: ["in_progress", "resolved", "closed"],
  resolved: ["new", "closed"],
  closed: ["new"],
};

export function getRequestStatusLabel(status: RequestStatus) {
  return REQUEST_STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

export function getRequestStatusGroup(status: RequestStatus): RequestStatusGroup {
  if (status === "closed") return "archived";
  if (status === "resolved") return "resolved";
  if (status === "waiting_for_customer") return "pending";
  if (status === "assigned" || status === "in_progress") return "in_progress";
  return "open";
}
