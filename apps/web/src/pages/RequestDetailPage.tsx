import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuthUser,
  MessageVisibility,
  RequestMessage,
  RequestStatus,
  ServiceRequest,
} from "@elkatech/contracts";
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Clock3,
  History,
  Loader2,
  MessageSquare,
  Phone,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCheck,
  Wrench,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { apiRequest } from "@/lib/api";
import {
  getRequestStatusLabel,
  REQUEST_STATUS_DESCRIPTIONS,
  REQUEST_STATUS_WORKFLOW,
} from "@/lib/request-status";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RequestHistoryEntry = {
  id: string;
  requestId: string;
  actorId: string;
  actorRole: "customer" | "engineer" | "admin";
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type RequestDetailResponse = {
  request: ServiceRequest;
  messages: RequestMessage[];
  history: RequestHistoryEntry[];
};

const cardSurface = "lp-card border";
const fieldClassName =
  "lp-field rounded-2xl border px-4 py-3 text-sm shadow-none ring-offset-0 focus-visible:ring-0";
const selectTriggerClassName =
  "lp-field h-11 rounded-xl border px-3 text-[var(--lp-ink)] shadow-none ring-offset-0 focus:ring-0 focus:ring-offset-0";
const selectContentClassName =
  "lp-portal border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink)] shadow-[0_18px_44px_-24px_rgba(0,0,0,0.55)]";
const selectItemClassName =
  "focus:bg-[var(--lp-accent)]/12 focus:text-[var(--lp-ink)]";

const workflowLabels: Record<RequestStatus, string> = {
  new: "Mark open",
  triaged: "Mark triaged",
  assigned: "Mark assigned",
  in_progress: "Start work",
  waiting_for_customer: "Mark pending",
  resolved: "Mark resolved",
  closed: "Archive request",
};

const workflowIcons: Record<RequestStatus, ComponentType<{ className?: string }>> = {
  new: RotateCcw,
  triaged: ClipboardList,
  assigned: UserCheck,
  in_progress: Wrench,
  waiting_for_customer: Clock3,
  resolved: CheckCircle2,
  closed: Archive,
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatEvent(eventType: string) {
  return eventType
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 p-4">
      <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
        {label}
      </p>
      <div className="mt-1.5 break-words text-sm font-medium text-[var(--lp-ink)]">
        {value}
      </div>
    </div>
  );
}

function getAllowedStatuses({
  request,
  user,
}: {
  request: ServiceRequest;
  user?: AuthUser | null;
}) {
  if (!user || user.role === "customer") return [];
  if (user.role === "engineer") {
    if (request.status === "closed") return [];
    if (request.assignedEngineerId !== user.id) return [];
  }

  return REQUEST_STATUS_WORKFLOW[request.status].filter((next) => {
    if (next === "assigned" && !request.assignedEngineerId) return false;
    return next !== request.status;
  });
}

const RequestDetailPage = () => {
  const { requestId = "" } = useParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [messageBody, setMessageBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>("customer_visible");
  const [statusNote, setStatusNote] = useState("");
  const [statusVisibility, setStatusVisibility] =
    useState<MessageVisibility>("customer_visible");
  const [engineerId, setEngineerId] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
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
      toast.success("Update sent.");
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
    mutationFn: ({
      nextStatus,
      note,
      noteVisibility,
    }: {
      nextStatus: RequestStatus;
      note?: string;
      noteVisibility: MessageVisibility;
    }) =>
      apiRequest(`/api/requests/${requestId}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: nextStatus,
          note: note || undefined,
          visibility: noteVisibility,
        }),
      }),
    onSuccess: async () => {
      setStatusNote("");
      toast.success("Request status updated.");
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
      setEngineerId("");
      toast.success("Engineer assigned.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${requestId}/cancel`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: async () => {
      toast.success("Request cancelled and archived.");
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className={cn("mx-auto max-w-3xl rounded-3xl p-6 text-sm text-[var(--lp-ink-soft)]", cardSurface)}>
        Loading request...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className={cn("mx-auto max-w-3xl rounded-3xl p-6 text-sm text-[var(--lp-ink-soft)]", cardSurface)}>
        <p className="font-medium text-[var(--lp-ink)]">Could not load this request.</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
          onClick={() => refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const request = data.request;
  const user = session?.user;
  const isStaff = user?.role === "engineer" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const allowedStatuses = getAllowedStatuses({ request, user });
  const canClaim =
    isStaff &&
    request.status !== "closed" &&
    (isAdmin || !request.assignedEngineerId || request.assignedEngineerId === user?.id);
  const canCustomerCancel =
    user?.role === "customer" &&
    request.customerId === user.id &&
    request.status !== "resolved" &&
    request.status !== "closed";

  const submitStatus = (nextStatus: RequestStatus) => {
    if (nextStatus === "closed") {
      const confirmed = window.confirm(
        "Archive this service request? It will leave active request lists but remain in history.",
      );
      if (!confirmed) return;
    }

    statusMutation.mutate({
      nextStatus,
      note: statusNote.trim(),
      noteVisibility: statusVisibility,
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Button
        asChild
        variant="outline"
        className="h-10 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-4 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
      >
        <Link to="/app/requests">
          <ArrowLeft className="h-4 w-4" />
          Back to requests
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <div className="space-y-6">
          <section className={cn("relative overflow-hidden rounded-3xl p-6 sm:p-8", cardSurface)}>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.16]"
              style={{
                maskImage: "linear-gradient(to right, black, transparent 74%)",
                WebkitMaskImage: "linear-gradient(to right, black, transparent 74%)",
              }}
            />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="lp-mono text-xs font-semibold uppercase tracking-[0.22em] text-[var(--lp-faint)]">
                  {request.requestNumber}
                </p>
                <h1 className="lp-display mt-3 text-3xl font-bold text-[var(--lp-ink)] sm:text-4xl">
                  {request.subject}
                </h1>
                <p className="mt-3 text-sm text-[var(--lp-ink-soft)]">
                  Product: <span className="text-[var(--lp-ink)]">{request.productSnapshot.name}</span>
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>
            <p className="relative mt-6 max-w-3xl text-sm leading-7 text-[var(--lp-ink-soft)]">
              {request.description}
            </p>
          </section>

          <section className={cn("rounded-3xl p-6 sm:p-8", cardSurface)}>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="lp-display text-2xl font-semibold text-[var(--lp-ink)]">Conversation</h2>
                  <p className="mt-1 text-xs text-[var(--lp-faint)]">
                    Public replies and internal notes stay with the service request.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {data.messages.length === 0 ? (
                <div className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-5 text-sm text-[var(--lp-ink-soft)]">
                  No updates yet.
                </div>
              ) : (
                data.messages.map((message) => (
                  <div
                    key={message.id}
                    className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/55 p-4"
                  >
                    <div className="mb-2 flex flex-col gap-1 text-xs uppercase tracking-[0.16em] text-[var(--lp-faint)] sm:flex-row sm:items-center sm:justify-between">
                      <span className="lp-mono">{message.authorRole.replaceAll("_", " ")}</span>
                      <span>{fmtDateTime(message.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--lp-ink)]">
                      {message.body}
                    </p>
                    {isStaff && (
                      <p className="mt-3 text-xs text-[var(--lp-faint)]">
                        Visibility: {message.visibility.replaceAll("_", " ")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>

            <form
              className="mt-6 space-y-4 rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-4"
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
                placeholder="Add a service update..."
                className={cn(fieldClassName, "min-h-[140px] resize-y")}
              />
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                {isStaff ? (
                  <Select value={visibility} onValueChange={(value) => setVisibility(value as MessageVisibility)}>
                    <SelectTrigger className={cn(selectTriggerClassName, "md:w-64")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={selectContentClassName}>
                      <SelectItem value="customer_visible" className={selectItemClassName}>
                        Customer visible reply
                      </SelectItem>
                      <SelectItem value="internal_note" className={selectItemClassName}>
                        Internal note
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-[var(--lp-faint)]">
                    Customer replies are visible to the service team.
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-11 rounded-xl bg-[var(--lp-accent)] px-5 font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
                  disabled={messageMutation.isPending}
                >
                  {messageMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send update
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className={cn("rounded-3xl p-6", cardSurface)}>
            <h2 className="lp-display text-2xl font-semibold text-[var(--lp-ink)]">Request details</h2>
            <div className="mt-5 grid gap-3">
              <DetailItem label="Current status" value={getRequestStatusLabel(request.status)} />
              <DetailItem label="Priority" value={request.priority} />
              <DetailItem label="Product" value={request.productSnapshot.name} />
              <DetailItem label="Phone" value={request.contactPhone} />
              <DetailItem label="Location" value={request.siteLocation} />
              <DetailItem label="Serial number" value={request.serialNumber || "Not provided"} />
            </div>
          </section>

          {isStaff && (
            <section className={cn("rounded-3xl p-6", cardSurface)}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="lp-display text-2xl font-semibold text-[var(--lp-ink)]">Workflow</h2>
                  <p className="mt-1 text-xs leading-5 text-[var(--lp-faint)]">
                    {REQUEST_STATUS_DESCRIPTIONS[request.status]}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {canClaim && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
                    onClick={() => claimMutation.mutate()}
                    disabled={claimMutation.isPending}
                  >
                    {claimMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                    {claimMutation.isPending ? "Claiming..." : "Claim request"}
                  </Button>
                )}

                {allowedStatuses.length > 0 ? (
                  <>
                    <Textarea
                      rows={3}
                      value={statusNote}
                      onChange={(event) => setStatusNote(event.target.value)}
                      placeholder="Optional note for this status change..."
                      className={cn(fieldClassName, "min-h-[96px] resize-y")}
                    />
                    <Select
                      value={statusVisibility}
                      onValueChange={(value) => setStatusVisibility(value as MessageVisibility)}
                    >
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={selectContentClassName}>
                        <SelectItem value="customer_visible" className={selectItemClassName}>
                          Customer visible note
                        </SelectItem>
                        <SelectItem value="internal_note" className={selectItemClassName}>
                          Internal note
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid gap-2">
                      {allowedStatuses.map((nextStatus) => {
                        const Icon = workflowIcons[nextStatus];
                        const isArchive = nextStatus === "closed";
                        return (
                          <Button
                            key={nextStatus}
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-auto justify-start rounded-xl border px-4 py-3 text-left font-semibold",
                              isArchive
                                ? "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)] hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300"
                                : "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)] hover:border-[var(--lp-accent)]/55 hover:bg-[var(--lp-accent)]/15",
                            )}
                            onClick={() => submitStatus(nextStatus)}
                            disabled={statusMutation.isPending}
                          >
                            {statusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Icon className="h-4 w-4" />
                            )}
                            {workflowLabels[nextStatus]}
                          </Button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-4 text-sm text-[var(--lp-ink-soft)]">
                    {request.status === "closed"
                      ? "Archived requests can only be reopened by an admin."
                      : "Claim or assign this request before changing its status."}
                  </div>
                )}

                {isAdmin && (
                  <div className="border-t border-[var(--lp-line)] pt-4">
                    <label className="text-sm font-medium text-[var(--lp-ink)]">Assign engineer</label>
                    <div className="mt-2 space-y-2">
                      <Select value={engineerId} onValueChange={setEngineerId}>
                        <SelectTrigger className={selectTriggerClassName}>
                          <SelectValue placeholder="Choose engineer" />
                        </SelectTrigger>
                        <SelectContent className={selectContentClassName}>
                          {engineers.map((engineer) => (
                            <SelectItem key={engineer.id} value={engineer.id} className={selectItemClassName}>
                              {engineer.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
                        onClick={() => assignMutation.mutate()}
                        disabled={assignMutation.isPending || !engineerId}
                      >
                        {assignMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                        {assignMutation.isPending ? "Assigning..." : "Assign engineer"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {canCustomerCancel && (
            <section className={cn("rounded-3xl p-6", cardSurface)}>
              <h2 className="lp-display text-xl font-semibold text-[var(--lp-ink)]">Request actions</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--lp-ink-soft)]">
                You can cancel this service request while it is still active. It will be archived, not deleted.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 h-11 w-full rounded-xl border-rose-400/30 bg-rose-500/10 text-rose-500 hover:border-rose-400/45 hover:bg-rose-500/15 dark:text-rose-300"
                onClick={() => {
                  const confirmed = window.confirm(
                    "Cancel this service request? It will be archived but kept for history.",
                  );
                  if (confirmed) cancelMutation.mutate();
                }}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                {cancelMutation.isPending ? "Cancelling..." : "Cancel request"}
              </Button>
            </section>
          )}

          {isStaff && (
            <section className={cn("rounded-3xl p-6", cardSurface)}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]">
                  <History className="h-4 w-4" />
                </div>
                <h2 className="lp-display text-2xl font-semibold text-[var(--lp-ink)]">Activity</h2>
              </div>
              <div className="mt-5 space-y-3">
                {data.history.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 p-4 text-sm text-[var(--lp-ink-soft)]">
                    No activity recorded yet.
                  </div>
                ) : (
                  data.history.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/55 p-4 text-sm">
                      <p className="font-medium text-[var(--lp-ink)]">{formatEvent(entry.eventType)}</p>
                      <p className="mt-1 text-xs text-[var(--lp-faint)]">{fmtDateTime(entry.createdAt)}</p>
                      {entry.metadata?.from && entry.metadata?.to && (
                        <p className="mt-2 text-xs text-[var(--lp-ink-soft)]">
                          {String(entry.metadata.from).replaceAll("_", " ")} -&gt;{" "}
                          {String(entry.metadata.to).replaceAll("_", " ")}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          <section className={cn("rounded-3xl p-5", cardSurface)}>
            <div className="flex items-start gap-3 text-sm leading-6 text-[var(--lp-ink-soft)]">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
              <span>
                Keep updates factual and include measurements, machine behavior, and production impact where useful.
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default RequestDetailPage;
