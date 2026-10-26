import type {
  MessageVisibility,
  RequestAttachment,
  RequestStatus,
  Role,
} from "@elkatech/contracts";
import { getRequestStatusLabel } from "@/lib/request-status";

export type RequestHistoryLike = {
  eventType: string;
  actorRole: Role;
  metadata: Record<string, unknown>;
};

export type RequestHistoryPresentation = {
  title: string;
  detail: string | null;
  actorLabel: string;
};

function stringValue(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  return typeof metadata[key] === "string" ? String(metadata[key]) : null;
}

function statusLabel(value: string | null): string | null {
  if (!value) return null;
  return getRequestStatusLabel(value as RequestStatus);
}

function roleLabel(role: Role): string {
  if (role === "customer") return "Customer";
  if (role === "engineer") return "Engineer";
  if (role === "support") return "Support";
  if (role === "owner") return "Owner";
  return "Admin";
}

function humanize(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Turns the request-history allowlist into readable audit copy. The UI never
 * serializes or dumps metadata: it reads only known scalar keys and ignores
 * everything else.
 */
export function presentRequestHistory(
  entry: RequestHistoryLike,
  resolveParticipant: (id: string) => string | null = () => null,
): RequestHistoryPresentation {
  const metadata = entry.metadata ?? {};
  const from = stringValue(metadata, "from");
  const to = stringValue(metadata, "to");
  const engineerId = stringValue(metadata, "engineerId");
  const previousEngineerId = stringValue(metadata, "previousEngineerId");
  const engineerName = engineerId
    ? resolveParticipant(engineerId) ?? "an engineer"
    : "an engineer";
  const previousEngineerName = previousEngineerId
    ? resolveParticipant(previousEngineerId) ?? "the previous engineer"
    : null;
  const visibility = stringValue(metadata, "visibility") as MessageVisibility | null;

  switch (entry.eventType) {
    case "request_created":
      return {
        title: "Created the request",
        detail: null,
        actorLabel: roleLabel(entry.actorRole),
      };
    case "request_updated": {
      const fields = Array.isArray(metadata.fields)
        ? metadata.fields.filter((field): field is string => typeof field === "string")
        : [];
      return {
        title: "Updated request details",
        detail: fields.length ? fields.map(humanize).join(", ") : null,
        actorLabel: roleLabel(entry.actorRole),
      };
    }
    case "request_claimed":
      return {
        title: "Claimed the request",
        detail: null,
        actorLabel: roleLabel(entry.actorRole),
      };
    case "request_assigned":
      return {
        title: `Assigned request to ${engineerName}`,
        detail: null,
        actorLabel: roleLabel(entry.actorRole),
      };
    case "request_reassigned":
      return {
        title: `Reassigned request to ${engineerName}`,
        detail: previousEngineerName ? `Previously assigned to ${previousEngineerName}` : null,
        actorLabel: roleLabel(entry.actorRole),
      };
    case "status_changed":
      return {
        title:
          from && to
            ? `Changed status from ${statusLabel(from)} to ${statusLabel(to)}`
            : "Changed request status",
        detail: null,
        actorLabel: roleLabel(entry.actorRole),
      };
    case "message_added":
      return {
        title:
          visibility === "internal_note"
            ? "Added an internal note"
            : "Added a customer-visible reply",
        detail: null,
        actorLabel: roleLabel(entry.actorRole),
      };
    case "attachment_added": {
      const kind = stringValue(metadata, "kind");
      return {
        title: `Added ${kind === "video" ? "a video" : "an image"} attachment`,
        detail: null,
        actorLabel: roleLabel(entry.actorRole),
      };
    }
    case "request_cancelled":
      return {
        title: "Cancelled the request",
        detail: from ? `Previous status: ${statusLabel(from)}` : null,
        actorLabel: roleLabel(entry.actorRole),
      };
    case "request_archived":
      return {
        title: "Archived the request",
        detail: from ? `Previous status: ${statusLabel(from)}` : null,
        actorLabel: roleLabel(entry.actorRole),
      };
    default:
      return {
        title: humanize(entry.eventType),
        detail: from && to ? `${statusLabel(from)} → ${statusLabel(to)}` : null,
        actorLabel: roleLabel(entry.actorRole),
      };
  }
}

const UUID_LIKE_NAME =
  /^[{(]?[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}[)}]?(?:\.[a-z0-9]+)?$/i;
const OPAQUE_OBJECT_NAME = /^[0-9a-f-]{24,}(?:\.[a-z0-9]+)?$/i;

export function attachmentDisplayName(
  attachment: Pick<
    RequestAttachment,
    "fileName" | "kind" | "contentType" | "createdAt"
  >,
): string {
  const trimmed = attachment.fileName.trim();
  if (
    trimmed &&
    !UUID_LIKE_NAME.test(trimmed) &&
    !OPAQUE_OBJECT_NAME.test(trimmed)
  ) {
    return trimmed;
  }

  const typeLabel = attachment.kind === "video" ? "Video" : "Photo";
  const date = new Date(attachment.createdAt);
  if (Number.isNaN(date.getTime())) return typeLabel;
  return `${typeLabel} · ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

