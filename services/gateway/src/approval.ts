import type { z } from "zod";
import type { approvalStatusSchema, roleSchema } from "@elkatech/contracts";

type Role = z.infer<typeof roleSchema>;
type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export type ApprovalGateUser = {
  role: Role;
  approvalStatus: ApprovalStatus;
};

export type ApprovalGateFailureCode = "USER_PENDING_APPROVAL" | "USER_REJECTED" | "USER_SUSPENDED";

export type ApprovalGateResult =
  | { ok: true; code?: undefined; message?: undefined }
  | { ok: false; code: ApprovalGateFailureCode; message: string };

/**
 * Pure decision function: given a session user, decide whether they're
 * allowed to perform an approval-gated mutation (e.g. creating a service
 * request). Staff (engineer/admin) always pass — only customers are gated.
 */
export function evaluateApprovalGate(user: ApprovalGateUser): ApprovalGateResult {
  if (user.role === "engineer" || user.role === "admin") {
    return { ok: true };
  }

  switch (user.approvalStatus) {
    case "approved":
      return { ok: true };
    case "pending_approval":
      return {
        ok: false,
        code: "USER_PENDING_APPROVAL",
        message: "Your account is pending admin approval.",
      };
    case "rejected":
      return {
        ok: false,
        code: "USER_REJECTED",
        message: "Your account was not approved.",
      };
    case "suspended":
      return {
        ok: false,
        code: "USER_SUSPENDED",
        message: "Your account is suspended.",
      };
    default:
      return {
        ok: false,
        code: "USER_PENDING_APPROVAL",
        message: "Your account is pending admin approval.",
      };
  }
}
