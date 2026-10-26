import type { ReportSeverity, ReportStatus } from "@elkatech/contracts";
import { cn } from "@/lib/utils";
import {
  REPORT_SEVERITY_BADGE_CLASSES,
  REPORT_STATUS_BADGE_CLASSES,
  reportSeverityLabel,
  reportStatusLabel,
} from "./report-access";

/** Compact badges sized for a dense table row — smaller and tighter than the
 *  request StatusBadge, which is built for a detail header. */
const BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap";

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={cn(BASE, REPORT_STATUS_BADGE_CLASSES[status])}>
      {reportStatusLabel(status)}
    </span>
  );
}

export function ReportSeverityBadge({ severity }: { severity: ReportSeverity }) {
  return (
    <span className={cn(BASE, REPORT_SEVERITY_BADGE_CLASSES[severity])}>
      {reportSeverityLabel(severity)}
    </span>
  );
}

/**
 * The anonymous reporter handle. Rendered in the monospace face and visually
 * quieter than the surrounding text — it is a correlation key, not a name, and
 * it should not read like one.
 */
export function ReporterReference({ reference }: { reference: string }) {
  return (
    <span
      className="lp-mono text-[11px] tracking-tight text-[var(--lp-ink-soft)]"
      title="Anonymous reporter reference"
    >
      {reference}
    </span>
  );
}
