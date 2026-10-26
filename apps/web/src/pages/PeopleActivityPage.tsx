import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type {
  ActivityPeopleResponse,
  ActivityPersonRow,
  ApprovalStatus,
  Role,
} from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { PAGE_CONTAINER } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import {
  currentWorkTone,
  describeCurrentWork,
  formatRelative,
  personName,
} from "@/lib/activity";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ApprovalBadge,
  RoleBadge,
  SkeletonRows,
  TableMessage,
  TableShell,
  Td,
  Th,
} from "@/components/activity/entities";

type RoleFilter = "all" | Role;
type StatusFilter = "all" | ApprovalStatus;
type WorkFilter = "all" | "active_work" | "has_open" | "recently_active";

const ROLE_FILTERS: Array<{ value: RoleFilter; label: string }> = [
  { value: "all", label: "All roles" },
  { value: "engineer", label: "Engineer" },
  { value: "support", label: "Support" },
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "customer", label: "Customer" },
];

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "approved", label: "Approved" },
  { value: "pending_approval", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

const WORK_FILTERS: Array<{ value: WorkFilter; label: string }> = [
  { value: "all", label: "Everyone" },
  { value: "active_work", label: "Active work" },
  { value: "has_open", label: "Has open" },
  { value: "recently_active", label: "Recently active" },
];

const COLUMN_COUNT = 9;
const PEOPLE_PAGE_SIZE = 10;

/* Proportional widths on a fixed layout: headers stay locked to the cells
 * beneath them (which `table-auto` failed to do), while the table still fits
 * the content area at any sidebar state instead of overflowing it. `min-w`
 * only kicks in on genuinely narrow viewports, where scrolling is correct. */
const COLUMNS = [
  "w-[20%]", // User
  "w-[8%]", // Role
  "w-[9%]", // Status
  "w-[16%]", // Current work
  "w-[6%]", // Open
  "w-[8%]", // Completed
  "w-[12%]", // Last recorded activity
  "w-[9%]", // Last seen
  "w-[12%]", // Action
];

/**
 * Filter dropdown. The native select chevron sits hard against the border with
 * no padding and each control self-sizes to its longest option, so the row
 * looked ragged. `appearance-none` plus our own icon gives consistent gutters,
 * and a shared width keeps the three controls aligned.
 */
function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="relative w-full sm:w-[168px]">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn(
          "lp-field h-10 w-full cursor-pointer appearance-none rounded-md border",
          // Room on the right so no option text ever runs under the chevron.
          "pl-3 pr-9 text-sm",
        )}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]"
      />
    </div>
  );
}

function CurrentWorkCell({ person }: { person: ActivityPersonRow }) {
  const state =
    person.role === "admin" &&
    (person.state === "suspended" ||
      person.state === "pending_approval" ||
      person.state === "rejected")
      ? "no_active_work"
      : person.state;
  const tone = currentWorkTone(state);
  return (
    <span
      className={cn(
        "text-[13px]",
        tone === "active" && "font-medium text-[var(--lp-ink)]",
        tone === "waiting" && "text-amber-700 dark:text-amber-300",
        tone === "blocked" && "text-[var(--lp-faint)]",
        tone === "idle" && "text-[var(--lp-faint)]",
      )}
    >
      {describeCurrentWork(state, person.stateCount ?? 0)}
    </span>
  );
}

const PeopleActivityPage = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [workFilter, setWorkFilter] = useState<WorkFilter>("all");
  const [page, setPage] = useState(0);

  // Debounce so typing feels instant without a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (workFilter !== "all") params.set("filter", workFilter);
    params.set("limit", String(PEOPLE_PAGE_SIZE));
    params.set("offset", String(page * PEOPLE_PAGE_SIZE));
    return params.toString();
  }, [search, roleFilter, statusFilter, workFilter, page]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["activity-people", queryString],
    queryFn: () => apiRequest<ActivityPeopleResponse>(`/api/activity/people?${queryString}`),
    placeholderData: keepPreviousData,
  });

  const people = data?.people ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PEOPLE_PAGE_SIZE));
  const emptyPersonSlots =
    pageCount > 1 && people.length > 0 ? Math.max(0, PEOPLE_PAGE_SIZE - people.length) : 0;
  const hasFilters =
    search.length > 0 || roleFilter !== "all" || statusFilter !== "all" || workFilter !== "all";

  useEffect(() => {
    if (page >= pageCount) setPage(pageCount - 1);
  }, [page, pageCount]);

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setWorkFilter("all");
    setPage(0);
  }

  const summary = data?.summary;

  return (
    <div className={PAGE_CONTAINER}>
      <PageHeader
        icon={Activity}
        title="People Activity"
        description="Everyone on the platform, what they are working on, and their recorded service actions."
      />

      {/* Compact person-focused summary — one row, no dashboard cards. */}
      {summary && (
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 px-4 py-3">
          {[
            { label: "Total people", value: summary.totalPeople },
            { label: "Active engineers", value: summary.activeEngineers },
            { label: "Active support", value: summary.activeSupport },
            { label: "People with work", value: summary.withOpenWork },
            { label: "Recently active", value: summary.recentlyActive },
          ].map((item) => (
            <div key={item.label} className="flex items-baseline gap-2">
              <dt className="lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                {item.label}
              </dt>
              <dd className="lp-display text-base font-bold text-[var(--lp-ink)]">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Search + filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]"
            aria-hidden="true"
          />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, email, role, or company…"
            aria-label="Search people"
            className="lp-field pl-9"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <FilterSelect
            label="Filter by role"
            value={roleFilter}
            options={ROLE_FILTERS}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filter by account status"
            value={statusFilter}
            options={STATUS_FILTERS}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(0);
            }}
          />
          <FilterSelect
            label="Filter by work"
            value={workFilter}
            options={WORK_FILTERS}
            onChange={(value) => {
              setWorkFilter(value);
              setPage(0);
            }}
          />
        </div>
      </div>

      <TableShell>
        <table className="w-full min-w-[880px] table-fixed text-sm">
          <colgroup>
            {COLUMNS.map((width, index) => (
              <col key={index} className={width} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--lp-line)]">
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Current Work</Th>
              <Th className="text-right">Open</Th>
              <Th className="text-right">Completed</Th>
              <Th>Last Recorded Activity</Th>
              <Th>Last Seen</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows colSpan={COLUMN_COUNT} />}

            {isError && !isLoading && (
              <TableMessage colSpan={COLUMN_COUNT} tone="error">
                <p className="font-medium">Could not load people activity.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-2 rounded-md border border-[var(--lp-line-strong)] px-3 py-1.5 text-xs font-medium text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]"
                >
                  Retry
                </button>
              </TableMessage>
            )}

            {!isLoading && !isError && people.length === 0 && (
              <TableMessage colSpan={COLUMN_COUNT}>
                {hasFilters ? (
                  <>
                    <p className="font-medium text-[var(--lp-ink)]">No people match these filters.</p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-2 rounded-md border border-[var(--lp-line-strong)] px-3 py-1.5 text-xs font-medium text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]"
                    >
                      Clear filters
                    </button>
                  </>
                ) : (
                  <p className="font-medium text-[var(--lp-ink)]">No people on the platform yet.</p>
                )}
              </TableMessage>
            )}

            {!isLoading &&
              !isError &&
              people.map((person) => (
                <tr
                  key={person.id}
                  onClick={() => navigate(`/app/activity/${person.id}`)}
                  className="h-[72px] cursor-pointer border-b border-[var(--lp-line)] transition-colors last:border-0 hover:bg-[var(--lp-panel-2)]/50"
                >
                  <Td>
                    <div className="min-w-0">
                      <Link
                        to={`/app/activity/${person.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="block truncate rounded-sm font-medium text-[var(--lp-ink)] underline-offset-2 hover:text-[var(--lp-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
                      >
                        {personName(person.displayName)}
                      </Link>
                      <p className="truncate text-xs text-[var(--lp-faint)]">{person.email}</p>
                      {person.companyName && (
                        <p className="truncate text-xs text-[var(--lp-faint)]">
                          {person.companyName}
                        </p>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <RoleBadge role={person.role} />
                  </Td>
                  <Td>
                    {person.approvalStatus ? (
                      <ApprovalBadge status={person.approvalStatus} />
                    ) : (
                      <span
                        aria-label="Account status not applicable"
                        className="text-[var(--lp-faint)]"
                      >
                        —
                      </span>
                    )}
                  </Td>
                  <Td>
                    <CurrentWorkCell person={person} />
                  </Td>
                  <Td className="text-right tabular-nums text-[var(--lp-ink-soft)]">
                    {person.open}
                  </Td>
                  <Td className="text-right tabular-nums text-[var(--lp-ink-soft)]">
                    {person.completed}
                  </Td>
                  <Td className="text-xs text-[var(--lp-faint)]">
                    {person.lastRecordedActivityAt
                      ? formatRelative(person.lastRecordedActivityAt)
                      : "No recorded actions"}
                  </Td>
                  <Td className="text-xs text-[var(--lp-faint)]">
                    {formatRelative(person.lastSeenAt)}
                  </Td>
                  <Td className="text-right">
                    <Link
                      to={`/app/activity/${person.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="inline-flex whitespace-nowrap rounded-md border border-[var(--lp-line-strong)] px-2.5 py-1 text-xs font-medium text-[var(--lp-ink-soft)] transition-colors hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
                    >
                      View activity
                    </Link>
                  </Td>
                </tr>
              ))}

            {!isLoading &&
              !isError &&
              Array.from({ length: emptyPersonSlots }, (_, index) => (
                <tr
                  key={`person-empty-row-${index}`}
                  aria-hidden="true"
                  className="h-[72px] border-b border-[var(--lp-line)] last:border-0"
                >
                  <td colSpan={COLUMN_COUNT} />
                </tr>
              ))}
          </tbody>
        </table>
      </TableShell>

      {!isLoading && !isError && pageCount > 1 && (
        <nav aria-label="People pagination" className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous people page"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="h-8 w-8 rounded-full"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next people page"
            onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
            disabled={page >= pageCount - 1}
            className="h-8 w-8 rounded-full"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
};

export default PeopleActivityPage;
