import { describe, expect, it } from "vitest";
import { evaluateApprovalGate } from "./approval";

describe("evaluateApprovalGate", () => {
  it("lets approved customers proceed", () => {
    expect(
      evaluateApprovalGate({ role: "customer", approvalStatus: "approved" }),
    ).toEqual({ ok: true });
  });

  it("blocks pending customers with USER_PENDING_APPROVAL", () => {
    const result = evaluateApprovalGate({
      role: "customer",
      approvalStatus: "pending_approval",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("USER_PENDING_APPROVAL");
      expect(result.message).toMatch(/pending admin approval/i);
    }
  });

  it("blocks rejected customers with USER_REJECTED", () => {
    const result = evaluateApprovalGate({
      role: "customer",
      approvalStatus: "rejected",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("USER_REJECTED");
    }
  });

  it("blocks suspended customers with USER_SUSPENDED", () => {
    const result = evaluateApprovalGate({
      role: "customer",
      approvalStatus: "suspended",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("USER_SUSPENDED");
    }
  });

  it("lets engineers bypass approval status entirely", () => {
    for (const status of ["pending_approval", "rejected", "suspended"] as const) {
      expect(
        evaluateApprovalGate({ role: "engineer", approvalStatus: status }),
      ).toEqual({ ok: true });
    }
  });

  it("lets admins bypass approval status entirely", () => {
    for (const status of ["pending_approval", "rejected", "suspended"] as const) {
      expect(
        evaluateApprovalGate({ role: "admin", approvalStatus: status }),
      ).toEqual({ ok: true });
    }
  });
});
