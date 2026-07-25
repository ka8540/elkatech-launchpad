import { describe, expect, it } from "vitest";
import { canChangeUserRole } from "./index";

describe("role-change boundary", () => {
  it("never converts a customer account into a staff account", () => {
    for (const nextRole of ["engineer", "support", "owner", "admin"] as const) {
      expect(canChangeUserRole("admin", "customer", nextRole)).toBe(false);
      expect(canChangeUserRole("owner", "customer", nextRole)).toBe(false);
    }
  });

  it("never converts a staff account into a customer account", () => {
    for (const currentRole of ["engineer", "support", "owner", "admin"] as const) {
      expect(canChangeUserRole("admin", currentRole, "customer")).toBe(false);
    }
  });

  it("still permits authorized staff-to-staff changes", () => {
    expect(canChangeUserRole("admin", "engineer", "support")).toBe(true);
    expect(canChangeUserRole("admin", "support", "admin")).toBe(true);
    expect(canChangeUserRole("owner", "engineer", "support")).toBe(true);
    expect(canChangeUserRole("owner", "engineer", "admin")).toBe(false);
    expect(canChangeUserRole("support", "engineer", "owner")).toBe(false);
  });
});
