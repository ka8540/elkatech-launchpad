// Only load dotenv when running locally — on Vercel, env vars come from the dashboard
if (!process.env.VERCEL) {
  const { config } = await import("dotenv");
  config();
}
import { z } from "zod";


export const baseEnvSchema = z.object({
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
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().default("admin@elkatech.local"),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof baseEnvSchema>;

let cachedEnv: AppEnv | null = null;

export function withVercelUrls<T extends AppEnv>(env: T): T {
  if (process.env.VERCEL === "1" && process.env.VERCEL_URL) {
    const publicUrl = `https://${process.env.VERCEL_URL}`;
    env.APP_BASE_URL = publicUrl;
    env.GATEWAY_URL = `${publicUrl}/api`;
    env.AUTH_SERVICE_URL = `${publicUrl}/api/internal-auth`;
    env.CATALOG_SERVICE_URL = `${publicUrl}/api/internal-catalog`;
    env.SERVICE_DESK_URL = `${publicUrl}/api/internal-service-desk`;
    env.NOTIFICATION_SERVICE_URL = `${publicUrl}/api/internal-notification`;
  }

  return env;
}

export function getEnv(): AppEnv {
  if (!cachedEnv) {
    cachedEnv = withVercelUrls(baseEnvSchema.parse(process.env));
  }

  return cachedEnv;
}
