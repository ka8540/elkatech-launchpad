import { randomBytes } from "node:crypto";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import {
  approvalActionInputSchema,
  cancelRequestInputSchema,
  createRequestMessageInputSchema,
  createServiceRequestInputSchema,
  firebaseSessionInputSchema,
  forgotPasswordInputSchema,
  inviteUserInputSchema,
  loginInputSchema,
  resetPasswordInputSchema,
  roleSchema,
  signUpInputSchema,
  updateServiceRequestInputSchema,
  updateRequestStatusInputSchema,
  verifyEmailInputSchema,
} from "@elkatech/contracts";
import {
  fetchJson,
  getEnv,
  internalHeaders,
  InternalFetchError,
  verifyFirebaseIdTokenForRequest,
} from "@elkatech/config";
import { evaluateApprovalGate } from "./approval";

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
  approvalStatus: "pending_approval" | "approved" | "rejected" | "suspended";
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

app.get("/health", async () => ({
  ok: true,
  service: "gateway",
  environment: env.NODE_ENV,
}));

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

// ─── Firebase Auth bridge ──────────────────────────────────────────────────
// Verifies a Firebase ID token, asks the auth service to create or link a
// local user, and returns an existing-pattern cookie session.
app.post(
  "/api/auth/firebase/session",
  { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
  async (request, reply) => {
    const input = firebaseSessionInputSchema.parse(request.body);
    const decoded = await verifyFirebaseIdTokenForRequest(input.idToken);

    if (!decoded || !decoded.uid || !decoded.email) {
      return reply.code(401).send({ message: "Invalid Firebase credential." });
    }

    const providerId =
      typeof (decoded as { firebase?: { sign_in_provider?: string } }).firebase?.sign_in_provider ===
        "string"
        ? (decoded as { firebase: { sign_in_provider: string } }).firebase.sign_in_provider
        : "other";
    const provider =
      providerId === "password" || providerId === "google.com" ? providerId : "other";

    const session = await fetchJson<{
      sessionToken: string;
      csrfToken: string;
      user: SessionUser;
    }>(`${env.AUTH_SERVICE_URL}/internal/firebase/session`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        firebaseUid: decoded.uid,
        email: decoded.email,
        emailVerified: Boolean(decoded.email_verified),
        displayName:
          (decoded.name as string | undefined) ||
          (decoded.email as string).split("@")[0],
        provider,
        pictureUrl: (decoded.picture as string | undefined) || undefined,
      }),
    });

    setSessionCookies(reply, session);
    return { user: session.user };
  },
);

// ─── Google OAuth ───────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const OAUTH_STATE_COOKIE = "elkatech_oauth_state";

app.get("/api/auth/google/start", async (request, reply) => {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    return reply.code(501).send({ message: "Google OAuth is not configured." });
  }

  const query = z.object({
    returnTo: z.string().optional(),
    inviteToken: z.string().optional(),
  }).parse(request.query);

  const state = randomBytes(32).toString("hex");
  const secure = env.NODE_ENV === "production";

  // Store state + context in a short-lived httpOnly cookie
  const statePayload = JSON.stringify({
    state,
    returnTo: query.returnTo || "",
    inviteToken: query.inviteToken || "",
  });

  reply.setCookie(OAUTH_STATE_COOKIE, statePayload, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  return reply.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
});

app.get("/api/auth/google/callback", async (request, reply) => {
  const appBase = env.APP_BASE_URL;

  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    return reply.redirect(`${appBase}/login?error=google_oauth_failed`);
  }

  const query = z.object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  }).parse(request.query);

  // User cancelled or Google returned an error
  if (query.error || !query.code) {
    reply.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
    return reply.redirect(`${appBase}/login?error=google_oauth_cancelled`);
  }

  // Validate state
  let returnTo = "";
  let inviteToken = "";
  try {
    const rawCookie = request.cookies[OAUTH_STATE_COOKIE];
    if (!rawCookie) throw new Error("Missing state cookie");
    const stored = JSON.parse(rawCookie) as { state: string; returnTo: string; inviteToken: string };
    if (stored.state !== query.state) throw new Error("State mismatch");
    returnTo = stored.returnTo;
    inviteToken = stored.inviteToken;
  } catch {
    reply.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });
    return reply.redirect(`${appBase}/login?error=google_oauth_failed`);
  }

  reply.clearCookie(OAUTH_STATE_COOKIE, { path: "/" });

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: query.code,
        client_id: env.GOOGLE_OAUTH_CLIENT_ID,
        client_secret: env.GOOGLE_OAUTH_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      return reply.redirect(`${appBase}/login?error=google_oauth_failed`);
    }

    const tokens = (await tokenResponse.json()) as { id_token?: string };
    if (!tokens.id_token) {
      return reply.redirect(`${appBase}/login?error=google_oauth_failed`);
    }

    // Verify ID token via Google tokeninfo
    const tokenInfoResponse = await fetch(`${GOOGLE_TOKENINFO_URL}?id_token=${tokens.id_token}`);
    if (!tokenInfoResponse.ok) {
      return reply.redirect(`${appBase}/login?error=google_oauth_failed`);
    }

    const idToken = (await tokenInfoResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: string;
      name?: string;
      aud?: string;
    };

    // Validate audience
    if (idToken.aud !== env.GOOGLE_OAUTH_CLIENT_ID) {
      return reply.redirect(`${appBase}/login?error=google_oauth_failed`);
    }

    if (!idToken.sub || !idToken.email) {
      return reply.redirect(`${appBase}/login?error=google_oauth_failed`);
    }

    const emailVerified = idToken.email_verified === "true";
    if (!emailVerified) {
      return reply.redirect(`${appBase}/login?error=google_email_unverified`);
    }

    // Delegate user lookup/create to auth service
    const oauthResult = await fetchJson<{
      sessionToken: string;
      csrfToken: string;
      user: SessionUser;
    }>(`${env.AUTH_SERVICE_URL}/internal/oauth/find-or-create`, {
      method: "POST",
      headers: internalHeaders(),
      body: JSON.stringify({
        provider: "google",
        providerUserId: idToken.sub,
        providerEmail: idToken.email,
        emailVerified,
        displayName: idToken.name || idToken.email.split("@")[0],
        inviteToken: inviteToken || undefined,
      }),
    });

    // Set session cookies (same as email/password login)
    setSessionCookies(reply, oauthResult);

    // Redirect to portal
    const defaultPath = oauthResult.user.role === "customer" ? "/app/requests" : "/app/queue";
    return reply.redirect(returnTo || defaultPath);
  } catch {
    return reply.redirect(`${appBase}/login?error=google_oauth_failed`);
  }
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

function assertApproved(reply: any, user: SessionUser) {
  const result = evaluateApprovalGate(user);
  if (result.ok) return true;
  reply.code(403).send({ code: result.code, message: result.message });
  return false;
}

app.post("/api/requests", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  if (!assertApproved(reply, session.user)) return;
  if (!session.user.emailVerified) {
    return reply.code(403).send({
      code: "EMAIL_NOT_VERIFIED",
      message: "Verify your email before creating requests.",
    });
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

app.patch("/api/requests/:requestId", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = updateServiceRequestInputSchema.parse(request.body);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}`, {
    method: "PATCH",
    headers: userHeaders(session.user),
    body: JSON.stringify(input),
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

app.post("/api/requests/:requestId/cancel", async (request, reply) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = cancelRequestInputSchema.parse(request.body ?? {});
  return fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/cancel`, {
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

// ─── Admin: approval workflow ──────────────────────────────────────────────
const approvalUserParams = z.object({ userId: z.string().uuid() });

async function forwardApprovalAction(
  request: any,
  reply: any,
  action: "approve" | "reject" | "suspend" | "reactivate",
) {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const { userId } = approvalUserParams.parse(request.params);
  const body = approvalActionInputSchema.parse(request.body ?? {});

  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users/${userId}/${action}`, {
    method: "POST",
    headers: internalHeaders({ "x-user-id": session.user.id }),
    body: JSON.stringify(body),
  });
}

app.post("/api/admin/users/:userId/approve", (request, reply) =>
  forwardApprovalAction(request, reply, "approve"),
);
app.post("/api/admin/users/:userId/reject", (request, reply) =>
  forwardApprovalAction(request, reply, "reject"),
);
app.post("/api/admin/users/:userId/suspend", (request, reply) =>
  forwardApprovalAction(request, reply, "suspend"),
);
app.post("/api/admin/users/:userId/reactivate", (request, reply) =>
  forwardApprovalAction(request, reply, "reactivate"),
);

app.post("/api/admin/users/:userId/role", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { userId } = approvalUserParams.parse(request.params);
  const input = z
    .object({ role: z.enum(["customer", "engineer", "admin"]) })
    .parse(request.body);
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users/${userId}/role`, {
    method: "POST",
    headers: internalHeaders({ "x-user-id": session.user.id }),
    body: JSON.stringify(input),
  });
});

app.delete("/api/admin/users/:userId", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { userId } = approvalUserParams.parse(request.params);
  try {
    return await fetchJson(`${env.AUTH_SERVICE_URL}/internal/users/${userId}`, {
      method: "DELETE",
      headers: internalHeaders({ "x-user-id": session.user.id }),
    });
  } catch (error) {
    if (error instanceof InternalFetchError) {
      // Forward business-rule rejections (4xx) verbatim, but never leak raw
      // 5xx messages (DB errors, stack details, etc.) to the admin UI.
      if (error.status >= 500) {
        request.log.error({ err: error }, "remove user failed");
        return reply
          .code(502)
          .send({ message: "Could not remove user. Please try again." });
      }
      const body =
        error.body && typeof error.body === "object"
          ? (error.body as Record<string, unknown>)
          : { message: error.message };
      return reply.code(error.status).send(body);
    }
    throw error;
  }
});

// ─── Admin: heartbeat / health dashboard ───────────────────────────────────
type HealthRecord = {
  service: string;
  status: "healthy" | "degraded" | "down";
  latencyMs: number | null;
  checkedAt: string;
  details?: { version?: string; environment?: string; message?: string };
};

async function probeService(name: string, url: string): Promise<HealthRecord> {
  const checkedAt = new Date().toISOString();
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    let response: Response;
    try {
      response = await fetch(`${url}/health`, {
        method: "GET",
        signal: controller.signal,
        headers: internalHeaders(),
      });
    } finally {
      clearTimeout(timeout);
    }
    const latencyMs = Date.now() - started;
    if (!response.ok) {
      return {
        service: name,
        status: "degraded",
        latencyMs,
        checkedAt,
        details: { message: `HTTP ${response.status}` },
      };
    }
    let environment: string | undefined;
    try {
      const body = (await response.json()) as { service?: string; environment?: string };
      environment = body?.environment;
    } catch {
      environment = undefined;
    }
    const status: HealthRecord["status"] = latencyMs > 1500 ? "degraded" : "healthy";
    return {
      service: name,
      status,
      latencyMs,
      checkedAt,
      details: { environment },
    };
  } catch (error) {
    return {
      service: name,
      status: "down",
      latencyMs: null,
      checkedAt,
      details: { message: error instanceof Error ? error.message : "unreachable" },
    };
  }
}

app.get("/api/admin/health", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;

  const targets: Array<{ name: string; url: string }> = [
    { name: "auth", url: env.AUTH_SERVICE_URL },
    { name: "catalog", url: env.CATALOG_SERVICE_URL },
    { name: "service-desk", url: env.SERVICE_DESK_URL },
    { name: "notification", url: env.NOTIFICATION_SERVICE_URL },
  ];

  const services = await Promise.all(targets.map(({ name, url }) => probeService(name, url)));
  // Gateway itself is always reported as healthy when this handler runs.
  services.unshift({
    service: "gateway",
    status: "healthy",
    latencyMs: 0,
    checkedAt: new Date().toISOString(),
    details: { environment: env.NODE_ENV },
  });

  return { services };
});

// ─── Admin: dashboard summary ──────────────────────────────────────────────
app.get("/api/admin/users/summary", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users/summary`, {
    headers: internalHeaders(),
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
