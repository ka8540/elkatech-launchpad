import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import nodemailer from "nodemailer";
import { getDb, getEnv } from "@elkatech/config";
import { isSesConfigured, sendSesTemplatedEmail } from "./ses";

const app = Fastify({ logger: true });
const sql = getDb();
const env = getEnv();

function portalUrl(): string {
  return env.APP_BASE_URL.replace(/\/+$/, "");
}

function requestUrl(requestId: string): string {
  return `${portalUrl()}/app/requests/${requestId}`;
}

/**
 * For the two SES-backed flows, build the list of templated sends.
 * Returns an empty array when the event isn't one we care about for SES.
 */
function buildSesSends(
  eventType: string,
  payload: Record<string, unknown>,
): Array<{ to: string; template: string; data: Record<string, string>; subjectForLog: string }> {
  switch (eventType) {
    case "user.registered": {
      // Mirror buildEmails(): we only send the "account added" SES template
      // for admin-invited accounts, not normal self-signup verifications.
      if (!payload.invitation) return [];
      const email = String(payload.email ?? "");
      if (!email) return [];
      return [
        {
          to: email,
          template: env.SES_ACCOUNT_ADDED_TEMPLATE,
          data: {
            email,
            portalUrl: portalUrl(),
          },
          subjectForLog: "Your ElkaTech service portal account has been added",
        },
      ];
    }
    case "request.assigned": {
      const customerEmail = String(payload.customerEmail ?? "");
      const engineerEmail = String(payload.engineerEmail ?? "");
      const data: Record<string, string> = {
        requestNumber: String(payload.requestNumber ?? ""),
        product: String(payload.product ?? ""),
        location: String(payload.location ?? ""),
        phone: String(payload.phone ?? ""),
        customerName: String(payload.customerName ?? payload.customerEmail ?? ""),
        engineerName: String(payload.engineerName ?? payload.engineerEmail ?? ""),
        requestUrl: requestUrl(String(payload.requestId ?? "")),
      };
      const subjectForLog = `Service request picked up: ${data.requestNumber}`;
      const sends: Array<{
        to: string;
        template: string;
        data: Record<string, string>;
        subjectForLog: string;
      }> = [];
      if (customerEmail) {
        sends.push({
          to: customerEmail,
          template: env.SES_REQUEST_CLAIMED_TEMPLATE,
          data,
          subjectForLog,
        });
      }
      if (engineerEmail && engineerEmail !== customerEmail) {
        sends.push({
          to: engineerEmail,
          template: env.SES_REQUEST_CLAIMED_TEMPLATE,
          data,
          subjectForLog,
        });
      }
      return sends;
    }
    default:
      return [];
  }
}

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
};

function buildEmails(eventType: string, payload: Record<string, unknown>): EmailPayload[] {
  switch (eventType) {
    case "user.registered":
      if (payload.invitation) {
        return [{
          to: String(payload.email),
          subject: "You have been invited to the Elkatech service platform",
          text: `Hi ${payload.displayName ?? "there"},\n\nYou have been invited as ${payload.role}.\n\nComplete your account here:\n${payload.inviteUrl ?? payload.verifyUrl}\n`,
        }];
      }

      return [{
        to: String(payload.email),
        subject: "Verify your Elkatech account",
        text: `Hi ${payload.displayName ?? "there"},\n\nPlease verify your email to activate your Elkatech account:\n${payload.verifyUrl}\n`,
      }];
    case "user.password_reset_requested":
      return [{
        to: String(payload.email),
        subject: "Reset your Elkatech password",
        text: `Hi ${payload.displayName ?? "there"},\n\nReset your password using this link:\n${payload.resetUrl}\n`,
      }];
    case "user.email_verified":
      return [{
        to: String(payload.email),
        subject: "Your Elkatech email is verified",
        text: `Your email has been verified successfully. You can now submit service requests.`,
      }];
    case "request.created":
      return [
        {
          to: env.BOOTSTRAP_ADMIN_EMAIL,
          subject: `New service request ${payload.requestNumber}`,
          text: `A new service request has been created by ${payload.customerName} for ${payload.productName}.\n\nSubject: ${payload.subject}\nCustomer email: ${payload.customerEmail}\n`,
        },
        {
          to: String(payload.customerEmail),
          subject: `We received your service request ${payload.requestNumber}`,
          text: `Hi ${payload.customerName ?? "there"},\n\nYour service request for ${payload.productName} has been created successfully.\n\nSubject: ${payload.subject}\nRequest number: ${payload.requestNumber}\n\nThe Elkatech service team will review it and update you inside the portal.`,
        },
      ];
    case "request.assigned":
      return [{
        to: String(payload.engineerEmail),
        subject: `Service request assigned: ${payload.requestNumber}`,
        text: `You have been assigned to service request ${payload.requestNumber}.\n\nCustomer email: ${payload.customerEmail}\nStatus: ${payload.status}\n`,
      }];
    case "request.status_changed":
      return [{
        to: String(payload.customerEmail),
        subject: `Your service request ${payload.requestNumber} was updated`,
        text: `Your service request status changed from ${payload.previousStatus} to ${payload.status}.\nUpdated by ${payload.actorName}.`,
      }];
    case "request.staff_reply_posted":
      return [{
        to: String(payload.customerEmail),
        subject: `New update on request ${payload.requestNumber}`,
        text: `${payload.authorName} replied to your service request:\n\n${payload.body}`,
      }];
    case "request.customer_message_posted":
      return [{
        to: env.BOOTSTRAP_ADMIN_EMAIL,
        subject: `Customer replied on request ${payload.requestNumber}`,
        text: `Customer update on request ${payload.requestNumber}:\n\n${payload.body}`,
      }];
    default:
      return [];
  }
}

async function processOutbox(
  schemaName: "auth" | "service_desk",
  tableName: "outbox",
  serviceName: "auth" | "service-desk",
) {
  const rows = await sql<any[]>`
    select *
    from ${sql(schemaName)}.${sql(tableName)}
    where processed_at is null
    order by occurred_at asc
    limit 20
  `;

  for (const row of rows) {
    // Prefer SES for the two transactional flows the platform formally
    // supports as templates (admin invite + request claim). Everything
    // else, plus the same flows when SES isn't configured, falls through
    // to the existing nodemailer/SMTP path so local Mailpit dev keeps
    // working unchanged.
    const sesSends =
      isSesConfigured() ? buildSesSends(row.event_type, row.payload) : [];
    const emails = sesSends.length === 0 ? buildEmails(row.event_type, row.payload) : [];

    // Per-recipient resilience: one failed send must NOT abort the rest.
    // SES sandbox often rejects only the unverified recipient — the
    // verified one should still receive the email. We attempt every
    // recipient independently, record per-recipient success/failure,
    // and always mark the outbox row processed once we've tried them
    // all so we don't loop forever on the same event.
    type Outcome =
      | { kind: "sent"; to: string; subject: string }
      | { kind: "failed"; to: string; subject: string; error: string };
    const outcomes: Outcome[] = [];

    if (sesSends.length > 0) {
      for (const send of sesSends) {
        try {
          const ok = await sendSesTemplatedEmail(send, app.log);
          outcomes.push(
            ok
              ? { kind: "sent", to: send.to, subject: send.subjectForLog }
              : {
                  kind: "failed",
                  to: send.to,
                  subject: send.subjectForLog,
                  error: `SES send failed for template ${send.template}`,
                },
          );
        } catch (error) {
          outcomes.push({
            kind: "failed",
            to: send.to,
            subject: send.subjectForLog,
            error: error instanceof Error ? error.message : "Unknown SES error",
          });
        }
      }
    } else {
      for (const email of emails) {
        try {
          await transporter.sendMail({ from: env.SMTP_FROM, ...email });
          outcomes.push({ kind: "sent", to: email.to, subject: email.subject });
        } catch (error) {
          outcomes.push({
            kind: "failed",
            to: email.to,
            subject: email.subject,
            error: error instanceof Error ? error.message : "Unknown SMTP error",
          });
        }
      }
    }

    try {
      await sql.begin(async (transaction) => {
        await transaction`
          update ${sql(schemaName)}.${sql(tableName)}
          set processed_at = now()
          where id = ${row.id}
        `;
        for (const outcome of outcomes) {
          if (outcome.kind === "sent") {
            await transaction`
              insert into notification.deliveries (
                id, event_id, event_type, recipient_email, subject, status, sent_at
              )
              values (
                ${randomUUID()}, ${row.id}, ${row.event_type},
                ${outcome.to}, ${outcome.subject}, ${"sent"}, now()
              )
              on conflict (event_id, recipient_email)
              do update set
                status = excluded.status,
                attempts = notification.deliveries.attempts + 1,
                sent_at = excluded.sent_at,
                last_error = null
            `;
          } else {
            await transaction`
              insert into notification.deliveries (
                id, event_id, event_type, recipient_email, subject, status, last_error
              )
              values (
                ${randomUUID()}, ${row.id}, ${row.event_type},
                ${outcome.to}, ${outcome.subject}, ${"failed"}, ${outcome.error}
              )
              on conflict (event_id, recipient_email)
              do update set
                status = excluded.status,
                attempts = notification.deliveries.attempts + 1,
                last_error = excluded.last_error
            `;
          }
        }
      });
    } catch (error) {
      // Bookkeeping failure (transaction rolled back). Outbox stays
      // unprocessed and we retry next poll. Log so we can see it.
      app.log.error(
        { err: error, eventId: row.id, eventType: row.event_type },
        "notification bookkeeping transaction failed",
      );
      // Touch a synthetic failed-delivery row so the deliveries audit
      // still surfaces the issue.
      const fallbackTo =
        outcomes[0]?.to ?? sesSends[0]?.to ?? emails[0]?.to ?? env.BOOTSTRAP_ADMIN_EMAIL;
      const fallbackSubject =
        outcomes[0]?.subject ??
        sesSends[0]?.subjectForLog ??
        emails[0]?.subject ??
        `${serviceName} event`;
      const message = error instanceof Error ? error.message : "Bookkeeping failure";
      await sql`
        insert into notification.deliveries (
          id, event_id, event_type, recipient_email, subject, status, last_error
        )
        values (
          ${randomUUID()}, ${row.id}, ${row.event_type},
          ${fallbackTo}, ${fallbackSubject}, ${"failed"}, ${message}
        )
        on conflict (event_id, recipient_email)
        do update set
          status = excluded.status,
          attempts = notification.deliveries.attempts + 1,
          last_error = excluded.last_error
      `;
    }
  }
}

async function poll() {
  await processOutbox("auth", "outbox", "auth");
  await processOutbox("service_desk", "outbox", "service-desk");
}

app.get("/health", async () => ({
  ok: true,
  service: "notification",
  environment: env.NODE_ENV,
}));

/**
 * On Vercel the function is suspended between requests, so the
 * setInterval poller above never fires in production — every
 * `emitOutbox()` from the gateway fires-and-forgets a request to this
 * endpoint to drain the outbox immediately. The internal-token guard
 * keeps it from being publicly callable.
 */
function ensureInternal(headers: Record<string, unknown>): boolean {
  return headers["x-internal-token"] === env.INTERNAL_SERVICE_TOKEN;
}

app.post("/process-outbox", async (request, reply) => {
  if (!ensureInternal(request.headers as Record<string, unknown>)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  try {
    await poll();
    return { ok: true };
  } catch (error) {
    app.log.error({ err: error }, "process-outbox failed");
    return reply.code(500).send({ message: "outbox processing failed" });
  }
});

setInterval(() => {
  void poll().catch((error) => {
    app.log.error(error);
  });
}, 3000);

const port = Number(new URL(env.NOTIFICATION_SERVICE_URL).port || "4004");

if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}

export default async function handler(req: any, res: any) {
  await app.ready();
  if (req.url?.startsWith('/api/internal-notification')) {
    req.url = req.url.replace('/api/internal-notification', '') || '/';
  }
  app.server.emit('request', req, res);
}
