import {
  canViewSupportDashboard,
  type ActivityPersonState,
  type ApprovalStatus,
  type Role,
} from "@elkatech/contracts";

/**
 * Pure decision logic for the activity console. Extracted from the route
 * handlers so the RBAC rules and the "what is this person doing" derivation
 * can be unit-tested without a server or a database — same pattern as
 * `approval.ts`.
 */

export type RelCounts = {
  total: number;
  /** status = in_progress — actively being worked. */
  inProgress: number;
  /** status = assigned — accepted but not started. */
  pending: number;
  waiting: number;
  open: number;
  completed: number;
  unassigned: number;
  stale: number;
};

export const EMPTY_REL: RelCounts = {
  total: 0,
  inProgress: 0,
  pending: 0,
  waiting: 0,
  open: 0,
  completed: 0,
  unassigned: 0,
  stale: 0,
};

export type PersonWorkload = {
  engineer: RelCounts;
  customer: RelCounts;
  creator: RelCounts;
};

export function emptyWorkload(): PersonWorkload {
  return { engineer: { ...EMPTY_REL }, customer: { ...EMPTY_REL }, creator: { ...EMPTY_REL } };
}

// ─── RBAC ───────────────────────────────────────────────────────────────────

/** The people directory is a staff-coordination surface. Engineers get their
 *  own page but never the roster; customers never reach any of it. */
export function canAccessActivityDirectory(role: Role): boolean {
  return canViewSupportDashboard(role);
}

/** Directory access, or an engineer opening strictly their own page. */
export function canAccessPersonPage(
  actorRole: Role,
  actorId: string,
  targetUserId: string,
): boolean {
  if (canAccessActivityDirectory(actorRole)) return true;
  if (actorRole === "engineer") return actorId === targetUserId;
  return false;
}

// ─── Derivations ────────────────────────────────────────────────────────────

export type PersonStateResult = { state: ActivityPersonState; count: number };

/**
 * What is this person doing right now?
 *
 * Account state wins over workload — a suspended engineer reads "Suspended",
 * not "Working on 3". Every state carries the count the UI should render, so
 * no bare number is ever shown without context.
 */
export function derivePersonState(
  user: { role: Role; approvalStatus: ApprovalStatus },
  work: PersonWorkload,
): PersonStateResult {
  if (user.approvalStatus === "suspended") return { state: "suspended", count: 0 };
  if (user.approvalStatus === "pending_approval") return { state: "pending_approval", count: 0 };
  if (user.approvalStatus === "rejected") return { state: "rejected", count: 0 };

  if (work.engineer.inProgress > 0) return { state: "working", count: work.engineer.inProgress };
  if (work.engineer.pending > 0)
    return { state: "assignments_pending", count: work.engineer.pending };
  if (work.engineer.waiting > 0)
    return { state: "waiting_on_customer", count: work.engineer.waiting };

  if (user.role === "customer") {
    if (work.customer.open > 0) return { state: "open_requests", count: work.customer.open };
  } else if (work.creator.open > 0) {
    // Coordinating roles (support/owner/admin) own no queue, so their live
    // stake is the requests they filed that are still open.
    return { state: "open_requests", count: work.creator.open };
  }

  return { state: "no_active_work", count: 0 };
}

/** Headline Open/Completed figures resolved against the person's role, so the
 *  column always means something for that row. */
export function headlineCounts(
  role: Role,
  work: PersonWorkload,
): { open: number; completed: number } {
  if (role === "engineer") {
    return { open: work.engineer.open, completed: work.engineer.completed };
  }
  if (role === "customer") {
    return { open: work.customer.open, completed: work.customer.completed };
  }
  return { open: work.creator.open, completed: work.creator.completed };
}

// ─── History metadata whitelist ─────────────────────────────────────────────

export type ActivityEventDetails = {
  from: string | null;
  to: string | null;
  engineerId: string | null;
  engineerName: string | null;
  previousEngineerId: string | null;
  previousEngineerName: string | null;
  visibility: string | null;
  fields: string[] | null;
  issueType: string | null;
  attachmentKind: string | null;
};

/**
 * `request_history.metadata` is free-form jsonb, so it is never returned raw.
 * Only these keys survive: message bodies, cancellation reasons, object keys
 * and anything else an event may carry are dropped by construction.
 */
export function whitelistEventDetails(
  metadata: unknown,
  resolveName: (id: string) => string | null,
): ActivityEventDetails {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  const str = (key: string): string | null =>
    typeof meta[key] === "string" ? (meta[key] as string) : null;

  const engineerId = str("engineerId");
  const previousEngineerId = str("previousEngineerId");

  return {
    from: str("from"),
    to: str("to"),
    engineerId,
    engineerName: engineerId ? resolveName(engineerId) : null,
    previousEngineerId,
    previousEngineerName: previousEngineerId ? resolveName(previousEngineerId) : null,
    visibility: str("visibility"),
    fields: Array.isArray(meta.fields)
      ? (meta.fields as unknown[]).filter((f): f is string => typeof f === "string")
      : null,
    issueType: str("issueType"),
    attachmentKind: str("kind"),
  };
}
