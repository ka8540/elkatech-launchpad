import { describe, expect, it } from "vitest";
import type { IssueReportRow, ReportStatus, Role } from "@elkatech/contracts";
import {
  EMPTY_REPORT_FILTERS,
  REPORT_AREA_OPTIONS,
  REPORT_SEVERITY_BADGE_CLASSES,
  REPORT_SEVERITY_OPTIONS,
  REPORT_STATUS_BADGE_CLASSES,
  REPORT_STATUS_OPTIONS,
  allowedTransitionsFor,
  buildReportQuery,
  canActOnReports,
  describeReportEvent,
  hasActiveFilters,
  reportAreaLabel,
  reportBrowserLabel,
  reportOsLabel,
  seesEveryReport,
  summariseReports,
  transitionLabel,
} from "./report-access";

const ALL_ROLES: Role[] = ["customer", "engineer", "support", "owner", "admin"];

function row(overrides: Partial<IssueReportRow> = {}): IssueReportRow {
  return {
    id: "r-1",
    reportNumber: "RPT-2026-000001",
    title: "Something broke",
    applicationArea: "attachments",
    severity: "medium",
    status: "new",
    reporterReference: "RPT-USR-8F3A2C",
    assignedUserId: null,
    assignedUserName: null,
    createdAt: "2026-07-20T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("options", () => {
  it("offers the three statuses and four severities", () => {
    expect(REPORT_STATUS_OPTIONS.map((o) => o.value)).toEqual(["new", "working", "resolved"]);
    expect(REPORT_SEVERITY_OPTIONS.map((o) => o.value)).toEqual([
      "low",
      "medium",
      "high",
      "blocking",
    ]);
  });

  it("gives every severity a concise description", () => {
    for (const option of REPORT_SEVERITY_OPTIONS) {
      expect(option.description.length).toBeGreaterThan(10);
    }
  });

  it("offers the eight application areas with readable labels", () => {
    expect(REPORT_AREA_OPTIONS).toHaveLength(8);
    expect(reportAreaLabel("service_requests")).toBe("Service requests");
    expect(reportAreaLabel("login")).toBe("Login");
  });

  it("has a badge class for every status and severity", () => {
    for (const option of REPORT_STATUS_OPTIONS) {
      expect(REPORT_STATUS_BADGE_CLASSES[option.value]).toBeTruthy();
    }
    for (const option of REPORT_SEVERITY_OPTIONS) {
      expect(REPORT_SEVERITY_BADGE_CLASSES[option.value]).toBeTruthy();
    }
  });

  it("renders a missing browser or system as a dash rather than blank", () => {
    expect(reportBrowserLabel(null)).toBe("—");
    expect(reportOsLabel(null)).toBe("—");
    expect(reportBrowserLabel("chrome")).toBe("Chrome");
    expect(reportOsLabel("macos")).toBe("macOS");
  });
});

describe("transitions mirror the server", () => {
  it("offers report transitions only to Admin", () => {
    expect(allowedTransitionsFor("admin", "new")).toEqual(["working"]);
    expect(allowedTransitionsFor("admin", "working")).toEqual(["resolved"]);
  });

  it("offers nothing to non-Admins", () => {
    for (const role of ["owner", "support", "engineer", "customer"] as const) {
      for (const status of ["new", "working", "resolved"] as ReportStatus[]) {
        expect(allowedTransitionsFor(role, status)).toEqual([]);
      }
    }
  });

  it("offers reopen only to admin", () => {
    expect(allowedTransitionsFor("admin", "resolved")).toEqual(["working"]);
    expect(allowedTransitionsFor("owner", "resolved")).toEqual([]);
    expect(allowedTransitionsFor("support", "resolved")).toEqual([]);
  });

  it("labels the reopen action distinctly from starting work", () => {
    expect(transitionLabel("resolved", "working")).toBe("Reopen report");
    expect(transitionLabel("new", "working")).toBe("Start working");
    expect(transitionLabel("working", "resolved")).toBe("Mark resolved");
  });

  it("agrees with canActOnReports about who sees the controls", () => {
    for (const role of ALL_ROLES) {
      const offersAnything = (["new", "working", "resolved"] as ReportStatus[]).some(
        (status) => allowedTransitionsFor(role, status).length > 0,
      );
      if (offersAnything) expect(canActOnReports(role)).toBe(true);
    }
  });
});

describe("console scope", () => {
  it("recognizes only Admin as a staff console viewer", () => {
    expect(seesEveryReport("admin")).toBe(true);
    expect(seesEveryReport("owner")).toBe(false);
    expect(seesEveryReport("support")).toBe(false);
    expect(seesEveryReport("engineer")).toBe(false);
    expect(seesEveryReport("customer")).toBe(false);
  });
});

describe("filters", () => {
  it("starts with nothing applied", () => {
    expect(hasActiveFilters(EMPTY_REPORT_FILTERS)).toBe(false);
  });

  it("notices each individual filter", () => {
    expect(hasActiveFilters({ ...EMPTY_REPORT_FILTERS, search: "boom" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_REPORT_FILTERS, status: "working" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_REPORT_FILTERS, severity: "high" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_REPORT_FILTERS, area: "login" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_REPORT_FILTERS, assignee: "eng-1" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_REPORT_FILTERS, from: "2026-01-01" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_REPORT_FILTERS, to: "2026-01-31" })).toBe(true);
  });

  it("ignores whitespace-only search", () => {
    expect(hasActiveFilters({ ...EMPTY_REPORT_FILTERS, search: "   " })).toBe(false);
  });

  it("omits unset filters from the query string", () => {
    const query = buildReportQuery(EMPTY_REPORT_FILTERS, { limit: 25, offset: 0 });
    expect(query).toBe("limit=25&offset=0");
    expect(query).not.toContain("all");
  });

  it("includes only the filters that are set", () => {
    const query = buildReportQuery(
      { ...EMPTY_REPORT_FILTERS, status: "working", severity: "blocking", search: " boom " },
      { limit: 25, offset: 50 },
    );
    const params = new URLSearchParams(query);
    expect(params.get("status")).toBe("working");
    expect(params.get("severity")).toBe("blocking");
    expect(params.get("search")).toBe("boom");
    expect(params.get("offset")).toBe("50");
    expect(params.get("area")).toBeNull();
    expect(params.get("assignee")).toBeNull();
  });

  it("has no filter keyed on customer identity", () => {
    const keys = Object.keys(EMPTY_REPORT_FILTERS);
    for (const forbidden of ["customer", "customerId", "reporter", "email", "name"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe("history phrasing", () => {
  it("has copy for every event the service writes", () => {
    for (const eventType of [
      "report_created",
      "status_changed",
      "report_reopened",
      "report_assigned",
      "report_reassigned",
      "note_added",
      "resolution_recorded",
      "request_linked",
      "attachment_added",
      "reporter_identified",
    ]) {
      expect(describeReportEvent(eventType)).not.toContain("_");
    }
  });

  it("humanises an unknown event rather than dropping the row", () => {
    expect(describeReportEvent("something_new_happened")).toBe("something new happened");
  });
});

describe("summary", () => {
  it("counts by status and flags unresolved blockers", () => {
    const summary = summariseReports([
      row({ status: "new", severity: "blocking" }),
      row({ status: "working" }),
      row({ status: "resolved", severity: "blocking" }),
      row({ status: "resolved" }),
    ]);
    expect(summary).toEqual({ new: 1, working: 1, resolved: 2, blocking: 1 });
  });

  it("returns zeroes for an empty list", () => {
    expect(summariseReports([])).toEqual({ new: 0, working: 0, resolved: 0, blocking: 0 });
  });
});
