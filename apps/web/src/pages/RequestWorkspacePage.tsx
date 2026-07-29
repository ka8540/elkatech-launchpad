import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuthUser,
  MessageVisibility,
  RequestAttachment,
  RequestMessage,
  RequestParticipant,
  RequestStatus,
  Role,
  ServiceRequest,
} from "@elkatech/contracts";
import {
  canAssignRequests,
  canManageOperational,
  canAccessPeopleActivity,
  canViewCustomerActivity,
  ISSUE_TYPE_LABELS,
  type IssueType,
} from "@elkatech/contracts";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  ExternalLink,
  FileImage,
  History,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  PencilLine,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  UserCheck,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { ApiError, apiRequest } from "@/lib/api";
import { PAGE_CONTAINER } from "@/lib/page-layout";
import {
  getRequestStatusLabel,
  REQUEST_STATUS_DESCRIPTIONS,
  REQUEST_STATUS_WORKFLOW,
} from "@/lib/request-status";
import {
  attachmentDisplayName,
  presentRequestHistory,
} from "@/lib/request-detail";
import {
  formatFileSize,
  uploadRequestAttachment,
} from "@/lib/attachments";
import { useAttachmentPicker } from "@/components/request/shared";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type RequestHistoryEntry = {
  id: string;
  requestId: string;
  actorId: string;
  actorRole: Role;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type RequestMachineView = {
  id?: string;
  displayLabel?: string;
  productName?: string;
  unitNumber?: string | null;
  siteName?: string | null;
  siteLocation?: string;
  internalSerialNumber?: string | null;
  productSnapshot?: { name?: string } | null;
};

type RequestDetailResponse = {
  request: ServiceRequest;
  assignedEngineer?: RequestParticipant | null;
  messages: RequestMessage[];
  history: RequestHistoryEntry[];
  attachments?: RequestAttachment[];
  machine?: RequestMachineView | null;
  customer?: { displayName: string; companyName: string | null } | null;
  pagination?: {
    messages: { offset: number; limit: number; hasMore: boolean };
    history: { offset: number; limit: number; hasMore: boolean };
  };
};

type EditRequestForm = {
  subject: string;
  description: string;
  contactPhone: string;
  siteLocation: string;
  serialNumber: string;
};

type ConfirmAction =
  | { type: "status"; nextStatus: RequestStatus }
  | { type: "assignment"; engineerId: string }
  | { type: "cancel-request" }
  | null;

const cardSurface = "lp-card border";
const fieldClassName =
  "lp-field rounded-xl border px-3 py-2 text-sm shadow-none ring-offset-0 focus-visible:ring-0";
const selectTriggerClassName =
  "lp-field h-10 rounded-xl border px-3 text-[var(--lp-ink)] shadow-none ring-offset-0 focus:ring-0 focus:ring-offset-0";
const selectContentClassName =
  "lp-portal border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink)] shadow-[0_18px_44px_-24px_rgba(0,0,0,0.55)]";
const selectItemClassName =
  "focus:bg-[var(--lp-accent)]/12 focus:text-[var(--lp-ink)]";

const workflowLabels: Record<Exclude<RequestStatus, "assigned">, string> = {
  new: "Reopen request",
  triaged: "Mark triaged",
  in_progress: "Start work",
  waiting_for_customer: "Wait for customer",
  resolved: "Resolve request",
  closed: "Archive request",
};

const workflowIcons: Record<
  RequestStatus,
  ComponentType<{ className?: string }>
> = {
  new: RotateCcw,
  triaged: ClipboardList,
  assigned: UserCheck,
  in_progress: Wrench,
  waiting_for_customer: Clock3,
  resolved: CheckCircle2,
  closed: Archive,
};

const priorityClass: Record<string, string> = {
  low: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
  normal:
    "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  high: "border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300",
  urgent:
    "border-rose-400/35 bg-rose-400/10 text-rose-700 dark:text-rose-300",
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function issueTypeLabel(issueType: string | null | undefined): string | null {
  if (!issueType) return null;
  return ISSUE_TYPE_LABELS[issueType as IssueType] ?? issueType;
}

function workflowLabel(
  current: RequestStatus,
  next: Exclude<RequestStatus, "assigned">,
): string {
  if (next === "in_progress" && current === "waiting_for_customer") {
    return "Resume work";
  }
  return workflowLabels[next];
}

function friendlyActionError(
  error: unknown,
  fallback: string,
  perStatus?: Record<number, string>,
) {
  if (error instanceof ApiError) {
    if (perStatus?.[error.status]) return perStatus[error.status];
    if (error.status === 401) {
      return "Your session expired. Please sign in again.";
    }
    if (error.status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (
      typeof error.message === "string" &&
      error.message.trim() &&
      !error.message.startsWith("Route ")
    ) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function canEditRequestDetails(
  request: ServiceRequest,
  user?: AuthUser | null,
) {
  if (!user || request.status === "closed") return false;
  if (user.role === "admin") return true;
  if (user.role === "engineer") {
    return request.assignedEngineerId === user.id;
  }
  return (
    user.role === "customer" &&
    request.customerId === user.id &&
    ["new", "triaged", "waiting_for_customer"].includes(request.status)
  );
}

function getAllowedStatuses(
  request: ServiceRequest,
  user?: AuthUser | null,
) {
  if (!user || !["engineer", "admin"].includes(user.role)) return [];
  if (
    user.role === "engineer" &&
    (request.status === "closed" ||
      request.assignedEngineerId !== user.id)
  ) {
    return [];
  }

  return REQUEST_STATUS_WORKFLOW[request.status].filter((next) => {
    if (next === request.status) return false;
    const isReopen =
      next === "new" &&
      (request.status === "resolved" || request.status === "closed");
    return !(isReopen && user.role !== "admin");
  });
}

function MetaItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="min-w-0">
      <dt className="lp-mono flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-faint)]">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </dt>
      <dd className="mt-1 break-words text-[13px] font-medium leading-5 text-[var(--lp-ink)]">
        {value}
      </dd>
    </div>
  );
}

function DetailItem({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/45 px-3 py-2.5",
        wide && "col-span-2",
      )}
    >
      <dt className="lp-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-faint)]">
        {label}
      </dt>
      <dd className="mt-1 break-words text-[13px] leading-5 text-[var(--lp-ink)]">
        {children}
      </dd>
    </div>
  );
}

function MessageBubble({
  message,
  isStaff,
  isMine,
  attachments,
  onPreviewAttachment,
}: {
  message: RequestMessage;
  isStaff: boolean;
  isMine: boolean;
  attachments: RequestAttachment[];
  onPreviewAttachment: (attachment: RequestAttachment) => void;
}) {
  const isInternal = message.visibility === "internal_note";
  const isOutgoing = isMine;
  const senderLabel = isMine
    ? "You"
    : message.authorDisplayName ||
      message.authorEmail ||
      (message.authorRole === "customer" ? "Customer" : "Service team");
  const roleLabel =
    message.authorRole === "customer"
      ? "Customer"
      : message.authorRole === "admin"
        ? "Admin"
        : message.authorRole === "support"
          ? "Support"
          : message.authorRole === "owner"
            ? "Owner"
            : "Engineer";
  const avatarLabel = senderLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        isOutgoing ? "justify-end" : "justify-start",
      )}
      data-message-visibility={message.visibility}
      data-message-side={isOutgoing ? "right" : "left"}
      data-message-author-role={message.authorRole}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
          isOutgoing ? "order-2" : "order-1",
          isInternal &&
            "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300",
          !isInternal &&
            (isOutgoing
              ? "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]"
              : "border-[var(--lp-line)] bg-[var(--lp-panel)] text-[var(--lp-ink-soft)]"),
        )}
        aria-hidden="true"
      >
        {avatarLabel || "—"}
      </div>

      <article
        className={cn(
          "flex max-w-[82%] min-w-0 flex-col sm:max-w-[72%]",
          isOutgoing ? "order-1 items-end" : "order-2 items-start",
        )}
      >
        <div
          className={cn(
            "mb-1 flex max-w-full flex-wrap items-center gap-1.5 px-1",
            isOutgoing && "justify-end",
          )}
        >
          <span className="truncate text-[11px] font-semibold text-[var(--lp-ink-soft)]">
            {senderLabel}
          </span>
          <span className="lp-mono text-[8px] uppercase tracking-[0.12em] text-[var(--lp-faint)]">
            {roleLabel}
          </span>
          {isStaff && isInternal && (
            <span className="lp-mono rounded-full border border-amber-400/35 bg-amber-400/10 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
              Internal only
            </span>
          )}
        </div>

        {attachments.length > 0 && (
          <div
            className={cn(
              "mb-1.5 flex max-w-full flex-wrap gap-1.5",
              isOutgoing && "justify-end",
            )}
            data-message-attachments
          >
            {attachments.map((attachment) => {
              const label = attachmentDisplayName(attachment);
              return (
                <button
                  key={attachment.id}
                  type="button"
                  aria-label={`Preview ${label}`}
                  title={label}
                  onClick={() => onPreviewAttachment(attachment)}
                  className="group/file relative h-24 w-40 max-w-full shrink-0 overflow-hidden rounded-[18px] border border-[var(--lp-line)] bg-[var(--lp-panel-2)] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] focus-visible:ring-offset-2"
                >
                  {attachment.url && attachment.kind === "image" ? (
                    <img
                      src={attachment.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform group-hover/file:scale-[1.03]"
                    />
                  ) : attachment.url && attachment.kind === "video" ? (
                    <>
                      <video
                        src={attachment.url}
                        muted
                        preload="metadata"
                        className="h-full w-full bg-black object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <PlayCircle className="h-7 w-7 text-white" />
                      </span>
                    </>
                  ) : (
                    <span className="flex h-full items-center justify-center">
                      <FileImage className="h-6 w-6 text-[var(--lp-faint)]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {message.body.trim() && (
          <div
            className={cn(
              "max-w-full rounded-[20px] px-3.5 py-2.5 shadow-sm",
              isOutgoing
                ? "rounded-br-md bg-[var(--lp-accent)] text-[#fffaf4]"
                : "rounded-bl-md border border-[var(--lp-line)] bg-[var(--lp-panel)] text-[var(--lp-ink)]",
              isInternal &&
                "rounded-br-md border border-amber-400/40 bg-amber-400/[0.11] text-[var(--lp-ink)] dark:bg-amber-400/[0.08]",
            )}
            data-message-text
          >
            <p className="break-words whitespace-pre-wrap text-sm leading-5">
              {message.body}
            </p>
          </div>
        )}

        <time className="mt-1 px-1 text-[9px] text-[var(--lp-faint)]">
          {fmtDateTime(message.createdAt)}
        </time>
      </article>
    </div>
  );
}

function resizeMessageComposer(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  const nextHeight = Math.min(Math.max(textarea.scrollHeight, 42), 160);
  textarea.style.height = `${nextHeight}px`;
  textarea.style.overflowY = textarea.scrollHeight > 160 ? "auto" : "hidden";
}

function AttachmentTile({
  attachment,
  onPreview,
}: {
  attachment: RequestAttachment;
  onPreview: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const label = attachmentDisplayName(attachment);
  const typeLabel =
    attachment.kind === "video"
      ? "Video"
      : attachment.contentType.split("/")[1]?.toUpperCase() || "Image";

  return (
    <article className="group min-w-0 overflow-hidden rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/55">
      <button
        type="button"
        className="relative block h-28 w-full overflow-hidden bg-[var(--lp-panel-2)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)] focus-visible:ring-inset"
        onClick={onPreview}
        aria-label={`Preview ${label}`}
      >
        {!failed && attachment.url && attachment.kind === "image" ? (
          <img
            src={attachment.url}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition duration-150 group-hover:scale-[1.02]"
          />
        ) : !failed && attachment.url && attachment.kind === "video" ? (
          <>
            <video
              src={attachment.url}
              muted
              preload="metadata"
              onError={() => setFailed(true)}
              className="h-full w-full bg-black object-cover"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
              <PlayCircle className="h-8 w-8 text-white" />
            </span>
          </>
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-[var(--lp-faint)]">
            <FileImage className="h-6 w-6" />
            <span className="text-[10px]">
              {failed ? "Preview unavailable" : typeLabel}
            </span>
          </span>
        )}
      </button>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-[var(--lp-ink)]">
            {label}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--lp-faint)]">
            {typeLabel} · {formatFileSize(attachment.sizeBytes)}
          </p>
        </div>
        {attachment.url && (
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${label}`}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--lp-line)] text-[var(--lp-faint)] hover:border-[var(--lp-accent)]/45 hover:text-[var(--lp-accent)]"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </article>
  );
}

const RequestWorkspacePage = () => {
  const { requestId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // A "default" key means this entry was loaded directly (deep link, refresh),
  // so there is no in-app page to return to and the queue is the safe landing.
  const cameFromInsideApp = location.key !== "default";
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const user = session?.user;
  const [messageBody, setMessageBody] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [statusVisibility, setStatusVisibility] =
    useState<MessageVisibility>("customer_visible");
  const [engineerId, setEngineerId] = useState("");
  const [contextTab, setContextTab] = useState("details");
  const [activityLimit, setActivityLimit] = useState(5);
  const [showAllAttachments, setShowAllAttachments] = useState(false);
  const [olderMessages, setOlderMessages] = useState<RequestMessage[]>([]);
  const [olderHistory, setOlderHistory] = useState<RequestHistoryEntry[]>([]);
  const [olderMessagesHaveMore, setOlderMessagesHaveMore] = useState<
    boolean | null
  >(null);
  const [olderHistoryHasMore, setOlderHistoryHasMore] = useState<
    boolean | null
  >(null);
  const [previewAttachment, setPreviewAttachment] =
    useState<RequestAttachment | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [editForm, setEditForm] = useState<EditRequestForm>({
    subject: "",
    description: "",
    contactPhone: "",
    siteLocation: "",
    serialNumber: "",
  });
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const pendingAttachments = useAttachmentPicker();

  const detailQuery = useQuery({
    queryKey: ["request", requestId],
    queryFn: () =>
      apiRequest<RequestDetailResponse>(
        `/api/requests/${requestId}?messagesLimit=50&historyLimit=50`,
      ),
    enabled: Boolean(requestId),
  });
  const data = detailQuery.data;

  const actorCanAssign = user ? canAssignRequests(user.role) : false;
  const engineersQuery = useQuery({
    queryKey: ["request-engineers"],
    queryFn: () =>
      apiRequest<Array<Pick<AuthUser, "id" | "displayName" | "email">>>(
        "/api/engineers",
      ),
    enabled: actorCanAssign,
  });
  const engineers = useMemo(
    () => engineersQuery.data ?? [],
    [engineersQuery.data],
  );

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [data?.messages.length, olderMessages.length]);

  useEffect(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) return;
    resizeMessageComposer(textarea);
  }, [messageBody]);

  const refresh = async () => {
    setOlderMessages([]);
    setOlderHistory([]);
    setOlderMessagesHaveMore(null);
    setOlderHistoryHasMore(null);
    await queryClient.invalidateQueries({ queryKey: ["request", requestId] });
    await queryClient.invalidateQueries({ queryKey: ["requests"] });
  };

  const loadOlderMessagesMutation = useMutation({
    mutationFn: () =>
      apiRequest<RequestDetailResponse>(
        `/api/requests/${requestId}?messagesLimit=50&messagesOffset=${
          (data?.messages.length ?? 0) + olderMessages.length
        }&historyLimit=1`,
      ),
    onSuccess: (page) => {
      setOlderMessages((current) => [...page.messages, ...current]);
      setOlderMessagesHaveMore(
        page.pagination?.messages.hasMore ?? false,
      );
    },
    onError: (error: unknown) =>
      toast.error(
        friendlyActionError(error, "Could not load earlier updates."),
      ),
  });

  const loadOlderHistoryMutation = useMutation({
    mutationFn: () =>
      apiRequest<RequestDetailResponse>(
        `/api/requests/${requestId}?messagesLimit=1&historyLimit=50&historyOffset=${
          (data?.history.length ?? 0) + olderHistory.length
        }`,
      ),
    onSuccess: (page) => {
      setOlderHistory((current) => [...page.history, ...current]);
      setOlderHistoryHasMore(page.pagination?.history.hasMore ?? false);
      setActivityLimit((current) => current + page.history.length);
    },
    onError: (error: unknown) =>
      toast.error(
        friendlyActionError(error, "Could not load older activity."),
      ),
  });

  const messageMutation = useMutation({
    mutationFn: async () => {
      setMessageError(null);

      // The conversation composer only sends customer-visible replies;
      // internal notes are written from the Workflow status note.
      const sentMessage = await apiRequest<RequestMessage>(
        `/api/requests/${requestId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            body: messageBody.trim(),
            visibility: "customer_visible",
          }),
        },
      );

      const failedUploads: string[] = [];
      for (const picked of pendingAttachments.files) {
        try {
          await uploadRequestAttachment(requestId, picked.file, {
            visibility: "customer_visible",
            messageId: sentMessage.id,
          });
        } catch {
          failedUploads.push(picked.file.name);
        }
      }
      return failedUploads;
    },
    onSuccess: async (failedUploads) => {
      setMessageBody("");
      pendingAttachments.files.forEach((picked) =>
        pendingAttachments.remove(picked.key),
      );
      if (failedUploads.length) {
        toast.warning(
          `Update sent. ${failedUploads.length} attachment${
            failedUploads.length === 1 ? "" : "s"
          } could not be uploaded.`,
        );
      } else {
        toast.success("Update sent.");
      }
      await refresh();
    },
    onError: (error: unknown) => {
      const message = friendlyActionError(
        error,
        "The update could not be sent. Your draft is still here.",
      );
      setMessageError(message);
      toast.error(message);
    },
  });

  const claimMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/requests/${requestId}/claim`, { method: "POST" }),
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
          400: "That status change is not allowed from the current state.",
          403: "You do not have permission to change this request.",
          409: "This request changed elsewhere. Refresh and try again.",
        }),
      );
      await refresh();
    },
  });

  const assignMutation = useMutation({
    mutationFn: (nextEngineerId: string) =>
      apiRequest(`/api/requests/${requestId}/assign`, {
        method: "POST",
        body: JSON.stringify({ engineerId: nextEngineerId }),
      }),
    onSuccess: async () => {
      setEngineerId("");
      toast.success(
        data?.request.assignedEngineerId
          ? "Engineer reassigned."
          : "Engineer assigned.",
      );
      await refresh();
    },
    onError: (error: unknown) =>
      toast.error(
        friendlyActionError(error, "Could not assign this engineer.", {
          400: "That account cannot be assigned as an engineer.",
          403: "You do not have permission to assign this request.",
        }),
      ),
  });

  const editMutation = useMutation({
    mutationFn: () => {
      const isStaffEditor = Boolean(user && user.role !== "customer");
      return apiRequest<ServiceRequest>(`/api/requests/${requestId}`, {
        method: "PATCH",
        body: JSON.stringify({
          subject: editForm.subject,
          description: editForm.description,
          contactPhone: editForm.contactPhone,
          siteLocation: editForm.siteLocation,
          ...(isStaffEditor
            ? { serialNumber: editForm.serialNumber.trim() || null }
            : {}),
        }),
      });
    },
    onSuccess: async () => {
      setIsEditOpen(false);
      toast.success("Request details updated.");
      await refresh();
    },
    onError: (error: unknown) =>
      toast.error(
        friendlyActionError(error, "Could not save request changes.", {
          403: "You do not have permission to edit this request.",
          404: "This request no longer exists.",
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
    onError: (error: unknown) =>
      toast.error(
        friendlyActionError(error, "Could not cancel this request.", {
          400: "This request can no longer be cancelled.",
          403: "You do not have permission to cancel this request.",
        }),
      ),
  });

  if (detailQuery.isLoading) {
    return (
      <div
        className={cn(PAGE_CONTAINER, "animate-pulse")}
        aria-label="Loading request"
      >
        <div className="h-10 w-36 rounded-full bg-[var(--lp-panel-2)]" />
        <div className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel)] p-5">
          <div className="h-4 w-40 rounded bg-[var(--lp-panel-2)]" />
          <div className="mt-3 h-8 w-2/3 rounded bg-[var(--lp-panel-2)]" />
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-12 rounded-xl bg-[var(--lp-panel-2)]"
              />
            ))}
          </div>
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(350px,0.42fr)]">
          <div className="h-[520px] rounded-2xl bg-[var(--lp-panel)]" />
          <div className="h-[520px] rounded-2xl bg-[var(--lp-panel)]" />
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !data) {
    return (
      <div
        className={cn(
          "mx-auto max-w-3xl rounded-2xl p-6 text-sm",
          cardSurface,
        )}
      >
        <p className="font-semibold text-[var(--lp-ink)]">
          Could not load this request.
        </p>
        <p className="mt-1 text-[var(--lp-ink-soft)]">
          Check your connection and try again.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)]"
          onClick={() => detailQuery.refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  const request = data.request;
  const allMessages = Array.from(
    new Map(
      [...olderMessages, ...data.messages].map((message) => [
        message.id,
        message,
      ]),
    ).values(),
  );
  // Internal notes are recorded via the audit trail (Activity tab); the
  // Conversation thread only shows customer-facing traffic.
  const visibleMessages = allMessages.filter(
    (message) => message.visibility !== "internal_note",
  );
  const allHistory = Array.from(
    new Map(
      [...olderHistory, ...data.history].map((entry) => [entry.id, entry]),
    ).values(),
  );
  const messagesHaveMore =
    olderMessagesHaveMore ?? data.pagination?.messages.hasMore ?? false;
  const historyHasMore =
    olderHistoryHasMore ?? data.pagination?.history.hasMore ?? false;
  const isStaff = Boolean(user && user.role !== "customer");
  const canManageWorkflow =
    user?.role === "engineer" || user?.role === "admin";
  const allowedStatuses = getAllowedStatuses(request, user);
  const assignedToMe =
    Boolean(user?.id) && request.assignedEngineerId === user?.id;
  const assignedEngineerName = request.assignedEngineerId
    ? data.assignedEngineer?.displayName ||
      data.assignedEngineer?.email ||
      engineers.find((engineer) => engineer.id === request.assignedEngineerId)
        ?.displayName ||
      "Assigned engineer"
    : "Unassigned";
  const canClaim =
    canManageWorkflow &&
    request.status !== "closed" &&
    !request.assignedEngineerId;
  const canEditRequest = canEditRequestDetails(request, user);
  const canCustomerCancel =
    user?.role === "customer" &&
    request.customerId === user.id &&
    ["new", "triaged", "waiting_for_customer"].includes(request.status);
  const canOpenCustomerActivity =
    Boolean(user) && canViewCustomerActivity(user.role);
  const canOpenMachineProfile =
    Boolean(user) && canManageOperational(user.role);
  // Links into the per-staff activity page, so it follows People Activity
  // access (owner is excluded) rather than customer-activity access.
  const canOpenEngineerActivity =
    Boolean(
      user &&
        request.assignedEngineerId &&
        (canAccessPeopleActivity(user.role) ||
          (user.role === "engineer" && assignedToMe)),
    );
  const sortedHistory = [...allHistory].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const visibleHistory = sortedHistory.slice(0, activityLimit);
  const attachments = data.attachments ?? [];
  const visibleAttachments = showAllAttachments
    ? attachments
    : attachments.slice(0, 12);
  const attachmentsByMessage = new Map<string, RequestAttachment[]>();
  for (const attachment of attachments) {
    let messageId = attachment.messageId ?? null;

    // Older attachment rows predate the explicit message projection. Keep
    // them useful by pairing them with the closest preceding public update
    // from the same author inside the upload window used by the service.
    if (!messageId) {
      const attachmentTime = new Date(attachment.createdAt).getTime();
      const matchingMessage = [...allMessages]
        .reverse()
        .find((message) => {
          const messageTime = new Date(message.createdAt).getTime();
          return (
            message.visibility === "customer_visible" &&
            message.authorId === attachment.uploadedBy &&
            messageTime <= attachmentTime &&
            attachmentTime - messageTime <= 15 * 60 * 1000
          );
        });
      messageId = matchingMessage?.id ?? null;
    }

    if (messageId) {
      attachmentsByMessage.set(messageId, [
        ...(attachmentsByMessage.get(messageId) ?? []),
        attachment,
      ]);
    }
  }

  const participantName = (id: string) => {
    if (id === request.assignedEngineerId) return assignedEngineerName;
    return (
      engineers.find((engineer) => engineer.id === id)?.displayName ?? null
    );
  };

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

  const focusWorkflow = () => {
    setContextTab("workflow");
    requestAnimationFrame(() =>
      document
        .getElementById("request-context")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  };

  const submitStatus = (nextStatus: RequestStatus) => {
    const isReopen =
      nextStatus === "new" &&
      (request.status === "resolved" || request.status === "closed");
    if (nextStatus === "closed" || isReopen) {
      setConfirmAction({ type: "status", nextStatus });
      return;
    }
    statusMutation.mutate({
      nextStatus,
      note: statusNote.trim(),
      noteVisibility: statusVisibility,
    });
  };

  const confirmActionTitle =
    confirmAction?.type === "assignment"
      ? request.assignedEngineerId
        ? "Reassign this request?"
        : "Assign this request?"
      : confirmAction?.type === "cancel-request"
        ? "Cancel this request?"
        : confirmAction?.type === "status" &&
            confirmAction.nextStatus === "new"
          ? "Reopen this request?"
          : "Archive this request?";

  const confirmActionDescription =
    confirmAction?.type === "assignment"
      ? `Responsibility will move to ${
          engineers.find(
            (engineer) => engineer.id === confirmAction.engineerId,
          )?.displayName ?? "the selected engineer"
        }.`
      : confirmAction?.type === "cancel-request"
        ? "The request leaves active lists, but its conversation, attachments, and audit history are kept."
        : confirmAction?.type === "status" &&
            confirmAction.nextStatus === "new"
          ? "The request will return to the active workflow for another review."
          : "The request leaves active lists, but its conversation, attachments, and audit history are kept.";

  const runConfirmedAction = () => {
    if (!confirmAction) return;
    if (confirmAction.type === "assignment") {
      assignMutation.mutate(confirmAction.engineerId);
    } else if (confirmAction.type === "cancel-request") {
      cancelMutation.mutate();
    } else {
      statusMutation.mutate({
        nextStatus: confirmAction.nextStatus,
        note: statusNote.trim(),
        noteVisibility: statusVisibility,
      });
    }
    setConfirmAction(null);
  };

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    if (messageBody.trim() && !messageMutation.isPending) {
      messageMutation.mutate();
    }
  };

  return (
    <div
      className={cn(
        PAGE_CONTAINER,
        "max-w-none overflow-x-hidden 2xl:px-7",
      )}
    >
      <Button
        type="button"
        variant="outline"
        className="h-10 w-fit rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-4 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
        onClick={() =>
          cameFromInsideApp ? navigate(-1) : navigate("/app/requests")
        }
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <header
        data-testid="request-workspace-header"
        className={cn(
          "relative overflow-hidden rounded-2xl px-4 py-4 sm:px-5",
          cardSurface,
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.12]"
          style={{
            maskImage: "linear-gradient(to right, black, transparent 68%)",
            WebkitMaskImage:
              "linear-gradient(to right, black, transparent 68%)",
          }}
        />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="lp-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--lp-faint)]">
                {request.requestNumber}
              </span>
              <StatusBadge status={request.status} />
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.13em]",
                  priorityClass[request.priority] ?? priorityClass.normal,
                )}
              >
                {request.priority}
              </span>
            </div>
            <h1 className="lp-display mt-2 text-xl font-bold leading-tight text-[var(--lp-ink)] sm:text-2xl">
              {request.subject}
            </h1>
            <p className="mt-1 max-w-4xl break-words whitespace-pre-wrap text-sm leading-5 text-[var(--lp-ink-soft)]">
              {request.description}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {canEditRequest && (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-3 text-xs font-semibold text-[var(--lp-ink)]"
                onClick={openEditDialog}
              >
                <PencilLine className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {canClaim && (
              <Button
                type="button"
                className="h-9 rounded-full bg-[var(--lp-accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--lp-accent-2)]"
                onClick={() => claimMutation.mutate()}
                disabled={claimMutation.isPending}
              >
                {claimMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
                Claim request
              </Button>
            )}
            {actorCanAssign && (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-3 text-xs font-semibold text-[var(--lp-ink)]"
                onClick={focusWorkflow}
              >
                <UserRound className="h-3.5 w-3.5" />
                {request.assignedEngineerId ? "Reassign" : "Assign"}
              </Button>
            )}
            {canManageWorkflow && allowedStatuses.length > 0 && (
              <Button
                type="button"
                className="h-9 rounded-full bg-[var(--lp-accent)] px-3 text-xs font-semibold text-white hover:bg-[var(--lp-accent-2)]"
                onClick={focusWorkflow}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Update status
              </Button>
            )}
          </div>
        </div>

        <dl className="relative mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--lp-line)] pt-3 md:grid-cols-4 2xl:grid-cols-6">
          <MetaItem
            label="Status"
            value={getRequestStatusLabel(request.status)}
          />
          <MetaItem
            label="Machine / product"
            value={
              canOpenMachineProfile ? (
                <Link
                  to={`/app/machines/${request.customerId}`}
                  className="underline-offset-4 hover:text-[var(--lp-accent)] hover:underline"
                >
                  {data.machine?.displayLabel ||
                    request.productSnapshot.name}
                </Link>
              ) : (
                data.machine?.displayLabel || request.productSnapshot.name
              )
            }
          />
          <MetaItem
            label="Assigned engineer"
            icon={UserRound}
            value={
              request.assignedEngineerId && canOpenEngineerActivity ? (
                <Link
                  to={`/app/activity/${request.assignedEngineerId}`}
                  className="underline-offset-4 hover:text-[var(--lp-accent)] hover:underline"
                >
                  {assignedToMe ? "You" : assignedEngineerName}
                </Link>
              ) : request.assignedEngineerId ? (
                assignedToMe ? (
                  "You"
                ) : (
                  assignedEngineerName
                )
              ) : (
                <span className="text-[var(--lp-faint)]">Unassigned</span>
              )
            }
          />
          <MetaItem
            label="Created"
            icon={CalendarDays}
            value={fmtDateTime(request.createdAt)}
          />
          <MetaItem
            label="Updated"
            value={fmtDateTime(request.updatedAt || request.createdAt)}
          />
          <MetaItem
            label="Priority"
            value={<span className="capitalize">{request.priority}</span>}
          />
        </dl>
      </header>

      <main
        data-testid="request-workspace-layout"
        className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.44fr)] 2xl:grid-cols-[minmax(0,1.35fr)_minmax(400px,0.5fr)]"
      >
        <section
          aria-labelledby="conversation-heading"
          className={cn(
            "flex min-w-0 self-start flex-col overflow-hidden rounded-2xl xl:h-[720px] xl:max-h-[calc(100vh-8rem)]",
            cardSurface,
          )}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--lp-line)] px-4 py-3 sm:px-5">
            <MessageSquare className="h-4 w-4 text-[var(--lp-accent)]" />
            <h2
              id="conversation-heading"
              className="lp-display text-base font-semibold text-[var(--lp-ink)]"
            >
              Conversation
            </h2>
            <span className="lp-mono text-[9px] uppercase tracking-[0.16em] text-[var(--lp-faint)]">
              {visibleMessages.length} update
              {visibleMessages.length === 1 ? "" : "s"}
            </span>
          </div>

          <div
            className={cn(
              "min-w-0 bg-[var(--lp-panel-2)]/25 px-3 py-3 sm:px-5 xl:min-h-0 xl:flex-1 xl:max-h-none",
              visibleMessages.length
                ? "max-h-[clamp(360px,64vh,760px)] overflow-y-auto"
                : "min-h-[128px]",
            )}
            role="log"
            aria-live="polite"
            aria-label="Request conversation"
          >
            {visibleMessages.length === 0 ? (
              <div className="flex min-h-[104px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--lp-line)] px-4 py-5 text-center">
                <MessageSquare className="h-5 w-5 text-[var(--lp-accent)]" />
                <p className="mt-2 text-sm font-medium text-[var(--lp-ink)]">
                  No updates yet
                </p>
                <p className="mt-0.5 text-xs text-[var(--lp-faint)]">
                  Start the conversation with a clear service update below.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messagesHaveMore && (
                  <div className="flex justify-center pb-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)] px-3 text-[11px]"
                      onClick={() => loadOlderMessagesMutation.mutate()}
                      disabled={loadOlderMessagesMutation.isPending}
                    >
                      {loadOlderMessagesMutation.isPending && (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      )}
                      Load earlier updates
                    </Button>
                  </div>
                )}
                {visibleMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isStaff={isStaff}
                    isMine={message.authorId === user?.id}
                    attachments={attachmentsByMessage.get(message.id) ?? []}
                    onPreviewAttachment={setPreviewAttachment}
                  />
                ))}
                <div ref={conversationEndRef} aria-hidden="true" />
              </div>
            )}
          </div>

          <form
            className="border-t border-[var(--lp-line)] bg-[var(--lp-panel)] p-3 sm:p-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (messageBody.trim()) messageMutation.mutate();
            }}
          >
            <div className="rounded-[28px] border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] p-2 shadow-sm transition-[border-color,box-shadow] focus-within:border-[var(--lp-accent)]/65 focus-within:shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus-within:ring-2 focus-within:ring-[var(--lp-accent)]/15">
              <div className="flex min-w-0 items-end gap-1.5">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(event) => {
                    pendingAttachments.add(event.target.files);
                    event.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Attach files"
                  title="Attach files"
                  className="h-10 w-10 shrink-0 rounded-full text-[var(--lp-ink-soft)] hover:bg-[var(--lp-panel-2)] hover:text-[var(--lp-accent)]"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={messageMutation.isPending}
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </Button>

                <Textarea
                  ref={composerTextareaRef}
                  required
                  rows={1}
                  value={messageBody}
                  onChange={(event) => {
                    setMessageBody(event.target.value);
                    if (messageError) setMessageError(null);
                  }}
                  onInput={(event) =>
                    resizeMessageComposer(event.currentTarget)
                  }
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Message the customer…"
                  aria-label="Message"
                  data-testid="auto-growing-composer"
                  className="max-h-[160px] min-h-[42px] resize-none overflow-y-hidden border-0 bg-transparent px-2 py-2.5 text-sm leading-5 text-[var(--lp-ink)] shadow-none placeholder:text-[var(--lp-faint)] focus-visible:ring-0 focus-visible:ring-offset-0"
                />

                <Button
                  type="submit"
                  size="icon"
                  aria-label={
                    messageMutation.isPending ? "Sending…" : "Send update"
                  }
                  title="Send update (Enter)"
                  className="h-10 w-10 shrink-0 rounded-full bg-[var(--lp-accent)] text-white shadow-sm hover:bg-[var(--lp-accent-2)]"
                  disabled={
                    messageMutation.isPending || !messageBody.trim()
                  }
                >
                  {messageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {pendingAttachments.files.length > 0 && (
                <ul className="mx-10 mt-1.5 flex flex-wrap gap-2 border-t border-[var(--lp-line)] px-1 pt-2">
                  {pendingAttachments.files.map((picked) => (
                    <li
                      key={picked.key}
                      className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel)] px-2 py-1.5"
                    >
                      <button
                        type="button"
                        aria-label={`Preview selected ${picked.file.name}`}
                        className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lp-accent)]"
                        onClick={() =>
                          setPreviewAttachment({
                            id: picked.key,
                            requestId,
                            messageId: null,
                            uploadedBy: user?.id ?? "",
                            fileName: picked.file.name,
                            contentType: picked.file.type,
                            sizeBytes: picked.file.size,
                            kind: picked.file.type.startsWith("video/")
                              ? "video"
                              : "image",
                            url: picked.previewUrl ?? "",
                            createdAt: new Date().toISOString(),
                          })
                        }
                      >
                        {picked.previewUrl &&
                        picked.file.type.startsWith("image/") ? (
                          <img
                            src={picked.previewUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : picked.previewUrl ? (
                          <>
                            <video
                              src={picked.previewUrl}
                              muted
                              preload="metadata"
                              className="h-full w-full bg-black object-cover"
                            />
                            <PlayCircle className="absolute inset-0 m-auto h-5 w-5 text-white" />
                          </>
                        ) : (
                          <FileImage className="absolute inset-0 m-auto h-4 w-4 text-[var(--lp-accent)]" />
                        )}
                      </button>
                      <span className="max-w-48 truncate text-[11px] text-[var(--lp-ink-soft)]">
                        {picked.file.name}
                      </span>
                      <span className="text-[9px] text-[var(--lp-faint)]">
                        {formatFileSize(picked.file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          pendingAttachments.remove(picked.key)
                        }
                        aria-label={`Remove ${picked.file.name}`}
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[var(--lp-faint)] hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!isStaff && (
              <p className="mt-1.5 px-3 text-[10px] text-[var(--lp-faint)]">
                Visible to the service team
              </p>
            )}

            {messageError && (
              <div
                role="alert"
                className="mt-2 flex items-start gap-2 rounded-lg border border-rose-400/35 bg-rose-400/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{messageError}</span>
              </div>
            )}
          </form>
        </section>

        <aside
          id="request-context"
          data-testid="request-context-panel"
          className={cn(
            "min-w-0 self-start overflow-hidden rounded-2xl",
            cardSurface,
            "xl:sticky xl:top-4",
          )}
        >
          <Tabs value={contextTab} onValueChange={setContextTab}>
            <div className="border-b border-[var(--lp-line)] px-3 pt-3">
              <TabsList
                className={cn(
                  "grid h-auto w-full gap-1 rounded-xl bg-[var(--lp-panel-2)] p-1",
                  isStaff ? "grid-cols-4" : "grid-cols-2",
                )}
              >
                <TabsTrigger
                  value="details"
                  className="rounded-lg px-2 py-2 text-[11px] data-[state=active]:bg-[var(--lp-panel)] data-[state=active]:text-[var(--lp-ink)]"
                >
                  Details
                </TabsTrigger>
                {(canManageWorkflow || actorCanAssign) && (
                  <TabsTrigger
                    value="workflow"
                    className="rounded-lg px-2 py-2 text-[11px] data-[state=active]:bg-[var(--lp-panel)] data-[state=active]:text-[var(--lp-ink)]"
                  >
                    Workflow
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="attachments"
                  className="rounded-lg px-2 py-2 text-[11px] data-[state=active]:bg-[var(--lp-panel)] data-[state=active]:text-[var(--lp-ink)]"
                >
                  Files
                  {attachments.length > 0 && (
                    <span className="ml-1 text-[9px] text-[var(--lp-faint)]">
                      {attachments.length}
                    </span>
                  )}
                </TabsTrigger>
                {isStaff && (
                  <TabsTrigger
                    value="activity"
                    className="rounded-lg px-2 py-2 text-[11px] data-[state=active]:bg-[var(--lp-panel)] data-[state=active]:text-[var(--lp-ink)]"
                  >
                    Activity
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="max-h-none overflow-y-visible p-4 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto">
              <TabsContent value="details" className="m-0">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                      Request details
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[var(--lp-faint)]">
                      Customer, machine, and service context
                    </p>
                  </div>
                  {canEditRequest && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-3 text-[11px]"
                      onClick={openEditDialog}
                    >
                      <PencilLine className="h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  <DetailItem label="Status">
                    {getRequestStatusLabel(request.status)}
                  </DetailItem>
                  <DetailItem label="Priority">
                    <span className="capitalize">{request.priority}</span>
                  </DetailItem>
                  <DetailItem label="Product" wide>
                    {request.productSnapshot.name}
                  </DetailItem>
                  {(data.machine?.displayLabel ||
                    request.customerMachineId) && (
                    <DetailItem label="Machine" wide>
                      {canOpenMachineProfile ? (
                        <Link
                          to={`/app/machines/${request.customerId}`}
                          className="font-medium text-[var(--lp-accent)] hover:underline"
                        >
                          {data.machine?.displayLabel ?? "Linked machine"}
                        </Link>
                      ) : (
                        data.machine?.displayLabel ?? "Linked machine"
                      )}
                    </DetailItem>
                  )}
                  {issueTypeLabel(request.issueType) && (
                    <DetailItem label="Issue">
                      {issueTypeLabel(request.issueType)}
                    </DetailItem>
                  )}
                  {isStaff && data.customer && (
                    <DetailItem label="Customer">
                      {canOpenCustomerActivity ? (
                        <Link
                          to={`/app/customer-activity/${request.customerId}`}
                          className="font-medium text-[var(--lp-accent)] hover:underline"
                        >
                          {data.customer.displayName}
                        </Link>
                      ) : (
                        data.customer.displayName
                      )}
                    </DetailItem>
                  )}
                  {isStaff && data.customer?.companyName && (
                    <DetailItem label="Workshop / company" wide>
                      {data.customer.companyName}
                    </DetailItem>
                  )}
                  <DetailItem label="Phone">
                    <a
                      href={`tel:${request.contactPhone}`}
                      className="inline-flex items-center gap-1.5 text-[var(--lp-accent)] hover:underline"
                    >
                      {request.contactPhone}
                    </a>
                  </DetailItem>
                  <DetailItem label="Location" wide>
                    {request.siteLocation}
                  </DetailItem>
                  {isStaff && (
                    <DetailItem label="Serial number" wide>
                      {request.serialNumber || (
                        <span className="text-[var(--lp-faint)]">
                          Not provided
                        </span>
                      )}
                    </DetailItem>
                  )}
                </dl>

                {canCustomerCancel && (
                  <div className="mt-4 border-t border-[var(--lp-line)] pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full rounded-full border-amber-400/40 text-xs font-semibold text-amber-700 hover:bg-amber-400/10 dark:text-amber-300"
                      onClick={() =>
                        setConfirmAction({ type: "cancel-request" })
                      }
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Cancel request
                    </Button>
                  </div>
                )}
              </TabsContent>

              {(canManageWorkflow || actorCanAssign) && (
                <TabsContent value="workflow" className="m-0">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--lp-accent)]" />
                    <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                      Workflow
                    </h2>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--lp-faint)]">
                    {REQUEST_STATUS_DESCRIPTIONS[request.status]}
                  </p>

                  {canManageWorkflow && allowedStatuses.length > 0 && (
                    <div className="mt-4">
                      <label
                        htmlFor="status-note"
                        className="lp-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-faint)]"
                      >
                        Optional status note
                      </label>
                      <div className="mt-1.5 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/45 p-2">
                        <Textarea
                          id="status-note"
                          rows={2}
                          value={statusNote}
                          onChange={(event) =>
                            setStatusNote(event.target.value)
                          }
                          placeholder="Add context for this change…"
                          className="min-h-[58px] resize-y border-0 bg-transparent px-1.5 py-1 text-sm shadow-none focus-visible:ring-0"
                        />
                        <Select
                          value={statusVisibility}
                          onValueChange={(value) =>
                            setStatusVisibility(
                              value as MessageVisibility,
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label="Status note visibility"
                            className={cn(
                              selectTriggerClassName,
                              "mt-1.5 h-8 text-xs",
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={selectContentClassName}>
                            <SelectItem
                              value="customer_visible"
                              className={selectItemClassName}
                            >
                              Customer-visible note
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

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {allowedStatuses.map((nextStatus, index) => {
                          const Icon = workflowIcons[nextStatus];
                          const destructive = nextStatus === "closed";
                          return (
                            <Button
                              key={nextStatus}
                              type="button"
                              variant="outline"
                              className={cn(
                                "h-9 rounded-full px-3 text-[11px] font-semibold",
                                destructive
                                  ? "border-amber-400/40 text-amber-700 hover:bg-amber-400/10 dark:text-amber-300"
                                  : index === 0
                                    ? "border-[var(--lp-accent)]/45 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]"
                                    : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
                              )}
                              onClick={() => submitStatus(nextStatus)}
                              disabled={statusMutation.isPending}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {workflowLabel(
                                request.status,
                                nextStatus as Exclude<
                                  RequestStatus,
                                  "assigned"
                                >,
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {canManageWorkflow &&
                    allowedStatuses.length === 0 &&
                    !canClaim && (
                      <p className="mt-4 rounded-xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/45 px-3 py-2 text-xs text-[var(--lp-ink-soft)]">
                        {request.status === "closed"
                          ? "Only an admin can reopen this archived request."
                          : "No status changes are available right now."}
                      </p>
                    )}

                  {canClaim && (
                    <Button
                      type="button"
                      className="mt-4 h-9 w-full rounded-full bg-[var(--lp-accent)] text-xs font-semibold text-white"
                      onClick={() => claimMutation.mutate()}
                      disabled={claimMutation.isPending}
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Claim request
                    </Button>
                  )}

                  {actorCanAssign && (
                    <div className="mt-5 border-t border-[var(--lp-line)] pt-4">
                      <p className="lp-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-faint)]">
                        {request.assignedEngineerId
                          ? "Choose a new engineer"
                          : "Choose an engineer"}
                      </p>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <Select
                          value={engineerId}
                          onValueChange={setEngineerId}
                        >
                          <SelectTrigger
                            aria-label="Engineer"
                            className={cn(
                              selectTriggerClassName,
                              "min-w-0 flex-1",
                            )}
                          >
                            <SelectValue placeholder="Select engineer" />
                          </SelectTrigger>
                          <SelectContent className={selectContentClassName}>
                            {engineers.map((engineer) => (
                              <SelectItem
                                key={engineer.id}
                                value={engineer.id}
                                disabled={
                                  engineer.id ===
                                  request.assignedEngineerId
                                }
                                className={selectItemClassName}
                              >
                                {engineer.displayName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          className="h-10 rounded-full bg-[var(--lp-accent)] px-4 text-xs font-semibold text-white"
                          disabled={!engineerId || assignMutation.isPending}
                          onClick={() =>
                            setConfirmAction({
                              type: "assignment",
                              engineerId,
                            })
                          }
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {request.assignedEngineerId
                            ? "Reassign"
                            : "Assign"}
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>
              )}

              <TabsContent value="attachments" className="m-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                      Photos &amp; video
                    </h2>
                    <p className="mt-0.5 text-[11px] text-[var(--lp-faint)]">
                      {attachments.length} file
                      {attachments.length === 1 ? "" : "s"} attached
                    </p>
                  </div>
                </div>
                {attachments.length === 0 ? (
                  <div className="mt-3 flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--lp-line)] px-4 text-center">
                    <ImageIcon className="h-5 w-5 text-[var(--lp-accent)]" />
                    <p className="mt-2 text-sm font-medium text-[var(--lp-ink)]">
                      No attachments
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--lp-faint)]">
                      Photos and videos added to this request appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {visibleAttachments.map((attachment) => (
                        <AttachmentTile
                          key={attachment.id}
                          attachment={attachment}
                          onPreview={() =>
                            setPreviewAttachment(attachment)
                          }
                        />
                      ))}
                    </div>
                    {attachments.length > 12 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3 h-9 w-full rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-xs"
                        onClick={() =>
                          setShowAllAttachments((current) => !current)
                        }
                      >
                        {showAllAttachments
                          ? "Show fewer files"
                          : `View all ${attachments.length} files`}
                      </Button>
                    )}
                  </>
                )}
              </TabsContent>

              {isStaff && (
                <TabsContent value="activity" className="m-0">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-[var(--lp-accent)]" />
                    <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">
                      Activity
                    </h2>
                    <span className="lp-mono ml-auto rounded-full border border-[var(--lp-line)] bg-[var(--lp-panel-2)] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--lp-faint)]">
                      {sortedHistory.length} event
                      {sortedHistory.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {sortedHistory.length === 0 ? (
                    <div className="mt-3 rounded-xl border border-dashed border-[var(--lp-line)] px-4 py-6 text-center text-xs text-[var(--lp-faint)]">
                      No activity has been recorded yet.
                    </div>
                  ) : (
                    <>
                      <ol
                        className="relative ml-1.5 mt-4 space-y-4 border-l border-[var(--lp-line)] pl-5"
                        data-testid="request-activity-list"
                      >
                        {visibleHistory.map((entry) => {
                          const presentation = presentRequestHistory(
                            entry,
                            participantName,
                          );
                          return (
                            <li
                              key={entry.id}
                              className="relative"
                              data-testid="request-activity-entry"
                            >
                              <span
                                aria-hidden="true"
                                className="absolute -left-[23px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--lp-panel)] bg-[var(--lp-accent)]"
                              />
                              <p className="text-[13px] font-medium leading-5 text-[var(--lp-ink)]">
                                {presentation.title}
                              </p>
                              {presentation.detail && (
                                <p className="mt-0.5 text-[11px] leading-4 text-[var(--lp-ink-soft)]">
                                  {presentation.detail}
                                </p>
                              )}
                              <p className="mt-1 text-[10px] text-[var(--lp-faint)]">
                                {presentation.actorLabel} ·{" "}
                                {fmtDateTime(entry.createdAt)}
                              </p>
                            </li>
                          );
                        })}
                      </ol>
                      {(sortedHistory.length > 5 || historyHasMore) && (
                        <div className="mt-4 flex flex-col gap-2">
                          {activityLimit <= 5 ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 w-full rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-xs"
                              onClick={() => {
                                if (sortedHistory.length > 5) {
                                  setActivityLimit(sortedHistory.length);
                                } else {
                                  loadOlderHistoryMutation.mutate();
                                }
                              }}
                              disabled={loadOlderHistoryMutation.isPending}
                            >
                              {loadOlderHistoryMutation.isPending && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                              View all activity
                            </Button>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 w-full rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-xs"
                                onClick={() => setActivityLimit(5)}
                              >
                                Collapse activity
                              </Button>
                              {historyHasMore && (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 w-full rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-xs"
                                onClick={() =>
                                  loadOlderHistoryMutation.mutate()
                                }
                                disabled={loadOlderHistoryMutation.isPending}
                              >
                                {loadOlderHistoryMutation.isPending && (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                )}
                                Load older activity
                              </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              )}
            </div>
          </Tabs>
        </aside>
      </main>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!editMutation.isPending) setIsEditOpen(open);
        }}
      >
        <DialogContent className="lp-portal max-h-[min(88vh,760px)] w-[calc(100vw-2rem)] max-w-2xl overflow-hidden rounded-2xl border-[var(--lp-line)] bg-[var(--lp-panel)] p-0 text-[var(--lp-ink)]">
          <DialogHeader className="border-b border-[var(--lp-line)] bg-[var(--lp-panel-2)]/55 px-5 py-4 text-left">
            <DialogTitle className="lp-display text-xl">
              Edit request
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--lp-ink-soft)]">
              Update request details without changing its number, product,
              conversation, or audit history.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex min-h-0 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              editMutation.mutate();
            }}
          >
            <div className="grid gap-4 overflow-y-auto px-5 py-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[var(--lp-ink-soft)]">
                  Subject
                </span>
                <Input
                  required
                  minLength={4}
                  value={editForm.subject}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                  className={fieldClassName}
                />
              </label>
              <label>
                <span className="mb-1 block text-xs font-semibold text-[var(--lp-ink-soft)]">
                  Contact phone
                </span>
                <Input
                  required
                  minLength={7}
                  value={editForm.contactPhone}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      contactPhone: event.target.value,
                    }))
                  }
                  className={fieldClassName}
                />
              </label>
              {isStaff && (
                <label>
                  <span className="mb-1 block text-xs font-semibold text-[var(--lp-ink-soft)]">
                    Serial number
                  </span>
                  <Input
                    value={editForm.serialNumber}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        serialNumber: event.target.value,
                      }))
                    }
                    className={fieldClassName}
                  />
                </label>
              )}
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[var(--lp-ink-soft)]">
                  Site location
                </span>
                <Input
                  required
                  minLength={2}
                  value={editForm.siteLocation}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      siteLocation: event.target.value,
                    }))
                  }
                  className={fieldClassName}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-[var(--lp-ink-soft)]">
                  Description
                </span>
                <Textarea
                  required
                  minLength={10}
                  rows={5}
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={cn(fieldClassName, "min-h-28 resize-y")}
                />
              </label>
            </div>
            <DialogFooter className="border-t border-[var(--lp-line)] bg-[var(--lp-panel-2)]/55 px-5 py-4">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-[var(--lp-line-strong)]"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-full bg-[var(--lp-accent)] text-white"
                disabled={editMutation.isPending}
              >
                {editMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
      >
        <DialogContent className="lp-portal max-h-[92vh] w-[calc(100vw-1rem)] max-w-5xl overflow-hidden rounded-2xl border-[var(--lp-line)] bg-[var(--lp-panel)] p-0 text-[var(--lp-ink)]">
          {previewAttachment && (
            <>
              <DialogHeader className="border-b border-[var(--lp-line)] px-5 py-4 text-left">
                <DialogTitle className="truncate pr-8 text-base">
                  {attachmentDisplayName(previewAttachment)}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--lp-faint)]">
                  {previewAttachment.contentType} ·{" "}
                  {formatFileSize(previewAttachment.sizeBytes)}
                </DialogDescription>
              </DialogHeader>
              <div className="flex max-h-[calc(92vh-9rem)] min-h-64 items-center justify-center overflow-auto bg-black/90 p-3">
                {previewAttachment.kind === "video" ? (
                  <video
                    src={previewAttachment.url || undefined}
                    controls
                    autoPlay
                    className="max-h-[calc(92vh-11rem)] max-w-full"
                  />
                ) : (
                  <img
                    src={previewAttachment.url || undefined}
                    alt={attachmentDisplayName(previewAttachment)}
                    className="max-h-[calc(92vh-11rem)] max-w-full object-contain"
                  />
                )}
              </div>
              {previewAttachment.url && (
                <DialogFooter className="border-t border-[var(--lp-line)] px-5 py-3">
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full border-[var(--lp-line-strong)]"
                  >
                    <a
                      href={previewAttachment.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                    >
                      <Download className="h-4 w-4" />
                      Open or download
                    </a>
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <AlertDialogContent className="lp-portal w-[calc(100vw-2rem)] max-w-md rounded-2xl border-[var(--lp-line)] bg-[var(--lp-panel)] p-0 text-[var(--lp-ink)]">
          <AlertDialogHeader className="space-y-3 px-6 pb-2 pt-6 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/10 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="lp-display text-xl">
              {confirmActionTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-6 text-[var(--lp-ink-soft)]">
              {confirmActionDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-6 pb-5 pt-3">
            <AlertDialogCancel className="mt-0 rounded-full border-[var(--lp-line-strong)] bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full border border-[var(--lp-accent)]/45 bg-[var(--lp-accent)] text-white hover:bg-[var(--lp-accent-2)]"
              onClick={runConfirmedAction}
            >
              {confirmAction?.type === "assignment"
                ? request.assignedEngineerId
                  ? "Reassign"
                  : "Assign"
                : confirmAction?.type === "status" &&
                    confirmAction.nextStatus === "new"
                  ? "Reopen request"
                  : confirmAction?.type === "cancel-request"
                    ? "Cancel request"
                    : "Archive request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RequestWorkspacePage;
