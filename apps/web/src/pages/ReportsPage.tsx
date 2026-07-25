import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Bug, Plus } from "lucide-react";
import type { IssueReportListResponse } from "@elkatech/contracts";
import { REPORTS_PAGE_SIZE_DEFAULT } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { PAGE_CONTAINER } from "@/lib/page-layout";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  SkeletonRows,
  TableMessage,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/activity/entities";
import { ReportSeverityBadge, ReportStatusBadge, ReporterReference } from "@/components/reports/badges";
import ReportFilters from "@/components/reports/ReportFilters";
import {
  EMPTY_REPORT_FILTERS,
  buildReportQuery,
  formatReportTime,
  hasActiveFilters,
  reportAreaLabel,
  type ReportFilters as Filters,
} from "@/components/reports/report-access";

const COLUMN_COUNT = 9;

/* Proportional widths on a fixed layout so headers stay locked to their cells
 * at any sidebar state — same approach as the activity directory. */
const COLUMNS = [
  "w-[24%]", // Report
  "w-[10%]", // Area
  "w-[8%]", // Severity
  "w-[8%]", // Status
  "w-[9%]", // Reported
  "w-[9%]", // Last updated
  "w-[12%]", // Reporter reference
  "w-[12%]", // Assigned to
  "w-[8%]", // Actions
];

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
        {label}
      </dt>
      <dd className="lp-display text-base font-bold text-[var(--lp-ink)]">{value}</dd>
    </div>
  );
}

/**
 * Issue Reports console.
 *
 * The defining constraint: no column, tooltip or link on this page identifies
 * the person who filed the report. The Reporter column shows the anonymous
 * reference and nothing else — the API never sends anything more.
 */
export default function ReportsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_REPORT_FILTERS);
  const [page, setPage] = useState(0);

  const query = useMemo(
    () =>
      buildReportQuery(filters, {
        limit: REPORTS_PAGE_SIZE_DEFAULT,
        offset: page * REPORTS_PAGE_SIZE_DEFAULT,
      }),
    [filters, page],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["issue-reports", query],
    queryFn: () => apiRequest<IssueReportListResponse>(`/api/reports?${query}`),
    placeholderData: keepPreviousData,
  });

  // The Admin-only console resolves the staff directory for assignment.
  const { data: engineers = [] } = useQuery({
    queryKey: ["report-assignees"],
    queryFn: () => apiRequest<Array<{ id: string; displayName: string }>>("/api/engineers"),
  });

  const reports = data?.reports ?? [];
  const summary = data?.summary ?? { new: 0, working: 0, resolved: 0, blocking: 0 };
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / REPORTS_PAGE_SIZE_DEFAULT));

  function updateFilters(next: Filters) {
    setFilters(next);
    setPage(0);
  }

  return (
    <div className={PAGE_CONTAINER}>
      <PageHeader
        icon={Bug}
        title="Issue Reports"
        description="Problems reported from the portal. Reports are anonymous — reporters are identified only by reference."
        action={
          <Button asChild variant="cta" size="sm">
            <Link to="/app/reports/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New report
            </Link>
          </Button>
        }
      />

      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 px-4 py-3">
        <Metric label="New" value={summary.new} />
        <Metric label="Working" value={summary.working} />
        <Metric label="Resolved" value={summary.resolved} />
        <Metric label="Blocking" value={summary.blocking} />
      </dl>

      <ReportFilters filters={filters} onChange={updateFilters} assignees={engineers} />

      <TableShell>
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            {COLUMNS.map((width, index) => (
              <col key={index} className={width} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <Th>Report</Th>
              <Th>Area</Th>
              <Th>Severity</Th>
              <Th>Status</Th>
              <Th>Reported</Th>
              <Th>Last updated</Th>
              <Th>Reporter</Th>
              <Th>Assigned to</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows colSpan={COLUMN_COUNT} />}

            {!isLoading && isError && (
              <TableMessage colSpan={COLUMN_COUNT}>
                <div className="space-y-2">
                  <p>Could not load issue reports.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              </TableMessage>
            )}

            {!isLoading && !isError && reports.length === 0 && (
              <TableMessage colSpan={COLUMN_COUNT}>
                {hasActiveFilters(filters)
                  ? "No reports match these filters."
                  : "No issue reports have been submitted yet."}
              </TableMessage>
            )}

            {!isLoading &&
              !isError &&
              reports.map((report) => (
                <Tr key={report.id}>
                  <Td>
                    <Link
                      to={`/app/reports/${report.id}`}
                      className="block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]/50"
                    >
                      <span className="lp-mono block text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                        {report.reportNumber}
                      </span>
                      <span className="mt-0.5 block truncate font-medium text-[var(--lp-ink)]">
                        {report.title}
                      </span>
                    </Link>
                  </Td>
                  <Td>
                    <span className="text-[var(--lp-ink-soft)]">
                      {reportAreaLabel(report.applicationArea)}
                    </span>
                  </Td>
                  <Td>
                    <ReportSeverityBadge severity={report.severity} />
                  </Td>
                  <Td>
                    <ReportStatusBadge status={report.status} />
                  </Td>
                  <Td>
                    <span className="text-[var(--lp-ink-soft)]">
                      {formatReportTime(report.createdAt)}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-[var(--lp-ink-soft)]">
                      {formatReportTime(report.updatedAt)}
                    </span>
                  </Td>
                  <Td>
                    <ReporterReference reference={report.reporterReference} />
                  </Td>
                  <Td>
                    <span className="truncate text-[var(--lp-ink-soft)]">
                      {report.assignedUserName ?? "Unassigned"}
                    </span>
                  </Td>
                  <Td>
                    <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs">
                      <Link to={`/app/reports/${report.id}`}>Open</Link>
                    </Button>
                  </Td>
                </Tr>
              ))}
          </tbody>
        </table>
      </TableShell>

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--lp-faint)]">
            Page {page + 1} of {pageCount} · {total} report{total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page + 1 >= pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
