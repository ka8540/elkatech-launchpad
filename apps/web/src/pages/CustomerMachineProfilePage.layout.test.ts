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
});
