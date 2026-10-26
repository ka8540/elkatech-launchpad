import { describe, expect, it } from "vitest";
import {
  buildReporterReference,
  formatReportNumber,
  isReporterReference,
  normaliseReporterReference,
  REPORTER_REFERENCE_PREFIX,
} from "./report-reference";

const USER_A = "2f1c3d64-0000-4000-8000-000000000000";
const USER_B = "9a8b7c6d-0000-4000-8000-000000000001";

describe("reporter reference", () => {
  it("matches the documented RPT-USR-XXXXXX shape", () => {
    expect(buildReporterReference(USER_A)).toMatch(/^RPT-USR-[0-9A-F]{6}$/);
  });

  it("is deterministic, so repeat reports from one person correlate", () => {
    expect(buildReporterReference(USER_A)).toBe(buildReporterReference(USER_A));
  });

  it("differs between users", () => {
    expect(buildReporterReference(USER_A)).not.toBe(buildReporterReference(USER_B));
  });

  it("never contains the raw user id or any fragment of it", () => {
    const reference = buildReporterReference(USER_A);
    expect(reference).not.toContain(USER_A);
    // Guard against a lazy implementation that slices the uuid instead of
    // hashing it — the first block of the uuid must not appear.
    expect(reference).not.toContain("2f1c3d64");
    expect(reference.length).toBeLessThan(USER_A.length);
  });

  it("recognises a well-formed reference and rejects junk", () => {
    expect(isReporterReference(buildReporterReference(USER_A))).toBe(true);
    expect(isReporterReference("RPT-USR-8F3A2C")).toBe(true);
    // Case-insensitive on input; storage is uppercase.
    expect(isReporterReference("rpt-usr-8f3a2c")).toBe(true);
    expect(isReporterReference("RPT-USR-ZZZZZZ")).toBe(false);
    expect(isReporterReference("RPT-USR-8F3A")).toBe(false);
    expect(isReporterReference(USER_A)).toBe(false);
    expect(isReporterReference("")).toBe(false);
  });

  it("normalises user-typed input to the stored form", () => {
    expect(normaliseReporterReference("  rpt-usr-8f3a2c ")).toBe("RPT-USR-8F3A2C");
  });

  it("uses the documented prefix", () => {
    expect(buildReporterReference(USER_A).startsWith(REPORTER_REFERENCE_PREFIX)).toBe(true);
  });
});

describe("report number", () => {
  it("formats as RPT-YYYY-NNNNNN with zero padding", () => {
    expect(formatReportNumber(2026, 124)).toBe("RPT-2026-000124");
    expect(formatReportNumber(2026, 1)).toBe("RPT-2026-000001");
  });

  it("does not truncate a sequence that outgrows the padding", () => {
    expect(formatReportNumber(2026, 1234567)).toBe("RPT-2026-1234567");
  });
});
