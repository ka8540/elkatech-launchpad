import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Role } from "@elkatech/contracts";

const session = vi.hoisted(() => ({ role: "admin" as Role }));

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({
    data: { user: { role: session.role } },
    isLoading: false,
  }),
}));

const { default: PortalIndexRedirect } = await import("./PortalIndexRedirect");

function renderIndex(role: Role) {
  session.role = role;
  render(
    <MemoryRouter initialEntries={["/app"]}>
      <Routes>
        <Route path="/app" element={<PortalIndexRedirect />} />
        <Route path="/app/admin" element={<div>overview home</div>} />
        <Route path="/app/requests" element={<div>requests home</div>} />
        <Route path="/app/queue" element={<div>queue home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  session.role = "admin";
});
afterEach(cleanup);

describe("PortalIndexRedirect", () => {
  it("opens Overview for Admin", () => {
    renderIndex("admin");
    expect(screen.getByText("overview home")).toBeInTheDocument();
  });

  it("opens Requests for Customer", () => {
    renderIndex("customer");
    expect(screen.getByText("requests home")).toBeInTheDocument();
  });

  it.each(["owner", "support", "engineer"] as const)("opens Queue for %s", (role) => {
    renderIndex(role);
    expect(screen.getByText("queue home")).toBeInTheDocument();
  });
});
