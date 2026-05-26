import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
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
  "lp-field h-10 min-w-0 rounded-xl border px-4 text-sm";

const selectTriggerClassName =
  "lp-field h-10 min-w-0 rounded-xl border px-4 text-sm " +
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
    <section className="min-w-0 border-t border-[var(--lp-line)] px-5 py-5 sm:px-6 lg:px-7">
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
    <aside className={cn("min-w-0 overflow-hidden rounded-2xl border", cardSurface)}>
      <div className="relative p-4 sm:p-5">
        <div className="relative flex min-w-0 items-start gap-2.5">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", accentClass)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="lp-display text-sm font-semibold text-[var(--lp-ink)]">{title}</h3>
            {description && <p className="mt-0.5 text-xs leading-5 text-[var(--lp-ink-soft)]">{description}</p>}
          </div>
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
    <header className={cn("relative min-w-0 overflow-hidden rounded-2xl border p-5 sm:p-6", cardSurface)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
        style={{
          maskImage: "linear-gradient(to right, black, transparent 70%)",
          WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
        }}
      />
      <div className="relative flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
              <Icon className="h-4 w-4" />
            </div>
            <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
              Create Request
            </p>
          </div>
          <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)]">
            {title}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-[var(--lp-ink-soft)]">
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
      className="h-10 w-fit rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/60 px-5 text-sm text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
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
      <div className="mx-auto max-w-3xl min-w-0 space-y-4 overflow-x-hidden">
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
    <div className="mx-auto max-w-7xl min-w-0 space-y-4 overflow-x-hidden">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <PageHero
        icon={Wrench}
        title="Create service request"
        description="Tell us the machine, issue, and best contact details."
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.95fr)_minmax(280px,1fr)]">
        {/* ── Form card ──────────────────────────────────────────────────────── */}
        <form
          className={cn("min-w-0 overflow-hidden rounded-2xl border", cardSurface)}
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          {/* Error banner */}
          {mutation.isError && (
            <div className="mx-5 mb-2 mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3.5 text-sm text-rose-600 dark:text-rose-100 sm:mx-6 lg:mx-7">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500 dark:text-rose-300" />
                <div>
                  <p className="font-semibold">We couldn't create the request.</p>
                  <p className="mt-1 opacity-75">Please check the details and try again.</p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Machine details */}
          <FormSection
            icon={PackageCheck}
            title="Machine details"
            description="Select the affected product and add location details."
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

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field
                label="Product"
                required
                helper={selectedProduct ? "Attached to this service request." : undefined}
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
                <div className="min-w-0 rounded-xl border border-[var(--lp-accent)]/25 bg-[var(--lp-accent)]/[0.07] p-3 md:col-span-2">
                  <div className="flex min-w-0 gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/15 text-[var(--lp-accent)]">
                      <PackageCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-accent)]">
                        Selected product
                      </p>
                      <p className="mt-0.5 break-words text-sm font-medium text-[var(--lp-ink)]">{selectedProduct.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--lp-faint)]">
                        {formatCategorySlug(selectedProduct.categorySlug)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Field label="Serial Number">
                <Input
                  value={form.serialNumber}
                  onChange={(event) => setForm((current) => ({ ...current, serialNumber: event.target.value }))}
                  placeholder="Optional serial number"
                  className={inputClassName}
                />
              </Field>

              <Field label="Site Location" required helper="Workshop, branch, or city.">
                <Input
                  required
                  value={form.siteLocation}
                  onChange={(event) => setForm((current) => ({ ...current, siteLocation: event.target.value }))}
                  placeholder="Workshop / branch / city"
                  className={inputClassName}
                />
              </Field>
            </div>
          </FormSection>

          {/* Section: Issue details */}
          <FormSection
            icon={Sparkles}
            title="Issue details"
            description="Describe what happened and when it started."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Priority" required helper="Use urgent only for blocked production.">
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

              <Field label="Subject" required helper="Short, scannable summary.">
                <Input
                  required
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Short issue summary"
                  className={inputClassName}
                />
              </Field>

              <Field label="Description" required className="md:col-span-2">
                <Textarea
                  required
                  rows={7}
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Describe the problem, when it started, and what you already tried."
                  className={cn(inputClassName, "min-h-[130px] resize-y py-3")}
                />
              </Field>
            </div>
          </FormSection>

          {/* Section: Contact */}
          <FormSection
            icon={Phone}
            title="Contact"
            description="Add the best phone number for follow-up."
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Contact Phone" required helper="Best number during service hours.">
                <Input
                  required
                  value={form.contactPhone}
                  onChange={(event) => setForm((current) => ({ ...current, contactPhone: event.target.value }))}
                  placeholder="Best follow-up number"
                  className={inputClassName}
                />
              </Field>
            </div>
          </FormSection>

          {/* Form footer / submit */}
          <div className="flex min-w-0 flex-col gap-3 border-t border-[var(--lp-line)] bg-[var(--lp-panel-2)] px-5 py-4 sm:px-6 md:flex-row md:flex-wrap md:items-center md:justify-between lg:px-7">
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
                    Submit service request
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        {/* ── Guidance sidebar ────────────────────────────────────────────────── */}
        <div className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <GuidancePanel
            icon={ClipboardCheck}
            title="Before you submit"
            items={[
              "Select the correct machine or product.",
              "Add the site location.",
              "Describe the issue and what you already tried.",
              "Include the best phone number for follow-up.",
            ]}
          />
          <GuidancePanel
            icon={ArrowRight}
            title="What happens next"
            accent="emerald"
            items={[
              "Your request is saved in the portal.",
              "The support team reviews it.",
              "Updates appear in the request thread.",
              "An engineer or admin follows up.",
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default RequestNewPage;
