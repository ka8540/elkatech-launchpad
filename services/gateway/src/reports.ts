import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  assignReportInputSchema,
  canIdentifyReporter,
  canManageReports,
  canViewReports,
  createIssueReportInputSchema,
  createReportNoteInputSchema,
  linkReportRequestInputSchema,
  recordReportResolutionInputSchema,
  reporterLookupInputSchema,
  REPORT_SEVERITY_LABELS,
  REPORT_STATUS_LABELS,
  updateReportStatusInputSchema,
  type Role,
} from "@elkatech/contracts";
import { fetchJson, getEnv } from "@elkatech/config";

/**
 * Issue-report routes.
 *
 * The gateway is the only service that can talk to auth, so this layer is
 * where staff ids become staff names. It is deliberately NOT where reporter
 * ids become names: the service-desk never returns a reporter id in the first
 * place, and the one path that resolves a reference to an account is the
 * admin-only, audited lookup at the bottom of this file.
 */

const env = getEnv();

type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: Role;
};

type DirectoryUser = {
  id: string;
  displayName: string;
  email: string;
  role: Role;
};

export type ReportRouteDeps = {
  requireSession: (
    request: any,
    reply: any,
    allowedRoles?: Role[],
  ) => Promise<{ user: SessionUser } | null>;
  assertCsrf: (request: any, reply: any) => boolean;
  userHeaders: (user: SessionUser) => Record<string, string>;
  forbidden: (reply: any, message?: string) => unknown;
  fetchUserDirectory: () => Promise<DirectoryUser[]>;
};

/**
 * Human phrasing for a history row, derived from whitelisted metadata keys.
 * `issue_report_history.metadata` is free-form jsonb and is never returned
 * raw — note bodies and resolution text have no key here, by construction.
 */
function describeEvent(
  eventType: string,
  metadata: Record<string, unknown>,
  nameFor: (id: string | null | undefined) => string | null,
): { previousValue: string | null; newValue: string | null } {
  const str = (key: string) =>
    typeof metadata[key] === "string" ? (metadata[key] as string) : null;

  switch (eventType) {
    case "status_changed":
    case "report_reopened": {
      const from = str("from");
      const to = str("to");
      return {
        previousValue: from ? (REPORT_STATUS_LABELS as any)[from] ?? from : null,
        newValue: to ? (REPORT_STATUS_LABELS as any)[to] ?? to : null,
      };
    }
    case "report_assigned":
    case "report_reassigned":
      return {
        previousValue: nameFor(str("previousAssigneeId")) ?? "Unassigned",
        newValue: nameFor(str("assigneeId")) ?? "Unassigned",
      };
    case "note_added":
      return {
        previousValue: null,
        newValue: str("visibility") === "internal_note" ? "Internal note" : "Customer reply",
      };
    case "report_created": {
      const severity = str("severity");
      return {
        previousValue: null,
        newValue: severity ? (REPORT_SEVERITY_LABELS as any)[severity] ?? severity : null,
      };
    }
    default:
      return { previousValue: null, newValue: null };
  }
}

const STAFF_ROLES: Role[] = ["engineer", "support", "owner", "admin"];
const ADMIN_REPORT_ROLES: Role[] = ["admin"];

export async function registerReportRoutes(app: FastifyInstance, deps: ReportRouteDeps) {
  const { requireSession, assertCsrf, userHeaders, forbidden, fetchUserDirectory } = deps;

  /** Staff-name lookup. Returns a resolver that yields null for anyone who is
   *  not staff — so a customer id can never be turned into a name here. */
  async function staffNames() {
    let directory: DirectoryUser[] = [];
    try {
      directory = await fetchUserDirectory();
    } catch {
      // Name resolution is cosmetic; a directory outage must not fail the page.
    }
    const staff = new Map(
      directory
        .filter((u) => STAFF_ROLES.includes(u.role))
        .map((u) => [u.id, u.displayName] as const),
    );
    return (id: string | null | undefined) => (id ? staff.get(id) ?? null : null);
  }

  function deskUrl(path: string) {
    return `${env.SERVICE_DESK_URL}${path}`;
  }

  /* ── Submit ────────────────────────────────────────────────────────────── */
  app.post(
    "/api/reports",
    {
      config: {
        // Keyed on the session rather than the IP: IP keying punishes everyone
        // behind one office NAT. The service also enforces a rolling daily cap
        // that spacing requests out cannot evade.
        rateLimit: {
          max: 5,
          timeWindow: "10 minutes",
          keyGenerator: (request: any) =>
            request.cookies?.[env.SESSION_COOKIE_NAME] ?? request.ip,
        },
      },
    },
    async (request: any, reply: any) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      if (!assertCsrf(request, reply)) return;

      // Parse here so a malformed body is rejected before it reaches the
      // service. Field paths only in the error — never the submitted values.
      const parsed = createIssueReportInputSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          message: "Please check the highlighted fields.",
          fields: parsed.error.issues.map((issue) => issue.path.join(".")),
        });
      }

      return fetchJson(deskUrl("/reports"), {
        method: "POST",
        headers: userHeaders(session.user),
        body: JSON.stringify(parsed.data),
      });
    },
  );

  /* ── Staff list ────────────────────────────────────────────────────────── */
  app.get("/api/reports", async (request: any, reply: any) => {
    const session = await requireSession(request, reply, ADMIN_REPORT_ROLES);
    if (!session) return;
    if (!canViewReports(session.user.role)) return forbidden(reply);

    const search = new URLSearchParams(
      Object.entries((request.query ?? {}) as Record<string, string>)
        .filter(([, value]) => value !== undefined && value !== "" && value !== "all")
        .map(([key, value]) => [key, String(value)]),
    ).toString();

    const [payload, nameFor] = await Promise.all([
      fetchJson<any>(deskUrl(`/reports${search ? `?${search}` : ""}`), {
        headers: userHeaders(session.user),
      }),
      staffNames(),
    ]);

    return {
      ...payload,
      reports: (payload.reports ?? []).map((row: any) => ({
        ...row,
        assignedUserName: nameFor(row.assignedUserId),
      })),
    };
  });

  /* ── Customer's own reports ────────────────────────────────────────────── */
  app.get("/api/reports/mine", async (request: any, reply: any) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    return fetchJson(deskUrl("/reports/mine"), { headers: userHeaders(session.user) });
  });

  app.get("/api/reports/mine/:reportId", async (request: any, reply: any) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    return fetchJson(deskUrl(`/reports/mine/${params.reportId}`), {
      headers: userHeaders(session.user),
    });
  });

  /* ── Staff detail ──────────────────────────────────────────────────────── */
  app.get("/api/reports/:reportId", async (request: any, reply: any) => {
    const session = await requireSession(request, reply, ADMIN_REPORT_ROLES);
    if (!session) return;
    if (!canViewReports(session.user.role)) return forbidden(reply);
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);

    const [payload, nameFor] = await Promise.all([
      fetchJson<any>(deskUrl(`/reports/${params.reportId}`), {
        headers: userHeaders(session.user),
      }),
      staffNames(),
    ]);

    return {
      ...payload,
      assignedUserName: nameFor(payload.assignedUserId),
      notes: (payload.notes ?? []).map((note: any) => ({
        id: note.id,
        visibility: note.visibility,
        body: note.body,
        authorName: nameFor(note.authorUserId),
        authorRole: note.authorRole,
        createdAt: note.createdAt,
      })),
      history: (payload.history ?? []).map((event: any) => {
        const { previousValue, newValue } = describeEvent(
          event.eventType,
          event.metadata ?? {},
          nameFor,
        );
        return {
          id: event.id,
          eventType: event.eventType,
          actorRole: event.actorRole,
          // Staff are named; the reporting customer never is. `nameFor` only
          // resolves staff, so a customer-authored row yields null and the UI
          // renders it as "Reporter".
          actorLabel: nameFor(event.actorId),
          previousValue,
          newValue,
          createdAt: event.createdAt,
        };
      }),
    };
  });

  /* ── Staff mutations ───────────────────────────────────────────────────── */
  const mutations: Array<{
    path: string;
    schema: z.ZodTypeAny;
    manageOnly: boolean;
  }> = [
    { path: "status", schema: updateReportStatusInputSchema, manageOnly: true },
    { path: "assign", schema: assignReportInputSchema, manageOnly: true },
    { path: "notes", schema: createReportNoteInputSchema, manageOnly: true },
    { path: "resolution", schema: recordReportResolutionInputSchema, manageOnly: true },
    { path: "link-request", schema: linkReportRequestInputSchema, manageOnly: true },
  ];

  for (const mutation of mutations) {
    app.post(`/api/reports/:reportId/${mutation.path}`, async (request: any, reply: any) => {
      const session = await requireSession(request, reply, ADMIN_REPORT_ROLES);
      if (!session) return;
      if (mutation.manageOnly && !canManageReports(session.user.role)) {
        return forbidden(reply);
      }
      if (!assertCsrf(request, reply)) return;
      const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
      const parsed = mutation.schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          message: "Please check the highlighted fields.",
          fields: parsed.error.issues.map((issue) => issue.path.join(".")),
        });
      }
      // The service re-checks the transition and role — this is a fast reject,
      // not the authority.
      return fetchJson(deskUrl(`/reports/${params.reportId}/${mutation.path}`), {
        method: "POST",
        headers: userHeaders(session.user),
        body: JSON.stringify(parsed.data),
      });
    });
  }

  app.get("/api/reports/:reportId/history", async (request: any, reply: any) => {
    const session = await requireSession(request, reply, ADMIN_REPORT_ROLES);
    if (!session) return;
    if (!canViewReports(session.user.role)) return forbidden(reply);
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);

    const [events, nameFor] = await Promise.all([
      fetchJson<any[]>(deskUrl(`/reports/${params.reportId}/history`), {
        headers: userHeaders(session.user),
      }),
      staffNames(),
    ]);

    return events.map((event) => {
      const { previousValue, newValue } = describeEvent(
        event.eventType,
        event.metadata ?? {},
        nameFor,
      );
      return {
        id: event.id,
        eventType: event.eventType,
        actorRole: event.actorRole,
        actorLabel: nameFor(event.actorId),
        previousValue,
        newValue,
        createdAt: event.createdAt,
      };
    });
  });

  /* ── Attachments ───────────────────────────────────────────────────────── */
  app.post("/api/reports/:reportId/attachments/presign", async (request: any, reply: any) => {
    const session = await requireSession(request, reply, ADMIN_REPORT_ROLES);
    if (!session) return;
    if (!canManageReports(session.user.role)) return forbidden(reply);
    if (!assertCsrf(request, reply)) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    return fetchJson(deskUrl(`/reports/${params.reportId}/attachments/presign`), {
      method: "POST",
      headers: userHeaders(session.user),
      body: JSON.stringify(request.body ?? {}),
    });
  });

  app.post("/api/reports/:reportId/attachments", async (request: any, reply: any) => {
    const session = await requireSession(request, reply, ADMIN_REPORT_ROLES);
    if (!session) return;
    if (!canManageReports(session.user.role)) return forbidden(reply);
    if (!assertCsrf(request, reply)) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    return fetchJson(deskUrl(`/reports/${params.reportId}/attachments`), {
      method: "POST",
      headers: userHeaders(session.user),
      body: JSON.stringify(request.body ?? {}),
    });
  });

  app.get("/api/reports/:reportId/attachments", async (request: any, reply: any) => {
    const session = await requireSession(request, reply, ADMIN_REPORT_ROLES);
    if (!session) return;
    if (!canViewReports(session.user.role)) return forbidden(reply);
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    return fetchJson(deskUrl(`/reports/${params.reportId}/attachments`), {
      headers: userHeaders(session.user),
    });
  });

  /* ── Admin re-identification ───────────────────────────────────────────── */
  /**
   * The deliberate, audited escape hatch from an anonymous reference back to
   * an account. Admin-only. POST rather than GET so the reference never lands
   * in an access log, browser history or Referer header. Every lookup writes a
   * `reporter_identified` history row against the covered reports first, so
   * the record exists even if the response is never read.
   */
  app.post("/api/admin/reports/reporter-lookup", async (request: any, reply: any) => {
    const session = await requireSession(request, reply, ADMIN_REPORT_ROLES);
    if (!session) return;
    if (!canIdentifyReporter(session.user.role)) {
      return forbidden(reply, "Only admins can identify a reporter.");
    }
    if (!assertCsrf(request, reply)) return;

    const parsed = reporterLookupInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Enter a reporter reference." });
    }

    const resolved = await fetchJson<{ userIds: string[]; reportCount: number }>(
      deskUrl("/internal/reports/resolve-reference"),
      {
        method: "POST",
        headers: userHeaders(session.user),
        body: JSON.stringify(parsed.data),
      },
    );

    // Audit before returning. A failure here must abort the lookup rather than
    // hand over an identity with no record of it.
    await fetchJson(deskUrl("/internal/reports/record-lookup"), {
      method: "POST",
      headers: userHeaders(session.user),
      body: JSON.stringify(parsed.data),
    });

    const directory = await fetchUserDirectory();
    const byId = new Map(directory.map((u) => [u.id, u]));
    return {
      reporterReference: parsed.data.reporterReference,
      reportCount: resolved.reportCount,
      accounts: resolved.userIds.map((id) => {
        const user = byId.get(id);
        return user
          ? { id: user.id, displayName: user.displayName, email: user.email, role: user.role }
          : { id, displayName: null, email: null, role: null };
      }),
    };
  });
}
