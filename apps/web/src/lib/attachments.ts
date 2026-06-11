import type { AttachmentUploadTicket, RequestAttachment } from "@elkatech/contracts";
import { apiRequest } from "./api";

/**
 * Upload one file as a request attachment:
 *   1. ask the gateway for a presigned R2 target,
 *   2. PUT the bytes straight to R2 (never through our functions),
 *   3. persist the metadata so it shows on the request.
 */
export async function uploadRequestAttachment(
  requestId: string,
  file: File,
): Promise<RequestAttachment> {
  const ticket = await apiRequest<AttachmentUploadTicket>(
    `/api/requests/${requestId}/attachments/presign`,
    {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    },
  );

  // Direct-to-R2 PUT — plain fetch, NO cookies/CSRF/Authorization. The only
  // header is the signed Content-Type.
  let putResponse: Response;
  try {
    putResponse = await fetch(ticket.uploadUrl, {
      method: "PUT",
      headers: ticket.headers,
      body: file,
    });
  } catch (error) {
    // A CORS block or network failure rejects before any status is available.
    // Surface the real cause for debugging rather than a generic message.
    // eslint-disable-next-line no-console
    console.error(`Attachment upload to storage failed for ${file.name}:`, error);
    throw new Error(
      `Could not upload ${file.name}. The storage bucket may need CORS configured for this site.`,
    );
  }
  if (!putResponse.ok) {
    const detail = await putResponse.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error(
      `Attachment upload to storage failed for ${file.name}: ${putResponse.status} ${putResponse.statusText}`,
      detail.slice(0, 300),
    );
    throw new Error(`Could not upload ${file.name} (HTTP ${putResponse.status}).`);
  }

  return apiRequest<RequestAttachment>(`/api/requests/${requestId}/attachments`, {
    method: "POST",
    body: JSON.stringify({
      objectKey: ticket.objectKey,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
