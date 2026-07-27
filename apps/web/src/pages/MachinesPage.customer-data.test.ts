import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "MachinesPage.tsx"), "utf8");

describe("MachinesPage customer data scaling", () => {
  it("uses customer-enriched machine rows without downloading every Admin user", () => {
    expect(source).toContain('apiRequest<EnrichedMachine[]>("/api/admin/customer-machines")');
    expect(source).not.toContain('apiRequest<AuthUser[]>("/api/admin/users")');
    expect(source).not.toContain('queryKey: ["admin-users"]');
    expect(source).not.toContain("filteredCustomers");
  });

  it("records Customer Machines as the source before opening a profile", () => {
    expect(source).toContain(
      "state: customerMachineProfileState(location.pathname, location.search)",
    );
  });

  it("uses five-row icon-only pagination and preserves partial desktop pages", () => {
    expect(source).toContain("const PAGE_SIZE = 5");
    expect(source).toContain('aria-label="Customer machines pagination"');
    expect(source).toContain('aria-label="Previous customer machines page"');
    expect(source).toContain('aria-label="Next customer machines page"');
    expect(source).toContain('key={`customer-machine-empty-row-${index}`}');
    expect(source).toContain('aria-hidden="true"');
    expect(source).not.toContain("rangeStart");
    expect(source).not.toContain("rangeEnd");
  });
});
