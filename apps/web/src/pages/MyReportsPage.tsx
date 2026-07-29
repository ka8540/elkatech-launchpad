import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareWarning, Plus } from "lucide-react";
import type { MyIssueReportRow } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { PAGE_CONTAINER, PAGE_PRIMARY_ACTION } from "@/lib/page-layout";
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
import { ReportSeverityBadge, ReportStatusBadge } from "@/components/reports/badges";
import { formatReportTime, reportAreaLabel } from "@/components/reports/report-access";

const COLUMN_COUNT = 6;

const COLUMNS = ["w-[34%]", "w-[14%]", "w-[12%]", "w-[12%]", "w-[14%]", "w-[14%]"];

/**
 * The reporter's own list. Backed by `/api/reports/mine`, which scopes on the
 * session user server-side — there is no id in the URL to tamper with, and the
 * response schema has no field for internal notes, assignment or the reporter
 * reference, so none of it can leak through this page.
 */
export default function MyReportsPage() {
  const { data: reports = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["my-issue-reports"],
    queryFn: () => apiRequest<MyIssueReportRow[]>("/api/reports/mine"),
  });

  return (
    <div className={PAGE_CONTAINER}>
      <PageHeader
        icon={MessageSquareWarning}
        title="My Reports"
        description="Problems you have reported, and what our team has done about them."
        action={
          <Button asChild className={PAGE_PRIMARY_ACTION}>
            <Link to="/app/reports/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Report a problem
            </Link>
          </Button>
        }
      />

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
              <Th>Status</Th>
              <Th>Severity</Th>
              <Th>Created</Th>
              <Th>Last updated</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <SkeletonRows colSpan={COLUMN_COUNT} />}

            {!isLoading && isError && (
              <TableMessage colSpan={COLUMN_COUNT}>
                <div className="space-y-2">
                  <p>Could not load your reports.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              </TableMessage>
            )}

            {!isLoading && !isError && reports.length === 0 && (
              <TableMessage colSpan={COLUMN_COUNT}>
                You have not reported any problems yet.
              </TableMessage>
            )}

            {!isLoading &&
              !isError &&
              reports.map((report) => (
                <Tr key={report.id}>
                  <Td>
                    <Link
                      to={`/app/my-reports/${report.id}`}
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
                    <ReportStatusBadge status={report.status} />
                  </Td>
                  <Td>
                    <ReportSeverityBadge severity={report.severity} />
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
                </Tr>
              ))}
          </tbody>
        </table>
      </TableShell>
    </div>
  );
}
