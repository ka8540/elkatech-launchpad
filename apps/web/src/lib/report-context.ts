import type { ReportBrowser, ReportOs, ReportTechnicalContext } from "@elkatech/contracts";

/**
 * Safe technical context for an issue report.
 *
 * Two rules are baked in rather than left to the caller:
 *
 *  1. The route is scrubbed — the query string and fragment are dropped
 *     entirely and identifier-looking segments collapse to `:id`, so a token
 *     in a URL or a customer's request id can never ride along.
 *  2. The user agent is reduced to a coarse family. The raw UA string is never
 *     sent: it is a fingerprinting vector and carries far more than the "which
 *     browser" answer a triage engineer actually needs.
 *
 * Everything here is advisory anyway — the server re-validates each field and
 * drops what does not match — but capturing narrowly at the source means the
 * sensitive value never leaves the tab in the first place.
 */

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function scrubRoute(route: string): string {
  const pathOnly = route.split(/[?#]/)[0];
  return pathOnly
    .split("/")
    .map((segment) => (UUID_SEGMENT.test(segment) || /^\d+$/.test(segment) ? ":id" : segment))
    .join("/");
}

/** Coarse browser family. Order matters: Edge and Chrome both claim "Chrome",
 *  and Chrome claims "Safari", so the most specific test has to come first. */
export function browserFamily(userAgent: string): ReportBrowser {
  const ua = userAgent.toLowerCase();
  if (ua.includes("edg/") || ua.includes("edga/") || ua.includes("edgios/")) return "edge";
  if (ua.includes("firefox/") || ua.includes("fxios/")) return "firefox";
  if (ua.includes("chrome/") || ua.includes("crios/") || ua.includes("chromium")) return "chrome";
  if (ua.includes("safari/")) return "safari";
  return "other";
}

/** Coarse OS family. iOS/Android before their desktop lookalikes. */
export function osFamily(userAgent: string): ReportOs {
  const ua = userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (ua.includes("mac os x") || ua.includes("macintosh")) return "macos";
  if (ua.includes("windows")) return "windows";
  if (ua.includes("linux") || ua.includes("x11")) return "linux";
  return "other";
}

/** Last correlation id seen on an API response. Set by `apiRequest`. */
let lastCorrelationId: string | null = null;

export function setLastCorrelationId(value: string | null) {
  lastCorrelationId = value;
}

export function getLastCorrelationId(): string | null {
  return lastCorrelationId;
}

export function appVersion(): string | null {
  // Injected at build time by vite (`define`). Guarded so tests and any
  // non-vite consumer do not blow up on an undefined global.
  const version = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : null;
  return version && version.length > 0 ? version : null;
}

export function captureReportContext(options: {
  route: string;
  userAgent: string;
  relatedRequestId?: string | null;
  relatedMachineId?: string | null;
}): ReportTechnicalContext {
  return {
    route: scrubRoute(options.route),
    browser: browserFamily(options.userAgent),
    operatingSystem: osFamily(options.userAgent),
    appVersion: appVersion(),
    correlationId: getLastCorrelationId(),
    relatedRequestId: options.relatedRequestId ?? null,
    relatedMachineId: options.relatedMachineId ?? null,
  };
}
