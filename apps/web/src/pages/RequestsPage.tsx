import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { RequestStatusGroup, ServiceRequest } from "@elkatech/contracts";
import { useSession } from "@/hooks/use-session";
import { apiRequest } from "@/lib/api";
import {
  getRequestStatusGroup,
  getRequestStatusLabel,
  REQUEST_STATUS_BADGE_CLASSES,
} from "@/lib/request-status";
import VerifyEmailNotice from "@/components/VerifyEmailNotice";
import { ApprovalStateCard, isCustomerActionBlocked } from "@/components/ApprovalState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  Archive,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Inbox,
  LifeBuoy,
  Package2,
  Plus,
  RefreshCw,
  Search,
  Wrench,
} from "lucide-react";

type DashboardFilter = Extract<
  RequestStatusGroup,
  "all" | "open" | "in_progress" | "resolved" | "archived"
>;

const dashboardFilters: Array<{
  value: DashboardFilter;
  label: string;
  description: string;
}> = [
  {
    value: "all",
    label: "All",
    description: "Active service requests across open, in-progress, pending, and resolved states.",
  },
  {
    value: "open",
    label: "Open",
    description: "New and triaged service requests waiting for the next action.",
  },
  {
    value: "in_progress",
    label: "In Progress",
    description: "Assigned, active, or waiting service requests being handled by the team.",
  },
  {
    value: "resolved",
    label: "Resolved",
    description: "Finished service requests that remain visible in the active dashboard.",
  },
  {
    value: "archived",
    label: "Archived",
    description: "Cancelled or archived service requests kept for history.",
  },
];

function normalizeDashboardFilter(value: string | null): DashboardFilter {
  return dashboardFilters.some((filter) => filter.value === value)
    ? (value as DashboardFilter)
    : "all";
}

function matchesDashboardFilter(request: ServiceRequest, filter: DashboardFilter) {
  if (filter === "all") return request.status !== "closed";
  if (filter === "archived") return request.status === "closed";
  if (filter === "resolved") return request.status === "resolved";
  if (filter === "open") {
    return request.status === "new" || request.status === "triaged";
  }
  return (
    request.status === "assigned" ||
    request.status === "in_progress" ||
    request.status === "waiting_for_customer"
  );
}

/* ─── helper: format date ──────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─── Priority badge ───────────────────────────────────────────────────────── */
const priorityColors: Record<string, string> = {
  low: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
  normal: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  high: "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  urgent: "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300",
};

/* ─── Skeleton shimmer ─────────────────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[var(--lp-panel-2)]",
        className,
      )}
    />
  );
}

/* ─── Matte card surface (shared utility — see index.css `.lp-card`) ──────── */
const cardSurface = "lp-card border";

/* ─── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({
  label,
  count,
  icon: Icon,
  accent,
  active = false,
  onClick,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "copper" | "emerald" | "amber" | "steel";
  active?: boolean;
  onClick?: () => void;
}) {
  const badgeMap = {
    copper: "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
    steel: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl p-4 text-left transition-colors duration-150",
        cardSurface,
        "hover:border-[var(--lp-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/35",
        active && "border-[var(--lp-accent)]/55 bg-[var(--lp-accent)]/[0.08]",
      )}
    >
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="lp-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--lp-faint)]">
            {label}
          </p>
          <p className="lp-display mt-1.5 text-3xl font-bold text-[var(--lp-ink)]">
            {count}
          </p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            badgeMap[accent],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </button>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* Header skeleton */}
      <div className={cn("rounded-2xl p-5 sm:p-6", cardSurface)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-3.5 w-80" />
          </div>
          <Skeleton className="h-10 w-44 rounded-full" />
        </div>
      </div>

      {/* Stat skeletons */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-xl" />
        ))}
      </div>

      {/* Filter skeleton */}
      <Skeleton className="h-[52px] rounded-xl" />

      {/* List skeletons */}
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/* ─── Premium empty state ──────────────────────────────────────────────────── */
function EmptyState({
  title = "No service requests yet",
  description = "Create your first request to get support for a machine, installation, maintenance, or troubleshooting issue.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl", cardSurface)}>
      {/* Very subtle blueprint grid only — no copper glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.22]"
        style={{
          maskImage: "radial-gradient(ellipse at 50% 35%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 35%, black 30%, transparent 80%)",
        }}
      />

      <div className="relative flex flex-col items-center px-6 py-10 text-center">
        {/* Icon cluster */}
        <div className="relative mb-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div className="absolute -right-2 -top-1.5 flex h-7 w-7 items-center justify-center rounded-xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink-soft)]">
            <Wrench className="h-3.5 w-3.5" />
          </div>
          <div className="absolute -bottom-1 -left-2 flex h-6 w-6 items-center justify-center rounded-lg border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-faint)]">
            <LifeBuoy className="h-3 w-3" />
          </div>
        </div>

        <h3 className="lp-display text-xl font-semibold text-[var(--lp-ink)]">{title}</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--lp-ink-soft)]">
          {description}
        </p>

        <div className="mt-6 flex flex-col items-center gap-2.5 sm:flex-row">
          <Button
            asChild
            className="h-10 rounded-full bg-[var(--lp-accent)] px-5 font-semibold text-[#fbfaf6] transition-colors hover:bg-[var(--lp-accent-2)]"
          >
            <Link to="/app/requests/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Service Request
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-10 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-5 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
          >
            <Link to="/">
              <Package2 className="mr-1.5 h-4 w-4" />
              Browse Products
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Request row card ─────────────────────────────────────────────────────── */
function RequestCard({ request }: { request: ServiceRequest }) {
  return (
    <Link
      to={`/app/requests/${request.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl p-5 transition-colors duration-150",
        cardSurface,
        "hover:border-[var(--lp-accent)]/45",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="lp-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
              {request.requestNumber}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                REQUEST_STATUS_BADGE_CLASSES[request.status] ??
                  "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
              )}
            >
              {getRequestStatusLabel(request.status)}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                priorityColors[request.priority] ?? "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
              )}
            >
              {request.priority}
            </span>
          </div>
          <h3 className="truncate lp-display text-[15px] font-semibold text-[var(--lp-ink)]">
            {request.subject}
          </h3>
          {request.productSnapshot?.name && (
            <p className="mt-1 text-xs text-[var(--lp-faint)]">
              {request.productSnapshot.name}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          <p className="text-xs text-[var(--lp-faint)]">
            {fmtDate((request as unknown as Record<string, string>)["updatedAt"] ?? (request as unknown as Record<string, string>)["createdAt"] ?? "")}
          </p>
          <span className="flex items-center gap-1 text-xs font-medium text-[var(--lp-faint)] transition-colors group-hover:text-[var(--lp-accent)]">
            View conversation
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Error state ──────────────────────────────────────────────────────────── */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-rose-400/30 bg-rose-500/[0.07] px-6 py-12 text-center">
      <AlertCircle className="mb-4 h-10 w-10 text-rose-500 dark:text-rose-400" />
      <h3 className="lp-display text-lg font-semibold text-[var(--lp-ink)]">
        Could not load service requests
      </h3>
      <p className="mt-2 text-sm text-[var(--lp-ink-soft)]">Please try again.</p>
      <Button
        variant="outline"
        className="mt-6 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/60 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
const RequestsPage = () => {
  const { data: session } = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const activeFilter = normalizeDashboardFilter(searchParams.get("status"));
  const filterMeta =
    dashboardFilters.find((filter) => filter.value === activeFilter) ??
    dashboardFilters[0];

  const { data: activeData, isLoading, isError, refetch } = useQuery({
    queryKey: ["requests", "active"],
    queryFn: () => apiRequest<ServiceRequest[]>("/api/requests?statusGroup=all"),
  });
  const {
    data: archivedData,
    isLoading: isArchivedLoading,
    isError: isArchivedError,
    refetch: refetchArchived,
  } = useQuery({
    queryKey: ["requests", "archived"],
    queryFn: () => apiRequest<ServiceRequest[]>("/api/requests?statusGroup=archived"),
  });

  const isCustomer = session?.user?.role === "customer";
  const unverifiedUser =
    session?.user && !session.user.emailVerified ? session.user : null;
  const approvalBlocked = isCustomerActionBlocked(session?.user);
  const approvalStatus =
    approvalBlocked && session?.user && session.user.approvalStatus !== "approved"
      ? session.user.approvalStatus
      : null;

  /* ── Derive stats ─── */
  const activeRequests = activeData ?? [];
  const sourceRequests = activeFilter === "archived" ? archivedData ?? [] : activeRequests;
  const requests = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return sourceRequests.filter((request) => {
      const matchesFilter = matchesDashboardFilter(request, activeFilter);
      if (!matchesFilter) return false;
      if (!normalizedSearch) return true;

      return [
        request.requestNumber,
        request.subject,
        request.description,
        request.productSnapshot?.name,
        request.siteLocation,
        request.contactPhone,
        request.serialNumber ?? "",
      ]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [activeFilter, searchQuery, sourceRequests]);
  const summaryRequests = activeRequests;
  const totalCount = summaryRequests.length;

  const openCount = summaryRequests.filter((r) => getRequestStatusGroup(r.status) === "open").length;
  const inProgressCount = summaryRequests.filter((r) =>
    getRequestStatusGroup(r.status) === "in_progress" || getRequestStatusGroup(r.status) === "pending"
  ).length;
  const resolvedCount = summaryRequests.filter((r) => getRequestStatusGroup(r.status) === "resolved").length;
  const archivedCount = archivedData?.length ?? 0;

  const setFilter = (nextFilter: DashboardFilter) => {
    const nextParams = new URLSearchParams(searchParams);
    if (nextFilter === "all") {
      nextParams.delete("status");
    } else {
      nextParams.set("status", nextFilter);
    }
    setSearchParams(nextParams, { replace: true });
  };

  if (isLoading || (activeFilter === "archived" && isArchivedLoading)) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* ── Header card ───────────────────────────────────────────────────── */}
      <header className={cn("relative overflow-hidden rounded-2xl p-5 sm:p-6", cardSurface)}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
          style={{
            maskImage: "linear-gradient(to right, black, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
                <ClipboardList className="h-4 w-4" />
              </div>
              <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
                Service Requests
              </p>
            </div>
            <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)]">
              {activeFilter === "all"
                ? isCustomer
                  ? "Your Requests"
                  : "Requests"
                : `${filterMeta.label} Requests`}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--lp-ink-soft)]">
              {filterMeta.description}
            </p>
          </div>

          <Button
            asChild
            disabled={approvalBlocked}
            className={cn(
              "h-10 w-fit shrink-0 rounded-full bg-[var(--lp-accent)] px-5 font-semibold text-[#fbfaf6] transition-colors hover:bg-[var(--lp-accent-2)]",
              approvalBlocked && "pointer-events-none opacity-60",
            )}
          >
            <Link
              to="/app/requests/new"
              aria-disabled={approvalBlocked}
              tabIndex={approvalBlocked ? -1 : 0}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Service Request
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Approval gate banner (pending / rejected / suspended) ───────── */}
      {approvalStatus && (
        <ApprovalStateCard status={approvalStatus} variant="banner" />
      )}

      {/* ── Email verification notice ─────────────────────────────────────── */}
      {unverifiedUser && !approvalStatus && (
        <div className="relative">
          <VerifyEmailNotice email={unverifiedUser.email} />
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Requests"
          count={totalCount}
          icon={ClipboardList}
          accent="copper"
          active={activeFilter === "all"}
          onClick={() => setFilter("all")}
        />
        <StatCard
          label="Open"
          count={openCount}
          icon={Inbox}
          accent="amber"
          active={activeFilter === "open"}
          onClick={() => setFilter("open")}
        />
        <StatCard
          label="In Progress"
          count={inProgressCount}
          icon={Wrench}
          accent="steel"
          active={activeFilter === "in_progress"}
          onClick={() => setFilter("in_progress")}
        />
        <StatCard
          label="Resolved"
          count={resolvedCount}
          icon={CheckCircle2}
          accent="emerald"
          active={activeFilter === "resolved"}
          onClick={() => setFilter("resolved")}
        />
      </div>

      <section className={cn("rounded-xl p-3 sm:p-4", cardSurface)}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {dashboardFilters.map((filterOption) => {
              const active = activeFilter === filterOption.value;
              const Icon =
                filterOption.value === "archived"
                  ? Archive
                  : filterOption.value === "resolved"
                    ? CheckCircle2
                    : filterOption.value === "in_progress"
                      ? Wrench
                      : filterOption.value === "open"
                        ? Inbox
                        : ClipboardList;
              const count =
                filterOption.value === "all"
                  ? totalCount
                  : filterOption.value === "open"
                    ? openCount
                    : filterOption.value === "in_progress"
                      ? inProgressCount
                      : filterOption.value === "resolved"
                        ? resolvedCount
                        : archivedCount;

              return (
                <button
                  key={filterOption.value}
                  type="button"
                  onClick={() => setFilter(filterOption.value)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/35",
                    active
                      ? "border-[var(--lp-accent)]/55 bg-[var(--lp-accent)]/12 text-[var(--lp-accent)]"
                      : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:text-[var(--lp-ink)]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{filterOption.label}</span>
                  <span className="lp-mono text-[9px] text-[var(--lp-faint)]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="relative block min-w-0 lg:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--lp-faint)]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search requests"
              className="lp-field h-8 w-full rounded-full border px-9 text-xs shadow-none ring-offset-0 focus-visible:ring-0"
            />
          </label>
        </div>
      </section>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {(isError || (activeFilter === "archived" && isArchivedError)) && (
        <ErrorState
          onRetry={() => {
            void refetch();
            if (activeFilter === "archived") void refetchArchived();
          }}
        />
      )}

      {/* ── Empty or list ─────────────────────────────────────────────────── */}
      {!isError && !(activeFilter === "archived" && isArchivedError) && (
        <>
          {requests.length === 0 ? (
            <EmptyState
              title={
                activeFilter === "all" && !searchQuery.trim()
                  ? "No service requests yet"
                  : `No ${filterMeta.label.toLowerCase()} service requests found`
              }
              description={
                activeFilter === "all" && !searchQuery.trim()
                  ? undefined
                  : "Try another status filter or search term."
              }
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="lp-mono text-xs font-medium uppercase tracking-[0.18em] text-[var(--lp-faint)]">
                  {requests.length} request{requests.length !== 1 ? "s" : ""} shown
                </p>
              </div>
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Help panel ────────────────────────────────────────────────────── */}
      {requests.length > 0 && (
        <div className={cn("rounded-2xl px-5 py-4 border", cardSurface)}>
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
            <div className="min-w-0 text-sm leading-6 text-[var(--lp-ink-soft)]">
              <span className="font-medium text-[var(--lp-ink)]">Need to report a new issue?</span>{" "}
              You can also start a request directly from a{" "}
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-[var(--lp-accent)] underline-offset-2 hover:underline"
              >
                product page
                <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
