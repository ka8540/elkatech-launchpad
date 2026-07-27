import { describe, expect, it } from "vitest";
import {
  CUSTOMER_PROFILE_PAGE_SIZE,
  customerProfilePage,
} from "./customer-profile-pagination";

describe("customer profile list pagination", () => {
  it("shows at most five records on a page", () => {
    const records = Array.from({ length: 11 }, (_, index) => index + 1);
    expect(CUSTOMER_PROFILE_PAGE_SIZE).toBe(5);
    expect(customerProfilePage(records, 0).items).toEqual([1, 2, 3, 4, 5]);
    expect(customerProfilePage(records, 1).items).toEqual([6, 7, 8, 9, 10]);
  });

  it("keeps the final page at five row slots", () => {
    const finalPage = customerProfilePage([1, 2, 3, 4, 5, 6], 1);
    expect(finalPage.items).toEqual([6]);
    expect(finalPage.emptySlots).toBe(4);
    expect(finalPage.pageCount).toBe(2);
  });

  it("clamps a stale page after the machine count shrinks", () => {
    const page = customerProfilePage([1, 2, 3], 3);
    expect(page.page).toBe(0);
    expect(page.items).toEqual([1, 2, 3]);
    expect(page.emptySlots).toBe(0);
  });
});
