import { readFileSync } from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Role } from "@elkatech/contracts";
import { getEnv } from "@elkatech/config";
import { registerReportRoutes } from "./reports";

const REPORT_ID = "00000000-0000-4000-8000-000000000111";
const STAFF_REPORT_ENDPOINTS = [
  { method: "GET", url: "/reports" },
  { method: "GET", url: `/reports/${REPORT_ID}` },
  { method: "POST", url: `/reports/${REPORT_ID}/status` },
  { method: "POST", url: `/reports/${REPORT_ID}/assign` },
  { method: "POST", url: `/reports/${REPORT_ID}/notes` },
  { method: "POST", url: `/reports/${REPORT_ID}/resolution` },
  { method: "POST", url: `/reports/${REPORT_ID}/link-request` },
  { method: "GET", url: `/reports/${REPORT_ID}/history` },
  { method: "POST", url: `/reports/${REPORT_ID}/attachments/presign` },
  { method: "POST", url: `/reports/${REPORT_ID}/attachments` },
  { method: "GET", url: `/reports/${REPORT_ID}/attachments` },
  { method: "POST", url: "/internal/reports/resolve-reference" },
  { method: "POST", url: "/internal/reports/record-lookup" },
] as const;

function actorHeaders(role: Role) {
  return {
    "x-internal-token": getEnv().INTERNAL_SERVICE_TOKEN,
    "x-user-id": "00000000-0000-4000-8000-000000000001",
    "x-user-email": `${role}@example.test`,
    "x-user-role": role,
    "x-user-display-name": `Test ${role}`,
  };
}

describe("service-desk staff report enforcement", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await registerReportRoutes(app);
    await app.ready();
  });

  afterAll(async () => app.close());

  it.each(["owner", "support", "engineer", "customer"] as const)(
    "returns 403 with no report data for direct %s calls",
    async (role) => {
      for (const endpoint of STAFF_REPORT_ENDPOINTS) {
        const response = await app.inject({
          method: endpoint.method,
          url: endpoint.url,
          headers: actorHeaders(role),
        });
        expect(response.statusCode, `${endpoint.method} ${endpoint.url}`).toBe(403);
        expect(response.json()).toEqual({ message: "Forbidden" });
      }
    },
  );

  it("returns 401 for unauthenticated direct calls", async () => {
    for (const endpoint of STAFF_REPORT_ENDPOINTS) {
      const response = await app.inject({
        method: endpoint.method,
        url: endpoint.url,
      });
      expect(response.statusCode, `${endpoint.method} ${endpoint.url}`).toBe(401);
      expect(response.json()).toEqual({ message: "Unauthorized" });
    }
  });
});

describe("customer-owned report routes", () => {
  const source = readFileSync(path.join(__dirname, "reports.ts"), "utf8");

  it("keeps the own-report list scoped to the forwarded caller id", () => {
    const route = source.slice(source.indexOf('app.get("/reports/mine"'));
    expect(route.slice(0, 900)).toContain("where reporter_user_id = ${actor.id}");
  });

  it("checks ownership before returning the customer-safe detail projection", () => {
    const route = source.slice(source.indexOf('app.get("/reports/mine/:reportId"'));
    const beforeStaffDetail = route.slice(0, route.indexOf("/* ── Staff detail"));
    expect(beforeStaffDetail).toContain(
      "isReportOwner(actor.id, report.reporter_user_id ?? null)",
    );
    expect(beforeStaffDetail.indexOf("isReportOwner")).toBeLessThan(
      beforeStaffDetail.indexOf("return {"),
    );
  });
});
