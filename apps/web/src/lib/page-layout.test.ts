import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PAGE_CONTAINER, PAGE_CONTAINER_READING } from "./page-layout";

const PAGES_DIR = path.join(__dirname, "../pages");

/** Pages rendered inside the portal shell, which must share a left edge. */
const PORTAL_PAGES = [
  "AdminDashboardPage.tsx",
  "RequestsPage.tsx",
  "RequestNewPage.tsx",
  "RequestWorkspacePage.tsx",
  "QueuePage.tsx",
  "PeopleActivityPage.tsx",
  "PersonActivityPage.tsx",
  "CustomerActivityPage.tsx",
  "MachinesPage.tsx",
  "CustomerMachineProfilePage.tsx",
  "UsersPage.tsx",
  "AccountPage.tsx",
];

const read = (f: string) => readFileSync(path.join(PAGES_DIR, f), "utf8");

describe("page containers", () => {
  it("are left-aligned, never auto-centred", () => {
    // `mx-auto` is what made each page start at a different x-position.
    expect(PAGE_CONTAINER).not.toContain("mx-auto");
    expect(PAGE_CONTAINER_READING).not.toContain("mx-auto");
    expect(PAGE_CONTAINER).toContain("w-full");
  });

  it("give console pages the full width and long-form pages a capped measure", () => {
    expect(PAGE_CONTAINER).not.toMatch(/max-w-/);
    expect(PAGE_CONTAINER_READING).toContain("max-w-3xl");
  });

  for (const file of PORTAL_PAGES) {
    it(`${file} uses a shared container`, () => {
      const source = read(file);
      expect(source).toContain('from "@/lib/page-layout"');
      expect(source).toMatch(/PAGE_CONTAINER(_READING)?/);
    });
  }

  it("no portal page re-introduces its own centred root width", () => {
    const offenders = readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith("Page.tsx"))
      .filter((f) => /className="mx-auto (w-full )?max-w-/.test(read(f)));
    expect(offenders).toEqual([]);
  });
});
