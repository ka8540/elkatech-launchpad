import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { IssueReportDetail, Role } from "@elkatech/contracts";

const apiRequest = vi.hoisted(() => vi.fn());
const sessionRole = vi.hoisted(() => ({ current: "admin" as Role, id: "admin-me" }));

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
vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({
    data: { user: { id: sessionRole.id, role: sessionRole.current } },
    isLoading: false,
  }),
}));

const { default: ReportDetailPage } = await import("./ReportDetailPage");

function detail(overrides: Partial<IssueReportDetail> = {}): IssueReportDetail {
  return {
    id: "r-1",
    reportNumber: "RPT-2026-000124",
    title: "Unable to upload service-request image",
    description: "I tried to attach a photo and it failed every time.",
    exactError: "Upload failed: Unable to create attachment URL",
    stepsToReproduce: "1. Open a request\n2. Click attach\n3. Choose a photo",
    applicationArea: "attachments",
    severity: "high",
    status: "new",
    reporterReference: "RPT-USR-8F3A2C",
    assignedUserId: null,
    assignedUserName: null,
    relatedRequestId: null,
    relatedRequestNumber: null,
    relatedMachineId: null,
    resolution: null,
    context: {
      route: "/app/requests/:id",
      browser: "chrome",
      operatingSystem: "macos",
      appVersion: "a1b2c3d4",
      correlationId: "req-42",
      relatedRequestId: null,
      relatedMachineId: null,
    },
    createdAt: "2026-07-24T10:00:00.000Z",
    updatedAt: "2026-07-24T12:00:00.000Z",
    resolvedAt: null,
    notes: [],
    history: [
      {
        id: "h-1",
        eventType: "report_created",
        actorRole: "customer",
        // Null because the gateway resolves names for staff only — the
        // reporting customer is never named, even in the audit trail.
        actorLabel: null,
        previousValue: null,
        newValue: "High",
        createdAt: "2026-07-24T10:00:00.000Z",
      },
    ],
    attachments: [],
    allowedTransitions: ["working"],
    ...overrides,
  };
}

function mockApi(payload: IssueReportDetail = detail()) {
  apiRequest.mockImplementation((url: string) => {
    if (String(url) === "/api/engineers") {
      return Promise.resolve([{ id: "eng-1", displayName: "Ravi Patel" }]);
    }
    if (String(url).startsWith("/api/reports/")) return Promise.resolve(payload);
    return Promise.resolve({});
  });
}

let pageContainer: HTMLElement;

/** The header badges, the history timeline and the technical-context panel all
 *  legitimately show the same words ("New", "High", "Reporter"), so these
 *  queries are scoped to the region under test rather than the whole page. */
function header() {
  return within(pageContainer.querySelector("header") as HTMLElement);
}

function timeline() {
  return within(pageContainer.querySelector("ol") as HTMLElement);
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache({ onError: () => {} }),
  });
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/app/reports/r-1"]}>
        <Routes>
          <Route path="/app/reports/:reportId" element={<ReportDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  pageContainer = result.container;
  return result;
}

beforeEach(() => {
  apiRequest.mockReset();
  sessionRole.current = "admin";
  sessionRole.id = "admin-me";
});
afterEach(cleanup);

describe("Report detail — header", () => {
  it("shows the number, title, status, severity and reporter reference", async () => {
    mockApi();
    renderPage();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });

    expect(header().getByText("RPT-2026-000124")).toBeInTheDocument();
    expect(header().getByText("New")).toBeInTheDocument();
    expect(header().getByText("High")).toBeInTheDocument();
    expect(header().getByText("RPT-USR-8F3A2C")).toBeInTheDocument();
  });

  it("never renders anything identifying the reporter", async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});

describe("Report detail — submitted content", () => {
  it("shows the description exactly as submitted", async () => {
    mockApi();
    renderPage();
    expect(
      await screen.findByText("I tried to attach a photo and it failed every time."),
    ).toBeInTheDocument();
  });

  it("renders the exact error in a monospace block with a copy button", async () => {
    mockApi();
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });

    const pre = container.querySelector("pre");
    expect(pre?.textContent).toBe("Upload failed: Unable to create attachment URL");
    expect(screen.getByRole("button", { name: /Copy/ })).toBeInTheDocument();
  });

  it("renders submitted markup as text, never as HTML", async () => {
    mockApi(
      detail({
        exactError: '<script>alert("xss")</script><img src=x onerror=alert(1)>',
        description: '<b>bold?</b>',
      }),
    );
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });

    // The payload appears as literal characters…
    expect(container.textContent).toContain('<script>alert("xss")</script>');
    expect(container.textContent).toContain("<b>bold?</b>");
    // …and produced no elements.
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the steps to reproduce", async () => {
    mockApi();
    renderPage();
    expect(await screen.findByText(/1\. Open a request/)).toBeInTheDocument();
  });

  it("omits the error and steps sections when the customer left them blank", async () => {
    mockApi(detail({ exactError: null, stepsToReproduce: null }));
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });
    expect(container.querySelector("pre")).toBeNull();
    expect(screen.queryByText("Steps to reproduce")).toBeNull();
  });
});

describe("Report detail — technical context", () => {
  it("shows the safe captured metadata", async () => {
    mockApi();
    renderPage();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });

    expect(screen.getByText("/app/requests/:id")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("macOS")).toBeInTheDocument();
    expect(screen.getByText("a1b2c3d4")).toBeInTheDocument();
    expect(screen.getByText("req-42")).toBeInTheDocument();
  });
});

describe("Report detail — staff actions", () => {
  it("offers the allowed transition and posts it", async () => {
    mockApi();
    renderPage();
    const button = await screen.findByRole("button", { name: /Start working/ });
    fireEvent.click(button);

    await waitFor(() => {
      const call = apiRequest.mock.calls.find(([u]) => String(u).endsWith("/status"));
      expect(call).toBeTruthy();
      expect(JSON.parse(call![1].body)).toEqual({ status: "working" });
    });
  });

  it("labels a reopen distinctly and offers it to an admin", async () => {
    mockApi(detail({ status: "resolved", allowedTransitions: ["working"] }));
    renderPage();
    expect(await screen.findByRole("button", { name: /Reopen report/ })).toBeInTheDocument();
  });

  it("offers no status control when the server allows no transition", async () => {
    mockApi(detail({ status: "resolved", allowedTransitions: [] }));
    renderPage();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });
    expect(screen.queryByRole("button", { name: /Reopen report/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Start working/ })).toBeNull();
  });

  it("posts an internal note with its visibility", async () => {
    mockApi();
    renderPage();
    const field = await screen.findByLabelText("Add a note");
    fireEvent.change(field, { target: { value: "Reproduced on staging." } });
    fireEvent.click(screen.getByRole("button", { name: "Add note" }));

    await waitFor(() => {
      const call = apiRequest.mock.calls.find(([u]) => String(u).endsWith("/notes"));
      expect(call).toBeTruthy();
      expect(JSON.parse(call![1].body)).toEqual({
        body: "Reproduced on staging.",
        visibility: "internal_note",
      });
    });
  });

  it("defaults notes to internal rather than customer-visible", async () => {
    mockApi();
    renderPage();
    await screen.findByLabelText("Add a note");
    const internal = screen.getByRole("radio", { name: /Internal only/ }) as HTMLInputElement;
    expect(internal.checked).toBe(true);
  });

  it("marks an existing internal note as not visible to the reporter", async () => {
    mockApi(
      detail({
        notes: [
          {
            id: "n-1",
            visibility: "internal_note",
            body: "Root cause is the R2 CORS config.",
            authorName: "Ravi Patel",
            authorRole: "support",
            createdAt: "2026-07-24T13:00:00.000Z",
          },
        ],
      }),
    );
    renderPage();
    expect(await screen.findByText("Root cause is the R2 CORS config.")).toBeInTheDocument();
    expect(screen.getByText("Internal")).toBeInTheDocument();
  });
});

describe("Report detail — history", () => {
  it("renders the reporter's own action without naming them", async () => {
    mockApi();
    renderPage();
    await screen.findByRole("heading", { name: "Unable to upload service-request image" });
    expect(timeline().getByText("Report submitted")).toBeInTheDocument();
    // actorLabel is null for the customer, so the row reads "Reporter" — the
    // audit trail records the action without naming who took it.
    expect(timeline().getByText(/Reporter/)).toBeInTheDocument();
    expect(timeline().queryByText("Kush Ahir")).toBeNull();
  });

  it("shows previous → new values for a status change", async () => {
    mockApi(
      detail({
        history: [
          {
            id: "h-2",
            eventType: "status_changed",
            actorRole: "support",
            actorLabel: "Ravi Patel",
            previousValue: "New",
            newValue: "Working",
            createdAt: "2026-07-24T14:00:00.000Z",
          },
        ],
      }),
    );
    renderPage();
    await screen.findByText("Status changed");
    expect(timeline().getByText("New")).toBeInTheDocument();
    expect(timeline().getByText("Working")).toBeInTheDocument();
    expect(timeline().getByText("Ravi Patel")).toBeInTheDocument();
  });
});
