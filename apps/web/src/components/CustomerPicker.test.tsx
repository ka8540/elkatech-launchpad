import { readFileSync } from "node:fs";
import path from "node:path";
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CustomerPickerCustomer,
  CustomerPickerResponse,
} from "@elkatech/contracts";

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ apiRequest }));

const { default: CustomerPicker } = await import("./CustomerPicker");

const CUSTOMER_ONE: CustomerPickerCustomer = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Kush Ahir",
  email: "kush.j.ahir01@gmail.com",
  companyName: "VJ Enterprise",
  approvalStatus: "approved",
  profileCompleted: true,
};

const CUSTOMER_TWO: CustomerPickerCustomer = {
  id: "00000000-0000-4000-8000-000000000002",
  displayName: "Kush Jayesh Ahir",
  email: "kush.ahir2024@gmail.com",
  companyName: "Elka Graphics",
  approvalStatus: "pending_approval",
  profileCompleted: false,
};

function response(
  customers: CustomerPickerCustomer[],
  nextCursor: string | null = null,
): CustomerPickerResponse {
  return { customers, nextCursor };
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function PickerHarness({ initial = null }: { initial?: CustomerPickerCustomer | null }) {
  const [value, setValue] = useState<CustomerPickerCustomer | null>(initial);
  return <CustomerPicker value={value} onChange={setValue} />;
}

function renderPicker(initial?: CustomerPickerCustomer | null) {
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <PickerHarness initial={initial} />
    </QueryClientProvider>,
  );
}

function openPicker() {
  const input = screen.getByRole("combobox", { name: "Search customers" });
  fireEvent.click(input);
  return input;
}

async function searchFor(query: string) {
  const input = openPicker();
  fireEvent.change(input, { target: { value: query } });
  await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1), { timeout: 1_000 });
  return input;
}

beforeEach(() => {
  apiRequest.mockReset();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CustomerPicker search", () => {
  it("does not render or request the full customer list initially", () => {
    renderPicker();
    expect(screen.queryByText(CUSTOMER_ONE.displayName)).not.toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();

    const input = openPicker();
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(input).toHaveFocus();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Type at least 2 characters to search."),
    ).not.toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("waits for two characters and debounces search", async () => {
    apiRequest.mockResolvedValue(response([]));
    renderPicker();
    const input = openPicker();

    fireEvent.change(input, { target: { value: "k" } });
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 325)));
    expect(apiRequest).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "ku" } });
    expect(apiRequest).not.toHaveBeenCalled();
    await act(() => new Promise((resolve) => window.setTimeout(resolve, 150)));
    expect(apiRequest).not.toHaveBeenCalled();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1), { timeout: 1_000 });
    expect(apiRequest.mock.calls[0][0]).toContain(
      "/api/admin/customer-picker?search=ku&limit=15",
    );
  });

  it("shows loading, no-results, and error states", async () => {
    let resolveRequest: (value: CustomerPickerResponse) => void = () => undefined;
    apiRequest.mockImplementation(
      () =>
        new Promise<CustomerPickerResponse>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderPicker();
    await searchFor("ku");
    expect(screen.getByRole("status")).toHaveTextContent("Searching customers");

    await act(async () => resolveRequest(response([])));
    expect(await screen.findByText("No matches")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    cleanup();
    apiRequest.mockReset();
    apiRequest.mockRejectedValue(new Error("network"));
    renderPicker();
    await searchFor("vj");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t load customers");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders compact name, email, company, and status rows", async () => {
    apiRequest.mockResolvedValue(response([CUSTOMER_ONE, CUSTOMER_TWO]));
    renderPicker();
    await searchFor("ku");

    const firstResult = (await screen.findByText(CUSTOMER_ONE.displayName)).closest(
      "[role='option']",
    );
    await waitFor(() =>
      expect(firstResult).toHaveClass(
        "bg-[var(--lp-panel-2)]",
        "text-[var(--lp-ink)]",
        "shadow-[inset_3px_0_0_var(--lp-accent)]",
      ),
    );
    expect(screen.getByText(CUSTOMER_ONE.email)).toBeInTheDocument();
    expect(screen.getByText("VJ Enterprise")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toHaveClass("dark:text-emerald-300");
    expect(screen.getByText("Pending")).toHaveClass("dark:text-amber-300");
  });

  it("loads another bounded page without replacing earlier results", async () => {
    apiRequest
      .mockResolvedValueOnce(response([CUSTOMER_ONE], "page-2"))
      .mockResolvedValueOnce(response([CUSTOMER_TWO], null));
    renderPicker();
    await searchFor("ku");

    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));
    expect(apiRequest.mock.calls[1][0]).toContain("cursor=page-2");
    expect(screen.getByText(CUSTOMER_ONE.displayName)).toBeInTheDocument();
    expect(await screen.findByText(CUSTOMER_TWO.displayName)).toBeInTheDocument();
  });
});

describe("CustomerPicker selection and accessibility", () => {
  it("supports Arrow Down and Enter, closes, and shows the selected summary", async () => {
    apiRequest.mockResolvedValue(response([CUSTOMER_ONE, CUSTOMER_TWO]));
    renderPicker();
    const input = await searchFor("ku");
    await screen.findByText(CUSTOMER_ONE.displayName);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(await screen.findByTestId("selected-customer-summary")).toHaveTextContent(
      CUSTOMER_TWO.displayName,
    );
    expect(screen.getByTestId("selected-customer-summary")).toHaveTextContent(
      CUSTOMER_TWO.email,
    );
    expect(screen.getByTestId("selected-customer-summary")).toHaveTextContent(
      CUSTOMER_TWO.companyName!,
    );
    expect(
      screen.queryByRole("combobox", { name: "Search customers" }),
    ).not.toBeInTheDocument();
  });

  it("closes on Escape without selecting", async () => {
    apiRequest.mockResolvedValue(response([CUSTOMER_ONE]));
    renderPicker();
    const input = await searchFor("ku");
    await screen.findByText(CUSTOMER_ONE.displayName);

    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByText(CUSTOMER_ONE.displayName)).not.toBeInTheDocument(),
    );
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("can clear or change the selected customer", () => {
    renderPicker(CUSTOMER_ONE);
    fireEvent.click(screen.getByRole("button", { name: "Clear customer selection" }));
    expect(screen.getByRole("combobox", { name: "Search customers" })).toBeInTheDocument();

    cleanup();
    renderPicker(CUSTOMER_ONE);
    fireEvent.click(screen.getByRole("button", { name: "Change customer" }));
    expect(
      screen.getByRole("combobox", { name: "Search customers" }),
    ).toBeInTheDocument();
  });

  it("uses server results without client-side filtering", () => {
    const source = readFileSync(path.join(__dirname, "CustomerPicker.tsx"), "utf8");
    const dialogSource = readFileSync(
      path.join(__dirname, "MachineFormDialog.tsx"),
      "utf8",
    );
    expect(source).toContain("/api/admin/customer-picker?");
    expect(source).not.toContain("customers.filter(");
    expect(source).not.toContain("<CommandInput");
    expect(dialogSource).not.toContain("filteredCustomers");
    expect(dialogSource).not.toContain("customers: AuthUser[]");
  });
});
