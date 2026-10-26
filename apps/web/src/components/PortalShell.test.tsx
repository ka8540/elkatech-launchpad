import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AuthUser, Role } from "@elkatech/contracts";

const sessionUser = vi.hoisted(() => ({ current: null as AuthUser | null }));

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({ data: { user: sessionUser.current }, isLoading: false }),
}));
vi.mock("@/lib/api", () => ({ apiRequest: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/firebase", () => ({ firebaseSignOut: vi.fn().mockResolvedValue(undefined) }));

// Imported after the mocks are registered.
const { default: PortalShell } = await import("./PortalShell");
const { ThemeProvider } = await import("./ThemeProvider");

const SIDEBAR_COLLAPSED_KEY = "elkatech-portal-sidebar-collapsed";

function makeUser(role: Role): AuthUser {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    email: `${role}@elkatech.local`,
    displayName: `Test ${role}`,
    role,
    emailVerified: true,
    approvalStatus: "approved",
    accountOrigin: "admin_invite",
    profileCompleted: true,
    createdAt: new Date().toISOString(),
  };
}

function renderShell(role: Role, pathname = "/app/requests") {
  sessionUser.current = makeUser(role);
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider defaultTheme="light" storageKey="elkatech-test-theme">
        <MemoryRouter initialEntries={[pathname]}>
          <Routes>
            <Route path="/app" element={<PortalShell />}>
              <Route path="requests" element={<div>requests page</div>} />
              <Route path="requests/new" element={<div>create page</div>} />
              <Route path="admin" element={<div>overview page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

/** Both the desktop aside and the mobile drawer render at once (CSS hides one),
 *  so scope every query to the right one. [0] = desktop, [1] = mobile drawer. */
function navRegion(index: 0 | 1) {
  return screen.getAllByRole("navigation", { name: "Portal navigation" })[index];
}

function linkLabels(index: 0 | 1) {
  return within(navRegion(index))
    .getAllByRole("link")
    .map((el) => el.textContent?.trim());
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  sessionUser.current = null;
});

describe("PortalShell — desktop sidebar", () => {
  it("renders the admin nav in the agreed order", () => {
    renderShell("admin");
    expect(linkLabels(0)).toEqual([
      "Overview",
      "Users",
      "Activity",
      "Issue Reports",
      "Customer Machines",
      "Requests",
      "Queue",
    ]);
  });

  it("renders no Create Request or Customer Activity entry for an admin", () => {
    renderShell("admin");
    const nav = within(navRegion(0));
    expect(nav.queryByRole("link", { name: "Create Request" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Customer Activity" })).toBeNull();
  });

  it("keeps Customer Activity for support", () => {
    renderShell("support");
    expect(linkLabels(0)).toEqual([
      "Requests",
      "Queue",
      "Activity",
      "Customer Activity",
    ]);
  });

  it("leaves the customer nav untouched", () => {
    renderShell("customer");
    expect(linkLabels(0)).toEqual(["Requests", "My Reports"]);
  });

  it("keeps the divider below My Account separated from the button", () => {
    renderShell("admin");
    const account = screen.getAllByRole("link", { name: "My Account" })[0];
    const accountGroup = account.parentElement;
    const divider = accountGroup?.nextElementSibling;

    expect(accountGroup).toHaveClass("pt-3", "pb-3");
    expect(divider).toHaveClass("border-t", "border-[var(--lp-line)]");
  });
});

describe("PortalShell — active state", () => {
  it("marks Requests as the current page on /app/requests/new", () => {
    renderShell("admin", "/app/requests/new");
    const requests = within(navRegion(0)).getByRole("link", { name: "Requests" });
    expect(requests).toHaveAttribute("aria-current", "page");
  });

  it("still renders the create page itself at /app/requests/new", () => {
    renderShell("admin", "/app/requests/new");
    expect(screen.getByText("create page")).toBeInTheDocument();
  });

  it("marks Overview as the current page on /app/admin", () => {
    renderShell("admin", "/app/admin");
    const nav = within(navRegion(0));
    expect(nav.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(nav.getByRole("link", { name: "Requests" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});

describe("PortalShell — collapsed sidebar", () => {
  beforeEach(() => window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true"));

  it("hides labels but exposes each item as a tooltip + accessible name", () => {
    renderShell("admin");
    const links = within(navRegion(0)).getAllByRole("link");
    const overview = links[0];
    // Label text is not rendered when collapsed…
    expect(overview.textContent?.trim()).toBe("");
    // …but the item is still identifiable on hover and to assistive tech.
    expect(overview).toHaveAttribute("title", "Overview");
    expect(links.map((l) => l.getAttribute("title"))).toEqual([
      "Overview",
      "Users",
      "Activity",
      "Issue Reports",
      "Customer Machines",
      "Requests",
      "Queue",
    ]);
  });

  it("keeps the full label set in the mobile drawer even when collapsed", () => {
    renderShell("admin");
    expect(linkLabels(1)).toEqual([
      "Overview",
      "Users",
      "Activity",
      "Issue Reports",
      "Customer Machines",
      "Requests",
      "Queue",
    ]);
  });
});

describe("PortalShell — mobile drawer", () => {
  it("mirrors the desktop nav for each role", () => {
    renderShell("owner");
    expect(linkLabels(1)).toEqual(linkLabels(0));
    expect(linkLabels(1)).toEqual([
      "Requests",
      "Queue",
      "Customer Activity",
      "Customer Machines",
      "Users",
    ]);
  });

  it("offers no Create Request entry on mobile either", () => {
    renderShell("admin");
    expect(linkLabels(1)).not.toContain("Create Request");
  });
});
