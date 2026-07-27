export const CUSTOMER_PROFILE_PAGE_SIZE = 5;

export type CustomerProfilePage<T> = {
  items: T[];
  page: number;
  pageCount: number;
  emptySlots: number;
};

/** Return one bounded page and the blank slots needed to keep page height stable. */
export function customerProfilePage<T>(
  items: T[],
  requestedPage: number,
): CustomerProfilePage<T> {
  const pageCount = Math.max(
    1,
    Math.ceil(items.length / CUSTOMER_PROFILE_PAGE_SIZE),
  );
  const page = Math.min(Math.max(0, requestedPage), pageCount - 1);
  const start = page * CUSTOMER_PROFILE_PAGE_SIZE;
  const visibleItems = items.slice(start, start + CUSTOMER_PROFILE_PAGE_SIZE);

  return {
    items: visibleItems,
    page,
    pageCount,
    emptySlots:
      pageCount > 1
        ? CUSTOMER_PROFILE_PAGE_SIZE - visibleItems.length
        : 0,
  };
}
