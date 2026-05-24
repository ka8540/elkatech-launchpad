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
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PencilLine,
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
import { Link, useNavigate, useParams } from "react-router-dom";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

type EditRequestForm = {
  subject: string;
  description: string;
  contactPhone: string;
  siteLocation: string;
  serialNumber: string;
};

type ConfirmAction =
  | { type: "archive-status"; nextStatus: RequestStatus }
  | { type: "cancel-request" }
  | null;

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

function canEditRequestDetails({
  request,
  user,
}: {
  request: ServiceRequest;
  user?: AuthUser | null;
}) {
  if (!user || request.status === "closed") return false;
  if (user.role === "admin") return true;
  if (user.role === "engineer") return request.assignedEngineerId === user.id;
  return (
    request.customerId === user.id &&
    ["new", "triaged", "waiting_for_customer"].includes(request.status)
  );
}

function MessageBubble({
  message,
  isStaff,
}: {
  message: RequestMessage;
  isStaff: boolean;
}) {
  const isCustomerMessage = message.authorRole === "customer";
  const isInternal = message.visibility === "internal_note";

  return (
    <div className={cn("flex", isCustomerMessage ? "justify-start" : "justify-end")}>
      <article
        className={cn(
          "max-w-[88%] rounded-2xl border px-4 py-3 shadow-[0_18px_38px_-32px_rgba(0,0,0,0.75)] sm:max-w-[76%]",
          isCustomerMessage
            ? "rounded-bl-md border-[var(--lp-line)] bg-[var(--lp-panel-2)]/70"
            : "rounded-br-md border-[var(--lp-accent)]/28 bg-[var(--lp-accent)]/[0.10]",
          isInternal && "border-amber-400/30 bg-amber-400/[0.08]",
        )}
      >
        <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-[0.16em]">
          <span
            className={cn(
              "lp-mono font-semibold",
              isCustomerMessage ? "text-[var(--lp-faint)]" : "text-[var(--lp-accent)]",
            )}
          >
            {isCustomerMessage ? "Customer" : "Service team"}
          </span>
          {isStaff && isInternal && (
            <span className="rounded-full border border-amber-400/30 px-2 py-0.5 text-amber-600 dark:text-amber-300">
              Internal note
            </span>
          )}
          <span className="text-[var(--lp-faint)]">{fmtDateTime(message.createdAt)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--lp-ink)]">
          {message.body}
        </p>
      </article>
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [messageBody, setMessageBody] = useState("");
  const [visibility, setVisibility] = useState<MessageVisibility>("customer_visible");
  const [statusNote, setStatusNote] = useState("");
  const [statusVisibility, setStatusVisibility] =
    useState<MessageVisibility>("customer_visible");
  const [engineerId, setEngineerId] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [editForm, setEditForm] = useState<EditRequestForm>({
    subject: "",
    description: "",
    contactPhone: "",
    siteLocation: "",
    serialNumber: "",
  });

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

  const editMutation = useMutation({
    mutationFn: () =>
      apiRequest<ServiceRequest>(`/api/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({
          subject: editForm.subject,
          description: editForm.description,
          contactPhone: editForm.contactPhone,
          siteLocation: editForm.siteLocation,
          serialNumber: editForm.serialNumber.trim() || null,
        }),
      }),
    onSuccess: async () => {
      setIsEditOpen(false);
      toast.success("Request details updated.");
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
      navigate("/app/requests?status=archived");
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
    ["new", "triaged", "waiting_for_customer"].includes(request.status);
  const canEditRequest = canEditRequestDetails({ request, user });

  const openEditDialog = () => {
    setEditForm({
      subject: request.subject,
      description: request.description,
      contactPhone: request.contactPhone,
      siteLocation: request.siteLocation,
      serialNumber: request.serialNumber ?? "",
    });
    setIsEditOpen(true);
  };

  const submitStatus = (nextStatus: RequestStatus) => {
    if (nextStatus === "closed") {
      setConfirmAction({ type: "archive-status", nextStatus });
      return;
    }

    statusMutation.mutate({
      nextStatus,
      note: statusNote.trim(),
      noteVisibility: statusVisibility,
    });
  };

  const confirmDestructiveAction = () => {
    if (!confirmAction) return;

    if (confirmAction.type === "archive-status") {
      statusMutation.mutate({
        nextStatus: confirmAction.nextStatus,
        note: statusNote.trim(),
        noteVisibility: statusVisibility,
      });
    } else {
      cancelMutation.mutate();
    }
    setConfirmAction(null);
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="lp-card border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="lp-display text-2xl text-[var(--lp-ink)]">
              Edit request
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[var(--lp-ink-soft)]">
              Update safe service request details. Request number, product, history, and conversation stay unchanged.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              editMutation.mutate();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-[var(--lp-ink)]">
                  Subject
                </span>
                <Input
                  required
                  minLength={4}
                  value={editForm.subject}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  className={cn(fieldClassName, "h-11")}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-[var(--lp-ink)]">
                  Contact phone
                </span>
                <Input
                  required
                  minLength={7}
                  value={editForm.contactPhone}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, contactPhone: event.target.value }))
                  }
                  className={cn(fieldClassName, "h-11")}
                />
              </label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-[var(--lp-ink)]">
                  Serial number
                </span>
                <Input
                  value={editForm.serialNumber}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, serialNumber: event.target.value }))
                  }
                  className={cn(fieldClassName, "h-11")}
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-[var(--lp-ink)]">
                  Site location
                </span>
                <Input
                  required
                  minLength={2}
                  value={editForm.siteLocation}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, siteLocation: event.target.value }))
                  }
                  className={cn(fieldClassName, "h-11")}
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-[var(--lp-ink)]">
                  Description
                </span>
                <Textarea
                  required
                  minLength={10}
                  rows={5}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, description: event.target.value }))
                  }
                  className={cn(fieldClassName, "min-h-[132px] resize-y")}
                />
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
                onClick={() => setIsEditOpen(false)}
                disabled={editMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-[var(--lp-accent)] font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
                {editMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                  <MessageBubble key={message.id} message={message} isStaff={isStaff} />
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
            <div className="flex items-start justify-between gap-3">
              <h2 className="lp-display text-2xl font-semibold text-[var(--lp-ink)]">Request details</h2>
              {canEditRequest && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-3 text-xs font-semibold text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
                  onClick={openEditDialog}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
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
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-600 hover:border-amber-400/45 hover:bg-amber-400/15 dark:text-amber-300"
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
                className="mt-4 h-11 w-full rounded-xl border-amber-400/30 bg-amber-400/10 text-amber-600 hover:border-amber-400/45 hover:bg-amber-400/15 dark:text-amber-300"
                onClick={() => setConfirmAction({ type: "cancel-request" })}
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

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent className="lp-card border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink)]">
          <AlertDialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="lp-display text-2xl text-[var(--lp-ink)]">
              {confirmAction?.type === "cancel-request" ? "Cancel request?" : "Archive request?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-[var(--lp-ink-soft)]">
              {confirmAction?.type === "cancel-request"
                ? "This will cancel the service request and move it out of the active dashboard. The request history and conversation will be kept."
                : "This will archive the service request and remove it from active request lists. The full history and conversation will be kept for audit."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]">
              Keep request
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-[var(--lp-accent)] font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
              onClick={confirmDestructiveAction}
            >
              {confirmAction?.type === "cancel-request" ? "Cancel request" : "Archive request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RequestDetailPage;
