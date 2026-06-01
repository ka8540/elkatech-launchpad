// Only load dotenv when running locally — on Vercel, env vars come from the dashboard.
// Each service starts from its own cwd (services/<name>) so dotenv's default
// "load .env from cwd" misses the workspace-root .env. Walk up the directory
// tree until we find one, so all services share the same env file.
if (!process.env.VERCEL) {
  const { config } = await import("dotenv");
  const { existsSync } = await import("node:fs");
  const { resolve, dirname } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const startDir = dirname(fileURLToPath(import.meta.url));
  let cursor = startDir;
  let envPath: string | undefined;
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(cursor, ".env");
    if (existsSync(candidate)) {
      envPath = candidate;
      break;
    }
    const parent = dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }
  config(envPath ? { path: envPath } : undefined);
}
import { z } from "zod";


const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  POSTGRES_URL: z.string().optional(),
  KV_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  DATABASE_URL: z.string().min(1).default("postgres://localhost:5432/elkatech"),
  INTERNAL_SERVICE_TOKEN: z.string().min(1).default("dev-internal-token"),
  APP_BASE_URL: z.string().url().default("http://127.0.0.1:8080"),
  GATEWAY_URL: z.string().url().default("http://127.0.0.1:4000"),
  AUTH_SERVICE_URL: z.string().url().default("http://127.0.0.1:4001"),
  CATALOG_SERVICE_URL: z.string().url().default("http://127.0.0.1:4002"),
  SERVICE_DESK_URL: z.string().url().default("http://127.0.0.1:4003"),
  NOTIFICATION_SERVICE_URL: z.string().url().default("http://127.0.0.1:4004"),
  SESSION_COOKIE_NAME: z.string().default("elkatech_session"),
  CSRF_COOKIE_NAME: z.string().default("elkatech_csrf"),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(720),
  SMTP_HOST: z.string().default("127.0.0.1"),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  // Nodemailer accepts both bare emails ("a@b.com") and addresses with a
  // display name ("Name <a@b.com>"), so we only require a non-empty string.
  SMTP_FROM: z.string().min(3).default("no-reply@elkatech.local"),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().default("admin@elkatech.local"),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  // AWS SES — optional. When SES_FROM_EMAIL + AWS credentials are set the
  // notification service uses SES SendTemplatedEmail for the two
  // transactional flows ("account added", "request claimed"). Leaving
  // these unset keeps the local Mailpit/SMTP flow working unchanged.
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  SES_FROM_EMAIL: z.string().optional(),
  SES_ACCOUNT_ADDED_TEMPLATE: z.string().default("ElkaTechAccountAdded"),
  SES_REQUEST_CLAIMED_TEMPLATE: z.string().default("ElkaTechRequestClaimed"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);

    // Automatically route internal-service traffic across Vercel infrastructure.
    // Use the CURRENT deployment URL (VERCEL_URL) so preview deployments call
    // themselves, not production. Only production should fall back to the
    // stable production URL.
    if (process.env.VERCEL === "1" && process.env.VERCEL_URL) {
      const isProduction = process.env.VERCEL_ENV === "production";
      const deploymentHost = isProduction
        ? process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL
        : process.env.VERCEL_URL;
      const publicUrl = `https://${deploymentHost}`;
      cachedEnv.APP_BASE_URL = publicUrl;
      cachedEnv.GATEWAY_URL = `${publicUrl}/api`;
      cachedEnv.AUTH_SERVICE_URL = `${publicUrl}/api/internal-auth`;
      cachedEnv.CATALOG_SERVICE_URL = `${publicUrl}/api/internal-catalog`;
      cachedEnv.SERVICE_DESK_URL = `${publicUrl}/api/internal-service-desk`;
      cachedEnv.NOTIFICATION_SERVICE_URL = `${publicUrl}/api/internal-notification`;
    }
  }

  return cachedEnv;
}
