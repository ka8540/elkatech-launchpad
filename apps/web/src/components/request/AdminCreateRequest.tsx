import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ImagePlus,
  Loader2,
  MapPin,
  PackageCheck,
  Search,
  Send,
  Sparkles,
  UserCog,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type {
  CustomerMachine,
  IssueType,
  RequestPriority,
} from "@elkatech/contracts";

// Lightweight customer directory entry from /api/staff/customers (no account
// management fields — usable by admin, owner, and support alike).
type StaffCustomer = {
  id: string;
  displayName: string;
  email: string;
  approvalStatus: string;
};
import { apiRequest } from "@/lib/api";
import { uploadRequestAttachment } from "@/lib/attachments";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AttachmentPicker,
  BackToRequests,
  FormSection,
  GuidancePanel,
  IssueFields,
  PageHero,
  cardSurface,
  useAttachmentPicker,
} from "@/components/request/shared";

const AdminCreateRequest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [customerId, setCustomerId] = useState(searchParams.get("customerId") ?? "");
  const [machineId, setMachineId] = useState(searchParams.get("machineId") ?? "");
  const [customerSearch, setCustomerSearch] = useState("");
  const [issueType, setIssueType] = useState<IssueType | "">("");
  const [urgency, setUrgency] = useState<RequestPriority>("normal");
  const [description, setDescription] = useState("");
  const attachments = useAttachmentPicker();

  const usersQuery = useQuery({
    queryKey: ["staff-customers"],
    queryFn: () => apiRequest<StaffCustomer[]>("/api/staff/customers"),
  });
  const customers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const filteredCustomers = useMemo(() => {
    const needle = customerSearch.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) =>
      `${c.displayName} ${c.email}`.toLowerCase().includes(needle),
    );
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const machinesQuery = useQuery({
    queryKey: ["staff", "customer", customerId, "machines"],
    queryFn: () => apiRequest<CustomerMachine[]>(`/api/staff/customers/${customerId}/machines`),
    enabled: Boolean(customerId),
  });
  const activeMachines = useMemo(
    () => (machinesQuery.data ?? []).filter((m) => m.status === "active"),
    [machinesQuery.data],
  );
  const selectedMachine = activeMachines.find((m) => m.id === machineId) ?? null;

  // Clear a stale machine selection when the customer changes.
  useEffect(() => {
    if (machineId && !activeMachines.some((m) => m.id === machineId)) {
      setMachineId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, machinesQuery.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const created = await apiRequest<{ id: string }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          customerMachineId: machineId,
          customerId,
          issueType,
          description: description.trim(),
          priority: urgency,
        }),
      });
      const failed: string[] = [];
      for (const picked of attachments.files) {
        try {
          await uploadRequestAttachment(created.id, picked.file);
        } catch {
          failed.push(picked.file.name);
        }
      }
      return { id: created.id, failed };
    },
    onSuccess: ({ id, failed }) => {
      if (failed.length) {
        toast.warning(`Request created. ${failed.length} file(s) could not be uploaded.`);
      } else {
        toast.success("Request created for the customer.");
      }
      navigate(`/app/requests/${id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canSubmit = Boolean(customerId && machineId && issueType && description.trim().length >= 5);

  // No customers at all.
  if (!usersQuery.isLoading && customers.length === 0) {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
        <PageHero
          icon={UserCog}
          title="Create request for a customer"
          description="Raise a service request on behalf of a customer for one of their linked machines."
        />
        <div className={cn("rounded-2xl border p-6 text-center", cardSurface)}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <Users className="h-6 w-6" />
          </div>
          <h2 className="lp-display text-lg font-semibold text-[var(--lp-ink)]">
            No customers available
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--lp-ink-soft)]">
            Add or approve a customer first, then link a machine to their account.
          </p>
          <Button
            asChild
            variant="outline"
            className="mt-4 rounded-full border-[var(--lp-line-strong)]"
          >
            <Link to="/app/users">Go to Users</Link>
          </Button>
        </div>
        <BackToRequests />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl min-w-0 space-y-4 overflow-x-hidden">
      <PageHero
        icon={UserCog}
        eyebrow="Create Request · Admin"
        title="Create request for a customer"
        description="Select a customer, choose one of their linked machines, and describe the issue."
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.95fr)_minmax(280px,1fr)]">
        <form
          className={cn("min-w-0 overflow-hidden rounded-2xl border", cardSurface)}
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) {
              toast.error("Select a customer and machine, pick an issue, and describe it.");
              return;
            }
            mutation.mutate();
          }}
        >
          {/* Step 1 — Customer */}
          <FormSection icon={Users} title="Customer" description="Who is this request for?">
            <div className="relative mb-2.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lp-faint)]" />
              <Input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Search customer by name or email"
                className="lp-field h-10 rounded-xl border pl-9 text-sm"
              />
            </div>
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {filteredCustomers.length === 0 ? (
                <p className="px-1 py-3 text-sm text-[var(--lp-faint)]">No customers match.</p>
              ) : (
                filteredCustomers.map((customer) => {
                  const active = customer.id === customerId;
                  return (
                    <button
                      type="button"
                      key={customer.id}
                      onClick={() => setCustomerId(customer.id)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                        active
                          ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/[0.08]"
                          : "border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/40 hover:border-[var(--lp-accent)]/50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--lp-ink)]">
                          {customer.displayName}
                        </span>
                        <span className="block truncate text-xs text-[var(--lp-ink-soft)]">
                          {customer.email}
                        </span>
                      </span>
                      {customer.approvalStatus !== "approved" && (
                        <span className="shrink-0 rounded-full border border-amber-400/35 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-300">
                          {customer.approvalStatus === "pending_approval" ? "Pending" : customer.approvalStatus}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </FormSection>

          {/* Step 2 — Machine */}
          <FormSection icon={PackageCheck} title="Machine" description="Choose one of the customer's linked machines.">
            {!customerId ? (
              <p className="text-sm text-[var(--lp-faint)]">Select a customer first.</p>
            ) : machinesQuery.isLoading ? (
              <p className="text-sm text-[var(--lp-faint)]">Loading machines…</p>
            ) : activeMachines.length === 0 ? (
              <div className="rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-4 text-center">
                <p className="text-sm font-medium text-[var(--lp-ink)]">
                  This customer has no machines linked yet.
                </p>
                <Button
                  asChild
                  size="sm"
                  className="mt-3 rounded-full bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
                >
                  <Link to={`/app/machines?customerId=${customerId}`}>Link machine to customer</Link>
                </Button>
              </div>
            ) : (
              <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
                {activeMachines.map((machine) => {
                  const active = machine.id === machineId;
                  return (
                    <button
                      type="button"
                      key={machine.id}
                      onClick={() => setMachineId(machine.id)}
                      aria-pressed={active}
                      className={cn(
                        "min-w-0 rounded-xl border p-3.5 text-left transition-colors",
                        active
                          ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/[0.08]"
                          : "border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/40 hover:border-[var(--lp-accent)]/50",
                      )}
                    >
                      <p className="break-words text-sm font-semibold text-[var(--lp-ink)]">
                        {machine.displayLabel}
                      </p>
                      <p className="mt-0.5 break-words text-xs text-[var(--lp-ink-soft)]">
                        {machine.productSnapshot?.name ?? machine.productId}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--lp-faint)]">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="break-words">{machine.siteLocation}</span>
                      </p>
                      {machine.internalSerialNumber && (
                        <p className="mt-1 text-xs text-[var(--lp-faint)]">
                          Serial: {machine.internalSerialNumber}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </FormSection>

          {/* Step 3 — Issue */}
          <FormSection icon={Sparkles} title="Issue" description="What is happening with the machine?">
            <IssueFields
              issueType={issueType}
              onIssueType={setIssueType}
              urgency={urgency}
              onUrgency={setUrgency}
              description={description}
              onDescription={setDescription}
            />
          </FormSection>

          <FormSection
            icon={ImagePlus}
            title="Photos or video"
            description="Optional — attach evidence if the customer shared any."
          >
            <AttachmentPicker files={attachments.files} onAdd={attachments.add} onRemove={attachments.remove} />
          </FormSection>

          <div className="flex min-w-0 flex-col gap-3 border-t border-[var(--lp-line)] bg-[var(--lp-panel-2)] px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-7">
            <div className="flex min-w-0 items-center gap-2.5 text-xs text-[var(--lp-ink-soft)]">
              <UserCog className="h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
              <span className="min-w-0">
                {selectedCustomer
                  ? `Creating on behalf of ${selectedCustomer.displayName}.`
                  : "Select a customer to continue."}
              </span>
            </div>
            <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center">
              <Button
                asChild
                variant="outline"
                className="h-10 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)] px-5 text-sm text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]"
              >
                <Link to="/app/requests">Cancel</Link>
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-full bg-[var(--lp-accent)] px-5 text-sm font-semibold text-[#fbfaf6] transition-colors hover:bg-[var(--lp-accent-2)]"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Create request
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          {selectedMachine && (
            <div className={cn("min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-5", cardSurface)}>
              <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                Selected machine
              </p>
              <p className="mt-1.5 break-words text-sm font-semibold text-[var(--lp-ink)]">
                {selectedMachine.displayLabel}
              </p>
              <p className="mt-0.5 break-words text-xs text-[var(--lp-ink-soft)]">
                {selectedMachine.productSnapshot?.name ?? selectedMachine.productId}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--lp-faint)]">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{selectedMachine.siteLocation}</span>
              </p>
            </div>
          )}
          <GuidancePanel
            icon={Users}
            title="Creating on behalf"
            items={[
              "Pick the customer who owns the machine.",
              "Only that customer's active machines are shown.",
              "The request is filed under the customer's account.",
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminCreateRequest;
