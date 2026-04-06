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
  new: ["triaged", "assigned", "closed"],
  triaged: ["assigned", "waiting_for_customer", "closed"],
  assigned: ["in_progress", "waiting_for_customer", "resolved", "closed"],
  in_progress: ["waiting_for_customer", "resolved", "closed"],
  waiting_for_customer: ["in_progress", "resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: [],
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

export function canClaimRequest(actor: WorkflowActor, request: WorkflowRequest) {
  if (request.status === "closed") {
    return false;
  }

  if (actor.role === "admin") {
    return true;
  }

  if (actor.role !== "engineer") {
    return false;
  }

  return !request.assignedEngineerId || request.assignedEngineerId === actor.id;
}

export function canUpdateRequestStatus(actor: WorkflowActor, request: WorkflowRequest) {
  if (actor.role === "admin") {
    return true;
  }

  if (actor.role !== "engineer") {
    return false;
  }

  return request.assignedEngineerId === actor.id;
}

export function isValidStatusTransition(current: RequestStatus, next: RequestStatus) {
  if (current === next) {
    return true;
  }

  return statusTransitions[current].includes(next);
}
