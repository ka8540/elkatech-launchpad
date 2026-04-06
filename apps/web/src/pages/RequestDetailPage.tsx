import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import type { AuthUser, MessageVisibility, RequestStatus } from "@elkatech/contracts";
import { useSession } from "@/hooks/use-session";
import { apiRequest } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type RequestDetailResponse = {
  request: {
    id: string;
    requestNumber: string;
    subject: string;
    description: string;
    contactPhone: string;
    siteLocation: string;
    serialNumber?: string | null;
    priority: "low" | "normal" | "high" | "urgent";
    status: RequestStatus;
    assignedEngineerId?: string | null;
    productSnapshot: {
      name: string;
    };
  };
  messages: Array<{
    id: string;
    body: string;
    authorRole: "customer" | "engineer" | "admin";
    visibility: MessageVisibility;
    createdAt: string;
  }>;
  history: Array<{
    id: string;
    eventType: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }>;
};

const RequestDetailPage = () => {
  const { requestId = "" } = useParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [messageBody, setMessageBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>("customer_visible");
  const [status, setStatus] = useState<RequestStatus>("new");
  const [engineerId, setEngineerId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["request", requestId],
    queryFn: () => apiRequest<RequestDetailResponse>(`/api/requests/${requestId}`),
    enabled: Boolean(requestId),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<AuthUser[]>("/api/admin/users"),
    enabled: session?.user?.role === "admin",
  });

  const engineers = useMemo(
    () => users.filter((user) => user.role === "engineer"),
    [users],
  );

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["request", requestId] });
    await queryClient.invalidateQueries({ queryKey: ["requests"] });
  };

  const messageMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${requestId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: messageBody, visibility }),
      }),
    onSuccess: async () => {
      setMessageBody("");
      toast.success("Message sent.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const claimMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${requestId}/claim`, {
        method: "POST",
      }),
    onSuccess: async () => {
      toast.success("Request claimed.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${requestId}/status`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      toast.success("Status updated.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${requestId}/assign`, {
        method: "POST",
        body: JSON.stringify({ engineerId }),
      }),
    onSuccess: async () => {
      toast.success("Engineer assigned.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-3xl border bg-card p-6 text-sm text-muted-foreground shadow-soft">
        Loading request...
      </div>
    );
  }

  const isStaff = session?.user?.role === "engineer" || session?.user?.role === "admin";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
                {data.request.requestNumber}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
                {data.request.subject}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Product: {data.request.productSnapshot.name}
              </p>
            </div>
            <StatusBadge status={data.request.status} />
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{data.request.description}</p>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-2xl font-semibold text-foreground">Conversation</h3>
          </div>
          <div className="space-y-4">
            {data.messages.map((message) => (
              <div key={message.id} className="rounded-2xl border bg-muted/30 p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{message.authorRole}</span>
                  <span>{new Date(message.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground">{message.body}</p>
                {isStaff && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Visibility: {message.visibility.replaceAll("_", " ")}
                  </p>
                )}
              </div>
            ))}
          </div>

          <form
            className="mt-6 space-y-4 rounded-2xl border bg-background p-4"
            onSubmit={(event) => {
              event.preventDefault();
              messageMutation.mutate();
            }}
          >
            <Textarea
              required
              rows={4}
              value={messageBody}
              onChange={(event) => setMessageBody(event.target.value)}
              placeholder="Add an update..."
            />
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {isStaff ? (
                <Select value={visibility} onValueChange={(value) => setVisibility(value as MessageVisibility)}>
                  <SelectTrigger className="w-full bg-card md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer_visible">Customer visible reply</SelectItem>
                    <SelectItem value="internal_note">Internal note</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Customer replies are visible to the service team.
                </p>
              )}
              <Button type="submit" variant="cta" disabled={messageMutation.isPending}>
                {messageMutation.isPending ? "Sending..." : "Send update"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <h3 className="font-display text-2xl font-semibold text-foreground">Request details</h3>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>Phone: <span className="text-foreground">{data.request.contactPhone}</span></p>
            <p>Location: <span className="text-foreground">{data.request.siteLocation}</span></p>
            <p>Priority: <span className="text-foreground">{data.request.priority}</span></p>
            <p>Serial Number: <span className="text-foreground">{data.request.serialNumber || "Not provided"}</span></p>
          </div>
        </div>

        {isStaff && (
          <div className="rounded-3xl border bg-card p-6 shadow-soft">
            <h3 className="font-display text-2xl font-semibold text-foreground">Engineer actions</h3>
            <div className="mt-4 space-y-4">
              <Button variant="outline" className="w-full" onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending}>
                {claimMutation.isPending ? "Claiming..." : "Claim request"}
              </Button>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Update status</label>
                <Select value={status} onValueChange={(value) => setStatus(value as RequestStatus)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="triaged">Triaged</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="waiting_for_customer">Waiting for customer</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="cta" className="w-full" onClick={() => statusMutation.mutate()} disabled={statusMutation.isPending}>
                  {statusMutation.isPending ? "Saving..." : "Apply status"}
                </Button>
              </div>

              {session?.user?.role === "admin" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Assign engineer</label>
                  <Select value={engineerId} onValueChange={setEngineerId}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose engineer" />
                    </SelectTrigger>
                    <SelectContent>
                      {engineers.map((engineer) => (
                        <SelectItem key={engineer.id} value={engineer.id}>
                          {engineer.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="w-full" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !engineerId}>
                    {assignMutation.isPending ? "Assigning..." : "Assign engineer"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {isStaff && (
          <div className="rounded-3xl border bg-card p-6 shadow-soft">
            <h3 className="font-display text-2xl font-semibold text-foreground">History</h3>
            <div className="mt-4 space-y-3">
              {data.history.map((entry) => (
                <div key={entry.id} className="rounded-2xl border bg-muted/30 p-4 text-sm">
                  <p className="font-medium text-foreground">{entry.eventType.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestDetailPage;
