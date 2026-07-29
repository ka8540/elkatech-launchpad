import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ClipboardList,
  Clock,
  HardDrive,
  Search,
  Users,
  CheckCircle2,
  PlusCircle,
} from "lucide-react";
import { canManageOperational } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import { customerMachineProfileState } from "@/lib/customer-machine-navigation";
import { PAGE_CONTAINER } from "@/lib/page-layout";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { StatCard, StatGrid } from "@/components/ui/stat-card";

/* ── API shapes ──────────────────────────────────────────────────────────── */
type ActivityRow = {
  id: string;
  displayName: string;
  email: string;
  approvalStatus: string;
  createdAt: string;
  totalRequests: number;
  openRequests: number;
  pendingRequests: number;
  resolvedRequests: number;
  machineCount: number;
  lastActivity: string | null;
  latestSubject: string | null;
  latestStatus: string | null;
  latestAt: string | null;
};

type ActivityResponse = {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    openRequests: number;
    pendingRequests: number;
    resolvedRequests: number;
    customersWithMachines: number;
  };
  customers: ActivityRow[];
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting_for_customer: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
};

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case "resolved":
    case "closed":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300";
    case "waiting_for_customer":
      return "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300";
    case "in_progress":
    case "assigned":
      return "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]";
    case "new":
    case "triaged":
      return "border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-300";
    default:
      return "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ── Page ────────────────────────────────────────────────────────────────── */
const CustomerActivityPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "pending" | "resolved" | "with_machines">(
    "all",
  );

  // Details opens the full Customer Machine Profile page rather than a drawer
  // that repeated the same fields. That page is operational (admin/owner), so
  // roles without it get no dead link.
  const canOpenProfile = Boolean(
    session?.user && canManageOperational(session.user.role),
  );
  const openProfile = (customerId: string) =>
    navigate(`/app/machines/${customerId}`, {
      state: customerMachineProfileState(location.pathname, location.search),
    });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-activity"],
    queryFn: () => apiRequest<ActivityResponse>("/api/customer-activity"),
  });

  const rows = useMemo(() => {
    const list = data?.customers ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (q && !`${r.displayName} ${r.email}`.toLowerCase().includes(q)) return false;
      if (statusFilter === "open") return r.openRequests > 0;
      if (statusFilter === "pending") return r.pendingRequests > 0;
      if (statusFilter === "resolved") return r.resolvedRequests > 0;
      if (statusFilter === "with_machines") return r.machineCount > 0;
      return true;
    });
  }, [data, search, statusFilter]);

  const summary = data?.summary;

  return (
    <div className={PAGE_CONTAINER}>
      <PageHeader
        icon={Users}
        title="Customer Activity"
        description="Track customer requests, machines, recent issues, and service history."
      />

      {/* KPI cards */}
      <StatGrid>
        <StatCard label="Total customers" count={summary?.totalCustomers ?? 0} icon={Users} accent="copper" />
        <StatCard label="Active" count={summary?.activeCustomers ?? 0} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Open requests" count={summary?.openRequests ?? 0} icon={ClipboardList} accent="sky" />
        <StatCard label="Pending" count={summary?.pendingRequests ?? 0} icon={Clock} accent="amber" />
        <StatCard label="Resolved" count={summary?.resolvedRequests ?? 0} icon={CheckCircle2} accent="emerald" />
        <StatCard label="With machines" count={summary?.customersWithMachines ?? 0} icon={HardDrive} accent="steel" />
      </StatGrid>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="bg-[var(--lp-panel)] pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["open", "Open"],
              ["pending", "Pending"],
              ["resolved", "Resolved"],
              ["with_machines", "Has machines"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === value
                  ? "border-[var(--lp-accent)]/50 bg-[var(--lp-accent)]/12 text-[var(--lp-accent)]"
                  : "border-[var(--lp-line)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-line-strong)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--lp-line)] lp-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-[var(--lp-line)] text-left lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Machines</th>
                <th className="px-4 py-3 font-medium">Requests</th>
                <th className="px-4 py-3 font-medium">Latest issue</th>
                <th className="px-4 py-3 font-medium">Last activity</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--lp-faint)]">
                    Loading customer activity…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-rose-500">
                    Could not load customer activity.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--lp-faint)]">
                    <Activity className="mx-auto mb-2 h-6 w-6 opacity-50" />
                    No customers match these filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--lp-line)] last:border-0 transition-colors hover:bg-[var(--lp-panel-2)]/40"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--lp-ink)]">{r.displayName}</p>
                    <p className="text-xs text-[var(--lp-faint)]">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--lp-ink-soft)]">{r.machineCount}</td>
                  <td className="px-4 py-3">
                    <span className="text-[var(--lp-ink-soft)]">{r.totalRequests}</span>
                    <span className="ml-2 text-xs text-[var(--lp-faint)]">
                      {r.openRequests} open · {r.resolvedRequests} resolved
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.latestSubject ? (
                      <div className="flex items-center gap-2">
                        <span className="max-w-[200px] truncate text-[var(--lp-ink-soft)]">
                          {r.latestSubject}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            statusBadgeClass(r.latestStatus),
                          )}
                        >
                          {STATUS_LABEL[r.latestStatus ?? ""] ?? "—"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[var(--lp-faint)]">No requests</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--lp-faint)]">
                    {formatDate(r.lastActivity)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      {canOpenProfile && (
                        <button
                          onClick={() => openProfile(r.id)}
                          className="rounded-lg border border-[var(--lp-line)] px-2.5 py-1 text-xs font-medium text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/40 hover:text-[var(--lp-accent)]"
                        >
                          Details
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/app/requests/new?customerId=${r.id}`)}
                        title="Create request"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--lp-line)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/40 hover:text-[var(--lp-accent)]"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerActivityPage;
