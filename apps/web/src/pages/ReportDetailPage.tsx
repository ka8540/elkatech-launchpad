import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bug, Loader2, Lock } from "lucide-react";
import type { IssueReportDetail, ReportStatus, Role } from "@elkatech/contracts";
import { REPORT_NOTE_MAX, REPORT_RESOLUTION_MAX } from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { PAGE_CONTAINER } from "@/lib/page-layout";
import { useSession } from "@/hooks/use-session";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ErrorEvidenceBlock from "@/components/reports/ErrorEvidenceBlock";
import ReportHistoryTimeline from "@/components/reports/ReportHistoryTimeline";
import {
  ReportSeverityBadge,
  ReportStatusBadge,
  ReporterReference,
} from "@/components/reports/badges";
import {
  canActOnReports,
  formatReportDateTime,
  reportAreaLabel,
  reportBrowserLabel,
  reportOsLabel,
  transitionLabel,
} from "@/components/reports/report-access";

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--lp-line)] lp-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--lp-line)] py-1.5 last:border-0">
      <dt className="text-xs text-[var(--lp-faint)]">{label}</dt>
      <dd className="min-w-0 truncate text-xs text-[var(--lp-ink-soft)]">{value}</dd>
    </div>
  );
}

/**
 * Staff view of one report.
 *
 * Nothing on this page names the reporter. The header carries the anonymous
 * reference; the history timeline renders customer-authored rows as "Reporter"
 * because the API never sends a name for them.
 */
export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const actorRole = (sessionData?.user?.role ?? "admin") as Role;

  const [note, setNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"internal_note" | "customer_visible">(
    "internal_note",
  );
  const [resolution, setResolution] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["issue-report", reportId],
    queryFn: () => apiRequest<IssueReportDetail>(`/api/reports/${reportId}`),
    enabled: Boolean(reportId),
  });

  const { data: engineers = [] } = useQuery({
    queryKey: ["report-assignees"],
    queryFn: () => apiRequest<Array<{ id: string; displayName: string }>>("/api/engineers"),
    enabled: canActOnReports(actorRole),
  });

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["issue-report", reportId] });
  }

  function onError(error: unknown, fallback: string) {
    toast.error(error instanceof ApiError ? error.message : fallback);
  }

  const changeStatus = useMutation({
    mutationFn: (status: ReportStatus) =>
      apiRequest(`/api/reports/${reportId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      toast.success("Status updated.");
      await invalidate();
    },
    onError: (error) => onError(error, "Could not update the status."),
  });

  const assign = useMutation({
    mutationFn: (assigneeId: string | null) =>
      apiRequest(`/api/reports/${reportId}/assign`, {
        method: "POST",
        body: JSON.stringify({ assigneeId }),
      }),
    onSuccess: async () => {
      toast.success("Assignment updated.");
      await invalidate();
    },
    onError: (error) => onError(error, "Could not assign the report."),
  });

  const addNote = useMutation({
    mutationFn: () =>
      apiRequest(`/api/reports/${reportId}/notes`, {
        method: "POST",
        body: JSON.stringify({ body: note.trim(), visibility: noteVisibility }),
      }),
    onSuccess: async () => {
      toast.success(
        noteVisibility === "internal_note" ? "Internal note added." : "Reply sent to the reporter.",
      );
      setNote("");
      await invalidate();
    },
    onError: (error) => onError(error, "Could not add the note."),
  });

  const recordResolution = useMutation({
    mutationFn: () =>
      apiRequest(`/api/reports/${reportId}/resolution`, {
        method: "POST",
        body: JSON.stringify({ resolution: resolution.trim() }),
      }),
    onSuccess: async () => {
      toast.success("Resolution recorded.");
      setResolution("");
      await invalidate();
    },
    onError: (error) => onError(error, "Could not record the resolution."),
  });

  if (isLoading) {
    return (
      <div className={PAGE_CONTAINER}>
        <div className="h-32 animate-pulse rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={PAGE_CONTAINER}>
        <PageHeader icon={Bug} title="Report" description="This report could not be loaded." />
        <Button variant="outline" size="sm" onClick={() => navigate("/app/reports")}>
          Back to Issue Reports
        </Button>
      </div>
    );
  }

  const canAct = canActOnReports(actorRole);

  return (
    <div className={PAGE_CONTAINER}>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1.5 px-2 text-xs text-[var(--lp-ink-soft)]"
      >
        <Link to="/app/reports">
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          Issue Reports
        </Link>
      </Button>

      <header className="rounded-xl border border-[var(--lp-line)] lp-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="lp-mono text-[10px] uppercase tracking-[0.18em] text-[var(--lp-faint)]">
            {data.reportNumber}
          </span>
          <ReportStatusBadge status={data.status} />
          <ReportSeverityBadge severity={data.severity} />
        </div>
        <h1 className="lp-display mt-1.5 break-words text-xl font-bold leading-tight text-[var(--lp-ink)] sm:text-2xl">
          {data.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--lp-faint)]">
          <span>Reported {formatReportDateTime(data.createdAt)}</span>
          <span>Updated {formatReportDateTime(data.updatedAt)}</span>
          <span className="inline-flex items-center gap-1.5">
            Reporter
            <ReporterReference reference={data.reporterReference} />
          </span>
        </div>

        {canAct && data.allowedTransitions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.allowedTransitions.map((next) => (
              <Button
                key={next}
                type="button"
                variant={next === "resolved" ? "cta" : "outline"}
                size="sm"
                disabled={changeStatus.isPending}
                onClick={() => changeStatus.mutate(next)}
              >
                {changeStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {transitionLabel(data.status, next)}
              </Button>
            ))}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Section title="Problem description">
            {/* Rendered as text — React escapes it, and there is no
                dangerouslySetInnerHTML anywhere in this feature. */}
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lp-ink)]">
              {data.description}
            </p>
          </Section>

          {data.exactError && (
            <Section title="Error details">
              <ErrorEvidenceBlock text={data.exactError} />
            </Section>
          )}

          {data.stepsToReproduce && (
            <Section title="Steps to reproduce">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lp-ink)]">
                {data.stepsToReproduce}
              </p>
            </Section>
          )}

          {data.attachments.length > 0 && (
            <Section title="Attachments">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="block overflow-hidden rounded-lg border border-[var(--lp-line)]"
                    >
                      <img
                        src={attachment.url}
                        alt={attachment.fileName}
                        className="h-28 w-full object-cover"
                      />
                    </a>
                    <p className="mt-1 truncate text-xs text-[var(--lp-faint)]">
                      {attachment.fileName}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {canAct && (
            <Section title="Internal handling">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="report-note"
                    className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
                  >
                    Add a note
                  </label>
                  <Textarea
                    id="report-note"
                    rows={3}
                    value={note}
                    maxLength={REPORT_NOTE_MAX}
                    onChange={(event) => setNote(event.target.value)}
                    className="lp-field"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-3 text-xs">
                      <label className="inline-flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name="note-visibility"
                          checked={noteVisibility === "internal_note"}
                          onChange={() => setNoteVisibility("internal_note")}
                          className="h-3.5 w-3.5 accent-[var(--lp-accent)]"
                        />
                        <span className="inline-flex items-center gap-1 text-[var(--lp-ink-soft)]">
                          <Lock aria-hidden="true" className="h-3 w-3" />
                          Internal only
                        </span>
                      </label>
                      <label className="inline-flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name="note-visibility"
                          checked={noteVisibility === "customer_visible"}
                          onChange={() => setNoteVisibility("customer_visible")}
                          className="h-3.5 w-3.5 accent-[var(--lp-accent)]"
                        />
                        <span className="text-[var(--lp-ink-soft)]">Visible to reporter</span>
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={note.trim().length === 0 || addNote.isPending}
                      onClick={() => addNote.mutate()}
                    >
                      {addNote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add note
                    </Button>
                  </div>
                </div>

                <div className="border-t border-[var(--lp-line)] pt-4">
                  <label
                    htmlFor="report-resolution"
                    className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
                  >
                    Record a resolution
                  </label>
                  <Textarea
                    id="report-resolution"
                    rows={3}
                    value={resolution}
                    maxLength={REPORT_RESOLUTION_MAX}
                    placeholder={data.resolution ?? "What was done to fix this?"}
                    onChange={(event) => setResolution(event.target.value)}
                    className="lp-field"
                  />
                  <p className="mt-1.5 text-xs text-[var(--lp-faint)]">
                    The resolution is shown to the reporter. Internal notes are not.
                  </p>
                  <div className="mt-2 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resolution.trim().length === 0 || recordResolution.isPending}
                      onClick={() => recordResolution.mutate()}
                    >
                      {recordResolution.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save resolution
                    </Button>
                  </div>
                </div>

                {data.notes.length > 0 && (
                  <ul className="space-y-2 border-t border-[var(--lp-line)] pt-4">
                    {data.notes.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--lp-faint)]">
                          <span className="font-medium text-[var(--lp-ink-soft)]">
                            {entry.authorName ?? "Staff"}
                          </span>
                          <span>{formatReportDateTime(entry.createdAt)}</span>
                          {entry.visibility === "internal_note" ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--lp-line-strong)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                              <Lock aria-hidden="true" className="h-2.5 w-2.5" />
                              Internal
                            </span>
                          ) : (
                            <span className="rounded-full border border-[var(--lp-line-strong)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em]">
                              Reporter sees this
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lp-ink)]">
                          {entry.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <Section title="Technical context">
            <dl>
              <Fact label="Route" value={<span className="lp-mono">{data.context.route ?? "—"}</span>} />
              <Fact label="Browser" value={reportBrowserLabel(data.context.browser)} />
              <Fact label="System" value={reportOsLabel(data.context.operatingSystem)} />
              <Fact
                label="App version"
                value={<span className="lp-mono">{data.context.appVersion ?? "—"}</span>}
              />
              <Fact
                label="Correlation ID"
                value={<span className="lp-mono">{data.context.correlationId ?? "—"}</span>}
              />
              <Fact label="Area" value={reportAreaLabel(data.applicationArea)} />
              <Fact
                label="Linked request"
                value={
                  data.relatedRequestId ? (
                    <Link
                      to={`/app/requests/${data.relatedRequestId}`}
                      className="text-[var(--lp-accent)] underline-offset-2 hover:underline"
                    >
                      {data.relatedRequestNumber ?? "View"}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
              <Fact
                label="Submitted"
                value={formatReportDateTime(data.createdAt)}
              />
            </dl>
          </Section>

          {canAct && (
            <Section title="Assignment">
              <select
                aria-label="Assign report"
                value={data.assignedUserId ?? ""}
                onChange={(event) => assign.mutate(event.target.value || null)}
                disabled={assign.isPending}
                className="lp-field h-10 w-full cursor-pointer rounded-md border px-3 text-sm"
              >
                <option value="">Unassigned</option>
                {engineers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.displayName}
                  </option>
                ))}
              </select>
            </Section>
          )}

          {data.resolution && (
            <Section title="Resolution">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lp-ink)]">
                {data.resolution}
              </p>
            </Section>
          )}

          <Section title="Activity">
            <ReportHistoryTimeline events={data.history} />
          </Section>
        </div>
      </div>
    </div>
  );
}
