import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "RequestsPage.tsx"), "utf8");

describe("RequestsPage pagination", () => {
  it("renders ten request cards per page with icon-only controls", () => {
    expect(source).toContain("const REQUESTS_PAGE_SIZE = 10");
    expect(source).toContain("requests.slice(");
    expect(source).toContain('aria-label="Requests pagination"');
    expect(source).toContain('aria-label="Previous requests page"');
    expect(source).toContain('aria-label="Next requests page"');
    expect(source).toContain("<ChevronLeft");
    expect(source).toContain("<ChevronRight");
  });

  it("preserves the height of a partial final page and resets after filtering", () => {
    expect(source).toContain('key={`request-empty-card-${index}`}');
    expect(source).toContain('aria-hidden="true"');
    expect(source).toContain("Math.max(0, REQUESTS_PAGE_SIZE - pagedRequests.length)");
    expect(source).toContain("setPageIndex(0)");
  });
});
