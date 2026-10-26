import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser, CustomerProfile } from "@elkatech/contracts";

const apiRequest = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({
  apiRequest,
  ApiError: class ApiError extends Error {},
}));
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: vi.fn() },
}));

const { default: EditUserDetailsDialog } = await import(
  "./EditUserDetailsDialog"
);

const CUSTOMER: AuthUser = {
  id: "00000000-0000-4000-8000-000000000001",
  displayName: "Kush Jayesh Ahir",
  email: "kush@example.com",
  role: "customer",
  emailVerified: true,
  approvalStatus: "approved",
  accountOrigin: "firebase_google",
  profileCompleted: true,
  createdAt: "2026-06-10T00:00:00.000Z",
};

const PROFILE: CustomerProfile = {
  displayName: CUSTOMER.displayName,
  companyName: "ABCD",
  contactPhone: "+18980387432",
  alternatePhone: "",
  addressLine1: "E/303 Vandematram Prime Gota",
  addressLine2: "",
  city: "Ahmedabad",
  state: "Gujarat",
  postalCode: "382481",
  country: "India",
  profileCompleted: true,
  profileCompletedAt: "2026-06-10T00:00:00.000Z",
};

function renderDialog({
  onSaved = vi.fn(),
  onOpenChange = vi.fn(),
}: {
  onSaved?: ReturnType<typeof vi.fn>;
  onOpenChange?: ReturnType<typeof vi.fn>;
} = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <EditUserDetailsDialog
        user={CUSTOMER}
        open
        onOpenChange={onOpenChange}
        onSaved={onSaved}
      />
    </QueryClientProvider>,
  );
  return { onSaved, onOpenChange };
}

beforeEach(() => {
  apiRequest.mockReset();
  toastSuccess.mockReset();
  apiRequest.mockResolvedValue({ user: CUSTOMER, profile: PROFILE });
});

afterEach(cleanup);

describe("EditUserDetailsDialog", () => {
  it("loads the current profile and saves only changed details", async () => {
    const { onSaved, onOpenChange } = renderDialog();

    expect(await screen.findByLabelText("Full name*")).toHaveValue(
      CUSTOMER.displayName,
    );
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Company / workshop*")).toHaveValue("ABCD");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Company / workshop*"), {
      target: { value: "ElkaTech Workshop" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(
        apiRequest.mock.calls.some(
          ([url, options]) =>
            url === `/api/admin/users/${CUSTOMER.id}/profile` &&
            options?.method === "PATCH" &&
            JSON.parse(String(options.body)).companyName ===
              "ElkaTech Workshop",
        ),
      ).toBe(true),
    );
    expect(onSaved).toHaveBeenCalledWith({ user: CUSTOMER, profile: PROFILE });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toastSuccess).toHaveBeenCalledWith("User details updated.");
  });

  it("cancels without making an update request", async () => {
    const { onOpenChange } = renderDialog();
    await screen.findByLabelText("Full name*");

    fireEvent.change(screen.getByLabelText("Full name*"), {
      target: { value: "Changed Name" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(
      apiRequest.mock.calls.filter(([, options]) => options?.method === "PATCH"),
    ).toHaveLength(0);
  });
});
