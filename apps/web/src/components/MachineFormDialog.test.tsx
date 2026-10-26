import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn(),
  ApiError: class ApiError extends Error {},
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const { default: MachineFormDialog } = await import("./MachineFormDialog");

afterEach(cleanup);

describe("MachineFormDialog customer requirement", () => {
  it("does not render a customer list and cannot submit until one is selected", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    render(
      <QueryClientProvider client={client}>
        <MachineFormDialog
          open
          onOpenChange={vi.fn()}
          products={[]}
          editing={null}
          onSaved={vi.fn()}
        />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("combobox", { name: "Search customers" }),
    ).toHaveAttribute(
      "placeholder",
      "Search customer by name, email, or company",
    );
    const modal = screen
      .getByRole("heading", { name: "Link machine to customer" })
      .closest("[role='dialog']");
    expect(modal).toHaveClass("sm:max-w-4xl", "xl:max-w-5xl");
    expect(modal?.querySelector("form")).toHaveClass(
      "lg:grid-cols-2",
      "lg:items-start",
    );
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link machine" })).toBeDisabled();
  });
});
