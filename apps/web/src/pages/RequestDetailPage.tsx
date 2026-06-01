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
import { ApiError, apiRequest } from "@/lib/api";
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

/**
 * Workflow button labels keyed by the *target* status. `assigned` is
 * intentionally omitted as a button — assignment happens via the dedicated
 * Claim / Reassign controls. `new` is shown as "Reopen request" because the
 * only way the workflow surfaces a `new` action is when reopening a
 * finished request.
 */
const workflowLabels: Record<Exclude<RequestStatus, "assigned">, string> = {
  new: "Reopen request",
  triaged: "Mark triaged",
  in_progress: "Start work",
  waiting_for_customer: "Mark pending",
  resolved: "Mark resolved",
  closed: "Archive request",
};
function workflowLabel(
  current: RequestStatus,
  next: Exclude<RequestStatus, "assigned">,
): string {
  // "Start work" from a paused/pending state reads better as "Resume work".
  if (next === "in_progress" && current === "waiting_for_customer") {
    return "Resume work";
  }
  return workflowLabels[next];
}

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

function friendlyActionError(
  error: unknown,
  fallback: string,
  perStatus?: Record<number, string>,
) {
  if (error instanceof ApiError) {
    if (perStatus?.[error.status]) return perStatus[error.status];
    if (error.status === 401) return "Your session expired. Please sign in again.";
    if (error.status === 403) return "You do not have permission to perform this action.";
    if (error.status === 404) return fallback;
    if (
      typeof error.message === "string" &&
      error.message.trim() &&
      !error.message.startsWith("Route ")
    ) {
      return error.message;
    }
    return fallback;
  }
  if (error instanceof Error && error.message && !error.message.startsWith("Route ")) {
    return error.message;
  }
  return fallback;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--lp-line)] py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="lp-mono shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)] sm:w-28">
        {label}
      </span>
      <span className="break-words text-sm text-[var(--lp-ink)] sm:flex-1">
        {value}
      </span>
    </div>
  );
}

/* Priority pill used in the compact summary header. */
const priorityClass: Record<string, string> = {
  low: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
  normal: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  high: "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  urgent: "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300",
};

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
    // Same-status updates are never offered.
    if (next === request.status) return false;
    // Reopen actions are admin-only. Mirrors backend canTransitionRequestTo.
    const isReopen =
      next === "new" &&
      (request.status === "resolved" || request.status === "closed");
    if (isReopen && user.role !== "admin") return false;
    return true;
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
  const [showAllActivity, setShowAllActivity] = useState(false);
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
    onError: async (error: unknown) => {
      toast.error(
        friendlyActionError(error, "Could not claim this request.", {
          409: "This request is already assigned.",
          403: "You can no longer claim this request.",
        }),
      );
      // Re-pull so the UI reflects whoever actually owns it now.
      await refresh();
    },
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
    onError: async (error: unknown) => {
      toast.error(
        friendlyActionError(error, "Could not update request status.", {
          400: "That status change isn't allowed from the current state.",
          403: "You do not have permission to change this request.",
          409: "This request was updated by someone else. Please reload.",
        }),
      );
      // Re-pull so the UI reflects the actual server state (someone may
      // have moved the ticket while this button was visible).
      await refresh();
    },
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
    onError: (error) =>
      toast.error(
        friendlyActionError(
          error,
          "Could not save changes. Please try again.",
          {
            403: "You do not have permission to edit this request.",
            404: "This request no longer exists.",
          },
        ),
      ),
  });

  const assignMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${requestId}/assign`, {
        method: "POST",
        body: JSON.stringify({ engineerId }),
      }),
    onSuccess: async () => {
      setEngineerId("");
      toast.success(
        data?.request?.assignedEngineerId ? "Engineer reassigned." : "Engineer assigned.",
      );
      await refresh();
    },
    onError: (error: unknown) =>
      toast.error(
        friendlyActionError(error, "Could not assign this engineer.", {
          400: "That account cannot be assigned as an engineer.",
          403: "You do not have permission to reassign this request.",
        }),
      ),
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
    onError: (error) =>
      toast.error(
        friendlyActionError(
          error,
          "Could not cancel request. Please try again.",
          {
            400: "This request can no longer be cancelled.",
            403: "You do not have permission to cancel this request.",
            404: "This request no longer exists.",
          },
        ),
      ),
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
  // Claim is a *first-grab* action — only valid when nobody owns the request
  // yet. Re-claiming your own request creates duplicate history; admins
  // reassign through the dedicated "Reassign" control below, not /claim.
  const canClaim =
    isStaff &&
    request.status !== "closed" &&
    !request.assignedEngineerId;
  const assignedToMe =
    isStaff && Boolean(request.assignedEngineerId) && request.assignedEngineerId === user?.id;
  const assignedEngineerName = request.assignedEngineerId
    ? engineers.find((e) => e.id === request.assignedEngineerId)?.displayName ??
      users.find((u) => u.id === request.assignedEngineerId)?.displayName ??
      "another engineer"
    : null;
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
        <DialogContent
          className={cn(
            "lp-portal gap-0 overflow-hidden border-[var(--lp-line)] bg-[var(--lp-panel)] p-0 text-[var(--lp-ink)] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]",
            "w-[calc(100vw-2rem)] max-w-[min(720px,calc(100vw-2rem))] rounded-2xl sm:max-w-[720px]",
            "max-h-[min(86vh,860px)]",
          )}
        >
          <DialogHeader className="space-y-1.5 border-b border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 px-6 py-5 text-left">
            <DialogTitle className="lp-display text-xl font-semibold text-[var(--lp-ink)] sm:text-2xl">
              Edit request
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[var(--lp-ink-soft)]">
              Update the safe service request details. Request number, product, history, and conversation stay unchanged.
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex max-h-[calc(86vh-9rem)] flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              editMutation.mutate();
            }}
          >
            <div className="grid gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                  Subject
                </span>
                <Input
                  required
                  minLength={4}
                  value={editForm.subject}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  className={cn(fieldClassName, "h-10 rounded-xl px-3 py-2")}
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                  Contact phone
                </span>
                <Input
                  required
                  minLength={7}
                  value={editForm.contactPhone}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, contactPhone: event.target.value }))
                  }
                  className={cn(fieldClassName, "h-10 rounded-xl px-3 py-2")}
                />
              </label>

              <label>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                  Serial number
                </span>
                <Input
                  value={editForm.serialNumber}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, serialNumber: event.target.value }))
                  }
                  className={cn(fieldClassName, "h-10 rounded-xl px-3 py-2")}
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                  Site location
                </span>
                <Input
                  required
                  minLength={2}
                  value={editForm.siteLocation}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, siteLocation: event.target.value }))
                  }
                  className={cn(fieldClassName, "h-10 rounded-xl px-3 py-2")}
                />
              </label>

              <label className="sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-faint)]">
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
                  className={cn(fieldClassName, "min-h-[120px] rounded-xl px-3 py-2 resize-y")}
                />
              </label>
            </div>

            <DialogFooter className="flex flex-col-reverse gap-2 border-t border-[var(--lp-line)] bg-[var(--lp-panel-2)]/55 px-6 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-[var(--lp-line-strong)] bg-transparent px-4 text-sm text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
                onClick={() => setIsEditOpen(false)}
                disabled={editMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-10 gap-2 rounded-xl bg-[var(--lp-accent)] px-4 text-sm font-semibold text-[#fbfaf6] shadow-[0_10px_30px_-18px_var(--lp-accent)] hover:bg-[var(--lp-accent-2)]"
                disabled={editMutation.isPending}
              >
                {editMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PencilLine className="h-4 w-4" />
                )}
                {editMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <section className={cn("relative overflow-hidden rounded-2xl p-5 sm:p-6", cardSurface)}>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.14]"
              style={{
                maskImage: "linear-gradient(to right, black, transparent 74%)",
                WebkitMaskImage: "linear-gradient(to right, black, transparent 74%)",
              }}
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="lp-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--lp-faint)]">
                    {request.requestNumber}
                  </span>
                  <StatusBadge status={request.status} />
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                      priorityClass[request.priority] ?? priorityClass.normal,
                    )}
                  >
                    {request.priority}
                  </span>
                </div>
                <h1 className="lp-display mt-2.5 text-2xl font-bold leading-tight text-[var(--lp-ink)] sm:text-[26px]">
                  {request.subject}
                </h1>
                <p className="mt-1.5 text-sm text-[var(--lp-ink-soft)]">
                  {request.productSnapshot.name}
                </p>
              </div>
            </div>
            <p className="relative mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-[var(--lp-ink-soft)]">
              {request.description}
            </p>
            <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-[var(--lp-faint)]">
              <span>
                Created{" "}
                <span className="text-[var(--lp-ink-soft)]">
                  {fmtDateTime(request.createdAt)}
                </span>
              </span>
              {request.updatedAt && (
                <span>
                  Updated{" "}
                  <span className="text-[var(--lp-ink-soft)]">
                    {fmtDateTime(request.updatedAt)}
                  </span>
                </span>
              )}
              {request.assignedEngineerId && (
                <span>
                  Assigned{" "}
                  <span className="text-[var(--lp-ink-soft)]">
                    {engineers.find((e) => e.id === request.assignedEngineerId)?.displayName ?? "engineer"}
                  </span>
                </span>
              )}
            </div>
          </section>

          <section className={cn("rounded-2xl p-5 sm:p-6", cardSurface)}>
            <div className="mb-4 flex items-center gap-2.5">
              <MessageSquare className="h-4 w-4 text-[var(--lp-accent)]" />
              <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                Conversation
              </h2>
              <span className="lp-mono text-[10px] uppercase tracking-[0.18em] text-[var(--lp-faint)]">
                {data.messages.length} update{data.messages.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-3">
              {data.messages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 px-4 py-6 text-center text-sm text-[var(--lp-faint)]">
                  No updates yet — start the conversation below.
                </div>
              ) : (
                data.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} isStaff={isStaff} />
                ))
              )}
            </div>

            <form
              className="mt-5 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                messageMutation.mutate();
              }}
            >
              <Textarea
                required
                rows={3}
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                placeholder="Add a service update…"
                className={cn(
                  fieldClassName,
                  "min-h-[88px] resize-y border-transparent bg-transparent px-2 py-2 focus-visible:border-transparent",
                )}
              />
              <div className="mt-2 flex flex-col gap-2 border-t border-[var(--lp-line)] pt-2 sm:flex-row sm:items-center sm:justify-between">
                {isStaff ? (
                  <Select
                    value={visibility}
                    onValueChange={(value) => setVisibility(value as MessageVisibility)}
                  >
                    <SelectTrigger
                      className={cn(selectTriggerClassName, "h-9 w-full sm:w-56")}
                    >
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
                  <p className="text-[11px] text-[var(--lp-faint)]">
                    Replies are visible to the service team.
                  </p>
                )}
                <Button
                  type="submit"
                  className="h-9 w-full gap-1.5 rounded-full bg-[var(--lp-accent)] px-4 text-sm font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)] sm:w-auto"
                  disabled={messageMutation.isPending || messageBody.trim().length === 0}
                >
                  {messageMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Send update
                    </>
                  )}
                </Button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-5">
          <section className={cn("rounded-2xl p-5", cardSurface)}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                Request details
              </h2>
              {canEditRequest && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-3 text-xs font-semibold text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
                  onClick={openEditDialog}
                >
                  <PencilLine className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
            </div>
            <div className="mt-2">
              <DetailRow label="Status" value={getRequestStatusLabel(request.status)} />
              <DetailRow
                label="Priority"
                value={<span className="capitalize">{request.priority}</span>}
              />
              <DetailRow label="Product" value={request.productSnapshot.name} />
              <DetailRow label="Phone" value={request.contactPhone} />
              <DetailRow label="Location" value={request.siteLocation} />
              <DetailRow
                label="Serial"
                value={
                  request.serialNumber || (
                    <span className="text-[var(--lp-faint)]">Not provided</span>
                  )
                }
              />
            </div>
          </section>

          {isStaff && (
            <section className={cn("rounded-2xl p-5", cardSurface)}>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-[var(--lp-accent)]" />
                <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                  Workflow
                </h2>
              </div>
              <p className="mt-1.5 text-[11px] leading-5 text-[var(--lp-faint)]">
                {REQUEST_STATUS_DESCRIPTIONS[request.status]}
              </p>

              {/* Assignment state — clear single source of truth for ownership. */}
              <div
                className={cn(
                  "mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                  request.assignedEngineerId
                    ? assignedToMe
                      ? "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]"
                      : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink)]"
                    : "border-dashed border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 text-[var(--lp-faint)]",
                )}
              >
                <UserCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">
                  {request.assignedEngineerId
                    ? assignedToMe
                      ? "Assigned to you"
                      : `Assigned to ${assignedEngineerName}`
                    : "Unassigned"}
                </span>
              </div>

              {canClaim && (
                <Button
                  type="button"
                  className="mt-3 h-9 w-full gap-1.5 rounded-full bg-[var(--lp-accent)] px-4 text-sm font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]"
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                >
                  {claimMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  {claimMutation.isPending ? "Claiming…" : "Claim request"}
                </Button>
              )}

              {allowedStatuses.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 p-2.5">
                    <Textarea
                      rows={2}
                      value={statusNote}
                      onChange={(event) => setStatusNote(event.target.value)}
                      placeholder="Optional note for this status change…"
                      className={cn(
                        fieldClassName,
                        "min-h-[60px] resize-y border-transparent bg-transparent px-1.5 py-1 text-sm focus-visible:border-transparent",
                      )}
                    />
                    <Select
                      value={statusVisibility}
                      onValueChange={(value) =>
                        setStatusVisibility(value as MessageVisibility)
                      }
                    >
                      <SelectTrigger
                        className={cn(selectTriggerClassName, "mt-1.5 h-8 text-xs")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className={selectContentClassName}>
                        <SelectItem
                          value="customer_visible"
                          className={selectItemClassName}
                        >
                          Customer visible note
                        </SelectItem>
                        <SelectItem
                          value="internal_note"
                          className={selectItemClassName}
                        >
                          Internal note
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status actions — primary first, archive isolated at bottom. */}
                  {(() => {
                    const archive = allowedStatuses.find((s) => s === "closed");
                    const primary = allowedStatuses.filter((s) => s !== "closed");
                    return (
                      <>
                        {primary.length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {primary.map((nextStatus, idx) => {
                              const Icon = workflowIcons[nextStatus];
                              const isPrimary = idx === 0;
                              return (
                                <Button
                                  key={nextStatus}
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "h-9 gap-1.5 rounded-lg px-2.5 text-xs font-semibold",
                                    isPrimary
                                      ? "border-[var(--lp-accent)]/45 bg-[var(--lp-accent)]/12 text-[var(--lp-accent)] hover:border-[var(--lp-accent)]/65 hover:bg-[var(--lp-accent)]/20"
                                      : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:text-[var(--lp-ink)]",
                                  )}
                                  onClick={() => submitStatus(nextStatus)}
                                  disabled={statusMutation.isPending}
                                >
                                  {statusMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Icon className="h-3 w-3" />
                                  )}
                                  <span className="truncate">
                                    {workflowLabel(
                                      request.status,
                                      nextStatus as Exclude<RequestStatus, "assigned">,
                                    )}
                                  </span>
                                </Button>
                              );
                            })}
                          </div>
                        )}
                        {archive && (
                          <div className="mt-1 border-t border-[var(--lp-line)] pt-3">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 w-full gap-1.5 rounded-lg border-amber-400/35 bg-transparent text-xs font-semibold text-amber-700 hover:border-amber-400/55 hover:bg-amber-400/10 dark:text-amber-300"
                              onClick={() => submitStatus(archive)}
                              disabled={statusMutation.isPending}
                            >
                              <Archive className="h-3.5 w-3.5" />
                              {workflowLabel(
                                request.status,
                                archive as Exclude<RequestStatus, "assigned">,
                              )}
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="mt-4 rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 px-3 py-2 text-xs text-[var(--lp-ink-soft)]">
                  {request.status === "closed"
                    ? "Archived requests can only be reopened by an admin."
                    : "Claim or assign this request before changing its status."}
                </p>
              )}

              {isAdmin && (
                <div className="mt-4 border-t border-[var(--lp-line)] pt-3">
                  <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
                    {request.assignedEngineerId ? "Reassign engineer" : "Assign engineer"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Select value={engineerId} onValueChange={setEngineerId}>
                      <SelectTrigger className={cn(selectTriggerClassName, "h-9 flex-1 text-sm")}>
                        <SelectValue placeholder="Choose engineer" />
                      </SelectTrigger>
                      <SelectContent className={selectContentClassName}>
                        {engineers.map((engineer) => (
                          <SelectItem
                            key={engineer.id}
                            value={engineer.id}
                            className={selectItemClassName}
                          >
                            {engineer.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      className="h-9 shrink-0 gap-1.5 rounded-full bg-[var(--lp-accent)] px-3 text-xs font-semibold text-[#fbfaf6] hover:bg-[var(--lp-accent-2)] disabled:opacity-50"
                      onClick={() => assignMutation.mutate()}
                      disabled={assignMutation.isPending || !engineerId}
                    >
                      {assignMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserCheck className="h-3 w-3" />
                      )}
                      {request.assignedEngineerId ? "Reassign" : "Assign"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          {canCustomerCancel && (
            <section className={cn("rounded-2xl p-5", cardSurface)}>
              <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                Request actions
              </h2>
              <p className="mt-1.5 text-xs leading-5 text-[var(--lp-ink-soft)]">
                Cancel while still active — the request is archived, not deleted.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-9 w-full gap-1.5 rounded-lg border-amber-400/35 bg-transparent text-xs font-semibold text-amber-700 hover:border-amber-400/55 hover:bg-amber-400/10 dark:text-amber-300"
                onClick={() => setConfirmAction({ type: "cancel-request" })}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
                {cancelMutation.isPending ? "Cancelling…" : "Cancel request"}
              </Button>
            </section>
          )}

          {isStaff && (() => {
            // Newest first so "the latest 5" is what's visible by default.
            const sortedHistory = [...data.history].sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
            const ACTIVITY_PREVIEW = 5;
            const total = sortedHistory.length;
            const visible = showAllActivity
              ? sortedHistory
              : sortedHistory.slice(0, ACTIVITY_PREVIEW);
            const hiddenCount = total - visible.length;
            return (
              <section className={cn("rounded-2xl p-5", cardSurface)}>
                <div className="mb-3 flex items-center gap-2">
                  <History className="h-4 w-4 text-[var(--lp-accent)]" />
                  <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                    Activity
                  </h2>
                  {total > 0 && (
                    <span className="lp-mono ml-auto rounded-full border border-[var(--lp-line)] bg-[var(--lp-panel-2)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                      {total} event{total === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                {total === 0 ? (
                  <p className="rounded-lg border border-dashed border-[var(--lp-line)] bg-[var(--lp-panel-2)]/40 px-3 py-3 text-center text-xs text-[var(--lp-faint)]">
                    No activity yet.
                  </p>
                ) : (
                  <>
                    <ol className="relative ml-1.5 space-y-2.5 border-l border-[var(--lp-line)] pl-4">
                      {visible.map((entry) => (
                        <li key={entry.id} className="relative">
                          <span
                            aria-hidden="true"
                            className="absolute -left-[18px] top-1.5 h-2 w-2 rounded-full border border-[var(--lp-accent)]/55 bg-[var(--lp-panel)]"
                          />
                          <p className="text-[13px] font-medium leading-5 text-[var(--lp-ink)]">
                            {formatEvent(entry.eventType)}
                          </p>
                          {entry.metadata?.from && entry.metadata?.to && (
                            <p className="text-[11px] leading-4 text-[var(--lp-ink-soft)]">
                              {String(entry.metadata.from).replaceAll("_", " ")} →{" "}
                              {String(entry.metadata.to).replaceAll("_", " ")}
                            </p>
                          )}
                          <p className="lp-mono text-[10px] uppercase tracking-[0.14em] text-[var(--lp-faint)]">
                            {fmtDateTime(entry.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ol>
                    {total > ACTIVITY_PREVIEW && (
                      <button
                        type="button"
                        onClick={() => setShowAllActivity((v) => !v)}
                        className="mt-3 w-full rounded-md border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/50 px-3 py-1.5 text-[11px] font-semibold text-[var(--lp-ink-soft)] transition-colors hover:border-[var(--lp-accent)]/45 hover:text-[var(--lp-accent)]"
                      >
                        {showAllActivity
                          ? "Show less"
                          : `Show all activity (${hiddenCount} more)`}
                      </button>
                    )}
                  </>
                )}
              </section>
            );
          })()}

          <section className={cn("rounded-2xl px-4 py-3", cardSurface)}>
            <div className="flex items-start gap-2.5 text-xs leading-5 text-[var(--lp-ink-soft)]">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--lp-accent)]" />
              <span>
                Keep updates factual — measurements, machine behavior, and
                production impact help most.
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
        <AlertDialogContent
          className={cn(
            "lp-portal gap-0 overflow-hidden border-[var(--lp-line)] bg-[var(--lp-panel)] p-0 text-[var(--lp-ink)] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)]",
            "w-[calc(100vw-2rem)] max-w-[min(440px,calc(100vw-2rem))] rounded-2xl",
          )}
        >
          <AlertDialogHeader className="space-y-3 px-6 pb-2 pt-6 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/12 text-amber-600 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="lp-display text-xl font-semibold text-[var(--lp-ink)]">
              {confirmAction?.type === "cancel-request" ? "Cancel request?" : "Archive request?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-[var(--lp-ink-soft)]">
              {confirmAction?.type === "cancel-request"
                ? "This cancels the service request and moves it out of the active dashboard. The full history and conversation are kept."
                : "This archives the service request and removes it from active lists. The full history and conversation are kept for audit."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse gap-2 px-6 pb-5 pt-3 sm:flex-row sm:justify-end sm:gap-2 sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-10 rounded-xl border-[var(--lp-line-strong)] bg-transparent px-4 text-sm text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/45 hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-ink)]">
              Keep request
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "h-10 rounded-xl px-4 text-sm font-semibold transition",
                "border border-amber-400/50 bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 hover:text-amber-800",
                "dark:border-amber-400/45 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25 dark:hover:text-amber-100",
              )}
              onClick={confirmDestructiveAction}
              disabled={cancelMutation.isPending || statusMutation.isPending}
            >
              {(cancelMutation.isPending || statusMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {confirmAction?.type === "cancel-request" ? "Cancel request" : "Archive request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RequestDetailPage;
