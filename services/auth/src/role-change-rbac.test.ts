import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");
const route = source.slice(
  source.indexOf('app.post("/internal/users/:id/role"'),
  source.indexOf("// Hard delete.", source.indexOf('app.post("/internal/users/:id/role"')),
);

describe("auth-service role-change boundary", () => {
  it("rejects customer/staff conversions directly", () => {
    expect(route).toContain('user.role === "customer" || input.role === "customer"');
    expect(route).toContain('reply.code(403)');
    expect(route).toContain('"CUSTOMER_ROLE_IMMUTABLE"');
    expect(route).toContain("Customer accounts cannot be converted to or from staff roles.");
  });
});
