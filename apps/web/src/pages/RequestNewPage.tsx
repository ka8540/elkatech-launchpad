import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  ISSUE_TYPE_LABELS,
  issueTypeSchema,
  type CustomerMachinePublic,
  type IssueType,
  type RequestPriority,
} from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { formatFileSize, uploadRequestAttachment } from "@/lib/attachments";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import VerifyEmailNotice from "@/components/VerifyEmailNotice";
import { ApprovalStateCard, isCustomerActionBlocked } from "@/components/ApprovalState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const cardSurface = "lp-card";

const MAX_ATTACHMENT_MB = 25;
const ISSUE_TYPES = issueTypeSchema.options as IssueType[];

/* ─── Section block ───────────────────────────────────────────────────────── */
function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border-t border-[var(--lp-line)] px-5 py-5 first:border-t-0 sm:px-6 lg:px-7">
      <div className="mb-4 flex min-w-0 items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="lp-display text-base font-semibold text-[var(--lp-ink)]">{title}</h3>
          <p className="mt-0.5 text-xs leading-5 text-[var(--lp-ink-soft)]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function GuidancePanel({
  icon: Icon,
  title,
  items,
  accent = "copper",
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
  accent?: "copper" | "emerald";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
      : "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]";
  return (
    <aside className={cn("min-w-0 overflow-hidden rounded-2xl border", cardSurface)}>
      <div className="relative p-4 sm:p-5">
        <div className="relative flex min-w-0 items-start gap-2.5">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", accentClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="lp-display text-sm font-semibold text-[var(--lp-ink)]">{title}</h3>
        </div>
        <ul className="relative mt-4 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex min-w-0 gap-2.5 text-xs leading-5 text-[var(--lp-ink-soft)]">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lp-accent)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function PageHero({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <header className={cn("relative min-w-0 overflow-hidden rounded-2xl border p-5 sm:p-6", cardSurface)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
        style={{
          maskImage: "linear-gradient(to right, black, transparent 70%)",
          WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
        }}
      />
      <div className="relative min-w-0">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <Icon className="h-4 w-4" />
          </div>
          <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
            Create Request
          </p>
        </div>
        <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)]">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-[var(--lp-ink-soft)]">{description}</p>
      </div>
    </header>
  );
}

function BackToRequests() {
  return (
    <Button
      asChild
      variant="outline"
      className="h-10 w-fit rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/60 px-5 text-sm text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
    >
      <Link to="/app/requests">
        <ArrowLeft className="h-4 w-4" />
        Back to requests
      </Link>
    </Button>
  );
}

type PickedFile = { key: string; file: File; previewUrl?: string };

/* ─── Page ────────────────────────────────────────────────────────────────── */
const RequestNewPage = () => {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const machinesQuery = useQuery({
    queryKey: ["me", "machines"],
    queryFn: () => apiRequest<CustomerMachinePublic[]>("/api/me/machines"),
  });
  const machines = useMemo(() => machinesQuery.data ?? [], [machinesQuery.data]);

  const [machineId, setMachineId] = useState("");
  const [issueType, setIssueType] = useState<IssueType | "">("");
  const [urgency, setUrgency] = useState<RequestPriority>("normal");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<PickedFile[]>([]);

  const selectedMachine = useMemo(
    () => machines.find((m) => m.id === machineId),
    [machineId, machines],
  );

  // Revoke object URLs on unmount to avoid leaks.
  useEffect(() => {
    return () => {
      files.forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPickFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = ""; // allow re-picking the same file
    const next: PickedFile[] = [];
    for (const file of picked) {
      const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
      if (!isMedia) {
        toast.error(`${file.name} is not a photo or video.`);
        continue;
      }
      if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${MAX_ATTACHMENT_MB} MB.`);
        continue;
      }
      next.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    if (next.length) setFiles((current) => [...current, ...next]);
  }

  function removeFile(key: string) {
    setFiles((current) => {
      const target = current.find((f) => f.key === key);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((f) => f.key !== key);
    });
  }

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
      // Upload attachments after the request exists; a failed upload doesn't
      // discard the request.
      const failed: string[] = [];
      for (const picked of files) {
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
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // ── Gated states (kept from the original flow) ───────────────────────────
  const approvalBlocked = isCustomerActionBlocked(session?.user);
  if (approvalBlocked && session?.user && session.user.approvalStatus !== "approved") {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
        <PageHero
          icon={ShieldCheck}
          title={
            session.user.approvalStatus === "pending_approval"
              ? "Waiting for admin approval"
              : session.user.approvalStatus === "rejected"
                ? "Account not approved"
                : "Account suspended"
          }
          description="Creating service requests unlocks once an ElkaTech administrator activates your account."
        />
        <ApprovalStateCard status={session.user.approvalStatus} showBackToRequests={false} />
        <BackToRequests />
      </div>
    );
  }

  const unverifiedUser = session?.user && !session.user.emailVerified ? session.user : null;
  if (unverifiedUser) {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
        <PageHero
          icon={ShieldCheck}
          title="Verify your email first"
          description="For your account's security, service requests can only be created once your email is verified."
        />
        <VerifyEmailNotice email={unverifiedUser.email} />
        <BackToRequests />
      </div>
    );
  }

  // ── No machines linked ───────────────────────────────────────────────────
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
            Please contact ElkaTech support and we'll add your machines. Once they're linked, you
            can raise a service request here.
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
          {/* Card 1 — Machine */}
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

          {/* Card 2 — Issue */}
          <FormSection icon={Sparkles} title="Issue" description="What is happening with the machine?">
            <div className="space-y-5">
              <div>
                <p className="mb-2.5 text-sm font-medium text-[var(--lp-ink)]">What is the issue?</p>
                <div className="flex flex-wrap gap-2">
                  {ISSUE_TYPES.map((type) => {
                    const active = type === issueType;
                    return (
                      <button
                        type="button"
                        key={type}
                        onClick={() => setIssueType(type)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-3.5 py-2 text-sm transition-colors",
                          active
                            ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/[0.12] text-[var(--lp-accent)]"
                            : "border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/40 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]",
                        )}
                      >
                        {ISSUE_TYPE_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2.5 text-sm font-medium text-[var(--lp-ink)]">How urgent is it?</p>
                <div className="inline-flex flex-wrap gap-2">
                  {[
                    { value: "normal" as RequestPriority, label: "Normal" },
                    { value: "urgent" as RequestPriority, label: "Urgent — production stopped" },
                  ].map((option) => {
                    const active = option.value === urgency;
                    return (
                      <button
                        type="button"
                        key={option.value}
                        onClick={() => setUrgency(option.value)}
                        aria-pressed={active}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm transition-colors",
                          active
                            ? "border-[var(--lp-accent)] bg-[var(--lp-accent)]/[0.12] text-[var(--lp-accent)]"
                            : "border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/40 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-2.5 block text-sm font-medium text-[var(--lp-ink)]">
                  Tell us what happened
                </label>
                <Textarea
                  rows={5}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Example: Printer stops after 10 minutes."
                  className="lp-field min-h-[120px] resize-y rounded-xl border px-4 py-3 text-sm"
                />
              </div>
            </div>
          </FormSection>

          {/* Card 3 — Photos or video */}
          <FormSection
            icon={ImagePlus}
            title="Photos or video"
            description="Add photos or a short video if it helps us understand the issue."
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-10 rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/60 px-4 text-sm text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]"
            >
              <ImagePlus className="h-4 w-4" />
              Add photos or video
            </Button>

            {files.length > 0 && (
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {files.map((picked) => (
                  <li
                    key={picked.key}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/40 p-2.5"
                  >
                    {picked.previewUrl ? (
                      <img
                        src={picked.previewUrl}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel)] text-[var(--lp-accent)]">
                        <Sparkles className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--lp-ink)]">{picked.file.name}</p>
                      <p className="text-xs text-[var(--lp-faint)]">{formatFileSize(picked.file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(picked.key)}
                      aria-label={`Remove ${picked.file.name}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--lp-faint)] transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          {/* Footer */}
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

        {/* Sidebar */}
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

export default RequestNewPage;
