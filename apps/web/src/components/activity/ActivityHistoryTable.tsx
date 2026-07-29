import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ActivityEventPage } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { describeEvent, formatDateTime } from "@/lib/activity";
import TableSearch from "@/components/activity/TableSearch";
import { Button } from "@/components/ui/button";
import {
  RequestLink,
  RoleBadge,
  RequestStatusBadge,
  SkeletonRows,
  TableMessage,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/activity/entities";

const COLUMN_COUNT = 8;
const HISTORY_PAGE_SIZE = 5;

/* Fixed column widths keep the header and body cells in the same grid — with
 * `table-auto` the browser re-flowed columns per page of data, so headers
 * drifted away from the values underneath them. */
const COLUMNS = [
  "w-[14%]", // Time
  "w-[22%]", // Action
  "w-[11%]", // Recorded role
  "w-[17%]", // Request
  "w-[10%]", // Previous
  "w-[10%]", // New
  "w-[9%]", // Status
  "w-[7%]", // Open
];

/**
 * Chronological log of actions this person performed. Read-only by design:
 * history is never editable, and corrections are made by performing a new
 * action through the normal workflow.
 *
 * `eventTypes` narrows the feed for the role-specific tabs (assignments,
 * messages, …) using the same backend filter.
 */
export default function ActivityHistoryTable({
  userId,
  eventTypes,
  emptyMessage = "No recorded actions yet.",
}: {
  userId: string;
  eventTypes?: string[];
  emptyMessage?: string;
}) {
  const typesKey = eventTypes?.join(",") ?? "";
  const [pageIndex, setPageIndex] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPageIndex(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["activity-history", userId, typesKey, search],
      initialPageParam: null as string | null,
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams({ limit: String(HISTORY_PAGE_SIZE) });
        if (pageParam) params.set("cursor", pageParam);
        if (typesKey) params.set("eventTypes", typesKey);
        if (search) params.set("search", search);
        return apiRequest<ActivityEventPage>(
          `/api/activity/people/${userId}/history?${params.toString()}`,
        );
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const pages = data?.pages ?? [];
  const visiblePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const events = pages[visiblePageIndex]?.events ?? [];
  const hasLoadedNextPage = visiblePageIndex < pages.length - 1;
  const canGoNext = hasLoadedNextPage || Boolean(hasNextPage);
  const showPagination = pages.length > 1 || Boolean(hasNextPage);
  const emptySlots =
    showPagination && events.length > 0 ? Math.max(0, HISTORY_PAGE_SIZE - events.length) : 0;

  async function goToNextPage() {
    if (hasLoadedNextPage) {
      setPageIndex(visiblePageIndex + 1);
      return;
    }
    if (!hasNextPage) return;

    const result = await fetchNextPage();
    if (result.data?.pages[visiblePageIndex + 1]) {
      setPageIndex(visiblePageIndex + 1);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <TableSearch
          value={searchInput}
          onChange={setSearchInput}
          label="Search activity history"
          placeholder="Search activity history…"
        />
      </div>

      <TableShell>
        <table className="w-full min-w-[960px] table-fixed text-sm">
          <colgroup>
            {COLUMNS.map((width, index) => (
              <col key={index} className={width} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--lp-line)]">
              <Th>Time</Th>
              <Th>Action</Th>
              <Th>Recorded Role</Th>
              <Th>Request</Th>
              <Th>Previous</Th>
              <Th>New</Th>
              <Th>Status</Th>
              <Th className="text-right">Open</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows colSpan={COLUMN_COUNT} />}

            {isError && !isLoading && (
              <TableMessage colSpan={COLUMN_COUNT} tone="error">
                <p className="font-medium">Could not load activity history.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 rounded-md border border-[var(--lp-line-strong)] px-3 py-1.5 text-xs font-medium text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50"
                >
                  Retry
                </button>
              </TableMessage>
            )}

            {!isLoading && !isError && events.length === 0 && (
              <TableMessage colSpan={COLUMN_COUNT}>
                {search ? "No activity matches this search." : emptyMessage}
              </TableMessage>
            )}

            {events.map((event) => {
              const described = describeEvent(event);
              return (
                <Tr key={event.id} className="h-[72px]">
                  <Td className="text-xs text-[var(--lp-faint)]">
                    {formatDateTime(event.occurredAt)}
                  </Td>
                  <Td className="text-[var(--lp-ink)]">{described.label}</Td>
                  <Td>
                    {/* Role captured when the action happened — not the
                        person's role today. */}
                    <RoleBadge role={event.recordedRole} muted />
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      {event.request ? (
                        <>
                          <RequestLink id={event.request.id} label={event.request.requestNumber} />
                          <p className="truncate text-xs text-[var(--lp-faint)]">
                            {event.request.subject}
                          </p>
                        </>
                      ) : (
                        <span className="text-[var(--lp-faint)]">—</span>
                      )}
                    </div>
                  </Td>
                  <Td className="truncate text-[var(--lp-ink-soft)]">
                    {described.previous ?? <span className="text-[var(--lp-faint)]">—</span>}
                  </Td>
                  <Td className="truncate text-[var(--lp-ink-soft)]">
                    {described.next ?? <span className="text-[var(--lp-faint)]">—</span>}
                  </Td>
                  <Td>
                    {event.request ? (
                      <RequestStatusBadge status={event.request.status} />
                    ) : (
                      <span className="text-[var(--lp-faint)]">—</span>
                    )}
                  </Td>
                  <Td className="text-right">
                    {event.request ? (
                      <RequestLink
                        id={event.request.id}
                        label="Open"
                        className="whitespace-nowrap"
                      />
                    ) : (
                      <span className="text-[var(--lp-faint)]">—</span>
                    )}
                  </Td>
                </Tr>
              );
            })}

            {!isLoading &&
              !isError &&
              Array.from({ length: emptySlots }, (_, index) => (
                <tr
                  key={`history-empty-row-${index}`}
                  aria-hidden="true"
                  className="h-[72px] border-b border-[var(--lp-line)] last:border-0"
                >
                  <td colSpan={COLUMN_COUNT} />
                </tr>
              ))}
          </tbody>
        </table>
      </TableShell>

      {showPagination && (
        <nav aria-label="Activity history pagination" className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous activity history page"
            disabled={visiblePageIndex === 0}
            onClick={() => setPageIndex((current) => Math.max(0, current - 1))}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next activity history page"
            disabled={!canGoNext || isFetchingNextPage}
            onClick={() => void goToNextPage()}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
