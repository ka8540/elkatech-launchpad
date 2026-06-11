import { randomUUID } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "./env";

/**
 * Cloudflare R2 storage for service-request attachments (photos/videos).
 *
 * R2 is S3-compatible, so we drive it with the standard AWS S3 client pointed
 * at the R2 endpoint. The browser uploads directly to R2 with a short-lived
 * presigned PUT URL and reads via a presigned GET URL — bytes never flow
 * through our serverless functions (Vercel caps request bodies at ~4.5 MB,
 * far below the 25 MB video limit).
 *
 * Everything degrades cleanly when R2 isn't configured: `isR2Configured()`
 * returns false and the attachment endpoints respond 501 so the rest of the
 * portal keeps working.
 */

let cachedClient: S3Client | null = null;

function r2Endpoint(): string | null {
  const env = getEnv();
  if (env.R2_ENDPOINT) return env.R2_ENDPOINT;
  if (env.R2_ACCOUNT_ID) {
    return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  return null;
}

export function isR2Configured(): boolean {
  const env = getEnv();
  return Boolean(
    env.R2_ACCESS_KEY_ID &&
      env.R2_SECRET_ACCESS_KEY &&
      env.R2_BUCKET_NAME &&
      r2Endpoint(),
  );
}

function getR2Client(): S3Client | null {
  if (!isR2Configured()) return null;
  if (!cachedClient) {
    const env = getEnv();
    cachedClient = new S3Client({
      region: "auto",
      endpoint: r2Endpoint()!,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
      // The AWS SDK (v3.7x+) defaults to adding a CRC32 checksum to PutObject,
      // which leaks x-amz-checksum-crc32 / x-amz-sdk-checksum-algorithm into the
      // presigned URL. R2 doesn't need it and it only complicates the browser
      // PUT, so only attach a checksum when the operation actually requires one.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return cachedClient;
}

/** Maximum allowed attachment size in bytes. */
export function maxAttachmentBytes(): number {
  return getEnv().MAX_REQUEST_ATTACHMENT_MB * 1024 * 1024;
}

/** Allowed upload content types (lowercased), from env. */
export function allowedAttachmentTypes(): string[] {
  return getEnv()
    .ALLOWED_REQUEST_ATTACHMENT_TYPES.split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAttachmentType(contentType: string): boolean {
  return allowedAttachmentTypes().includes(contentType.trim().toLowerCase());
}

/** Map a content type to the coarse attachment kind stored in the DB. */
export function attachmentKindFor(contentType: string): "image" | "video" | null {
  const ct = contentType.trim().toLowerCase();
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("video/")) return "video";
  return null;
}

/** Strip any path components and unsafe characters from a user-supplied
 *  filename so it's safe to embed in an object key. */
function safeFileName(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_");
  const trimmed = cleaned.replace(/^[._-]+/, "").slice(-120);
  return trimmed || "file";
}

/** Build the canonical object key for a request attachment:
 *  service-requests/{requestId}/{uuid}-{safeFilename} */
export function buildAttachmentObjectKey(requestId: string, fileName: string): string {
  return `service-requests/${requestId}/${randomUUID()}-${safeFileName(fileName)}`;
}

/** A presigned PUT the browser uses to upload bytes straight to R2. The PUT
 *  must carry the same Content-Type that was signed. */
export async function presignAttachmentUpload(params: {
  objectKey: string;
  contentType: string;
}): Promise<{ uploadUrl: string; headers: Record<string, string> }> {
  const client = getR2Client();
  const env = getEnv();
  if (!client) throw new Error("R2 is not configured.");

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME!,
    Key: params.objectKey,
    ContentType: params.contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 600 });
  return { uploadUrl, headers: { "Content-Type": params.contentType } };
}

/** A read URL for an attachment. Uses the public base URL when the bucket is
 *  intentionally public, otherwise a short-lived signed GET URL. */
export async function attachmentReadUrl(params: {
  objectKey: string;
  fileName?: string;
}): Promise<string> {
  const env = getEnv();
  if (env.R2_PUBLIC_BASE_URL) {
    return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${params.objectKey}`;
  }
  const client = getR2Client();
  if (!client) throw new Error("R2 is not configured.");
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME!,
    Key: params.objectKey,
    ResponseContentDisposition: params.fileName
      ? `inline; filename="${safeFileName(params.fileName)}"`
      : undefined,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}
