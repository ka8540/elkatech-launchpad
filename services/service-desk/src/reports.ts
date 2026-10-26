import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  assignReportInputSchema,
  canAssignReports,
  canManageReports,
  canViewAllReports,
  canViewReports,
  confirmAttachmentInputSchema,
  createIssueReportInputSchema,
  createReportNoteInputSchema,
  issueReportListQuerySchema,
  linkReportRequestInputSchema,
  presignAttachmentInputSchema,
  recordReportResolutionInputSchema,
  REPORT_DAILY_LIMIT,
  reportBrowserSchema,
  reporterLookupInputSchema,
  reportOsSchema,
  reportStatusSchema,
  roleSchema,
  updateReportStatusInputSchema,
  type ReportStatus,
} from "@elkatech/contracts";
import {
  attachmentReadUrl,
  buildReportAttachmentObjectKey,
  getDb,
  getEnv,
  isAllowedReportAttachmentType,
  isR2Configured,
  maxReportAttachmentBytes,
  presignAttachmentUpload,
  type DbExecutor,
} from "@elkatech/config";
import {
  allowedReportTransitions,
  canManageReport,
  canTransitionReportTo,
  canViewReport,
  isReopen,
  isReportOwner,
  type ReportActor,
} from "./report-workflow";
import { redactOptional, redactSecrets } from "./report-redaction";
import {
  buildReporterReference,
  formatReportNumber,
  normaliseReporterReference,
} from "./report-reference";

/**
 * Issue-report routes.
 *
 * Kept out of index.ts (already 2200+ lines) and registered as a plugin. Every
 * response built here is identity-free by construction: `reporter_user_id` is
 * read for authorization and never selected into a payload, and name
 * resolution for STAFF happens one layer up in the gateway, which is the only
 * service that can talk to auth. This service therefore never even learns who
 * a reporter is beyond an opaque uuid.
 */

const sql = getDb();
const env = getEnv();

const userContextSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: roleSchema,
  displayName: z.string().min(1),
});
type UserContext = z.infer<typeof userContextSchema>;

function ensureInternal(headers: Record<string, unknown>) {
  return headers["x-internal-token"] === env.INTERNAL_SERVICE_TOKEN;
}

function toActor(actor: UserContext): ReportActor {
  return { id: actor.id, role: actor.role };
}

/* ── Preview-environment self-heal ─────────────────────────────────────────
 * Vercel preview deployments run against a per-branch Neon database that is
 * forked once and never re-migrated, so migration 006's tables simply would
 * not exist there and every report route would 500. Mirrors the identical
 * `ensureAuthSchema()` in the auth service: idempotent DDL, at most one run
 * per cold start, a no-op once the schema is current (production, local dev).
 */
let ensureSchemaPromise: Promise<void> | null = null;
function ensureIssueReportSchema(): Promise<void> {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = sql
      .unsafe(
        `create table if not exists service_desk.issue_reports (
           id uuid primary key,
           report_number text not null unique,
           reporter_user_id uuid,
           reporter_reference text not null,
           title text not null,
           description text not null,
           exact_error text,
           steps_to_reproduce text,
           application_area text not null,
           severity text not null,
           status text not null default 'new',
           assigned_user_id uuid,
           related_request_id uuid,
           related_machine_id uuid,
           route text,
           browser text,
           operating_system text,
           app_version text,
           correlation_id text,
           resolution text,
           created_at timestamptz not null default now(),
           updated_at timestamptz not null default now(),
           resolved_at timestamptz
         );
         create index if not exists issue_reports_status_idx on service_desk.issue_reports (status);
         create index if not exists issue_reports_severity_idx on service_desk.issue_reports (severity);
         create index if not exists issue_reports_area_idx on service_desk.issue_reports (application_area);
         create index if not exists issue_reports_assigned_idx on service_desk.issue_reports (assigned_user_id);
         create index if not exists issue_reports_reporter_idx on service_desk.issue_reports (reporter_user_id);
         create index if not exists issue_reports_reference_idx on service_desk.issue_reports (reporter_reference);
         create index if not exists issue_reports_created_idx on service_desk.issue_reports (created_at desc);
         create table if not exists service_desk.issue_report_history (
           id uuid primary key,
           report_id uuid not null references service_desk.issue_reports(id) on delete cascade,
           actor_id uuid not null,
           actor_role text not null,
           event_type text not null,
           metadata jsonb not null default '{}'::jsonb,
           created_at timestamptz not null default now()
         );
         create index if not exists issue_report_history_report_idx
           on service_desk.issue_report_history (report_id, created_at);
         create table if not exists service_desk.issue_report_notes (
           id uuid primary key,
           report_id uuid not null references service_desk.issue_reports(id) on delete cascade,
           author_user_id uuid not null,
           author_role text not null,
           visibility text not null,
           body text not null,
           created_at timestamptz not null default now()
         );
         create index if not exists issue_report_notes_report_idx
           on service_desk.issue_report_notes (report_id, created_at);
         create table if not exists service_desk.issue_report_attachments (
           id uuid primary key,
           report_id uuid not null references service_desk.issue_reports(id) on delete cascade,
           uploaded_by uuid not null,
           object_key text not null unique,
           file_name text not null,
           content_type text not null,
           size_bytes bigint not null,
           created_at timestamptz not null default now()
         );
         create index if not exists issue_report_attachments_report_idx
           on service_desk.issue_report_attachments (report_id);
         create table if not exists service_desk.issue_report_counters (
           year integer primary key,
           last_value bigint not null default 0
         );`,
      )
      .then(() => undefined)
      .catch((error) => {
        // Never cache a failure — the next request should retry rather than
        // wedge the feature for the life of the process.
        ensureSchemaPromise = null;
        throw error;
      });
  }
  return ensureSchemaPromise;
}

/* ── History ───────────────────────────────────────────────────────────────
 * Same convention as service_desk.request_history: the history row is written
 * with the caller's transaction executor so a domain write can never commit
 * without its audit entry.
 */
async function addReportHistory(
  reportId: string,
  actor: UserContext,
  eventType: string,
  metadata: Record<string, unknown> = {},
  tx: DbExecutor = sql,
) {
  await tx`
    insert into service_desk.issue_report_history (
      id, report_id, actor_id, actor_role, event_type, metadata
    )
    values (
      ${randomUUID()},
      ${reportId},
      ${actor.id},
      ${actor.role},
      ${eventType},
      ${sql.json(metadata as any)}
    )
  `;
}

/** Bump and read the per-year counter atomically inside the caller's
 *  transaction, so two concurrent submissions can never take the same number. */
async function nextReportNumber(tx: DbExecutor): Promise<string> {
  const year = new Date().getUTCFullYear();
  const rows = await tx<{ last_value: string }[]>`
    insert into service_desk.issue_report_counters (year, last_value)
    values (${year}, 1)
    on conflict (year) do update
      set last_value = service_desk.issue_report_counters.last_value + 1
    returning last_value
  `;
  return formatReportNumber(year, Number(rows[0].last_value));
}

/* ── Visibility ────────────────────────────────────────────────────────────
 * Staff report data is Admin-only. Keep the SQL scope explicit as defense in
 * depth even though every staff route rejects non-Admins before querying.
 */
function visibilityScope(actor: UserContext) {
  return canViewAllReports(actor.role) ? sql`true` : sql`false`;
}

/** Client-supplied technical context is advisory — re-validate every field and
 *  drop anything that does not match, so a crafted client cannot smuggle a raw
 *  user agent or a full URL with a query string into storage. */
function sanitiseContext(input: unknown) {
  const raw = (input ?? {}) as Record<string, unknown>;
  const str = (key: string, max: number): string | null => {
    const value = raw[key];
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed.slice(0, max);
  };
  const uuid = (key: string): string | null => {
    const value = raw[key];
    return typeof value === "string" && z.string().uuid().safeParse(value).success
      ? value
      : null;
  };
  const enumOr = <T extends z.ZodTypeAny>(key: string, schema: T): string | null => {
    const parsed = schema.safeParse(raw[key]);
    return parsed.success ? (parsed.data as string) : null;
  };

  // Defence in depth: even a client-supplied "route" gets its query string cut
  // and identifier segments collapsed again on the server.
  const route = str("route", 200);
  return {
    route: route ? scrubRoute(route) : null,
    browser: enumOr("browser", reportBrowserSchema),
    operatingSystem: enumOr("operatingSystem", reportOsSchema),
    appVersion: str("appVersion", 80),
    correlationId: str("correlationId", 120),
    relatedRequestId: uuid("relatedRequestId"),
    relatedMachineId: uuid("relatedMachineId"),
  };
}

/** Drop any query string/fragment and collapse identifier-looking segments so
 *  a stored route can never carry a token or an id. */
export function scrubRoute(route: string): string {
  const pathOnly = route.split(/[?#]/)[0];
  return pathOnly
    .split("/")
    .map((segment) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
      /^\d+$/.test(segment)
        ? ":id"
        : segment,
    )
    .join("/");
}

function mapRow(row: any) {
  return {
    id: row.id,
    reportNumber: row.report_number,
    title: row.title,
    applicationArea: row.application_area,
    severity: row.severity,
    status: row.status as ReportStatus,
    reporterReference: row.reporter_reference,
    assignedUserId: row.assigned_user_id ?? null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function loadReport(reportId: string) {
  const rows = await sql<any[]>`
    select * from service_desk.issue_reports where id = ${reportId} limit 1
  `;
  return rows[0] ?? null;
}

async function signedAttachments(reportId: string) {
  const rows = await sql<any[]>`
    select * from service_desk.issue_report_attachments
    where report_id = ${reportId}
    order by created_at asc
  `;
  return Promise.all(
    rows.map(async (a) => {
      let url = "";
      try {
        // forceSigned: report evidence never gets a permanent public URL, even
        // when the bucket has a public base configured.
        url = await attachmentReadUrl({
          objectKey: a.object_key,
          fileName: a.file_name,
          forceSigned: true,
        });
      } catch {
        /* metadata still returned; the URL can be regenerated on the next read */
      }
      return {
        id: a.id,
        fileName: a.file_name,
        contentType: a.content_type,
        sizeBytes: Number(a.size_bytes),
        url,
        createdAt: new Date(a.created_at).toISOString(),
      };
    }),
  );
}

export async function registerReportRoutes(app: FastifyInstance) {
  /** Authenticate a forwarded user without touching report storage. */
  function authenticate(request: any, reply: any): UserContext | null {
    if (!ensureInternal(request.headers)) {
      reply.code(401).send({ message: "Unauthorized" });
      return null;
    }

    const parsed = userContextSchema.safeParse({
      id: request.headers["x-user-id"],
      email: request.headers["x-user-email"],
      role: request.headers["x-user-role"],
      displayName: request.headers["x-user-display-name"],
    });
    if (!parsed.success) {
      reply.code(401).send({ message: "Unauthorized" });
      return null;
    }
    return parsed.data;
  }

  /** Customer-safe report routes require a valid forwarded user. */
  async function guard(request: any, reply: any): Promise<UserContext | null> {
    const actor = authenticate(request, reply);
    if (!actor) return null;
    await ensureIssueReportSchema();
    return actor;
  }

  /** Staff report routes are Admin-only before any report query or mutation. */
  async function guardAdminReportAccess(
    request: any,
    reply: any,
  ): Promise<UserContext | null> {
    const actor = authenticate(request, reply);
    if (!actor) return null;
    if (!canViewReports(actor.role)) {
      reply.code(403).send({ message: "Forbidden" });
      return null;
    }
    await ensureIssueReportSchema();
    return actor;
  }

  /* ── Create ────────────────────────────────────────────────────────────── */
  app.post("/reports", async (request, reply) => {
    const actor = await guard(request, reply);
    if (!actor) return;

    const input = createIssueReportInputSchema.parse(request.body);

    // Server-side backstop for the gateway's rate limit, which a client could
    // evade by simply spacing requests out.
    const recent = await sql<{ count: string }[]>`
      select count(*)::text as count
      from service_desk.issue_reports
      where reporter_user_id = ${actor.id}
        and created_at > now() - interval '24 hours'
    `;
    if (Number(recent[0].count) >= REPORT_DAILY_LIMIT) {
      return reply
        .code(429)
        .send({ message: "You have reached the daily limit for issue reports." });
    }

    const context = sanitiseContext(input.context);
    const reportId = randomUUID();
    const reporterReference = buildReporterReference(actor.id);
    // Redaction happens here, server-side, so it applies regardless of what
    // the client did. Lossy and irreversible by design.
    const title = redactSecrets(input.title.trim());
    const description = redactSecrets(input.description.trim());
    const exactError = redactOptional(input.exactError);
    const steps = redactOptional(input.stepsToReproduce);

    let reportNumber = "";
    await sql.begin(async (tx) => {
      reportNumber = await nextReportNumber(tx);
      await tx`
        insert into service_desk.issue_reports (
          id, report_number, reporter_user_id, reporter_reference,
          title, description, exact_error, steps_to_reproduce,
          application_area, severity, status,
          route, browser, operating_system, app_version, correlation_id,
          related_request_id, related_machine_id
        )
        values (
          ${reportId}, ${reportNumber}, ${actor.id}, ${reporterReference},
          ${title}, ${description}, ${exactError}, ${steps},
          ${input.applicationArea}, ${input.severity}, ${"new"},
          ${context.route}, ${context.browser}, ${context.operatingSystem},
          ${context.appVersion}, ${context.correlationId},
          ${context.relatedRequestId}, ${context.relatedMachineId}
        )
      `;
      // Metadata carries no submitted text — only the controlled enums.
      await addReportHistory(
        reportId,
        actor,
        "report_created",
        { severity: input.severity, area: input.applicationArea },
        tx,
      );
    });

    return reply.code(201).send({ id: reportId, reportNumber, status: "new" });
  });

  /* ── Staff list ────────────────────────────────────────────────────────── */
  app.get("/reports", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;

    const query = issueReportListQuerySchema.parse(request.query);
    const scope = visibilityScope(actor);

    let where = sql`where ${scope}`;
    if (query.status) where = sql`${where} and status = ${query.status}`;
    if (query.severity) where = sql`${where} and severity = ${query.severity}`;
    if (query.area) where = sql`${where} and application_area = ${query.area}`;
    if (query.assignee === "unassigned") {
      where = sql`${where} and assigned_user_id is null`;
    } else if (query.assignee) {
      where = sql`${where} and assigned_user_id = ${query.assignee}`;
    }
    if (query.from) where = sql`${where} and created_at >= ${query.from}::date`;
    // Inclusive upper bound: "to 2026-07-25" must include that whole day.
    if (query.to) where = sql`${where} and created_at < (${query.to}::date + interval '1 day')`;
    if (query.search) {
      // Deliberately NOT searchable: anything identifying the reporter. The
      // reference is searchable because it is the anonymous handle.
      const needle = `%${query.search}%`;
      const reference = normaliseReporterReference(query.search);
      where = sql`${where} and (
        report_number ilike ${needle}
        or title ilike ${needle}
        or exact_error ilike ${needle}
        or reporter_reference = ${reference}
      )`;
    }

    const rows = await sql<any[]>`
      select * from service_desk.issue_reports
      ${where}
      order by
        case status when 'new' then 0 when 'working' then 1 else 2 end,
        case severity when 'blocking' then 0 when 'high' then 1 when 'medium' then 2 else 3 end,
        created_at desc
      limit ${query.limit} offset ${query.offset}
    `;

    const totals = await sql<{ count: string }[]>`
      select count(*)::text as count from service_desk.issue_reports ${where}
    `;

    // Summary spans the actor's whole visible set, not the filtered page —
    // the metric row is a standing picture, not a reflection of the filters.
    const summaryRows = await sql<any[]>`
      select
        count(*) filter (where status = 'new')::text as new,
        count(*) filter (where status = 'working')::text as working,
        count(*) filter (where status = 'resolved')::text as resolved,
        count(*) filter (where severity = 'blocking' and status <> 'resolved')::text as blocking
      from service_desk.issue_reports
      where ${scope}
    `;

    return {
      reports: rows.map(mapRow),
      total: Number(totals[0].count),
      limit: query.limit,
      offset: query.offset,
      summary: {
        new: Number(summaryRows[0].new),
        working: Number(summaryRows[0].working),
        resolved: Number(summaryRows[0].resolved),
        blocking: Number(summaryRows[0].blocking),
      },
    };
  });

  /* ── Customer's own list ───────────────────────────────────────────────── */
  app.get("/reports/mine", async (request, reply) => {
    const actor = await guard(request, reply);
    if (!actor) return;

    const rows = await sql<any[]>`
      select id, report_number, title, application_area, severity, status,
             created_at, updated_at
      from service_desk.issue_reports
      where reporter_user_id = ${actor.id}
      order by created_at desc
      limit 200
    `;
    return rows.map((row) => ({
      id: row.id,
      reportNumber: row.report_number,
      title: row.title,
      applicationArea: row.application_area,
      severity: row.severity,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    }));
  });

  /* ── Customer's own detail ─────────────────────────────────────────────── */
  app.get("/reports/mine/:reportId", async (request, reply) => {
    const actor = await guard(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);

    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });
    // Ownership, not visibility: a support user hitting this route still only
    // gets their own reports back, so the customer projection can never be a
    // back door into someone else's report.
    if (!isReportOwner(actor.id, report.reporter_user_id ?? null)) {
      return reply.code(404).send({ message: "Report not found." });
    }

    const notes = await sql<any[]>`
      select id, body, created_at
      from service_desk.issue_report_notes
      where report_id = ${params.reportId} and visibility = 'customer_visible'
      order by created_at asc
    `;

    return {
      id: report.id,
      reportNumber: report.report_number,
      title: report.title,
      description: report.description,
      exactError: report.exact_error ?? null,
      stepsToReproduce: report.steps_to_reproduce ?? null,
      applicationArea: report.application_area,
      severity: report.severity,
      status: report.status,
      resolution: report.resolution ?? null,
      responses: notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: new Date(n.created_at).toISOString(),
      })),
      attachments: await signedAttachments(params.reportId),
      createdAt: new Date(report.created_at).toISOString(),
      updatedAt: new Date(report.updated_at).toISOString(),
      resolvedAt: report.resolved_at ? new Date(report.resolved_at).toISOString() : null,
    };
  });

  /* ── Staff detail ──────────────────────────────────────────────────────── */
  app.get("/reports/:reportId", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);

    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });

    const workflowReport = {
      reporterUserId: report.reporter_user_id ?? null,
      assignedUserId: report.assigned_user_id ?? null,
      status: report.status as ReportStatus,
    };
    if (!canViewReport(toActor(actor), workflowReport)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const notes = await sql<any[]>`
      select id, visibility, body, author_user_id, author_role, created_at
      from service_desk.issue_report_notes
      where report_id = ${params.reportId}
      order by created_at asc
    `;
    const history = await sql<any[]>`
      select id, actor_id, actor_role, event_type, metadata, created_at
      from service_desk.issue_report_history
      where report_id = ${params.reportId}
      order by created_at asc
    `;

    let relatedRequestNumber: string | null = null;
    if (report.related_request_id) {
      const rows = await sql<any[]>`
        select request_number from service_desk.requests
        where id = ${report.related_request_id} limit 1
      `;
      relatedRequestNumber = rows[0]?.request_number ?? null;
    }

    return {
      ...mapRow(report),
      description: report.description,
      exactError: report.exact_error ?? null,
      stepsToReproduce: report.steps_to_reproduce ?? null,
      relatedRequestId: report.related_request_id ?? null,
      relatedRequestNumber,
      relatedMachineId: report.related_machine_id ?? null,
      resolution: report.resolution ?? null,
      context: {
        route: report.route ?? null,
        browser: report.browser ?? null,
        operatingSystem: report.operating_system ?? null,
        appVersion: report.app_version ?? null,
        correlationId: report.correlation_id ?? null,
        relatedRequestId: report.related_request_id ?? null,
        relatedMachineId: report.related_machine_id ?? null,
      },
      resolvedAt: report.resolved_at ? new Date(report.resolved_at).toISOString() : null,
      // Author/actor ids are returned so the gateway can resolve STAFF names.
      // The reporter's id is never among them.
      notes: notes.map((n) => ({
        id: n.id,
        visibility: n.visibility,
        body: n.body,
        authorUserId: n.author_user_id,
        authorRole: n.author_role,
        createdAt: new Date(n.created_at).toISOString(),
      })),
      history: history.map((h) => ({
        id: h.id,
        eventType: h.event_type,
        actorId: h.actor_id,
        actorRole: h.actor_role,
        metadata: h.metadata ?? {},
        createdAt: new Date(h.created_at).toISOString(),
      })),
      attachments: await signedAttachments(params.reportId),
      allowedTransitions: allowedReportTransitions(toActor(actor), workflowReport),
    };
  });

  /* ── Status ────────────────────────────────────────────────────────────── */
  app.post("/reports/:reportId/status", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    const input = updateReportStatusInputSchema.parse(request.body);

    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });

    const workflowReport = {
      reporterUserId: report.reporter_user_id ?? null,
      assignedUserId: report.assigned_user_id ?? null,
      status: report.status as ReportStatus,
    };
    if (!canTransitionReportTo(toActor(actor), workflowReport, input.status)) {
      return reply
        .code(403)
        .send({ message: "You cannot move this report to that status." });
    }

    const reopening = isReopen(workflowReport.status, input.status);
    await sql.begin(async (tx) => {
      await tx`
        update service_desk.issue_reports
        set status = ${input.status},
            updated_at = now(),
            resolved_at = ${input.status === "resolved" ? sql`now()` : sql`null`}
        where id = ${params.reportId}
      `;
      await addReportHistory(
        params.reportId,
        actor,
        reopening ? "report_reopened" : "status_changed",
        { from: workflowReport.status, to: input.status },
        tx,
      );
    });

    return { id: params.reportId, status: input.status };
  });

  /* ── Assign ────────────────────────────────────────────────────────────── */
  app.post("/reports/:reportId/assign", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    const input = assignReportInputSchema.parse(request.body);

    if (!canAssignReports(actor.role)) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });

    const previous = report.assigned_user_id ?? null;
    if (previous === input.assigneeId) {
      return { id: params.reportId, assignedUserId: previous };
    }

    await sql.begin(async (tx) => {
      await tx`
        update service_desk.issue_reports
        set assigned_user_id = ${input.assigneeId}, updated_at = now()
        where id = ${params.reportId}
      `;
      await addReportHistory(
        params.reportId,
        actor,
        previous === null ? "report_assigned" : "report_reassigned",
        { assigneeId: input.assigneeId, previousAssigneeId: previous },
        tx,
      );
    });

    return { id: params.reportId, assignedUserId: input.assigneeId };
  });

  /* ── Notes ─────────────────────────────────────────────────────────────── */
  app.post("/reports/:reportId/notes", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    const input = createReportNoteInputSchema.parse(request.body);

    if (!canManageReport(toActor(actor))) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });

    const noteId = randomUUID();
    await sql.begin(async (tx) => {
      await tx`
        insert into service_desk.issue_report_notes (
          id, report_id, author_user_id, author_role, visibility, body
        )
        values (
          ${noteId}, ${params.reportId}, ${actor.id}, ${actor.role},
          ${input.visibility}, ${redactSecrets(input.body.trim())}
        )
      `;
      await tx`
        update service_desk.issue_reports set updated_at = now() where id = ${params.reportId}
      `;
      // Only the visibility flag is recorded — never the note body, which for
      // an internal note must not be reachable through the history surface.
      await addReportHistory(
        params.reportId,
        actor,
        "note_added",
        { visibility: input.visibility },
        tx,
      );
    });

    return reply.code(201).send({ id: noteId });
  });

  /* ── Resolution ────────────────────────────────────────────────────────── */
  app.post("/reports/:reportId/resolution", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    const input = recordReportResolutionInputSchema.parse(request.body);

    if (!canManageReport(toActor(actor))) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });

    await sql.begin(async (tx) => {
      await tx`
        update service_desk.issue_reports
        set resolution = ${redactSecrets(input.resolution.trim())}, updated_at = now()
        where id = ${params.reportId}
      `;
      await addReportHistory(params.reportId, actor, "resolution_recorded", {}, tx);
    });

    return { id: params.reportId };
  });

  /* ── Link a service request ────────────────────────────────────────────── */
  app.post("/reports/:reportId/link-request", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    const input = linkReportRequestInputSchema.parse(request.body);

    if (!canManageReport(toActor(actor))) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });

    if (input.requestId) {
      const exists = await sql<any[]>`
        select id from service_desk.requests where id = ${input.requestId} limit 1
      `;
      if (exists.length === 0) {
        return reply.code(404).send({ message: "Service request not found." });
      }
    }

    const previous = report.related_request_id ?? null;
    await sql.begin(async (tx) => {
      await tx`
        update service_desk.issue_reports
        set related_request_id = ${input.requestId}, updated_at = now()
        where id = ${params.reportId}
      `;
      await addReportHistory(
        params.reportId,
        actor,
        input.requestId ? "request_linked" : "request_unlinked",
        { requestId: input.requestId, previousRequestId: previous },
        tx,
      );
    });

    return { id: params.reportId, relatedRequestId: input.requestId };
  });

  /* ── History ───────────────────────────────────────────────────────────── */
  app.get("/reports/:reportId/history", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);

    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });
    if (!canManageReports(actor.role)) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const rows = await sql<any[]>`
      select id, actor_id, actor_role, event_type, metadata, created_at
      from service_desk.issue_report_history
      where report_id = ${params.reportId}
      order by created_at asc
    `;
    return rows.map((h) => ({
      id: h.id,
      eventType: h.event_type,
      actorId: h.actor_id,
      actorRole: h.actor_role,
      metadata: h.metadata ?? {},
      createdAt: new Date(h.created_at).toISOString(),
    }));
  });

  /* ── Attachments ───────────────────────────────────────────────────────── */
  app.post("/reports/:reportId/attachments/presign", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    if (!isR2Configured()) {
      return reply.code(501).send({ message: "Attachments are not configured." });
    }
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    const input = presignAttachmentInputSchema.parse(request.body);

    if (!isAllowedReportAttachmentType(input.contentType)) {
      return reply.code(400).send({ message: "Only image files can be attached." });
    }
    if (input.sizeBytes > maxReportAttachmentBytes()) {
      return reply.code(400).send({ message: "File is too large." });
    }

    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });
    if (
      !canViewReport(toActor(actor), {
        reporterUserId: report.reporter_user_id ?? null,
        assignedUserId: report.assigned_user_id ?? null,
        status: report.status as ReportStatus,
      })
    ) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const objectKey = buildReportAttachmentObjectKey(params.reportId, input.fileName);
    const { uploadUrl, headers } = await presignAttachmentUpload({
      objectKey,
      contentType: input.contentType,
    });
    return { uploadUrl, objectKey, headers, maxBytes: maxReportAttachmentBytes() };
  });

  app.post("/reports/:reportId/attachments", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    if (!isR2Configured()) {
      return reply.code(501).send({ message: "Attachments are not configured." });
    }
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);
    const input = confirmAttachmentInputSchema.parse(request.body);

    if (!isAllowedReportAttachmentType(input.contentType)) {
      return reply.code(400).send({ message: "Only image files can be attached." });
    }
    if (input.sizeBytes > maxReportAttachmentBytes()) {
      return reply.code(400).send({ message: "File is too large." });
    }
    // The key must sit under this report's prefix, so a metadata row can never
    // be pointed at another report's (or an arbitrary) object.
    if (!input.objectKey.startsWith(`issue-reports/${params.reportId}/`)) {
      return reply.code(400).send({ message: "Invalid object key." });
    }

    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });
    if (
      !canViewReport(toActor(actor), {
        reporterUserId: report.reporter_user_id ?? null,
        assignedUserId: report.assigned_user_id ?? null,
        status: report.status as ReportStatus,
      })
    ) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    const attachmentId = randomUUID();
    await sql.begin(async (tx) => {
      await tx`
        insert into service_desk.issue_report_attachments (
          id, report_id, uploaded_by, object_key, file_name, content_type, size_bytes
        )
        values (
          ${attachmentId}, ${params.reportId}, ${actor.id}, ${input.objectKey},
          ${input.fileName}, ${input.contentType}, ${input.sizeBytes}
        )
      `;
      await addReportHistory(params.reportId, actor, "attachment_added", {}, tx);
    });

    let url = "";
    try {
      url = await attachmentReadUrl({
        objectKey: input.objectKey,
        fileName: input.fileName,
        forceSigned: true,
      });
    } catch {
      /* metadata is saved; URL regenerates on read */
    }
    return reply.code(201).send({
      id: attachmentId,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      url,
      createdAt: new Date().toISOString(),
    });
  });

  app.get("/reports/:reportId/attachments", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const params = z.object({ reportId: z.string().uuid() }).parse(request.params);

    const report = await loadReport(params.reportId);
    if (!report) return reply.code(404).send({ message: "Report not found." });
    if (
      !canViewReport(toActor(actor), {
        reporterUserId: report.reporter_user_id ?? null,
        assignedUserId: report.assigned_user_id ?? null,
        status: report.status as ReportStatus,
      })
    ) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    return signedAttachments(params.reportId);
  });

  /* ── Admin re-identification (internal) ────────────────────────────────── */
  // Deliberately the ONLY path from a reference back to a user id. The gateway
  // and this service both enforce Admin-only before resolving.
  app.post("/internal/reports/resolve-reference", async (request, reply) => {
    if (!(await guardAdminReportAccess(request, reply))) return;
    const input = reporterLookupInputSchema.parse(request.body);
    const reference = normaliseReporterReference(input.reporterReference);

    const rows = await sql<any[]>`
      select distinct reporter_user_id
      from service_desk.issue_reports
      where reporter_reference = ${reference} and reporter_user_id is not null
    `;
    if (rows.length === 0) {
      return reply.code(404).send({ message: "No account matches that reference." });
    }
    const counts = await sql<{ count: string }[]>`
      select count(*)::text as count
      from service_desk.issue_reports
      where reporter_reference = ${reference}
    `;
    return {
      reporterReference: reference,
      // More than one id behind a reference means a digest collision — surface
      // it rather than silently picking the first.
      userIds: rows.map((r) => r.reporter_user_id),
      reportCount: Number(counts[0].count),
    };
  });

  /** Record the lookup against every report the reference covers, so a
   *  re-identification is permanently attributable. */
  app.post("/internal/reports/record-lookup", async (request, reply) => {
    const actor = await guardAdminReportAccess(request, reply);
    if (!actor) return;
    const input = reporterLookupInputSchema.parse(request.body);
    const reference = normaliseReporterReference(input.reporterReference);

    const rows = await sql<any[]>`
      select id from service_desk.issue_reports where reporter_reference = ${reference}
    `;
    await sql.begin(async (tx) => {
      for (const row of rows) {
        await addReportHistory(row.id, actor, "reporter_identified", {}, tx);
      }
    });
    return { recorded: rows.length };
  });

  /* ── Account deletion hook (internal) ──────────────────────────────────── */
  // Reports live here, accounts live in auth, and there is no FK between them.
  // On permanent deletion the reporter id is nulled while the reference stays,
  // so the report survives as an anonymous artifact with no path to a person.
  app.post("/internal/reports/anonymize-reporter", async (request, reply) => {
    if (!ensureInternal(request.headers)) {
      return reply.code(401).send({ message: "Unauthorized" });
    }
    await ensureIssueReportSchema();
    const input = z.object({ userId: z.string().uuid() }).parse(request.body);

    const rows = await sql<any[]>`
      update service_desk.issue_reports
      set reporter_user_id = null, updated_at = now()
      where reporter_user_id = ${input.userId}
      returning id
    `;
    await sql`
      update service_desk.issue_reports
      set assigned_user_id = null
      where assigned_user_id = ${input.userId}
    `;
    return { anonymized: rows.length };
  });
}
