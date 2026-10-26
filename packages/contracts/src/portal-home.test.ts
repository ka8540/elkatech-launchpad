import { describe, expect, it } from "vitest";
import type { Role } from "./index";
import { portalHomePathForRole } from "./index";

describe("portalHomePathForRole", () => {
  it("uses Overview as the Admin home", () => {
    expect(portalHomePathForRole("admin")).toBe("/app/admin");
  });

  it("uses Requests as the Customer home", () => {
    expect(portalHomePathForRole("customer")).toBe("/app/requests");
  });

  it.each(["owner", "support", "engineer"] satisfies Role[])(
    "uses Queue as the %s home",
    (role) => {
      expect(portalHomePathForRole(role)).toBe("/app/queue");
    },
  );
});
