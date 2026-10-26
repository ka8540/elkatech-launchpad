import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(__dirname, "CustomerMachineProfilePage.tsx"),
  "utf8",
);

describe("Customer machine profile metric alignment", () => {
  it("reserves equal label and value rows across every metric card", () => {
    expect(source).toContain(
      'className="lp-mono min-h-8 break-words text-[10px]',
    );
    expect(source).toContain(
      '"mt-2 flex min-h-8 min-w-0 items-center break-words',
    );
  });

  it("returns to the recorded source instead of always linking to Customer Machines", () => {
    expect(source).toContain(
      "customerMachineProfileReturnTo(location.state)",
    );
    expect(source).toContain("to={backTo}");
    expect(source).not.toContain("Back to Customer Machines");
  });

  it("renders only the current machine page with icon-only pagination controls", () => {
    expect(source).toContain("paginatedMachines.items.map");
    expect(source).toContain("paginatedMachines.emptySlots");
    expect(source).toContain('aria-label="Previous machines page"');
    expect(source).toContain('aria-label="Next machines page"');
    expect(source).toContain("<ChevronLeft");
    expect(source).toContain("<ChevronRight");
  });

  it("keeps the desktop machine list free of notebook-style row dividers", () => {
    expect(source).toContain('<tr className="text-left">');
    expect(source).toContain(
      'className="h-[76px] cursor-pointer align-middle transition-colors',
    );
    expect(source).toContain('className="h-[76px]"');
  });

  it("paginates related requests with the same fixed-height chevron controls", () => {
    expect(source).toContain("paginatedRequests.items.map");
    expect(source).toContain("paginatedRequests.emptySlots");
    expect(source).toContain(
      'aria-label="Related service requests pagination"',
    );
    expect(source).toContain('aria-label="Previous requests page"');
    expect(source).toContain('aria-label="Next requests page"');
    expect(source).not.toContain("relatedRequests.slice(0, 12)");
  });
});
