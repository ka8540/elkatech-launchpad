import { randomBytes } from "node:crypto";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import {
  adminLinkMachineInputSchema,
  adminMachineListQuerySchema,
  adminUpdateProfileInputSchema,
  approvalActionInputSchema,
  cancelRequestInputSchema,
  completeProfileInputSchema,
  confirmAttachmentInputSchema,
  createCustomerMachineInputSchema,
  createCustomerRequestInputSchema,
  createRequestMessageInputSchema,
  createServiceRequestInputSchema,
  firebaseSessionInputSchema,
  forgotPasswordInputSchema,
  inviteUserInputSchema,
  loginInputSchema,
  presignAttachmentInputSchema,
  resetPasswordInputSchema,
  roleSchema,
  signUpInputSchema,
  updateCustomerMachineInputSchema,
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
  profileCompleted: boolean;
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

function forwardServiceError(request: any, reply: any, error: unknown, logMsg: string) {
  if (error instanceof InternalFetchError) {
    // 501 Not Implemented is a deliberate, safe signal (e.g. attachments
    // disabled when R2 isn't configured) — forward its message verbatim.
    if (error.status >= 500 && error.status !== 501) {
      request.log.error({ err: error }, logMsg);
      return reply.code(502).send({ message: "Something went wrong. Please try again." });
    }
    return reply.code(error.status).send(
      error.body && typeof error.body === "object"
        ? (error.body as Record<string, unknown>)
        : { message: error.message },
    );
  }
  throw error;
}

// Self-service: read the current user's service profile (contact + workshop).
app.get("/api/me/profile", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  try {
    return await fetchJson(
      `${env.AUTH_SERVICE_URL}/internal/users/${session.user.id}/profile`,
      { headers: internalHeaders() },
    );
  } catch (error) {
    return forwardServiceError(request, reply, error, "profile read failed");
  }
});

// Self-service: update the current user's profile. Accepts the display name
// alone (Account page) or the full onboarding payload (Complete profile page).
// Never touches role, approval status, email, or password. `profile_completed`
// is derived server-side from the required fields, never set by the client.
app.patch("/api/me/profile", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, [
    "customer",
    "engineer",
    "admin",
  ]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const input = completeProfileInputSchema.partial().parse(request.body);
  try {
    return await fetchJson(
      `${env.AUTH_SERVICE_URL}/internal/users/${session.user.id}/profile`,
      {
        method: "PATCH",
        headers: internalHeaders({ "x-user-id": session.user.id }),
        body: JSON.stringify(input),
      },
    );
  } catch (error) {
    return forwardServiceError(request, reply, error, "profile update failed");
  }
});

// Admin: read any customer's profile.
app.get("/api/admin/users/:userId/profile", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
  try {
    return await fetchJson(`${env.AUTH_SERVICE_URL}/internal/users/${userId}/profile`, {
      headers: internalHeaders(),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin profile read failed");
  }
});

// Admin: edit any customer's profile fields (partial).
app.patch("/api/admin/users/:userId/profile", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
  const input = adminUpdateProfileInputSchema.parse(request.body);
  try {
    return await fetchJson(`${env.AUTH_SERVICE_URL}/internal/users/${userId}/profile`, {
      method: "PATCH",
      headers: internalHeaders({ "x-user-id": session.user.id }),
      body: JSON.stringify(input),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin profile update failed");
  }
});

// Self-service: trigger the existing forgot-password flow for the signed-in
// user. The frontend never needs to type its own email — eliminates the
// "send reset to arbitrary address" surface for an already-authed session.
app.post(
  "/api/me/password-reset",
  { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
  async (request: any, reply: any) => {
    const session = await requireSession(request, reply, [
      "customer",
      "engineer",
      "admin",
    ]);
    if (!session) return;
    if (!assertCsrf(request, reply)) return;
    try {
      await fetchJson(`${env.AUTH_SERVICE_URL}/forgot-password`, {
        method: "POST",
        headers: internalHeaders(),
        body: JSON.stringify({ email: session.user.email }),
      });
    } catch (error) {
      request.log.error({ err: error }, "self password reset failed");
    }
    // Always respond the same — no user-existence leak, no provider details.
    return { message: "Password reset email sent." };
  },
);

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
  // Defence-in-depth: a customer with an incomplete profile can't create
  // requests even if they bypass the client redirect.
  if (session.user.role === "customer" && !session.user.profileCompleted) {
    return reply.code(403).send({
      code: "PROFILE_INCOMPLETE",
      message: "Complete your service profile before creating requests.",
    });
  }

  const raw = (request.body ?? {}) as Record<string, unknown>;
  const input =
    "customerMachineId" in raw
      ? createCustomerRequestInputSchema.parse(raw)
      : createServiceRequestInputSchema.parse(raw);
  return fetchJson(`${env.SERVICE_DESK_URL}/requests`, {
    method: "POST",
    headers: userHeaders(session.user),
    body: JSON.stringify(input),
  });
});

// Customer-facing: the current user's own active machines (safe view).
app.get("/api/me/machines", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/me/machines`, {
      headers: userHeaders(session.user),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "machine list failed");
  }
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

app.post("/api/requests/:requestId/claim", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/claim`, {
      method: "POST",
      headers: userHeaders(session.user),
    });
  } catch (error) {
    if (error instanceof InternalFetchError) {
      if (error.status >= 500) {
        request.log.error({ err: error }, "claim request failed");
        return reply.code(502).send({ message: "Could not claim request. Please try again." });
      }
      return reply.code(error.status).send(
        error.body && typeof error.body === "object"
          ? (error.body as Record<string, unknown>)
          : { message: error.message },
      );
    }
    throw error;
  }
});

app.post("/api/requests/:requestId/assign", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = z.object({ engineerId: z.string().uuid() }).parse(request.body);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/assign`, {
      method: "POST",
      headers: userHeaders(session.user),
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (error instanceof InternalFetchError) {
      if (error.status >= 500) {
        request.log.error({ err: error }, "assign request failed");
        return reply.code(502).send({ message: "Could not assign engineer. Please try again." });
      }
      return reply.code(error.status).send(
        error.body && typeof error.body === "object"
          ? (error.body as Record<string, unknown>)
          : { message: error.message },
      );
    }
    throw error;
  }
});

app.post("/api/requests/:requestId/status", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;

  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = updateRequestStatusInputSchema.parse(request.body);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/requests/${params.requestId}/status`, {
      method: "POST",
      headers: userHeaders(session.user),
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (error instanceof InternalFetchError) {
      if (error.status >= 500) {
        request.log.error({ err: error }, "status update failed");
        return reply
          .code(502)
          .send({ message: "Could not update status. Please try again." });
      }
      return reply.code(error.status).send(
        error.body && typeof error.body === "object"
          ? (error.body as Record<string, unknown>)
          : { message: error.message },
      );
    }
    throw error;
  }
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

// ─── Request attachments (presign → upload to R2 → confirm → list) ──────────
const attachmentRequestParams = z.object({ requestId: z.string().uuid() });

app.post("/api/requests/:requestId/attachments/presign", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { requestId } = attachmentRequestParams.parse(request.params);
  const input = presignAttachmentInputSchema.parse(request.body);
  try {
    return await fetchJson(
      `${env.SERVICE_DESK_URL}/requests/${requestId}/attachments/presign`,
      {
        method: "POST",
        headers: userHeaders(session.user),
        body: JSON.stringify(input),
      },
    );
  } catch (error) {
    return forwardServiceError(request, reply, error, "attachment presign failed");
  }
});

app.post("/api/requests/:requestId/attachments", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { requestId } = attachmentRequestParams.parse(request.params);
  const input = confirmAttachmentInputSchema.parse(request.body);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/requests/${requestId}/attachments`, {
      method: "POST",
      headers: userHeaders(session.user),
      body: JSON.stringify(input),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "attachment confirm failed");
  }
});

app.get("/api/requests/:requestId/attachments", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["customer", "engineer", "admin"]);
  if (!session) return;
  const { requestId } = attachmentRequestParams.parse(request.params);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/requests/${requestId}/attachments`, {
      headers: userHeaders(session.user),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "attachment list failed");
  }
});

app.get("/api/admin/users", async (request, reply) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;

  return fetchJson(`${env.AUTH_SERVICE_URL}/internal/users`, {
    headers: internalHeaders(),
  });
});

// ─── Admin: customer machine management ─────────────────────────────────────
const adminMachineUserParams = z.object({ userId: z.string().uuid() });
const adminMachineParams = z.object({ machineId: z.string().uuid() });

app.get("/api/admin/users/:userId/machines", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  const { userId } = adminMachineUserParams.parse(request.params);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/admin/customers/${userId}/machines`, {
      headers: userHeaders(session.user),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin machine list failed");
  }
});

app.post("/api/admin/users/:userId/machines", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { userId } = adminMachineUserParams.parse(request.params);
  const input = createCustomerMachineInputSchema.parse(request.body);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/admin/customers/${userId}/machines`, {
      method: "POST",
      headers: userHeaders(session.user),
      body: JSON.stringify(input),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin machine create failed");
  }
});

app.patch("/api/admin/machines/:machineId", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { machineId } = adminMachineParams.parse(request.params);
  const input = updateCustomerMachineInputSchema.parse(request.body);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/admin/machines/${machineId}`, {
      method: "PATCH",
      headers: userHeaders(session.user),
      body: JSON.stringify(input),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin machine update failed");
  }
});

app.delete("/api/admin/machines/:machineId", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { machineId } = adminMachineParams.parse(request.params);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/admin/machines/${machineId}`, {
      method: "DELETE",
      headers: userHeaders(session.user),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin machine delete failed");
  }
});

// ─── Admin: customer-machines dashboard (global collection) ─────────────────
app.get("/api/admin/customer-machines", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  // Validate/normalise filters; forward only the recognised ones.
  const query = adminMachineListQuerySchema.parse(request.query ?? {});
  const params = new URLSearchParams();
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.productId) params.set("productId", query.productId);
  if (query.status) params.set("status", query.status);
  const qs = params.toString();
  try {
    return await fetchJson(
      `${env.SERVICE_DESK_URL}/admin/customer-machines${qs ? `?${qs}` : ""}`,
      { headers: userHeaders(session.user) },
    );
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin customer-machines list failed");
  }
});

app.post("/api/admin/customer-machines", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const input = adminLinkMachineInputSchema.parse(request.body);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/admin/customer-machines`, {
      method: "POST",
      headers: userHeaders(session.user),
      body: JSON.stringify(input),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin customer-machine create failed");
  }
});

app.patch("/api/admin/customer-machines/:machineId", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { machineId } = adminMachineParams.parse(request.params);
  const input = updateCustomerMachineInputSchema.parse(request.body);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/admin/machines/${machineId}`, {
      method: "PATCH",
      headers: userHeaders(session.user),
      body: JSON.stringify(input),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin customer-machine update failed");
  }
});

app.delete("/api/admin/customer-machines/:machineId", async (request: any, reply: any) => {
  const session = await requireSession(request, reply, ["admin"]);
  if (!session) return;
  if (!assertCsrf(request, reply)) return;
  const { machineId } = adminMachineParams.parse(request.params);
  try {
    return await fetchJson(`${env.SERVICE_DESK_URL}/admin/machines/${machineId}`, {
      method: "DELETE",
      headers: userHeaders(session.user),
    });
  } catch (error) {
    return forwardServiceError(request, reply, error, "admin customer-machine delete failed");
  }
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
