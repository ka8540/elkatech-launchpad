import { useEffect, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ActivityTask, ActivityTaskPage } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/activity";
import AssignEngineerDialog from "@/components/activity/AssignEngineerDialog";
import TableSearch from "@/components/activity/TableSearch";
import { Button } from "@/components/ui/button";
import {
  MachineLink,
  PersonLink,
  PriorityBadge,
  RequestLink,
  RequestStatusBadge,
  SkeletonRows,
  TableMessage,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/activity/entities";

export type TaskBucket = "active" | "waiting" | "completed";

const BUCKETS: Array<{ value: TaskBucket; label: string }> = [
  { value: "active", label: "Active" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
];

const TASK_PAGE_SIZE = 5;

/* Fixed widths per view so headers stay locked to the cells beneath them
 * instead of re-flowing with each page of data. */
const ENGINEER_COLUMNS = [
  "w-[16%]", // Request
  "w-[11%]", // Issue
  "w-[12%]", // Customer
  "w-[11%]", // Machine
  "w-[8%]", // Priority
  "w-[9%]", // Status
  "w-[9%]", // Assigned at
  "w-[10%]", // Last activity
  "w-[5%]", // Age
  "w-[9%]", // Action
];

const CUSTOMER_COLUMNS = [
  "w-[19%]", // Request
  "w-[13%]", // Issue
  "w-[13%]", // Machine
  "w-[9%]", // Priority
  "w-[10%]", // Status
  "w-[14%]", // Engineer
  "w-[11%]", // Created
  "w-[11%]", // Last activity
];

/**
 * The person's request workload. `rel` picks the relationship: an engineer's
 * assigned queue, or a customer's own requests — which changes the columns
 * that make sense.
 */
export default function TaskTable({
  userId,
  rel,
  canAssign,
  canViewMachines,
}: {
  userId: string;
  rel: "engineer" | "customer";
  canAssign: boolean;
  canViewMachines: boolean;
}) {
  const [bucket, setBucket] = useState<TaskBucket>("active");
  const [pageIndex, setPageIndex] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState<ActivityTask | null>(null);

  const isEngineerView = rel === "engineer";
  const columnCount = isEngineerView ? 10 : 8;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPageIndex(0);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["activity-tasks", userId, rel, bucket, search],
      initialPageParam: null as string | null,
      queryFn: ({ pageParam }) => {
        const params = new URLSearchParams({ rel, bucket, limit: String(TASK_PAGE_SIZE) });
        if (pageParam) params.set("cursor", pageParam);
        if (search) params.set("search", search);
        return apiRequest<ActivityTaskPage>(
          `/api/activity/people/${userId}/tasks?${params.toString()}`,
        );
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const pages = data?.pages ?? [];
  const visiblePageIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const tasks = pages[visiblePageIndex]?.tasks ?? [];
  const hasLoadedNextPage = visiblePageIndex < pages.length - 1;
  const canGoNext = hasLoadedNextPage || Boolean(hasNextPage);
  const showPagination = pages.length > 1 || Boolean(hasNextPage);
  const emptySlots =
    showPagination && tasks.length > 0 ? Math.max(0, TASK_PAGE_SIZE - tasks.length) : 0;

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter tasks">
          {BUCKETS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setBucket(option.value);
                setPageIndex(0);
              }}
              aria-pressed={bucket === option.value}
              className={cn(
                "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45",
                bucket === option.value
                  ? "border-[var(--lp-accent)]/50 bg-[var(--lp-accent)]/12 text-[var(--lp-accent)]"
                  : "border-[var(--lp-line)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-line-strong)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <TableSearch
          value={searchInput}
          onChange={setSearchInput}
          label="Search requests"
          placeholder="Search requests…"
        />
      </div>

      <TableShell>
        <table
          className={cn(
            "w-full table-fixed text-sm",
            isEngineerView ? "min-w-[1120px]" : "min-w-[940px]",
          )}
        >
          <colgroup>
            {(isEngineerView ? ENGINEER_COLUMNS : CUSTOMER_COLUMNS).map((width, index) => (
              <col key={index} className={width} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--lp-line)]">
              <Th>Request</Th>
              <Th>Issue</Th>
              {isEngineerView && <Th>Customer</Th>}
              <Th>Machine</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              {isEngineerView ? <Th>Assigned At</Th> : <Th>Engineer</Th>}
              {!isEngineerView && <Th>Created</Th>}
              <Th>Last Activity</Th>
              {isEngineerView && <Th className="text-right">Age</Th>}
              {isEngineerView && <Th className="text-right">Action</Th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows colSpan={columnCount} />}

            {isError && !isLoading && (
              <TableMessage colSpan={columnCount} tone="error">
                <p className="font-medium">Could not load this workload.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 rounded-md border border-[var(--lp-line-strong)] px-3 py-1.5 text-xs font-medium text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50"
                >
                  Retry
                </button>
              </TableMessage>
            )}

            {!isLoading && !isError && tasks.length === 0 && (
              <TableMessage colSpan={columnCount}>
                {search
                  ? "No requests match this search."
                  : bucket === "active"
                    ? "No active work."
                    : bucket === "waiting"
                      ? "Nothing waiting on a customer."
                      : "Nothing completed yet."}
              </TableMessage>
            )}

            {tasks.map((task) => (
              <Tr key={task.id} className="h-[72px]">
                <Td>
                  <div className="min-w-0">
                    <RequestLink id={task.id} label={task.requestNumber} />
                    <p className="truncate text-xs text-[var(--lp-faint)]">{task.subject}</p>
                  </div>
                </Td>
                <Td className="truncate capitalize text-[var(--lp-ink-soft)]">
                  {task.issueType ? task.issueType.replaceAll("_", " ") : "—"}
                </Td>
                {isEngineerView && (
                  <Td className="truncate">
                    <PersonLink id={task.customerId} name={task.customerName} />
                  </Td>
                )}
                <Td className="truncate">
                  <MachineLink
                    customerId={task.customerId}
                    label={task.machineLabel}
                    canView={canViewMachines}
                  />
                </Td>
                <Td>
                  <PriorityBadge priority={task.priority} />
                </Td>
                <Td>
                  <RequestStatusBadge status={task.status} />
                </Td>
                {isEngineerView ? (
                  <Td className="text-xs text-[var(--lp-faint)]">
                    {task.assignedAt ? formatDate(task.assignedAt) : "Not recorded"}
                  </Td>
                ) : (
                  <Td className="truncate">
                    {task.assignedEngineerId ? (
                      <PersonLink id={task.assignedEngineerId} name={task.assignedEngineerName} />
                    ) : (
                      <span className="text-xs text-[var(--lp-faint)]">Unassigned</span>
                    )}
                  </Td>
                )}
                {!isEngineerView && (
                  <Td className="text-xs text-[var(--lp-faint)]">
                    {formatDate(task.createdAt)}
                  </Td>
                )}
                <Td className="text-xs text-[var(--lp-faint)]">
                  {formatRelative(task.lastActivityAt)}
                  {task.stale && (
                    <span className="ml-1.5 rounded-full border border-amber-400/35 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">
                      Stale
                    </span>
                  )}
                </Td>
                {isEngineerView && (
                  <Td className="text-right tabular-nums text-xs text-[var(--lp-faint)]">
                    {task.ageDays}d
                  </Td>
                )}
                {isEngineerView && (
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <RequestLink id={task.id} label="Open" className="whitespace-nowrap" />
                      {canAssign && (
                        <button
                          type="button"
                          onClick={() => setAssigning(task)}
                          className="whitespace-nowrap rounded-md border border-[var(--lp-line-strong)] px-2.5 py-1 text-xs font-medium text-[var(--lp-ink-soft)] transition-colors hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
                        >
                          Reassign
                        </button>
                      )}
                    </div>
                  </Td>
                )}
              </Tr>
            ))}

            {!isLoading &&
              !isError &&
              Array.from({ length: emptySlots }, (_, index) => (
                <tr
                  key={`task-empty-row-${index}`}
                  aria-hidden="true"
                  className="h-[72px] border-b border-[var(--lp-line)] last:border-0"
                >
                  <td colSpan={columnCount} />
                </tr>
              ))}
          </tbody>
        </table>
      </TableShell>

      {showPagination && (
        <nav aria-label="Tasks pagination" className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous tasks page"
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
            aria-label="Next tasks page"
            disabled={!canGoNext || isFetchingNextPage}
            onClick={() => void goToNextPage()}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </nav>
      )}

      {assigning && (
        <AssignEngineerDialog
          requestId={assigning.id}
          requestNumber={assigning.requestNumber}
          subject={assigning.subject}
          currentEngineerId={assigning.assignedEngineerId}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
}
