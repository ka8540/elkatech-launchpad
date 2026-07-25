import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthUser, Role } from "@elkatech/contracts";

const apiRequest = vi.hoisted(() => vi.fn());
const sessionRole = vi.hoisted(() => ({ current: "admin" as Role, id: "admin-me" }));
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());

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
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));
vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({
    data: { user: { id: sessionRole.id, role: sessionRole.current } },
    isLoading: false,
  }),
}));
// Machines dialog pulls in the catalog/machine stack; the page only needs to
// know it was asked to open.
vi.mock("@/components/CustomerMachinesDialog", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>machines dialog</div> : null),
}));

const { default: UsersPage } = await import("./UsersPage");

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "u-1",
    email: "person@elkatech.local",
    displayName: "Test Person",
    role: "customer",
    emailVerified: true,
    approvalStatus: "approved",
    accountOrigin: "self_signup",
    profileCompleted: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  } as AuthUser;
}

const SYSTEM_ADMIN = user({
  id: "system-1",
  displayName: "Platform Admin",
  email: "admin@elkatech.local",
  role: "admin",
  accountOrigin: "admin_invite",
  createdAt: "2024-01-01T00:00:00.000Z",
});

const FIXTURE: AuthUser[] = [
  SYSTEM_ADMIN,
  user({ id: "c-1", displayName: "Kush Jayesh Ahir", email: "kush@example.com", role: "customer", accountOrigin: "firebase_google" }),
  user({ id: "s-1", displayName: "Love Ahir", email: "love@example.com", role: "support", accountOrigin: "admin_invite" }),
  user({ id: "o-1", displayName: "Jayesh Kharadi", email: "jayesh@example.com", role: "owner", accountOrigin: "admin_invite" }),
  user({ id: "p-1", displayName: "Pending Pat", email: "pat@example.com", role: "customer", approvalStatus: "pending_approval" }),
  user({ id: "x-1", displayName: "Suspended Sam", email: "sam@example.com", role: "engineer", approvalStatus: "suspended" }),
];

function mockUsers(list: AuthUser[] = FIXTURE) {
  apiRequest.mockImplementation((url: string) => {
    if (url.startsWith("/api/admin/users?") || url === "/api/admin/users") {
      return Promise.resolve(list);
    }
    if (url.includes("/api/activity/people/")) {
      return Promise.resolve({
        person: { ...list[0], companyName: "ABCD", lastSeenAt: null, workload: null },
        machineCount: 2,
        priorityDistribution: {},
        eventCounts: {},
      });
    }
    return Promise.resolve({});
  });
}

let pageContainer: HTMLElement;

/** Desktop table scope. The mobile list is in the DOM at the same time (CSS
 *  hides it), so unscoped queries match every row twice. */
function table() {
  return within(pageContainer.querySelector("div.hidden.md\\:block") as HTMLElement);
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: new QueryCache({ onError: () => {} }),
  });
  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/app/users"]}>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  pageContainer = result.container;
  return result;
}

async function openRowMenu(name: string) {
  // Radix opens on pointerdown / keyboard, not on a synthetic click.
  const trigger = table().getByRole("button", { name: `Actions for ${name}` });
  fireEvent.keyDown(trigger, { key: "Enter" });
  return screen.findByRole("menu");
}

async function openDetails(name: string) {
  fireEvent.click(within(await openRowMenu(name)).getByText("View details"));
  return screen.findByRole("dialog", { name: "Account details" });
}

beforeEach(() => {
  apiRequest.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
  sessionRole.current = "admin";
  sessionRole.id = "admin-me";
});
afterEach(cleanup);

describe("Users & Access — layout", () => {
  it("renders the header, primary action and compact metrics", async () => {
    mockUsers();
    const { container } = renderPage();
    await table().findByText("Kush Jayesh Ahir");

    expect(screen.getByRole("heading", { name: "Users & Access" })).toBeInTheDocument();
    expect(
      screen.getByText("Manage customer accounts, staff invitations, approvals, and access status."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Invite staff/ })).toBeInTheDocument();

    const metricLabels = Array.from(container.querySelectorAll("dl dt")).map((d) => d.textContent);
    expect(metricLabels).toEqual([
      "Total users",
      "Customers",
      "Active staff",
      "Pending approval",
      "Suspended",
    ]);
  });

  it("shows no permanent invite form on load", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    expect(screen.queryByText("Manage staff access")).toBeNull();
    expect(screen.queryByRole("button", { name: "Create invite" })).toBeNull();
    // The only name/email inputs before opening the modal are the search box.
    expect(screen.queryByLabelText("Display name")).toBeNull();
  });

  it("uses the full available width instead of a narrow fixed column", async () => {
    mockUsers();
    const { container } = renderPage();
    await table().findByText("Kush Jayesh Ahir");
    const root = container.firstElementChild as HTMLElement;
    // A hardcoded max-width or 50/50 grid is what broke both sidebar states.
    expect(root.className).toContain("w-full");
    expect(root.className).not.toMatch(/max-w-\[/);
    expect(root.className).not.toContain("lg:grid-cols-[0.85fr_1.15fr]");
  });

  it("renders the account table with the agreed columns", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    const headers = screen
      .getAllByRole("columnheader")
      .map((h) => h.textContent?.trim())
      .filter((h) => h && h !== "Actions");
    expect(headers).toEqual(["User", "Role", "Account type", "Status", "Profile", "Joined"]);
  });

  it("keeps the table grid consistent and horizontally scrollable, never overflowing the page", async () => {
    mockUsers();
    const { container } = renderPage();
    await table().findByText("Kush Jayesh Ahir");
    const el = container.querySelector("table")!;
    expect(el.querySelectorAll("colgroup col")).toHaveLength(7);
    expect(el.querySelectorAll("thead th")).toHaveLength(7);
    expect(el.querySelectorAll("tbody tr:first-child td")).toHaveLength(7);
    expect(el.className).toContain("table-fixed");
    expect(el.parentElement!.className).toContain("overflow-x-auto");
  });

  it("provides a mobile list alongside the desktop table", async () => {
    mockUsers();
    const { container } = renderPage();
    await table().findByText("Kush Jayesh Ahir");
    const list = container.querySelector("ul.md\\:hidden");
    const tableWrap = container.querySelector("div.hidden.md\\:block");
    expect(list).not.toBeNull();
    expect(tableWrap).not.toBeNull();
  });
});

describe("Users & Access — tabs, search and filters", () => {
  it("shows counts and filters by tab", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");

    const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual([
      "All6",
      "Customers2",
      "Staff4",
      "Pending approval1",
      "Suspended1",
    ]);

    fireEvent.click(screen.getByRole("tab", { name: /Customers/ }));
    await waitFor(() => expect(table().queryByText("Love Ahir")).toBeNull());
    expect(table().getByText("Kush Jayesh Ahir")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Suspended/ }));
    await waitFor(() => expect(table().getByText("Suspended Sam")).toBeInTheDocument());
    expect(table().queryByText("Kush Jayesh Ahir")).toBeNull();
  });

  it("searches by name and email", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");

    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "love@" } });
    await waitFor(() => expect(table().queryByText("Kush Jayesh Ahir")).toBeNull());
    expect(table().getByText("Love Ahir")).toBeInTheDocument();
  });

  it("offers every current role in the role filter, including Support and Owner", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    const options = Array.from(
      screen.getByLabelText("Filter by role").querySelectorAll("option"),
    ).map((o) => o.textContent);
    expect(options).toEqual(["All roles", "Customer", "Engineer", "Support", "Owner", "Admin"]);
  });

  it("filters by status and by account type", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");

    fireEvent.change(screen.getByLabelText("Filter by status"), {
      target: { value: "pending_approval" },
    });
    await waitFor(() => expect(table().getByText("Pending Pat")).toBeInTheDocument());
    expect(table().queryByText("Love Ahir")).toBeNull();

    fireEvent.change(screen.getByLabelText("Filter by status"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Filter by account type"), {
      target: { value: "firebase_google" },
    });
    await waitFor(() => expect(table().getByText("Kush Jayesh Ahir")).toBeInTheDocument());
    expect(table().queryByText("Love Ahir")).toBeNull();

    const originOptions = Array.from(
      screen.getByLabelText("Filter by account type").querySelectorAll("option"),
    ).map((o) => o.textContent);
    expect(originOptions).toEqual([
      "All account types",
      "Public signup",
      "Google signup",
      "Staff invited",
      "System account",
    ]);
  });

  it("shows a no-results state with a clear action", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    fireEvent.change(screen.getByLabelText("Search users"), { target: { value: "zzzz" } });
    expect(await screen.findAllByText("No accounts match these filters.")).not.toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Clear filters" }).length).toBeGreaterThan(0);
  });

  it("shows an empty state when there are no accounts", async () => {
    mockUsers([]);
    renderPage();
    expect(await screen.findAllByText("No accounts yet.")).not.toHaveLength(0);
  });

  it("shows a loading state, then the rows", async () => {
    apiRequest.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(FIXTURE), 20)),
    );
    const { container } = renderPage();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    await table().findByText("Kush Jayesh Ahir");
  });
});

describe("Users & Access — row actions", () => {
  it("renders one overflow menu per row and no inline promotion buttons", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");

    for (const label of ["Make engineer", "Make admin", "Make support", "Make owner", "Make customer", "Remove admin"]) {
      expect(screen.queryByRole("button", { name: label })).toBeNull();
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.queryByText("No actions available")).toBeNull();
  });

  it("exposes View machines for a customer only", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");

    const customerMenu = await openRowMenu("Kush Jayesh Ahir");
    expect(within(customerMenu).getByText("View machines")).toBeInTheDocument();
    fireEvent.keyDown(customerMenu, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    const supportMenu = await openRowMenu("Love Ahir");
    expect(within(supportMenu).queryByText("View machines")).toBeNull();
  });

  it("removes approve and reject from a pending account's overflow menu", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Pending Pat");
    const menu = await openRowMenu("Pending Pat");
    expect(within(menu).queryByText("Approve")).toBeNull();
    expect(within(menu).queryByText("Reject")).toBeNull();
    expect(within(menu).queryByText("Suspend")).toBeNull();
    expect(within(menu).getByText("View details")).toBeInTheDocument();
    expect(within(menu).getByText("View machines")).toBeInTheDocument();
    expect(within(menu).getByText("Remove user")).toBeInTheDocument();
  });

  it("swaps suspend for reactivate on a suspended account", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Suspended Sam");
    const menu = await openRowMenu("Suspended Sam");
    expect(within(menu).getByText("Reactivate")).toBeInTheDocument();
    expect(within(menu).queryByText("Suspend")).toBeNull();
  });

  it("keeps Remove user admin-only", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    expect(within(await openRowMenu("Kush Jayesh Ahir")).getByText("Remove user")).toBeInTheDocument();
    cleanup();

    sessionRole.current = "owner";
    sessionRole.id = "owner-me";
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    expect(within(await openRowMenu("Kush Jayesh Ahir")).queryByText("Remove user")).toBeNull();
  });

  it("opens the machines dialog from the menu", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    fireEvent.click(within(await openRowMenu("Kush Jayesh Ahir")).getByText("View machines"));
    expect(await screen.findByText("machines dialog")).toBeInTheDocument();
  });

  it("opens the details drawer from the menu", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    fireEvent.click(within(await openRowMenu("Kush Jayesh Ahir")).getByText("View details"));
    expect(await screen.findByText("Account details")).toBeInTheDocument();
  });
});

describe("Users & Access — Account details approval", () => {
  function approvalCalls(action?: "approve" | "reject") {
    return apiRequest.mock.calls.filter(([url]) => {
      const path = String(url);
      return action
        ? path === `/api/admin/users/p-1/${action}`
        : path === "/api/admin/users/p-1/approve" || path === "/api/admin/users/p-1/reject";
    });
  }

  it("shows one clean approval decision section for a pending account", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Pending Pat");
    const drawer = await openDetails("Pending Pat");

    expect(within(drawer).getByText("Approval decision")).toBeInTheDocument();
    expect(
      within(drawer).queryByText(
        "Review the account information above before approving or rejecting access.",
      ),
    ).toBeNull();
    expect(
      within(drawer).queryByText(
        "Role changes are available through the account actions menu when permitted.",
      ),
    ).toBeNull();
    const info = within(drawer).getByRole("button", { name: "About approval decisions" });
    expect(document.querySelector(".max-w-\\[220px\\]")).toBeNull();
    fireEvent.pointerEnter(info);
    await waitFor(() => expect(document.querySelector(".max-w-\\[220px\\]")).not.toBeNull());
    expect(document.querySelector(".max-w-\\[220px\\]")).toHaveTextContent(
      "Review details first. Role changes require confirmation.",
    );
    expect(within(drawer).getAllByRole("button", { name: "Approve account" })).toHaveLength(1);
    expect(within(drawer).getAllByRole("button", { name: "Reject account" })).toHaveLength(1);
  });

  it("does not show pending actions for an approved account", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    const drawer = await openDetails("Kush Jayesh Ahir");

    expect(within(drawer).getByText("Approved")).toBeInTheDocument();
    expect(within(drawer).queryByText("Approval decision")).toBeNull();
    expect(within(drawer).queryByRole("button", { name: "Approve account" })).toBeNull();
    expect(within(drawer).queryByRole("button", { name: "Reject account" })).toBeNull();
  });

  it("shows Rejected and only the supported reactivation action for a rejected account", async () => {
    const rejected = user({
      id: "r-1",
      displayName: "Rejected Riley",
      email: "riley@example.com",
      approvalStatus: "rejected",
    });
    mockUsers([...FIXTURE, rejected]);
    renderPage();
    await table().findByText("Rejected Riley");
    const drawer = await openDetails("Rejected Riley");

    expect(within(drawer).getByText("Rejected")).toBeInTheDocument();
    expect(within(drawer).queryByText("Approval decision")).toBeNull();
    expect(within(drawer).queryByRole("button", { name: "Approve account" })).toBeNull();
    expect(within(drawer).queryByRole("button", { name: "Reject account" })).toBeNull();
    expect(within(drawer).getByRole("button", { name: "Reactivate account" })).toBeInTheDocument();
  });

  it("shows the supported reactivation action for a suspended account", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Suspended Sam");
    const drawer = await openDetails("Suspended Sam");

    expect(within(drawer).getByText("Suspended")).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Reactivate account" })).toBeInTheDocument();
  });

  it("requires approval confirmation and Cancel makes no API call", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Pending Pat");
    const drawer = await openDetails("Pending Pat");
    fireEvent.click(within(drawer).getByRole("button", { name: "Approve account" }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Approve this account?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "This customer will be allowed to access the service portal and create service requests.",
      ),
    ).toBeInTheDocument();
    expect(approvalCalls()).toHaveLength(0);

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(approvalCalls()).toHaveLength(0);
    expect(within(drawer).getByRole("button", { name: "Approve account" })).toBeInTheDocument();
  });

  it("calls the existing approve endpoint only after confirmation", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Pending Pat");
    const drawer = await openDetails("Pending Pat");
    fireEvent.click(within(drawer).getByRole("button", { name: "Approve account" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve account" }));

    await waitFor(() => expect(approvalCalls("approve")).toHaveLength(1));
    expect(approvalCalls("reject")).toHaveLength(0);
    expect(approvalCalls("approve")[0][1]).toMatchObject({ method: "POST", body: "{}" });
  });

  it("requires rejection confirmation, supports Cancel, and calls the reject endpoint", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Pending Pat");
    const drawer = await openDetails("Pending Pat");
    fireEvent.click(within(drawer).getByRole("button", { name: "Reject account" }));

    let dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Reject this account?")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "This account will remain unable to use the service portal. This action can be reviewed later if reactivation is supported.",
      ),
    ).toBeInTheDocument();
    expect(approvalCalls()).toHaveLength(0);
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(approvalCalls()).toHaveLength(0);

    fireEvent.click(within(drawer).getByRole("button", { name: "Reject account" }));
    dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Reject account" }));
    await waitFor(() => expect(approvalCalls("reject")).toHaveLength(1));
    expect(approvalCalls("approve")).toHaveLength(0);
  });

  it("refreshes users, keeps the drawer open, and immediately shows the successful status", async () => {
    const approved = { ...FIXTURE.find((candidate) => candidate.id === "p-1")!, approvalStatus: "approved" as const };
    const refreshed = FIXTURE.map((candidate) => (candidate.id === approved.id ? approved : candidate));
    let usersFetches = 0;
    apiRequest.mockImplementation((url: string) => {
      if (url === "/api/admin/users") {
        usersFetches += 1;
        return Promise.resolve(usersFetches === 1 ? FIXTURE : refreshed);
      }
      if (url.includes("/api/activity/people/")) {
        return Promise.resolve({
          person: { ...approved, companyName: "ABCD", lastSeenAt: null, workload: null },
          machineCount: 2,
          priorityDistribution: {},
          eventCounts: {},
        });
      }
      if (url === "/api/admin/users/p-1/approve") {
        return Promise.resolve({ user: approved });
      }
      return Promise.resolve({});
    });
    renderPage();
    await table().findByText("Pending Pat");
    const drawer = await openDetails("Pending Pat");
    fireEvent.click(within(drawer).getByRole("button", { name: "Approve account" }));
    fireEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "Approve account",
      }),
    );

    await waitFor(() => expect(usersFetches).toBeGreaterThan(1));
    expect(screen.getByRole("dialog", { name: "Account details" })).toBeInTheDocument();
    expect(within(drawer).getByText("Approved")).toBeInTheDocument();
    expect(within(drawer).queryByText("Approval decision")).toBeNull();
    expect(within(drawer).queryByRole("button", { name: "Approve account" })).toBeNull();
    expect(within(drawer).queryByRole("button", { name: "Reject account" })).toBeNull();
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Pending Pat approved."));
  });

  it.each(["support", "engineer"] as const)(
    "does not expose approval actions to the %s role",
    async (role) => {
      sessionRole.current = role;
      sessionRole.id = `${role}-actor`;
      mockUsers();
      renderPage();
      await table().findByText("Pending Pat");
      const drawer = await openDetails("Pending Pat");

      expect(within(drawer).queryByText("Approval decision")).toBeNull();
      expect(within(drawer).queryByRole("button", { name: "Approve account" })).toBeNull();
      expect(within(drawer).queryByRole("button", { name: "Reject account" })).toBeNull();
    },
  );

  it("allows an owner through the shared approval RBAC helper", async () => {
    sessionRole.current = "owner";
    sessionRole.id = "owner-actor";
    mockUsers();
    renderPage();
    await table().findByText("Pending Pat");
    const drawer = await openDetails("Pending Pat");

    expect(within(drawer).getByRole("button", { name: "Approve account" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Reject account" })).toBeInTheDocument();
  });
});

describe("Users & Access — protected system account", () => {
  it("marks it protected and exposes no destructive action", async () => {
    mockUsers();
    const { container } = renderPage();
    await table().findByText("Platform Admin");

    expect(screen.getByText("Protected account")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actions for Platform Admin" })).toBeNull();
    expect(screen.queryByText("No actions available")).toBeNull();

    const row = Array.from(container.querySelectorAll("tbody tr")).find((tr) =>
      tr.textContent?.includes("Platform Admin"),
    )!;
    expect(row.textContent).toContain("System account");
    for (const label of ["Suspend", "Remove user", "Reject"]) {
      expect(within(row as HTMLElement).queryByText(label)).toBeNull();
    }
  });
});

describe("Users & Access — invite staff", () => {
  async function openInvite() {
    await table().findByText("Kush Jayesh Ahir");
    fireEvent.click(screen.getByRole("button", { name: /Invite staff/ }));
    return screen.findByRole("dialog");
  }

  function roleValues(dialog: HTMLElement) {
    return within(dialog).getAllByRole("radio").map((r) => (r as HTMLInputElement).value);
  }

  it("offers Engineer, Support and Admin to an admin actor", async () => {
    mockUsers();
    renderPage();
    const dialog = await openInvite();

    expect(within(dialog).getByLabelText("Display name")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Email")).toBeInTheDocument();

    expect(roleValues(dialog)).toEqual(["engineer", "support", "admin"]);
    expect(within(dialog).getByText("Admin")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Manages platform users, permissions, approvals, and operational settings."),
    ).toBeInTheDocument();
    // Owner is still never creatable from this dialog.
    expect(within(dialog).queryByText("Owner")).toBeNull();
  });

  it("hides Admin entirely from an owner actor rather than disabling it", async () => {
    sessionRole.current = "owner";
    sessionRole.id = "o-1";
    mockUsers();
    renderPage();
    const dialog = await openInvite();

    expect(roleValues(dialog)).toEqual(["engineer", "support"]);
    expect(within(dialog).queryByText("Admin")).toBeNull();
    expect(within(dialog).queryByText(/full platform management privileges/)).toBeNull();
  });

  it("keeps Engineer and Support cards unchanged", async () => {
    mockUsers();
    renderPage();
    const dialog = await openInvite();

    expect(
      within(dialog).getByText("Handles assigned service requests and updates work status."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Coordinates customers, requests, and engineer assignments."),
    ).toBeInTheDocument();
    // Engineer stays the default selection.
    const engineer = within(dialog).getAllByRole("radio")[0] as HTMLInputElement;
    expect(engineer.checked).toBe(true);
  });

  it("warns only while Admin is selected, without a browser confirm", async () => {
    mockUsers();
    renderPage();
    const dialog = await openInvite();

    expect(within(dialog).queryByRole("alert")).toBeNull();

    fireEvent.click(within(dialog).getByRole("radio", { name: /Admin/ }));
    const warning = within(dialog).getByRole("alert");
    expect(warning.textContent).toContain(
      "Administrator access grants full platform management privileges",
    );
    expect(warning.textContent).toContain("Invite only trusted personnel.");

    // Switching back to a non-elevated role clears it again.
    fireEvent.click(within(dialog).getByRole("radio", { name: /Support/ }));
    expect(within(dialog).queryByRole("alert")).toBeNull();
  });

  it("updates the footer copy to match the selected role", async () => {
    mockUsers();
    renderPage();
    const dialog = await openInvite();

    expect(
      within(dialog).getByText(/Invited staff receive the Engineer role\./),
    ).toBeInTheDocument();
    // The old copy claimed admin access was never granted through invitations.
    expect(within(dialog).queryByText(/Owner and admin access is not granted/)).toBeNull();

    fireEvent.click(within(dialog).getByRole("radio", { name: /Admin/ }));
    const footer = within(dialog).getByText(/Invited staff receive the Admin role\./);
    expect(footer.textContent).toContain(
      "Administrator invitations should be used only for trusted personnel.",
    );
  });

  it("shows inline validation instead of relying on native tooltips", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    fireEvent.click(screen.getByRole("button", { name: /Invite staff/ }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelector("form")).toHaveAttribute("noValidate");

    fireEvent.click(within(dialog).getByRole("button", { name: "Send invite" }));
    expect(await within(dialog).findByText("Enter a display name.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter an email address.")).toBeInTheDocument();
    expect(apiRequest.mock.calls.some(([u]) => String(u).includes("/invite"))).toBe(false);
  });

  it("submits a valid invitation to the existing endpoint", async () => {
    mockUsers();
    apiRequest.mockImplementation((url: string) => {
      if (String(url).includes("/invite")) {
        return Promise.resolve({ inviteUrl: "https://example.test/signup?token=abc" });
      }
      return Promise.resolve(FIXTURE);
    });
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    fireEvent.click(screen.getByRole("button", { name: /Invite staff/ }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Display name"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: "ada@example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invite" }));

    await waitFor(() => {
      const call = apiRequest.mock.calls.find(([u]) => String(u).includes("/invite"));
      expect(call).toBeTruthy();
      expect(JSON.parse(call![1].body)).toEqual({
        displayName: "Ada Lovelace",
        email: "ada@example.com",
        role: "engineer",
      });
    });
  });

  it("sends an admin invitation through the same endpoint", async () => {
    mockUsers();
    apiRequest.mockImplementation((url: string) => {
      if (String(url).includes("/invite")) {
        return Promise.resolve({ inviteUrl: "https://example.test/signup?token=xyz" });
      }
      return Promise.resolve(FIXTURE);
    });
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    fireEvent.click(screen.getByRole("button", { name: /Invite staff/ }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: /Admin/ }));
    fireEvent.change(within(dialog).getByLabelText("Display name"), {
      target: { value: "Grace Hopper" },
    });
    fireEvent.change(within(dialog).getByLabelText("Email"), {
      target: { value: "grace@example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invite" }));

    await waitFor(() => {
      const calls = apiRequest.mock.calls.filter(([u]) => String(u).includes("/invite"));
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toBe("/api/admin/users/invite");
      expect(JSON.parse(calls[0][1].body)).toEqual({
        displayName: "Grace Hopper",
        email: "grace@example.com",
        role: "admin",
      });
    });
    // Same flow as any other role: the invite link takes over the dialog.
    expect(await within(dialog).findByText("https://example.test/signup?token=xyz")).toBeInTheDocument();
  });

  it("still blocks an invalid admin invitation with inline validation", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Kush Jayesh Ahir");
    fireEvent.click(screen.getByRole("button", { name: /Invite staff/ }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: /Admin/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Send invite" }));

    expect(await within(dialog).findByText("Enter a display name.")).toBeInTheDocument();
    expect(within(dialog).getByText("Enter an email address.")).toBeInTheDocument();
    expect(apiRequest.mock.calls.some(([u]) => String(u).includes("/invite"))).toBe(false);
  });
});

describe("Users & Access — manage role", () => {
  it("offers Manage role for a staff-managed account and not for a Google signup", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Love Ahir");

    expect(within(await openRowMenu("Love Ahir")).getByText("Manage role")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());

    // Kush signed up via Google — the UI must not promote them to staff.
    expect(within(await openRowMenu("Kush Jayesh Ahir")).queryByText("Manage role")).toBeNull();
  });

  it("does not offer Manage role on the protected Platform Admin row", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Platform Admin");
    expect(screen.queryByRole("button", { name: "Actions for Platform Admin" })).toBeNull();
  });

  it("does not offer Manage role on your own row", async () => {
    sessionRole.current = "admin";
    sessionRole.id = "s-1"; // signed in as Love Ahir
    mockUsers();
    renderPage();
    await table().findByText("Love Ahir");
    expect(within(await openRowMenu("Love Ahir")).queryByText("Manage role")).toBeNull();
  });

  it("shows the current role and only assignable roles, excluding the current one", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Love Ahir");
    fireEvent.click(within(await openRowMenu("Love Ahir")).getByText("Manage role"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Manage role")).toBeInTheDocument();
    expect(within(dialog).getByText(/Current role:/)).toBeInTheDocument();
    expect(within(dialog).getByText("Support", { selector: "span" })).toBeInTheDocument();

    const offered = within(dialog).getAllByRole("radio").map((r) => (r as HTMLInputElement).value);
    // Love Ahir is Support today, so Support must not be offered back.
    expect(offered).not.toContain("support");
    expect(offered).toEqual(["customer", "engineer", "owner", "admin"]);
  });

  it("keeps confirm disabled until a different role is chosen, and needs a second step", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Love Ahir");
    fireEvent.click(within(await openRowMenu("Love Ahir")).getByText("Manage role"));

    const dialog = await screen.findByRole("dialog");
    const continueBtn = within(dialog).getByRole("button", { name: "Continue" });
    expect(continueBtn).toBeDisabled();
    // No confirm button exists yet — the change cannot happen in one click.
    expect(within(dialog).queryByRole("button", { name: "Confirm role change" })).toBeNull();

    fireEvent.click(within(dialog).getByRole("radio", { name: /Engineer/ }));
    expect(continueBtn).not.toBeDisabled();

    fireEvent.click(continueBtn);
    expect(
      await within(dialog).findByRole("button", { name: "Confirm role change" }),
    ).toBeInTheDocument();
    expect(apiRequest.mock.calls.some(([u]) => String(u).includes("/role"))).toBe(false);
  });

  it("shows the elevated warning copy when promoting to Admin or Owner", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Love Ahir");
    fireEvent.click(within(await openRowMenu("Love Ahir")).getByText("Manage role"));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: /Admin/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent(
      "Admin access grants full platform control, including destructive user-management actions.",
    );

    fireEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: /Owner/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Owner access grants operational and account-management privileges.",
    );
  });

  it("makes no API call when cancelled", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Love Ahir");
    fireEvent.click(within(await openRowMenu("Love Ahir")).getByText("Manage role"));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: /Engineer/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(apiRequest.mock.calls.some(([u]) => String(u).includes("/role"))).toBe(false);
  });

  it("calls the existing role endpoint and refreshes on confirm", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Love Ahir");
    fireEvent.click(within(await openRowMenu("Love Ahir")).getByText("Manage role"));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: /Engineer/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm role change" }));

    await waitFor(() => {
      const call = apiRequest.mock.calls.find(([u]) => String(u) === "/api/admin/users/s-1/role");
      expect(call).toBeTruthy();
      expect(call![1].method).toBe("POST");
      expect(JSON.parse(call![1].body)).toEqual({ role: "engineer" });
    });
    // Dialog closes and the list is refetched.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      apiRequest.mock.calls.filter(([u]) => String(u) === "/api/admin/users").length,
    ).toBeGreaterThan(1);
  });

  it("surfaces a backend rejection and keeps the dialog open", async () => {
    apiRequest.mockImplementation((url: string) => {
      if (String(url).includes("/role")) {
        const rejected = Promise.reject(new MockApiError("You are not allowed to assign that role.", 403));
        rejected.catch(() => {});
        return rejected;
      }
      return Promise.resolve(FIXTURE);
    });
    renderPage();
    await table().findByText("Love Ahir");
    fireEvent.click(within(await openRowMenu("Love Ahir")).getByText("Manage role"));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: /Engineer/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm role change" }));

    await waitFor(() =>
      expect(apiRequest.mock.calls.some(([u]) => String(u).includes("/role"))).toBe(true),
    );
    // Failure must not close the dialog or pretend it worked.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps the menu compact and separates destructive actions", async () => {
    mockUsers();
    renderPage();
    await table().findByText("Love Ahir");
    const menu = await openRowMenu("Love Ahir");

    // Portaled content must carry `lp-portal`, otherwise every var(--lp-*)
    // is invalid out there and the border falls back to near-black.
    expect(menu.className).toContain("lp-portal");
    expect(menu.className).toContain("w-[184px]");
    expect(menu.className).toContain("border-[var(--lp-line-strong)]");
    expect(menu.className).toContain("bg-[var(--lp-panel)]");
    const items = within(menu).getAllByRole("menuitem");
    // Agreed order, with destructive actions last and below a separator.
    expect(items.map((i) => i.textContent)).toEqual([
      "View details",
      "Manage role",
      "Suspend",
      "Remove user",
    ]);
    for (const item of items) expect(item.className).toContain("text-[13px]");
    expect(menu.querySelector('[role="separator"]')).not.toBeNull();
  });
});
