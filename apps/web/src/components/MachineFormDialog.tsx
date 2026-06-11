import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import type { AuthUser, CatalogProduct, CustomerMachine } from "@elkatech/contracts";
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

function label(text: string, required?: boolean) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-[var(--lp-ink-soft)]">
      {text}
      {required && <span className="ml-0.5 text-[var(--lp-accent)]">*</span>}
    </label>
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

  // Seed the form whenever the dialog opens (create vs edit).
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
  }, [open, editing, defaultCustomerId]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  const filteredCustomers = useMemo(() => {
    const needle = customerSearch.trim().toLowerCase();
    const list = customers.filter((c) => c.role === "customer");
    if (!needle) return list;
    return list.filter((c) => `${c.displayName} ${c.email}`.toLowerCase().includes(needle));
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find((c) => c.id === form.customerId) ?? null;

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
          siteLocation: form.siteLocation.trim(),
          contactPhone: form.contactPhone.trim() || undefined,
          installDate: form.installDate.trim() || undefined,
          notes: form.notes.trim() || undefined,
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
    if (!form.siteLocation.trim()) return toast.error("Add a site location.");
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
              : "Assign a catalog product to a customer as an installed machine."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Customer */}
          {editing ? (
            <div>
              {label("Customer")}
              <p className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 px-3 py-2 text-sm text-[var(--lp-ink)]">
                {selectedCustomer ? `${selectedCustomer.displayName} · ${selectedCustomer.email}` : editing.customerId}
              </p>
            </div>
          ) : (
            <div>
              {label("Customer", true)}
              <div className="relative mb-2">
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
                      onClick={() => set("customerId")(c.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/45",
                        c.id === form.customerId
                          ? "border-[var(--lp-accent)]/60 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]"
                          : "border-transparent text-[var(--lp-ink-soft)] hover:bg-[var(--lp-panel-2)]",
                      )}
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
            </div>
          )}

          {/* Product */}
          <div>
            {label("Product", true)}
            {editing ? (
              <p className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 px-3 py-2 text-sm text-[var(--lp-ink)]">
                {editing.productSnapshot?.name ?? editing.productId}
              </p>
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              {label("Machine nickname")}
              <Input
                value={form.displayLabel}
                onChange={(e) => set("displayLabel")(e.target.value)}
                placeholder="e.g. Front-floor printer"
                className="bg-background"
              />
            </div>
            <div>
              {label("Unit number")}
              <Input
                value={form.unitNumber}
                onChange={(e) => set("unitNumber")(e.target.value)}
                placeholder="e.g. 1"
                className="bg-background"
              />
            </div>
            <div>
              {label("Serial number")}
              <Input
                value={form.internalSerialNumber}
                onChange={(e) => set("internalSerialNumber")(e.target.value)}
                placeholder="Admin/engineer only"
                className="bg-background"
              />
            </div>
            <div>
              {label("Site location", true)}
              <Input
                value={form.siteLocation}
                onChange={(e) => set("siteLocation")(e.target.value)}
                placeholder="Workshop / branch / city"
                className="bg-background"
              />
            </div>
            <div>
              {label("Contact phone")}
              <Input
                value={form.contactPhone}
                onChange={(e) => set("contactPhone")(e.target.value)}
                placeholder="Optional"
                className="bg-background"
              />
            </div>
            <div>
              {label("Installed date")}
              <Input
                type="date"
                value={form.installDate}
                onChange={(e) => set("installDate")(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          {editing && (
            <div>
              {label("Status")}
              <Select value={form.status} onValueChange={(v) => set("status")(v as FormState["status"])}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive / archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            {label("Notes")}
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="Optional internal notes"
              className="bg-background"
            />
          </div>

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
