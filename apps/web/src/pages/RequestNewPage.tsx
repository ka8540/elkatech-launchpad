import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ClipboardCheck,
  ImagePlus,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import type { CustomerMachinePublic, IssueType, RequestPriority } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { uploadRequestAttachment } from "@/lib/attachments";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import VerifyEmailNotice from "@/components/VerifyEmailNotice";
import { ApprovalStateCard, isCustomerActionBlocked } from "@/components/ApprovalState";
import AdminCreateRequest from "@/components/request/AdminCreateRequest";
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
import { Button } from "@/components/ui/button";

/* ─── Customer flow ───────────────────────────────────────────────────────── */
const CustomerCreateRequest = () => {
  const navigate = useNavigate();
  const machinesQuery = useQuery({
    queryKey: ["me", "machines"],
    queryFn: () => apiRequest<CustomerMachinePublic[]>("/api/me/machines"),
  });
  const machines = useMemo(() => machinesQuery.data ?? [], [machinesQuery.data]);

  const [machineId, setMachineId] = useState("");
  const [issueType, setIssueType] = useState<IssueType | "">("");
  const [urgency, setUrgency] = useState<RequestPriority>("normal");
  const [description, setDescription] = useState("");
  const attachments = useAttachmentPicker();

  const selectedMachine = useMemo(
    () => machines.find((m) => m.id === machineId),
    [machineId, machines],
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const created = await apiRequest<{ id: string }>("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          customerMachineId: machineId,
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
        toast.success("Service request created.");
      }
      navigate(`/app/requests/${id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!machinesQuery.isLoading && machines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
        <PageHero
          icon={Wrench}
          title="Create service request"
          description="Choose the machine and tell us what went wrong."
        />
        <div className={cn("rounded-2xl border p-6 text-center", cardSurface)}>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <PackageCheck className="h-6 w-6" />
          </div>
          <h2 className="lp-display text-lg font-semibold text-[var(--lp-ink)]">
            No machines are linked to your account yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--lp-ink-soft)]">
            Contact ElkaTech support or wait for an admin to link your installed machine. Once a
            machine is linked, you can raise a service request here.
          </p>
        </div>
        <BackToRequests />
      </div>
    );
  }

  const canSubmit = Boolean(machineId && issueType && description.trim().length >= 5);

  return (
    <div className="mx-auto max-w-7xl min-w-0 space-y-4 overflow-x-hidden">
      <PageHero
        icon={Wrench}
        title="Create service request"
        description="Choose the machine and tell us what went wrong."
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.95fr)_minmax(280px,1fr)]">
        <form
          className={cn("min-w-0 overflow-hidden rounded-2xl border", cardSurface)}
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) {
              toast.error("Choose a machine, pick an issue, and tell us what happened.");
              return;
            }
            mutation.mutate();
          }}
        >
          <FormSection icon={PackageCheck} title="Machine" description="Choose the machine that needs service.">
            <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
              {machines.map((machine) => {
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
                      {machine.productName}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-[var(--lp-faint)]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="break-words">{machine.siteName ?? machine.siteLocation}</span>
                    </p>
                  </button>
                );
              })}
            </div>
          </FormSection>

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
            description="Add photos or a short video if it helps us understand the issue."
          >
            <AttachmentPicker files={attachments.files} onAdd={attachments.add} onRemove={attachments.remove} />
          </FormSection>

          <div className="flex min-w-0 flex-col gap-3 border-t border-[var(--lp-line)] bg-[var(--lp-panel-2)] px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-7">
            <div className="flex min-w-0 items-center gap-2.5 text-xs text-[var(--lp-ink-soft)]">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
              <span className="min-w-0">Saved to the service portal on submit.</span>
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
                    Submit request
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
                {selectedMachine.productName}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--lp-faint)]">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{selectedMachine.siteLocation}</span>
              </p>
              {selectedMachine.contactPhone && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--lp-faint)]">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="break-words">{selectedMachine.contactPhone}</span>
                </p>
              )}
            </div>
          )}
          <GuidancePanel
            icon={ClipboardCheck}
            title="Before submitting"
            items={[
              "Choose the correct machine.",
              "Add a photo or video if useful.",
              "Use urgent only if production is stopped.",
            ]}
          />
          <GuidancePanel
            icon={ArrowRight}
            title="What happens next"
            accent="emerald"
            items={[
              "Your request is saved in the portal.",
              "The support team reviews it.",
              "An engineer or admin follows up.",
            ]}
          />
        </div>
      </div>
    </div>
  );
};

/* ─── Page (role router) ──────────────────────────────────────────────────── */
const RequestNewPage = () => {
  const { data: session } = useSession();
  const user = session?.user;

  // Admins create requests on behalf of customers — never blocked by their own
  // (empty) machine list.
  if (user?.role === "admin") {
    return <AdminCreateRequest />;
  }

  // Approval / email gates apply to customers (and any non-admin) before the
  // machine flow.
  const approvalBlocked = isCustomerActionBlocked(user);
  if (approvalBlocked && user && user.approvalStatus !== "approved") {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
        <PageHero
          icon={ShieldCheck}
          title={
            user.approvalStatus === "pending_approval"
              ? "Waiting for admin approval"
              : user.approvalStatus === "rejected"
                ? "Account not approved"
                : "Account suspended"
          }
          description="Creating service requests unlocks once an ElkaTech administrator activates your account."
        />
        <ApprovalStateCard status={user.approvalStatus} showBackToRequests={false} />
        <BackToRequests />
      </div>
    );
  }

  if (user && !user.emailVerified) {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
        <PageHero
          icon={ShieldCheck}
          title="Verify your email first"
          description="For your account's security, service requests can only be created once your email is verified."
        />
        <VerifyEmailNotice email={user.email} />
        <BackToRequests />
      </div>
    );
  }

  return <CustomerCreateRequest />;
};

export default RequestNewPage;
