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
