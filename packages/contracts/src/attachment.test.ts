import { describe, expect, it } from "vitest";
import {
  confirmAttachmentInputSchema,
  presignAttachmentInputSchema,
  requestAttachmentSchema,
} from "./index";

const baseFile = {
  fileName: "evidence.png",
  contentType: "image/png",
  sizeBytes: 1_024,
};

describe("request attachment conversation metadata", () => {
  it("defaults request-level uploads to customer-visible context", () => {
    expect(presignAttachmentInputSchema.parse(baseFile).visibility).toBe(
      "customer_visible",
    );
    expect(
      confirmAttachmentInputSchema.parse({
        ...baseFile,
        objectKey: "service-requests/request/evidence.png",
      }).visibility,
    ).toBe("customer_visible");
  });

  it("projects the matching conversation message when available", () => {
    const parsed = requestAttachmentSchema.parse({
      id: "attachment-1",
      requestId: "request-1",
      messageId: "message-1",
      uploadedBy: "user-1",
      fileName: "evidence.png",
      contentType: "image/png",
      sizeBytes: 1_024,
      kind: "image",
      url: "https://example.test/evidence.png",
      createdAt: "2026-07-26T18:00:00.000Z",
    });

    expect(parsed.messageId).toBe("message-1");
  });
});
