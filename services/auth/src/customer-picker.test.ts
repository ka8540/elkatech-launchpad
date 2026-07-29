import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  customerPickerSearchPattern,
  decodeCustomerPickerCursor,
  encodeCustomerPickerCursor,
} from "./customer-picker";

describe("customer picker cursor", () => {
  it("round-trips a bounded offset", () => {
    expect(decodeCustomerPickerCursor(encodeCustomerPickerCursor(30))).toBe(30);
  });

  it("rejects malformed or unbounded cursors", () => {
    expect(() => decodeCustomerPickerCursor("not-a-cursor")).toThrow(
      "Invalid customer picker cursor.",
    );
    const oversized = Buffer.from(JSON.stringify({ v: 1, offset: 100_001 })).toString(
      "base64url",
    );
    expect(() => decodeCustomerPickerCursor(oversized)).toThrow(
      "Invalid customer picker cursor.",
    );
  });
});

describe("customer picker search pattern", () => {
  it("normalizes case and escapes LIKE wildcards", () => {
    expect(customerPickerSearchPattern("  VJ_100%  ")).toBe("%vj\\_100\\%%");
  });

  it("returns null when no search is supplied", () => {
    expect(customerPickerSearchPattern()).toBeNull();
  });
});

describe("customer picker query implementation", () => {
  const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");
  const routeStart = source.indexOf('app.get("/internal/customers/search"');
  const route = source.slice(
    routeStart,
    source.indexOf('app.get("/internal/users/directory"', routeStart),
  );

  it("searches name, email, and company in one bounded query", () => {
    expect(route).toContain("lower(display_name) like");
    expect(route).toContain("lower(email) like");
    expect(route).toContain("lower(coalesce(company_name, '')) like");
    expect(route).toContain("const pageLimit = query.limit + 1");
    expect(route).toContain("limit ${pageLimit}");
    expect(route).not.toContain("Promise.all");
  });

  it("excludes removed, suspended, and rejected accounts", () => {
    expect(route).toContain("removed_at is null");
    expect(route).toContain(
      "coalesce(approval_status, 'approved') in ('approved', 'pending_approval')",
    );
    expect(route).not.toContain("'suspended'");
    expect(route).not.toContain("'rejected'");
  });

  it("uses a stable preference and tie-break ordering", () => {
    expect(route).toContain(
      "case when coalesce(approval_status, 'approved') = 'approved' then 0 else 1 end",
    );
    expect(route).toContain("case when profile_completed then 0 else 1 end");
    expect(route).toContain("lower(display_name)");
    expect(route).toContain("lower(email)");
    expect(route).toContain("\n          id\n");
  });

  it("whitelists the compact response without profile contact fields", () => {
    const response = route.slice(route.indexOf("return {"), route.indexOf("\n  };", route.indexOf("return {")));
    expect(response).toContain("displayName");
    expect(response).toContain("email");
    expect(response).toContain("companyName");
    expect(response).toContain("approvalStatus");
    expect(response).toContain("profileCompleted");
    expect(response).not.toContain("contactPhone");
    expect(response).not.toContain("addressLine1");
  });
});
