import type { RequestStatus } from "@elkatech/contracts";
import { cn } from "@/lib/utils";
import { getRequestStatusLabel, REQUEST_STATUS_BADGE_CLASSES } from "@/lib/request-status";

type StatusBadgeProps = {
  status: RequestStatus;
};

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
        REQUEST_STATUS_BADGE_CLASSES[status],
      )}
    >
      {getRequestStatusLabel(status)}
    </span>
  );
};

export default StatusBadge;
