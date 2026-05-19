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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/* ─── Shared input class strings ────────────────────────────────────────────── */
const inputClassName =
  "h-12 min-w-0 rounded-2xl px-4 shadow-inner shadow-black/5 placeholder:text-slate-400 transition-colors " +
  "border-slate-200 bg-white text-slate-950 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-500/15 focus-visible:ring-offset-0 " +
  "dark:border-white/10 dark:bg-[#050b14]/80 dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:border-blue-400/60 dark:shadow-black/10";

const selectTriggerClassName =
  "h-12 min-w-0 rounded-2xl px-4 shadow-inner shadow-black/5 transition-colors " +
  "border-slate-200 bg-white text-slate-950 data-[placeholder]:text-slate-400 " +
  "dark:border-white/10 dark:bg-[#050b14]/80 dark:text-white dark:data-[placeholder]:text-slate-500 " +
  "focus:border-blue-400 focus:ring-2 focus:ring-blue-500/15 focus:ring-offset-0 " +
  "dark:focus:border-blue-400/60 dark:shadow-black/10 [&>span]:truncate";

const selectContentClassName =
  "rounded-2xl border shadow-2xl " +
  "border-slate-200 bg-white text-slate-900 shadow-black/10 " +
  "dark:border-white/10 dark:bg-[#07111f] dark:text-slate-100 dark:shadow-black/40";

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
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="text-blue-500 dark:text-blue-300" aria-hidden="true">*</span>}
      </label>
      {children}
      {helper && <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-500">{helper}</p>}
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
    <section className={cn(
      "min-w-0 border-t px-5 py-7 sm:px-7 lg:px-8",
      "border-slate-200 dark:border-white/10",
    )}>
      <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
            "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
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
  accent = "blue",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  items: string[];
  accent?: "blue" | "emerald";
}) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
      : "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300";

  return (
    <aside className={cn(
      "min-w-0 overflow-hidden rounded-3xl border shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl",
      "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1626]/70 dark:shadow-[0_24px_80px_rgba(0,0,0,0.18)]",
    )}>
      <div className="relative p-5 sm:p-6">
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-blue-500/5 blur-3xl dark:bg-blue-500/10" />
        <div className="relative flex min-w-0 items-start gap-3">
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border", accentClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        <ul className="relative mt-5 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex min-w-0 gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
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

  // Email verification is required before a service request can be created.
  // The gateway enforces this too (403); guarding here gives a clear,
  // polished message instead of a generic submit failure.
  const unverifiedUser =
    session?.user && !session.user.emailVerified ? session.user : null;

  if (unverifiedUser) {
    return (
      <div className="mx-auto max-w-3xl min-w-0 space-y-6 overflow-x-hidden">
        <header className={cn(
          "relative min-w-0 overflow-hidden rounded-3xl border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-8",
          "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1626]/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.22)]",
        )}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(59,130,246,0.07),transparent_34%)] dark:bg-[radial-gradient(circle_at_16%_0%,rgba(59,130,246,0.18),transparent_34%)]" />
          <div className="relative min-w-0">
            <div className="mb-5 flex items-center gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl border shadow-glow",
                "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
              )}>
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-600 dark:text-blue-300">Create Request</p>
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight text-slate-900 dark:text-white">
              Verify your email first
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              For your account&apos;s security, service requests can only be created once your
              email address is verified. It takes less than a minute.
            </p>
          </div>
        </header>

        <VerifyEmailNotice email={unverifiedUser.email} />

        <Button
          asChild
          variant="outline"
          className={cn(
            "h-11 w-fit rounded-full px-5",
            "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
            "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white",
          )}
        >
          <Link to="/app/requests">
            <ArrowLeft className="h-4 w-4" />
            Back to requests
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl min-w-0 space-y-8 overflow-x-hidden">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <header className={cn(
        "relative min-w-0 overflow-hidden rounded-3xl border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:p-8",
        "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1626]/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.22)]",
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(59,130,246,0.07),transparent_34%),radial-gradient(circle_at_92%_20%,rgba(16,185,129,0.05),transparent_30%)] dark:bg-[radial-gradient(circle_at_16%_0%,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_92%_20%,rgba(16,185,129,0.12),transparent_30%)]" />
        <div className="relative flex min-w-0 flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="mb-5 flex items-center gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl border shadow-glow",
                "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
              )}>
                <Wrench className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-blue-600 dark:text-blue-300">Create Request</p>
            </div>
            <h1 className="font-display text-3xl font-bold leading-tight text-slate-900 dark:text-white sm:text-4xl">
              Request service support
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
              Tell us what machine needs attention and what problem you are facing. Our team will use this information
              to triage your request.
            </p>
          </div>
          <div className={cn(
            "w-fit max-w-full rounded-full border px-4 py-2 text-sm font-medium",
            "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300",
          )}>
            Support team review
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.95fr)_minmax(320px,1fr)]">
        {/* ── Form card ──────────────────────────────────────────────────────── */}
        <form
          className={cn(
            "min-w-0 overflow-hidden rounded-3xl border shadow-[0_24px_80px_rgba(0,0,0,0.06)] backdrop-blur-xl",
            "border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1626]/85 dark:shadow-[0_24px_80px_rgba(0,0,0,0.25)]",
          )}
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          {/* Form header */}
          <div className="flex min-w-0 flex-col gap-4 px-5 py-6 sm:px-7 lg:flex-row lg:items-start lg:justify-between lg:px-8">
            <div className="min-w-0">
              <div className={cn(
                "mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
              )}>
                <ClipboardCheck className="h-3.5 w-3.5" />
                Required details
              </div>
              <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">Service details</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Choose the affected product and describe the issue clearly.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className={cn(
                "h-10 w-fit rounded-full px-4",
                "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white",
              )}
            >
              <Link to="/app/requests">
                <ArrowLeft className="h-4 w-4" />
                Back to requests
              </Link>
            </Button>
          </div>

          {/* Error banner */}
          {mutation.isError && (
            <div className={cn(
              "mx-5 mb-2 rounded-2xl border p-4 text-sm sm:mx-7 lg:mx-8",
              "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100",
            )}>
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500 dark:text-rose-300" />
                <div>
                  <p className="font-semibold">We couldn't create the request.</p>
                  <p className="mt-1 text-rose-600/75 dark:text-rose-100/75">Please check the details and try again.</p>
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
              <div className={cn(
                "mb-5 rounded-2xl border p-4 text-sm",
                "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-50",
              )}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-200" />
                    <div>
                      <p className="font-semibold">Unable to load products</p>
                      <p className="mt-1 text-amber-700/70 dark:text-amber-50/70">Try again before selecting the affected machine.</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-10 rounded-xl",
                      "border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200",
                      "dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-50 dark:hover:bg-amber-200/15 dark:hover:text-white",
                    )}
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
                      <SelectItem key={product.id} value={product.id} className="rounded-xl py-2.5 text-sm">
                        <span className="block truncate">{product.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {selectedProduct && (
                <div className={cn(
                  "min-w-0 rounded-2xl border p-4 md:col-span-2",
                  "border-blue-200 bg-blue-50 dark:border-blue-400/15 dark:bg-blue-500/[0.08]",
                )}>
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                        "border-blue-200 bg-blue-100 text-blue-600 dark:border-blue-300/20 dark:bg-blue-300/10 dark:text-blue-200",
                      )}>
                        <PackageCheck className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-200">
                          Selected product
                        </p>
                        <p className="mt-1 break-words font-medium text-slate-900 dark:text-white">{selectedProduct.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
                      <SelectItem key={priority.value} value={priority.value} className="rounded-xl py-2.5">
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
          <div className={cn(
            "flex min-w-0 flex-col gap-4 border-t px-5 py-5 sm:px-7 md:flex-row md:items-center md:justify-between lg:px-8",
            "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#07111f]/70",
          )}>
            <div className="flex items-start gap-3 text-sm text-slate-500 dark:text-slate-400">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-300" />
              <span>Your request will be saved to the service portal.</span>
            </div>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                asChild
                variant="outline"
                className={cn(
                  "h-12 rounded-2xl px-5",
                  "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white",
                )}
              >
                <Link to="/app/requests">Cancel</Link>
              </Button>
              <Button
                type="submit"
                size="lg"
                className="h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-emerald-400 px-6 font-semibold text-white shadow-[0_16px_36px_rgba(37,99,235,0.28)] hover:from-blue-400 hover:to-emerald-300"
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
          <div className={cn(
            "rounded-3xl border p-5 text-sm leading-6",
            "border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-[#07111f]/75 dark:text-slate-400",
          )}>
            <div className="mb-3 flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
              <HelpCircle className="h-4 w-4 text-blue-500 dark:text-blue-300" />
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
