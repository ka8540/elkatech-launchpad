import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Clock, ShieldOff, Ticket, UserPlus, XCircle } from "lucide-react";
import type { AuthUser, ServiceRequest, ServiceHeartbeat } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";

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

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "good";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-500/30"
      : tone === "danger"
        ? "border-destructive/40"
        : tone === "good"
          ? "border-emerald-500/30"
          : "border-border/60";
  return (
    <div className={`rounded-3xl border bg-card p-5 shadow-soft ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function statusColor(status: ServiceHeartbeat["status"]): string {
  switch (status) {
    case "healthy":
      return "bg-emerald-500";
    case "degraded":
      return "bg-amber-500";
    case "down":
      return "bg-red-500";
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

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Admin Dashboard</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">Operations overview</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Account approvals, service request load, and live service health for the ElkaTech platform.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Clock}
          label="Pending approvals"
          value={summaryQuery.data?.pendingApproval ?? "—"}
          hint="Awaiting admin review"
          tone={summaryQuery.data?.pendingApproval ? "warning" : "default"}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Approved users"
          value={summaryQuery.data?.approved ?? "—"}
          hint="Active accounts"
          tone="good"
        />
        <MetricCard
          icon={ShieldOff}
          label="Suspended"
          value={summaryQuery.data?.suspended ?? "—"}
          hint="Access revoked"
          tone={summaryQuery.data?.suspended ? "danger" : "default"}
        />
        <MetricCard
          icon={XCircle}
          label="Rejected"
          value={summaryQuery.data?.rejected ?? "—"}
          hint="Not approved"
        />

        <MetricCard
          icon={Ticket}
          label="Open requests"
          value={requestStats.open}
          hint="New, triaged, assigned, or waiting"
        />
        <MetricCard
          icon={Activity}
          label="In progress"
          value={requestStats.inProgress}
          hint="Being worked on"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Resolved"
          value={requestStats.resolved}
          hint="Resolved or closed"
          tone="good"
        />
        <MetricCard
          icon={UserPlus}
          label="Total users"
          value={summaryQuery.data?.total ?? "—"}
          hint="All accounts"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-sm uppercase tracking-[0.2em] text-accent">Service health</p>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => healthQuery.refetch()}
              disabled={healthQuery.isFetching}
            >
              {healthQuery.isFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold text-foreground">Heartbeat</h3>
          <div className="mt-4 space-y-3">
            {(healthQuery.data?.services ?? []).map((service) => (
              <div
                key={service.service}
                className="flex items-center justify-between rounded-2xl border bg-muted/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${statusColor(service.status)}`}
                    aria-hidden
                  />
                  <div>
                    <p className="font-semibold capitalize text-foreground">{service.service}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.status} · checked {formatRelativeShort(service.checkedAt)}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {service.latencyMs !== null ? `${service.latencyMs} ms` : "unreachable"}
                </p>
              </div>
            ))}
            {!healthQuery.data && (
              <p className="text-sm text-muted-foreground">Loading service heartbeats…</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Recent signups</p>
          <h3 className="mt-2 font-display text-2xl font-bold text-foreground">Latest accounts</h3>
          <div className="mt-4 space-y-3">
            {recentSignups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts yet.</p>
            ) : (
              recentSignups.map((user) => (
                <div key={user.id} className="rounded-2xl border bg-muted/30 p-4">
                  <p className="font-semibold text-foreground">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-accent">
                    {user.approvalStatus.replace("_", " ")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Recent service requests</p>
        <h3 className="mt-2 font-display text-2xl font-bold text-foreground">Latest activity</h3>
        <div className="mt-4 space-y-3">
          {recentRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent service requests.</p>
          ) : (
            recentRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {request.requestNumber}
                    </p>
                    <p className="font-semibold text-foreground">{request.subject}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{request.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
