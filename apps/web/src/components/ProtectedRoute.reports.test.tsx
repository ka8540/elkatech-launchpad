import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Role } from "@elkatech/contracts";

const session = vi.hoisted(() => ({
  role: "admin" as Role,
  isLoading: false,
}));

vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({
    data: {
      user: {
        role: session.role,
        profileCompleted: true,
      },
    },
    isLoading: session.isLoading,
  }),
}));

const { default: ProtectedRoute } = await import("./ProtectedRoute");

function renderReportRoute() {
  return render(
    <MemoryRouter initialEntries={["/app/reports"]}>
      <Routes>
        <Route
          path="/app/reports"
          element={
            <ProtectedRoute roles={["admin"]}>
              <div>staff report data</div>
            </ProtectedRoute>
          }
        />
        <Route path="/app/queue" element={<div>staff home</div>} />
        <Route path="/app/requests" element={<div>customer home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  session.role = "admin";
  session.isLoading = false;
});
afterEach(cleanup);

describe("Admin Issue Reports route guard", () => {
  it("allows Admin to render the report console", () => {
    renderReportRoute();
    expect(screen.getByText("staff report data")).toBeInTheDocument();
  });

  it.each(["owner", "support", "engineer"] as const)(
    "redirects %s to the existing safe staff home without rendering report data",
    (role) => {
      session.role = role;
      renderReportRoute();
      expect(screen.getByText("staff home")).toBeInTheDocument();
      expect(screen.queryByText("staff report data")).toBeNull();
    },
  );

  it("redirects Customer without rendering the Admin report console", () => {
    session.role = "customer";
    renderReportRoute();
    expect(screen.getByText("customer home")).toBeInTheDocument();
    expect(screen.queryByText("staff report data")).toBeNull();
  });

  it("renders only the loading gate while the role check is unresolved", () => {
    session.isLoading = true;
    renderReportRoute();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your workspace...");
    expect(screen.queryByText("staff report data")).toBeNull();
  });
});
