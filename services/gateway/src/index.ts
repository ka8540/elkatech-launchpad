import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import {
  createRequestMessageInputSchema,
  createServiceRequestInputSchema,
  forgotPasswordInputSchema,
  inviteUserInputSchema,
  loginInputSchema,
  resetPasswordInputSchema,
  roleSchema,
  signUpInputSchema,
  updateRequestStatusInputSchema,
  verifyEmailInputSchema,
} from "@elkatech/contracts";
import { fetchJson, getEnv, internalHeaders } from "@elkatech/config";

const env = getEnv();
const app = Fastify({ logger: true });

await app.register(cookie);
await app.register(rateLimit, {
  global: false,
  max: 10,
  timeWindow: "1 minute",
});

type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: "customer" | "engineer" | "admin";
  emailVerified: boolean;
  createdAt: string;
};

function getSessionCookie(request: { cookies: Record<string, string | undefined> }) {
  return request.cookies[env.SESSION_COOKIE_NAME];
}

function getCsrfCookie(request: { cookies: Record<string, string | undefined> }) {
  return request.cookies[env.CSRF_COOKIE_NAME];
}

async function resolveSession(sessionToken: string) {
  return fetchJson<{
    user: SessionUser;
    csrfToken: string;
    sessionId: string;
  }>(`${env.AUTH_SERVICE_URL}/internal/session/resolve`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify({ sessionToken }),
  });
}

function setSessionCookies(
  reply: any,
  payload: { sessionToken: string; csrfToken: string },
) {
  const secure = env.NODE_ENV === "production";

  reply.setCookie(env.SESSION_COOKIE_NAME, payload.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60,
  });
  reply.setCookie(env.CSRF_COOKIE_NAME, payload.csrfToken, {
    httpOnly: false,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: env.SESSION_TTL_HOURS * 60 * 60,
  });
}

function clearSessionCookies(reply: any) {
  reply.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });
  reply.clearCookie(env.CSRF_COOKIE_NAME, { path: "/" });
}

async function requireSession(request: any, reply: any, allowedRoles?: Array<z.infer<typeof roleSchema>>) {
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

function assertCsrf(request: any, reply: any) {
  const csrfCookie = getCsrfCookie(request);
  const csrfHeader = request.headers["x-csrf-token"];

  if (!csrfCookie || csrfHeader !== csrfCookie) {
    reply.code(403).send({ message: "CSRF validation failed." });
    return false;
  }

  return true;
}

function userHeaders(user: SessionUser) {
  return internalHeaders({
    "x-user-id": user.id,
    "x-user-email": user.email,
    "x-user-role": user.role,
    "x-user-display-name": user.displayName,
  });
}

app.get("/health", async () => ({ ok: true, service: "gateway" }));

app.post("/api/auth/signup", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
  const input = signUpInputSchema.parse(request.body);
  const response = await fetchJson<{ message: string }>(`${env.AUTH_SERVICE_URL}/signup`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });

  return reply.code(201).send(response);
});

app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
  const input = loginInputSchema.parse(request.body);
  const response = await fetchJson<{
    sessionToken: string;
    csrfToken: string;
    user: SessionUser;
  }>(`${env.AUTH_SERVICE_URL}/login`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });

  setSessionCookies(reply, response);
  return {
    user: response.user,
  };
});

app.post("/api/auth/logout", async (request, reply) => {
  const sessionToken = getSessionCookie(request);

  if (sessionToken) {
    await fetchJson(`${env.AUTH_SERVICE_URL}/logout`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({ sessionToken }),
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
      maxAge: env.SESSION_TTL_HOURS * 60 * 60,
    });
    return { user: session.user };
  } catch {
    clearSessionCookies(reply);
    return { user: null };
  }
});

app.post("/api/auth/forgot-password", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request) => {
  const input = forgotPasswordInputSchema.parse(request.body);
  return fetchJson<{ message: string }>(`${env.AUTH_SERVICE_URL}/forgot-password`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });
});

app.post("/api/auth/reset-password", async (request) => {
  const input = resetPasswordInputSchema.parse(request.body);
  return fetchJson<{ message: string }>(`${env.AUTH_SERVICE_URL}/reset-password`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });
});

app.post("/api/auth/verify-email", async (request) => {
  const input = verifyEmailInputSchema.parse(request.body);
  return fetchJson<{ message: string }>(`${env.AUTH_SERVICE_URL}/verify-email`, {
    method: "POST",
    headers: internalHeaders(),
    body: JSON.stringify(input),
  });
});

app.get("/api/catalog/categories", async () => {
  return fetchJson(`${env.CATALOG_SERVICE_URL}/categories`, {
    headers: internalHeaders(),
  });
});

app.get("/api/catalog/products", async (request) => {
  const queryString = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
  return fetchJson(`${env.CATALOG_SERVICE_URL}/products${queryString}`, {
    headers: internalHeaders(),
  });
});

app.get("/api/catalog/products/:productId", async (request) => {
  const params = z.object({ productId: z.string() }).parse(request.params);
  return fetchJson(`${env.CATALOG_SERVICE_URL}/products/${params.productId}`, {
    headers: internalHeaders(),
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
    body: JSON.stringify(input),
  });
});

app.get("/api/requests", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;

  const queryString = request.url.includes("?") ? request.url.slice(request.url.indexOf("?")) : "";
  return fetchJson(`${env.SERVICE_DESK_URL}/requests${queryString}`, {
    headers: userHeaders(session.user),
  });
});

app.get("/api/requests/:requestId", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}`, {
    headers: userHeaders(session.user),
  });
});

app.post("/api/requests/:requestId/messages", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = createRequestMessageInputSchema.parse(request.body);

  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/messages`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input),
  });
});

app.post("/api/requests/:requestId/claim", async (request, reply) => {
  const session = await requireSession(request, reply, ["engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/claim`, {
    method: "POST",
    headers: userHeaders(session.user),
  });
});

app.post("/api/requests/:requestId/assign", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = z.object({ engineerId: z.string().uuid() }).parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/assign`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input),
  });
});

app.post("/api/requests/:requestId/status", async (request, reply) => {
  const session = await requireSession(request, reply, ["engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = updateRequestStatusInputSchema.parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/status`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input),
  });
});

app.get("/api/admin/users", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;

  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users`, {
    headers: internalHeaders(),
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
      "x-user-role": session.user.role,
    }),
    body: JSON.stringify(input),
  });
});

const port = Number(new URL(env.GATEWAY_URL).port || "4000");

if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}

export default async function handler(req: any, res: any) {
  await app.ready();
  app.server.emit('request', req, res);
}
