/**
 * Strip obvious secrets out of customer-pasted text before it is stored.
 *
 * Customers paste whatever the app showed them, and "the exact error" is
 * frequently a failed request dump complete with an Authorization header. This
 * runs server-side at write time, so it applies no matter what the client did,
 * and it is deliberately LOSSY AND IRREVERSIBLE: the original never reaches
 * the database, which is the point. We accept occasionally redacting something
 * harmless over ever persisting a live credential.
 *
 * Ordering matters — the labelled-pair patterns run before the bare
 * high-entropy sweep so a matched `password=hunter2` is not first mangled by a
 * generic rule into something the pair pattern no longer recognises.
 */

export const REDACTION_PLACEHOLDER = "[redacted]";

type Rule = { pattern: RegExp; replace: (match: string, ...groups: string[]) => string };

const rules: Rule[] = [
  // `Authorization: Bearer xyz` / `authorization=xyz`. Consumes the rest of the
  // line, not just the first word — stopping at whitespace would strip the
  // scheme ("Bearer") and leave the token itself sitting in the text. The
  // header name is kept so the reader still knows auth was involved.
  {
    pattern: /\b(authorization)\s*[:=]\s*[^\n\r]+/gi,
    replace: (_m, key) => `${key}: ${REDACTION_PLACEHOLDER}`,
  },
  // Bare bearer/basic tokens anywhere in the text.
  {
    pattern: /\b(bearer|basic)\s+[A-Za-z0-9._\-+/=]{8,}/gi,
    replace: (_m, scheme) => `${scheme} ${REDACTION_PLACEHOLDER}`,
  },
  // Cookie / Set-Cookie headers: the whole value is sensitive.
  {
    pattern: /\b(set-cookie|cookie)\s*[:=]\s*[^\n\r]+/gi,
    replace: (_m, key) => `${key}: ${REDACTION_PLACEHOLDER}`,
  },
  // Labelled secrets: password=…, api_key: …, apiKey="…", access_token=…,
  // secret=…, refresh_token=…, csrf token, session id.
  {
    pattern:
      /\b(pass(?:word|wd)?|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|secret|client[_-]?secret|private[_-]?key|session[_-]?(?:id|token)|csrf[_-]?token|auth[_-]?token)\s*[:=]\s*("?)[^\s"',;]+\2/gi,
    replace: (_m, key) => `${key}=${REDACTION_PLACEHOLDER}`,
  },
  // JWTs — three base64url segments separated by dots.
  {
    pattern: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g,
    replace: () => REDACTION_PLACEHOLDER,
  },
  // Vendor-prefixed tokens: sk-…, pk_live_…, ghp_…, gho_…, xoxb-…, AKIA…
  {
    pattern:
      /\b(?:sk|pk|rk)[-_](?:live|test)?[-_]?[A-Za-z0-9]{16,}|\bgh[pousr]_[A-Za-z0-9]{16,}|\bxox[baprs]-[A-Za-z0-9-]{10,}|\bAKIA[0-9A-Z]{16}\b/g,
    replace: () => REDACTION_PLACEHOLDER,
  },
  // Email addresses. Not a credential, but a direct personal identifier, and
  // the reports feature must never store one.
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replace: () => REDACTION_PLACEHOLDER,
  },
  // Long high-entropy blobs that survived the labelled rules. Deliberately
  // conservative at 40+ chars with mixed case and digits — a stack trace, a
  // UUID, a file path or an English sentence will not match, but a raw session
  // token pasted on its own line will.
  {
    pattern: /\b(?=[A-Za-z0-9+/_-]*[A-Z])(?=[A-Za-z0-9+/_-]*[a-z])(?=[A-Za-z0-9+/_-]*\d)[A-Za-z0-9+/_-]{40,}={0,2}\b/g,
    replace: () => REDACTION_PLACEHOLDER,
  },
];

/** Apply every redaction rule. Safe on empty/short input. */
export function redactSecrets(input: string): string {
  let output = input;
  for (const rule of rules) {
    output = output.replace(rule.pattern, rule.replace as (substring: string, ...args: any[]) => string);
  }
  return output;
}

/** Redact when present, pass null/undefined through untouched. */
export function redactOptional(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  return redactSecrets(trimmed);
}
