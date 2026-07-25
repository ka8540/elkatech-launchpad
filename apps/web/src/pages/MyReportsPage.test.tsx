import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { MyIssueReportDetail, MyIssueReportRow } from "@elkatech/contracts";

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

const { default: MyReportsPage } = await import("./MyReportsPage");
const { default: MyReportDetailPage } = await import("./MyReportDetailPage");

const ROWS: MyIssueReportRow[] = [
  {
    id: "r-1",
    reportNumber: "RPT-2026-000124",
    title: "Unable to upload service-request image",
    applicationArea: "attachments",
    severity: "high",
    status: "working",
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T12:00:00.000Z",
  },
];

function detail(overrides: Partial<MyIssueReportDetail> = {}): MyIssueReportDetail {
  return {
    id: "r-1",
    reportNumber: "RPT-2026-000124",
    title: "Unable to upload service-request image",
    description: "I tried to attach a photo and it failed every time.",
    exactError: "Upload failed: Unable to create attachment URL",
    stepsToReproduce: null,
    applicationArea: "attachments",
    severity: "high",
    status: "resolved",
    resolution: "The storage bucket needed CORS configured. Please try again.",
    responses: [
      {
        id: "n-1",
        body: "Thanks for the report — we are looking into it.",
        createdAt: "2026-07-24T13:00:00.000Z",
      },
    ],
    attachments: [],
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-25T09:00:00.000Z",
    resolvedAt: "2026-07-25T09:00:00.000Z",
    ...overrides,
  };
}

function renderList() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache({ onError: () => {} }),
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/app/my-reports"]}>
        <MyReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache({ onError: () => {} }),
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/app/my-reports/r-1"]}>
        <Routes>
          <Route path="/app/my-reports/:reportId" element={<MyReportDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => apiRequest.mockReset());
afterEach(cleanup);

describe("My Reports — list", () => {
  it("requests only the caller's own reports", async () => {
    apiRequest.mockResolvedValue(ROWS);
    renderList();
    await screen.findByText("Unable to upload service-request image");
    // No id in the URL: the endpoint scopes on the session, so there is
    // nothing for a customer to tamper with.
    expect(apiRequest).toHaveBeenCalledWith("/api/reports/mine");
  });

  it("renders the documented columns and nothing administrative", async () => {
    apiRequest.mockResolvedValue(ROWS);
    const { container } = renderList();
    await screen.findByText("Unable to upload service-request image");

    const headers = Array.from(container.querySelectorAll("thead th")).map((h) => h.textContent);
    expect(headers).toEqual([
      "Report",
      "Area",
      "Status",
      "Severity",
      "Created",
      "Last updated",
    ]);
    expect(headers).not.toContain("Assigned to");
    expect(headers).not.toContain("Reporter");
  });

  it("never shows the reporter reference to the reporter", async () => {
    apiRequest.mockResolvedValue(ROWS);
    const { container } = renderList();
    await screen.findByText("Unable to upload service-request image");
    expect(container.textContent).not.toMatch(/RPT-USR-/);
  });

  it("links to the customer detail route, not the staff one", async () => {
    apiRequest.mockResolvedValue(ROWS);
    const { container } = renderList();
    await screen.findByText("Unable to upload service-request image");
    const link = within(container.querySelector("tbody") as HTMLElement).getAllByRole("link")[0];
    expect(link).toHaveAttribute("href", "/app/my-reports/r-1");
  });

  it("invites a first report when the list is empty", async () => {
    apiRequest.mockResolvedValue([]);
    renderList();
    expect(
      await screen.findByText("You have not reported any problems yet."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Report a problem/ })).toHaveAttribute(
      "href",
      "/app/reports/new",
    );
  });

  it("offers a retry when the list fails", async () => {
    apiRequest.mockImplementation((url: string) =>
      String(url).startsWith("/api/reports") ? Promise.reject(new Error("boom")) : Promise.resolve([]),
    );
    renderList();
    expect(await screen.findByText("Could not load your reports.")).toBeInTheDocument();
  });
});

describe("My Reports — detail", () => {
  it("shows what the customer submitted plus the public resolution", async () => {
    apiRequest.mockResolvedValue(detail());
    renderDetail();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });

    expect(
      screen.getByText("I tried to attach a photo and it failed every time."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("The storage bucket needed CORS configured. Please try again."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Thanks for the report — we are looking into it."),
    ).toBeInTheDocument();
  });

  it("shows the customer's own error text in the monospace block", async () => {
    apiRequest.mockResolvedValue(detail());
    const { container } = renderDetail();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });
    expect(container.querySelector("pre")?.textContent).toBe(
      "Upload failed: Unable to create attachment URL",
    );
  });

  it("exposes no internal notes, assignment, reference or metadata", async () => {
    apiRequest.mockResolvedValue(detail());
    const { container } = renderDetail();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/RPT-USR-/);
    expect(text).not.toMatch(/Internal/i);
    expect(text).not.toMatch(/Assigned/i);
    expect(text).not.toMatch(/Correlation/i);
    expect(text).not.toMatch(/Technical context/i);
  });

  it("renders submitted markup as text, never as HTML", async () => {
    apiRequest.mockResolvedValue(
      detail({ exactError: '<script>alert("xss")</script>', description: "<b>bold?</b>" }),
    );
    const { container } = renderDetail();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });

    expect(container.textContent).toContain('<script>alert("xss")</script>');
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
  });

  it("says the report could not be found rather than leaking why", async () => {
    apiRequest.mockImplementation((url: string) =>
      String(url).startsWith("/api/reports")
        ? Promise.reject(new Error("not found"))
        : Promise.resolve({}),
    );
    renderDetail();
    expect(await screen.findByText("This report could not be found.")).toBeInTheDocument();
  });
});
