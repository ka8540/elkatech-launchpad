import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquareWarning } from "lucide-react";
import type { MyIssueReportDetail } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { PAGE_CONTAINER_READING } from "@/lib/page-layout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import ErrorEvidenceBlock from "@/components/reports/ErrorEvidenceBlock";
import { ReportSeverityBadge, ReportStatusBadge } from "@/components/reports/badges";
import { formatReportDateTime, reportAreaLabel } from "@/components/reports/report-access";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--lp-line)] lp-card p-4">
      <h2 className="lp-mono mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * The reporter's view of their own report.
 *
 * Backed by `/api/reports/mine/:id`, which 404s on anyone else's report even
 * for staff. The response schema carries no internal notes, no assignment, no
 * reporter reference and no technical metadata — a customer sees what they
 * submitted plus what the team chose to tell them.
 */
export default function MyReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-issue-report", reportId],
    queryFn: () => apiRequest<MyIssueReportDetail>(`/api/reports/mine/${reportId}`),
    enabled: Boolean(reportId),
  });

  if (isLoading) {
    return (
      <div className={PAGE_CONTAINER_READING}>
        <div className="h-32 animate-pulse rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={PAGE_CONTAINER_READING}>
        <PageHeader
          icon={MessageSquareWarning}
          title="Report"
          description="This report could not be found."
        />
        <Button asChild variant="outline" size="sm">
          <Link to="/app/my-reports">Back to my reports</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={PAGE_CONTAINER_READING}>
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 gap-1.5 px-2 text-xs text-[var(--lp-ink-soft)]"
      >
        <Link to="/app/my-reports">
          <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
          My Reports
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
          <span>{reportAreaLabel(data.applicationArea)}</span>
          <span>Submitted {formatReportDateTime(data.createdAt)}</span>
          <span>Updated {formatReportDateTime(data.updatedAt)}</span>
        </div>
      </header>

      <Section title="What you reported">
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lp-ink)]">
          {data.description}
        </p>
      </Section>

      {data.exactError && (
        <Section title="Error you reported">
          <ErrorEvidenceBlock text={data.exactError} label="Error details" />
        </Section>
      )}

      {data.stepsToReproduce && (
        <Section title="Steps you listed">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lp-ink)]">
            {data.stepsToReproduce}
          </p>
        </Section>
      )}

      {data.attachments.length > 0 && (
        <Section title="Your attachments">
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

      {data.responses.length > 0 && (
        <Section title="Replies from our team">
          <ul className="space-y-2">
            {data.responses.map((response) => (
              <li
                key={response.id}
                className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 p-3"
              >
                <p className="text-xs text-[var(--lp-faint)]">
                  {formatReportDateTime(response.createdAt)}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lp-ink)]">
                  {response.body}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {data.resolution && (
        <Section title="Resolution">
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--lp-ink)]">
            {data.resolution}
          </p>
          {data.resolvedAt && (
            <p className="mt-2 text-xs text-[var(--lp-faint)]">
              Resolved {formatReportDateTime(data.resolvedAt)}
            </p>
          )}
        </Section>
      )}
    </div>
  );
}
