import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Headphones,
  HelpCircle,
  Loader2,
  PackageCheck,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { CatalogProduct, RequestPriority } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import VerifyEmailNotice from "@/components/VerifyEmailNotice";
import { ApprovalStateCard, isCustomerActionBlocked } from "@/components/ApprovalState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/* ─── Matte card surface ──────────────────────────────────────────────────── */
const cardSurface = "lp-card";

/* ─── Form field classes ──────────────────────────────────────────────────── */
/*
 * The `.lp-field` utility (defined in index.css) sets a solid matte
 * background, border, text, and placeholder colors via real CSS — not via
 * `bg-[var(--lp-*)]/opacity` Tailwind classes, which Tailwind v3 drops on
 * hex-valued CSS vars and which would otherwise leave inputs with no
 * background at all (rendering as user-agent white in dark mode).
 */
const inputClassName =
  "lp-field h-12 min-w-0 rounded-xl border px-4 text-[15px]";

const selectTriggerClassName =
  "lp-field h-12 min-w-0 rounded-xl border px-4 text-[15px] " +
  "flex items-center justify-between [&>span]:truncate data-[placeholder]:text-[var(--lp-faint)]";

/*
 * Radix Select portals its content to <body>, OUTSIDE the `.lp` subtree.
 * The `lp-portal` class (also defined in index.css) re-declares the
 * lp tokens so the portaled menu still resolves them.
 */
const selectContentClassName =
  "lp-portal rounded-xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink)] shadow-[0_18px_44px_rgba(0,0,0,0.38)]";

/*
 * Override shadcn SelectItem default `focus:bg-accent focus:text-accent-foreground`
 * (global electric blue) with the copper accent at low opacity.
 */
const selectItemClassName =
  "rounded-lg py-2.5 pl-8 pr-3 text-sm text-[var(--lp-ink)] " +
  "focus:bg-[var(--lp-accent)]/15 focus:text-[var(--lp-accent)] " +
  "data-[state=checked]:text-[var(--lp-accent)]";

/* ─── Form config ───────────────────────────────────────────────────────────── */
const priorityOptions: Array<{ value: RequestPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function formatCategorySlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/* ─── Field wrapper ─────────────────────────────────────────────────────────── */
function Field({
  label,
  required,
  helper,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-2.5", className)}>
      <label className="flex items-center gap-1.5 text-sm font-medium text-[var(--lp-ink)]">
        {label}
        {required && <span className="text-[var(--lp-accent)]" aria-hidden="true">*</span>}
      </label>
      {children}
      {helper && <p className="text-xs leading-relaxed text-[var(--lp-faint)]">{helper}</p>}
    </div>
  );
}

/* ─── Form section block ─────────────────────────────────────────────────────── */
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
    <section className="min-w-0 border-t border-[var(--lp-line)] px-5 py-7 sm:px-7 lg:px-8">
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="lp-display text-xl font-semibold text-[var(--lp-ink)]">{title}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--lp-ink-soft)]">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

/* ─── Guidance panel (sidebar) ───────────────────────────────────────────────── */
function GuidancePanel({
  icon: Icon,
  title,
  description,
  items,
  accent = "copper",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  items: string[];
  accent?: "copper" | "emerald";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300"
      : "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]";

  return (
    <aside className={cn("min-w-0 overflow-hidden rounded-3xl border", cardSurface)}>
      <div className="relative p-5 sm:p-6">
        <div className="relative flex min-w-0 items-start gap-3">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", accentClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="lp-display text-lg font-semibold text-[var(--lp-ink)]">{title}</h3>
            {description && <p className="mt-1 text-sm leading-6 text-[var(--lp-ink-soft)]">{description}</p>}
          </div>
        </div>
        <ul className="relative mt-5 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex min-w-0 gap-3 text-sm leading-6 text-[var(--lp-ink-soft)]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/* ─── Page hero (shared across gated + main states) ──────────────────────────── */
function PageHero({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <header className={cn("relative min-w-0 overflow-hidden rounded-3xl border p-6 sm:p-8", cardSurface)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
        style={{
          maskImage: "linear-gradient(to right, black, transparent 70%)",
          WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
        }}
      />
      <div className="relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
              <Icon className="h-5 w-5" />
            </div>
            <p className="lp-mono text-xs font-semibold uppercase tracking-[0.32em] text-[var(--lp-accent)]">
              Create Request
            </p>
          </div>
          <h1 className="lp-display text-3xl font-bold leading-tight text-[var(--lp-ink)] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--lp-ink-soft)] sm:text-base">
            {description}
          </p>
        </div>
        {badge}
      </div>
    </header>
  );
}

/* ─── Back to requests button ────────────────────────────────────────────────── */
function BackToRequests() {
  return (
    <Button
      asChild
      variant="outline"
      className="h-11 w-fit rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/60 px-5 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
    >
      <Link to="/app/requests">
        <ArrowLeft className="h-4 w-4" />
        Back to requests
      </Link>
    </Button>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */
const RequestNewPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: session } = useSession();
  const requestedProductId = searchParams.get("product") ?? "";
  const productsQuery = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: () => apiRequest<CatalogProduct[]>("/api/catalog/products"),
  });
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const [form, setForm] = useState({
    productId: requestedProductId,
    subject: "",
    description: "",
    contactPhone: "",
    siteLocation: "",
    serialNumber: "",
    priority: "normal" as RequestPriority,
  });

  useEffect(() => {
    if (requestedProductId) {
      setForm((current) => ({ ...current, productId: requestedProductId }));
    }
  }, [requestedProductId]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId),
    [form.productId, products],
  );

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ id: string }>("/api/requests", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: ({ id }) => {
      toast.success("Service request created.");
      navigate(`/app/requests/${id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Admin approval is required before a customer can submit a service request.
  // The gateway enforces this too (403); short-circuiting here renders the
  // polished pending/rejected/suspended card instead of the form.
  const approvalBlocked = isCustomerActionBlocked(session?.user);
  if (approvalBlocked && session?.user && session.user.approvalStatus !== "approved") {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-6 overflow-x-hidden">
        <PageHero
          icon={ShieldCheck}
          title={
            session.user.approvalStatus === "pending_approval"
              ? "Waiting for admin approval"
              : session.user.approvalStatus === "rejected"
                ? "Account not approved"
                : "Account suspended"
          }
          description="Service request creation unlocks once an ElkaTech administrator activates your account. We'll have you up and running shortly."
        />

        <ApprovalStateCard
          status={session.user.approvalStatus}
          showBackToRequests={false}
        />

        <BackToRequests />
      </div>
    );
  }

  // Email verification is required before a service request can be created.
  // The gateway enforces this too (403); guarding here gives a clear,
  // polished message instead of a generic submit failure.
  const unverifiedUser =
    session?.user && !session.user.emailVerified ? session.user : null;

  if (unverifiedUser) {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-6 overflow-x-hidden">
        <PageHero
          icon={ShieldCheck}
          title="Verify your email first"
          description="For your account's security, service requests can only be created once your email address is verified. It takes less than a minute."
        />

        <VerifyEmailNotice email={unverifiedUser.email} />

        <BackToRequests />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <PageHero
        icon={Wrench}
        title="Request service support"
        description="Tell us what machine needs attention and what problem you are facing. Our team will use this information to triage your request."
        badge={
          <div className="w-fit max-w-full rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-4 py-2 text-sm font-medium text-[var(--lp-ink-soft)]">
            Support team review
          </div>
        }
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.95fr)_minmax(320px,1fr)]">
        {/* ── Form card ──────────────────────────────────────────────────────── */}
        <form
          className={cn("min-w-0 overflow-hidden rounded-3xl border", cardSurface)}
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          {/* Form header */}
          <div className="flex min-w-0 flex-col gap-4 px-5 py-6 sm:px-7 lg:flex-row lg:items-start lg:justify-between lg:px-8">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Required details
              </div>
              <h2 className="lp-display text-2xl font-semibold text-[var(--lp-ink)]">Service details</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--lp-ink-soft)]">
                Choose the affected product and describe the issue clearly.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="h-10 w-fit rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-4 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
            >
              <Link to="/app/requests">
                <ArrowLeft className="h-4 w-4" />
                Back to requests
              </Link>
            </Button>
          </div>

          {/* Error banner */}
          {mutation.isError && (
            <div className="mx-5 mb-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-100 sm:mx-7 lg:mx-8">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500 dark:text-rose-300" />
                <div>
                  <p className="font-semibold">We couldn't create the request.</p>
                  <p className="mt-1 opacity-75">Please check the details and try again.</p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Machine information */}
          <FormSection
            icon={PackageCheck}
            title="Machine information"
            description="Select the product and provide any machine identifiers that can help us locate the issue faster."
          >
            {productsQuery.isError && (
              <div className="mb-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-700 dark:text-amber-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-200" />
                    <div>
                      <p className="font-semibold">Unable to load products</p>
                      <p className="mt-1 opacity-70">Try again before selecting the affected machine.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl border-amber-400/40 bg-amber-400/15 text-amber-700 hover:bg-amber-400/25 dark:text-amber-50"
                    onClick={() => productsQuery.refetch()}
                    disabled={productsQuery.isFetching}
                  >
                    {productsQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
                    Retry
                  </Button>
                </div>
              </div>
            )}

            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              <Field
                label="Product"
                required
                helper={
                  selectedProduct
                    ? "This product will be attached to the service request."
                    : "Choose the affected machine or product."
                }
                className="md:col-span-2"
              >
                <Select
                  value={form.productId}
                  onValueChange={(value) => setForm((current) => ({ ...current, productId: value }))}
                  disabled={productsQuery.isLoading || productsQuery.isError}
                >
                  <SelectTrigger className={selectTriggerClassName} aria-label="Product">
                    <SelectValue placeholder={productsQuery.isLoading ? "Loading products..." : "Select a product"} />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id} className={selectItemClassName}>
                        <span className="block truncate">{product.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {selectedProduct && (
                <div className="min-w-0 rounded-2xl border border-[var(--lp-accent)]/25 bg-[var(--lp-accent)]/[0.07] p-4 md:col-span-2">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/15 text-[var(--lp-accent)]">
                        <PackageCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="lp-mono text-xs font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                          Selected product
                        </p>
                        <p className="mt-1 break-words font-medium text-[var(--lp-ink)]">{selectedProduct.name}</p>
                        <p className="mt-1 text-xs text-[var(--lp-faint)]">
                          Category: {formatCategorySlug(selectedProduct.categorySlug)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <Field label="Serial Number" helper="Optional machine serial number.">
                <Input
                  value={form.serialNumber}
                  onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))}
                  placeholder="Optional machine serial number"
                  className={inputClassName}
                />
              </Field>

              <Field label="Site Location" required helper="Workshop, branch, or machine location.">
                <Input
                  required
                  value={form.siteLocation}
                  onChange={(event) => setForm((current) => ({ ...current, siteLocation: event.target.value }))}
                  placeholder="Workshop / branch / machine location"
                  className={inputClassName}
                />
              </Field>
            </div>
          </FormSection>

          {/* Section: Issue information */}
          <FormSection
            icon={Sparkles}
            title="Issue information"
            description="Summarize the problem and include what you already tried."
          >
            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              <Field label="Priority" required helper="Choose urgent only for issues blocking active production.">
                <Select
                  value={form.priority}
                  onValueChange={(value) => setForm((current) => ({ ...current, priority: value as RequestPriority }))}
                >
                  <SelectTrigger className={selectTriggerClassName} aria-label="Priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClassName}>
                    {priorityOptions.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value} className={selectItemClassName}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Subject" required helper="Use a short summary that is easy to scan.">
                <Input
                  required
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Short summary, e.g. Printer not feeding media"
                  className={inputClassName}
                />
              </Field>

              <Field label="Description" required className="md:col-span-2">
                <Textarea
                  required
                  rows={7}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Example: Printer stops feeding media after 10-15 minutes. We checked the rollers and restarted the machine, but the issue returns."
                  className={cn(inputClassName, "min-h-[170px] resize-y py-4")}
                />
              </Field>
            </div>
          </FormSection>

          {/* Section: Contact details */}
          <FormSection
            icon={Phone}
            title="Contact details"
            description="Add the best phone number for follow-up if our team needs clarification."
          >
            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              <Field label="Contact Phone" required helper="Use the number your team can answer during service follow-up.">
                <Input
                  required
                  value={form.contactPhone}
                  onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                  placeholder="+91 98765 43210"
                  className={inputClassName}
                />
              </Field>
            </div>
          </FormSection>

          {/* Form footer / submit */}
          <div className="flex min-w-0 flex-col gap-4 border-t border-[var(--lp-line)] bg-[var(--lp-panel-2)] px-5 py-5 sm:px-7 md:flex-row md:flex-wrap md:items-center md:justify-between lg:px-8">
            <div className="flex min-w-0 items-start gap-3 text-sm text-[var(--lp-ink-soft)]">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--lp-accent)]" />
              <span className="min-w-0">Your request will be saved to the service portal.</span>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                variant="outline"
                className="h-12 rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel)] px-5 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:text-[var(--lp-ink)]"
              >
                <Link to="/app/requests">Cancel</Link>
              </Button>
              <Button
                type="submit"
                size="lg"
                className="h-12 rounded-xl bg-[var(--lp-accent)] px-6 font-semibold text-[#fbfaf6] transition-colors hover:bg-[var(--lp-accent-2)]"
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
                    Submit service request
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* ── Guidance sidebar ────────────────────────────────────────────────── */}
        <div className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <GuidancePanel
            icon={ClipboardCheck}
            title="What to include"
            description="Clear details help the service team route your request."
            items={[
              "Machine model or selected product",
              "Short issue summary",
              "When the issue started",
              "Any troubleshooting already tried",
            ]}
          />
          <GuidancePanel
            icon={ArrowRight}
            title="What happens next"
            accent="emerald"
            items={[
              "Request submitted to the portal",
              "Team reviews the details",
              "You receive updates in the portal",
              "Engineer or admin follows up if needed",
            ]}
          />
          <GuidancePanel
            icon={Headphones}
            title="Need help?"
            description="Keep the request factual and include the best follow-up number."
            items={[
              "Use priority to signal production impact",
              "Add location details for the affected machine",
              "Return to the portal to track updates",
            ]}
          />
          <div className={cn("rounded-3xl border p-5 text-sm leading-6 text-[var(--lp-ink-soft)]", cardSurface)}>
            <div className="mb-3 flex items-center gap-2 font-medium text-[var(--lp-ink)]">
              <HelpCircle className="h-4 w-4 text-[var(--lp-accent)]" />
              Request quality check
            </div>
            A concise subject, accurate product, and clear troubleshooting notes help the team understand the issue
            before follow-up.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestNewPage;
