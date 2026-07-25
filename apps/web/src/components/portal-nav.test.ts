import { describe, expect, it } from "vitest";
import type { Role } from "@elkatech/contracts";
import { buildNavItems } from "./portal-nav";

/**
 * The sidebar is the only place a role's pages are advertised, so the matrix
 * below is asserted directly. Each entry must line up with the permission
 * helper the gateway enforces — a nav item the API would 403 is a bug.
 */
function labelsFor(role: Role | undefined): string[] {
  return buildNavItems(role).map((item) => item.label);
}

function pathsFor(role: Role | undefined): string[] {
  return buildNavItems(role).map((item) => item.to);
}

describe("portal sidebar navigation", () => {
  it("gives the admin Overview first and drops the redundant entries", () => {
    expect(labelsFor("admin")).toEqual([
      "Overview",
      "Requests",
      "Queue",
      "Issue Reports",
      "Activity",
      "Customer Machines",
      "Users",
    ]);
  });

  it("points admin Overview at the existing /app/admin route", () => {
    const overview = buildNavItems("admin")[0];
    expect(overview.label).toBe("Overview");
    expect(overview.to).toBe("/app/admin");
  });

  it("keeps Customer Activity for support and owner", () => {
    expect(labelsFor("support")).toEqual([
      "Requests",
      "Queue",
      "Activity",
      "Customer Activity",
    ]);
    expect(labelsFor("owner")).toEqual([
      "Requests",
      "Queue",
      "Activity",
      "Customer Activity",
      "Customer Machines",
      "Users",
    ]);
  });

  it("hides the staff reports console from Engineer and keeps customer My Reports", () => {
    expect(labelsFor("engineer")).toEqual(["Requests", "Queue"]);
    expect(labelsFor("customer")).toEqual(["Requests", "My Reports"]);
  });

  it("offers Issue Reports only to Admin", () => {
    expect(labelsFor("admin")).toContain("Issue Reports");
    for (const role of ["owner", "support", "engineer", "customer"] as const) {
      expect(pathsFor(role)).not.toContain("/app/reports");
      expect(labelsFor(role)).not.toContain("Issue Reports");
    }
  });

  it("never offers the customer report list to staff", () => {
    for (const role of ["engineer", "support", "owner", "admin"] as const) {
      expect(pathsFor(role)).not.toContain("/app/my-reports");
    }
  });

  it("keeps Issue Reports highlighted on the detail and create pages", () => {
    const reports = buildNavItems("admin").find((i) => i.label === "Issue Reports");
    expect(reports?.to).toBe("/app/reports");
    expect(reports?.activeWhen?.("/app/reports")).toBe(true);
    expect(reports?.activeWhen?.("/app/reports/abc-123")).toBe(true);
    expect(reports?.activeWhen?.("/app/reports/new")).toBe(true);
    expect(reports?.activeWhen?.("/app/queue")).toBe(false);
  });

  it("keeps My Reports highlighted while a customer is filing one", () => {
    const mine = buildNavItems("customer").find((i) => i.label === "My Reports");
    expect(mine?.to).toBe("/app/my-reports");
    expect(mine?.activeWhen?.("/app/my-reports")).toBe(true);
    expect(mine?.activeWhen?.("/app/my-reports/abc-123")).toBe(true);
    // The shared submission form has no nav entry of its own.
    expect(mine?.activeWhen?.("/app/reports/new")).toBe(true);
    expect(mine?.activeWhen?.("/app/requests")).toBe(false);
  });

  it("shows only Requests before the session resolves", () => {
    expect(labelsFor(undefined)).toEqual(["Requests"]);
  });

  it("no longer advertises a standalone Create Request entry to any role", () => {
    const roles: Array<Role | undefined> = [
      "customer",
      "engineer",
      "support",
      "owner",
      "admin",
      undefined,
    ];
    for (const role of roles) {
      expect(labelsFor(role)).not.toContain("Create Request");
      expect(pathsFor(role)).not.toContain("/app/requests/new");
    }
  });

  it("hides Customer Activity from the admin sidebar only", () => {
    expect(labelsFor("admin")).not.toContain("Customer Activity");
    expect(pathsFor("admin")).not.toContain("/app/customer-activity");
  });

  it("points Activity at the people directory, not the retired support page", () => {
    const activity = buildNavItems("support").find((i) => i.label === "Activity");
    expect(activity?.to).toBe("/app/activity");
    expect(pathsFor("support")).not.toContain("/app/support");
    expect(labelsFor("support")).not.toContain("Support");
    expect(labelsFor("support")).not.toContain("Operations");
  });

  it("keeps Activity highlighted on a person page", () => {
    const activity = buildNavItems("admin").find((i) => i.label === "Activity");
    expect(activity?.activeWhen?.("/app/activity")).toBe(true);
    expect(activity?.activeWhen?.("/app/activity/abc-123")).toBe(true);
    expect(activity?.activeWhen?.("/app/queue")).toBe(false);
  });

  it("never offers the directory to engineers or customers", () => {
    expect(pathsFor("engineer")).not.toContain("/app/activity");
    expect(pathsFor("customer")).not.toContain("/app/activity");
  });
});

describe("Requests active-state handling", () => {
  const isActive = (pathname: string) => {
    const requests = buildNavItems("customer").find((i) => i.label === "Requests");
    return requests?.activeWhen?.(pathname) ?? false;
  };

  it("marks Requests active on the create page now that it has no own entry", () => {
    expect(isActive("/app/requests/new")).toBe(true);
  });

  it("stays active on the list and on a request detail page", () => {
    expect(isActive("/app/requests")).toBe(true);
    expect(isActive("/app/requests/2f1c3d64-0000-4000-8000-000000000000")).toBe(true);
  });

  it("is not active on unrelated portal routes", () => {
    expect(isActive("/app/queue")).toBe(false);
    expect(isActive("/app/admin")).toBe(false);
    expect(isActive("/app/account")).toBe(false);
  });
});
