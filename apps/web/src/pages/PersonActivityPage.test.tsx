import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Role } from "@elkatech/contracts";

const apiRequest = vi.hoisted(() => vi.fn());
const sessionRole = vi.hoisted(() => ({ current: "admin" as Role }));

class MockApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

vi.mock("@/lib/api", () => ({ apiRequest, ApiError: MockApiError }));
vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({
    data: { user: { id: "me", role: sessionRole.current } },
    isLoading: false,
  }),
}));

const { default: PersonActivityPage } = await import("./PersonActivityPage");

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

function detail(role: Role, overrides: Record<string, unknown> = {}) {
  return {
    person: {
      id: "p-1",
      displayName: "Love Ahir",
      email: "love@elkatech.local",
      role,
      approvalStatus: "approved",
      accountOrigin: "admin_invite",
      companyName: "ABCD",
      profileCompleted: true,
      createdAt: "2026-06-12T00:44:02.898Z",
      lastSeenAt: "2026-06-12T02:46:36.152Z",
      lastRecordedActivityAt: "2026-06-12T02:00:00.000Z",
      state: "no_active_work",
      stateCount: 0,
      open: 0,
      completed: 0,
      machineCount: 2,
      workload: {
        asEngineer: { ...EMPTY_REL },
        asCustomer: { ...EMPTY_REL },
        asCreator: { ...EMPTY_REL },
        recordedEvents: 3,
      },
      ...(overrides.person ?? {}),
    },
    machineCount: 2,
    priorityDistribution: {},
    eventCounts: {},
  };
}

const HISTORY_EVENT = {
  id: "evt-1",
  occurredAt: "2026-06-11T18:45:57.919Z",
  eventType: "request_assigned",
  recordedRole: "engineer",
  actorId: "p-1",
  request: {
    id: "req-9",
    requestNumber: "SRV-03445846-300",
    subject: "Ink issue",
    status: "resolved",
    customerId: "cust-1",
  },
  details: {
    from: null,
    to: null,
    engineerId: "e-1",
    engineerName: "John Smith",
    previousEngineerId: null,
    previousEngineerName: null,
    visibility: null,
    fields: null,
    issueType: null,
    attachmentKind: null,
  },
};

const TASK = {
  id: "req-9",
  requestNumber: "SRV-03445846-300",
  subject: "Ink issue",
  issueType: "ink_issue",
  status: "in_progress",
  priority: "urgent",
  customerId: "cust-1",
  customerName: "Kush Ahir",
  machineId: "m-1",
  machineLabel: "molor ml",
  assignedEngineerId: "e-1",
  assignedEngineerName: "John Smith",
  assignedAt: "2026-06-11T18:45:57.919Z",
  createdAt: "2026-06-11T18:00:00.000Z",
  lastActivityAt: "2026-06-11T18:45:57.919Z",
  ageDays: 43,
  stale: false,
};

const MACHINE = {
  id: "m-1",
  displayLabel: "molor ml",
  productName: "Molor ML1600K",
  unitNumber: "U-1",
  siteName: "Workshop",
  siteLocation: "Ahmedabad",
  status: "active",
};

/** Route every endpoint the page may call to a sensible fixture. */
function routeApi(role: Role, overrides: Record<string, unknown> = {}) {
  apiRequest.mockImplementation((url: string) => {
    if (url.includes("/history")) return Promise.resolve({ events: [HISTORY_EVENT], nextCursor: null });
    if (url.includes("/tasks")) return Promise.resolve({ tasks: [TASK], nextCursor: null });
    if (url.includes("/machines")) return Promise.resolve({ machines: [MACHINE] });
    if (url.includes("/api/engineers")) return Promise.resolve([]);
    return Promise.resolve(detail(role, overrides));
  });
}

function renderPage(userId = "p-1", previousPath?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache({ onError: () => {} }),
  });
  const detailPath = `/app/activity/${userId}`;
  const initialEntries = previousPath ? [previousPath, detailPath] : [detailPath];
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
        <Routes>
          <Route path="/app/activity/:userId" element={<PersonActivityPage />} />
          <Route path="/app/users" element={<div>users page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiRequest.mockReset();
  sessionRole.current = "admin";
});
afterEach(cleanup);

async function openTab(name: string) {
  fireEvent.click(screen.getByRole("tab", { name }));
}

describe("Person page — identity header", () => {
  it("shows identity, company, joined, last seen and last recorded activity", async () => {
    routeApi("support");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    expect(screen.getByText("love@elkatech.local")).toBeInTheDocument();
    expect(screen.getByText("ABCD")).toBeInTheDocument();
    for (const label of ["Current role", "Account", "Joined", "Last seen", "Last recorded activity"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("uses the standalone Customer Machine Profile-style Back control", async () => {
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    const back = screen.getByRole("button", { name: "Back" });
    expect(back).toHaveClass("h-9", "rounded-full", "px-4", "text-sm");
    expect(back.nextElementSibling?.tagName).toBe("HEADER");
    expect(screen.queryByLabelText("Breadcrumb")).toBeNull();
  });

  it("returns to the page the user came from", async () => {
    routeApi("support");
    renderPage("p-1", "/app/users");
    const back = await screen.findByRole("button", { name: "Back" });
    expect(screen.queryByText("Back to Activity")).toBeNull();
    fireEvent.click(back);
    expect(await screen.findByText("users page")).toBeInTheDocument();
  });

  it("omits approval status for the protected Admin identity", async () => {
    routeApi("admin", {
      person: {
        approvalStatus: null,
        state: "no_active_work",
      },
    });
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    expect(screen.queryByText("Account")).toBeNull();
    expect(screen.queryByText("Suspended")).toBeNull();
    expect(screen.queryByText("Approved")).toBeNull();
  });
});

describe("Person page — role-specific tabs", () => {
  const cases: Array<[Role, string[]]> = [
    ["engineer", ["Overview", "Current Tasks", "Activity History"]],
    ["customer", ["Overview", "Requests", "Machines", "Activity History"]],
    ["support", ["Overview", "Service Activity", "Assignments", "Messages", "Activity History"]],
    ["owner", ["Overview", "Operations", "Activity History"]],
    ["admin", ["Overview", "Operations", "Activity History"]],
  ];

  for (const [role, expected] of cases) {
    it(`renders the ${role} sections`, async () => {
      routeApi(role);
      renderPage();
      await screen.findByRole("heading", { name: "Love Ahir" });
      expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(expected);
    });
  }
});

describe("Person page — engineer workload", () => {
  it("shows the task table with the agreed columns and filters", async () => {
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Current Tasks");

    const headers = (await screen.findAllByRole("columnheader")).map((h) => h.textContent);
    expect(headers).toEqual([
      "Request",
      "Issue",
      "Customer",
      "Machine",
      "Priority",
      "Status",
      "Assigned At",
      "Last Activity",
      "Age",
      "Action",
    ]);
    for (const bucket of ["Active", "Waiting", "Completed"]) {
      expect(screen.getByRole("button", { name: bucket })).toBeInTheDocument();
    }
  });

  it("links the request and the customer, and offers Reassign to an admin", async () => {
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Current Tasks");

    expect(await screen.findByRole("link", { name: "SRV-03445846-300" })).toHaveAttribute(
      "href",
      "/app/requests/req-9",
    );
    expect(screen.getByRole("link", { name: "Kush Ahir" })).toHaveAttribute(
      "href",
      "/app/activity/cust-1",
    );
    expect(screen.getByRole("button", { name: "Reassign" })).toBeInTheDocument();
  });

  it("hides the Reassign control from a role that cannot assign", async () => {
    sessionRole.current = "engineer";
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Current Tasks");
    await screen.findByRole("link", { name: "SRV-03445846-300" });
    expect(screen.queryByRole("button", { name: "Reassign" })).toBeNull();
  });

  it("requests the engineer's own queue for each bucket", async () => {
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Current Tasks");
    await screen.findByRole("link", { name: "SRV-03445846-300" });
    expect(
      apiRequest.mock.calls.some(([u]) => String(u).includes("rel=engineer&bucket=active")),
    ).toBe(true);
    expect(apiRequest.mock.calls.some(([u]) => String(u).includes("limit=5"))).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Waiting" }));
    await screen.findByRole("link", { name: "SRV-03445846-300" });
    expect(apiRequest.mock.calls.some(([u]) => String(u).includes("bucket=waiting"))).toBe(true);
  });

  it("uses icon-only five-row pagination and keeps the final page height", async () => {
    const firstPage = Array.from({ length: 5 }, (_, index) => ({
      ...TASK,
      id: `req-${index + 1}`,
      requestNumber: `SRV-FIRST-${index + 1}`,
    }));
    const lastTask = {
      ...TASK,
      id: "req-6",
      requestNumber: "SRV-FINAL-6",
    };

    apiRequest.mockImplementation((url: string) => {
      if (url.includes("/tasks")) {
        return Promise.resolve(
          url.includes("cursor=next-page")
            ? { tasks: [lastTask], nextCursor: null }
            : { tasks: firstPage, nextCursor: "next-page" },
        );
      }
      return Promise.resolve(detail("engineer"));
    });

    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Current Tasks");
    await screen.findByRole("link", { name: "SRV-FIRST-1" });

    const previous = screen.getByRole("button", { name: "Previous tasks page" });
    const next = screen.getByRole("button", { name: "Next tasks page" });
    expect(previous).toHaveTextContent("");
    expect(next).toHaveTextContent("");
    expect(previous).toBeDisabled();
    expect(apiRequest.mock.calls.some(([url]) => String(url).includes("limit=5"))).toBe(true);

    fireEvent.click(next);
    await screen.findByRole("link", { name: "SRV-FINAL-6" });

    expect(screen.queryByRole("link", { name: "SRV-FIRST-1" })).toBeNull();
    expect(previous).toBeEnabled();
    expect(next).toBeDisabled();
    const taskRows = container.querySelectorAll("table tbody tr");
    expect(taskRows).toHaveLength(5);
    expect(container.querySelectorAll('table tbody tr[aria-hidden="true"]')).toHaveLength(4);
  });

  it("searches every request bucket through the paginated API", async () => {
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Current Tasks");
    await screen.findByRole("link", { name: "SRV-03445846-300" });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search requests" }), {
      target: { value: "ink issue" },
    });

    await waitFor(() =>
      expect(
        apiRequest.mock.calls.some(([url]) =>
          String(url).includes("bucket=active&limit=5&search=ink+issue"),
        ),
      ).toBe(true),
    );

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));
    await waitFor(() =>
      expect(
        apiRequest.mock.calls.some(([url]) =>
          String(url).includes("bucket=completed&limit=5&search=ink+issue"),
        ),
      ).toBe(true),
    );
  });
});

describe("Person page — customer sections", () => {
  it("lists machines without exposing internal serials or notes", async () => {
    routeApi("customer");
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Machines");

    expect(await screen.findByText("Molor ML1600K")).toBeInTheDocument();
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual(["Machine", "Product", "Unit", "Site", "Status"]);
    const html = container.innerHTML;
    expect(html.toLowerCase()).not.toContain("serial");
    expect(html.toLowerCase()).not.toContain("internalserialnumber");
  });

  it("shows the customer's own requests with the assigned engineer", async () => {
    routeApi("customer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Requests");
    expect(await screen.findByRole("link", { name: "SRV-03445846-300" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "John Smith" })).toHaveAttribute(
      "href",
      "/app/activity/e-1",
    );
    expect(apiRequest.mock.calls.some(([u]) => String(u).includes("rel=customer"))).toBe(true);
  });

  it("searches machines and paginates them five at a time with icon-only controls", async () => {
    const machines = Array.from({ length: 6 }, (_, index) => ({
      ...MACHINE,
      id: `m-${index + 1}`,
      displayLabel: index === 5 ? "Final Cutter" : `Printer ${index + 1}`,
      productName: index === 5 ? "Precision Cutter" : `Printer Product ${index + 1}`,
    }));
    apiRequest.mockImplementation((url: string) => {
      if (url.includes("/machines")) return Promise.resolve({ machines });
      return Promise.resolve(detail("customer"));
    });

    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Machines");
    await screen.findByText("Printer 1");

    expect(screen.queryByText("Final Cutter")).toBeNull();
    const previous = screen.getByRole("button", { name: "Previous machines page" });
    const next = screen.getByRole("button", { name: "Next machines page" });
    expect(previous).toHaveTextContent("");
    expect(next).toHaveTextContent("");
    fireEvent.click(next);
    expect(await screen.findByText("Final Cutter")).toBeInTheDocument();
    expect(container.querySelectorAll('table tbody tr[aria-hidden="true"]')).toHaveLength(4);

    fireEvent.change(screen.getByRole("searchbox", { name: "Search machines" }), {
      target: { value: "printer 2" },
    });
    expect(await screen.findByText("Printer 2")).toBeInTheDocument();
    expect(screen.queryByText("Final Cutter")).toBeNull();
    expect(screen.queryByRole("button", { name: "Next machines page" })).toBeNull();
  });
});

describe("Person page — activity history", () => {
  it("renders human-readable actions, not raw identifiers", async () => {
    routeApi("engineer");
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Activity History");

    expect(await screen.findByText("Assigned request to John Smith")).toBeInTheDocument();
    expect(container.innerHTML).not.toContain("request_assigned");
  });

  it("shows the recorded role, not the person's current role", async () => {
    // Person is Support today; the event was recorded while they were Engineer.
    routeApi("support");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Activity History");
    await screen.findByText("Assigned request to John Smith");

    const historyTable = screen.getAllByRole("table").at(-1)!;
    // The recorded-role badge reads Engineer even though the person is Support.
    expect(within(historyTable).getByText("Engineer")).toBeInTheDocument();
    expect(within(historyTable).queryByText("Support")).toBeNull();
    // …and the header still reports the current role.
    expect(screen.getAllByText("Support").length).toBeGreaterThan(0);
  });

  it("uses the agreed history columns and links the related request", async () => {
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Activity History");
    await screen.findByText("Assigned request to John Smith");

    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "Time",
      "Action",
      "Recorded Role",
      "Request",
      "Previous",
      "New",
      // Status has its own column — it used to share the Open cell, which left
      // the badge sitting under no header at all.
      "Status",
      "Open",
    ]);
    expect(screen.getByRole("link", { name: "SRV-03445846-300" })).toHaveAttribute(
      "href",
      "/app/requests/req-9",
    );
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/app/requests/req-9",
    );
  });

  it("filters the feed per support tab", async () => {
    routeApi("support");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Assignments");
    await screen.findByText("Assigned request to John Smith");
    expect(
      apiRequest.mock.calls.some(([u]) => String(u).includes("eventTypes=request_assigned")),
    ).toBe(true);
  });

  it("never leaks raw metadata keys into the DOM", async () => {
    routeApi("engineer");
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Activity History");
    await screen.findByText("Assigned request to John Smith");
    const html = container.innerHTML;
    for (const key of ["previousEngineerId", "objectKey", "metadata", "internalSerial"]) {
      expect(html).not.toContain(key);
    }
  });

  it("searches and paginates every history-based tab five rows at a time", async () => {
    const firstPage = Array.from({ length: 5 }, (_, index) => ({
      ...HISTORY_EVENT,
      id: `evt-${index + 1}`,
      request: {
        ...HISTORY_EVENT.request,
        id: `req-history-${index + 1}`,
        requestNumber: `SRV-HISTORY-${index + 1}`,
      },
    }));
    const finalEvent = {
      ...HISTORY_EVENT,
      id: "evt-6",
      request: {
        ...HISTORY_EVENT.request,
        id: "req-history-6",
        requestNumber: "SRV-HISTORY-6",
      },
    };

    apiRequest.mockImplementation((url: string) => {
      if (url.includes("/history")) {
        return Promise.resolve(
          url.includes("cursor=history-next")
            ? { events: [finalEvent], nextCursor: null }
            : { events: firstPage, nextCursor: "history-next" },
        );
      }
      return Promise.resolve(detail("support"));
    });

    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await openTab("Assignments");
    await screen.findByRole("link", { name: "SRV-HISTORY-1" });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search activity history" }), {
      target: { value: "assigned" },
    });
    await waitFor(() =>
      expect(
        apiRequest.mock.calls.some(([url]) =>
          String(url).includes("eventTypes=request_assigned") &&
          String(url).includes("limit=5") &&
          String(url).includes("search=assigned"),
        ),
      ).toBe(true),
    );

    const previous = await screen.findByRole("button", {
      name: "Previous activity history page",
    });
    const next = screen.getByRole("button", { name: "Next activity history page" });
    expect(previous).toHaveTextContent("");
    expect(next).toHaveTextContent("");
    fireEvent.click(next);
    await screen.findByRole("link", { name: "SRV-HISTORY-6" });
    expect(container.querySelectorAll('table tbody tr[aria-hidden="true"]')).toHaveLength(4);
  });
});

describe("Person page — table alignment", () => {
  /**
   * Every table must declare one <col> and one header per body cell. A
   * mismatch is what made the history table look misaligned: the status badge
   * shared the Open cell, so it rendered under no header.
   */
  async function assertGridIsConsistent(tab: string, dataCell: string) {
    await openTab(tab);
    // Wait for a real data row — asserting while skeleton rows (a single
    // colSpan cell) are showing would compare against the wrong markup.
    await screen.findByText(dataCell);
    const table = screen.getAllByRole("table").at(-1)!;
    const cols = table.querySelectorAll("colgroup col").length;
    const headers = table.querySelectorAll("thead th").length;
    const firstRowCells = table.querySelectorAll("tbody tr:first-child td").length;

    expect(headers).toBe(cols);
    expect(firstRowCells).toBe(headers);
    // Fixed layout is what actually pins the columns to those widths.
    expect(table.className).toContain("table-fixed");
  }

  it("keeps the history grid consistent", async () => {
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await assertGridIsConsistent("Activity History", "Assigned request to John Smith");
  });

  it("keeps the engineer task grid consistent", async () => {
    routeApi("engineer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await assertGridIsConsistent("Current Tasks", "SRV-03445846-300");
  });

  it("keeps the customer request grid consistent", async () => {
    routeApi("customer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await assertGridIsConsistent("Requests", "SRV-03445846-300");
  });

  it("keeps the machines grid consistent", async () => {
    routeApi("customer");
    renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    await assertGridIsConsistent("Machines", "Molor ML1600K");
  });
});

describe("Person page — access control", () => {
  it("shows a forbidden state when the backend refuses another person's page", async () => {
    sessionRole.current = "engineer";
    apiRequest.mockImplementation(() => {
      const rejected = Promise.reject(new MockApiError("Forbidden", 403));
      rejected.catch(() => {});
      return rejected;
    });
    renderPage("someone-else");
    expect(await screen.findByText("You cannot view this person")).toBeInTheDocument();
    expect(
      screen.getByText("Your role only allows access to your own activity page."),
    ).toBeInTheDocument();
  });
});

describe("Person page — theming", () => {
  it("uses theme tokens rather than hard-coded light-mode colours", async () => {
    routeApi("support");
    const { container } = renderPage();
    await screen.findByRole("heading", { name: "Love Ahir" });
    const html = container.innerHTML;
    expect(html).toContain("var(--lp-ink)");
    expect(html).not.toMatch(/class="[^"]*\bbg-white\b/);
    expect(html).not.toMatch(/class="[^"]*\btext-black\b/);
  });
});
