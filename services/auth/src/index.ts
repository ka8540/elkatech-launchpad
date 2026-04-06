import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import Fastify from "fastify";
import { z } from "zod";
import {
  createServiceRequestInputSchema,
  forgotPasswordInputSchema,
  inviteUserInputSchema,
  loginInputSchema,
  resetPasswordInputSchema,
  roleSchema,
  sessionResponseSchema,
  signUpInputSchema,
  verifyEmailInputSchema,
} from "@elkatech/contracts";
import { generateToken, getDb, getEnv, hashToken } from "@elkatech/config";

const app = Fastify({ logger: true });
const sql = getDb();
const env = getEnv();

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  role: z.infer<typeof roleSchema>;
  email_verified: boolean;
  password_hash: string | null;
  status: "active" | "invited";
  created_at: string;
};

function mapUser(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    emailVerified: row.email_verified,
    createdAt: new Date(row.created_at).toISOString(),
  };
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

app.get("/health", async () => ({ ok: true, service: "auth" }));

app.post("/signup", async (request, reply) => {
  const input = signUpInputSchema.parse(request.body);
  const passwordHash = await argon2.hash(input.password);

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
    await sql`
      insert into auth.users (id, email, display_name, role, password_hash, email_verified, status)
      values (
        ${userId},
        ${input.email.toLowerCase()},
        ${input.displayName},
        ${invite.role},
        ${passwordHash},
        ${false},
        ${"active"}
      )
      on conflict (id)
      do update set
        email = excluded.email,
        display_name = excluded.display_name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        status = excluded.status,
        updated_at = now()
    `;

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
  await sql`
    insert into auth.users (id, email, display_name, role, password_hash, email_verified, status)
    values (
      ${userId},
      ${input.email.toLowerCase()},
      ${input.displayName},
      ${"customer"},
      ${passwordHash},
      ${false},
      ${"active"}
    )
  `;

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
    message: "Account created. Please verify your email before creating requests.",
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

  const validPassword = await argon2.verify(user.password_hash, input.password);
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

  const passwordHash = await argon2.hash(input.password);
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

  const rows = query.role
    ? await sql<UserRow[]>`
        select *
        from auth.users
        where role = ${query.role}
        order by created_at desc
      `
    : await sql<UserRow[]>`
        select *
        from auth.users
        order by created_at desc
      `;

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
  await sql`
    insert into auth.users (id, email, display_name, role, status)
    values (${userId}, ${email}, ${input.displayName}, ${input.role}, ${"invited"})
    on conflict (id)
    do update set
      email = excluded.email,
      display_name = excluded.display_name,
      role = excluded.role,
      status = excluded.status,
      updated_at = now()
  `;

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
