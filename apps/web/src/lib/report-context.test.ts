import { describe, expect, it, beforeEach } from "vitest";
import {
  browserFamily,
  captureReportContext,
  getLastCorrelationId,
  osFamily,
  scrubRoute,
  setLastCorrelationId,
} from "./report-context";

/**
 * These assertions are the client half of the privacy contract. The server
 * re-validates everything, but capturing narrowly at the source means the
 * sensitive value never leaves the browser tab in the first place.
 */

describe("route scrubbing", () => {
  it("drops the query string entirely", () => {
    expect(scrubRoute("/app/requests?token=secret123")).toBe("/app/requests");
    expect(scrubRoute("/login?returnTo=/app&code=abc")).toBe("/login");
  });

  it("drops the fragment", () => {
    expect(scrubRoute("/app/account#access_token=xyz")).toBe("/app/account");
  });

  it("collapses uuid segments so no record id rides along", () => {
    expect(scrubRoute("/app/requests/2f1c3d64-0000-4000-8000-000000000000")).toBe(
      "/app/requests/:id",
    );
    expect(
      scrubRoute("/app/activity/9A8B7C6D-0000-4000-8000-000000000001/history"),
    ).toBe("/app/activity/:id/history");
  });

  it("collapses numeric segments too", () => {
    expect(scrubRoute("/app/invoices/40129")).toBe("/app/invoices/:id");
  });

  it("leaves an ordinary route untouched", () => {
    expect(scrubRoute("/app/requests/new")).toBe("/app/requests/new");
    expect(scrubRoute("/app/reports")).toBe("/app/reports");
  });

  it("never returns anything containing a query separator", () => {
    for (const input of [
      "/a?b=c",
      "/a#b",
      "/a?b=c#d",
      "/app/x/2f1c3d64-0000-4000-8000-000000000000?token=1",
    ]) {
      const out = scrubRoute(input);
      expect(out).not.toContain("?");
      expect(out).not.toContain("#");
    }
  });
});

describe("browser family", () => {
  const CHROME =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  const SAFARI =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
  const EDGE = `${CHROME} Edg/120.0.0.0`;
  const FIREFOX = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";

  it("picks the most specific family, not the first match", () => {
    // Every Chromium UA also claims Safari, and Edge also claims Chrome.
    expect(browserFamily(CHROME)).toBe("chrome");
    expect(browserFamily(SAFARI)).toBe("safari");
    expect(browserFamily(EDGE)).toBe("edge");
    expect(browserFamily(FIREFOX)).toBe("firefox");
  });

  it("falls back to other rather than guessing", () => {
    expect(browserFamily("curl/8.4.0")).toBe("other");
    expect(browserFamily("")).toBe("other");
  });
});

describe("operating system family", () => {
  it("identifies the common desktop and mobile systems", () => {
    expect(osFamily("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe("macos");
    expect(osFamily("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
    expect(osFamily("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux");
    expect(osFamily("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(osFamily("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android");
  });

  it("prefers the mobile system over the desktop string it embeds", () => {
    // An iPhone UA contains "Mac OS X"; an Android UA contains "Linux".
    expect(osFamily("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("ios");
    expect(osFamily("Mozilla/5.0 (Linux; Android 14)")).toBe("android");
  });

  it("falls back to other", () => {
    expect(osFamily("something else entirely")).toBe("other");
  });
});

describe("captured context", () => {
  const UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  beforeEach(() => setLastCorrelationId(null));

  it("never includes the raw user agent", () => {
    const context = captureReportContext({ route: "/app/requests", userAgent: UA });
    const serialised = JSON.stringify(context);
    expect(serialised).not.toContain("Mozilla");
    expect(serialised).not.toContain("AppleWebKit");
    expect(serialised).not.toContain("120.0.0.0");
  });

  it("carries only the documented keys — nothing extra can be added by accident", () => {
    const context = captureReportContext({ route: "/app", userAgent: UA });
    expect(Object.keys(context).sort()).toEqual(
      [
        "appVersion",
        "browser",
        "correlationId",
        "operatingSystem",
        "relatedMachineId",
        "relatedRequestId",
        "route",
      ].sort(),
    );
  });

  it("scrubs the route it is handed", () => {
    const context = captureReportContext({
      route: "/app/requests/2f1c3d64-0000-4000-8000-000000000000?token=abc",
      userAgent: UA,
    });
    expect(context.route).toBe("/app/requests/:id");
  });

  it("passes through the last correlation id seen on an API response", () => {
    setLastCorrelationId("req-42");
    expect(getLastCorrelationId()).toBe("req-42");
    expect(captureReportContext({ route: "/app", userAgent: UA }).correlationId).toBe("req-42");
  });

  it("carries a related request or machine only when given one", () => {
    const bare = captureReportContext({ route: "/app", userAgent: UA });
    expect(bare.relatedRequestId).toBeNull();
    expect(bare.relatedMachineId).toBeNull();

    const linked = captureReportContext({
      route: "/app",
      userAgent: UA,
      relatedRequestId: "2f1c3d64-0000-4000-8000-000000000000",
    });
    expect(linked.relatedRequestId).toBe("2f1c3d64-0000-4000-8000-000000000000");
  });
});
