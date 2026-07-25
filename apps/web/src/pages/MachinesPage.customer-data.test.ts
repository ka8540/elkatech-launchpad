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
});
