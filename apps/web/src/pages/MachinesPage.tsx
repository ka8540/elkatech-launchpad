import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Archive,
  CircleSlash,
  HardDrive,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AuthUser,
  CatalogProduct,
  CustomerMachine,
} from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MachineFormDialog from "@/components/MachineFormDialog";

const cardSurface = "lp-card border";

type EnrichedMachine = CustomerMachine & {
  customer: { displayName: string; email: string } | null;
};

/* ─── KPI card ─────────────────────────────────────────────────────────────── */
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
    <div className={cn("relative overflow-hidden rounded-2xl p-5", cardSurface, "hover:border-[var(--lp-line-strong)]")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lp-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--lp-faint)]">
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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        status === "active"
          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
          : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", status === "active" ? "bg-emerald-500" : "bg-[var(--lp-faint)]")} />
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

/* ─── Detail drawer ───────────────────────────────────────────────────────── */
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--lp-line)] py-2 last:border-b-0">
      <span className="shrink-0 text-xs text-[var(--lp-faint)]">{label}</span>
      <span className="min-w-0 break-words text-right text-sm text-[var(--lp-ink)]">{value || "—"}</span>
    </div>
  );
}

function MachineDetailDrawer({
  machine,
  onClose,
  onEdit,
}: {
  machine: EnrichedMachine;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-md overflow-y-auto border-l border-[var(--lp-line)] bg-[var(--lp-panel)] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
              Machine
            </p>
            <h2 className="lp-display mt-1 break-words text-lg font-bold text-[var(--lp-ink)]">
              {machine.displayLabel}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--lp-faint)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-3">
          <StatusPill status={machine.status} />
        </div>

        <section className="mb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--lp-faint)]">Customer</p>
          <DetailRow label="Name" value={machine.customer?.displayName} />
          <DetailRow label="Email" value={machine.customer?.email} />
        </section>

        <section className="mb-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--lp-faint)]">Machine</p>
          <DetailRow label="Product" value={machine.productSnapshot?.name ?? machine.productId} />
          <DetailRow label="Unit" value={machine.unitNumber} />
          <DetailRow label="Serial number" value={machine.internalSerialNumber} />
          <DetailRow label="Location" value={machine.siteLocation} />
          <DetailRow label="Contact phone" value={machine.contactPhone} />
          <DetailRow label="Installed" value={machine.installDate ? formatDate(machine.installDate) : null} />
          <DetailRow label="Notes" value={machine.notes} />
          <DetailRow label="Last updated" value={formatDate(machine.updatedAt)} />
        </section>

        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            disabled={machine.status !== "active"}
            className="bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
          >
            <Link to={`/app/requests/new?customerId=${machine.customerId}&machineId=${machine.id}`}>
              <Wrench className="h-4 w-4" />
              Create request
            </Link>
          </Button>
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
const MachinesPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [productFilter, setProductFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerMachine | null>(null);
  const [detail, setDetail] = useState<EnrichedMachine | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

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
    const customers = new Set(active.map((m) => m.customerId));
    return { total: enriched.length, active: active.length, inactive: inactive.length, customers: customers.size };
  }, [enriched]);

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return enriched.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (productFilter !== "all" && m.productId !== productFilter) return false;
      if (!needle) return true;
      const haystack = [
        m.customer?.displayName,
        m.customer?.email,
        m.displayLabel,
        m.productSnapshot?.name,
        m.internalSerialNumber,
        m.siteLocation,
        m.contactPhone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [enriched, search, statusFilter, productFilter]);

  async function toggleStatus(machine: CustomerMachine) {
    setPendingId(machine.id);
    try {
      if (machine.status === "active") {
        await apiRequest(`/api/admin/customer-machines/${machine.id}`, { method: "DELETE" });
        toast.success("Machine archived.");
      } else {
        await apiRequest(`/api/admin/customer-machines/${machine.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
        });
        toast.success("Machine reactivated.");
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "customer-machines"] });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update machine.");
    } finally {
      setPendingId(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(machine: CustomerMachine) {
    setEditing(machine);
    setDetail(null);
    setDialogOpen(true);
  }
  function onSaved() {
    void queryClient.invalidateQueries({ queryKey: ["admin", "customer-machines"] });
  }

  const isLoading = machinesQuery.isLoading || usersQuery.isLoading;

  return (
    <div className="mx-auto max-w-7xl min-w-0 space-y-5 overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)] sm:text-3xl">Customer Machines</h1>
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total machines" count={stats.total} icon={HardDrive} accent="copper" />
        <StatCard label="Active" count={stats.active} icon={Wrench} accent="emerald" />
        <StatCard label="Customers with machines" count={stats.customers} icon={Users} accent="steel" />
        <StatCard label="Inactive / archived" count={stats.inactive} icon={Archive} accent="amber" />
      </div>

      {/* Filters */}
      <div className={cn("flex flex-col gap-3 rounded-2xl p-3.5 sm:flex-row sm:items-center", cardSurface)}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, email, product, serial, location…"
            className="bg-background pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm text-[var(--lp-ink)]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="h-10 max-w-[200px] rounded-md border border-input bg-background px-3 text-sm text-[var(--lp-ink)]"
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

      {/* Table */}
      <div className={cn("overflow-hidden rounded-2xl", cardSurface)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--lp-line)] text-left">
                {["Customer", "Machine / Product", "Serial", "Location", "Contact", "Status", "Updated", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lp-faint)]"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[var(--lp-faint)]">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <CircleSlash className="mx-auto mb-2 h-6 w-6 text-[var(--lp-faint)]" />
                    <p className="text-sm text-[var(--lp-ink-soft)]">
                      {enriched.length === 0 ? "No machines linked yet." : "No machines match your filters."}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-[var(--lp-line)] transition-colors last:border-b-0 hover:bg-[var(--lp-panel-2)]/50"
                  >
                    <td className="px-4 py-3">
                      <button onClick={() => setDetail(m)} className="text-left">
                        <span className="block font-medium text-[var(--lp-ink)] hover:text-[var(--lp-accent)]">
                          {m.customer?.displayName ?? "Unknown"}
                        </span>
                        <span className="block text-xs text-[var(--lp-faint)]">{m.customer?.email ?? m.customerId}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-[var(--lp-ink)]">{m.displayLabel}</span>
                      <span className="block text-xs text-[var(--lp-faint)]">
                        {m.productSnapshot?.name ?? m.productId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--lp-ink-soft)]">{m.internalSerialNumber || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-[var(--lp-ink-soft)]">
                        <MapPin className="h-3 w-3 shrink-0 text-[var(--lp-faint)]" />
                        <span className="truncate">{m.siteLocation}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {m.contactPhone ? (
                        <span className="flex items-center gap-1 text-[var(--lp-ink-soft)]">
                          <Phone className="h-3 w-3 shrink-0 text-[var(--lp-faint)]" />
                          {m.contactPhone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--lp-faint)]">{formatDate(m.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {m.status === "active" && (
                          <Button
                            asChild
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[var(--lp-ink-soft)] hover:text-[var(--lp-accent)]"
                            title="Create request"
                          >
                            <Link to={`/app/requests/new?customerId=${m.customerId}&machineId=${m.id}`}>
                              <Wrench className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-[var(--lp-ink-soft)] hover:text-[var(--lp-accent)]"
                          title="Edit"
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-[var(--lp-ink-soft)] hover:text-[var(--lp-ink)]"
                          title={m.status === "active" ? "Archive" : "Reactivate"}
                          disabled={pendingId === m.id}
                          onClick={() => toggleStatus(m)}
                        >
                          {pendingId === m.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : m.status === "active" ? (
                            <Archive className="h-4 w-4" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MachineFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customers={usersQuery.data ?? []}
        products={products}
        editing={editing}
        onSaved={onSaved}
      />

      {detail && (
        <MachineDetailDrawer machine={detail} onClose={() => setDetail(null)} onEdit={() => openEdit(detail)} />
      )}
    </div>
  );
};

export default MachinesPage;
