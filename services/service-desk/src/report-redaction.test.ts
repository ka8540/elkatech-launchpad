import { describe, expect, it } from "vitest";
import { REDACTION_PLACEHOLDER, redactOptional, redactSecrets } from "./report-redaction";

/**
 * Two failure modes matter equally here. A redactor that misses a live token
 * defeats the point; a redactor that eats the actual error message makes the
 * report useless. Both directions are asserted.
 */

describe("redacts credentials", () => {
  it("strips an Authorization header but keeps the header name", () => {
    const out = redactSecrets("Request failed\nAuthorization: Bearer abc123def456ghi789");
    expect(out).not.toContain("abc123def456ghi789");
    expect(out.toLowerCase()).toContain("authorization");
    expect(out).toContain(REDACTION_PLACEHOLDER);
  });

  it("strips a bare bearer token", () => {
    const out = redactSecrets("tried with Bearer eyJhbGciOiJIUzI1NiJ9xxxxxxxx");
    expect(out).not.toContain("eyJhbGciOiJIUzI1NiJ9xxxxxxxx");
  });

  it("strips a JWT", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
    const out = redactSecrets(`token was ${jwt}`);
    expect(out).not.toContain(jwt);
    expect(out).toContain(REDACTION_PLACEHOLDER);
  });

  it("strips labelled secrets in several spellings", () => {
    const samples = [
      "password=hunter2000",
      "api_key: sk_live_abcdefghijklmnop",
      'apiKey="abcdefghijklmnopqrst"',
      "access_token=ya29.abcdefghijklmno",
      "client_secret: shhh-this-is-secret",
      "session_token=abcdef123456789",
    ];
    for (const sample of samples) {
      const out = redactSecrets(sample);
      expect(out).toContain(REDACTION_PLACEHOLDER);
      expect(out).not.toMatch(/hunter2000|abcdefghijklmnop|ya29\.|shhh-this-is-secret/);
    }
  });

  it("strips cookie headers entirely", () => {
    const out = redactSecrets("Cookie: elkatech_session=abc123; other=value");
    expect(out).not.toContain("abc123");
    expect(out).not.toContain("other=value");
  });

  it("strips vendor-prefixed tokens", () => {
    for (const token of [
      "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ0123",
      "xoxb-1234567890-abcdefghij",
      "AKIAIOSFODNN7EXAMPLE",
    ]) {
      expect(redactSecrets(`saw ${token} in the log`)).not.toContain(token);
    }
  });

  it("strips email addresses, which are direct personal identifiers", () => {
    const out = redactSecrets("logged in as someone@example.com and it broke");
    expect(out).not.toContain("someone@example.com");
    expect(out).toContain(REDACTION_PLACEHOLDER);
  });

  it("strips a long high-entropy blob on its own", () => {
    const blob = "aB3dEf7hIjKlMn0pQrStUvWxYz1234567890AbCdEfGhIj";
    expect(redactSecrets(`value ${blob}`)).not.toContain(blob);
  });
});

describe("leaves genuine error content intact", () => {
  it("keeps an ordinary application error untouched", () => {
    const text = "Upload failed: Unable to create attachment URL";
    expect(redactSecrets(text)).toBe(text);
  });

  it("keeps a stack trace readable", () => {
    const trace = [
      "TypeError: Cannot read properties of undefined (reading 'id')",
      "    at RequestDetailPage (/assets/index-4f2a.js:1201:15)",
      "    at renderWithHooks (/assets/vendor.js:9021:22)",
    ].join("\n");
    const out = redactSecrets(trace);
    expect(out).toContain("TypeError: Cannot read properties of undefined");
    expect(out).toContain("renderWithHooks");
  });

  it("keeps a uuid — it identifies a record, not a person, and staff need it", () => {
    const text = "request 2f1c3d64-0000-4000-8000-000000000000 returned 500";
    expect(redactSecrets(text)).toBe(text);
  });

  it("keeps an ordinary English sentence untouched", () => {
    const text =
      "I clicked the button to upload a photograph of the printer and nothing happened at all";
    expect(redactSecrets(text)).toBe(text);
  });

  it("keeps HTTP status lines and paths", () => {
    const text = "POST /api/requests/attachments 502 Bad Gateway";
    expect(redactSecrets(text)).toBe(text);
  });
});

describe("redactOptional", () => {
  it("passes null and undefined through", () => {
    expect(redactOptional(null)).toBeNull();
    expect(redactOptional(undefined)).toBeNull();
  });

  it("treats blank input as absent", () => {
    expect(redactOptional("   ")).toBeNull();
    expect(redactOptional("")).toBeNull();
  });

  it("trims and redacts real input", () => {
    expect(redactOptional("  password=letmein123  ")).toContain(REDACTION_PLACEHOLDER);
    expect(redactOptional("  plain text  ")).toBe("plain text");
  });
});
