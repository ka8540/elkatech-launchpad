import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
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
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
}
