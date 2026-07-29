import { createHmac } from "node:crypto";
import { getEnv } from "@elkatech/config";

/**
 * Privacy-safe reporter reference: RPT-USR-8F3A2C.
 *
 * A keyed digest of the internal user id, never the id itself. Deterministic
 * on purpose — the same customer always maps to the same reference, so staff
 * can see that one reference has filed four attachment reports this week
 * (genuinely useful triage signal) while still having no idea who that is. A
 * random-per-report mapping would throw that signal away for no extra privacy.
 *
 * One-way in the sense that matters: without REPORT_REFERENCE_SECRET there is
 * no path from reference back to a user id, and user ids are UUIDs so they are
 * not enumerable even by someone holding the secret. Re-identification goes
 * the other way — look the report up and read `reporter_user_id` — and is
 * admin-only and audited.
 *
 * Truncated to 6 hex characters to match the documented format. Collisions are
 * possible in principle and harmless in practice: the reference is a display
 * and search handle, while `reporter_user_id` remains the authoritative key.
 */

export const REPORTER_REFERENCE_PREFIX = "RPT-USR-";

const REFERENCE_HEX_LENGTH = 6;

export function buildReporterReference(userId: string): string {
  const digest = createHmac("sha256", getEnv().REPORT_REFERENCE_SECRET)
    .update(userId)
    .digest("hex");
  return `${REPORTER_REFERENCE_PREFIX}${digest.slice(0, REFERENCE_HEX_LENGTH).toUpperCase()}`;
}

/** Shape check for a user-typed reference (search box, admin lookup). Does not
 *  prove the reference exists — only that it is worth querying for. */
export function isReporterReference(value: string): boolean {
  return new RegExp(`^${REPORTER_REFERENCE_PREFIX}[0-9A-F]{${REFERENCE_HEX_LENGTH}}$`).test(
    value.trim().toUpperCase(),
  );
}

/** Normalise user input so `rpt-usr-8f3a2c` matches the stored uppercase form. */
export function normaliseReporterReference(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Human-facing report number: RPT-2026-000124.
 *
 * The sequence value comes from service_desk.issue_report_counters, bumped
 * atomically in the creating transaction — this only formats it.
 */
export function formatReportNumber(year: number, sequence: number): string {
  return `RPT-${year}-${String(sequence).padStart(6, "0")}`;
}
