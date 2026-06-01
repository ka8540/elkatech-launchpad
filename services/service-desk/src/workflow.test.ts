import { describe, expect, it } from "vitest";
import {
  canClaimRequest,
  canEditRequestDetails,
  canReplyToRequest,
  canUpdateRequestStatus,
  canViewRequest,
  isValidStatusTransition,
} from "./workflow";

describe("service desk workflow permissions", () => {
  const customer = { id: "customer-1", role: "customer" as const };
  const engineer = { id: "engineer-1", role: "engineer" as const };
  const otherEngineer = { id: "engineer-2", role: "engineer" as const };
  const admin = { id: "admin-1", role: "admin" as const };

  it("lets customers view and reply only on their own requests", () => {
    const request = {
      customerId: "customer-1",
      assignedEngineerId: null,
      status: "new" as const,
    };

    expect(canViewRequest(customer, request)).toBe(true);
    expect(canReplyToRequest(customer, request)).toBe(true);
    expect(
      canViewRequest({ id: "customer-2", role: "customer" }, request),
    ).toBe(false);
    expect(
      canReplyToRequest({ id: "customer-2", role: "customer" }, request),
    ).toBe(false);
  });

  it("lets engineers inspect queue items but only reply after assignment", () => {
    const queueRequest = {
      customerId: "customer-1",
      assignedEngineerId: null,
      status: "triaged" as const,
    };
    const assignedRequest = {
      customerId: "customer-1",
      assignedEngineerId: "engineer-1",
      status: "assigned" as const,
    };

    expect(canViewRequest(engineer, queueRequest)).toBe(true);
    expect(canReplyToRequest(engineer, queueRequest)).toBe(false);
    expect(canViewRequest(engineer, assignedRequest)).toBe(true);
    expect(canReplyToRequest(engineer, assignedRequest)).toBe(true);
    expect(canViewRequest(otherEngineer, assignedRequest)).toBe(false);
  });

  it("restricts claim and status updates to the right staff", () => {
    const openRequest = {
      customerId: "customer-1",
      assignedEngineerId: null,
      status: "new" as const,
    };
    const assignedRequest = {
      customerId: "customer-1",
      assignedEngineerId: "engineer-1",
      status: "in_progress" as const,
    };

    expect(canClaimRequest(engineer, openRequest)).toBe(true);
    expect(canClaimRequest(otherEngineer, assignedRequest)).toBe(false);
    expect(canUpdateRequestStatus(engineer, assignedRequest)).toBe(true);
    expect(canUpdateRequestStatus(otherEngineer, assignedRequest)).toBe(false);
    // An already-assigned request can never be re-claimed — not by the
    // current owner (avoids duplicate "Request Claimed" history) and not
    // by an admin (admins reassign via /assign, not /claim).
    expect(canClaimRequest(engineer, assignedRequest)).toBe(false);
    expect(canClaimRequest(admin, assignedRequest)).toBe(false);
    expect(canClaimRequest(admin, openRequest)).toBe(true);
    expect(canUpdateRequestStatus(admin, assignedRequest)).toBe(true);
    // Customers can never claim.
    expect(canClaimRequest(customer, openRequest)).toBe(false);
  });

  it("prevents engineers from changing archived requests", () => {
    const archivedRequest = {
      customerId: "customer-1",
      assignedEngineerId: "engineer-1",
      status: "closed" as const,
    };

    expect(canUpdateRequestStatus(engineer, archivedRequest)).toBe(false);
    expect(canUpdateRequestStatus(admin, archivedRequest)).toBe(true);
  });

  it("allows detail edits only for safe owners and staff", () => {
    const openCustomerRequest = {
      customerId: "customer-1",
      assignedEngineerId: null,
      status: "new" as const,
    };
    const inProgressRequest = {
      customerId: "customer-1",
      assignedEngineerId: "engineer-1",
      status: "in_progress" as const,
    };
    const archivedRequest = {
      customerId: "customer-1",
      assignedEngineerId: "engineer-1",
      status: "closed" as const,
    };

    expect(canEditRequestDetails(customer, openCustomerRequest)).toBe(true);
    expect(canEditRequestDetails(customer, inProgressRequest)).toBe(false);
    expect(canEditRequestDetails(engineer, inProgressRequest)).toBe(true);
    expect(canEditRequestDetails(otherEngineer, inProgressRequest)).toBe(false);
    expect(canEditRequestDetails(admin, inProgressRequest)).toBe(true);
    expect(canEditRequestDetails(admin, archivedRequest)).toBe(false);
  });
});

describe("service desk workflow transitions", () => {
  it("accepts the supported status progression", () => {
    expect(isValidStatusTransition("new", "triaged")).toBe(true);
    expect(isValidStatusTransition("assigned", "in_progress")).toBe(true);
    expect(isValidStatusTransition("waiting_for_customer", "resolved")).toBe(true);
    expect(isValidStatusTransition("resolved", "new")).toBe(true);
    expect(isValidStatusTransition("resolved", "closed")).toBe(true);
    expect(isValidStatusTransition("closed", "new")).toBe(true);
  });

  it("rejects unsupported status jumps", () => {
    expect(isValidStatusTransition("closed", "in_progress")).toBe(false);
    expect(isValidStatusTransition("resolved", "assigned")).toBe(false);
  });
});
