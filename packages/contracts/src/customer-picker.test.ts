import { describe, expect, it } from "vitest";
import {
  CUSTOMER_PICKER_PAGE_SIZE_DEFAULT,
  CUSTOMER_PICKER_PAGE_SIZE_MAX,
  customerPickerQuerySchema,
  customerPickerResponseSchema,
} from "./index";

describe("customer picker contracts", () => {
  it("requires at least two search characters or an exact customer id", () => {
    expect(customerPickerQuerySchema.safeParse({}).success).toBe(false);
    expect(customerPickerQuerySchema.safeParse({ search: "k" }).success).toBe(false);
    expect(customerPickerQuerySchema.safeParse({ search: "ku" }).success).toBe(true);
    expect(
      customerPickerQuerySchema.safeParse({
        customerId: "00000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("defaults and caps the page size", () => {
    expect(customerPickerQuerySchema.parse({ search: "ku" }).limit).toBe(
      CUSTOMER_PICKER_PAGE_SIZE_DEFAULT,
    );
    expect(
      customerPickerQuerySchema.safeParse({
        search: "ku",
        limit: CUSTOMER_PICKER_PAGE_SIZE_MAX + 1,
      }).success,
    ).toBe(false);
  });

  it("returns only the compact picker projection", () => {
    const parsed = customerPickerResponseSchema.parse({
      customers: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          displayName: "Kush Ahir",
          email: "kush@example.com",
          companyName: "VJ Enterprise",
          approvalStatus: "approved",
          profileCompleted: true,
          contactPhone: "not part of the response",
        },
      ],
      nextCursor: null,
    });

    expect(parsed.customers[0]).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      displayName: "Kush Ahir",
      email: "kush@example.com",
      companyName: "VJ Enterprise",
      approvalStatus: "approved",
      profileCompleted: true,
    });
  });
});
