// services/service-desk/src/index.ts
import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { z as z3 } from "zod";

// packages/contracts/src/index.ts
import { z } from "zod";
var roleSchema = z.enum(["customer", "engineer", "admin"]);
var requestPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
var requestStatusSchema = z.enum([
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed"
]);
var messageVisibilitySchema = z.enum(["customer_visible", "internal_note"]);
var productSpecSchema = z.tuple([z.string(), z.string()]);
var catalogProductSchema = z.object({
  id: z.string(),
  categorySlug: z.string(),
  slug: z.string(),
  name: z.string(),
  priceDisplay: z.string(),
  brochureUrl: z.string().url().optional(),
  images: z.array(z.string()),
  specs: z.array(productSpecSchema),
  highlights: z.array(z.string())
});
var catalogCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  routePath: z.string(),
  name: z.string(),
  intro: z.string(),
  products: z.array(catalogProductSchema)
});
var authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: roleSchema,
  emailVerified: z.boolean(),
  createdAt: z.string()
});
var productSnapshotSchema = z.object({
  id: z.string(),
  categorySlug: z.string(),
  slug: z.string(),
  name: z.string(),
  priceDisplay: z.string()
});
var serviceRequestSchema = z.object({
  id: z.string(),
  requestNumber: z.string(),
  customerId: z.string(),
  productId: z.string(),
  productSnapshot: productSnapshotSchema,
  subject: z.string(),
  description: z.string(),
  contactPhone: z.string(),
  siteLocation: z.string(),
  serialNumber: z.string().nullable().optional(),
  priority: requestPrioritySchema,
  status: requestStatusSchema,
  assignedEngineerId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string()
});
var requestMessageSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  authorId: z.string(),
  authorRole: roleSchema,
  visibility: messageVisibilitySchema,
  body: z.string(),
  createdAt: z.string()
});
var signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  inviteToken: z.string().optional()
});
var loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
var forgotPasswordInputSchema = z.object({
  email: z.string().email()
});
var resetPasswordInputSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8)
});
var verifyEmailInputSchema = z.object({
  token: z.string().min(20)
});
var inviteUserInputSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2),
  role: z.enum(["engineer", "admin"])
});
var createServiceRequestInputSchema = z.object({
  productId: z.string(),
  subject: z.string().min(4),
  description: z.string().min(10),
  contactPhone: z.string().min(7),
  siteLocation: z.string().min(2),
  serialNumber: z.string().optional(),
  priority: requestPrioritySchema.default("normal")
});
var createRequestMessageInputSchema = z.object({
  body: z.string().min(1),
  visibility: messageVisibilitySchema
});
var assignRequestInputSchema = z.object({
  engineerId: z.string()
});
var updateRequestStatusInputSchema = z.object({
  status: requestStatusSchema
});
var sessionResponseSchema = z.object({
  sessionToken: z.string(),
  csrfToken: z.string(),
  user: authUserSchema
});
var domainEventTypeSchema = z.enum([
  "user.registered",
  "user.email_verified",
  "user.password_reset_requested",
  "request.created",
  "request.assigned",
  "request.status_changed",
  "request.customer_message_posted",
  "request.staff_reply_posted"
]);
var domainEventSchema = z.object({
  id: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  eventType: domainEventTypeSchema,
  payload: z.record(z.any()),
  occurredAt: z.string()
});

// packages/config/src/crypto.ts
import { createHash, randomBytes } from "node:crypto";

// packages/config/src/db.ts
import postgres from "postgres";

// packages/config/src/env.ts
import { z as z2 } from "zod";
if (!process.env.VERCEL) {
  const { config } = await import("dotenv");
  config();
}
var envSchema = z2.object({
  NODE_ENV: z2.enum(["development", "test", "production"]).default("development"),
  POSTGRES_URL: z2.string().optional(),
  KV_URL: z2.string().optional(),
  REDIS_URL: z2.string().optional(),
  DATABASE_URL: z2.string().min(1).default("postgres://elkatech:elkatech@127.0.0.1:5432/elkatech"),
  INTERNAL_SERVICE_TOKEN: z2.string().min(1).default("dev-internal-token"),
  APP_BASE_URL: z2.string().url().default("http://127.0.0.1:8080"),
  GATEWAY_URL: z2.string().url().default("http://127.0.0.1:4000"),
  AUTH_SERVICE_URL: z2.string().url().default("http://127.0.0.1:4001"),
  CATALOG_SERVICE_URL: z2.string().url().default("http://127.0.0.1:4002"),
  SERVICE_DESK_URL: z2.string().url().default("http://127.0.0.1:4003"),
  NOTIFICATION_SERVICE_URL: z2.string().url().default("http://127.0.0.1:4004"),
  SESSION_COOKIE_NAME: z2.string().default("elkatech_session"),
  CSRF_COOKIE_NAME: z2.string().default("elkatech_csrf"),
  SESSION_TTL_HOURS: z2.coerce.number().int().positive().default(168),
  SMTP_HOST: z2.string().default("127.0.0.1"),
  SMTP_PORT: z2.coerce.number().int().positive().default(1025),
  SMTP_FROM: z2.string().email().default("no-reply@elkatech.local"),
  BOOTSTRAP_ADMIN_EMAIL: z2.string().email().default("admin@elkatech.local"),
  BOOTSTRAP_ADMIN_PASSWORD: z2.string().min(8).default("ChangeMe123!")
});
var cachedEnv = null;
function getEnv() {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
    if (process.env.VERCEL === "1" && process.env.VERCEL_URL) {
      const publicUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL}`;
      cachedEnv.APP_BASE_URL = publicUrl;
      cachedEnv.GATEWAY_URL = `${publicUrl}/api`;
      cachedEnv.AUTH_SERVICE_URL = `${publicUrl}/api/internal-auth`;
      cachedEnv.CATALOG_SERVICE_URL = `${publicUrl}/api/internal-catalog`;
      cachedEnv.SERVICE_DESK_URL = `${publicUrl}/api/internal-service-desk`;
      cachedEnv.NOTIFICATION_SERVICE_URL = `${publicUrl}/api/internal-notification`;
    }
  }
  return cachedEnv;
}

// packages/config/src/db.ts
var sqlClient = null;
function getDb() {
  if (!sqlClient) {
    const dbUrl = getEnv().POSTGRES_URL || getEnv().DATABASE_URL;
    sqlClient = postgres(dbUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
  }
  return sqlClient;
}

// packages/config/src/http.ts
function internalHeaders(extra = {}) {
  return {
    "content-type": "application/json",
    "x-internal-token": getEnv().INTERNAL_SERVICE_TOKEN,
    ...extra
  };
}
async function fetchJson(input, init = {}) {
  const response = await fetch(input, init);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
  }
  if (response.status === 204) {
    return void 0;
  }
  return await response.json();
}

// packages/config/src/redis.ts
import { Redis } from "ioredis";

// services/service-desk/src/workflow.ts
var statusTransitions = {
  new: ["triaged", "assigned", "closed"],
  triaged: ["assigned", "waiting_for_customer", "closed"],
  assigned: ["in_progress", "waiting_for_customer", "resolved", "closed"],
  in_progress: ["waiting_for_customer", "resolved", "closed"],
  waiting_for_customer: ["in_progress", "resolved", "closed"],
  resolved: ["in_progress", "closed"],
  closed: []
};
function canViewRequest(actor, request) {
  if (actor.role === "admin") {
    return true;
  }
  if (actor.role === "customer") {
    return request.customerId === actor.id;
  }
  if (request.assignedEngineerId === actor.id) {
    return true;
  }
  return request.assignedEngineerId === null && request.status !== "closed";
}
function canReplyToRequest(actor, request) {
  if (actor.role === "admin") {
    return true;
  }
  if (actor.role === "customer") {
    return request.customerId === actor.id;
  }
  return request.assignedEngineerId === actor.id;
}
function canClaimRequest(actor, request) {
  if (request.status === "closed") {
    return false;
  }
  if (actor.role === "admin") {
    return true;
  }
  if (actor.role !== "engineer") {
    return false;
  }
  return !request.assignedEngineerId || request.assignedEngineerId === actor.id;
}
function canUpdateRequestStatus(actor, request) {
  if (actor.role === "admin") {
    return true;
  }
  if (actor.role !== "engineer") {
    return false;
  }
  return request.assignedEngineerId === actor.id;
}
function isValidStatusTransition(current, next) {
  if (current === next) {
    return true;
  }
  return statusTransitions[current].includes(next);
}

// services/service-desk/src/index.ts
var app = Fastify({ logger: true });
var sql = getDb();
var env = getEnv();
var userContextSchema = z3.object({
  id: z3.string().uuid(),
  email: z3.string().email(),
  role: roleSchema,
  displayName: z3.string().min(1)
});
function getUserContext(headers) {
  return userContextSchema.parse({
    id: headers["x-user-id"],
    email: headers["x-user-email"],
    role: headers["x-user-role"],
    displayName: headers["x-user-display-name"]
  });
}
function toWorkflowActor(actor) {
  return {
    id: actor.id,
    role: actor.role
  };
}
function ensureInternal(headers) {
  return headers["x-internal-token"] === env.INTERNAL_SERVICE_TOKEN;
}
async function emitOutbox(eventType, aggregateId, payload) {
  await sql`
    insert into service_desk.outbox (id, aggregate_type, aggregate_id, event_type, payload)
    values (${randomUUID()}, ${"request"}, ${aggregateId}, ${eventType}, ${sql.json(payload)})
  `;
}
async function addHistory(requestId, actor, eventType, metadata = {}) {
  await sql`
    insert into service_desk.request_history (id, request_id, actor_id, actor_role, event_type, metadata)
    values (
      ${randomUUID()},
      ${requestId},
      ${actor.id},
      ${actor.role},
      ${eventType},
      ${sql.json(metadata)}
    )
  `;
}
function buildRequestNumber() {
  return `SRV-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
}
async function getCatalogProduct(productId) {
  return fetchJson(
    `${env.CATALOG_SERVICE_URL}/products/${productId}`,
    {
      headers: internalHeaders()
    }
  );
}
async function getUserById(userId) {
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users/${userId}`, {
    headers: internalHeaders()
  });
}
app.get("/health", async () => ({ ok: true, service: "service-desk" }));
app.post("/requests", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const input = createServiceRequestInputSchema.parse(request.body);
  const product = await getCatalogProduct(input.productId);
  const requestId = randomUUID();
  const requestNumber = buildRequestNumber();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const productSnapshot = {
    id: product.id,
    categorySlug: product.categorySlug,
    slug: product.slug,
    name: product.name,
    priceDisplay: product.priceDisplay
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
      ${sql.json(productSnapshot)},
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
    createdAt: now
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
    updatedAt: now
  });
});
app.get("/requests", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const querySchema = z3.object({
    scope: z3.enum(["mine", "queue"]).optional()
  });
  const query = querySchema.parse(request.query);
  let rows;
  if (actor.role === "customer") {
    rows = await sql`
      select *
      from service_desk.requests
      where customer_id = ${actor.id}
      order by created_at desc
    `;
  } else if (query.scope === "queue") {
    rows = await sql`
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
    rows = await sql`
      select *
      from service_desk.requests
      where assigned_engineer_id = ${actor.id}
      order by created_at desc
    `;
  } else {
    rows = await sql`
      select *
      from service_desk.requests
      order by created_at desc
    `;
  }
  return rows.map(
    (row) => serviceRequestSchema.parse({
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
      updatedAt: new Date(row.updated_at).toISOString()
    })
  );
});
app.get("/requests/:requestId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const rows = await sql`
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
    status: current.status
  });
  if (!allowed) {
    return reply.code(403).send({ message: "Forbidden" });
  }
  const messageRows = actor.role === "customer" ? await sql`
          select *
          from service_desk.request_messages
          where request_id = ${params.requestId}
            and visibility = 'customer_visible'
          order by created_at asc
        ` : await sql`
          select *
          from service_desk.request_messages
          where request_id = ${params.requestId}
          order by created_at asc
        `;
  const historyRows = actor.role === "customer" ? [] : await sql`
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
      updatedAt: new Date(current.updated_at).toISOString()
    }),
    messages: messageRows.map(
      (row) => requestMessageSchema.parse({
        id: row.id,
        requestId: row.request_id,
        authorId: row.author_id,
        authorRole: row.author_role,
        visibility: row.visibility,
        body: row.body,
        createdAt: new Date(row.created_at).toISOString()
      })
    ),
    history: historyRows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      eventType: row.event_type,
      metadata: row.metadata,
      createdAt: new Date(row.created_at).toISOString()
    }))
  };
});
app.post("/requests/:requestId/messages", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = createRequestMessageInputSchema.parse(request.body);
  if (actor.role === "customer" && input.visibility !== "customer_visible") {
    return reply.code(403).send({ message: "Customers cannot add internal notes." });
  }
  const requestRows = await sql`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = requestRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }
  if (!canReplyToRequest(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status
  })) {
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
    visibility: input.visibility
  });
  if (actor.role === "customer") {
    await emitOutbox("request.customer_message_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: input.body
    });
  } else if (input.visibility === "customer_visible") {
    await emitOutbox("request.staff_reply_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: input.body,
      authorName: actor.displayName
    });
  }
  return requestMessageSchema.parse({
    id: messageId,
    requestId: params.requestId,
    authorId: actor.id,
    authorRole: actor.role,
    visibility: input.visibility,
    body: input.body,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
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
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const rows = await sql`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }
  if (!canClaimRequest(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status
  })) {
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
    status: "assigned"
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
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = assignRequestInputSchema.parse(request.body);
  const engineer = await getUserById(input.engineerId);
  const rows = await sql`
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
  await sql`
    update service_desk.requests
    set assigned_engineer_id = ${engineer.id},
        status = ${"assigned"},
        updated_at = now()
    where id = ${params.requestId}
  `;
  await addHistory(params.requestId, actor, "request_assigned", {
    engineerId: engineer.id,
    engineerEmail: engineer.email
  });
  await emitOutbox("request.assigned", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    engineerEmail: engineer.email,
    engineerName: engineer.displayName,
    customerEmail: current.customer_email,
    status: "assigned"
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
  const paramsSchema = z3.object({ requestId: z3.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = updateRequestStatusInputSchema.parse(request.body);
  const currentRows = await sql`
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
  if (!canUpdateRequestStatus(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status
  })) {
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
  await addHistory(params.requestId, actor, "status_changed", {
    from: current.status,
    to: nextStatus
  });
  await emitOutbox("request.status_changed", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    customerEmail: current.customer_email,
    previousStatus: current.status,
    status: nextStatus,
    actorName: actor.displayName
  });
  return { ok: true };
});
var port = Number(new URL(env.SERVICE_DESK_URL).port || "4003");
if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
async function handler(req, res) {
  await app.ready();
  if (req.url?.startsWith("/api/internal-service-desk")) {
    req.url = req.url.replace("/api/internal-service-desk", "") || "/";
  }
  app.server.emit("request", req, res);
}
export {
  handler as default
};
