import type { RequestStatus } from "@elkatech/contracts";
import { cn } from "@/lib/utils";

const statusStyles: Record<RequestStatus, string> = {
  new: "bg-accent/10 text-accent",
  triaged: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  assigned: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  in_progress: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  waiting_for_customer: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  resolved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};

type StatusBadgeProps = {
  status: RequestStatus;
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        statusStyles[status],
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
};

export default StatusBadge;
