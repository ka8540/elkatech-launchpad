import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ServiceRequest } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

const QueuePage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["requests", "queue"],
    queryFn: () => apiRequest<ServiceRequest[]>("/api/requests?scope=queue"),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Queue</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">Engineer work queue</h2>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border bg-card p-6 text-sm text-muted-foreground shadow-soft">
          Loading queue...
        </div>
      ) : (
        <div className="grid gap-4">
          {data?.map((request) => (
            <Link
              key={request.id}
              to={`/app/requests/${request.id}`}
              className="rounded-3xl border bg-card p-6 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                    {request.requestNumber}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-foreground">
                    {request.subject}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{request.productSnapshot.name}</p>
                </div>
                <StatusBadge status={request.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default QueuePage;
