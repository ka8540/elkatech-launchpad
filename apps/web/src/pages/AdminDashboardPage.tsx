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
  accent: "blue" | "emerald" | "amber" | "slate" | "rose";
  hint?: string;
}) {
  const accentMap = {
    blue: {
      badge: "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
      glow: "from-blue-500/5 to-transparent",
      count: "text-blue-700 dark:text-blue-100",
    },
    emerald: {
      badge: "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
      glow: "from-emerald-500/5 to-transparent",
      count: "text-emerald-700 dark:text-emerald-100",
    },
    amber: {
      badge: "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300",
      glow: "from-amber-500/5 to-transparent",
      count: "text-amber-700 dark:text-amber-100",
    },
    slate: {
      badge: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400",
      glow: "from-slate-500/5 to-transparent",
      count: "text-slate-700 dark:text-slate-200",
    },
    rose: {
      badge: "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300",
      glow: "from-rose-500/5 to-transparent",
      count: "text-rose-700 dark:text-rose-100",
    },
  };

  const c = accentMap[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 transition-colors duration-150",
        "border-slate-200 bg-white hover:border-slate-300",
        "dark:border-white/[0.08] dark:bg-[#0b1626]/80 dark:hover:border-white/[0.14] dark:backdrop-blur-sm",
      )}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", c.glow)} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
            {label}
          </p>
          <p className={cn("mt-2 font-display text-4xl font-bold", c.count)}>{count}</p>
          {hint && (
            <p className="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {hint}
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            c.badge,
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
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "degraded":
      return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300";
    case "down":
      return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300";
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
      {/* Ambient glow background */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/[0.03] blur-[120px] dark:bg-blue-500/[0.04]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-emerald-500/[0.03] blur-[100px] dark:bg-emerald-500/[0.04]" />
      </div>

      {/* Header */}
      <header
        className={cn(
          "relative overflow-hidden rounded-3xl border p-6 backdrop-blur-xl sm:p-8",
          "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0b1626]/80",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(16,185,129,0.05),transparent_30%)] dark:bg-[radial-gradient(circle_at_14%_0%,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(16,185,129,0.09),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl border",
                  "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
                )}
              >
                <Gauge className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">
                Admin Dashboard
              </p>
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Operations overview
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Account approvals, service request load, and live service health for the
              ElkaTech platform.
            </p>
          </div>

          <div className="flex w-fit shrink-0 items-center gap-2">
            <Button
              asChild
              className="h-11 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 px-5 font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.22)] hover:from-blue-400 hover:to-emerald-300"
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
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-4 text-sm shadow-soft",
            "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
          )}
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
          accent={pendingCount > 0 ? "amber" : "slate"}
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
          accent={(summaryQuery.data?.suspended ?? 0) > 0 ? "rose" : "slate"}
          hint="Access revoked"
        />
        <StatCard
          label="Rejected"
          count={summaryQuery.data?.rejected ?? "—"}
          icon={XCircle}
          accent="slate"
          hint="Not approved"
        />
      </div>

      {/* Request load stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Open requests"
          count={requestStats.open}
          icon={Ticket}
          accent="blue"
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
          accent="slate"
          hint="All accounts"
        />
      </div>

      {/* Service heartbeats */}
      <section
        className={cn(
          "relative overflow-hidden rounded-3xl border p-6 backdrop-blur-xl sm:p-7",
          "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0b1626]/80",
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_18%,rgba(16,185,129,0.06),transparent_30%)] dark:bg-[radial-gradient(circle_at_84%_18%,rgba(16,185,129,0.09),transparent_30%)]" />
        <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl border",
                    "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
                  )}
                >
                  <Activity className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600 dark:text-emerald-300">
                  Service Heartbeat
                </p>
              </div>
              <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                Live service health
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Each internal service is probed every minute. Latency above 1.5s is
                flagged as degraded.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-9 shrink-0 rounded-full",
                "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white",
              )}
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
                className={cn(
                  "relative overflow-hidden rounded-2xl border p-4",
                  "border-slate-200 bg-slate-50 dark:border-white/[0.06] dark:bg-[#070f1d]/60",
                )}
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
                      <p className="font-display font-semibold capitalize text-slate-900 dark:text-white">
                        {service.service}
                      </p>
                    </div>
                    <p className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
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
                  <span className="text-slate-500 dark:text-slate-400">Latency</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {service.latencyMs !== null ? `${service.latencyMs} ms` : "unreachable"}
                  </span>
                </div>
              </div>
            ))}
            {!healthQuery.data && (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Loading service heartbeats…
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Two-column activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent signups */}
        <section
          className={cn(
            "rounded-3xl border p-6 sm:p-7",
            "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0b1626]/80 dark:backdrop-blur-sm",
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border",
                "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
              )}
            >
              <UserPlus className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-300">
                Recent signups
              </p>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Latest accounts
              </h3>
            </div>
          </div>

          {recentSignups.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No accounts yet.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recentSignups.map((user) => (
                <li
                  key={user.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-2xl border p-3.5",
                    "border-slate-200 bg-slate-50 dark:border-white/[0.06] dark:bg-[#070f1d]/60",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {user.displayName}
                    </p>
                    <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                      user.approvalStatus === "approved"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : user.approvalStatus === "pending_approval"
                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300"
                          : user.approvalStatus === "rejected"
                            ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300"
                            : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300",
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
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Manage all users
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Recent requests */}
        <section
          className={cn(
            "rounded-3xl border p-6 sm:p-7",
            "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0b1626]/80 dark:backdrop-blur-sm",
          )}
        >
          <div className="mb-4 flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border",
                "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
              )}
            >
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600 dark:text-emerald-300">
                Recent activity
              </p>
              <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Latest service requests
              </h3>
            </div>
          </div>

          {recentRequests.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No recent service requests.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {recentRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    to={`/app/requests/${request.id}`}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-2xl border p-3.5 transition-colors",
                      "border-slate-200 bg-slate-50 hover:border-blue-300 dark:border-white/[0.06] dark:bg-[#070f1d]/60 dark:hover:border-blue-400/30",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        {request.requestNumber}
                      </p>
                      <p className="mt-1 truncate font-medium text-slate-800 dark:text-slate-100">
                        {request.subject}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      {request.status.replace(/_/g, " ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/app/queue"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
          >
            Open queue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      {/* Footer help */}
      <div
        className={cn(
          "rounded-2xl border px-5 py-4",
          "border-slate-200 bg-slate-50 dark:border-white/[0.06] dark:bg-[#0b1626]/60",
        )}
      >
        <div className="flex items-start gap-3">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Approve a customer:
            </span>{" "}
            new signups land in <em>pending_approval</em> and cannot create service
            requests until you approve them on the{" "}
            <Link
              to="/app/users"
              className="text-blue-500 underline-offset-2 hover:underline dark:text-blue-400"
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
