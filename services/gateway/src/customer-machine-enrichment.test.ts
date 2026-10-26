import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");
const start = source.indexOf('app.get("/api/admin/customer-machines"');
const route = source.slice(
  start,
  source.indexOf('app.post("/api/admin/customer-machines"', start),
);

describe("customer machine list enrichment", () => {
  it("uses one bulk identity lookup and never downloads the full user directory", () => {
    expect(route).toContain("/internal/customers/lookup");
    expect(route).toContain("new Set(machines.map");
    expect(route).toContain("new Map(customers.map");
    expect(route).not.toContain("/internal/users");
  });

  it("returns only compact customer identity fields on each machine", () => {
    expect(route).toContain(
      "Array<{ id: string; displayName: string; email: string }>",
    );
    expect(route).toContain("customer: customerById.get(machine.customerId) ?? null");
  });
});
