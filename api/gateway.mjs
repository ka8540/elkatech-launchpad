// services/gateway/src/index.ts
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
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

// services/gateway/src/index.ts
var env = getEnv();
var app = Fastify({ logger: true });
await app.register(cookie);
await app.register(rateLimit, {
  global: false,
  max: 10,
  timeWindow: "1 minute"
});
function getSessionCookie(request) {
  return request.cookies[env.SESSION_COOKIE_NAME];
}
function getCsrfCookie(request) {
  return request.cookies[env.CSRF_COOKIE_NAME];
}
async function resolveSession(sessionToken) {
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/session/resolve`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({ sessionToken })
  });
}
function setSessionCookies(reply, payload) {
  const secure = env.NODE_ENV === "production";
  reply.setCookie(env.SESSION_COOKIE_NAME, payload.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60
  });
  reply.setCookie(env.CSRF_COOKIE_NAME, payload.csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60
  });
}
function clearSessionCookies(reply) {
  reply.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });
  reply.clearCookie(env.CSRF_COOKIE_NAME, { path: "/" });
}
async function requireSession(request, reply, allowedRoles) {
  const sessionToken = getSessionCookie(request);
  if (!sessionToken) {
    reply.code(401).send({ message: "Authentication required." });
    return null;
  }
  try {
    const session = await resolveSession(sessionToken);
    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      reply.code(403).send({ message: "Forbidden" });
      return null;
    }
    return { ...session, sessionToken };
  } catch {
    clearSessionCookies(reply);
    reply.code(401).send({ message: "Session expired." });
    return null;
  }
}
function assertCsrf(request, reply) {
  const csrfCookie = getCsrfCookie(request);
  const csrfHeader = request.headers["x-csrf-token"];
  if (!csrfCookie || csrfHeader !== csrfCookie) {
    reply.code(403).send({ message: "CSRF validation failed." });
    return false;
  }
  return true;
}
function userHeaders(user) {
  return internalHeaders({
    "x-user-id": user.id,
    "x-user-email": user.email,
    "x-user-role": user.role,
    "x-user-display-name": user.displayName
  });
}
app.get("/health", async () => ({ ok: true, service: "gateway" }));
app.post("/api/auth/signup", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
  const input = signUpInputSchema.parse(request.body);
  const response = await fetchJson(`${env.AUTH_SERVICE_URL}/signup`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
  return reply.code(201).send(response);
});
app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
  const input = loginInputSchema.parse(request.body);
  const response = await fetchJson(`${env.AUTH_SERVICE_URL}/login`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
  setSessionCookies(reply, response);
  return {
    user: response.user
  };
});
app.post("/api/auth/logout", async (request, reply) => {
  const sessionToken = getSessionCookie(request);
  if (sessionToken) {
    await fetchJson(`${env.AUTH_SERVICE_URL}/logout`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ sessionToken })
    });
  }
  clearSessionCookies(reply);
  return { ok: true };
});
app.get("/api/auth/me", async (request, reply) => {
  const sessionToken = getSessionCookie(request);
  if (!sessionToken) {
    clearSessionCookies(reply);
    return { user: null };
  }
  try {
    const session = await resolveSession(sessionToken);
    reply.setCookie(env.CSRF_COOKIE_NAME, session.csrfToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/",
      maxAge: env.SESSION_TTL_HOURS * 60 * 60
    });
    return { user: session.user };
  } catch {
    clearSessionCookies(reply);
    return { user: null };
  }
});
app.post("/api/auth/forgot-password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request) => {
  const input = forgotPasswordInputSchema.parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/forgot-password`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
});
app.post("/api/auth/reset-password", async (request) => {
  const input = resetPasswordInputSchema.parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/reset-password`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
});
app.post("/api/auth/verify-email", async (request) => {
  const input = verifyEmailInputSchema.parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/verify-email`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input)
  });
});
app.get("/api/catalog/categories", async () => {
  return fetchJson(`${env.CATALOG_SERVICE_URL}/categories`, {
    headers: internalHeaders()
  });
});
app.get("/api/catalog/products", async (request) => {
  const queryString = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
  return fetchJson(`${env.CATALOG_SERVICE_URL}/products${queryString}`, {
    headers: internalHeaders()
  });
});
app.get("/api/catalog/products/:productId", async (request) => {
  const params = z3.object({ productId: z3.string() }).parse(request.params);
  return fetchJson(`${env.CATALOG_SERVICE_URL}/products/${params.productId}`, {
    headers: internalHeaders()
  });
});
app.post("/api/requests", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  if (!session.user.emailVerified) {
    return reply.code(403).send({ message: "Verify your email before creating requests." });
  }
  const input = createServiceRequestInputSchema.parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input)
  });
});
app.get("/api/requests", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  const queryString = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
  return fetchJson(`${env.SERVICE_DESK_URL}/requests${queryString}`, {
    headers: userHeaders(session.user)
  });
});
app.get("/api/requests/:requestId", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}`, {
    headers: userHeaders(session.user)
  });
});
app.post("/api/requests/:requestId/messages", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  const input = createRequestMessageInputSchema.parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/messages`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input)
  });
});
app.post("/api/requests/:requestId/claim", async (request, reply) => {
  const session = await requireSession(request, reply, ["engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/claim`, {
    method: "POST",
    headers: userHeaders(session.user)
  });
});
app.post("/api/requests/:requestId/assign", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  const input = z3.object({ engineerId: z3.string().uuid() }).parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/assign`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input)
  });
});
app.post("/api/requests/:requestId/status", async (request, reply) => {
  const session = await requireSession(request, reply, ["engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const params = z3.object({ requestId: z3.string().uuid() }).parse(request.params);
  const input = updateRequestStatusInputSchema.parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/status`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input)
  });
});
app.get("/api/admin/users", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users`, {
    headers: internalHeaders()
  });
});
app.post("/api/admin/users/invite", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const input = inviteUserInputSchema.parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/invite`, {
    method: "POST",
    headers: internalHeaders({
      "x-user-id": session.user.id,
      "x-user-role": session.user.role
    }),
    body: JSON.stringify(input)
  });
});
var port = Number(new URL(env.GATEWAY_URL).port || "4000");
if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
async function handler(req, res) {
  await app.ready();
  app.server.emit("request", req, res);
}
export {
  handler as default
};
