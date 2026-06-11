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

  const putResponse = await fetch(ticket.uploadUrl, {
    method: "PUT",
    headers: ticket.headers,
    body: file,
  });
  if (!putResponse.ok) {
    throw new Error(`Upload failed for ${file.name}`);
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
