import { describe, expect, it } from "vitest";
import type { ReportStatus, Role } from "@elkatech/contracts";
import {
  allowedReportTransitions,
  canManageReport,
  canTransitionReportTo,
  canViewReport,
  isReopen,
  isReportOwner,
  isValidReportTransition,
} from "./report-workflow";

const ALL_STATUSES: ReportStatus[] = ["new", "working", "resolved"];
const ALL_ROLES: Role[] = ["customer", "engineer", "support", "owner", "admin"];

function actor(role: Role, id = `${role}-1`) {
  return { id, role };
}

function report(overrides: Partial<{
  reporterUserId: string | null;
  assignedUserId: string | null;
  status: ReportStatus;
}> = {}) {
  return {
    reporterUserId: "customer-1",
    assignedUserId: null,
    status: "new" as ReportStatus,
    ...overrides,
  };
}

describe("report transitions", () => {
  it("allows exactly the three documented moves", () => {
    expect(isValidReportTransition("new", "working")).toBe(true);
    expect(isValidReportTransition("working", "resolved")).toBe(true);
    expect(isValidReportTransition("resolved", "working")).toBe(true);
  });

  it("rejects skipping straight from new to resolved", () => {
    expect(isValidReportTransition("new", "resolved")).toBe(false);
    expect(isValidReportTransition("working", "new")).toBe(false);
    expect(isValidReportTransition("resolved", "new")).toBe(false);
  });

  it("rejects a same-status update, which would only add history noise", () => {
    for (const status of ALL_STATUSES) {
      expect(isValidReportTransition(status, status)).toBe(false);
    }
  });

  it("rejects a status outside the enum without throwing", () => {
    expect(isValidReportTransition("new", "archived" as ReportStatus)).toBe(false);
    expect(isValidReportTransition("bogus" as ReportStatus, "working")).toBe(false);
  });

  it("recognises only resolved → working as a reopen", () => {
    expect(isReopen("resolved", "working")).toBe(true);
    expect(isReopen("new", "working")).toBe(false);
    expect(isReopen("working", "resolved")).toBe(false);
  });
});

describe("who may change a report's status", () => {
  it("lets only Admin move new → working", () => {
    expect(canTransitionReportTo(actor("admin"), report(), "working")).toBe(true);
  });

  it("never lets a non-Admin change status", () => {
    for (const role of ["owner", "support", "engineer", "customer"] as const) {
      expect(canTransitionReportTo(actor(role), report(), "working")).toBe(false);
      expect(canManageReport(actor(role))).toBe(false);
    }
  });

  it("restricts reopening to Admin", () => {
    const resolved = report({ status: "resolved" });
    expect(canTransitionReportTo(actor("admin"), resolved, "working")).toBe(true);
    expect(canTransitionReportTo(actor("owner"), resolved, "working")).toBe(false);
    expect(canTransitionReportTo(actor("support"), resolved, "working")).toBe(false);
  });

  it("offers only legal moves for the current status", () => {
    expect(allowedReportTransitions(actor("admin"), report({ status: "new" }))).toEqual([
      "working",
    ]);
    expect(allowedReportTransitions(actor("admin"), report({ status: "working" }))).toEqual([
      "resolved",
    ]);
    expect(allowedReportTransitions(actor("owner"), report({ status: "new" }))).toEqual([]);
    expect(allowedReportTransitions(actor("support"), report({ status: "resolved" }))).toEqual([]);
    expect(allowedReportTransitions(actor("admin"), report({ status: "resolved" }))).toEqual([
      "working",
    ]);
    expect(allowedReportTransitions(actor("engineer"), report())).toEqual([]);
  });
});

describe("who may see a report", () => {
  it("shows the staff projection only to Admin", () => {
    expect(canViewReport(actor("admin"), report())).toBe(true);
    for (const role of ["owner", "support", "engineer", "customer"] as const) {
      expect(canViewReport(actor(role), report())).toBe(false);
    }
  });

  it("does not expose assigned reports to an Engineer", () => {
    const engineer = actor("engineer", "eng-1");
    expect(canViewReport(engineer, report({ assignedUserId: "eng-1" }))).toBe(false);
    expect(canViewReport(engineer, report({ assignedUserId: "eng-2" }))).toBe(false);
  });

  it("keeps customer ownership separate from the staff projection", () => {
    expect(isReportOwner("customer-1", "customer-1")).toBe(true);
    expect(isReportOwner("customer-1", "customer-2")).toBe(false);
    expect(isReportOwner("customer-1", null)).toBe(false);
    expect(canViewReport(actor("customer", "customer-1"), report())).toBe(false);
  });

  it("does not treat an anonymized report as belonging to whoever asks", () => {
    const anonymized = report({ reporterUserId: null });
    expect(isReportOwner("customer-1", anonymized.reporterUserId)).toBe(false);
    expect(canViewReport(actor("admin"), anonymized)).toBe(true);
    expect(canViewReport(actor("support"), anonymized)).toBe(false);
  });

  it("never lets any non-Admin reach staff report data", () => {
    const someoneElse = report({ reporterUserId: "other", assignedUserId: "other" });
    for (const role of ALL_ROLES.filter((role) => role !== "admin")) {
      expect(canViewReport(actor(role), someoneElse)).toBe(false);
    }
  });
});
