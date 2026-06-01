import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { z } from "zod";
import {
  assignRequestInputSchema,
  cancelRequestInputSchema,
  catalogProductSchema,
  createRequestMessageInputSchema,
  createServiceRequestInputSchema,
  requestMessageSchema,
  requestStatusGroupSchema,
  requestStatusSchema,
  roleSchema,
  serviceRequestSchema,
  updateServiceRequestInputSchema,
  updateRequestStatusInputSchema,
} from "@elkatech/contracts";
import { fetchJson, getDb, getEnv, internalHeaders } from "@elkatech/config";
import {
  canClaimRequest,
  canEditRequestDetails,
  canReplyToRequest,
  canUpdateRequestStatus,
  canViewRequest,
  isValidStatusTransition,
  type WorkflowActor,
} from "./workflow";

const app = Fastify({ logger: true });
const sql = getDb();
const env = getEnv();

const userContextSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: roleSchema,
  displayName: z.string().min(1),
});

type UserContext = z.infer<typeof userContextSchema>;

function getUserContext(headers: Record<string, unknown>): UserContext {
  return userContextSchema.parse({
    id: headers["x-user-id"],
    email: headers["x-user-email"],
    role: headers["x-user-role"],
    displayName: headers["x-user-display-name"],
  });
}

function toWorkflowActor(actor: UserContext): WorkflowActor {
  return {
    id: actor.id,
    role: actor.role,
  };
}

function ensureInternal(headers: Record<string, unknown>) {
  return headers["x-internal-token"] === env.INTERNAL_SERVICE_TOKEN;
}

async function emitOutbox(eventType: string, aggregateId: string, payload: Record<string, unknown>) {
  await sql`
    insert into service_desk.outbox (id, aggregate_type, aggregate_id, event_type, payload)
    values (${randomUUID()}, ${"request"}, ${aggregateId}, ${eventType}, ${sql.json(payload as any)})
  `;
}

async function addHistory(
  requestId: string,
  actor: UserContext,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  await sql`
    insert into service_desk.request_history (id, request_id, actor_id, actor_role, event_type, metadata)
    values (
      ${randomUUID()},
      ${requestId},
      ${actor.id},
      ${actor.role},
      ${eventType},
      ${sql.json(metadata as any)}
    )
  `;
}

function buildRequestNumber() {
  return `SRV-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
}

function statusBelongsToGroup(
  status: z.infer<typeof requestStatusSchema>,
  group: z.infer<typeof requestStatusGroupSchema>,
  actorRole: UserContext["role"],
) {
  if (group === "archived") return status === "closed";
  if (group === "resolved") return status === "resolved";
  if (group === "pending") return status === "waiting_for_customer";
  if (group === "in_progress") return status === "assigned" || status === "in_progress";
  if (group === "open") {
    return (
      status === "new" ||
      status === "triaged" ||
      (actorRole === "customer" && status === "waiting_for_customer")
    );
  }
  return status !== "closed";
}

function mapRequestRow(row: any) {
  return serviceRequestSchema.parse({
    id: row.id,
    requestNumber: row.request_number,
    customerId: row.customer_id,
    productId: row.product_id,
    productSnapshot: row.product_snapshot,
    subject: row.subject,
    description: row.description,
    contactPhone: row.contact_phone,
    siteLocation: row.site_location,
    serialNumber: row.serial_number,
    priority: row.priority,
    status: row.status,
    assignedEngineerId: row.assigned_engineer_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  });
}

async function getCatalogProduct(productId: string) {
  return fetchJson<z.infer<typeof catalogProductSchema>>(
    `${env.CATALOG_SERVICE_URL}/products/${productId}`,
    {
      headers: internalHeaders(),
    },
  );
}

async function getUserById(userId: string) {
  return fetchJson<{
    id: string;
    email: string;
    displayName: string;
    role: "customer" | "engineer" | "admin";
    emailVerified: boolean;
    createdAt: string;
  }>(`${env.AUTH_SERVICE_URL}/internal/users/${userId}`, {
    headers: internalHeaders(),
  });
}

app.get("/health", async () => ({
  ok: true,
  service: "service-desk",
  environment: env.NODE_ENV,
}));

app.post("/requests", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const input = createServiceRequestInputSchema.parse(request.body);
  const product = await getCatalogProduct(input.productId);
  const requestId = randomUUID();
  const requestNumber = buildRequestNumber();
  const now = new Date().toISOString();

  const productSnapshot = {
    id: product.id,
    categorySlug: product.categorySlug,
    slug: product.slug,
    name: product.name,
    priceDisplay: product.priceDisplay,
  };

  await sql`
    insert into service_desk.requests (
      id,
      request_number,
      customer_id,
      customer_email,
      product_id,
      product_snapshot,
      subject,
      description,
      contact_phone,
      site_location,
      serial_number,
      priority,
      status
    )
    values (
      ${requestId},
      ${requestNumber},
      ${actor.id},
      ${actor.email},
      ${product.id},
      ${sql.json(productSnapshot as any)},
      ${input.subject},
      ${input.description},
      ${input.contactPhone},
      ${input.siteLocation},
      ${input.serialNumber ?? null},
      ${input.priority},
      ${"new"}
    )
  `;

  await addHistory(requestId, actor, "request_created", { requestNumber, productId: product.id });
  await emitOutbox("request.created", requestId, {
    requestId,
    requestNumber,
    customerId: actor.id,
    customerEmail: actor.email,
    customerName: actor.displayName,
    productName: product.name,
    productId: product.id,
    subject: input.subject,
    status: "new",
    createdAt: now,
  });

  return serviceRequestSchema.parse({
    id: requestId,
    requestNumber,
    customerId: actor.id,
    productId: product.id,
    productSnapshot,
    subject: input.subject,
    description: input.description,
    contactPhone: input.contactPhone,
    siteLocation: input.siteLocation,
    serialNumber: input.serialNumber ?? null,
    priority: input.priority,
    status: "new",
    assignedEngineerId: null,
    createdAt: now,
    updatedAt: now,
  });
});

app.get("/requests", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const querySchema = z.object({
    scope: z.enum(["mine", "queue"]).optional(),
    statusGroup: requestStatusGroupSchema.default("all"),
  });
  const query = querySchema.parse(request.query);

  let rows;
  if (actor.role === "customer") {
    rows = await sql<any[]>`
      select *
      from service_desk.requests
      where customer_id = ${actor.id}
      order by created_at desc
    `;
  } else if (query.scope === "queue") {
    rows = await sql<any[]>`
      select *
      from service_desk.requests
      where status != 'closed'
        and (
          assigned_engineer_id is null
          or assigned_engineer_id = ${actor.id}
        )
      order by created_at desc
    `;
  } else if (actor.role === "engineer") {
    rows = await sql<any[]>`
      select *
      from service_desk.requests
      where assigned_engineer_id = ${actor.id}
        or (
          assigned_engineer_id is null
          and status != 'closed'
        )
      order by created_at desc
    `;
  } else {
    rows = await sql<any[]>`
      select *
      from service_desk.requests
      order by created_at desc
    `;
  }

  return rows
    .filter((row) => statusBelongsToGroup(row.status, query.statusGroup, actor.role))
    .map(mapRequestRow);
});

app.get("/requests/:requestId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);

  const rows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;

  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  const allowed = canViewRequest(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status,
  });

  if (!allowed) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const messageRows =
    actor.role === "customer"
      ? await sql<any[]>`
          select *
          from service_desk.request_messages
          where request_id = ${params.requestId}
            and visibility = 'customer_visible'
          order by created_at asc
        `
      : await sql<any[]>`
          select *
          from service_desk.request_messages
          where request_id = ${params.requestId}
          order by created_at asc
        `;

  const historyRows =
    actor.role === "customer"
      ? []
      : await sql<any[]>`
          select *
          from service_desk.request_history
          where request_id = ${params.requestId}
          order by created_at asc
        `;

  return {
    request: serviceRequestSchema.parse({
      id: current.id,
      requestNumber: current.request_number,
      customerId: current.customer_id,
      productId: current.product_id,
      productSnapshot: current.product_snapshot,
      subject: current.subject,
      description: current.description,
      contactPhone: current.contact_phone,
      siteLocation: current.site_location,
      serialNumber: current.serial_number,
      priority: current.priority,
      status: current.status,
      assignedEngineerId: current.assigned_engineer_id,
      createdAt: new Date(current.created_at).toISOString(),
      updatedAt: new Date(current.updated_at).toISOString(),
    }),
    messages: messageRows.map((row) =>
      requestMessageSchema.parse({
        id: row.id,
        requestId: row.request_id,
        authorId: row.author_id,
        authorRole: row.author_role,
        visibility: row.visibility,
        body: row.body,
        createdAt: new Date(row.created_at).toISOString(),
      }),
    ),
    history: historyRows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      eventType: row.event_type,
      metadata: row.metadata,
      createdAt: new Date(row.created_at).toISOString(),
    })),
  };
});

app.patch("/requests/:requestId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = updateServiceRequestInputSchema.parse(request.body);

  const rows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;

  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  if (
    !canEditRequestDetails(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const nextDetails = {
    subject: input.subject ?? current.subject,
    description: input.description ?? current.description,
    contactPhone: input.contactPhone ?? current.contact_phone,
    siteLocation: input.siteLocation ?? current.site_location,
    serialNumber:
      input.serialNumber === undefined
        ? current.serial_number
        : input.serialNumber?.trim() || null,
  };

  const changedFields = [
    current.subject !== nextDetails.subject ? "subject" : null,
    current.description !== nextDetails.description ? "description" : null,
    current.contact_phone !== nextDetails.contactPhone ? "contactPhone" : null,
    current.site_location !== nextDetails.siteLocation ? "siteLocation" : null,
    (current.serial_number ?? null) !== (nextDetails.serialNumber ?? null) ? "serialNumber" : null,
  ].filter((field): field is string => Boolean(field));

  if (changedFields.length === 0) {
    return mapRequestRow(current);
  }

  const updatedRows = await sql<any[]>`
    update service_desk.requests
    set subject = ${nextDetails.subject},
        description = ${nextDetails.description},
        contact_phone = ${nextDetails.contactPhone},
        site_location = ${nextDetails.siteLocation},
        serial_number = ${nextDetails.serialNumber},
        updated_at = now()
    where id = ${params.requestId}
    returning *
  `;

  await addHistory(params.requestId, actor, "request_updated", {
    fields: changedFields,
  });

  return mapRequestRow(updatedRows[0]);
});

app.post("/requests/:requestId/messages", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = createRequestMessageInputSchema.parse(request.body);

  if (actor.role === "customer" && input.visibility !== "customer_visible") {
    return reply.code(403).send({ message: "Customers cannot add internal notes." });
  }

  const requestRows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;

  const current = requestRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  if (
    !canReplyToRequest(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const messageId = randomUUID();
  await sql`
    insert into service_desk.request_messages (
      id,
      request_id,
      author_id,
      author_role,
      visibility,
      body
    )
    values (
      ${messageId},
      ${params.requestId},
      ${actor.id},
      ${actor.role},
      ${input.visibility},
      ${input.body}
    )
  `;

  await sql`
    update service_desk.requests
    set updated_at = now()
    where id = ${params.requestId}
  `;

  await addHistory(params.requestId, actor, "message_added", {
    visibility: input.visibility,
  });

  if (actor.role === "customer") {
    await emitOutbox("request.customer_message_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: input.body,
    });
  } else if (input.visibility === "customer_visible") {
    await emitOutbox("request.staff_reply_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: input.body,
      authorName: actor.displayName,
    });
  }

  return requestMessageSchema.parse({
    id: messageId,
    requestId: params.requestId,
    authorId: actor.id,
    authorRole: actor.role,
    visibility: input.visibility,
    body: input.body,
    createdAt: new Date().toISOString(),
  });
});

app.post("/requests/:requestId/claim", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  if (actor.role === "customer") {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);

  const rows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  // Explicit conflict path: if the request is already assigned, never
  // re-claim — neither by the current owner (would create duplicate
  // "Request Claimed" history) nor by anyone else (would silently steal
  // another engineer's work). Admin reassignment uses `/assign` instead.
  if (current.assigned_engineer_id) {
    const message =
      current.assigned_engineer_id === actor.id
        ? "You have already claimed this request."
        : "This request is already assigned to another engineer.";
    return reply.code(409).send({ message });
  }

  if (
    !canClaimRequest(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  await sql`
    update service_desk.requests
    set assigned_engineer_id = ${actor.id},
        status = ${"assigned"},
        updated_at = now()
    where id = ${params.requestId}
  `;

  await addHistory(params.requestId, actor, "request_claimed", {});
  await emitOutbox("request.assigned", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    engineerEmail: actor.email,
    engineerName: actor.displayName,
    customerEmail: current.customer_email,
    status: "assigned",
  });

  return { ok: true };
});

app.post("/requests/:requestId/assign", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  if (actor.role !== "admin") {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = assignRequestInputSchema.parse(request.body);
  const engineer = await getUserById(input.engineerId);

  const rows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  if (engineer.role !== "engineer") {
    return reply.code(400).send({ message: "Only engineer accounts can be assigned." });
  }

  const previousEngineerId: string | null = current.assigned_engineer_id ?? null;
  // No-op guard: re-assigning the same engineer should not pollute history.
  if (previousEngineerId === engineer.id) {
    return { ok: true };
  }

  await sql`
    update service_desk.requests
    set assigned_engineer_id = ${engineer.id},
        status = ${"assigned"},
        updated_at = now()
    where id = ${params.requestId}
  `;

  // Distinguish first-time assignment from reassignment so the activity
  // timeline reads correctly ("Request Reassigned" vs "Request Assigned").
  const eventType = previousEngineerId ? "request_reassigned" : "request_assigned";
  await addHistory(params.requestId, actor, eventType, {
    engineerId: engineer.id,
    engineerEmail: engineer.email,
    previousEngineerId,
  });
  await emitOutbox("request.assigned", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    engineerEmail: engineer.email,
    engineerName: engineer.displayName,
    customerEmail: current.customer_email,
    status: "assigned",
  });

  return { ok: true };
});

app.post("/requests/:requestId/status", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  if (actor.role === "customer") {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = updateRequestStatusInputSchema.parse(request.body);

  const currentRows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = currentRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  const nextStatus = requestStatusSchema.parse(input.status);
  if (
    !canUpdateRequestStatus(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  if (!isValidStatusTransition(current.status, nextStatus)) {
    return reply.code(400).send({ message: "Invalid status transition." });
  }

  await sql`
    update service_desk.requests
    set status = ${nextStatus},
        updated_at = now()
    where id = ${params.requestId}
  `;

  const noteBody = input.note?.trim();
  const noteVisibility = input.visibility ?? "customer_visible";
  if (noteBody) {
    await sql`
      insert into service_desk.request_messages (
        id,
        request_id,
        author_id,
        author_role,
        visibility,
        body
      )
      values (
        ${randomUUID()},
        ${params.requestId},
        ${actor.id},
        ${actor.role},
        ${noteVisibility},
        ${noteBody}
      )
    `;
  }

  await addHistory(
    params.requestId,
    actor,
    "status_changed",
    noteBody
      ? { from: current.status, to: nextStatus, noteVisibility }
      : { from: current.status, to: nextStatus },
  );
  await emitOutbox("request.status_changed", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    customerEmail: current.customer_email,
    previousStatus: current.status,
    status: nextStatus,
    actorName: actor.displayName,
  });

  if (noteBody && noteVisibility === "customer_visible") {
    await emitOutbox("request.staff_reply_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: noteBody,
      authorName: actor.displayName,
    });
  }

  return { ok: true };
});

app.post("/requests/:requestId/cancel", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = cancelRequestInputSchema.parse(request.body ?? {});

  const currentRows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = currentRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  if (current.status === "closed") {
    return { ok: true };
  }

  if (actor.role === "customer") {
    if (current.customer_id !== actor.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    if (!["new", "triaged", "waiting_for_customer"].includes(current.status)) {
      return reply.code(400).send({
        message: "Only open or pending requests can be cancelled by customers.",
      });
    }
  } else if (
    !canUpdateRequestStatus(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  await sql`
    update service_desk.requests
    set status = ${"closed"},
        updated_at = now()
    where id = ${params.requestId}
  `;

  const reason = input.reason?.trim();
  await addHistory(
    params.requestId,
    actor,
    actor.role === "customer" ? "request_cancelled" : "request_archived",
    reason ? { from: current.status, to: "closed", reason } : { from: current.status, to: "closed" },
  );
  await emitOutbox("request.status_changed", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    customerEmail: current.customer_email,
    previousStatus: current.status,
    status: "closed",
    actorName: actor.displayName,
  });

  return { ok: true };
});

const port = Number(new URL(env.SERVICE_DESK_URL).port || "4003");

if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}

export default async function handler(req: any, res: any) {
  await app.ready();
  if (req.url?.startsWith('/api/internal-service-desk')) {
    req.url = req.url.replace('/api/internal-service-desk', '') || '/';
  }
  app.server.emit('request', req, res);
}
