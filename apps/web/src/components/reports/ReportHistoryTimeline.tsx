import { ArrowRight } from "lucide-react";
import type { IssueReportEvent } from "@elkatech/contracts";
import { ROLE_LABELS } from "@/components/users/user-access";
import { describeReportEvent, formatReportDateTime } from "./report-access";

/**
 * Report history as a compact ruled timeline.
 *
 * `actorLabel` is null for anything the reporting customer did — the gateway
 * only resolves names for staff — so those rows render as "Reporter" and the
 * anonymity holds even inside the audit trail. Staff are named because staff
 * are accountable to each other; nothing beyond a name and the role recorded
 * at the time is shown.
 */
export default function ReportHistoryTimeline({ events }: { events: IssueReportEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[var(--lp-ink-soft)]">No activity recorded yet.</p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {events.map((event, index) => (
        <li
          key={event.id}
          className="relative flex gap-3 border-l border-[var(--lp-line)] pb-4 pl-4 last:pb-0"
        >
          <span
            aria-hidden="true"
            className="absolute -left-[3px] top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--lp-line-strong)]"
          />
          {/* The final entry's rule would otherwise run past the last dot. */}
          {index === events.length - 1 && (
            <span
              aria-hidden="true"
              className="absolute -left-px top-2 h-full w-px bg-[var(--lp-bg)]"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-[var(--lp-ink)]">
                {describeReportEvent(event.eventType)}
              </span>
              <span className="text-xs text-[var(--lp-faint)]">
                {formatReportDateTime(event.createdAt)}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--lp-ink-soft)]">
              <span>
                {event.actorLabel ?? "Reporter"}
                <span className="text-[var(--lp-faint)]">
                  {" · "}
                  {ROLE_LABELS[event.actorRole]}
                </span>
              </span>
              {(event.previousValue || event.newValue) && (
                <span className="inline-flex items-center gap-1.5">
                  {event.previousValue && (
                    <span className="text-[var(--lp-faint)]">{event.previousValue}</span>
                  )}
                  {event.previousValue && event.newValue && (
                    <ArrowRight aria-hidden="true" className="h-3 w-3 text-[var(--lp-faint)]" />
                  )}
                  {event.newValue && (
                    <span className="font-medium text-[var(--lp-ink)]">{event.newValue}</span>
                  )}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
