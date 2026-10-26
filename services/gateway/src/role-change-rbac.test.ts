import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");
const route = source.slice(
  source.indexOf('app.post("/api/admin/users/:userId/role"'),
  source.indexOf(
    'app.delete("/api/admin/users/:userId"',
    source.indexOf('app.post("/api/admin/users/:userId/role"'),
  ),
);

describe("gateway role-change boundary", () => {
  it("uses shared RBAC and rejects customer/staff conversions before forwarding", () => {
    expect(route).toContain("canChangeUserRole(session.user.role, targetRole, input.role)");
    expect(route).toContain('input.role === "customer"');
    expect(route).toContain('targetRole === "customer"');
    expect(route).toContain("Customer accounts cannot be converted to or from staff roles.");
  });
});
