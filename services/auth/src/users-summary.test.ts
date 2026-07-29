import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "index.ts"), "utf8");
const summaryRoute = source.slice(
  source.indexOf('app.get("/internal/users/summary"'),
);

describe("user summary classification", () => {
  it("keeps Admin in total only, outside every approval-status bucket", () => {
    expect(summaryRoute).toContain(
      "role <> 'admin' and approval_status = 'pending_approval'",
    );
    expect(summaryRoute).toContain(
      "role <> 'admin' and approval_status = 'approved'",
    );
    expect(summaryRoute).toContain(
      "role <> 'admin' and approval_status = 'rejected'",
    );
    expect(summaryRoute).toContain(
      "role <> 'admin' and approval_status = 'suspended'",
    );
    expect(summaryRoute).toContain("count(*)");
  });
});
