import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";

const APP_SOURCE = readFileSync(path.join(__dirname, "App.tsx"), "utf8");

/**
 * The retired Support Dashboard's URL must keep working. Mirrors the redirect
 * declared in App.tsx; asserting it here avoids booting the whole app (and its
 * Firebase/session stack) just to check one route.
 */
function RouterUnderTest({ initialEntry }: { initialEntry: string }) {
  return (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/app">
          <Route path="support" element={<Navigate to="/app/activity" replace />} />
          <Route path="activity" element={<div>people activity</div>} />
          <Route path="activity/:userId" element={<div>person page</div>} />
          <Route path="customer-activity" element={<div>customer activity</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("activity routing", () => {
  it("redirects the old /app/support URL to the people directory", () => {
    render(<RouterUnderTest initialEntry="/app/support" />);
    expect(screen.getByText("people activity")).toBeInTheDocument();
  });

  it("serves the directory at /app/activity", () => {
    render(<RouterUnderTest initialEntry="/app/activity" />);
    expect(screen.getByText("people activity")).toBeInTheDocument();
  });

  it("serves a person page at /app/activity/:userId", () => {
    render(<RouterUnderTest initialEntry="/app/activity/abc-123" />);
    expect(screen.getByText("person page")).toBeInTheDocument();
  });

  it("leaves the customer-activity route intact for support and owner", () => {
    render(<RouterUnderTest initialEntry="/app/customer-activity" />);
    expect(screen.getByText("customer activity")).toBeInTheDocument();
  });
});

describe("App route declarations", () => {
  it("uses the role-aware portal index so Admin opens Overview", () => {
    const source = APP_SOURCE;
    expect(source).toContain('import PortalIndexRedirect from "@/components/PortalIndexRedirect"');
    expect(source).toContain("<Route index element={<PortalIndexRedirect />} />");
    expect(source).not.toContain('<Route index element={<Navigate to="requests" replace />} />');
  });

  it("declares the redirect and both activity routes, and no support page import", () => {
    const source = APP_SOURCE;
    expect(source).toContain('<Route path="support" element={<Navigate to="/app/activity" replace />} />');
    expect(source).toContain('path="activity"');
    expect(source).toContain('path="activity/:userId"');
    // The old dashboard is deleted — no dangling import may remain.
    expect(source).not.toContain("SupportDashboardPage");
  });

  it("restricts the directory to staff and the person page to staff plus engineers", () => {
    const source = APP_SOURCE;
    const directory = source.slice(source.indexOf('path="activity"'));
    expect(directory.slice(0, 400)).toContain('roles={["support", "owner", "admin"]}');

    const personPage = source.slice(source.indexOf('path="activity/:userId"'));
    expect(personPage.slice(0, 400)).toContain(
      'roles={["support", "owner", "admin", "engineer"]}',
    );
    // Customers are never granted either route.
    expect(directory.slice(0, 400)).not.toContain("customer");
    expect(personPage.slice(0, 400)).not.toContain('"customer"');
  });
});

describe("issue report routes", () => {
  const source = APP_SOURCE;

  it("declares all five report routes", () => {
    expect(source).toContain('path="reports"');
    expect(source).toContain('path="reports/new"');
    expect(source).toContain('path="reports/:reportId"');
    expect(source).toContain('path="my-reports"');
    expect(source).toContain('path="my-reports/:reportId"');
  });

  it("gates the staff console and detail to Admin only", () => {
    const console_ = source.slice(source.indexOf('path="reports"'));
    expect(console_.slice(0, 400)).toContain('roles={["admin"]}');
    const detail = source.slice(source.indexOf('path="reports/:reportId"'));
    expect(detail.slice(0, 400)).toContain('roles={["admin"]}');
    for (const role of ["owner", "support", "engineer", "customer"]) {
      expect(console_.slice(0, 400)).not.toContain(`"${role}"`);
      expect(detail.slice(0, 400)).not.toContain(`"${role}"`);
    }
  });

  it("leaves the submission form open to every signed-in role", () => {
    // `reports/new` sits outside the staff gate deliberately: anyone can hit a
    // bug, and the same form serves customers and staff. Slice to the end of
    // this one Route element so the next route's gate is not read as its own.
    const start = source.indexOf('path="reports/new"');
    const element = source.slice(start, source.indexOf("/>", start));
    expect(element).toContain("ReportNewPage");
    expect(element).not.toContain("ProtectedRoute");
  });

  it("keeps the customer view on its own route, not the staff detail route", () => {
    // A customer must never resolve /app/reports/:id, which renders internal
    // notes; their own report lives at /app/my-reports/:id and hits a
    // different endpoint. Match on the opening tag — "MyReportDetailPage"
    // contains "ReportDetailPage" as a substring.
    const start = source.indexOf('path="my-reports/:reportId"');
    const element = source.slice(start, source.indexOf("/>", start));
    expect(element).toContain("<MyReportDetailPage");
    expect(element).not.toContain("<ReportDetailPage");
  });
});
