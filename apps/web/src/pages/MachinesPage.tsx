import { useMemo, useState, type ReactNode } from "react";
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

/** Labelled key/value used in the mobile machine cards. */
function CardField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--lp-faint)]">
        {label}
      </p>
      <div className="mt-0.5 break-words text-[var(--lp-ink-soft)]">{children}</div>
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

  // Row actions — shared between the desktop table and the mobile cards.
  const renderActions = (m: EnrichedMachine) => (
    <div className="flex items-center gap-0.5">
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
  );

  const emptyText =
    enriched.length === 0 ? "No machines linked yet." : "No machines match your filters.";

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total machines" count={stats.total} icon={HardDrive} accent="copper" />
        <StatCard label="Active" count={stats.active} icon={Wrench} accent="emerald" />
        <StatCard label="Customers with machines" count={stats.customers} icon={Users} accent="steel" />
        <StatCard label="Inactive / archived" count={stats.inactive} icon={Archive} accent="amber" />
      </div>

      {/* Filters */}
      <div className={cn("flex flex-col gap-3 rounded-2xl p-3.5 sm:flex-row sm:flex-wrap sm:items-center", cardSurface)}>
        <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, email, product, serial, location…"
            className="bg-background pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 min-w-[130px] rounded-md border border-input bg-background px-3 text-sm text-[var(--lp-ink)]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="h-10 w-full min-w-[150px] max-w-full rounded-md border border-input bg-background px-3 text-sm text-[var(--lp-ink)] sm:w-auto sm:max-w-[220px]"
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

      {/* Table — desktop. table-fixed + colgroup keeps every column inside the
          card width and truncates long values, so the card never scrolls or
          clips horizontally. Stacked cards take over below lg. */}
      <div className={cn("hidden overflow-hidden rounded-2xl lg:block", cardSurface)}>
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "120px" }} />
          </colgroup>
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
                  <p className="text-sm text-[var(--lp-ink-soft)]">{emptyText}</p>
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-[var(--lp-line)] align-top transition-colors last:border-b-0 hover:bg-[var(--lp-panel-2)]/50"
                >
                  <td className="px-4 py-3">
                    <button onClick={() => setDetail(m)} className="block w-full min-w-0 text-left">
                      <span
                        className="block truncate font-medium text-[var(--lp-ink)] hover:text-[var(--lp-accent)]"
                        title={m.customer?.displayName ?? undefined}
                      >
                        {m.customer?.displayName ?? "Unknown"}
                      </span>
                      <span
                        className="block truncate text-xs text-[var(--lp-faint)]"
                        title={m.customer?.email ?? m.customerId}
                      >
                        {m.customer?.email ?? m.customerId}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block truncate text-[var(--lp-ink)]" title={m.displayLabel}>
                      {m.displayLabel}
                    </span>
                    <span
                      className="block truncate text-xs text-[var(--lp-faint)]"
                      title={m.productSnapshot?.name ?? m.productId}
                    >
                      {m.productSnapshot?.name ?? m.productId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="block truncate text-[var(--lp-ink-soft)]"
                      title={m.internalSerialNumber || undefined}
                    >
                      {m.internalSerialNumber || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="flex min-w-0 items-center gap-1 text-[var(--lp-ink-soft)]"
                      title={m.siteLocation}
                    >
                      <MapPin className="h-3 w-3 shrink-0 text-[var(--lp-faint)]" />
                      <span className="truncate">{m.siteLocation}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {m.contactPhone ? (
                      <span
                        className="flex min-w-0 items-center gap-1 text-[var(--lp-ink-soft)]"
                        title={m.contactPhone}
                      >
                        <Phone className="h-3 w-3 shrink-0 text-[var(--lp-faint)]" />
                        <span className="truncate">{m.contactPhone}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={m.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--lp-faint)]">{formatDate(m.updatedAt)}</td>
                  <td className="px-2 py-3">{renderActions(m)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Cards — tablet / mobile (no horizontal scroll) */}
      <div className="space-y-3 lg:hidden">
        {isLoading ? (
          <div className={cn("flex justify-center rounded-2xl py-12", cardSurface)}>
            <Loader2 className="h-5 w-5 animate-spin text-[var(--lp-faint)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={cn("rounded-2xl py-12 text-center", cardSurface)}>
            <CircleSlash className="mx-auto mb-2 h-6 w-6 text-[var(--lp-faint)]" />
            <p className="text-sm text-[var(--lp-ink-soft)]">{emptyText}</p>
          </div>
        ) : (
          filtered.map((m) => (
            <div key={m.id} className={cn("rounded-2xl p-4", cardSurface)}>
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => setDetail(m)} className="min-w-0 text-left">
                  <span
                    className="block truncate font-medium text-[var(--lp-ink)]"
                    title={m.customer?.displayName ?? undefined}
                  >
                    {m.customer?.displayName ?? "Unknown"}
                  </span>
                  <span
                    className="block truncate text-xs text-[var(--lp-faint)]"
                    title={m.customer?.email ?? m.customerId}
                  >
                    {m.customer?.email ?? m.customerId}
                  </span>
                </button>
                <StatusPill status={m.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                <CardField label="Machine">{m.displayLabel}</CardField>
                <CardField label="Product">{m.productSnapshot?.name ?? m.productId}</CardField>
                <CardField label="Serial">{m.internalSerialNumber || "—"}</CardField>
                <CardField label="Updated">{formatDate(m.updatedAt)}</CardField>
                <CardField label="Location" className="col-span-2">
                  <span className="flex items-start gap-1">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[var(--lp-faint)]" />
                    {m.siteLocation}
                  </span>
                </CardField>
                <CardField label="Contact" className="col-span-2">
                  {m.contactPhone ? (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0 text-[var(--lp-faint)]" />
                      {m.contactPhone}
                    </span>
                  ) : (
                    "—"
                  )}
                </CardField>
              </div>
              <div className="mt-3 flex justify-end border-t border-[var(--lp-line)] pt-2.5">
                {renderActions(m)}
              </div>
            </div>
          ))
        )}
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
