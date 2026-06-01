import type { RequestStatus, Role } from "@elkatech/contracts";

export type WorkflowActor = {
  id: string;
  role: Role;
};

export type WorkflowRequest = {
  customerId: string;
  assignedEngineerId: string | null;
  status: RequestStatus;
};

/**
 * Strict request lifecycle. The map intentionally only lists forward-or-
 * lateral transitions; "going back to new" is never offered as a normal step,
 * and `assigned` is reached only via the dedicated `/claim` / `/assign`
 * routes — never through `/status` — so it's not listed as a target here.
 *
 * Reopen actions (resolved/closed → new) are admin-only; that extra role
 * check lives in `canTransitionRequestTo` below.
 */
const statusTransitions: Record<RequestStatus, RequestStatus[]> = {
  new: ["triaged", "closed"],
  triaged: ["in_progress", "waiting_for_customer", "resolved", "closed"],
  assigned: ["triaged", "in_progress", "waiting_for_customer", "resolved", "closed"],
  in_progress: ["waiting_for_customer", "resolved", "closed"],
  waiting_for_customer: ["in_progress", "resolved", "closed"],
  resolved: ["new", "closed"],
  closed: ["new"],
};

export function canViewRequest(actor: WorkflowActor, request: WorkflowRequest) {
  if (actor.role === "admin") {
    return true;
  }

  if (actor.role === "customer") {
    return request.customerId === actor.id;
  }

  if (request.assignedEngineerId === actor.id) {
    return true;
  }

  return request.assignedEngineerId === null && request.status !== "closed";
}

export function canReplyToRequest(actor: WorkflowActor, request: WorkflowRequest) {
  if (actor.role === "admin") {
    return true;
  }

  if (actor.role === "customer") {
    return request.customerId === actor.id;
  }

  return request.assignedEngineerId === actor.id;
}

/**
 * Claim ownership. Allowed only when the request is currently UNASSIGNED.
 *
 * - Customers never claim.
 * - Engineers can claim only unassigned requests.
 * - Admins can claim only unassigned requests via this path. Reassigning an
 *   already-owned request to a different engineer goes through the dedicated
 *   admin-only `/assign` route — keeping claim a one-way "first to grab it"
 *   action prevents duplicate `request_claimed` history entries from re-clicks
 *   and stops one staff member silently stealing another's work.
 */
export function canClaimRequest(actor: WorkflowActor, request: WorkflowRequest) {
  if (request.status === "closed") {
    return false;
  }
  if (actor.role !== "engineer" && actor.role !== "admin") {
    return false;
  }
  return request.assignedEngineerId === null;
}

export function canUpdateRequestStatus(actor: WorkflowActor, request: WorkflowRequest) {
  if (actor.role === "admin") {
    return true;
  }

  if (actor.role !== "engineer") {
    return false;
  }

  if (request.status === "closed") {
    return false;
  }

  return request.assignedEngineerId === actor.id;
}

export function canEditRequestDetails(actor: WorkflowActor, request: WorkflowRequest) {
  if (request.status === "closed") {
    return false;
  }

  if (actor.role === "admin") {
    return true;
  }

  if (actor.role === "engineer") {
    return request.assignedEngineerId === actor.id;
  }

  return (
    request.customerId === actor.id &&
    ["new", "triaged", "waiting_for_customer"].includes(request.status)
  );
}

export function isValidStatusTransition(current: RequestStatus, next: RequestStatus) {
  // Same-status updates are noise and used to create duplicate
  // `status_changed` history rows — explicitly reject.
  if (current === next) {
    return false;
  }
  return statusTransitions[current].includes(next);
}

/**
 * Role-aware transition check. Wraps `canUpdateRequestStatus` (who may touch
 * the request at all) plus extra guards for reopen actions, which are
 * admin-only regardless of assignment.
 */
export function canTransitionRequestTo(
  actor: WorkflowActor,
  request: WorkflowRequest,
  nextStatus: RequestStatus,
): boolean {
  if (!canUpdateRequestStatus(actor, request)) return false;
  if (!isValidStatusTransition(request.status, nextStatus)) return false;
  // Reopen: only admins can take a finished request back into the active
  // pipeline. Engineers can archive their own resolved tickets but not
  // unilaterally reopen them.
  const isReopen =
    nextStatus === "new" &&
    (request.status === "resolved" || request.status === "closed");
  if (isReopen && actor.role !== "admin") return false;
  return true;
}

export function getAllowedTransitions(
  actor: WorkflowActor,
  request: WorkflowRequest,
): RequestStatus[] {
  if (!canUpdateRequestStatus(actor, request)) return [];
  return statusTransitions[request.status].filter((next) =>
    canTransitionRequestTo(actor, request, next),
  );
}
