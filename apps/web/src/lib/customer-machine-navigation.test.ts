import { describe, expect, it } from "vitest";
import {
  customerMachineProfileReturnTo,
  customerMachineProfileState,
} from "./customer-machine-navigation";

describe("customer machine profile navigation", () => {
  it("preserves the originating portal route and query", () => {
    const state = customerMachineProfileState("/app/users", "?tab=customers");
    expect(customerMachineProfileReturnTo(state)).toBe(
      "/app/users?tab=customers",
    );
  });

  it("falls back to Customer Machines for direct or unsafe state", () => {
    expect(customerMachineProfileReturnTo(undefined)).toBe("/app/machines");
    expect(
      customerMachineProfileReturnTo({
        customerMachineProfileReturnTo: "https://example.com",
      }),
    ).toBe("/app/machines");
  });
});
