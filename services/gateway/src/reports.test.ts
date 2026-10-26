import { readFileSync } from "node:fs";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  canAssignReports,
  canIdentifyReporter,
  canManageReports,
  canReopenReport,
  canSubmitReport,
  canViewAllReports,
  canViewReports,
  issueReportDetailSchema,
  issueReportRowSchema,
  myIssueReportDetailSchema,
  myIssueReportRowSchema,
  type Role,
} from "@elkatech/contracts";
import { registerReportRoutes } from "./reports";

const ALL_ROLES: Role[] = ["customer", "engineer", "support", "owner", "admin"];

describe("issue-report permissions", () => {
  it("lets any signed-in role file a report", () => {
    for (const role of ALL_ROLES) {
      expect(canSubmitReport(role)).toBe(true);
    }
  });

  it("restricts every staff report permission to Admin alone", () => {
    const permissions = [
      canViewAllReports,
      canViewReports,
      canManageReports,
      canAssignReports,
      canReopenReport,
      canIdentifyReporter,
    ];
    for (const permission of permissions) {
      for (const role of ALL_ROLES) {
        expect(permission(role), `${permission.name}(${role})`).toBe(role === "admin");
      }
    }
  });

  it("keeps reopen at least as narrow as management everywhere", () => {
    for (const role of ALL_ROLES) {
      if (canReopenReport(role)) expect(canManageReports(role)).toBe(true);
    }
  });
});

/**
 * The privacy contract, asserted against the schemas themselves.
 *
 * These are the tests that matter most in this feature: if someone later adds
 * a convenient `reporterEmail` to the staff payload, the whole point of the
 * anonymous reference is gone and nothing else would catch it.
 */
const IDENTITY_KEYS = [
  "reporterUserId",
  "reporterId",
  "customerId",
  "userId",
  "email",
  "reporterEmail",
  "displayName",
  "reporterName",
  "customerName",
  "phone",
  "contactPhone",
  "address",
];

function keysOf(schema: { shape: Record<string, unknown> }) {
  return Object.keys(schema.shape);
}

describe("staff-facing payloads carry no reporter identity", () => {
  it("has no identity field on a report table row", () => {
    const keys = keysOf(issueReportRowSchema as any);
    for (const forbidden of IDENTITY_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
    // The anonymous handle is the only reporter-related field.
    expect(keys).toContain("reporterReference");
  });

  it("has no identity field on the staff detail payload", () => {
    const keys = keysOf(issueReportDetailSchema as any);
    for (const forbidden of IDENTITY_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
    expect(keys).toContain("reporterReference");
  });

  it("exposes staff assignment by name but the reporter only by reference", () => {
    const keys = keysOf(issueReportDetailSchema as any);
    // Employees are accountable to each other, so staff names are fine.
    expect(keys).toContain("assignedUserName");
    expect(keys).not.toContain("reporterName");
  });
});

describe("customer-facing payloads carry no internal data", () => {
  const INTERNAL_KEYS = [
    "internalNotes",
    "notes",
    "history",
    "reporterReference",
    "assignedUserId",
    "assignedUserName",
    "context",
    "correlationId",
    "route",
  ];

  it("keeps the customer list free of internal and administrative fields", () => {
    const keys = keysOf(myIssueReportRowSchema as any);
    for (const forbidden of INTERNAL_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it("keeps the customer detail free of internal and administrative fields", () => {
    const keys = keysOf(myIssueReportDetailSchema as any);
    for (const forbidden of INTERNAL_KEYS) {
      expect(keys).not.toContain(forbidden);
    }
    // What the customer does get: their own words, plus what staff chose to
    // tell them.
    expect(keys).toContain("description");
    expect(keys).toContain("resolution");
    expect(keys).toContain("responses");
  });

  it("rejects an internal note smuggled into the customer detail payload", () => {
    const parsed = myIssueReportDetailSchema.safeParse({
      id: "r1",
      reportNumber: "RPT-2026-000001",
      title: "t",
      description: "d",
      exactError: null,
      stepsToReproduce: null,
      applicationArea: "other",
      severity: "low",
      status: "new",
      resolution: null,
      responses: [],
      attachments: [],
      createdAt: "2026-07-25T00:00:00.000Z",
      updatedAt: "2026-07-25T00:00:00.000Z",
      resolvedAt: null,
      internalNotes: ["should never survive"],
    });
    // zod strips unknown keys, so the extra field cannot reach the client even
    // if a handler mistakenly attached one.
    expect(parsed.success).toBe(true);
    expect(parsed.success && "internalNotes" in parsed.data).toBe(false);
  });
});

describe("gateway report routes", () => {
  const SOURCE = readFileSync(path.join(__dirname, "reports.ts"), "utf8");

  it("uses POST for the reporter lookup so no reference lands in a URL", () => {
    expect(SOURCE).toContain('app.post("/api/admin/reports/reporter-lookup"');
    expect(SOURCE).not.toContain('app.get("/api/admin/reports/reporter-lookup"');
  });

  it("records the lookup before returning an identity", () => {
    const auditIndex = SOURCE.indexOf("/internal/reports/record-lookup");
    const returnIndex = SOURCE.indexOf("accounts: resolved.userIds");
    expect(auditIndex).toBeGreaterThan(-1);
    expect(returnIndex).toBeGreaterThan(auditIndex);
  });

  it("rate limits report submission on the session, not the shared IP", () => {
    expect(SOURCE).toContain("rateLimit");
    expect(SOURCE).toContain("keyGenerator");
  });

  it("returns field paths rather than submitted values on a validation error", () => {
    expect(SOURCE).toContain("issue.path.join");
    expect(SOURCE).not.toMatch(/message:\s*parsed\.error\.message/);
  });
});

const REPORT_ID = "00000000-0000-4000-8000-000000000111";
const STAFF_REPORT_ENDPOINTS = [
  { method: "GET", url: "/api/reports" },
  { method: "GET", url: `/api/reports/${REPORT_ID}` },
  { method: "POST", url: `/api/reports/${REPORT_ID}/status` },
  { method: "POST", url: `/api/reports/${REPORT_ID}/assign` },
  { method: "POST", url: `/api/reports/${REPORT_ID}/notes` },
  { method: "POST", url: `/api/reports/${REPORT_ID}/resolution` },
  { method: "POST", url: `/api/reports/${REPORT_ID}/link-request` },
  { method: "GET", url: `/api/reports/${REPORT_ID}/history` },
  { method: "POST", url: `/api/reports/${REPORT_ID}/attachments/presign` },
  { method: "POST", url: `/api/reports/${REPORT_ID}/attachments` },
  { method: "GET", url: `/api/reports/${REPORT_ID}/attachments` },
  { method: "POST", url: "/api/admin/reports/reporter-lookup" },
] as const;

describe("gateway staff report enforcement", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await registerReportRoutes(app, {
      requireSession: async (request, reply, allowedRoles) => {
        const role = request.headers["x-test-role"] as Role | undefined;
        if (!role) {
          reply.code(401).send({ message: "Authentication required." });
          return null;
        }
        if (allowedRoles && !allowedRoles.includes(role)) {
          reply.code(403).send({ message: "Forbidden" });
          return null;
        }
        return {
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            email: `${role}@example.test`,
            displayName: `Test ${role}`,
            role,
          },
        };
      },
      assertCsrf: () => true,
      userHeaders: (user) => ({
        "content-type": "application/json",
        "x-internal-token": "dev-internal-token",
        "x-user-id": user.id,
        "x-user-email": user.email,
        "x-user-display-name": user.displayName,
        "x-user-role": user.role,
      }),
      forbidden: (reply, message = "Forbidden") => reply.code(403).send({ message }),
      fetchUserDirectory: async () => [],
    });
    await app.ready();
  });

  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => app.close());

  it.each(["owner", "support", "engineer", "customer"] as const)(
    "returns 403 with no staff data for every %s request",
    async (role) => {
      for (const endpoint of STAFF_REPORT_ENDPOINTS) {
        const response = await app.inject({
          method: endpoint.method,
          url: endpoint.url,
          headers: { "x-test-role": role },
        });
        expect(response.statusCode, `${endpoint.method} ${endpoint.url}`).toBe(403);
        expect(response.json()).toEqual({ message: "Forbidden" });
      }
    },
  );

  it("returns 401 for every unauthenticated staff report request", async () => {
    for (const endpoint of STAFF_REPORT_ENDPOINTS) {
      const response = await app.inject({
        method: endpoint.method,
        url: endpoint.url,
      });
      expect(response.statusCode, `${endpoint.method} ${endpoint.url}`).toBe(401);
      expect(response.json()).toEqual({ message: "Authentication required." });
    }
  });

  it("still lets Admin list staff reports", async () => {
    const downstream = {
      reports: [],
      total: 0,
      limit: 25,
      offset: 0,
      summary: { new: 0, working: 0, resolved: 0, blocking: 0 },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(downstream), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/reports",
      headers: { "x-test-role": "admin" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject(downstream);
  });

  it("preserves the customer-owned list route and forwards the caller identity", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await app.inject({
      method: "GET",
      url: "/api/reports/mine",
      headers: { "x-test-role": "customer" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
    const forwarded = new Headers(fetchMock.mock.calls[0][1].headers);
    expect(forwarded.get("x-user-id")).toBe("00000000-0000-4000-8000-000000000001");
    expect(forwarded.get("x-user-role")).toBe("customer");
  });
});
