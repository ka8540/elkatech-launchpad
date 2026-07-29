import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bug, Loader2, ShieldCheck } from "lucide-react";
import type { ReportArea, ReportSeverity } from "@elkatech/contracts";
import {
  REPORT_DESCRIPTION_MAX,
  REPORT_ERROR_MAX,
  REPORT_STEPS_MAX,
  REPORT_TITLE_MAX,
} from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { PAGE_CONTAINER_READING } from "@/lib/page-layout";
import { captureReportContext } from "@/lib/report-context";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_AREA_OPTIONS,
  REPORT_SEVERITY_OPTIONS,
  reportBrowserLabel,
  reportOsLabel,
} from "@/components/reports/report-access";

type FormErrors = { title?: string; description?: string };

/**
 * Customer-facing problem report.
 *
 * The technical context panel is deliberately visible rather than silent: the
 * customer can see exactly what is being attached before they submit, which is
 * the honest way to collect diagnostics. Everything in it is scrubbed at
 * capture time — no raw user agent, no query strings, no identifiers.
 */
export default function ReportNewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Opening the form from a request or machine page carries that reference
  // through, so staff can tie the report to what the customer was looking at.
  const state = (location.state ?? {}) as {
    relatedRequestId?: string;
    relatedMachineId?: string;
    fromRoute?: string;
  };

  const [form, setForm] = useState({
    title: "",
    description: "",
    exactError: "",
    stepsToReproduce: "",
    applicationArea: "other" as ReportArea,
    severity: "medium" as ReportSeverity,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const [context] = useState(() =>
    captureReportContext({
      // The route the customer came *from* is what matters, not this form's URL.
      route: state.fromRoute ?? document.referrer ?? location.pathname,
      userAgent: navigator.userAgent,
      relatedRequestId: state.relatedRequestId ?? null,
      relatedMachineId: state.relatedMachineId ?? null,
    }),
  );

  const submit = useMutation({
    mutationFn: () =>
      apiRequest<{ id: string; reportNumber: string }>("/api/reports", {
        method: "POST",
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          exactError: form.exactError.trim() || undefined,
          stepsToReproduce: form.stepsToReproduce.trim() || undefined,
          applicationArea: form.applicationArea,
          severity: form.severity,
          context,
        }),
      }),
    onSuccess: (payload) => {
      toast.success(`Report ${payload.reportNumber} submitted.`);
      navigate("/app/my-reports", { replace: true });
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError && error.status === 429) {
        toast.error("You have submitted several reports recently. Please try again later.");
        return;
      }
      toast.error(
        error instanceof ApiError ? error.message : "Could not submit the report.",
      );
    },
  });

  function validate(): FormErrors {
    const next: FormErrors = {};
    const title = form.title.trim();
    const description = form.description.trim();
    if (title.length < 4) next.title = "Give the report a short, specific title.";
    if (description.length < 10) {
      next.description = "Please describe what happened in a little more detail.";
    }
    return next;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    submit.mutate();
  }

  return (
    <div className={PAGE_CONTAINER_READING}>
      <PageHeader
        icon={Bug}
        title="Report a problem"
        description="Tell us what went wrong. Your report reaches our team without your name attached."
      />

      {/* noValidate: inline messages rather than the browser's native bubble. */}
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="report-title"
            className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
          >
            Report title
          </label>
          <Input
            id="report-title"
            value={form.title}
            maxLength={REPORT_TITLE_MAX}
            placeholder="Unable to upload service-request image"
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "report-title-error" : undefined}
            className="lp-field"
          />
          {errors.title && (
            <p id="report-title-error" className="mt-1.5 text-xs text-rose-600 dark:text-rose-300">
              {errors.title}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="report-description"
            className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
          >
            What happened?
          </label>
          <Textarea
            id="report-description"
            rows={5}
            value={form.description}
            maxLength={REPORT_DESCRIPTION_MAX}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
            aria-invalid={Boolean(errors.description)}
            aria-describedby="report-description-help"
            className="lp-field"
          />
          <p id="report-description-help" className="mt-1.5 text-xs text-[var(--lp-faint)]">
            Describe what you were trying to do, what happened, and what you expected instead.
          </p>
          {errors.description && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-300">{errors.description}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="report-error"
            className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
          >
            Exact error message <span className="text-[var(--lp-faint)]">(optional)</span>
          </label>
          <Textarea
            id="report-error"
            rows={3}
            value={form.exactError}
            maxLength={REPORT_ERROR_MAX}
            placeholder="Upload failed: Unable to create attachment URL"
            onChange={(event) =>
              setForm((current) => ({ ...current, exactError: event.target.value }))
            }
            aria-describedby="report-error-help"
            className="lp-field lp-mono text-xs"
          />
          <p id="report-error-help" className="mt-1.5 text-xs text-[var(--lp-faint)]">
            Paste the error exactly as the app showed it. Anything that looks like a password or
            access token is removed automatically before the report is saved.
          </p>
        </div>

        <div>
          <label
            htmlFor="report-area"
            className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
          >
            Area of the application
          </label>
          <select
            id="report-area"
            value={form.applicationArea}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                applicationArea: event.target.value as ReportArea,
              }))
            }
            className="lp-field h-10 w-full cursor-pointer rounded-md border px-3 text-sm"
          >
            {REPORT_AREA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-[var(--lp-ink)]">Severity</legend>
          <div className="space-y-2">
            {REPORT_SEVERITY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                  form.severity === option.value
                    ? "border-[var(--lp-accent)]/55 bg-[var(--lp-accent)]/[0.07]"
                    : "border-[var(--lp-line)] hover:border-[var(--lp-line-strong)]",
                )}
              >
                <input
                  type="radio"
                  name="report-severity"
                  value={option.value}
                  checked={form.severity === option.value}
                  onChange={() =>
                    setForm((current) => ({ ...current, severity: option.value }))
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--lp-accent)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[var(--lp-ink)]">
                    {option.label}
                  </span>
                  <span className="block text-xs leading-5 text-[var(--lp-ink-soft)]">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="report-steps"
            className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
          >
            Steps to reproduce <span className="text-[var(--lp-faint)]">(optional)</span>
          </label>
          <Textarea
            id="report-steps"
            rows={4}
            value={form.stepsToReproduce}
            maxLength={REPORT_STEPS_MAX}
            onChange={(event) =>
              setForm((current) => ({ ...current, stepsToReproduce: event.target.value }))
            }
            aria-describedby="report-steps-help"
            className="lp-field"
          />
          <p id="report-steps-help" className="mt-1.5 text-xs text-[var(--lp-faint)]">
            List the steps that consistently cause the problem.
          </p>
        </div>

        {/* Shown, not hidden: the customer can see exactly what diagnostics
            travel with the report before they send it. */}
        <div className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[var(--lp-accent)]" />
            <p className="text-sm font-medium text-[var(--lp-ink)]">
              Technical details attached
            </p>
          </div>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--lp-faint)]">Page</dt>
              <dd className="lp-mono truncate text-[var(--lp-ink-soft)]">
                {context.route ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--lp-faint)]">Browser</dt>
              <dd className="text-[var(--lp-ink-soft)]">{reportBrowserLabel(context.browser)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--lp-faint)]">System</dt>
              <dd className="text-[var(--lp-ink-soft)]">
                {reportOsLabel(context.operatingSystem)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--lp-faint)]">App version</dt>
              <dd className="lp-mono text-[var(--lp-ink-soft)]">{context.appVersion ?? "—"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-5 text-[var(--lp-faint)]">
            No account details, cookies or sign-in information are collected.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            disabled={submit.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" variant="cta" size="sm" disabled={submit.isPending}>
            {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submit.isPending ? "Submitting…" : "Submit report"}
          </Button>
        </div>
      </form>
    </div>
  );
}
