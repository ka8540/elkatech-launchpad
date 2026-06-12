import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ClipboardList,
  Clock,
  HardDrive,
  Search,
  Users,
  X,
  CheckCircle2,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

type CustomerDetail = {
  customer: { displayName: string; email: string; role: string; approvalStatus: string };
  profile: {
    companyName: string | null;
    contactPhone: string | null;
    city: string | null;
    state: string | null;
    addressLine1: string | null;
  } | null;
  stats: {
    totalRequests: number;
    openRequests: number;
    pendingRequests: number;
    resolvedRequests: number;
    machineCount: number;
  };
  requests: Array<{
    id: string;
    requestNumber: string;
    subject: string;
    status: string;
    createdAt: string;
  }>;
  machines: Array<{ id: string; displayLabel: string; status: string }>;
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

function StatCard({
  label,
  count,
  icon: Icon,
  accent,
}: {
  label: string;
  count: number;
  icon: LucideIcon;
  accent: "copper" | "emerald" | "amber" | "steel" | "sky";
}) {
  const badgeMap: Record<typeof accent, string> = {
    copper: "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
    steel: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
    sky: "border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-300",
  };
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border p-4 lp-card")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lp-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--lp-faint)]">
            {label}
          </p>
          <p className="lp-display mt-1.5 text-3xl font-bold text-[var(--lp-ink)]">{count}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            badgeMap[accent],
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </div>
  );
}

/* ── Detail drawer ───────────────────────────────────────────────────────── */
function CustomerDetailDrawer({
  customerId,
  onClose,
}: {
  customerId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["customer-activity", customerId],
    queryFn: () => apiRequest<CustomerDetail>(`/api/customer-activity/${customerId}`),
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--lp-line-strong)] bg-[var(--lp-panel)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--lp-line)] px-5 py-4">
          <h2 className="lp-display text-base font-bold text-[var(--lp-ink)]">Customer detail</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--lp-line)] text-[var(--lp-ink-soft)] hover:text-[var(--lp-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading && (
          <div className="p-6 text-sm text-[var(--lp-faint)]">Loading customer activity…</div>
        )}
        {isError && (
          <div className="p-6 text-sm text-rose-500">Could not load this customer.</div>
        )}
        {data && (
          <div className="space-y-5 p-5">
            <div>
              <p className="text-lg font-semibold text-[var(--lp-ink)]">
                {data.customer.displayName}
              </p>
              <p className="text-sm text-[var(--lp-faint)]">{data.customer.email}</p>
              {data.profile?.companyName && (
                <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">{data.profile.companyName}</p>
              )}
              {(data.profile?.city || data.profile?.state) && (
                <p className="text-xs text-[var(--lp-faint)]">
                  {[data.profile?.city, data.profile?.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total", value: data.stats.totalRequests },
                { label: "Open", value: data.stats.openRequests },
                { label: "Resolved", value: data.stats.resolvedRequests },
                { label: "Pending", value: data.stats.pendingRequests },
                { label: "Machines", value: data.stats.machineCount },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-3 text-center"
                >
                  <p className="lp-display text-xl font-bold text-[var(--lp-ink)]">{s.value}</p>
                  <p className="lp-mono text-[9px] uppercase tracking-wider text-[var(--lp-faint)]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <Button
              variant="cta"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/app/requests/new?customerId=${customerId}`)}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create request for this customer
            </Button>

            <div>
              <p className="lp-mono mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--lp-faint)]">
                Machines ({data.machines.length})
              </p>
              {data.machines.length === 0 ? (
                <p className="text-xs text-[var(--lp-faint)]">No machines assigned.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.machines.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--lp-line)] px-3 py-2 text-sm"
                    >
                      <span className="truncate text-[var(--lp-ink-soft)]">{m.displayLabel}</span>
                      <span className="lp-mono text-[10px] uppercase text-[var(--lp-faint)]">
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="lp-mono mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--lp-faint)]">
                Request history ({data.requests.length})
              </p>
              {data.requests.length === 0 ? (
                <p className="text-xs text-[var(--lp-faint)]">No requests yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {data.requests.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => navigate(`/app/requests/${r.id}`)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--lp-line)] px-3 py-2 text-left hover:border-[var(--lp-accent)]/40"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-[var(--lp-ink-soft)]">
                          {r.subject}
                        </span>
                        <span className="lp-mono text-[10px] text-[var(--lp-faint)]">
                          {r.requestNumber} · {formatDate(r.createdAt)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          statusBadgeClass(r.status),
                        )}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
const CustomerActivityPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "pending" | "resolved" | "with_machines">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)]">Customer Activity</h1>
        <p className="mt-1 text-sm text-[var(--lp-faint)]">
          Track customer requests, machines, recent issues, and service history.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total customers" count={summary?.totalCustomers ?? 0} icon={Users} accent="copper" />
        <StatCard label="Active" count={summary?.activeCustomers ?? 0} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Open requests" count={summary?.openRequests ?? 0} icon={ClipboardList} accent="sky" />
        <StatCard label="Pending" count={summary?.pendingRequests ?? 0} icon={Clock} accent="amber" />
        <StatCard label="Resolved" count={summary?.resolvedRequests ?? 0} icon={CheckCircle2} accent="emerald" />
        <StatCard label="With machines" count={summary?.customersWithMachines ?? 0} icon={HardDrive} accent="steel" />
      </div>

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
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className="rounded-lg border border-[var(--lp-line)] px-2.5 py-1 text-xs font-medium text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/40 hover:text-[var(--lp-accent)]"
                      >
                        Details
                      </button>
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

      {selectedId && (
        <CustomerDetailDrawer customerId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
};

export default CustomerActivityPage;
