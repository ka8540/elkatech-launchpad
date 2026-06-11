import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MapPin, Pencil, Plus, Power, RotateCcw, X } from "lucide-react";
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

type ProfileResponse = { user: AuthUser; profile: CustomerProfile };

type MachineForm = {
  productId: string;
  displayLabel: string;
  unitNumber: string;
  internalSerialNumber: string;
  siteLocation: string;
  contactPhone: string;
  purchaseDate: string;
  installDate: string;
  notes: string;
};

const emptyMachineForm: MachineForm = {
  productId: "",
  displayLabel: "",
  unitNumber: "",
  internalSerialNumber: "",
  siteLocation: "",
  contactPhone: "",
  purchaseDate: "",
  installDate: "",
  notes: "",
};

function fieldLabel(label: string, required?: boolean) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-[var(--lp-ink-soft)]">
      {label}
      {required && <span className="ml-0.5 text-[var(--lp-accent)]">*</span>}
    </label>
  );
}

const CustomerMachinesDialog = ({
  user,
  open,
  onOpenChange,
}: {
  user: AuthUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const [machineForm, setMachineForm] = useState<MachineForm>(emptyMachineForm);
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  // Reset local state when switching users / closing.
  useEffect(() => {
    if (!open) {
      setMachineForm(emptyMachineForm);
      setEditingMachineId(null);
      setShowForm(false);
      setEditingProfile(false);
    }
  }, [open, userId]);

  const profileQuery = useQuery({
    queryKey: ["admin", "user", userId, "profile"],
    queryFn: () => apiRequest<ProfileResponse>(`/api/admin/users/${userId}/profile`),
    enabled: open && Boolean(userId),
  });

  const machinesQuery = useQuery({
    queryKey: ["admin", "user", userId, "machines"],
    queryFn: () => apiRequest<CustomerMachine[]>(`/api/admin/users/${userId}/machines`),
    enabled: open && Boolean(userId),
  });

  const productsQuery = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: () => apiRequest<CatalogProduct[]>("/api/catalog/products"),
    enabled: open,
  });
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  async function refreshMachines() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "user", userId, "machines"] });
  }

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest<CustomerMachine>(`/api/admin/users/${userId}/machines`, {
        method: "POST",
        body: JSON.stringify({
          productId: machineForm.productId,
          displayLabel: machineForm.displayLabel.trim() || undefined,
          unitNumber: machineForm.unitNumber.trim() || undefined,
          internalSerialNumber: machineForm.internalSerialNumber.trim() || undefined,
          siteLocation: machineForm.siteLocation.trim(),
          contactPhone: machineForm.contactPhone.trim() || undefined,
          purchaseDate: machineForm.purchaseDate.trim() || undefined,
          installDate: machineForm.installDate.trim() || undefined,
          notes: machineForm.notes.trim() || undefined,
        }),
      }),
    onSuccess: async () => {
      toast.success("Machine added.");
      setMachineForm(emptyMachineForm);
      setShowForm(false);
      await refreshMachines();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not add machine."),
  });

  const updateMutation = useMutation({
    mutationFn: (machineId: string) =>
      apiRequest<CustomerMachine>(`/api/admin/machines/${machineId}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayLabel: machineForm.displayLabel.trim() || undefined,
          unitNumber: machineForm.unitNumber.trim() || null,
          internalSerialNumber: machineForm.internalSerialNumber.trim() || null,
          siteLocation: machineForm.siteLocation.trim() || undefined,
          contactPhone: machineForm.contactPhone.trim() || null,
          purchaseDate: machineForm.purchaseDate.trim() || null,
          installDate: machineForm.installDate.trim() || null,
          notes: machineForm.notes.trim() || null,
        }),
      }),
    onSuccess: async () => {
      toast.success("Machine updated.");
      setMachineForm(emptyMachineForm);
      setEditingMachineId(null);
      setShowForm(false);
      await refreshMachines();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not update machine."),
  });

  const statusMutation = useMutation({
    mutationFn: ({ machineId, deactivate }: { machineId: string; deactivate: boolean }) =>
      deactivate
        ? apiRequest(`/api/admin/machines/${machineId}`, { method: "DELETE" })
        : apiRequest(`/api/admin/machines/${machineId}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "active" }),
          }),
    onSuccess: async () => {
      await refreshMachines();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not update machine."),
  });

  function startEdit(machine: CustomerMachine) {
    setEditingMachineId(machine.id);
    setShowForm(true);
    setMachineForm({
      productId: machine.productId,
      displayLabel: machine.displayLabel,
      unitNumber: machine.unitNumber ?? "",
      internalSerialNumber: machine.internalSerialNumber ?? "",
      siteLocation: machine.siteLocation,
      contactPhone: machine.contactPhone ?? "",
      purchaseDate: machine.purchaseDate ?? "",
      installDate: machine.installDate ?? "",
      notes: machine.notes ?? "",
    });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingMachineId(null);
    setMachineForm(emptyMachineForm);
  }

  function submitMachine(event: React.FormEvent) {
    event.preventDefault();
    if (!editingMachineId && !machineForm.productId) {
      toast.error("Choose a product.");
      return;
    }
    if (!machineForm.siteLocation.trim()) {
      toast.error("Add a site location.");
      return;
    }
    if (editingMachineId) updateMutation.mutate(editingMachineId);
    else createMutation.mutate();
  }

  const machines = machinesQuery.data ?? [];
  const profile = profileQuery.data?.profile;
  const formPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Machines &amp; profile — {user?.displayName}</DialogTitle>
          <DialogDescription>
            Assign purchased machines and review this customer's contact details. Machine
            ownership is admin-controlled.
          </DialogDescription>
        </DialogHeader>

        {/* ── Profile summary ─────────────────────────────────────────── */}
        <section className="rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--lp-ink)]">Customer profile</h3>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                profile?.profileCompleted
                  ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
                  : "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300",
              )}
            >
              {profile?.profileCompleted ? "Complete" : "Missing details"}
            </span>
          </div>

          {profileQuery.isLoading ? (
            <p className="mt-3 text-sm text-[var(--lp-faint)]">Loading…</p>
          ) : editingProfile ? (
            <ProfileEditForm
              userId={userId}
              profile={profile}
              onDone={async () => {
                setEditingProfile(false);
                await queryClient.invalidateQueries({
                  queryKey: ["admin", "user", userId, "profile"],
                });
                await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
              }}
              onCancel={() => setEditingProfile(false)}
            />
          ) : (
            <>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Detail label="Name" value={profile?.displayName} />
                <Detail label="Email" value={user?.email} />
                <Detail label="Workshop / Company" value={profile?.companyName} />
                <Detail label="Phone" value={profile?.contactPhone} />
                <Detail
                  label="City / State"
                  value={[profile?.city, profile?.state].filter(Boolean).join(", ") || null}
                />
                <Detail label="Address" value={profile?.addressLine1} />
              </dl>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setEditingProfile(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </Button>
            </>
          )}
        </section>

        {/* ── Machines ────────────────────────────────────────────────── */}
        <section className="mt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--lp-ink)]">
              Assigned machines ({machines.length})
            </h3>
            {!showForm && (
              <Button
                type="button"
                size="sm"
                className="bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
                onClick={() => {
                  setEditingMachineId(null);
                  setMachineForm(emptyMachineForm);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add machine
              </Button>
            )}
          </div>

          {showForm && (
            <form
              onSubmit={submitMachine}
              className="mt-3 space-y-3 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--lp-ink)]">
                  {editingMachineId ? "Edit machine" : "Add machine"}
                </p>
                <button
                  type="button"
                  onClick={cancelForm}
                  aria-label="Cancel"
                  className="text-[var(--lp-faint)] hover:text-[var(--lp-ink)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {!editingMachineId && (
                <div>
                  {fieldLabel("Product", true)}
                  <Select
                    value={machineForm.productId}
                    onValueChange={(value) =>
                      setMachineForm((f) => ({ ...f, productId: value }))
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  {fieldLabel("Display label")}
                  <Input
                    value={machineForm.displayLabel}
                    onChange={(e) => setMachineForm((f) => ({ ...f, displayLabel: e.target.value }))}
                    placeholder="e.g. Printer — Unit 1"
                    className="bg-background"
                  />
                </div>
                <div>
                  {fieldLabel("Unit number")}
                  <Input
                    value={machineForm.unitNumber}
                    onChange={(e) => setMachineForm((f) => ({ ...f, unitNumber: e.target.value }))}
                    placeholder="e.g. 1"
                    className="bg-background"
                  />
                </div>
                <div>
                  {fieldLabel("Internal serial number")}
                  <Input
                    value={machineForm.internalSerialNumber}
                    onChange={(e) =>
                      setMachineForm((f) => ({ ...f, internalSerialNumber: e.target.value }))
                    }
                    placeholder="Admin/engineer only"
                    className="bg-background"
                  />
                </div>
                <div>
                  {fieldLabel("Site location", true)}
                  <Input
                    value={machineForm.siteLocation}
                    onChange={(e) => setMachineForm((f) => ({ ...f, siteLocation: e.target.value }))}
                    placeholder="Workshop / branch / city"
                    className="bg-background"
                  />
                </div>
                <div>
                  {fieldLabel("Contact phone")}
                  <Input
                    value={machineForm.contactPhone}
                    onChange={(e) => setMachineForm((f) => ({ ...f, contactPhone: e.target.value }))}
                    placeholder="Optional"
                    className="bg-background"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    {fieldLabel("Purchase date")}
                    <Input
                      type="date"
                      value={machineForm.purchaseDate}
                      onChange={(e) =>
                        setMachineForm((f) => ({ ...f, purchaseDate: e.target.value }))
                      }
                      className="bg-background"
                    />
                  </div>
                  <div>
                    {fieldLabel("Install date")}
                    <Input
                      type="date"
                      value={machineForm.installDate}
                      onChange={(e) =>
                        setMachineForm((f) => ({ ...f, installDate: e.target.value }))
                      }
                      className="bg-background"
                    />
                  </div>
                </div>
              </div>
              <div>
                {fieldLabel("Notes")}
                <Textarea
                  rows={2}
                  value={machineForm.notes}
                  onChange={(e) => setMachineForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional internal notes"
                  className="bg-background"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={cancelForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
                  disabled={formPending}
                >
                  {formPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingMachineId ? "Save changes" : "Add machine"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-3 space-y-2">
            {machinesQuery.isLoading && (
              <p className="text-sm text-[var(--lp-faint)]">Loading machines…</p>
            )}
            {!machinesQuery.isLoading && machines.length === 0 && !showForm && (
              <p className="rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 p-4 text-center text-sm text-[var(--lp-ink-soft)]">
                No machines assigned yet.
              </p>
            )}
            {machines.map((machine) => (
              <div
                key={machine.id}
                className={cn(
                  "rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 p-3.5",
                  machine.status === "inactive" && "opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-[var(--lp-ink)]">
                      {machine.displayLabel}
                    </p>
                    <p className="mt-0.5 break-words text-xs text-[var(--lp-ink-soft)]">
                      {machine.productSnapshot?.name ?? machine.productId}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[var(--lp-faint)]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="break-words">{machine.siteLocation}</span>
                    </p>
                    {machine.internalSerialNumber && (
                      <p className="mt-1 text-xs text-[var(--lp-faint)]">
                        Serial: <span className="text-[var(--lp-ink-soft)]">{machine.internalSerialNumber}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                        machine.status === "active"
                          ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
                          : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
                      )}
                    >
                      {machine.status}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2"
                        onClick={() => startEdit(machine)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {machine.status === "active" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 border-rose-400/40 px-2 text-rose-600 hover:bg-rose-400/10 dark:text-rose-300"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ machineId: machine.id, deactivate: true })
                          }
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ machineId: machine.id, deactivate: false })
                          }
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-[var(--lp-ink)]">{value || "—"}</dd>
    </div>
  );
}

function ProfileEditForm({
  userId,
  profile,
  onDone,
  onCancel,
}: {
  userId: string;
  profile?: CustomerProfile;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    displayName: profile?.displayName ?? "",
    companyName: profile?.companyName ?? "",
    contactPhone: profile?.contactPhone ?? "",
    alternatePhone: profile?.alternatePhone ?? "",
    addressLine1: profile?.addressLine1 ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    postalCode: profile?.postalCode ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/users/${userId}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: form.displayName.trim() || undefined,
          companyName: form.companyName.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          alternatePhone: form.alternatePhone.trim() || undefined,
          addressLine1: form.addressLine1.trim() || undefined,
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
          postalCode: form.postalCode.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success("Profile updated.");
      onDone();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not update profile."),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className="mt-3 grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div>
        {fieldLabel("Full name")}
        <Input value={form.displayName} onChange={set("displayName")} className="bg-background" />
      </div>
      <div>
        {fieldLabel("Workshop / Company")}
        <Input value={form.companyName} onChange={set("companyName")} className="bg-background" />
      </div>
      <div>
        {fieldLabel("Contact phone")}
        <Input value={form.contactPhone} onChange={set("contactPhone")} className="bg-background" />
      </div>
      <div>
        {fieldLabel("Alternate phone")}
        <Input value={form.alternatePhone} onChange={set("alternatePhone")} className="bg-background" />
      </div>
      <div className="sm:col-span-2">
        {fieldLabel("Service address")}
        <Input value={form.addressLine1} onChange={set("addressLine1")} className="bg-background" />
      </div>
      <div>
        {fieldLabel("City")}
        <Input value={form.city} onChange={set("city")} className="bg-background" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          {fieldLabel("State")}
          <Input value={form.state} onChange={set("state")} className="bg-background" />
        </div>
        <div>
          {fieldLabel("Postal code")}
          <Input value={form.postalCode} onChange={set("postalCode")} className="bg-background" />
        </div>
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
          disabled={mutation.isPending}
        >
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save profile
        </Button>
      </div>
    </form>
  );
}

export default CustomerMachinesDialog;
