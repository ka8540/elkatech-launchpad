import { describe, expect, it } from "vitest";
import {
  attachmentDisplayName,
  presentRequestHistory,
} from "./request-detail";

describe("presentRequestHistory", () => {
  it("turns status metadata into a readable event", () => {
    expect(
      presentRequestHistory({
        eventType: "status_changed",
        actorRole: "engineer",
        metadata: { from: "in_progress", to: "resolved" },
      }),
    ).toEqual({
      title: "Changed status from In Progress to Resolved",
      detail: null,
      actorLabel: "Engineer",
    });
  });

  it("distinguishes an internal note from a customer-visible reply", () => {
    const internal = presentRequestHistory({
      eventType: "message_added",
      actorRole: "support",
      metadata: { visibility: "internal_note" },
    });
    const visible = presentRequestHistory({
      eventType: "message_added",
      actorRole: "admin",
      metadata: { visibility: "customer_visible" },
    });

    expect(internal.title).toBe("Added an internal note");
    expect(visible.title).toBe("Added a customer-visible reply");
  });

  it("resolves assignment names without rendering arbitrary metadata", () => {
    const result = presentRequestHistory(
      {
        eventType: "request_reassigned",
        actorRole: "admin",
        metadata: {
          engineerId: "eng-2",
          previousEngineerId: "eng-1",
          unsafeInternalPayload: "<script>alert('x')</script>",
        },
      },
      (id) => ({ "eng-1": "Alex", "eng-2": "Priya" })[id] ?? null,
    );

    expect(result.title).toBe("Reassigned request to Priya");
    expect(result.detail).toBe("Previously assigned to Alex");
    expect(JSON.stringify(result)).not.toContain("unsafeInternalPayload");
    expect(JSON.stringify(result)).not.toContain("<script>");
  });
});

describe("attachmentDisplayName", () => {
  it("keeps a readable uploaded filename", () => {
    expect(
      attachmentDisplayName({
        fileName: "ink-leak-front-panel.jpg",
        kind: "image",
        contentType: "image/jpeg",
        createdAt: "2026-07-25T12:00:00.000Z",
      }),
    ).toBe("ink-leak-front-panel.jpg");
  });

  it("replaces UUID object names with a useful type and date label", () => {
    expect(
      attachmentDisplayName({
        fileName: "694f452c-cc4f-493e-aad5-40fa2b2cf111.jpg",
        kind: "image",
        contentType: "image/jpeg",
        createdAt: "2026-07-25T12:00:00.000Z",
      }),
    ).toMatch(/^Photo · /);
  });
});
