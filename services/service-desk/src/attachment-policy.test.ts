import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");

function routeSource(start: string, end: string) {
  const route = source.slice(source.indexOf(start));
  return route.slice(0, route.indexOf(end));
}

describe("request attachment policy", () => {
  it("rejects internal-note uploads before issuing a storage target", () => {
    const presignRoute = routeSource(
      'app.post("/requests/:requestId/attachments/presign"',
      '// Step 2: persist the metadata',
    );

    expect(presignRoute).toContain(
      'if (input.visibility === "internal_note")',
    );
    expect(presignRoute).toContain(
      "Attachments are not allowed on internal notes.",
    );
    expect(presignRoute.indexOf("internal_note")).toBeLessThan(
      presignRoute.indexOf("presignAttachmentUpload"),
    );
  });

  it("rejects internal-note confirmation and validates the public message link", () => {
    const confirmRoute = routeSource(
      'app.post("/requests/:requestId/attachments"',
      'app.get("/requests/:requestId/attachments"',
    );

    expect(confirmRoute).toContain(
      'if (input.visibility === "internal_note")',
    );
    expect(confirmRoute).toContain("and visibility = 'customer_visible'");
    expect(confirmRoute).toContain("Attachment message is invalid.");
  });
});
