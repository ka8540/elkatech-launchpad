import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import Fastify from "fastify";
import { z } from "zod";
import {
  approvalActionInputSchema,
  approvalStatusSchema,
  createServiceRequestInputSchema,
  firebaseSessionRequestSchema,
  forgotPasswordInputSchema,
  inviteUserInputSchema,
  loginInputSchema,
  oauthFindOrCreateInputSchema,
  resetPasswordInputSchema,
  roleSchema,
  sessionResponseSchema,
  signUpInputSchema,
  verifyEmailInputSchema,
} from "@elkatech/contracts";
import {
  generateToken,
  getDb,
  getEnv,
  getFirebaseAdminAuth,
  hashToken,
  internalHeaders,
  verifyFirebaseIdTokenForRequest,
} from "@elkatech/config";

const app = Fastify({ logger: true });
const sql = getDb();
const env = getEnv();

type AccountOrigin = "self_signup" | "admin_invite" | "firebase_google" | "legacy";

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  role: z.infer<typeof roleSchema>;
  email_verified: boolean;
  password_hash: string | null;
  status: "active" | "invited";
  approval_status: z.infer<typeof approvalStatusSchema>;
  firebase_uid: string | null;
  account_origin: AccountOrigin | null;
  // Customer service-profile columns (migration 006). Optional on the type so
  // the service still compiles/runs against an un-migrated database.
  company_name?: string | null;
  contact_phone?: string | null;
  alternate_phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  profile_completed?: boolean | null;
  profile_completed_at?: string | null;
  created_at: string;
};

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    emailVerified: row.email_verified,
    approvalStatus: row.approval_status ?? "approved",
    accountOrigin: (row.account_origin ?? "self_signup") as AccountOrigin,
    // Un-migrated databases (column absent → undefined) treat everyone as
    // complete so the onboarding gate never traps users on old environments.
    profileCompleted: row.profile_completed ?? true,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** Full customer service profile for the profile GET/PATCH endpoints. */
function mapProfile(row: UserRow) {
  return {
    displayName: row.display_name,
    companyName: row.company_name ?? null,
    contactPhone: row.contact_phone ?? null,
    alternatePhone: row.alternate_phone ?? null,
    addressLine1: row.address_line1 ?? null,
    addressLine2: row.address_line2 ?? null,
    city: row.city ?? null,
    state: row.state ?? null,
    postalCode: row.postal_code ?? null,
    country: row.country ?? null,
    profileCompleted: row.profile_completed ?? true,
    profileCompletedAt: row.profile_completed_at
      ? new Date(row.profile_completed_at).toISOString()
      : null,
  };
}

// The six fields that must all be present for a customer profile to count as
// "complete". Optional fields (alt phone, address line 2, postal code,
// country) don't gate completion.
function isProfileComplete(p: {
  displayName?: string | null;
  companyName?: string | null;
  contactPhone?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
}): boolean {
  return Boolean(
    p.displayName?.trim() &&
      p.companyName?.trim() &&
      p.contactPhone?.trim() &&
      p.addressLine1?.trim() &&
      p.city?.trim() &&
      p.state?.trim(),
  );
}

async function findUserById(userId: string): Promise<UserRow | null> {
  const rows = await sql<UserRow[]>`
    select * from auth.users where id = ${userId} limit 1
  `;
  return rows[0] ?? null;
}

// Detect whether migration 005 (auth.users.removed_at) has been applied on
// the connected database. Probed once and cached so subsequent calls are
// free. Lets the service work cleanly on un-migrated databases (the
// remove-user flow degrades to plain suspend instead of crashing).
let removedAtColumnPromise: Promise<boolean> | null = null;
async function hasRemovedAtColumn(): Promise<boolean> {
  if (!removedAtColumnPromise) {
    removedAtColumnPromise = (async () => {
      const rows = await sql<{ exists: boolean }[]>`
        select true as exists
        from information_schema.columns
        where table_schema = 'auth'
          and table_name = 'users'
          and column_name = 'removed_at'
        limit 1
      `;
      return rows.length > 0;
    })().catch((error) => {
      removedAtColumnPromise = null;
      throw error;
    });
  }
  return removedAtColumnPromise;
}

// Detect whether migration 006 (customer profile columns) has been applied.
// Probed once and cached so the profile endpoints degrade to display-name-only
// on un-migrated databases instead of throwing "undefined column".
let profileColumnsPromise: Promise<boolean> | null = null;
async function hasProfileColumns(): Promise<boolean> {
  if (!profileColumnsPromise) {
    profileColumnsPromise = (async () => {
      const rows = await sql<{ exists: boolean }[]>`
        select true as exists
        from information_schema.columns
        where table_schema = 'auth'
          and table_name = 'users'
          and column_name = 'profile_completed'
        limit 1
      `;
      return rows.length > 0;
    })().catch((error) => {
      profileColumnsPromise = null;
      throw error;
    });
  }
  return profileColumnsPromise;
}

// Generic existence check for a table on the connected database. Used by the
// hard-delete flow so it stays safe on partially-migrated databases (e.g. the
// service_desk schema or auth.oauth_identities not yet created locally). The
// probe must happen BEFORE opening a transaction: a failed statement inside
// `sql.begin` aborts the whole tx in Postgres.
async function tableExists(schema: string, table: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    select true as exists
    from information_schema.tables
    where table_schema = ${schema}
      and table_name = ${table}
    limit 1
  `;
  return rows.length > 0;
}

// Best-effort tagging of how the account was created. Wrapped in a guard so
// that the auth service still works on databases that haven't had migration
// 004 applied yet — Postgres error code 42703 ("undefined column") is the
// expected miss when account_origin doesn't exist; everything else bubbles.
async function setAccountOrigin(userId: string, origin: AccountOrigin) {
  try {
    await sql`
      update auth.users
      set account_origin = ${origin}, updated_at = now()
      where id = ${userId}
    `;
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code !== "42703") throw error;
  }
}

async function createSessionForUser(
  user: UserRow,
  request: { headers: Record<string, unknown>; ip: string | undefined },
) {
  const sessionToken = generateToken();
  const csrfToken = generateToken(16);
  await sql`
    insert into auth.sessions (
      id, token_hash, csrf_token, user_id, user_agent, ip_address, expires_at
    )
    values (
      ${randomUUID()},
      ${hashToken(sessionToken)},
      ${csrfToken},
      ${user.id},
      ${(request.headers["user-agent"] as string | undefined) ?? null},
      ${request.ip ?? null},
      now() + ${sql`${env.SESSION_TTL_HOURS} * interval '1 hour'`}
    )
  `;
  return { sessionToken, csrfToken };
}

async function emitOutbox(
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  payload: Record<string, unknown>,
) {
  await sql`
    insert into auth.outbox (id, aggregate_type, aggregate_id, event_type, payload)
    values (${randomUUID()}, ${aggregateType}, ${aggregateId}, ${eventType}, ${sql.json(payload as any)})
  `;
  triggerNotificationPoll();
}

function triggerNotificationPoll(): void {
  // Vercel suspends serverless functions between requests, so the
  // notification service's setInterval poller never runs in prod. Ping
  // it so the row we just wrote actually gets sent. Fire-and-forget.
  void fetch(`${env.NOTIFICATION_SERVICE_URL}/process-outbox`, {
    method: "POST",
    headers: internalHeaders(),
    // Empty JSON body required — internalHeaders() sets Content-Type:
    // application/json and Fastify rejects an empty body with that type.
    body: "{}",
  }).catch(() => {
    /* best-effort */
  });
}

async function createVerificationToken(userId: string, email: string) {
  const rawToken = generateToken();
  await sql`
    insert into auth.tokens (id, token_hash, user_id, email, role, purpose, expires_at)
    values (
      ${randomUUID()},
      ${hashToken(rawToken)},
      ${userId},
      ${email},
      ${"customer"},
      ${"verify_email"},
      now() + interval '48 hours'
    )
  `;
  return rawToken;
}

function ensureInternal(request: { headers: Record<string, unknown> }) {
  return request.headers["x-internal-token"] === env.INTERNAL_SERVICE_TOKEN;
}

let oauthIdentitiesTableReady: Promise<void> | null = null;

async function ensureOauthIdentitiesTable() {
  if (!oauthIdentitiesTableReady) {
    oauthIdentitiesTableReady = (async () => {
      await sql`
        create table if not exists auth.oauth_identities (
          id uuid primary key,
          user_id uuid not null references auth.users(id) on delete cascade,
          provider text not null,
          provider_user_id text not null,
          provider_email text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique(provider, provider_user_id)
        )
      `;
    })().catch((error) => {
      oauthIdentitiesTableReady = null;
      throw error;
    });
  }

  return oauthIdentitiesTableReady;
}

app.get("/health", async () => ({
  ok: true,
  service: "auth",
  environment: env.NODE_ENV,
}));

app.post("/signup", async (request, reply) => {
  const input = signUpInputSchema.parse(request.body);
  const passwordHash = await bcrypt.hash(input.password, 12);

  if (input.inviteToken) {
    const inviteRows = await sql<{
      id: string;
      user_id: string | null;
      email: string;
      role: "engineer" | "admin" | "customer" | null;
    }[]>`
      select id, user_id, email, role
      from auth.tokens
      where token_hash = ${hashToken(input.inviteToken)}
        and purpose = 'invite_signup'
        and consumed_at is null
        and expires_at > now()
      limit 1
    `;

    const invite = inviteRows[0];
    if (!invite || !invite.role) {
      return reply.code(400).send({ message: "Invite is invalid or expired." });
    }

    if (invite.email.toLowerCase() !== input.email.toLowerCase()) {
      return reply.code(400).send({ message: "Invite email does not match." });
    }

    const userId = invite.user_id ?? randomUUID();
    // Invited staff users are pre-approved by definition (an admin invited them).
    await sql`
      insert into auth.users (id, email, display_name, role, password_hash, email_verified, status, approval_status, approved_at)
      values (
        ${userId},
        ${input.email.toLowerCase()},
        ${input.displayName},
        ${invite.role},
        ${passwordHash},
        ${false},
        ${"active"},
        ${"approved"},
        now()
      )
      on conflict (id)
      do update set
        email = excluded.email,
        display_name = excluded.display_name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        status = excluded.status,
        approval_status = 'approved',
        approved_at = coalesce(auth.users.approved_at, now()),
        updated_at = now()
    `;
    await setAccountOrigin(userId, "admin_invite");

    await sql`
      update auth.tokens
      set consumed_at = now()
      where id = ${invite.id}
    `;

    const verifyToken = await createVerificationToken(userId, input.email.toLowerCase());
    await emitOutbox("user", userId, "user.registered", {
      userId,
      email: input.email.toLowerCase(),
      displayName: input.displayName,
      role: invite.role,
      invitation: true,
      verifyUrl: `${env.APP_BASE_URL}/verify-email?token=${verifyToken}`,
    });

    return reply.code(201).send({
      message: "Invitation accepted. Verify your email to continue.",
    });
  }

  const existingUsers = await sql<{ id: string }[]>`
    select id
    from auth.users
    where lower(email) = ${input.email.toLowerCase()}
    limit 1
  `;

  if (existingUsers.length > 0) {
    return reply.code(409).send({ message: "An account with this email already exists." });
  }

  const userId = randomUUID();
  // Public customer signups land in pending_approval and stay there
  // until an admin approves the account.
  await sql`
    insert into auth.users (id, email, display_name, role, password_hash, email_verified, status, approval_status)
    values (
      ${userId},
      ${input.email.toLowerCase()},
      ${input.displayName},
      ${"customer"},
      ${passwordHash},
      ${false},
      ${"active"},
      ${"pending_approval"}
    )
  `;
  await setAccountOrigin(userId, "self_signup");

  const verifyToken = await createVerificationToken(userId, input.email.toLowerCase());
  await emitOutbox("user", userId, "user.registered", {
    userId,
    email: input.email.toLowerCase(),
    displayName: input.displayName,
    role: "customer",
    invitation: false,
    verifyUrl: `${env.APP_BASE_URL}/verify-email?token=${verifyToken}`,
  });

  return reply.code(201).send({
    message: "Account created. Please verify your email; an administrator will activate your account.",
  });
});

app.post("/login", async (request, reply) => {
  const input = loginInputSchema.parse(request.body);
  const userRows = await sql<UserRow[]>`
    select *
    from auth.users
    where lower(email) = ${input.email.toLowerCase()}
    limit 1
  `;

  const user = userRows[0];
  if (!user || !user.password_hash) {
    return reply.code(401).send({ message: "Invalid email or password." });
  }

  const validPassword = await bcrypt.compare(input.password, user.password_hash);
  if (!validPassword) {
    return reply.code(401).send({ message: "Invalid email or password." });
  }

  const sessionToken = generateToken();
  const csrfToken = generateToken(16);

  await sql`
    insert into auth.sessions (
      id,
      token_hash,
      csrf_token,
      user_id,
      user_agent,
      ip_address,
      expires_at
    )
    values (
      ${randomUUID()},
      ${hashToken(sessionToken)},
      ${csrfToken},
      ${user.id},
      ${request.headers["user-agent"] ?? null},
      ${request.ip},
      now() + ${sql`${env.SESSION_TTL_HOURS} * interval '1 hour'`}
    )
  `;

  return reply.send(
    sessionResponseSchema.parse({
      sessionToken,
      csrfToken,
      user: mapUser(user),
    }),
  );
});

app.post("/logout", async (request) => {
  const schema = z.object({ sessionToken: z.string().min(1) });
  const input = schema.parse(request.body);

  await sql`
    delete from auth.sessions
    where token_hash = ${hashToken(input.sessionToken)}
  `;

  return { ok: true };
});

app.post("/forgot-password", async (request) => {
  const input = forgotPasswordInputSchema.parse(request.body);
  const userRows = await sql<UserRow[]>`
    select *
    from auth.users
    where lower(email) = ${input.email.toLowerCase()}
    limit 1
  `;

  const user = userRows[0];
  if (user) {
    const resetToken = generateToken();
    await sql`
      insert into auth.tokens (id, token_hash, user_id, email, role, purpose, expires_at)
      values (
        ${randomUUID()},
        ${hashToken(resetToken)},
        ${user.id},
        ${user.email},
        ${user.role},
        ${"reset_password"},
        now() + interval '2 hours'
      )
    `;

    await emitOutbox("user", user.id, "user.password_reset_requested", {
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
      resetUrl: `${env.APP_BASE_URL}/reset-password?token=${resetToken}`,
    });
  }

  return {
    message: "If that email exists, a password reset link has been sent.",
  };
});

app.post("/reset-password", async (request, reply) => {
  const input = resetPasswordInputSchema.parse(request.body);
  const tokenRows = await sql<{
    id: string;
    user_id: string | null;
  }[]>`
    select id, user_id
    from auth.tokens
    where token_hash = ${hashToken(input.token)}
      and purpose = 'reset_password'
      and consumed_at is null
      and expires_at > now()
    limit 1
  `;

  const token = tokenRows[0];
  if (!token?.user_id) {
    return reply.code(400).send({ message: "Password reset link is invalid or expired." });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  await sql.begin(async (transaction) => {
    await transaction`
      update auth.users
      set password_hash = ${passwordHash},
          updated_at = now()
      where id = ${token.user_id}
    `;
    await transaction`
      update auth.tokens
      set consumed_at = now()
      where id = ${token.id}
    `;
  });

  return { message: "Password has been reset." };
});

app.post("/verify-email", async (request, reply) => {
  const input = verifyEmailInputSchema.parse(request.body);
  const tokenRows = await sql<{
    id: string;
    user_id: string | null;
    email: string;
  }[]>`
    select id, user_id, email
    from auth.tokens
    where token_hash = ${hashToken(input.token)}
      and purpose = 'verify_email'
      and consumed_at is null
      and expires_at > now()
    limit 1
  `;

  const token = tokenRows[0];
  if (!token?.user_id) {
    return reply.code(400).send({ message: "Verification link is invalid or expired." });
  }

  await sql.begin(async (transaction) => {
    await transaction`
      update auth.users
      set email_verified = true,
          updated_at = now()
      where id = ${token.user_id}
    `;
    await transaction`
      update auth.tokens
      set consumed_at = now()
      where id = ${token.id}
    `;
  });

  await emitOutbox("user", token.user_id, "user.email_verified", {
    userId: token.user_id,
    email: token.email,
  });

  return { message: "Email verified successfully." };
});

app.post("/internal/session/resolve", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const schema = z.object({ sessionToken: z.string().min(1) });
  const input = schema.parse(request.body);

  const rows = await sql<
    Array<
      UserRow & {
        csrf_token: string;
        session_id: string;
      }
    >
  >`
    select
      u.*,
      s.csrf_token,
      s.id as session_id
    from auth.sessions s
    inner join auth.users u on u.id = s.user_id
    where s.token_hash = ${hashToken(input.sessionToken)}
      and s.expires_at > now()
    limit 1
  `;

  const session = rows[0];
  if (!session) {
    return reply.code(401).send({ message: "Invalid session." });
  }

  await sql`
    update auth.sessions
    set last_seen_at = now()
    where id = ${session.session_id}
  `;

  return {
    user: mapUser(session),
    csrfToken: session.csrf_token,
    sessionId: session.session_id,
  };
});

app.get("/internal/users", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const querySchema = z.object({
    role: roleSchema.optional(),
  });
  const query = querySchema.parse(request.query);

  // Use removed_at as a soft-delete marker when migration 005 is in place.
  // On databases without the column we still return the full list — the
  // admin page is never broken by an un-migrated environment.
  const supportsRemovedAt = await hasRemovedAtColumn();
  let rows: UserRow[];
  if (supportsRemovedAt) {
    rows = query.role
      ? await sql<UserRow[]>`
          select * from auth.users
          where role = ${query.role} and removed_at is null
          order by created_at desc
        `
      : await sql<UserRow[]>`
          select * from auth.users
          where removed_at is null
          order by created_at desc
        `;
  } else {
    rows = query.role
      ? await sql<UserRow[]>`
          select * from auth.users where role = ${query.role} order by created_at desc
        `
      : await sql<UserRow[]>`
          select * from auth.users order by created_at desc
        `;
  }

  return rows.map(mapUser);
});

app.get("/internal/users/:id", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const paramsSchema = z.object({ id: z.string().uuid() });
  const params = paramsSchema.parse(request.params);

  const rows = await sql<UserRow[]>`
    select *
    from auth.users
    where id = ${params.id}
    limit 1
  `;

  const user = rows[0];
  if (!user) {
    return reply.code(404).send({ message: "User not found." });
  }

  return mapUser(user);
});

// Customer service profile read. Returns both the session-shaped user and the
// full profile. Used by the gateway for /api/me/profile (self) and
// /api/admin/users/:id/profile (admin view).
app.get("/internal/users/:id/profile", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const user = await findUserById(params.id);
  if (!user) return reply.code(404).send({ message: "User not found." });
  return reply.send({ user: mapUser(user), profile: mapProfile(user) });
});

// Self-service / admin profile update. Role, approval status, email, and
// password are never touched here — only profile/contact fields — so a user
// can never escalate themselves through this endpoint. `profile_completed` is
// derived from whether the six required fields are all present (never set
// directly by the client), so onboarding auto-completes and a partial edit
// can't fake completion.
const profilePatchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  companyName: z.string().trim().max(120).nullable().optional(),
  contactPhone: z.string().trim().max(30).nullable().optional(),
  alternatePhone: z.string().trim().max(30).nullable().optional(),
  addressLine1: z.string().trim().max(200).nullable().optional(),
  addressLine2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  state: z.string().trim().max(80).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
});

app.patch("/internal/users/:id/profile", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const input = profilePatchSchema.parse(request.body);

  const existing = await findUserById(params.id);
  if (!existing) return reply.code(404).send({ message: "User not found." });

  const supportsProfile = await hasProfileColumns();
  if (!supportsProfile) {
    // Legacy database: only the display name is updatable.
    if (input.displayName) {
      await sql`
        update auth.users
        set display_name = ${input.displayName}, updated_at = now()
        where id = ${params.id}
      `;
    }
    const updated = await findUserById(params.id);
    return reply.send({
      user: updated ? mapUser(updated) : null,
      profile: updated ? mapProfile(updated) : null,
    });
  }

  // Merge provided fields over the existing row: `undefined` leaves a field
  // as-is, `null`/"" clears an optional field. display_name is NOT NULL so an
  // empty value falls back to the current name.
  const keep = <T>(provided: T | undefined, current: T): T =>
    provided === undefined ? current : provided;
  const next = {
    displayName:
      input.displayName && input.displayName.trim()
        ? input.displayName.trim()
        : existing.display_name,
    companyName: keep(input.companyName, existing.company_name ?? null),
    contactPhone: keep(input.contactPhone, existing.contact_phone ?? null),
    alternatePhone: keep(input.alternatePhone, existing.alternate_phone ?? null),
    addressLine1: keep(input.addressLine1, existing.address_line1 ?? null),
    addressLine2: keep(input.addressLine2, existing.address_line2 ?? null),
    city: keep(input.city, existing.city ?? null),
    state: keep(input.state, existing.state ?? null),
    postalCode: keep(input.postalCode, existing.postal_code ?? null),
    country: keep(input.country, existing.country ?? null),
  };

  const complete = isProfileComplete(next);

  await sql`
    update auth.users set
      display_name = ${next.displayName},
      company_name = ${next.companyName},
      contact_phone = ${next.contactPhone},
      alternate_phone = ${next.alternatePhone},
      address_line1 = ${next.addressLine1},
      address_line2 = ${next.addressLine2},
      city = ${next.city},
      state = ${next.state},
      postal_code = ${next.postalCode},
      country = ${next.country},
      profile_completed = ${complete},
      profile_completed_at = ${
        complete ? sql`coalesce(profile_completed_at, now())` : sql`null`
      },
      updated_at = now()
    where id = ${params.id}
  `;
  const updated = await findUserById(params.id);
  return reply.send({
    user: updated ? mapUser(updated) : null,
    profile: updated ? mapProfile(updated) : null,
  });
});

app.post("/internal/invite", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const input = inviteUserInputSchema.parse(request.body);
  const email = input.email.toLowerCase();

  const existingUsers = await sql<{ id: string }[]>`
    select id
    from auth.users
    where lower(email) = ${email}
    limit 1
  `;

  const userId = existingUsers[0]?.id ?? randomUUID();
  // Staff invites from an admin land approved.
  await sql`
    insert into auth.users (id, email, display_name, role, status, approval_status, approved_at)
    values (
      ${userId},
      ${email},
      ${input.displayName},
      ${input.role},
      ${"invited"},
      ${"approved"},
      now()
    )
    on conflict (id)
    do update set
      email = excluded.email,
      display_name = excluded.display_name,
      role = excluded.role,
      status = excluded.status,
      approval_status = 'approved',
      approved_at = coalesce(auth.users.approved_at, now()),
      updated_at = now()
  `;
  // Mark as staff-managed so the admin UI allows role changes later.
  await setAccountOrigin(userId, "admin_invite");

  const inviteToken = generateToken();
  await sql`
    insert into auth.tokens (id, token_hash, user_id, email, role, purpose, expires_at)
    values (
      ${randomUUID()},
      ${hashToken(inviteToken)},
      ${userId},
      ${email},
      ${input.role},
      ${"invite_signup"},
      now() + interval '7 days'
    )
  `;

  const inviteUrl = `${env.APP_BASE_URL}/signup?inviteToken=${inviteToken}&email=${encodeURIComponent(email)}&role=${input.role}`;
  await emitOutbox("user", userId, "user.registered", {
    userId,
    email,
    displayName: input.displayName,
    role: input.role,
    invitation: true,
    inviteUrl,
  });

  return {
    userId,
    inviteUrl,
  };
});

app.post("/internal/oauth/find-or-create", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const input = oauthFindOrCreateInputSchema.parse(request.body);

  if (!input.emailVerified) {
    return reply.code(400).send({ message: "Google email is not verified. Please verify your Google email first." });
  }

  const email = input.providerEmail.toLowerCase();
  await ensureOauthIdentitiesTable();

  // 1. Check for existing OAuth identity
  const existingIdentities = await sql<{ user_id: string }[]>`
    select user_id
    from auth.oauth_identities
    where provider = ${input.provider}
      and provider_user_id = ${input.providerUserId}
    limit 1
  `;

  let userId: string;

  if (existingIdentities.length > 0) {
    // OAuth identity already linked — login that user
    userId = existingIdentities[0].user_id;
  } else {
    // 2. Check for existing user with same email
    const existingUsers = await sql<UserRow[]>`
      select *
      from auth.users
      where lower(email) = ${email}
      limit 1
    `;

    if (existingUsers.length > 0) {
      // Link OAuth identity to existing user
      userId = existingUsers[0].id;
      await sql`
        insert into auth.oauth_identities (id, user_id, provider, provider_user_id, provider_email)
        values (${randomUUID()}, ${userId}, ${input.provider}, ${input.providerUserId}, ${email})
        on conflict (provider, provider_user_id) do nothing
      `;

      // Mark email as verified if not already (Google confirmed it)
      if (!existingUsers[0].email_verified) {
        await sql`
          update auth.users
          set email_verified = true, updated_at = now()
          where id = ${userId}
        `;
      }
    } else {
      // 3. Handle invite token if provided
      let role: string = "customer";

      if (input.inviteToken) {
        const inviteRows = await sql<{
          id: string;
          user_id: string | null;
          email: string;
          role: "engineer" | "admin" | "customer" | null;
        }[]>`
          select id, user_id, email, role
          from auth.tokens
          where token_hash = ${hashToken(input.inviteToken)}
            and purpose = 'invite_signup'
            and consumed_at is null
            and expires_at > now()
          limit 1
        `;

        const invite = inviteRows[0];
        if (invite && invite.role && invite.email.toLowerCase() === email) {
          role = invite.role;
          userId = invite.user_id ?? randomUUID();

          await sql`
            update auth.tokens
            set consumed_at = now()
            where id = ${invite.id}
          `;
        } else {
          // Invite invalid or email mismatch — create as regular customer
          userId = randomUUID();
        }
      } else {
        userId = randomUUID();
      }

      // Invited users (role !== customer) are pre-approved by an admin.
      // Self-service Google sign-ups become customers and land in pending_approval.
      const approvalStatus = role === "customer" ? "pending_approval" : "approved";
      const accountOrigin: AccountOrigin =
        role === "customer" ? "firebase_google" : "admin_invite";
      await sql`
        insert into auth.users (
          id, email, display_name, role, password_hash, email_verified, status, approval_status, approved_at
        )
        values (
          ${userId},
          ${email},
          ${input.displayName},
          ${role},
          ${null},
          ${true},
          ${'active'},
          ${approvalStatus},
          ${approvalStatus === 'approved' ? sql`now()` : sql`null`}
        )
        on conflict (id)
        do update set
          email = excluded.email,
          display_name = excluded.display_name,
          role = excluded.role,
          email_verified = excluded.email_verified,
          status = excluded.status,
          updated_at = now()
      `;
      await setAccountOrigin(userId, accountOrigin);

      // Link OAuth identity
      await sql`
        insert into auth.oauth_identities (id, user_id, provider, provider_user_id, provider_email)
        values (${randomUUID()}, ${userId}, ${input.provider}, ${input.providerUserId}, ${email})
        on conflict (provider, provider_user_id) do nothing
      `;
    }
  }

  // Fetch the user for session response
  const userRows = await sql<UserRow[]>`
    select * from auth.users where id = ${userId} limit 1
  `;

  const user = userRows[0];
  if (!user) {
    return reply.code(500).send({ message: "Failed to resolve user after OAuth." });
  }

  // Create session (same as /login)
  const sessionToken = generateToken();
  const csrfToken = generateToken(16);

  await sql`
    insert into auth.sessions (
      id, token_hash, csrf_token, user_id, user_agent, ip_address, expires_at
    )
    values (
      ${randomUUID()},
      ${hashToken(sessionToken)},
      ${csrfToken},
      ${user.id},
      ${request.headers["user-agent"] ?? null},
      ${request.ip},
      now() + ${sql`${env.SESSION_TTL_HOURS} * interval '1 hour'`}
    )
  `;

  return reply.send(
    sessionResponseSchema.parse({
      sessionToken,
      csrfToken,
      user: mapUser(user),
    }),
  );
});

// ─── Firebase ID-token session bridge ──────────────────────────────────────
app.post("/internal/firebase/session", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const input = firebaseSessionRequestSchema.parse(request.body);
  const email = input.email.toLowerCase();
  const firebaseUid = input.firebaseUid;

  // 1. Try to find an existing local user by firebase_uid first, then by email.
  let existing: UserRow | null = null;

  const byUid = await sql<UserRow[]>`
    select * from auth.users where firebase_uid = ${firebaseUid} limit 1
  `;
  if (byUid[0]) {
    existing = byUid[0];
  } else {
    const byEmail = await sql<UserRow[]>`
      select * from auth.users where lower(email) = ${email} limit 1
    `;
    if (byEmail[0]) {
      existing = byEmail[0];
      // Backfill the firebase_uid on an existing user (first time they
      // sign in through Firebase).
      await sql`
        update auth.users
        set firebase_uid = ${firebaseUid}, updated_at = now()
        where id = ${existing.id} and firebase_uid is null
      `;
    }
  }

  let user: UserRow;

  if (!existing) {
    // 2. No local user yet — create one as a customer pending approval.
    const userId = randomUUID();
    const accountOrigin: AccountOrigin =
      input.provider === "google.com" ? "firebase_google" : "self_signup";
    await sql`
      insert into auth.users (
        id, email, display_name, role, password_hash, email_verified,
        status, approval_status, firebase_uid
      )
      values (
        ${userId},
        ${email},
        ${input.displayName || email.split("@")[0]},
        ${"customer"},
        ${null},
        ${input.emailVerified},
        ${"active"},
        ${"pending_approval"},
        ${firebaseUid}
      )
    `;
    await setAccountOrigin(userId, accountOrigin);

    await emitOutbox("user", userId, "user.registered", {
      userId,
      email,
      displayName: input.displayName,
      role: "customer",
      invitation: false,
      provider: input.provider,
    });

    const created = await findUserById(userId);
    if (!created) {
      return reply.code(500).send({ message: "Failed to create user record." });
    }
    user = created;
  } else {
    // 3. Existing user — only flip email_verified up. Approval status,
    // role, and any other moderator state must NOT be overwritten here.
    if (input.emailVerified && !existing.email_verified) {
      await sql`
        update auth.users
        set email_verified = true, updated_at = now()
        where id = ${existing.id}
      `;
      existing.email_verified = true;
    }
    user = existing;
  }

  // 4. Always create a session, even for pending users — they need to be able
  //    to log in and see the "your account is pending approval" screen.
  const { sessionToken, csrfToken } = await createSessionForUser(user, request);

  return reply.send(
    sessionResponseSchema.parse({
      sessionToken,
      csrfToken,
      user: mapUser(user),
    }),
  );
});

// ─── Admin approval actions ────────────────────────────────────────────────
const approvalParamsSchema = z.object({ id: z.string().uuid() });

async function setApprovalStatus(
  userId: string,
  status: z.infer<typeof approvalStatusSchema>,
  actorId: string | null,
) {
  switch (status) {
    case "approved":
      await sql`
        update auth.users
        set approval_status = 'approved',
            approved_at = now(),
            approved_by = ${actorId},
            rejected_at = null,
            rejected_by = null,
            suspended_at = null,
            suspended_by = null,
            updated_at = now()
        where id = ${userId}
      `;
      break;
    case "rejected":
      await sql`
        update auth.users
        set approval_status = 'rejected',
            rejected_at = now(),
            rejected_by = ${actorId},
            updated_at = now()
        where id = ${userId}
      `;
      break;
    case "suspended":
      await sql`
        update auth.users
        set approval_status = 'suspended',
            suspended_at = now(),
            suspended_by = ${actorId},
            updated_at = now()
        where id = ${userId}
      `;
      break;
    case "pending_approval":
      await sql`
        update auth.users
        set approval_status = 'pending_approval',
            updated_at = now()
        where id = ${userId}
      `;
      break;
  }
}

function actorIdFrom(request: any): string | null {
  const value = request.headers["x-user-id"];
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

async function handleApprovalAction(
  request: any,
  reply: any,
  status: z.infer<typeof approvalStatusSchema>,
) {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const params = approvalParamsSchema.parse(request.params);
  approvalActionInputSchema.parse(request.body ?? {});

  const user = await findUserById(params.id);
  if (!user) {
    return reply.code(404).send({ message: "User not found." });
  }

  await setApprovalStatus(user.id, status, actorIdFrom(request));
  const updated = await findUserById(user.id);
  if (!updated) {
    return reply.code(500).send({ message: "User record disappeared." });
  }

  await emitOutbox("user", user.id, "user.approval_changed", {
    userId: user.id,
    email: user.email,
    approvalStatus: status,
  });

  return reply.send({ user: mapUser(updated) });
}

function isSystemAdminEmail(email: string): boolean {
  return email.toLowerCase() === env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
}

async function countAdmins(): Promise<number> {
  const [row] = await sql<Array<{ n: string }>>`
    select count(*) as n from auth.users where role = 'admin'
  `;
  return Number(row?.n ?? 0);
}

async function guardAdminMutation(
  request: any,
  reply: any,
  target: UserRow,
  intent: "suspend" | "demote" | "reject",
): Promise<boolean> {
  const actor = actorIdFrom(request);
  if (actor && actor === target.id) {
    reply.code(400).send({
      code: "CANNOT_MODIFY_SELF",
      message: "You cannot modify your own account.",
    });
    return false;
  }
  if (isSystemAdminEmail(target.email)) {
    reply.code(400).send({
      code: "CANNOT_MODIFY_SYSTEM_ADMIN",
      message: "The primary administrator account is protected.",
    });
    return false;
  }
  if (target.role === "admin") {
    if (intent === "suspend" || intent === "reject") {
      reply.code(400).send({
        code: "CANNOT_SUSPEND_ADMIN",
        message: "Administrators cannot be suspended. Remove admin privileges first.",
      });
      return false;
    }
    if (intent === "demote") {
      const admins = await countAdmins();
      if (admins <= 1) {
        reply.code(400).send({
          code: "CANNOT_REMOVE_LAST_ADMIN",
          message: "At least one administrator must remain.",
        });
        return false;
      }
    }
  }
  return true;
}

app.post("/internal/users/:id/approve", async (request, reply) =>
  handleApprovalAction(request, reply, "approved"),
);
app.post("/internal/users/:id/reject", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = approvalParamsSchema.parse(request.params);
  const user = await findUserById(params.id);
  if (!user) return reply.code(404).send({ message: "User not found." });
  if (!(await guardAdminMutation(request, reply, user, "reject"))) return;
  return handleApprovalAction(request, reply, "rejected");
});
app.post("/internal/users/:id/suspend", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = approvalParamsSchema.parse(request.params);
  const user = await findUserById(params.id);
  if (!user) return reply.code(404).send({ message: "User not found." });
  if (!(await guardAdminMutation(request, reply, user, "suspend"))) return;
  return handleApprovalAction(request, reply, "suspended");
});
app.post("/internal/users/:id/reactivate", async (request, reply) =>
  handleApprovalAction(request, reply, "approved"),
);

app.post("/internal/users/:id/role", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = approvalParamsSchema.parse(request.params);
  const input = z.object({ role: roleSchema }).parse(request.body);

  const user = await findUserById(params.id);
  if (!user) return reply.code(404).send({ message: "User not found." });

  if (user.role === input.role) {
    return reply.send({ user: mapUser(user) });
  }

  const actor = actorIdFrom(request);
  if (actor && actor === user.id) {
    return reply.code(400).send({
      code: "CANNOT_MODIFY_SELF",
      message: "You cannot change your own role.",
    });
  }
  if (isSystemAdminEmail(user.email)) {
    return reply.code(400).send({
      code: "CANNOT_MODIFY_SYSTEM_ADMIN",
      message: "The primary administrator account is protected.",
    });
  }
  if (user.role === "admin" && input.role !== "admin") {
    const admins = await countAdmins();
    if (admins <= 1) {
      return reply.code(400).send({
        code: "CANNOT_REMOVE_LAST_ADMIN",
        message: "At least one administrator must remain.",
      });
    }
  }

  // Staff-only role moves (anything that grants engineer or admin) require
  // the target to be a staff-managed account. Self-signup customers can be
  // approved, suspended, or removed, but not promoted.
  const grantingStaffRole = input.role === "engineer" || input.role === "admin";
  const origin = (user.account_origin ?? "self_signup") as AccountOrigin;
  const isStaffManaged = origin === "admin_invite" || origin === "legacy";
  if (grantingStaffRole && !isStaffManaged && user.role === "customer") {
    return reply.code(400).send({
      code: "USER_NOT_STAFF_MANAGED",
      message:
        "Only staff-invited accounts can be promoted. Invite this user through Manage staff access first.",
    });
  }

  await sql`
    update auth.users
    set role = ${input.role}, updated_at = now()
    where id = ${user.id}
  `;
  const updated = await findUserById(user.id);
  if (!updated) {
    return reply.code(500).send({ message: "User record disappeared." });
  }
  return reply.send({ user: mapUser(updated) });
});

// Hard delete. Removing a user permanently deletes their portal account and
// every record they own — sessions, tokens, OAuth identities, user-scoped
// outbox events, and all service requests they created (with each request's
// messages/history/outbox). It all runs in a single transaction so a partial
// failure rolls back and never leaves orphaned rows.
//
// The auth and service_desk schemas live in the same Postgres database behind a
// single shared connection (see @elkatech/config getDb), so one cross-schema
// transaction is the safest way to keep the delete atomic.
//
// Admin accounts are fully protected: no admin (self, system/bootstrap, or any
// other) can be removed here.
app.delete("/internal/users/:id", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = approvalParamsSchema.parse(request.params);
  const user = await findUserById(params.id);
  if (!user) return reply.code(404).send({ message: "User not found." });

  // ── Admin protection ────────────────────────────────────────────────
  const actor = actorIdFrom(request);
  if (actor && actor === user.id) {
    return reply.code(400).send({
      code: "CANNOT_MODIFY_SELF",
      message: "You cannot remove your own account.",
    });
  }
  if (isSystemAdminEmail(user.email)) {
    return reply.code(400).send({
      code: "CANNOT_MODIFY_SYSTEM_ADMIN",
      message: "Protected admin accounts cannot be removed.",
    });
  }
  if (user.role === "admin") {
    return reply.code(400).send({
      code: "CANNOT_REMOVE_ADMIN",
      message: "Protected admin accounts cannot be removed.",
    });
  }

  // Probe optional/related tables BEFORE the transaction so we only issue
  // deletes we know are valid (a failed statement inside `sql.begin` would
  // abort the whole tx). Then collect the service requests this user owns so
  // their dependent rows can be cleared before the requests themselves.
  const hasOauth = await tableExists("auth", "oauth_identities");
  const hasDeskRequests = await tableExists("service_desk", "requests");

  let requestIds: string[] = [];
  if (hasDeskRequests) {
    const ownedRequests = await sql<{ id: string }[]>`
      select id from service_desk.requests where customer_id = ${user.id}
    `;
    requestIds = ownedRequests.map((r) => r.id);
  }

  try {
    await sql.begin(async (tx) => {
      // 1–4. Service-desk data owned by the user.
      if (hasDeskRequests && requestIds.length > 0) {
        await tx`
          delete from service_desk.outbox
          where aggregate_type = 'service_request'
            and aggregate_id = any(${requestIds.map(String)}::text[])
        `;
        await tx`
          delete from service_desk.request_messages
          where request_id = any(${requestIds}::uuid[])
        `;
        await tx`
          delete from service_desk.request_history
          where request_id = any(${requestIds}::uuid[])
        `;
        await tx`
          delete from service_desk.requests
          where id = any(${requestIds}::uuid[])
        `;
      }

      // 5–8. Auth records tied to the user.
      await tx`delete from auth.sessions where user_id = ${user.id}`;
      await tx`delete from auth.tokens where user_id = ${user.id}`;
      if (hasOauth) {
        await tx`delete from auth.oauth_identities where user_id = ${user.id}`;
      }
      await tx`
        delete from auth.outbox
        where aggregate_type = 'user' and aggregate_id = ${user.id}
      `;

      // 9. The user row itself, last.
      await tx`delete from auth.users where id = ${user.id}`;
    });
  } catch (error) {
    request.log.error(
      { err: error, userId: user.id },
      "hard-delete user failed; transaction rolled back",
    );
    return reply.code(500).send({
      code: "USER_DELETE_FAILED",
      message: "Could not remove user.",
    });
  }

  // Best-effort Firebase Auth cleanup AFTER the DB commit. This is never fatal:
  // the local account is already gone, so a missing/failed Firebase deletion
  // must not turn a successful removal into a 500. We log clearly so the admin
  // can clean up Firebase manually if automatic deletion isn't available.
  if (user.firebase_uid) {
    try {
      const adminAuth = await getFirebaseAdminAuth();
      if (adminAuth) {
        await adminAuth.deleteUser(user.firebase_uid);
      } else {
        request.log.warn(
          { userId: user.id, firebaseUid: user.firebase_uid },
          "Firebase Admin SDK not configured — skipped Firebase Auth deletion. " +
            "Remove this user from the Firebase console manually if required.",
        );
      }
    } catch (error) {
      request.log.warn(
        { err: error, userId: user.id, firebaseUid: user.firebase_uid },
        "Firebase Auth deletion failed — local account already removed. " +
          "Remove this user from the Firebase console manually.",
      );
    }
  }

  return reply.send({ user: null });
});

// Health: counts for admin dashboard.
app.get("/internal/users/summary", async (request, reply) => {
  if (!ensureInternal(request)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  type SummaryRow = {
    pending_approval: string;
    approved: string;
    rejected: string;
    suspended: string;
    total: string;
  };
  const supportsRemovedAt = await hasRemovedAtColumn();
  const rows = supportsRemovedAt
    ? await sql<SummaryRow[]>`
        select
          count(*) filter (where approval_status = 'pending_approval') as pending_approval,
          count(*) filter (where approval_status = 'approved')         as approved,
          count(*) filter (where approval_status = 'rejected')         as rejected,
          count(*) filter (where approval_status = 'suspended')        as suspended,
          count(*)                                                     as total
        from auth.users
        where removed_at is null
      `
    : await sql<SummaryRow[]>`
        select
          count(*) filter (where approval_status = 'pending_approval') as pending_approval,
          count(*) filter (where approval_status = 'approved')         as approved,
          count(*) filter (where approval_status = 'rejected')         as rejected,
          count(*) filter (where approval_status = 'suspended')        as suspended,
          count(*)                                                     as total
        from auth.users
      `;
  const [summary] = rows;

  return {
    pendingApproval: Number(summary?.pending_approval ?? 0),
    approved: Number(summary?.approved ?? 0),
    rejected: Number(summary?.rejected ?? 0),
    suspended: Number(summary?.suspended ?? 0),
    total: Number(summary?.total ?? 0),
  };
});

const port = Number(new URL(env.AUTH_SERVICE_URL).port || "4001");

if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}

export default async function handler(req: any, res: any) {
  await app.ready();
  if (req.url?.startsWith('/api/internal-auth')) {
    req.url = req.url.replace('/api/internal-auth', '') || '/';
  }
  app.server.emit('request', req, res);
}
