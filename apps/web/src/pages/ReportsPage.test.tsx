import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { IssueReportListResponse, IssueReportRow } from "@elkatech/contracts";

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
const { default: ReportsPage } = await import("./ReportsPage");

function row(overrides: Partial<IssueReportRow> = {}): IssueReportRow {
  return {
    id: "r-1",
    reportNumber: "RPT-2026-000124",
    title: "Unable to upload service-request image",
    applicationArea: "attachments",
    severity: "high",
    status: "new",
    reporterReference: "RPT-USR-8F3A2C",
    assignedUserId: null,
    assignedUserName: null,
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T12:00:00.000Z",
    ...overrides,
  };
}

const PAYLOAD: IssueReportListResponse = {
  reports: [
    row(),
    row({
      id: "r-2",
      reportNumber: "RPT-2026-000125",
      title: "Dashboard totals look wrong",
      applicationArea: "dashboard",
      severity: "blocking",
      status: "working",
      reporterReference: "RPT-USR-11BB22",
      assignedUserId: "eng-1",
      assignedUserName: "Ravi Patel",
    }),
  ],
  total: 2,
  limit: 25,
  offset: 0,
  summary: { new: 1, working: 1, resolved: 4, blocking: 1 },
};

function mockApi(payload: IssueReportListResponse = PAYLOAD) {
  apiRequest.mockImplementation((url: string) => {
    if (String(url).startsWith("/api/reports")) return Promise.resolve(payload);
    if (String(url) === "/api/engineers") {
      return Promise.resolve([{ id: "eng-1", displayName: "Ravi Patel" }]);
    }
    return Promise.resolve({});
  });
}

let pageContainer: HTMLElement;

/** Scope to the table body. "New", "Working" and staff names all appear in the
 *  metric row and the filter dropdowns too, so unscoped queries are ambiguous. */
function rows() {
  return within(pageContainer.querySelector("tbody") as HTMLElement);
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache({ onError: () => {} }),
  });
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/app/reports"]}>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  pageContainer = result.container;
  return result;
}

beforeEach(() => {
  apiRequest.mockReset();
});
afterEach(cleanup);

describe("Issue Reports — layout", () => {
  it("renders the header, metric row and table columns", async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByText("Unable to upload service-request image");

    expect(screen.getByRole("heading", { name: "Issue Reports" })).toBeInTheDocument();

    const metricLabels = Array.from(container.querySelectorAll("dl dt")).map((d) => d.textContent);
    expect(metricLabels).toEqual(["New", "Working", "Resolved", "Blocking"]);

    const headers = Array.from(container.querySelectorAll("thead th")).map((h) => h.textContent);
    expect(headers).toEqual([
      "Report",
      "Area",
      "Severity",
      "Status",
      "Reported",
      "Last updated",
      "Reporter",
      "Assigned to",
      "Actions",
    ]);
  });

  it("shows the report number alongside the title", async () => {
    mockApi();
    renderPage();
    expect(await screen.findByText("RPT-2026-000124")).toBeInTheDocument();
    expect(screen.getByText("Unable to upload service-request image")).toBeInTheDocument();
  });

  it("renders the server's summary counts", async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByText("Unable to upload service-request image");
    const values = Array.from(container.querySelectorAll("dl dd")).map((d) => d.textContent);
    expect(values).toEqual(["1", "1", "4", "1"]);
  });

  it("shows status and severity as compact badges", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Unable to upload service-request image");
    expect(rows().getByText("New")).toBeInTheDocument();
    expect(rows().getByText("Working")).toBeInTheDocument();
    expect(rows().getByText("Blocking")).toBeInTheDocument();
  });
});

describe("Issue Reports — reporter anonymity", () => {
  it("shows the anonymous reference and no customer identity anywhere", async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByText("Unable to upload service-request image");

    expect(screen.getByText("RPT-USR-8F3A2C")).toBeInTheDocument();

    // Nothing that could identify the reporter appears in the rendered page.
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/customer-1|cust-/i);
    // A raw uuid must never be printed in place of the reference.
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it("names the assigned staff member but never the reporter", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Dashboard totals look wrong");
    // Staff are named — they are accountable to each other.
    expect(rows().getByText("Ravi Patel")).toBeInTheDocument();
    expect(rows().getByText("Unassigned")).toBeInTheDocument();
  });

  it("offers no way to search or filter by customer", async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByText("Unable to upload service-request image");

    const labels = Array.from(container.querySelectorAll("select")).map((s) =>
      s.getAttribute("aria-label"),
    );
    expect(labels).not.toContain("Customer");
    expect(labels).not.toContain("Reporter");
    expect(screen.queryByLabelText(/customer/i)).toBeNull();
  });
});

describe("Issue Reports — filters", () => {
  it("sends the chosen filters to the API", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Unable to upload service-request image");

    fireEvent.change(screen.getByLabelText("Status"), { target: { value: "working" } });

    await waitFor(() => {
      const called = apiRequest.mock.calls.map(([u]) => String(u));
      expect(called.some((u) => u.includes("status=working"))).toBe(true);
    });
  });

  it("sends the search term, which covers the reference but not identity", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Unable to upload service-request image");

    fireEvent.change(screen.getByLabelText("Search reports"), {
      target: { value: "RPT-USR-8F3A2C" },
    });

    await waitFor(() => {
      const called = apiRequest.mock.calls.map(([u]) => String(u));
      expect(called.some((u) => u.includes("search=RPT-USR-8F3A2C"))).toBe(true);
    });
  });

  it("offers a clear action once a filter is applied", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Unable to upload service-request image");

    expect(screen.queryByRole("button", { name: /Clear filters/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "blocking" } });
    expect(await screen.findByRole("button", { name: /Clear filters/ })).toBeInTheDocument();
  });

});

describe("Issue Reports — states", () => {
  it("shows a skeleton while loading", () => {
    apiRequest.mockImplementation(() => new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
  });

  it("offers a retry when the list fails", async () => {
    apiRequest.mockImplementation((url: string) => {
      if (String(url).startsWith("/api/reports")) return Promise.reject(new Error("boom"));
      return Promise.resolve([]);
    });
    renderPage();
    expect(await screen.findByText("Could not load issue reports.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("explains an empty Admin list", async () => {
    mockApi({ ...PAYLOAD, reports: [], total: 0 });
    renderPage();
    expect(
      await screen.findByText("No issue reports have been submitted yet."),
    ).toBeInTheDocument();
  });

  it("says so when filters exclude everything", async () => {
    mockApi({ ...PAYLOAD, reports: [], total: 0 });
    renderPage();
    await screen.findByText("No issue reports have been submitted yet.");
    fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "blocking" } });
    expect(await screen.findByText("No reports match these filters.")).toBeInTheDocument();
  });
});

describe("Issue Reports — navigation", () => {
  it("links each row to its detail page", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Unable to upload service-request image");
    const links = screen.getAllByRole("link", { name: /Open/ });
    expect(links[0]).toHaveAttribute("href", "/app/reports/r-1");
  });

  it("offers the shared submission form", async () => {
    mockApi();
    renderPage();
    await screen.findByText("Unable to upload service-request image");
    expect(screen.getByRole("link", { name: /New report/ })).toHaveAttribute(
      "href",
      "/app/reports/new",
    );
  });
});
