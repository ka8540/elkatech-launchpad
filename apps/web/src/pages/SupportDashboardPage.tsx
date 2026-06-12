import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Inbox,
  Clock,
  Loader2,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  Search,
  X,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import type { ServiceRequest } from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SupportSummary = {
  queued: number;
  assigned: number;
  inProgress: number;
  waitingForCustomer: number;
  resolved: number;
  closed: number;
  unassigned: number;
  total: number;
};

type Directory = { id: string; displayName: string; email: string };

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In progress",
  waiting_for_customer: "Waiting on customer",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "queue", label: "Queue" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_for_customer", label: "Waiting" },
  { value: "resolved", label: "Resolved" },
] as const;

function statusBadgeClass(status: string): string {
  switch (status) {
    case "resolved":
    case "closed":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300";
    case "waiting_for_customer":
      return "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300";
    case "in_progress":
    case "assigned":
      return "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]";
    default:
      return "border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-300";
  }
}

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "urgent":
      return "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-300";
    case "high":
      return "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300";
    case "low":
      return "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]";
    default:
      return "border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-300";
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  accent: "copper" | "emerald" | "amber" | "steel" | "sky" | "rose";
}) {
  const badgeMap: Record<typeof accent, string> = {
    copper: "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
    steel: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
    sky: "border-sky-400/30 bg-sky-400/10 text-sky-600 dark:text-sky-300",
    rose: "border-rose-400/30 bg-rose-400/10 text-rose-600 dark:text-rose-300",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border p-4 lp-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lp-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--lp-faint)]">
            {label}
          </p>
          <p className="lp-display mt-1.5 text-3xl font-bold text-[var(--lp-ink)]">{count}</p>
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", badgeMap[accent])}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
    </div>
  );
}

/* ── Assign engineer modal ───────────────────────────────────────────────── */
function AssignModal({
  request,
  engineers,
  onClose,
}: {
  request: ServiceRequest;
  engineers: Directory[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [engineerId, setEngineerId] = useState(request.assignedEngineerId ?? "");

  const assign = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${request.id}/assign`, {
        method: "POST",
        body: JSON.stringify({ engineerId }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["support-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["support-summary"] });
      toast.success(request.assignedEngineerId ? "Request reassigned." : "Engineer assigned.");
      onClose();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not assign engineer.");
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="lp-display text-base font-bold text-[var(--lp-ink)]">
            {request.assignedEngineerId ? "Reassign request" : "Assign request"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-[var(--lp-faint)] hover:text-[var(--lp-ink)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-3">
          <p className="lp-mono text-[10px] uppercase tracking-wider text-[var(--lp-faint)]">
            {request.requestNumber}
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--lp-ink)]">{request.subject}</p>
        </div>

        <label className="mb-2 block text-sm font-medium text-[var(--lp-ink)]">Engineer</label>
        {engineers.length === 0 ? (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-300">
            No engineer accounts exist yet. Create one before assigning.
          </p>
        ) : (
          <select
            value={engineerId}
            onChange={(e) => setEngineerId(e.target.value)}
            className="w-full rounded-lg border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] px-3 py-2 text-sm text-[var(--lp-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--lp-accent)]/40"
          >
            <option value="">Select an engineer…</option>
            {engineers.map((e) => (
              <option key={e.id} value={e.id}>
                {e.displayName} ({e.email})
              </option>
            ))}
          </select>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="cta"
            size="sm"
            disabled={!engineerId || assign.isPending}
            onClick={() => assign.mutate()}
          >
            {assign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {request.assignedEngineerId ? "Reassign" : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
const SupportDashboardPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [assigning, setAssigning] = useState<ServiceRequest | null>(null);

  const summaryQuery = useQuery({
    queryKey: ["support-summary"],
    queryFn: () => apiRequest<SupportSummary>("/api/support/summary"),
  });
  const requestsQuery = useQuery({
    queryKey: ["support-requests"],
    queryFn: () => apiRequest<ServiceRequest[]>("/api/requests"),
  });
  const engineersQuery = useQuery({
    queryKey: ["engineers"],
    queryFn: () => apiRequest<Directory[]>("/api/engineers"),
  });
  const customersQuery = useQuery({
    queryKey: ["staff-customers"],
    queryFn: () => apiRequest<Directory[]>("/api/staff/customers"),
  });

  const engineerName = useMemo(() => {
    const map = new Map((engineersQuery.data ?? []).map((e) => [e.id, e.displayName]));
    return (id: string | null) => (id ? map.get(id) ?? "Assigned" : null);
  }, [engineersQuery.data]);

  const customerName = useMemo(() => {
    const map = new Map((customersQuery.data ?? []).map((c) => [c.id, c]));
    return (id: string) => map.get(id) ?? null;
  }, [customersQuery.data]);

  const rows = useMemo(() => {
    const list = requestsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((r) => {
      if (tab === "queue" && !(r.status === "new" || r.status === "triaged")) return false;
      if (tab !== "all" && tab !== "queue" && r.status !== tab) return false;
      if (unassignedOnly && r.assignedEngineerId) return false;
      if (q) {
        const cust = customerName(r.customerId);
        const hay = `${r.requestNumber} ${r.subject} ${cust?.displayName ?? ""} ${cust?.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [requestsQuery.data, tab, unassignedOnly, search, customerName]);

  const s = summaryQuery.data;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div>
        <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)]">Support Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--lp-faint)]">
          Monitor the service queue, assign requests, and track resolution progress.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="In queue" count={s?.queued ?? 0} icon={Inbox} accent="sky" />
        <StatCard label="Assigned" count={s?.assigned ?? 0} icon={UserCheck} accent="copper" />
        <StatCard label="In progress" count={s?.inProgress ?? 0} icon={Loader2} accent="copper" />
        <StatCard label="Waiting" count={s?.waitingForCustomer ?? 0} icon={Clock} accent="amber" />
        <StatCard label="Resolved" count={s?.resolved ?? 0} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Unassigned" count={s?.unassigned ?? 0} icon={AlertCircle} accent="rose" />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.value
                  ? "border-[var(--lp-accent)]/50 bg-[var(--lp-accent)]/12 text-[var(--lp-accent)]"
                  : "border-[var(--lp-line)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-line-strong)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnassignedOnly((v) => !v)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              unassignedOnly
                ? "border-rose-400/50 bg-rose-400/12 text-rose-600 dark:text-rose-300"
                : "border-[var(--lp-line)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-line-strong)]",
            )}
          >
            Unassigned only
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests…"
              className="w-full bg-[var(--lp-panel)] pl-9 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--lp-line)] lp-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-[var(--lp-line)] text-left lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                <th className="px-4 py-3 font-medium">Request</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Engineer</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requestsQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[var(--lp-faint)]">
                    Loading queue…
                  </td>
                </tr>
              )}
              {requestsQuery.isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-rose-500">
                    Could not load the request queue.
                  </td>
                </tr>
              )}
              {!requestsQuery.isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--lp-faint)]">
                    <Inbox className="mx-auto mb-2 h-6 w-6 opacity-50" />
                    No requests match these filters.
                  </td>
                </tr>
              )}
              {rows.map((r) => {
                const cust = customerName(r.customerId);
                const eng = engineerName(r.assignedEngineerId);
                return (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--lp-line)] last:border-0 transition-colors hover:bg-[var(--lp-panel-2)]/40"
                  >
                    <td className="px-4 py-3">
                      <p className="lp-mono text-[11px] text-[var(--lp-faint)]">{r.requestNumber}</p>
                      <p className="max-w-[220px] truncate font-medium text-[var(--lp-ink)]">
                        {r.subject}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {cust ? (
                        <>
                          <p className="text-[var(--lp-ink-soft)]">{cust.displayName}</p>
                          <p className="text-xs text-[var(--lp-faint)]">{cust.email}</p>
                        </>
                      ) : (
                        <span className="text-xs text-[var(--lp-faint)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
                          priorityBadgeClass(r.priority),
                        )}
                      >
                        {r.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          statusBadgeClass(r.status),
                        )}
                      >
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--lp-ink-soft)]">
                      {eng ?? <span className="text-xs text-rose-500">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--lp-faint)]">
                      {formatDate(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAssigning(r)}
                          className="rounded-lg border border-[var(--lp-line)] px-2.5 py-1 text-xs font-medium text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/40 hover:text-[var(--lp-accent)]"
                        >
                          {r.assignedEngineerId ? "Reassign" : "Assign"}
                        </button>
                        <button
                          onClick={() => navigate(`/app/requests/${r.id}`)}
                          title="Open request"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--lp-line)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/40 hover:text-[var(--lp-accent)]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {assigning && (
        <AssignModal
          request={assigning}
          engineers={engineersQuery.data ?? []}
          onClose={() => setAssigning(null)}
        />
      )}
    </div>
  );
};

export default SupportDashboardPage;
