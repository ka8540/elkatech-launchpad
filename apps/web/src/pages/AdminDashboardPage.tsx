import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  Gauge,
  RefreshCw,
  ShieldOff,
  Ticket,
  UserPlus,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { AuthUser, ServiceRequest, ServiceHeartbeat } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ApprovalSummary = {
  pendingApproval: number;
  approved: number;
  rejected: number;
  suspended: number;
  total: number;
};

type HealthResponse = {
  services: ServiceHeartbeat[];
};

/* ─── Shared surface helper ───────────────────────────────────────────────── */
const cardSurface = "lp-card border";

/* ─── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({
  label,
  count,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  count: number | string;
  icon: LucideIcon;
  accent: "copper" | "emerald" | "amber" | "steel" | "rose";
  hint?: string;
}) {
  const badgeMap: Record<typeof accent, string> = {
    copper: "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
    steel: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-300",
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-5 transition-colors duration-150",
        cardSurface,
        "hover:border-[var(--lp-line-strong)]",
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lp-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--lp-faint)]">
            {label}
          </p>
          <p className="lp-display mt-2 text-4xl font-bold text-[var(--lp-ink)]">{count}</p>
          {hint && (
            <p className="mt-1.5 text-[11px] font-medium text-[var(--lp-faint)]">
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            badgeMap[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ─── Service heartbeat row ────────────────────────────────────────────────── */
function statusColor(status: ServiceHeartbeat["status"]): string {
  switch (status) {
    case "healthy":
      return "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]";
    case "degraded":
      return "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]";
    case "down":
      return "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]";
  }
}

function statusBadge(status: ServiceHeartbeat["status"]): string {
  switch (status) {
    case "healthy":
      return "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300";
    case "degraded":
      return "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300";
    case "down":
      return "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300";
  }
}

function formatRelativeShort(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.max(1, Math.round(diffMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
const AdminDashboardPage = () => {
  const summaryQuery = useQuery({
    queryKey: ["admin", "users", "summary"],
    queryFn: () => apiRequest<ApprovalSummary>("/api/admin/users/summary"),
    staleTime: 30_000,
  });

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiRequest<AuthUser[]>("/api/admin/users"),
    staleTime: 30_000,
  });

  const requestsQuery = useQuery({
    queryKey: ["admin", "requests"],
    queryFn: () => apiRequest<ServiceRequest[]>("/api/requests?scope=queue"),
    staleTime: 30_000,
  });

  const healthQuery = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => apiRequest<HealthResponse>("/api/admin/health"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const requestStats = useMemo(() => {
    const list = requestsQuery.data ?? [];
    const counts = { open: 0, inProgress: 0, resolved: 0 };
    for (const request of list) {
      if (
        request.status === "new" ||
        request.status === "triaged" ||
        request.status === "assigned" ||
        request.status === "waiting_for_customer"
      ) {
        counts.open += 1;
      } else if (request.status === "in_progress") {
        counts.inProgress += 1;
      } else if (request.status === "resolved" || request.status === "closed") {
        counts.resolved += 1;
      }
    }
    return counts;
  }, [requestsQuery.data]);

  const recentSignups = useMemo(() => {
    const list = usersQuery.data ?? [];
    return [...list]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [usersQuery.data]);

  const recentRequests = useMemo(() => {
    const list = requestsQuery.data ?? [];
    return [...list]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [requestsQuery.data]);

  const pendingCount = summaryQuery.data?.pendingApproval ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <header
        className={cn(
          "relative overflow-hidden rounded-3xl p-6 sm:p-8",
          cardSurface,
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
          style={{
            maskImage: "linear-gradient(to right, black, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border",
                  "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
                )}
              >
                <Gauge className="h-5 w-5" />
              </div>
              <p className="lp-mono text-xs font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
                Admin Dashboard
              </p>
            </div>
            <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)] sm:text-3xl">
              Operations overview
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-7 text-[var(--lp-ink-soft)]">
              Account approvals, service request load, and live service health for the
              ElkaTech platform.
            </p>
          </div>

          <div className="flex w-fit shrink-0 items-center gap-2">
            <Button
              asChild
              className="h-11 rounded-full bg-[var(--lp-accent)] px-5 font-semibold text-[#fbfaf6] shadow-sm transition-colors hover:bg-[var(--lp-accent-2)]"
            >
              <Link to="/app/users">
                <UserPlus className="mr-1.5 h-4 w-4" />
                Manage users
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Pending banner if work to do */}
      {pendingCount > 0 && (
        <div
          className="flex items-center gap-3 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-4 text-sm text-amber-700 dark:text-amber-200"
          role="status"
        >
          <Clock className="h-5 w-5 flex-shrink-0" />
          <p>
            <span className="font-semibold">{pendingCount}</span> user
            {pendingCount === 1 ? "" : "s"} waiting for approval.{" "}
            <Link to="/app/users" className="underline-offset-2 hover:underline">
              Review now →
            </Link>
          </p>
        </div>
      )}

      {/* User approval stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending approvals"
          count={summaryQuery.data?.pendingApproval ?? "—"}
          icon={Clock}
          accent={pendingCount > 0 ? "amber" : "steel"}
          hint="Awaiting admin review"
        />
        <StatCard
          label="Approved users"
          count={summaryQuery.data?.approved ?? "—"}
          icon={CheckCircle2}
          accent="emerald"
          hint="Active customer accounts"
        />
        <StatCard
          label="Suspended"
          count={summaryQuery.data?.suspended ?? "—"}
          icon={ShieldOff}
          accent={(summaryQuery.data?.suspended ?? 0) > 0 ? "rose" : "steel"}
          hint="Access revoked"
        />
        <StatCard
          label="Rejected"
          count={summaryQuery.data?.rejected ?? "—"}
          icon={XCircle}
          accent="steel"
          hint="Not approved"
        />
      </div>

      {/* Request load stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open requests"
          count={requestStats.open}
          icon={Ticket}
          accent="copper"
          hint="New, triaged, or waiting"
        />
        <StatCard
          label="In progress"
          count={requestStats.inProgress}
          icon={Activity}
          accent="amber"
          hint="Currently being worked on"
        />
        <StatCard
          label="Resolved"
          count={requestStats.resolved}
          icon={CheckCircle2}
          accent="emerald"
          hint="Resolved or closed"
        />
        <StatCard
          label="Total users"
          count={summaryQuery.data?.total ?? "—"}
          icon={UserPlus}
          accent="steel"
          hint="All accounts"
        />
      </div>

      {/* Service heartbeats */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl p-6 sm:p-7",
          cardSurface,
        )}
      >
        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300">
                  <Activity className="h-5 w-5" />
                </div>
                <p className="lp-mono text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-300">
                  Service Heartbeat
                </p>
              </div>
              <h2 className="lp-display text-xl font-bold text-[var(--lp-ink)]">
                Live service health
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-[var(--lp-ink-soft)]">
                Each internal service is probed every minute. Latency above 1.5s is
                flagged as degraded.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 shrink-0 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
              onClick={() => healthQuery.refetch()}
              disabled={healthQuery.isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", healthQuery.isFetching && "animate-spin")} />
              {healthQuery.isFetching ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {(healthQuery.data?.services ?? []).map((service) => (
              <div
                key={service.service}
                className="relative overflow-hidden rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "inline-block h-2.5 w-2.5 rounded-full",
                          statusColor(service.status),
                        )}
                        aria-hidden
                      />
                      <p className="lp-display font-semibold capitalize text-[var(--lp-ink)]">
                        {service.service}
                      </p>
                    </div>
                    <p className="mt-1.5 lp-mono text-[11px] uppercase tracking-[0.16em] text-[var(--lp-faint)]">
                      checked {formatRelativeShort(service.checkedAt)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      statusBadge(service.status),
                    )}
                  >
                    {service.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-[var(--lp-ink-soft)]">Latency</span>
                  <span className="font-medium text-[var(--lp-ink)]">
                    {service.latencyMs !== null ? `${service.latencyMs} ms` : "unreachable"}
                  </span>
                </div>
              </div>
            ))}
            {!healthQuery.data && (
              <p className="text-sm text-[var(--lp-faint)]">
                Loading service heartbeats…
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Two-column activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent signups */}
        <section className={cn("rounded-3xl p-6 sm:p-7", cardSurface)}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <p className="lp-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--lp-accent)]">
                Recent signups
              </p>
              <h3 className="lp-display text-lg font-bold text-[var(--lp-ink)]">
                Latest accounts
              </h3>
            </div>
          </div>

          {recentSignups.length === 0 ? (
            <p className="text-sm text-[var(--lp-faint)]">
              No accounts yet.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recentSignups.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/70 p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--lp-ink)]">
                      {user.displayName}
                    </p>
                    <p className="truncate text-xs text-[var(--lp-faint)]">
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      user.approvalStatus === "approved"
                        ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
                        : user.approvalStatus === "pending_approval"
                          ? "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300"
                          : user.approvalStatus === "rejected"
                            ? "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300"
                            : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
                    )}
                  >
                    {user.approvalStatus.replace("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/app/users"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--lp-accent)] underline-offset-2 hover:underline"
          >
            Manage all users
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Recent requests */}
        <section className={cn("rounded-3xl p-6 sm:p-7", cardSurface)}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <p className="lp-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
                Recent activity
              </p>
              <h3 className="lp-display text-lg font-bold text-[var(--lp-ink)]">
                Latest service requests
              </h3>
            </div>
          </div>

          {recentRequests.length === 0 ? (
            <p className="text-sm text-[var(--lp-faint)]">
              No recent service requests.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recentRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    to={`/app/requests/${request.id}`}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/70 p-3.5 transition-colors hover:border-[var(--lp-accent)]/45"
                  >
                    <div className="min-w-0">
                      <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
                        {request.requestNumber}
                      </p>
                      <p className="mt-1 truncate font-medium text-[var(--lp-ink)]">
                        {request.subject}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/app/queue"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--lp-accent)] underline-offset-2 hover:underline"
          >
            Open queue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      {/* Footer help */}
      <div className={cn("rounded-2xl px-5 py-4", cardSurface)}>
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
          <p className="text-sm leading-6 text-[var(--lp-ink-soft)]">
            <span className="font-medium text-[var(--lp-ink)]">
              Approve a customer:
            </span>{" "}
            new signups land in <em>pending_approval</em> and cannot create service
            requests until you approve them on the{" "}
            <Link
              to="/app/users"
              className="text-[var(--lp-accent)] underline-offset-2 hover:underline"
            >
              Users page
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
