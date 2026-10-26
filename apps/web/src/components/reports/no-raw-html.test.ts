import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Standing guard for the issue-reports feature.
 *
 * Every field on a report is free text a customer typed, and the whole surface
 * relies on React escaping it. One `dangerouslySetInnerHTML` — added later, in
 * good faith, to render a line break or some markdown — would turn every
 * report into a stored-XSS vector aimed squarely at staff. This test fails the
 * moment one appears, rather than waiting for a review to catch it.
 */

const COMPONENT_DIR = path.join(__dirname);
const PAGES_DIR = path.resolve(__dirname, "../../pages");

const REPORT_PAGES = [
  "ReportsPage.tsx",
  "ReportDetailPage.tsx",
  "ReportNewPage.tsx",
  "MyReportsPage.tsx",
  "MyReportDetailPage.tsx",
];

/**
 * Strip comments before scanning. Several of these files *discuss* the rule in
 * a comment, and a guard that trips on prose gets deleted the first time it
 * cries wolf. Stripping (rather than matching the `attr={` form) also means a
 * real usage cannot hide behind a comment-looking line.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function reportSourceFiles(): Array<{ name: string; source: string }> {
  const componentFiles = readdirSync(COMPONENT_DIR)
    .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"))
    .map((file) => ({
      name: `components/reports/${file}`,
      source: stripComments(readFileSync(path.join(COMPONENT_DIR, file), "utf8")),
    }));

  const pageFiles = REPORT_PAGES.map((file) => ({
    name: `pages/${file}`,
    source: stripComments(readFileSync(path.join(PAGES_DIR, file), "utf8")),
  }));

  return [...componentFiles, ...pageFiles];
}

describe("issue reports never render submitted text as HTML", () => {
  it("covers every report component and page", () => {
    const files = reportSourceFiles();
    // Guards against the list silently going stale if a page is renamed.
    expect(files.length).toBeGreaterThanOrEqual(REPORT_PAGES.length + 4);
  });

  it("contains no dangerouslySetInnerHTML anywhere", () => {
    const offenders = reportSourceFiles()
      .filter((file) => file.source.includes("dangerouslySetInnerHTML"))
      .map((file) => file.name);
    expect(offenders).toEqual([]);
  });

  it("contains no innerHTML assignment or document.write", () => {
    const offenders = reportSourceFiles()
      .filter(
        (file) => /\.innerHTML\s*=/.test(file.source) || file.source.includes("document.write"),
      )
      .map((file) => file.name);
    expect(offenders).toEqual([]);
  });
});
