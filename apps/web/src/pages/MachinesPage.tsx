import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  CircleSlash,
  Eye,
  HardDrive,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { AuthUser, CatalogProduct, CustomerMachine } from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MachineFormDialog from "@/components/MachineFormDialog";

const cardSurface = "lp-card border";

type EnrichedMachine = CustomerMachine & {
  customer: { displayName: string; email: string } | null;
};

type CustomerMachineGroup = {
  customerId: string;
  customer: { displayName: string; email: string } | null;
  machines: EnrichedMachine[];
  primary: EnrichedMachine;
  activeCount: number;
  inactiveCount: number;
  lastUpdated: string;
};

type ActionTone = "view" | "edit" | "request" | "archive" | "reactivate";

const actionToneClass: Record<ActionTone, string> = {
  view: "border-[var(--lp-line-strong)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-line-strong)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]",
  edit: "border-[var(--lp-line-strong)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/55 hover:bg-[var(--lp-accent)]/10 hover:text-[var(--lp-accent)]",
  request: "border-emerald-400/30 text-emerald-600 hover:border-emerald-400/55 hover:bg-emerald-400/10 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200",
  archive: "border-amber-400/30 text-amber-600 hover:border-amber-400/60 hover:bg-amber-400/10 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200",
  reactivate: "border-emerald-400/30 text-emerald-600 hover:border-emerald-400/55 hover:bg-emerald-400/10 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200",
};

function actionClasses(tone: ActionTone, className?: string) {
  return cn(
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-[var(--lp-panel)] transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/40 disabled:pointer-events-none disabled:opacity-45",
    actionToneClass[tone],
    className,
  );
}

/* KPI card */
function StatCard({
  label,
  count,
  icon: Icon,
  accent,
}: {
  label: string;
  count: number | string;
  icon: LucideIcon;
  accent: "copper" | "emerald" | "steel" | "amber";
}) {
  const badge: Record<typeof accent, string> = {
    copper: "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
    steel: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  };
  return (
    <div className={cn("relative min-w-0 overflow-hidden rounded-2xl p-5", cardSurface, "hover:border-[var(--lp-line-strong)]")}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lp-mono break-words text-[10px] font-medium uppercase leading-4 tracking-[0.14em] text-[var(--lp-faint)]">
            {label}
          </p>
          <p className="lp-display mt-2 text-4xl font-bold text-[var(--lp-ink)]">{count}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", badge[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: "active" | "inactive" }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        active
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
          : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-[var(--lp-faint)]")} />
      {active ? "Active" : "Inactive / archived"}
    </span>
  );
}

function CountPill({
  count,
  tone,
  children,
}: {
  count: number;
  tone: "active" | "inactive";
  children: string;
}) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        tone === "active"
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
          : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "active" ? "bg-emerald-500" : "bg-[var(--lp-faint)]")} />
      {count} {children}
    </span>
  );
}

function StatusCluster({ group }: { group: CustomerMachineGroup }) {
  if (group.machines.length === 1) return <StatusPill status={group.primary.status} />;
  return (
    <span className="flex flex-wrap gap-1.5">
      <CountPill count={group.activeCount} tone="active">
        active
      </CountPill>
      <CountPill count={group.inactiveCount} tone="inactive">
        archived
      </CountPill>
    </span>
  );
}

function formatDate(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

function productLabel(machine: CustomerMachine) {
  return machine.productSnapshot?.name ?? machine.productId;
}

function productMeta(machine: CustomerMachine) {
  return machine.productSnapshot?.categorySlug ?? "Machine";
}

function serialUnitSummary(machine: CustomerMachine) {
  const parts = [
    machine.internalSerialNumber ? `Serial ${machine.internalSerialNumber}` : null,
    machine.unitNumber ? `Unit ${machine.unitNumber}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" / ") : "-";
}

function machineMoreLabel(group: CustomerMachineGroup) {
  const extra = group.machines.length - 1;
  if (extra <= 0) return null;
  return `+${extra} more ${extra === 1 ? "machine" : "machines"}`;
}

function groupByCustomer(machines: EnrichedMachine[]): CustomerMachineGroup[] {
  const map = new Map<string, EnrichedMachine[]>();
  for (const machine of machines) {
    const list = map.get(machine.customerId) ?? [];
    list.push(machine);
    map.set(machine.customerId, list);
  }

  return Array.from(map.entries())
    .map(([customerId, list]) => {
      const sorted = [...list].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      const primary = sorted[0];
      return {
        customerId,
        customer: primary.customer,
        machines: sorted,
        primary,
        activeCount: sorted.filter((m) => m.status === "active").length,
        inactiveCount: sorted.filter((m) => m.status === "inactive").length,
        lastUpdated: primary.updatedAt,
      };
    })
    .sort((a, b) => Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated));
}

function CardField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--lp-faint)]">{label}</p>
      <div className="mt-0.5 min-w-0 break-words text-sm text-[var(--lp-ink-soft)]">{children}</div>
    </div>
  );
}

/* Page */
const MachinesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const defaultCustomerId = searchParams.get("customerId") ?? undefined;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [productFilter, setProductFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerMachine | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<EnrichedMachine | null>(null);
  const [pendingMachineId, setPendingMachineId] = useState<string | null>(null);

  useEffect(() => {
    if (!defaultCustomerId) return;
    setEditing(null);
    setDialogOpen(true);
  }, [defaultCustomerId]);

  const machinesQuery = useQuery({
    queryKey: ["admin", "customer-machines"],
    queryFn: () => apiRequest<CustomerMachine[]>("/api/admin/customer-machines"),
  });
  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<AuthUser[]>("/api/admin/users"),
  });
  const productsQuery = useQuery({
    queryKey: ["catalog-products"],
    queryFn: () => apiRequest<CatalogProduct[]>("/api/catalog/products"),
  });

  const userMap = useMemo(() => {
    const map = new Map<string, AuthUser>();
    for (const u of usersQuery.data ?? []) map.set(u.id, u);
    return map;
  }, [usersQuery.data]);

  const enriched: EnrichedMachine[] = useMemo(
    () =>
      (machinesQuery.data ?? []).map((m) => {
        const u = userMap.get(m.customerId);
        return { ...m, customer: u ? { displayName: u.displayName, email: u.email } : null };
      }),
    [machinesQuery.data, userMap],
  );

  const stats = useMemo(() => {
    const active = enriched.filter((m) => m.status === "active");
    const inactive = enriched.filter((m) => m.status === "inactive");
    const customers = new Set(enriched.map((m) => m.customerId));
    return { total: enriched.length, active: active.length, inactive: inactive.length, customers: customers.size };
  }, [enriched]);

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const filteredMachines = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return enriched.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (productFilter !== "all" && m.productId !== productFilter) return false;
      if (!needle) return true;
      const haystack = [
        m.customer?.displayName,
        m.customer?.email,
        m.displayLabel,
        productLabel(m),
        m.productSnapshot?.categorySlug,
        m.internalSerialNumber,
        m.unitNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [enriched, search, statusFilter, productFilter]);

  const groups = useMemo(() => groupByCustomer(filteredMachines), [filteredMachines]);

  const statusMutation = useMutation({
    mutationFn: async ({ machine, action }: { machine: EnrichedMachine; action: "archive" | "reactivate" }) => {
      setPendingMachineId(machine.id);
      if (action === "archive") {
        await apiRequest(`/api/admin/customer-machines/${machine.id}`, { method: "DELETE" });
      } else {
        await apiRequest(`/api/admin/customer-machines/${machine.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
        });
      }
      return action;
    },
    onSuccess: async (action) => {
      toast.success(action === "archive" ? "Machine archived." : "Machine reactivated.");
      setConfirmArchive(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "customer-machines"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Could not update machine.");
    },
    onSettled: () => setPendingMachineId(null),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(machine: CustomerMachine) {
    setEditing(machine);
    setDialogOpen(true);
  }

  function onSaved() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "customer-machines"] });
  }

  function openCustomer(customerId: string) {
    navigate(`/app/machines/${customerId}`);
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, customerId: string) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCustomer(customerId);
    }
  }

  const isLoading = machinesQuery.isLoading || usersQuery.isLoading;
  const emptyText = enriched.length === 0 ? "No machines linked yet." : "No machines match your filters.";

  const renderActions = (group: CustomerMachineGroup) => {
    const machine = group.primary;
    const pending = pendingMachineId === machine.id;
    const active = machine.status === "active";
    return (
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          className={actionClasses("view")}
          title={`View details for ${group.customer?.displayName ?? "customer"}`}
          aria-label={`View details for ${group.customer?.displayName ?? "customer"}`}
          onClick={(event) => {
            event.stopPropagation();
            openCustomer(group.customerId);
          }}
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={actionClasses("edit")}
          title={`Edit ${machine.displayLabel}`}
          aria-label={`Edit ${machine.displayLabel}`}
          onClick={(event) => {
            event.stopPropagation();
            openEdit(machine);
          }}
        >
          <Pencil className="h-4 w-4" />
        </button>
        {active ? (
          <Link
            to={`/app/requests/new?customerId=${machine.customerId}&machineId=${machine.id}`}
            className={actionClasses("request")}
            title={`Create request for ${machine.displayLabel}`}
            aria-label={`Create request for ${machine.displayLabel}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Wrench className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            className={actionClasses("request")}
            title="Reactivate this machine before creating a request"
            aria-label="Reactivate this machine before creating a request"
            disabled
            onClick={(event) => event.stopPropagation()}
          >
            <Wrench className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          className={actionClasses(active ? "archive" : "reactivate")}
          title={active ? `Archive ${machine.displayLabel}` : `Reactivate ${machine.displayLabel}`}
          aria-label={active ? `Archive ${machine.displayLabel}` : `Reactivate ${machine.displayLabel}`}
          disabled={pending}
          onClick={(event) => {
            event.stopPropagation();
            if (active) setConfirmArchive(machine);
            else statusMutation.mutate({ machine, action: "reactivate" });
          }}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : active ? (
            <Archive className="h-4 w-4" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-7xl min-w-0 space-y-5 overflow-x-hidden">
      {/* Header */}
      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <HardDrive className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="lp-display break-words text-2xl font-bold text-[var(--lp-ink)] sm:text-3xl">Customer Machines</h1>
            <p className="mt-0.5 text-sm text-[var(--lp-ink-soft)]">
              Link machines to customers and manage installed equipment.
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 shrink-0 rounded-full bg-[var(--lp-accent)] px-5 text-sm font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
        >
          <Plus className="h-4 w-4" />
          Add machine
        </Button>
      </header>

      {/* KPIs */}
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total machines" count={stats.total} icon={HardDrive} accent="copper" />
        <StatCard label="Active" count={stats.active} icon={Wrench} accent="emerald" />
        <StatCard label="Customers with machines" count={stats.customers} icon={Users} accent="steel" />
        <StatCard label="Inactive / archived" count={stats.inactive} icon={Archive} accent="amber" />
      </div>

      {/* Filters */}
      <div className={cn("grid min-w-0 gap-3 rounded-2xl p-3.5 lg:grid-cols-[minmax(0,1fr)_auto]", cardSurface)}>
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, email, product, serial"
            className="bg-background pl-9"
          />
        </div>
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm text-[var(--lp-ink)] sm:min-w-[150px]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive / archived</option>
          </select>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="h-10 min-w-0 rounded-md border border-input bg-background px-3 text-sm text-[var(--lp-ink)] sm:min-w-[190px] lg:max-w-[240px]"
          >
            <option value="all">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table - desktop */}
      <div className={cn("hidden min-w-0 overflow-hidden rounded-2xl xl:block", cardSurface)}>
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: "22%" }} />
            <col style={{ width: "24%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-[var(--lp-line)] text-left">
              {["Customer", "Machine summary", "Serial / Unit", "Status", "Updated", "Actions"].map((h) => (
                <th
                  key={h}
                  className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lp-faint)]",
                    h === "Actions" && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-[var(--lp-faint)]">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <CircleSlash className="mx-auto mb-2 h-6 w-6 text-[var(--lp-faint)]" />
                  <p className="text-sm text-[var(--lp-ink-soft)]">{emptyText}</p>
                </td>
              </tr>
            ) : (
              groups.map((group) => {
                const moreLabel = machineMoreLabel(group);
                return (
                  <tr
                    key={group.customerId}
                    role="link"
                    tabIndex={0}
                    onClick={() => openCustomer(group.customerId)}
                    onKeyDown={(event) => onRowKeyDown(event, group.customerId)}
                    className="cursor-pointer border-b border-[var(--lp-line)] align-top transition-colors last:border-b-0 hover:bg-[var(--lp-panel-2)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--lp-accent)]/35"
                  >
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="block truncate font-medium text-[var(--lp-ink)]"
                            title={group.customer?.displayName ?? undefined}
                          >
                            {group.customer?.displayName ?? "Unknown customer"}
                          </span>
                          {group.machines.length > 1 && (
                            <span className="shrink-0 rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--lp-ink-soft)]">
                              {group.machines.length}
                            </span>
                          )}
                        </div>
                        <span
                          className="block truncate text-xs text-[var(--lp-faint)]"
                          title={group.customer?.email ?? group.customerId}
                        >
                          {group.customer?.email ?? group.customerId}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block truncate text-[var(--lp-ink)]" title={group.primary.displayLabel}>
                        {group.primary.displayLabel}
                      </span>
                      <span className="block truncate text-xs text-[var(--lp-faint)]" title={productLabel(group.primary)}>
                        {productLabel(group.primary)}
                      </span>
                      {moreLabel && <span className="mt-1 block text-xs font-medium text-[var(--lp-accent)]">{moreLabel}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block truncate text-[var(--lp-ink-soft)]" title={serialUnitSummary(group.primary)}>
                        {serialUnitSummary(group.primary)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusCluster group={group} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--lp-faint)]">{formatDate(group.lastUpdated)}</td>
                    <td className="px-4 py-3">{renderActions(group)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards - tablet / mobile */}
      <div className="space-y-3 xl:hidden">
        {isLoading ? (
          <div className={cn("flex justify-center rounded-2xl py-12", cardSurface)}>
            <Loader2 className="h-5 w-5 animate-spin text-[var(--lp-faint)]" />
          </div>
        ) : groups.length === 0 ? (
          <div className={cn("rounded-2xl py-12 text-center", cardSurface)}>
            <CircleSlash className="mx-auto mb-2 h-6 w-6 text-[var(--lp-faint)]" />
            <p className="text-sm text-[var(--lp-ink-soft)]">{emptyText}</p>
          </div>
        ) : (
          groups.map((group) => {
            const moreLabel = machineMoreLabel(group);
            return (
              <article
                key={group.customerId}
                role="link"
                tabIndex={0}
                onClick={() => openCustomer(group.customerId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCustomer(group.customerId);
                  }
                }}
                className={cn(
                  "min-w-0 cursor-pointer rounded-2xl p-4 transition-colors hover:border-[var(--lp-line-strong)] hover:bg-[var(--lp-panel-2)]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/35",
                  cardSurface,
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate font-medium text-[var(--lp-ink)]">
                        {group.customer?.displayName ?? "Unknown customer"}
                      </span>
                      {group.machines.length > 1 && (
                        <span className="shrink-0 rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--lp-ink-soft)]">
                          {group.machines.length} machines
                        </span>
                      )}
                    </div>
                    <span className="block truncate text-xs text-[var(--lp-faint)]">
                      {group.customer?.email ?? group.customerId}
                    </span>
                  </div>
                  <StatusCluster group={group} />
                </div>
                <div className="mt-3 grid min-w-0 grid-cols-1 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-2">
                  <CardField label="Machine">{group.primary.displayLabel}</CardField>
                  <CardField label="Product">
                    <span className="block">{productLabel(group.primary)}</span>
                    <span className="text-xs text-[var(--lp-faint)]">{productMeta(group.primary)}</span>
                  </CardField>
                  <CardField label="Serial / Unit">{serialUnitSummary(group.primary)}</CardField>
                  <CardField label="Updated">{formatDate(group.lastUpdated)}</CardField>
                  {moreLabel && (
                    <CardField label="Additional machines" className="sm:col-span-2">
                      <span className="text-[var(--lp-accent)]">{moreLabel}</span>
                    </CardField>
                  )}
                </div>
                <div className="mt-3 flex justify-end border-t border-[var(--lp-line)] pt-2.5" onClick={(event) => event.stopPropagation()}>
                  {renderActions(group)}
                </div>
              </article>
            );
          })
        )}
      </div>

      <MachineFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customers={usersQuery.data ?? []}
        products={products}
        editing={editing}
        defaultCustomerId={defaultCustomerId}
        onSaved={onSaved}
      />

      <AlertDialog
        open={confirmArchive !== null}
        onOpenChange={(open) => {
          if (!open && !statusMutation.isPending) setConfirmArchive(null);
        }}
      >
        <AlertDialogContent className="border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this machine?</AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--lp-ink-soft)]">
              This machine will no longer be available for new customer service requests. Existing request history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={statusMutation.isPending}
              className="border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink-soft)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={statusMutation.isPending}
              className="border border-amber-400/40 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-200"
              onClick={(event) => {
                event.preventDefault();
                if (confirmArchive) statusMutation.mutate({ machine: confirmArchive, action: "archive" });
              }}
            >
              {statusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Archive machine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MachinesPage;
