// services/catalog/src/index.ts
import Fastify from "fastify";
import { z as z3 } from "zod";

// packages/config/src/crypto.ts
import { createHash, randomBytes } from "node:crypto";

// packages/config/src/db.ts
import postgres from "postgres";

// packages/config/src/env.ts
import { z } from "zod";
if (!process.env.VERCEL) {
  const { config } = await import("dotenv");
  config();
}
var envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  POSTGRES_URL: z.string().optional(),
  KV_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  DATABASE_URL: z.string().min(1).default("postgres://elkatech:elkatech@127.0.0.1:5432/elkatech"),
  INTERNAL_SERVICE_TOKEN: z.string().min(1).default("dev-internal-token"),
  APP_BASE_URL: z.string().url().default("http://127.0.0.1:8080"),
  GATEWAY_URL: z.string().url().default("http://127.0.0.1:4000"),
  AUTH_SERVICE_URL: z.string().url().default("http://127.0.0.1:4001"),
  CATALOG_SERVICE_URL: z.string().url().default("http://127.0.0.1:4002"),
  SERVICE_DESK_URL: z.string().url().default("http://127.0.0.1:4003"),
  NOTIFICATION_SERVICE_URL: z.string().url().default("http://127.0.0.1:4004"),
  SESSION_COOKIE_NAME: z.string().default("elkatech_session"),
  CSRF_COOKIE_NAME: z.string().default("elkatech_csrf"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_FROM: z.string().email().default("no-reply@elkatech.local"),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().default("admin@elkatech.local"),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!")
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

// packages/config/src/redis.ts
import { Redis } from "ioredis";
var redisClient = null;
function getRedis() {
  if (!redisClient) {
    const url = getEnv().KV_URL || getEnv().REDIS_URL;
    if (url) {
      redisClient = new Redis(url, {
        retryStrategy(times) {
          return Math.min(times * 50, 2e3);
        }
      });
    }
  }
  return redisClient;
}

// packages/contracts/src/index.ts
import { z as z2 } from "zod";
var roleSchema = z2.enum(["customer", "engineer", "admin"]);
var requestPrioritySchema = z2.enum(["low", "normal", "high", "urgent"]);
var requestStatusSchema = z2.enum([
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed"
]);
var messageVisibilitySchema = z2.enum(["customer_visible", "internal_note"]);
var productSpecSchema = z2.tuple([z2.string(), z2.string()]);
var catalogProductSchema = z2.object({
  id: z2.string(),
  categorySlug: z2.string(),
  slug: z2.string(),
  name: z2.string(),
  priceDisplay: z2.string(),
  brochureUrl: z2.string().url().optional(),
  images: z2.array(z2.string()),
  specs: z2.array(productSpecSchema),
  highlights: z2.array(z2.string())
});
var catalogCategorySchema = z2.object({
  id: z2.string(),
  slug: z2.string(),
  routePath: z2.string(),
  name: z2.string(),
  intro: z2.string(),
  products: z2.array(catalogProductSchema)
});
var authUserSchema = z2.object({
  id: z2.string(),
  email: z2.string().email(),
  displayName: z2.string(),
  role: roleSchema,
  emailVerified: z2.boolean(),
  createdAt: z2.string()
});
var productSnapshotSchema = z2.object({
  id: z2.string(),
  categorySlug: z2.string(),
  slug: z2.string(),
  name: z2.string(),
  priceDisplay: z2.string()
});
var serviceRequestSchema = z2.object({
  id: z2.string(),
  requestNumber: z2.string(),
  customerId: z2.string(),
  productId: z2.string(),
  productSnapshot: productSnapshotSchema,
  subject: z2.string(),
  description: z2.string(),
  contactPhone: z2.string(),
  siteLocation: z2.string(),
  serialNumber: z2.string().nullable().optional(),
  priority: requestPrioritySchema,
  status: requestStatusSchema,
  assignedEngineerId: z2.string().nullable().optional(),
  createdAt: z2.string(),
  updatedAt: z2.string()
});
var requestMessageSchema = z2.object({
  id: z2.string(),
  requestId: z2.string(),
  authorId: z2.string(),
  authorRole: roleSchema,
  visibility: messageVisibilitySchema,
  body: z2.string(),
  createdAt: z2.string()
});
var signUpInputSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(8),
  displayName: z2.string().min(2),
  inviteToken: z2.string().optional()
});
var loginInputSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(8)
});
var forgotPasswordInputSchema = z2.object({
  email: z2.string().email()
});
var resetPasswordInputSchema = z2.object({
  token: z2.string().min(20),
  password: z2.string().min(8)
});
var verifyEmailInputSchema = z2.object({
  token: z2.string().min(20)
});
var inviteUserInputSchema = z2.object({
  email: z2.string().email(),
  displayName: z2.string().min(2),
  role: z2.enum(["engineer", "admin"])
});
var createServiceRequestInputSchema = z2.object({
  productId: z2.string(),
  subject: z2.string().min(4),
  description: z2.string().min(10),
  contactPhone: z2.string().min(7),
  siteLocation: z2.string().min(2),
  serialNumber: z2.string().optional(),
  priority: requestPrioritySchema.default("normal")
});
var createRequestMessageInputSchema = z2.object({
  body: z2.string().min(1),
  visibility: messageVisibilitySchema
});
var assignRequestInputSchema = z2.object({
  engineerId: z2.string()
});
var updateRequestStatusInputSchema = z2.object({
  status: requestStatusSchema
});
var sessionResponseSchema = z2.object({
  sessionToken: z2.string(),
  csrfToken: z2.string(),
  user: authUserSchema
});
var domainEventTypeSchema = z2.enum([
  "user.registered",
  "user.email_verified",
  "user.password_reset_requested",
  "request.created",
  "request.assigned",
  "request.status_changed",
  "request.customer_message_posted",
  "request.staff_reply_posted"
]);
var domainEventSchema = z2.object({
  id: z2.string(),
  aggregateType: z2.string(),
  aggregateId: z2.string(),
  eventType: domainEventTypeSchema,
  payload: z2.record(z2.any()),
  occurredAt: z2.string()
});

// services/catalog/src/index.ts
var app = Fastify({ logger: true });
var sql = getDb();
var env = getEnv();
app.get("/health", async () => ({ ok: true, service: "catalog" }));
app.get("/categories", async () => {
  const redis = getRedis();
  const cacheKey = "catalog:categories";
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  const rows = await sql`
    select id, slug, route_path, name, intro
    from catalog.categories
    order by name asc
  `;
  const result = rows.map(
    (row) => catalogCategorySchema.omit({ products: true }).parse({
      id: row.id,
      slug: row.slug,
      routePath: row.route_path,
      name: row.name,
      intro: row.intro
    })
  );
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }
  return result;
});
app.get("/products", async (request) => {
  const querySchema = z3.object({
    category: z3.string().optional()
  });
  const query = querySchema.parse(request.query);
  const redis = getRedis();
  const cacheKey = `catalog:products:${query.category || "all"}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  const rows = query.category ? await sql`
        select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
        from catalog.products
        where category_slug = ${query.category}
        order by name asc
      ` : await sql`
        select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
        from catalog.products
        order by category_slug asc, name asc
      `;
  const result = rows.map(
    (row) => catalogProductSchema.parse({
      id: row.id,
      categorySlug: row.category_slug,
      slug: row.slug,
      name: row.name,
      priceDisplay: row.price_display,
      brochureUrl: row.brochure_url ?? void 0,
      images: row.images,
      specs: row.specs,
      highlights: row.highlights
    })
  );
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }
  return result;
});
app.get("/products/:productId", async (request, reply) => {
  const paramsSchema = z3.object({ productId: z3.string() });
  const params = paramsSchema.parse(request.params);
  const redis = getRedis();
  const cacheKey = `catalog:product:${params.productId}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }
  const rows = await sql`
    select id, category_slug, slug, name, price_display, brochure_url, images, specs, highlights
    from catalog.products
    where id = ${params.productId}
    limit 1
  `;
  const product = rows[0];
  if (!product) {
    return reply.code(404).send({ message: "Product not found." });
  }
  const result = catalogProductSchema.parse({
    id: product.id,
    categorySlug: product.category_slug,
    slug: product.slug,
    name: product.name,
    priceDisplay: product.price_display,
    brochureUrl: product.brochure_url ?? void 0,
    images: product.images,
    specs: product.specs,
    highlights: product.highlights
  });
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), "EX", 300);
  }
  return result;
});
var port = Number(new URL(env.CATALOG_SERVICE_URL).port || "4002");
if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}
async function handler(req, res) {
  await app.ready();
  if (req.url?.startsWith("/api/internal-catalog")) {
    req.url = req.url.replace("/api/internal-catalog", "") || "/";
  }
  app.server.emit("request", req, res);
}
export {
  handler as default
};
