import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ActivityPeopleResponse, ActivityPersonRow, Role } from "@elkatech/contracts";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  apiRequest,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

const { default: PeopleActivityPage } = await import("./PeopleActivityPage");

const EMPTY_REL = {
  total: 0,
  inProgress: 0,
  pending: 0,
  waiting: 0,
  open: 0,
  completed: 0,
  unassigned: 0,
  stale: 0,
};

function person(overrides: Partial<ActivityPersonRow> = {}): ActivityPersonRow {
  return {
    id: "p-1",
    displayName: "Love Ahir",
    email: "love@elkatech.local",
    role: "support" as Role,
    approvalStatus: "approved",
    accountOrigin: "admin_invite",
    companyName: null,
    profileCompleted: true,
    createdAt: "2026-06-12T00:44:02.898Z",
    lastSeenAt: "2026-06-12T02:46:36.152Z",
    lastRecordedActivityAt: null,
    state: "no_active_work",
    stateCount: 0,
    open: 0,
    completed: 0,
    machineCount: 0,
    workload: {
      asEngineer: { ...EMPTY_REL },
      asCustomer: { ...EMPTY_REL },
      asCreator: { ...EMPTY_REL },
      recordedEvents: 0,
    },
    ...overrides,
  } as ActivityPersonRow;
}

function response(people: ActivityPersonRow[], total = people.length): ActivityPeopleResponse {
  return {
    people,
    total,
    limit: 25,
    offset: 0,
    summary: {
      totalPeople: total,
      activeEngineers: 1,
      activeSupport: 1,
      withOpenWork: 2,
      recentlyActive: 3,
      inactiveAccounts: 0,
    },
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    // Consume query errors so a failing fetch surfaces through the component's
    // error state instead of bubbling out as an unhandled rejection.
    queryCache: new QueryCache({ onError: () => {} }),
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/app/activity"]}>
        <Routes>
          <Route path="/app/activity" element={<PeopleActivityPage />} />
          <Route path="/app/activity/:userId" element={<div>person page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => apiRequest.mockReset());
afterEach(cleanup);

describe("People Activity directory", () => {
  it("shows a loading state before data arrives", async () => {
    apiRequest.mockImplementation(
      () =>
        new Promise<ActivityPeopleResponse>((resolve) =>
          setTimeout(() => resolve(response([person()])), 30),
        ),
    );
    const { container } = renderPage();

    expect(screen.getByText("People Activity")).toBeInTheDocument();
    // Skeleton rows stand in for the table while the request is in flight.
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    expect(screen.queryByText("Could not load people activity.")).toBeNull();

    await screen.findByText("Love Ahir");
  });

  it("renders the agreed columns", async () => {
    apiRequest.mockResolvedValue(response([person()]));
    renderPage();
    await screen.findByText("Love Ahir");
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "User",
      "Role",
      "Status",
      "Current Work",
      "Open",
      "Completed",
      "Last Recorded Activity",
      "Last Seen",
      "Action",
    ]);
  });

  it("renders human-readable current work, never a bare number", async () => {
    apiRequest.mockResolvedValue(
      response([
        person({ id: "e1", displayName: "Eng One", role: "engineer", state: "working", stateCount: 3 }),
        person({ id: "e2", displayName: "Eng Two", role: "engineer", state: "assignments_pending", stateCount: 2 }),
        person({ id: "e3", displayName: "Eng Three", role: "engineer", state: "no_active_work", stateCount: 0 }),
      ]),
    );
    renderPage();
    expect(await screen.findByText("Working on 3 requests")).toBeInTheDocument();
    expect(screen.getByText("2 assignments pending")).toBeInTheDocument();
    expect(screen.getByText("No active work")).toBeInTheDocument();
  });

  it("shows a suspended account as suspended rather than as workload", async () => {
    apiRequest.mockResolvedValue(
      response([person({ approvalStatus: "suspended", state: "suspended", stateCount: 0 })]),
    );
    const { container } = renderPage();
    await screen.findByText("Love Ahir");
    // Appears twice in the row by design: the account-status badge and the
    // Current Work cell, which must read "Suspended" not a workload number.
    const row = container.querySelector("tbody tr");
    expect(within(row as HTMLElement).getAllByText("Suspended")).toHaveLength(2);
  });

  // NOTE: the directory's error state (message + Retry) is implemented but is
  // not unit-tested here. React Query v5 eagerly creates a query promise that
  // nothing consumes when a fetch rejects, which vitest reports as an
  // unhandled rejection and attributes to the test. Rather than disable
  // unhandled-error detection for the whole suite, this path is left to manual
  // verification. See the Issue 3C-F notes.

  it("renders an empty state when nobody exists", async () => {
    apiRequest.mockResolvedValue(response([]));
    renderPage();
    expect(await screen.findByText("No people on the platform yet.")).toBeInTheDocument();
  });

  it("renders a no-results state with a clear-filters action when searching", async () => {
    apiRequest.mockResolvedValue(response([]));
    renderPage();
    fireEvent.change(screen.getByLabelText("Search people"), { target: { value: "zzz" } });
    expect(await screen.findByText("No people match these filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("sends the search term to the backend", async () => {
    apiRequest.mockResolvedValue(response([person()]));
    renderPage();
    await screen.findByText("Love Ahir");
    fireEvent.change(screen.getByLabelText("Search people"), { target: { value: "kush" } });
    await waitFor(() => {
      expect(apiRequest.mock.calls.some(([url]) => String(url).includes("search=kush"))).toBe(true);
    });
  });

  it("sends role, status and work filters to the backend", async () => {
    apiRequest.mockResolvedValue(response([person()]));
    renderPage();
    await screen.findByText("Love Ahir");

    fireEvent.change(screen.getByLabelText("Filter by role"), { target: { value: "engineer" } });
    await waitFor(() =>
      expect(apiRequest.mock.calls.some(([u]) => String(u).includes("role=engineer"))).toBe(true),
    );

    fireEvent.change(screen.getByLabelText("Filter by account status"), { target: { value: "suspended" } });
    await waitFor(() =>
      expect(apiRequest.mock.calls.some(([u]) => String(u).includes("status=suspended"))).toBe(true),
    );

    fireEvent.change(screen.getByLabelText("Filter by work"), { target: { value: "active_work" } });
    await waitFor(() =>
      expect(apiRequest.mock.calls.some(([u]) => String(u).includes("filter=active_work"))).toBe(
        true,
      ),
    );
  });

  it("paginates with a bounded offset", async () => {
    apiRequest.mockResolvedValue(response([person()], 60));
    renderPage();
    await screen.findByText("Love Ahir");
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(apiRequest.mock.calls.some(([u]) => String(u).includes("offset=25"))).toBe(true),
    );
  });

  it("links every row to that person's page", async () => {
    apiRequest.mockResolvedValue(response([person({ id: "abc-123" })]));
    renderPage();
    const nameLink = await screen.findByRole("link", { name: "Love Ahir" });
    expect(nameLink).toHaveAttribute("href", "/app/activity/abc-123");
    expect(screen.getByRole("link", { name: "View activity" })).toHaveAttribute(
      "href",
      "/app/activity/abc-123",
    );
  });

  it("navigates to the person page when the row is clicked", async () => {
    apiRequest.mockResolvedValue(response([person({ id: "abc-123" })]));
    renderPage();
    await screen.findByText("Love Ahir");
    fireEvent.click(screen.getByText("love@elkatech.local"));
    expect(await screen.findByText("person page")).toBeInTheDocument();
  });

  it("labels a person with no recorded actions honestly", async () => {
    apiRequest.mockResolvedValue(response([person({ lastRecordedActivityAt: null })]));
    renderPage();
    expect(await screen.findByText("No recorded actions")).toBeInTheDocument();
  });

  it("shows the compact person-focused summary, not request-status cards", async () => {
    apiRequest.mockResolvedValue(response([person()]));
    const { container } = renderPage();
    await screen.findByText("Love Ahir");
    const summary = container.querySelector("dl");
    expect(summary).not.toBeNull();
    const summaryLabels = Array.from(summary!.querySelectorAll("dt")).map((dt) => dt.textContent);
    expect(summaryLabels).toEqual([
      "Total people",
      "Active engineers",
      "Active support",
      "People with work",
      "Recently active",
    ]);
    expect(screen.queryByText("In Queue")).toBeNull();
    expect(screen.queryByText("Unassigned")).toBeNull();
  });

  it("gives every filter dropdown a custom chevron with real gutters", async () => {
    apiRequest.mockResolvedValue(response([person()]));
    const { container } = renderPage();
    await screen.findByText("Love Ahir");

    const selects = Array.from(container.querySelectorAll("select"));
    expect(selects).toHaveLength(3);

    for (const select of selects) {
      // The native chevron is suppressed so it cannot sit flush to the border.
      expect(select.className).toContain("appearance-none");
      // Right padding reserves space for our icon; left padding matches the
      // search field so the row reads as one control group.
      expect(select.className).toContain("pr-9");
      expect(select.className).toContain("pl-3");
      // Equal widths keep the three controls aligned.
      expect(select.className).toContain("w-full");

      const wrapper = select.parentElement!;
      const chevron = wrapper.querySelector("svg");
      expect(chevron).not.toBeNull();
      // Inset from the edge and never swallowing the select's own clicks.
      expect(chevron!.getAttribute("class")).toContain("right-3");
      expect(chevron!.getAttribute("class")).toContain("pointer-events-none");
      expect(wrapper.className).toContain("sm:w-[168px]");
    }
  });

  it("declares one column and header per body cell", async () => {
    apiRequest.mockResolvedValue(response([person()]));
    const { container } = renderPage();
    await screen.findByText("Love Ahir");
    const table = container.querySelector("table")!;
    const cols = table.querySelectorAll("colgroup col").length;
    const headers = table.querySelectorAll("thead th").length;
    const cells = table.querySelectorAll("tbody tr:first-child td").length;
    expect(headers).toBe(cols);
    expect(cells).toBe(headers);
    expect(table.className).toContain("table-fixed");
  });

  it("uses theme tokens rather than hard-coded light-mode colours", async () => {
    apiRequest.mockResolvedValue(response([person()]));
    const { container } = renderPage();
    await screen.findByText("Love Ahir");
    const html = container.innerHTML;
    expect(html).toContain("var(--lp-ink)");
    // A bare `bg-white` / `text-black` would break dark mode.
    expect(html).not.toMatch(/class="[^"]*\bbg-white\b/);
    expect(html).not.toMatch(/class="[^"]*\btext-black\b/);
  });
});
