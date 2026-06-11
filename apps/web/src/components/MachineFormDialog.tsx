import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, MapPin, Phone, Search, UserRound } from "lucide-react";
import type {
  AuthUser,
  CatalogProduct,
  CustomerMachine,
  CustomerProfile,
} from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type FormState = {
  customerId: string;
  productId: string;
  displayLabel: string;
  unitNumber: string;
  internalSerialNumber: string;
  siteLocation: string;
  contactPhone: string;
  installDate: string;
  status: "active" | "inactive";
  notes: string;
};

const empty: FormState = {
  customerId: "",
  productId: "",
  displayLabel: "",
  unitNumber: "",
  internalSerialNumber: "",
  siteLocation: "",
  contactPhone: "",
  installDate: "",
  status: "active",
  notes: "",
};

/** One-line address from a saved customer profile. */
function addressSummary(p: CustomerProfile | null | undefined): string {
  if (!p) return "";
  const cityState = [p.city, p.state].map((v) => v?.trim()).filter(Boolean).join(", ");
  return [p.addressLine1?.trim(), cityState].filter(Boolean).join(", ");
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--lp-ink-soft)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--lp-accent)]">*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-sm text-[var(--lp-ink-soft)] transition-colors hover:text-[var(--lp-ink)] focus:outline-none focus-visible:outline-none"
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
          checked
            ? "border-[var(--lp-accent)] bg-[var(--lp-accent)] text-[#fbfaf6]"
            : "border-[var(--lp-line-strong)] bg-transparent",
        )}
      >
        {checked && <Check className="h-3 w-3" />}
      </span>
      {label}
    </button>
  );
}

const MachineFormDialog = ({
  open,
  onOpenChange,
  customers,
  products,
  editing,
  defaultCustomerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: AuthUser[];
  products: CatalogProduct[];
  editing: CustomerMachine | null;
  defaultCustomerId?: string;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<FormState>(empty);
  const [customerSearch, setCustomerSearch] = useState("");
  const [useDifferentSite, setUseDifferentSite] = useState(false);
  const [useDifferentPhone, setUseDifferentPhone] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        customerId: editing.customerId,
        productId: editing.productId,
        displayLabel: editing.displayLabel,
        unitNumber: editing.unitNumber ?? "",
        internalSerialNumber: editing.internalSerialNumber ?? "",
        siteLocation: editing.siteLocation,
        contactPhone: editing.contactPhone ?? "",
        installDate: editing.installDate ?? "",
        status: editing.status,
        notes: editing.notes ?? "",
      });
    } else {
      setForm({ ...empty, customerId: defaultCustomerId ?? "" });
    }
    setCustomerSearch("");
    setUseDifferentSite(false);
    setUseDifferentPhone(false);
  }, [open, editing, defaultCustomerId]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  function selectCustomer(id: string) {
    setForm((f) => ({ ...f, customerId: id }));
    setUseDifferentSite(false);
    setUseDifferentPhone(false);
  }

  const filteredCustomers = useMemo(() => {
    const needle = customerSearch.trim().toLowerCase();
    const list = customers.filter((c) => c.role === "customer");
    if (!needle) return list;
    return list.filter((c) => `${c.displayName} ${c.email}`.toLowerCase().includes(needle));
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find((c) => c.id === form.customerId) ?? null;

  // Saved profile for the selected customer (create mode only).
  const profileQuery = useQuery({
    queryKey: ["admin", "user", form.customerId, "profile"],
    queryFn: () =>
      apiRequest<{ profile: CustomerProfile }>(`/api/admin/users/${form.customerId}/profile`),
    enabled: open && !editing && Boolean(form.customerId),
  });
  const profile = profileQuery.data?.profile ?? null;
  const savedAddress = addressSummary(profile);
  const savedPhone = profile?.contactPhone?.trim() ?? "";
  const hasSavedAddress = Boolean(savedAddress);
  const hasSavedPhone = Boolean(savedPhone);
  const siteFieldShown = useDifferentSite || !hasSavedAddress;
  const phoneFieldShown = useDifferentPhone || !hasSavedPhone;

  // Final resolved values used for client-side validation + payload.
  const effectiveSite = siteFieldShown ? form.siteLocation.trim() : savedAddress;

  const mutation = useMutation({
    mutationFn: () => {
      if (editing) {
        return apiRequest<CustomerMachine>(`/api/admin/customer-machines/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            displayLabel: form.displayLabel.trim() || undefined,
            unitNumber: form.unitNumber.trim() || null,
            internalSerialNumber: form.internalSerialNumber.trim() || null,
            siteLocation: form.siteLocation.trim() || undefined,
            contactPhone: form.contactPhone.trim() || null,
            installDate: form.installDate.trim() || null,
            status: form.status,
            notes: form.notes.trim() || null,
          }),
        });
      }
      return apiRequest<CustomerMachine>("/api/admin/customer-machines", {
        method: "POST",
        body: JSON.stringify({
          customerId: form.customerId,
          productId: form.productId,
          displayLabel: form.displayLabel.trim() || undefined,
          unitNumber: form.unitNumber.trim() || undefined,
          internalSerialNumber: form.internalSerialNumber.trim() || undefined,
          installDate: form.installDate.trim() || undefined,
          notes: form.notes.trim() || undefined,
          // Override only — when off, the backend reuses the customer profile.
          siteLocation: siteFieldShown ? form.siteLocation.trim() || undefined : undefined,
          contactPhone: phoneFieldShown ? form.contactPhone.trim() || undefined : undefined,
        }),
      });
    },
    onSuccess: () => {
      toast.success(editing ? "Machine updated." : "Machine linked to customer.");
      onSaved();
      onOpenChange(false);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not save machine."),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing && !form.customerId) return toast.error("Select a customer.");
    if (!editing && !form.productId) return toast.error("Select a product.");
    if (editing) {
      if (!form.siteLocation.trim()) return toast.error("Add a site location.");
    } else if (!effectiveSite) {
      return toast.error("Add a customer address or enter a machine installation site.");
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit machine" : "Link machine to customer"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the installed machine's details."
              : "Assign an installed machine to a customer account. Customer contact details are reused automatically unless this machine is installed at a different site."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {/* ── Customer ─────────────────────────────────────────────────── */}
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lp-faint)]">
              Customer details
            </p>

            {editing ? (
              <div className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 px-3 py-2 text-sm text-[var(--lp-ink)]">
                {selectedCustomer
                  ? `${selectedCustomer.displayName} · ${selectedCustomer.email}`
                  : editing.customerId}
              </div>
            ) : !form.customerId ? (
              <>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]" />
                  <Input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer by name or email"
                    className="bg-background pl-9"
                  />
                </div>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-[var(--lp-line)] p-1">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-2 py-2 text-sm text-[var(--lp-faint)]">No customers match.</p>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => selectCustomer(c.id)}
                        className="flex w-full items-center justify-between gap-2 rounded-md border border-transparent px-2.5 py-2 text-left text-sm text-[var(--lp-ink-soft)] transition-colors hover:bg-[var(--lp-panel-2)] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45"
                      >
                        <span className="min-w-0 truncate">
                          {c.displayName} · {c.email}
                        </span>
                        {c.approvalStatus !== "approved" && (
                          <span className="shrink-0 text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-300">
                            {c.approvalStatus === "pending_approval" ? "pending" : c.approvalStatus}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              /* Read-only summary of the selected customer's saved details. */
              <div className="rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--lp-ink)]">
                        {profile?.displayName || selectedCustomer?.displayName}
                      </p>
                      <p className="truncate text-xs text-[var(--lp-ink-soft)]">
                        {selectedCustomer?.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectCustomer("")}
                    className="shrink-0 text-xs font-medium text-[var(--lp-accent)] hover:underline focus:outline-none"
                  >
                    Change
                  </button>
                </div>

                {profileQuery.isLoading ? (
                  <p className="mt-3 flex items-center gap-2 text-xs text-[var(--lp-faint)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading saved details…
                  </p>
                ) : (
                  <dl className="mt-3 grid gap-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-[var(--lp-faint)]" />
                      <span className={cn(hasSavedPhone ? "text-[var(--lp-ink-soft)]" : "text-[var(--lp-faint)] italic")}>
                        {savedPhone || "No saved phone on this customer profile."}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lp-faint)]" />
                      <span className={cn(hasSavedAddress ? "text-[var(--lp-ink-soft)]" : "text-[var(--lp-faint)] italic")}>
                        {savedAddress || "No saved address on this customer profile."}
                      </span>
                    </div>
                  </dl>
                )}
              </div>
            )}
          </section>

          {/* ── Machine ──────────────────────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lp-faint)]">
              Machine
            </p>
            <Field label="Product" required>
              {editing ? (
                <div className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 px-3 py-2 text-sm text-[var(--lp-ink)]">
                  {editing.productSnapshot?.name ?? editing.productId}
                </div>
              ) : (
                <Select value={form.productId} onValueChange={set("productId")}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Machine nickname">
                <Input
                  value={form.displayLabel}
                  onChange={(e) => set("displayLabel")(e.target.value)}
                  placeholder="e.g. Front-floor printer"
                  className="bg-background"
                />
              </Field>
              <Field label="Unit number">
                <Input
                  value={form.unitNumber}
                  onChange={(e) => set("unitNumber")(e.target.value)}
                  placeholder="e.g. 1"
                  className="bg-background"
                />
              </Field>
              <Field label="Serial number">
                <Input
                  value={form.internalSerialNumber}
                  onChange={(e) => set("internalSerialNumber")(e.target.value)}
                  placeholder="Admin/engineer only"
                  className="bg-background"
                />
              </Field>
              <Field label="Installed date">
                <Input
                  type="date"
                  value={form.installDate}
                  onChange={(e) => set("installDate")(e.target.value)}
                  className="bg-background"
                />
              </Field>
            </div>
          </section>

          {/* ── Installation & contact ───────────────────────────────────── */}
          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lp-faint)]">
              Installation details
            </p>

            {editing ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Site location" required>
                  <Input
                    value={form.siteLocation}
                    onChange={(e) => set("siteLocation")(e.target.value)}
                    placeholder="Workshop / branch / city"
                    className="bg-background"
                  />
                </Field>
                <Field label="Contact phone">
                  <Input
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone")(e.target.value)}
                    placeholder="Optional"
                    className="bg-background"
                  />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => set("status")(v as FormState["status"])}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive / archived</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ) : (
              <>
                {/* Installation site */}
                {hasSavedAddress && (
                  <CheckRow
                    checked={useDifferentSite}
                    onChange={setUseDifferentSite}
                    label="Use a different installation site"
                  />
                )}
                {siteFieldShown ? (
                  <Field label="Installation site" required={!hasSavedAddress}>
                    <Input
                      value={form.siteLocation}
                      onChange={(e) => set("siteLocation")(e.target.value)}
                      placeholder="Workshop / branch / city"
                      className="bg-background"
                    />
                  </Field>
                ) : (
                  <p className="text-xs text-[var(--lp-ink-soft)]">
                    <span className="text-[var(--lp-faint)]">Installed at:</span> {savedAddress}
                  </p>
                )}

                {/* Contact phone */}
                {hasSavedPhone && (
                  <CheckRow
                    checked={useDifferentPhone}
                    onChange={setUseDifferentPhone}
                    label="Use a different contact phone"
                  />
                )}
                {phoneFieldShown ? (
                  <Field label="Contact phone for this machine">
                    <Input
                      value={form.contactPhone}
                      onChange={(e) => set("contactPhone")(e.target.value)}
                      placeholder="Machine site contact number"
                      className="bg-background"
                    />
                  </Field>
                ) : (
                  <p className="text-xs text-[var(--lp-ink-soft)]">
                    <span className="text-[var(--lp-faint)]">Contact:</span> {savedPhone}
                  </p>
                )}
              </>
            )}
          </section>

          {/* ── Notes ────────────────────────────────────────────────────── */}
          <Field label="Internal notes">
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Optional internal notes"
              className="bg-background"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
              disabled={mutation.isPending}
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Link machine"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MachineFormDialog;
