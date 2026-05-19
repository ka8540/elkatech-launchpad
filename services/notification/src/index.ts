import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import nodemailer from "nodemailer";
import { getDb } from "@elkatech/config";
import { getNotificationEnv } from "@elkatech/config/notification-env";
import { buildEmails } from "./emails";

const app = Fastify({ logger: true });
const sql = getDb();
const env = getNotificationEnv();

// SMTP transport. With Resend: host smtp.resend.com, port 587, user "resend",
// pass = Resend API key (from env only). Auth is omitted when no credentials
// are configured so a local auth-less SMTP server still works.
const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  ...(env.SMTP_USER && env.SMTP_PASS
    ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
    : {}),
});

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
    const emails = buildEmails(row.event_type, row.payload, env.BOOTSTRAP_ADMIN_EMAIL);

    try {
      for (const email of emails) {
        await transporter.sendMail({
          from: env.SMTP_FROM,
          ...email,
        });
      }

      await sql.begin(async (transaction) => {
        await transaction`
          update ${sql(schemaName)}.${sql(tableName)}
          set processed_at = now()
          where id = ${row.id}
        `;
        for (const email of emails) {
          // Idempotent per (event_id, recipient): a multi-recipient event
          // inserts one row per recipient, and a retry after an earlier
          // failure flips that recipient's row back to "sent".
          await transaction`
            insert into notification.deliveries (
              id,
              event_id,
              event_type,
              recipient_email,
              subject,
              status,
              sent_at
            )
            values (
              ${randomUUID()},
              ${row.id},
              ${row.event_type},
              ${email.to},
              ${email.subject},
              ${"sent"},
              now()
            )
            on conflict (event_id, recipient_email)
            do update set
              status = 'sent',
              subject = excluded.subject,
              sent_at = now(),
              last_error = null
          `;
        }
      });

      if (emails.length > 0) {
        app.log.info(
          {
            service: serviceName,
            eventType: row.event_type,
            eventId: row.id,
            recipients: emails.map((email) => email.to),
          },
          "notification emails sent",
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email error";
      app.log.error(
        {
          service: serviceName,
          eventType: row.event_type,
          eventId: row.id,
          error: message,
        },
        "notification email delivery failed",
      );

      // The event stays unprocessed so the next poll retries it.
      const failedTargets = emails.length > 0
        ? emails
        : [{ to: env.BOOTSTRAP_ADMIN_EMAIL, subject: `${serviceName} event ${row.event_type}` }];

      for (const target of failedTargets) {
        await sql`
          insert into notification.deliveries (
            id,
            event_id,
            event_type,
            recipient_email,
            subject,
            status,
            last_error
          )
          values (
            ${randomUUID()},
            ${row.id},
            ${row.event_type},
            ${target.to},
            ${target.subject},
            ${"failed"},
            ${message}
          )
          on conflict (event_id, recipient_email)
          do update set
            status = 'failed',
            attempts = notification.deliveries.attempts + 1,
            last_error = excluded.last_error
        `;
      }
    }
  }
}

async function poll() {
  await processOutbox("auth", "outbox", "auth");
  await processOutbox("service_desk", "outbox", "service-desk");
}

app.get("/health", async () => ({ ok: true, service: "notification" }));

// Run once on boot, then on an interval, so a freshly created verification
// email is not stuck waiting for the first tick.
void poll().catch((error) => {
  app.log.error(error);
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
