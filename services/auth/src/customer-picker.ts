import { z } from "zod";

const cursorPayloadSchema = z.object({
  v: z.literal(1),
  offset: z.number().int().min(0).max(100_000),
});

export function encodeCustomerPickerCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ v: 1, offset }), "utf8").toString("base64url");
}

export function decodeCustomerPickerCursor(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    return cursorPayloadSchema.parse(JSON.parse(raw)).offset;
  } catch {
    throw new Error("Invalid customer picker cursor.");
  }
}

/** Escape SQL LIKE metacharacters so search text is treated literally. */
export function customerPickerSearchPattern(search?: string): string | null {
  if (!search) return null;
  const escaped = search.trim().toLowerCase().replace(/[\\%_]/g, "\\$&");
  return `%${escaped}%`;
}
