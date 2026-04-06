import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import nodemailer from "nodemailer";
import { getDb, getEnv } from "@elkatech/config";

const app = Fastify({ logger: true });
const sql = getDb();
const env = getEnv();

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
    const emails = buildEmails(row.event_type, row.payload);
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
          `;
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email error";
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
          ${emails[0]?.to ?? env.BOOTSTRAP_ADMIN_EMAIL},
          ${emails[0]?.subject ?? `${serviceName} event`},
          ${"failed"},
          ${message}
        )
        on conflict (event_id)
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

app.get("/health", async () => ({ ok: true, service: "notification" }));

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
