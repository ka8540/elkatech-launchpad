import { describe, expect, it } from "vitest";
import { approvalStatusSchema, authUserSchema, firebaseSessionInputSchema } from "./index";

describe("approval status schemas", () => {
  it("accepts all four approval statuses", () => {
    expect(approvalStatusSchema.safeParse("pending_approval").success).toBe(true);
    expect(approvalStatusSchema.safeParse("approved").success).toBe(true);
    expect(approvalStatusSchema.safeParse("rejected").success).toBe(true);
    expect(approvalStatusSchema.safeParse("suspended").success).toBe(true);
  });

  it("rejects unknown approval statuses", () => {
    expect(approvalStatusSchema.safeParse("waitlisted").success).toBe(false);
    expect(approvalStatusSchema.safeParse("").success).toBe(false);
  });

  it("requires approvalStatus on authUserSchema", () => {
    const result = authUserSchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      email: "user@example.com",
      displayName: "User",
      role: "customer",
      emailVerified: true,
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete user record", () => {
    const result = authUserSchema.safeParse({
      id: "11111111-1111-1111-1111-111111111111",
      email: "user@example.com",
      displayName: "User",
      role: "customer",
      emailVerified: true,
      approvalStatus: "pending_approval",
      createdAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});

describe("firebase session input schema", () => {
  it("requires a non-trivial idToken", () => {
    expect(firebaseSessionInputSchema.safeParse({ idToken: "" }).success).toBe(false);
    expect(firebaseSessionInputSchema.safeParse({ idToken: "abc" }).success).toBe(false);
    expect(
      firebaseSessionInputSchema.safeParse({ idToken: "x".repeat(40) }).success,
    ).toBe(true);
  });
});
