import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ServiceRequest } from "@elkatech/contracts";
import { useSession } from "@/hooks/use-session";
import { apiRequest } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";

const RequestsPage = () => {
  const { data: session } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ["requests", "mine"],
    queryFn: () => apiRequest<ServiceRequest[]>("/api/requests"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-soft md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Requests</p>
          <h2 className="font-display text-3xl font-bold text-foreground">
            {session?.user?.role === "customer" ? "Your Service Requests" : "Assigned Work"}
          </h2>
        </div>
        <Button asChild variant="cta">
          <Link to="/app/requests/new">Create Service Request</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-3xl border bg-card p-6 text-sm text-muted-foreground shadow-soft">
          Loading requests...
        </div>
      ) : data?.length ? (
        <div className="grid gap-4">
          {data.map((request) => (
            <Link
              key={request.id}
              to={`/app/requests/${request.id}`}
              className="rounded-3xl border bg-card p-6 shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
      ) : (
        <div className="rounded-3xl border bg-card p-8 text-sm text-muted-foreground shadow-soft">
          No requests yet. Create one from the portal or directly from a product page.
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
