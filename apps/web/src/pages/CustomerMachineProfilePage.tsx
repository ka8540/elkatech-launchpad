import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, type LinkProps } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  Eye,
  HardDrive,
  History,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AuthUser,
  CatalogProduct,
  CustomerMachine,
  CustomerProfile,
  ServiceRequest,
} from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getRequestStatusLabel, REQUEST_STATUS_BADGE_CLASSES } from "@/lib/request-status";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MachineFormDialog from "@/components/MachineFormDialog";

const cardSurface = "lp-card border";

type ProfileResponse = { user: AuthUser; profile: CustomerProfile };
type MachineActionTone = "view" | "edit" | "request" | "archive" | "reactivate" | "neutral";

const machineActionClass: Record<MachineActionTone, string> = {
  view: "border-[var(--lp-line-strong)] bg-transparent text-[var(--lp-ink-soft)] hover:border-[var(--lp-line-strong)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]",
  edit: "border-[var(--lp-line-strong)] bg-transparent text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/55 hover:bg-[var(--lp-accent)]/10 hover:text-[var(--lp-accent)]",
  request: "border-emerald-400/30 bg-emerald-400/10 text-emerald-700 hover:border-emerald-400/55 hover:bg-emerald-400/15 dark:text-emerald-200",
  archive: "border-amber-400/30 bg-transparent text-amber-700 hover:border-amber-400/55 hover:bg-amber-400/10 dark:text-amber-200",
  reactivate: "border-emerald-400/35 bg-transparent text-emerald-700 hover:border-emerald-400/60 hover:bg-emerald-400/10 dark:text-emerald-200",
  neutral: "border-[var(--lp-line-strong)] bg-transparent text-[var(--lp-ink-soft)] hover:border-[var(--lp-line-strong)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]",
};

const priorityClasses: Record<string, string> = {
  low: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
  normal: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  high: "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  urgent: "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300",
};

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function accountOriginLabel(origin?: string) {
  if (!origin) return "-";
  return origin
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function approvalLabel(status?: string) {
  if (!status) return "-";
  if (status === "pending_approval") return "Pending approval";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function profileAddress(profile?: CustomerProfile | null) {
  if (!profile) return null;
  const locality = [profile.city, profile.state, profile.postalCode].filter(Boolean).join(", ");
  return [profile.addressLine1, profile.addressLine2, locality, profile.country].filter(Boolean).join(", ");
}

function productLabel(machine: CustomerMachine) {
  return machine.productSnapshot?.name ?? machine.productId;
}

function productCategory(machine: CustomerMachine) {
  return machine.productSnapshot?.categorySlug ?? machine.productId;
}

function machineLabel(machine: CustomerMachine | undefined) {
  if (!machine) return "Machine";
  return machine.displayLabel || productLabel(machine);
}

function isOpenRequest(request: ServiceRequest) {
  return request.status !== "resolved" && request.status !== "closed";
}

function sortByUpdated<T extends { updatedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

function DetailLine({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm text-[var(--lp-ink)]">{value || "-"}</dd>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "copper",
}: {
  label: string;
  value: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "copper" | "emerald" | "amber" | "steel";
}) {
  const accentClass = {
    copper: "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
    steel: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  }[accent];

  return (
    <div className={cn("min-w-0 rounded-2xl p-4", cardSurface)}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="lp-mono break-words text-[10px] font-medium uppercase leading-4 tracking-[0.14em] text-[var(--lp-faint)]">
            {label}
          </p>
          <p className="mt-2 min-w-0 break-words text-2xl font-bold text-[var(--lp-ink)]">{value}</p>
        </div>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", accentClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function MachineStatusBadge({ status }: { status: CustomerMachine["status"] }) {
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
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RequestStatusBadge({ request }: { request: ServiceRequest }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", REQUEST_STATUS_BADGE_CLASSES[request.status])}>
      {getRequestStatusLabel(request.status)}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize", priorityClasses[priority] ?? priorityClasses.normal)}>
      {priority}
    </span>
  );
}

function IconActionButton({
  tone,
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: MachineActionTone;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/40 disabled:pointer-events-none disabled:opacity-45",
        machineActionClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function CompactActionButton({
  tone,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: MachineActionTone;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/40 disabled:pointer-events-none disabled:opacity-45",
        machineActionClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function CompactActionLink({
  tone,
  children,
  className,
  ...props
}: LinkProps & {
  tone: MachineActionTone;
}) {
  return (
    <Link
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/40",
        machineActionClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

function DrawerFact({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--lp-faint)]">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm leading-5 text-[var(--lp-ink)]">{value || "-"}</dd>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--lp-faint)]">{label}</dt>
      <dd className="min-w-0 text-sm leading-5 text-[var(--lp-ink)]">
        {value ? (
          <span className="flex min-w-0 items-start gap-1.5">
            {icon}
            <span className="min-w-0 break-words">{value}</span>
          </span>
        ) : (
          "-"
        )}
      </dd>
    </div>
  );
}

function DrawerDisclosure({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[var(--lp-line)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 py-3 text-left transition-colors hover:text-[var(--lp-ink)]"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">{title}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[var(--lp-faint)] transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </section>
  );
}

function MachineMoreMenu({
  machine,
  pending,
  align = "end",
  buttonClassName,
  onArchive,
  onReactivate,
}: {
  machine: CustomerMachine;
  pending: boolean;
  align?: "start" | "center" | "end";
  buttonClassName?: string;
  onArchive: (machine: CustomerMachine) => void;
  onReactivate: (machine: CustomerMachine) => void;
}) {
  const active = machine.status === "active";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconActionButton
          tone="neutral"
          label={`More actions for ${machine.displayLabel}`}
          disabled={pending}
          className={cn("h-8 w-8", buttonClassName)}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </IconActionButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="lp-portal z-[1001] w-48 rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel)] p-1 text-[var(--lp-ink)] shadow-xl"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-semibold text-[var(--lp-faint)]">
          <span className="text-xs text-[var(--lp-faint)]">Machine actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[var(--lp-line)]" />
        {active ? (
          <DropdownMenuItem
            disabled={pending}
            className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm text-amber-700 focus:bg-amber-400/10 focus:text-amber-700 dark:text-amber-200 dark:focus:text-amber-100"
            onSelect={() => {
              onArchive(machine);
            }}
          >
            <Archive className="h-4 w-4" />
            Archive machine
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={pending}
            className="cursor-pointer gap-2 rounded-lg px-2.5 py-2 text-sm text-emerald-700 focus:bg-emerald-400/10 focus:text-emerald-700 dark:text-emerald-200 dark:focus:text-emerald-100"
            onSelect={() => {
              onReactivate(machine);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reactivate machine
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MachineDetailDrawer({
  machine,
  requests,
  pending,
  onClose,
  onEdit,
  onArchive,
  onReactivate,
}: {
  machine: CustomerMachine | null;
  requests: ServiceRequest[];
  pending: boolean;
  onClose: () => void;
  onEdit: (machine: CustomerMachine) => void;
  onArchive: (machine: CustomerMachine) => void;
  onReactivate: (machine: CustomerMachine) => void;
}) {
  const [productOpen, setProductOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!machine || typeof document === "undefined") return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [machine]);

  useEffect(() => {
    if (!machine || typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [machine]);

  useEffect(() => {
    if (!machine || typeof document === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [machine, onClose]);

  if (!machine) return null;
  const active = machine.status === "active";
  const portalTarget = typeof document === "undefined" ? null : document.body;
  if (!portalTarget) return null;

  return createPortal(
    <div
      // `lp-portal` re-declares the graphite/copper tokens for this Radix-style
      // body portal (which renders outside the `.lp` subtree). Without it the
      // --lp-* variables are undefined here, so backgrounds collapse to
      // transparent and borders fall back to currentColor (bright white).
      className="lp-portal fixed inset-0 z-[1000] flex h-screen w-screen justify-end overflow-hidden text-[var(--lp-ink)] [height:100dvh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="machine-details-title"
    >
      <button
        type="button"
        aria-label="Close machine details"
        className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-[3px]"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 flex h-screen w-screen max-w-none flex-col border-l border-[var(--lp-line-strong)] bg-[var(--lp-panel)] shadow-2xl [height:100dvh] sm:w-[min(520px,100vw)] sm:max-w-[520px]">
        <header className="shrink-0 border-b border-[var(--lp-line)] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                Machine details
              </p>
              <h2 id="machine-details-title" className="lp-display mt-1 truncate text-xl font-bold text-[var(--lp-ink)]">
                {machine.displayLabel || productLabel(machine)}
              </h2>
              <p className="mt-1 truncate text-sm text-[var(--lp-ink-soft)]">
                {productLabel(machine)} · {productCategory(machine)}
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close machine details"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--lp-line-strong)] text-[var(--lp-ink-soft)] transition-colors hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3">
            <MachineStatusBadge status={machine.status} />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-4">
            <section className="rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/25 p-3.5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">Quick facts</h3>
              </div>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                <DrawerFact label="Product" value={productLabel(machine)} />
                <DrawerFact label="Category" value={productCategory(machine)} />
                <DrawerFact label="Nickname" value={machine.displayLabel} />
                <DrawerFact label="Unit" value={machine.unitNumber} />
                <DrawerFact label="Serial" value={machine.internalSerialNumber} />
                <DrawerFact label="Status" value={active ? "Active" : "Inactive / archived"} />
              </dl>
            </section>

            <section>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">Installation</h3>
              <dl className="divide-y divide-[var(--lp-line)]">
                <InfoRow
                  label="Location"
                  value={machine.siteLocation}
                  icon={<MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lp-faint)]" />}
                />
                <InfoRow
                  label="Contact"
                  value={machine.contactPhone}
                  icon={<Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lp-faint)]" />}
                />
                <InfoRow label="Installed" value={formatDate(machine.installDate)} />
              </dl>
            </section>

            <DrawerDisclosure title="Product snapshot" open={productOpen} onToggle={() => setProductOpen((open) => !open)}>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-3 rounded-xl bg-[var(--lp-panel-2)]/25 p-3 sm:grid-cols-2">
                <DrawerFact label="Product ID" value={machine.productSnapshot?.id ?? machine.productId} />
                <DrawerFact label="Slug" value={machine.productSnapshot?.slug} />
                <DrawerFact label="Price" value={machine.productSnapshot?.priceDisplay} />
                <DrawerFact label="Category" value={machine.productSnapshot?.categorySlug} />
              </dl>
            </DrawerDisclosure>

            <DrawerDisclosure title="Audit & notes" open={auditOpen} onToggle={() => setAuditOpen((open) => !open)}>
              <dl className="grid gap-3 rounded-xl bg-[var(--lp-panel-2)]/25 p-3 sm:grid-cols-2">
                <DrawerFact label="Created by" value="Not captured" />
                <DrawerFact label="Created at" value={formatDateTime(machine.createdAt)} />
                <DrawerFact label="Updated at" value={formatDateTime(machine.updatedAt)} />
                <DrawerFact label="Internal notes" value={machine.notes} />
              </dl>
            </DrawerDisclosure>

            <section className="border-t border-[var(--lp-line)] pt-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">Related service requests</h3>
              {requests.length === 0 ? (
                <p className="mt-2 rounded-lg bg-[var(--lp-panel-2)]/30 px-3 py-2 text-sm text-[var(--lp-ink-soft)]">
                  No service requests found yet.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {requests.slice(0, 5).map((request) => (
                    <Link
                      key={request.id}
                      to={`/app/requests/${request.id}`}
                      className="block rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/25 p-2.5 transition-colors hover:border-[var(--lp-accent)]/45"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[var(--lp-ink)]">{request.requestNumber}</span>
                          <span className="mt-1 block truncate text-xs text-[var(--lp-ink-soft)]">{request.subject}</span>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-[var(--lp-faint)]" />
                      </div>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <RequestStatusBadge request={request} />
                        <PriorityBadge priority={request.priority} />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--lp-line)] px-4 py-3">
          {active && (
            <CompactActionLink
              tone="request"
              to={`/app/requests/new?customerId=${machine.customerId}&machineId=${machine.id}`}
              className="h-8"
            >
              <Wrench className="h-3.5 w-3.5" />
              Create request
            </CompactActionLink>
          )}
          <CompactActionButton tone="edit" onClick={() => onEdit(machine)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit machine
          </CompactActionButton>
          <MachineMoreMenu
            machine={machine}
            pending={pending}
            onArchive={onArchive}
            onReactivate={onReactivate}
          />
        </footer>
      </aside>
    </div>,
    portalTarget,
  );
}

const CustomerMachineProfilePage = () => {
  const { customerId = "" } = useParams();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerMachine | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<CustomerMachine | null>(null);
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  const [pendingMachineId, setPendingMachineId] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["admin", "user", customerId, "profile"],
    queryFn: () => apiRequest<ProfileResponse>(`/api/admin/users/${customerId}/profile`),
    enabled: Boolean(customerId),
  });

  const machinesQuery = useQuery({
    queryKey: ["admin", "user", customerId, "machines"],
    queryFn: () => apiRequest<CustomerMachine[]>(`/api/admin/users/${customerId}/machines`),
    enabled: Boolean(customerId),
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<AuthUser[]>("/api/admin/users"),
  });

  const productsQuery = useQuery({
    queryKey: ["catalog-products"],
    queryFn: () => apiRequest<CatalogProduct[]>("/api/catalog/products"),
  });

  const requestsQuery = useQuery({
    queryKey: ["admin", "requests", "machine-profile-history"],
    queryFn: async () => {
      const [active, archived] = await Promise.all([
        apiRequest<ServiceRequest[]>("/api/requests?statusGroup=all"),
        apiRequest<ServiceRequest[]>("/api/requests?statusGroup=archived"),
      ]);
      const byId = new Map<string, ServiceRequest>();
      for (const request of [...active, ...archived]) byId.set(request.id, request);
      return sortByUpdated(Array.from(byId.values()));
    },
  });

  const customer = profileQuery.data?.user ?? usersQuery.data?.find((user) => user.id === customerId) ?? null;
  const profile = profileQuery.data?.profile ?? null;
  const machines = useMemo(() => sortByUpdated(machinesQuery.data ?? []), [machinesQuery.data]);
  const activeMachines = useMemo(() => machines.filter((machine) => machine.status === "active"), [machines]);
  const inactiveMachines = useMemo(() => machines.filter((machine) => machine.status === "inactive"), [machines]);
  const machineMap = useMemo(() => new Map(machines.map((machine) => [machine.id, machine])), [machines]);
  const userMap = useMemo(() => new Map((usersQuery.data ?? []).map((user) => [user.id, user])), [usersQuery.data]);

  const relatedRequests = useMemo(
    () => (requestsQuery.data ?? []).filter((request) => request.customerId === customerId),
    [requestsQuery.data, customerId],
  );
  const openRequests = useMemo(() => relatedRequests.filter(isOpenRequest), [relatedRequests]);
  const lastServiceActivity = relatedRequests[0]?.updatedAt ?? null;
  const latestMachineUpdate = machines[0]?.updatedAt ?? null;
  const lastCustomerActivity = lastServiceActivity ?? latestMachineUpdate ?? profile?.profileCompletedAt ?? customer?.createdAt ?? null;
  const createRequestTo = activeMachines[0]
    ? `/app/requests/new?customerId=${customerId}&machineId=${activeMachines[0].id}`
    : `/app/requests/new?customerId=${customerId}`;
  const selectedMachine = selectedMachineId ? machines.find((machine) => machine.id === selectedMachineId) ?? null : null;
  const selectedMachineRequests = selectedMachine
    ? relatedRequests.filter((request) => request.customerMachineId === selectedMachine.id)
    : [];

  const statusMutation = useMutation({
    mutationFn: async ({ machine, action }: { machine: CustomerMachine; action: "archive" | "reactivate" }) => {
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "user", customerId, "machines"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "customer-machines"] }),
      ]);
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
    void queryClient.invalidateQueries({ queryKey: ["admin", "user", customerId, "machines"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "customer-machines"] });
  }

  function openDetails(machine: CustomerMachine) {
    setSelectedMachineId(machine.id);
  }

  function closeDetails() {
    setSelectedMachineId(null);
  }

  const isLoading = profileQuery.isLoading || machinesQuery.isLoading || usersQuery.isLoading;
  const profileError = profileQuery.error instanceof ApiError ? profileQuery.error.message : null;

  const renderMachineActions = (machine: CustomerMachine) => {
    const pending = pendingMachineId === machine.id;
    const active = machine.status === "active";

    return (
      <div className="flex flex-nowrap items-center justify-end gap-1">
        {active && (
          <CompactActionLink
            tone="request"
            to={`/app/requests/new?customerId=${machine.customerId}&machineId=${machine.id}`}
            className="h-7 px-2 text-[11px]"
            onClick={(event) => event.stopPropagation()}
          >
            <Wrench className="h-3.5 w-3.5" />
            Request
          </CompactActionLink>
        )}
        <IconActionButton
          tone="view"
          label={`View details for ${machine.displayLabel}`}
          className="h-7 w-7"
          onClick={(event) => {
            event.stopPropagation();
            openDetails(machine);
          }}
        >
          <Eye className="h-4 w-4" />
        </IconActionButton>
        <IconActionButton
          tone="edit"
          label={`Edit ${machine.displayLabel}`}
          className="h-7 w-7"
          onClick={(event) => {
            event.stopPropagation();
            openEdit(machine);
          }}
        >
          <Pencil className="h-4 w-4" />
        </IconActionButton>
        <MachineMoreMenu
          machine={machine}
          pending={pending}
          buttonClassName="h-7 w-7"
          onArchive={setConfirmArchive}
          onReactivate={(selected) => statusMutation.mutate({ machine: selected, action: "reactivate" })}
        />
      </div>
    );
  };

  if (!customerId) {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
        <Link to="/app/machines" className="inline-flex items-center gap-2 text-sm text-[var(--lp-accent)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Customer Machines
        </Link>
        <div className={cn("rounded-2xl p-6 text-center", cardSurface)}>
          <h1 className="lp-display text-xl font-semibold text-[var(--lp-ink)]">Customer not found</h1>
          <p className="mt-2 text-sm text-[var(--lp-ink-soft)]">Choose a customer from the machine dashboard.</p>
        </div>
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
        <Link to="/app/machines" className="inline-flex items-center gap-2 text-sm text-[var(--lp-accent)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Customer Machines
        </Link>
        <div className={cn("rounded-2xl p-6 text-center", cardSurface)}>
          <h1 className="lp-display text-xl font-semibold text-[var(--lp-ink)]">Customer Machine Profile</h1>
          <p className="mt-2 text-sm text-[var(--lp-ink-soft)]">{profileError ?? "Could not load this customer profile."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl min-w-0 space-y-5 overflow-x-hidden">
      <header className={cn("min-w-0 overflow-hidden rounded-2xl p-5 sm:p-6", cardSurface)}>
        <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
              <HardDrive className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                Customer Machine Profile
              </p>
              <h1 className="lp-display mt-1 break-words text-2xl font-bold text-[var(--lp-ink)] sm:text-3xl">
                {customer?.displayName ?? "Loading customer..."}
              </h1>
              <p className="mt-1 break-words text-sm text-[var(--lp-ink-soft)]">{customer?.email ?? "-"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-2.5 py-1 text-xs font-semibold capitalize text-[var(--lp-ink-soft)]">
                  {customer?.role ?? "customer"}
                </span>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
                  {approvalLabel(customer?.approvalStatus)}
                </span>
                <span className="rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-2.5 py-1 text-xs font-semibold text-[var(--lp-ink-soft)]">
                  {accountOriginLabel(customer?.accountOrigin)}
                </span>
                <span className="rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-2.5 py-1 text-xs font-semibold text-[var(--lp-ink-soft)]">
                  Joined {formatDate(customer?.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
            <Button
              type="button"
              onClick={openCreate}
              className="h-10 rounded-full bg-[var(--lp-accent)] px-5 text-sm font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
            >
              <Plus className="h-4 w-4" />
              Link machine
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border-emerald-400/35 bg-emerald-400/10 px-5 text-sm font-semibold text-emerald-700 hover:bg-emerald-400/15 dark:text-emerald-200"
            >
              <Link to={createRequestTo}>
                <Wrench className="h-4 w-4" />
                Create request
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)] px-5 text-sm text-[var(--lp-ink-soft)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]"
            >
              <Link to="/app/machines">
                <ArrowLeft className="h-4 w-4" />
                Back to Customer Machines
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Total linked machines" value={machines.length} icon={HardDrive} />
        <MetricCard label="Active machines" value={activeMachines.length} icon={Wrench} accent="emerald" />
        <MetricCard label="Inactive / archived" value={inactiveMachines.length} icon={Archive} accent="amber" />
        <MetricCard label="Open service requests" value={openRequests.length} icon={ClipboardList} accent="steel" />
        <MetricCard label="Last service activity" value={formatDate(lastServiceActivity)} icon={CalendarDays} accent="steel" />
      </div>

      <section className={cn("min-w-0 rounded-2xl p-5", cardSurface)}>
        <div className="flex min-w-0 items-center gap-2">
          <UserRound className="h-5 w-5 shrink-0 text-[var(--lp-accent)]" />
          <h2 className="lp-display text-lg font-semibold text-[var(--lp-ink)]">Customer details</h2>
        </div>
        {isLoading ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-[var(--lp-faint)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading customer details...
          </div>
        ) : (
          <dl className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DetailLine label="Name" value={profile?.displayName ?? customer?.displayName} />
            <DetailLine label="Email" value={customer?.email} />
            <DetailLine label="Phone" value={profile?.contactPhone} />
            <DetailLine label="Address / location" value={profileAddress(profile)} />
            <DetailLine label="Account status" value={approvalLabel(customer?.approvalStatus)} />
            <DetailLine label="Role" value={customer?.role} />
            <DetailLine label="Origin" value={accountOriginLabel(customer?.accountOrigin)} />
            <DetailLine label="Created date" value={formatDate(customer?.createdAt)} />
            <DetailLine label="Profile completed" value={profile?.profileCompleted ? "Complete" : "Missing details"} />
            <DetailLine label="Profile completed at" value={formatDate(profile?.profileCompletedAt)} />
            <DetailLine label="Last updated" value={formatDate(lastCustomerActivity)} />
            <DetailLine label="Company" value={profile?.companyName} />
          </dl>
        )}
      </section>

      <section className={cn("min-w-0 overflow-hidden rounded-2xl", cardSurface)}>
        <div className="flex min-w-0 flex-col gap-3 border-b border-[var(--lp-line)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="lp-display text-lg font-semibold text-[var(--lp-ink)]">Linked Machines</h2>
            <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">
              Installed equipment assigned to this customer.
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            className="h-9 shrink-0 rounded-full bg-[var(--lp-accent)] px-4 text-sm font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
          >
            <Plus className="h-4 w-4" />
            Link machine
          </Button>
        </div>

        {machinesQuery.isLoading ? (
          <div className="flex justify-center py-12 text-[var(--lp-faint)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : machines.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <HardDrive className="mx-auto mb-3 h-7 w-7 text-[var(--lp-faint)]" />
            <p className="text-sm font-medium text-[var(--lp-ink)]">No machines linked yet.</p>
            <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">Link an installed machine to start building this profile.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--lp-line)] text-left">
                    {["Machine", "Nickname / Unit", "Serial", "Site", "Status", "Updated", "Actions"].map((header) => (
                      <th
                        key={header}
                        className={cn(
                          "px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--lp-faint)]",
                          header === "Actions" && "text-right",
                        )}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {machines.map((machine) => (
                    <tr
                      key={machine.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetails(machine)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetails(machine);
                        }
                      }}
                      className="h-[76px] cursor-pointer border-b border-[var(--lp-line)] align-middle transition-colors last:border-b-0 hover:bg-[var(--lp-panel-2)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--lp-accent)]/35"
                    >
                      <td className="px-4 py-2.5">
                        <span className="block truncate text-sm font-semibold leading-5 text-[var(--lp-ink)]" title={productLabel(machine)}>
                          {productLabel(machine)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--lp-faint)]" title={productCategory(machine)}>
                          {productCategory(machine)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block truncate text-sm text-[var(--lp-ink-soft)]" title={machine.displayLabel}>
                          {machine.displayLabel}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-[var(--lp-faint)]" title={machine.unitNumber ?? undefined}>
                          {machine.unitNumber ? `Unit ${machine.unitNumber}` : "No unit"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="block truncate text-sm text-[var(--lp-ink-soft)]" title={machine.internalSerialNumber ?? undefined}>
                          {machine.internalSerialNumber || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex min-w-0 items-center gap-1.5 text-sm text-[var(--lp-ink-soft)]" title={machine.siteLocation}>
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--lp-faint)]" />
                          <span className="truncate">{machine.siteLocation}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <MachineStatusBadge status={machine.status} />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--lp-faint)]">{formatDate(machine.updatedAt)}</td>
                      <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                        {renderMachineActions(machine)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2.5 p-4 lg:hidden">
              {machines.map((machine) => (
                <article
                  key={machine.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openDetails(machine)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetails(machine);
                    }
                  }}
                  className="min-w-0 cursor-pointer rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/25 p-3.5 transition-colors hover:border-[var(--lp-line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/35"
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--lp-ink)]">{productLabel(machine)}</p>
                      <p className="mt-0.5 truncate text-xs text-[var(--lp-faint)]">{productCategory(machine)}</p>
                    </div>
                    <MachineStatusBadge status={machine.status} />
                  </div>
                  <div className="mt-3 grid min-w-0 gap-x-3 gap-y-2 text-sm sm:grid-cols-2">
                    <DetailLine
                      label="Nickname / Unit"
                      value={
                        <span>
                          <span className="block">{machine.displayLabel}</span>
                          <span className="text-xs text-[var(--lp-faint)]">{machine.unitNumber ? `Unit ${machine.unitNumber}` : "No unit"}</span>
                        </span>
                      }
                    />
                    <DetailLine label="Serial number" value={machine.internalSerialNumber} />
                    <DetailLine
                      label="Installed site"
                      value={
                        <span className="flex min-w-0 items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--lp-faint)]" />
                          <span className="truncate">{machine.siteLocation}</span>
                        </span>
                      }
                    />
                    <DetailLine label="Last updated" value={formatDate(machine.updatedAt)} />
                  </div>
                  <div className="mt-3 flex justify-end border-t border-[var(--lp-line)] pt-2.5" onClick={(event) => event.stopPropagation()}>
                    {renderMachineActions(machine)}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section id="service-history" className={cn("scroll-mt-24 min-w-0 overflow-hidden rounded-2xl", cardSurface)}>
        <div className="flex min-w-0 items-center gap-2 border-b border-[var(--lp-line)] px-5 py-4">
          <ClipboardList className="h-5 w-5 shrink-0 text-[var(--lp-accent)]" />
          <div className="min-w-0">
            <h2 className="lp-display text-lg font-semibold text-[var(--lp-ink)]">Related service requests</h2>
            <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">Recent real request history for this customer and their linked machines.</p>
          </div>
        </div>

        {requestsQuery.isLoading ? (
          <div className="flex justify-center py-12 text-[var(--lp-faint)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : relatedRequests.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <History className="mx-auto mb-3 h-6 w-6 text-[var(--lp-faint)]" />
            <p className="text-sm font-medium text-[var(--lp-ink)]">Service request history will appear here.</p>
            <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">No service requests are tied to this customer yet.</p>
          </div>
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-[var(--lp-line)] text-left">
                    {["Request", "Machine", "Status", "Priority", "Created", "Assigned engineer", "Open"].map((header) => (
                      <th key={header} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--lp-faint)]">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {relatedRequests.slice(0, 12).map((request) => {
                    const requestMachine = request.customerMachineId ? machineMap.get(request.customerMachineId) : undefined;
                    const engineer = request.assignedEngineerId ? userMap.get(request.assignedEngineerId) : null;
                    return (
                      <tr key={request.id} className="border-b border-[var(--lp-line)] last:border-b-0">
                        <td className="px-4 py-3">
                          <Link to={`/app/requests/${request.id}`} className="block truncate font-medium text-[var(--lp-ink)] hover:text-[var(--lp-accent)]">
                            {request.requestNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className="block truncate text-[var(--lp-ink-soft)]" title={machineLabel(requestMachine)}>
                            {machineLabel(requestMachine)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <RequestStatusBadge request={request} />
                        </td>
                        <td className="px-4 py-3">
                          <PriorityBadge priority={request.priority} />
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--lp-faint)]">{formatDate(request.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className="block truncate text-[var(--lp-ink-soft)]" title={engineer?.displayName ?? undefined}>
                            {engineer?.displayName ?? "Unassigned"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/app/requests/${request.id}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--lp-line-strong)] text-[var(--lp-ink-soft)] transition-colors hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]"
                            title={`Open ${request.requestNumber}`}
                            aria-label={`Open ${request.requestNumber}`}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {relatedRequests.slice(0, 12).map((request) => {
                const requestMachine = request.customerMachineId ? machineMap.get(request.customerMachineId) : undefined;
                const engineer = request.assignedEngineerId ? userMap.get(request.assignedEngineerId) : null;
                return (
                  <Link
                    key={request.id}
                    to={`/app/requests/${request.id}`}
                    className="block min-w-0 rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/45 p-4 transition-colors hover:border-[var(--lp-accent)]/45"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--lp-ink)]">{request.requestNumber}</p>
                        <p className="mt-1 truncate text-xs text-[var(--lp-ink-soft)]">{machineLabel(requestMachine)}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 shrink-0 text-[var(--lp-faint)]" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <RequestStatusBadge request={request} />
                      <PriorityBadge priority={request.priority} />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs text-[var(--lp-faint)] sm:grid-cols-2">
                      <span>Created {formatDate(request.createdAt)}</span>
                      <span>Engineer {engineer?.displayName ?? "Unassigned"}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </section>

      <MachineDetailDrawer
        key={selectedMachine?.id ?? "closed"}
        machine={selectedMachine}
        requests={selectedMachineRequests}
        pending={selectedMachine ? pendingMachineId === selectedMachine.id : false}
        onClose={closeDetails}
        onEdit={(machine) => {
          closeDetails();
          openEdit(machine);
        }}
        onArchive={(machine) => {
          closeDetails();
          setConfirmArchive(machine);
        }}
        onReactivate={(machine) => statusMutation.mutate({ machine, action: "reactivate" })}
      />

      <MachineFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customers={usersQuery.data ?? []}
        products={productsQuery.data ?? []}
        editing={editing}
        defaultCustomerId={customerId}
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

export default CustomerMachineProfilePage;
