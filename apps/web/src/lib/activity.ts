import type {
  AccountOrigin,
  ActivityEvent,
  ActivityPersonRow,
  ActivityPersonState,
  ApprovalStatus,
  RequestStatus,
  Role,
} from "@elkatech/contracts";
import { getRequestStatusLabel } from "@/lib/request-status";

/** Shown wherever an actor id no longer resolves to an account. Never linked,
 *  never reattached to another person. */
export const REMOVED_USER_LABEL = "Removed user";

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  engineer: "Engineer",
  support: "Support",
  owner: "Owner",
  admin: "Admin",
};

export const APPROVAL_LABELS: Record<ApprovalStatus, string> = {
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const ORIGIN_LABELS: Record<AccountOrigin, string> = {
  self_signup: "Self signup",
  admin_invite: "Staff invited",
  firebase_google: "Google signup",
  legacy: "Legacy",
};

export function roleLabel(role: Role): string {
  return ROLE_LABELS[role] ?? role;
}

export function personName(name: string | null | undefined): string {
  return name && name.trim().length > 0 ? name : REMOVED_USER_LABEL;
}

/**
 * Human phrasing for the "Current Work" column. The API sends a discriminator
 * plus a count, so a number is never shown without context.
 */
export function describeCurrentWork(
  state: ActivityPersonState | string,
  count: number,
): string {
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  switch (state) {
    case "suspended":
      return "Suspended";
    case "pending_approval":
      return "Pending approval";
    case "rejected":
      return "Rejected";
    case "working":
      return `Working on ${count} ${plural(count, "request", "requests")}`;
    case "assignments_pending":
      return `${count} ${plural(count, "assignment", "assignments")} pending`;
    case "waiting_on_customer":
      return "Waiting for customer";
    case "open_requests":
      return `${count} open ${plural(count, "request", "requests")}`;
    case "no_active_work":
    default:
      return "No active work";
  }
}

/** Muted styling for states that mean "not working" rather than "idle". */
export function currentWorkTone(state: ActivityPersonState | string): "active" | "waiting" | "blocked" | "idle" {
  switch (state) {
    case "working":
    case "assignments_pending":
      return "active";
    case "waiting_on_customer":
    case "open_requests":
      return "waiting";
    case "suspended":
    case "rejected":
    case "pending_approval":
      return "blocked";
    default:
      return "idle";
  }
}

/* ── Activity history phrasing ───────────────────────────────────────────── */

export type EventDescription = {
  /** Full sentence, e.g. "Reassigned request from Alex to Priya". */
  label: string;
  /** Column value for "Previous", or null when the event has no prior value. */
  previous: string | null;
  /** Column value for "New", or null when the event has no resulting value. */
  next: string | null;
};

function statusLabel(status: string | null): string | null {
  if (!status) return null;
  return getRequestStatusLabel(status as RequestStatus);
}

/** Fallback for an event type the UI has not been taught yet: never show the
 *  raw identifier, humanise it instead. */
function humaniseEventType(eventType: string): string {
  const spaced = eventType.replaceAll("_", " ").trim();
  if (spaced.length === 0) return "Recorded action";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Translate a recorded event into readable text. Raw identifiers such as
 * `request_assigned` or `status_changed` are never surfaced.
 */
export function describeEvent(event: ActivityEvent): EventDescription {
  const d = event.details;
  const engineer = d.engineerName ?? (d.engineerId ? REMOVED_USER_LABEL : null);
  const previousEngineer =
    d.previousEngineerName ?? (d.previousEngineerId ? REMOVED_USER_LABEL : null);

  switch (event.eventType) {
    case "request_created":
      return { label: "Created service request", previous: null, next: null };

    case "request_updated": {
      const fields = d.fields && d.fields.length > 0 ? d.fields.join(", ") : null;
      return {
        label: fields ? `Updated request details (${fields})` : "Updated request details",
        previous: null,
        next: fields,
      };
    }

    case "request_claimed":
      return { label: "Claimed request", previous: null, next: null };

    case "request_assigned":
      return {
        label: engineer ? `Assigned request to ${engineer}` : "Assigned request",
        previous: null,
        next: engineer,
      };

    case "request_reassigned":
      return {
        label:
          previousEngineer && engineer
            ? `Reassigned request from ${previousEngineer} to ${engineer}`
            : engineer
              ? `Reassigned request to ${engineer}`
              : "Reassigned request",
        previous: previousEngineer,
        next: engineer,
      };

    case "status_changed": {
      const from = statusLabel(d.from);
      const to = statusLabel(d.to);
      return {
        label:
          from && to
            ? `Changed status from ${from} to ${to}`
            : to
              ? `Changed status to ${to}`
              : "Changed status",
        previous: from,
        next: to,
      };
    }

    case "message_added":
      return {
        label:
          d.visibility === "internal_note"
            ? "Added an internal note"
            : "Added a customer message",
        previous: null,
        next: null,
      };

    case "attachment_added":
      return {
        label: d.attachmentKind === "video" ? "Added a video attachment" : "Added an attachment",
        previous: null,
        next: null,
      };

    case "request_cancelled": {
      const from = statusLabel(d.from);
      return { label: "Cancelled request", previous: from, next: statusLabel(d.to) };
    }

    case "request_archived": {
      const from = statusLabel(d.from);
      return { label: "Archived request", previous: from, next: statusLabel(d.to) };
    }

    default:
      return { label: humaniseEventType(event.eventType), previous: null, next: null };
  }
}

/* ── Role-driven page composition ────────────────────────────────────────── */

export type PersonTabId =
  | "overview"
  | "tasks"
  | "requests"
  | "machines"
  | "service"
  | "assignments"
  | "messages"
  | "operations"
  | "history";

export type PersonTab = { id: PersonTabId; label: string };

/**
 * Sections differ by role — an engineer has a task queue, a customer has
 * machines, support coordinates. Only sections that make sense are shown.
 */
export function tabsForRole(role: Role): PersonTab[] {
  switch (role) {
    case "engineer":
      return [
        { id: "overview", label: "Overview" },
        { id: "tasks", label: "Current Tasks" },
        { id: "history", label: "Activity History" },
      ];
    case "customer":
      return [
        { id: "overview", label: "Overview" },
        { id: "requests", label: "Requests" },
        { id: "machines", label: "Machines" },
        { id: "history", label: "Activity History" },
      ];
    case "support":
      return [
        { id: "overview", label: "Overview" },
        { id: "service", label: "Service Activity" },
        { id: "assignments", label: "Assignments" },
        { id: "messages", label: "Messages" },
        { id: "history", label: "Activity History" },
      ];
    case "owner":
    case "admin":
    default:
      return [
        { id: "overview", label: "Overview" },
        { id: "operations", label: "Operations" },
        { id: "history", label: "Activity History" },
      ];
  }
}

/** Event-type filters backing the support/owner/admin section tabs. */
export const TAB_EVENT_TYPES: Partial<Record<PersonTabId, string[]>> = {
  service: ["request_created", "status_changed", "request_cancelled", "request_archived"],
  assignments: ["request_assigned", "request_reassigned", "request_claimed"],
  messages: ["message_added"],
  operations: [
    "request_created",
    "request_assigned",
    "request_reassigned",
    "status_changed",
    "request_cancelled",
    "request_archived",
  ],
};

/* ── Formatting ──────────────────────────────────────────────────────────── */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never";
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

/** Headline metrics for a person, resolved against their role. */
export function personMetrics(person: ActivityPersonRow): Array<{ label: string; value: number }> {
  const w = person.workload;
  if (person.role === "engineer") {
    return [
      { label: "Active assignments", value: w.asEngineer.inProgress + w.asEngineer.pending },
      { label: "Waiting", value: w.asEngineer.waiting },
      { label: "Completed", value: w.asEngineer.completed },
      { label: "Stale 7+ days", value: w.asEngineer.stale },
    ];
  }
  if (person.role === "customer") {
    return [
      { label: "Open requests", value: w.asCustomer.open },
      { label: "Unassigned", value: w.asCustomer.unassigned },
      { label: "Completed", value: w.asCustomer.completed },
      { label: "Recorded actions", value: w.recordedEvents },
    ];
  }
  return [
    { label: "Requests filed", value: w.asCreator.total },
    { label: "Still open", value: w.asCreator.open },
    { label: "Completed", value: w.asCreator.completed },
    { label: "Recorded actions", value: w.recordedEvents },
  ];
}
