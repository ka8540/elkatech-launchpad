/**
 * Lightweight safe-logging utility used by services that need to record
 * structured-ish info without accidentally leaking credentials. The Fastify
 * built-in logger remains the primary log stream; this helper only adds
 * extra defense around fields that should never appear in logs.
 */
const REDACTED = "[redacted]";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "password_hash",
  "csrf",
  "csrftoken",
  "csrf_token",
  "session",
  "sessiontoken",
  "session_token",
  "token",
  "idtoken",
  "id_token",
  "firebaseidtoken",
  "firebase_id_token",
  "privatekey",
  "private_key",
  "serviceaccount",
  "service_account",
  "authorization",
  "cookie",
  "set-cookie",
]);

export function redactForLogs(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > 4) return REDACTED;

  if (Array.isArray(value)) {
    return value.map((entry) => redactForLogs(entry, depth + 1));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.toLowerCase().replace(/[-\s]/g, "");
      if (SENSITIVE_KEYS.has(normalized)) {
        result[key] = REDACTED;
      } else {
        result[key] = redactForLogs(entry, depth + 1);
      }
    }
    return result;
  }

  return value;
}
