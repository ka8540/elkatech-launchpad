import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");
const route = source.slice(
  source.indexOf('app.patch("/api/admin/users/:userId/profile"'),
  source.indexOf("// Self-service: trigger", source.indexOf('app.patch("/api/admin/users/:userId/profile"')),
);

describe("admin user-profile editing RBAC", () => {
  it("requires authentication, the shared permission, and CSRF", () => {
    expect(route).toContain('requireSession(request, reply, ["admin"])');
    expect(route).toContain("canEditUserProfiles(session.user.role)");
    expect(route).toContain("assertCsrf(request, reply)");
  });
});
