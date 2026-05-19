import { z } from "zod";
import { baseEnvSchema, withVercelUrls } from "./env";

const notificationEnvSchema = baseEnvSchema.extend({
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  // String, not coerced boolean: z.coerce.boolean()("false") is truthy.
  SMTP_SECURE: z
    .string()
    .default("false")
    .transform((value) => value === "true" || value === "1"),
  // Optional so local SMTP servers without auth still work.
  SMTP_USER: z.string().optional(),
  // Resend API key. Supplied only via the environment -- never committed.
  SMTP_PASS: z.string().optional(),
  // Not .email(): a display-name sender ("Name <addr>") is valid for SMTP.
  SMTP_FROM: z.string().min(1).default("ElkaTech Support <ka8540@g.rit.edu>"),
});

export type NotificationEnv = z.infer<typeof notificationEnvSchema>;

let cachedNotificationEnv: NotificationEnv | null = null;

export function getNotificationEnv(): NotificationEnv {
  if (!cachedNotificationEnv) {
    cachedNotificationEnv = withVercelUrls(notificationEnvSchema.parse(process.env));
  }

  return cachedNotificationEnv;
}
