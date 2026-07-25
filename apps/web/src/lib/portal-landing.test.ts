import { describe, expect, it } from "vitest";
import type { AuthUser, Role } from "@elkatech/contracts";
import { landingPathForUser } from "./portal-landing";

function user(role: Role, profileCompleted = true): AuthUser {
  return {
    id: `${role}-1`,
    email: `${role}@example.com`,
    displayName: role,
    role,
    emailVerified: true,
    approvalStatus: "approved",
    accountOrigin: "legacy",
    profileCompleted,
    createdAt: "2026-07-25T00:00:00.000Z",
  };
}

describe("landingPathForUser", () => {
  it("sends Admin login to Overview", () => {
    expect(landingPathForUser(user("admin"))).toBe("/app/admin");
    expect(landingPathForUser(user("admin"), "/app")).toBe("/app/admin");
  });

  it("preserves a deliberate Admin deep link", () => {
    expect(landingPathForUser(user("admin"), "/app/reports")).toBe("/app/reports");
  });

  it("keeps the existing homes for other roles", () => {
    expect(landingPathForUser(user("customer"))).toBe("/app/requests");
    expect(landingPathForUser(user("owner"))).toBe("/app/queue");
    expect(landingPathForUser(user("support"))).toBe("/app/queue");
    expect(landingPathForUser(user("engineer"))).toBe("/app/queue");
  });

  it("keeps incomplete customers in onboarding", () => {
    expect(landingPathForUser(user("customer", false), "/app/requests")).toBe(
      "/app/complete-profile",
    );
  });
});
