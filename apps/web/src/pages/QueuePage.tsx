import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ServiceRequest } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";

const cardSurface = "lp-card border";

const QueuePage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["requests", "queue"],
    queryFn: () => apiRequest<ServiceRequest[]>("/api/requests?scope=queue"),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className={cn("rounded-2xl p-5 sm:p-6", cardSurface)}>
        <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
          Queue
        </p>
        <h2 className="mt-2 lp-display text-2xl font-bold text-[var(--lp-ink)]">
          Engineer work queue
        </h2>
      </header>

      {isLoading ? (
        <div className={cn("rounded-2xl p-5 text-sm text-[var(--lp-ink-soft)]", cardSurface)}>
          Loading queue…
        </div>
      ) : (
        <div className="space-y-3">
          {data?.map((request) => (
            <Link
              key={request.id}
              to={`/app/requests/${request.id}`}
              className={cn(
                "block rounded-2xl p-5 transition-colors duration-150",
                cardSurface,
                "hover:border-[var(--lp-accent)]/45",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="lp-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
                    {request.requestNumber}
                  </p>
                  <h3 className="mt-2 lp-display text-lg font-semibold text-[var(--lp-ink)]">
                    {request.subject}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">
                    {request.productSnapshot.name}
                  </p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            </Link>
          ))}
          {data && data.length === 0 && (
            <div className={cn("rounded-2xl p-8 text-center text-sm text-[var(--lp-ink-soft)]", cardSurface)}>
              No service requests in the queue.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueuePage;
