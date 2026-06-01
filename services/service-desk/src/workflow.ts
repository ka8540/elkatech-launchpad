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

const statusTransitions: Record<RequestStatus, RequestStatus[]> = {
  new: ["triaged", "assigned", "in_progress", "waiting_for_customer", "resolved", "closed"],
  triaged: ["new", "assigned", "in_progress", "waiting_for_customer", "resolved", "closed"],
  assigned: ["new", "triaged", "in_progress", "waiting_for_customer", "resolved", "closed"],
  in_progress: ["new", "triaged", "waiting_for_customer", "resolved", "closed"],
  waiting_for_customer: ["new", "triaged", "assigned", "in_progress", "resolved", "closed"],
  resolved: ["new", "in_progress", "closed"],
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
  if (current === next) {
    return true;
  }

  return statusTransitions[current].includes(next);
}
