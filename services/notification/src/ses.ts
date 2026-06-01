import { SESClient, SendTemplatedEmailCommand } from "@aws-sdk/client-ses";
import { getEnv } from "@elkatech/config";

/**
 * AWS SES delivery for the two transactional flows the portal cares about:
 *   - ElkaTechAccountAdded   — admin invited a user
 *   - ElkaTechRequestClaimed — engineer/admin claimed a service request
 *
 * SES is enabled only when the AWS credentials *and* SES_FROM_EMAIL are
 * configured. Without them the helper short-circuits to `null` and the
 * caller falls back to the existing nodemailer/SMTP path so local
 * development keeps working unchanged.
 */

let cachedClient: SESClient | null = null;
let warnedMissing = false;

function getSesClient(): SESClient | null {
  const env = getEnv();
  if (!env.SES_FROM_EMAIL) return null;
  if (!env.AWS_REGION) return null;
  // The official SDK reads AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY from
  // process.env automatically, but we surface a single early check so we
  // don't construct a broken client on a misconfigured environment.
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) return null;
  if (!cachedClient) {
    cachedClient = new SESClient({ region: env.AWS_REGION });
  }
  return cachedClient;
}

export function isSesConfigured(): boolean {
  return getSesClient() !== null;
}

export type SesTemplateSend = {
  to: string;
  template: string;
  data: Record<string, string>;
  /** Used only for the deliveries audit log when SES returns 2xx. */
  subjectForLog: string;
};

/** Send a single templated email. Returns true on success. The caller is
 *  responsible for the audit-log write — we only do the network call. */
export async function sendSesTemplatedEmail(
  payload: SesTemplateSend,
  logger: {
    info: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
    error: (obj: unknown, msg?: string) => void;
  },
): Promise<boolean> {
  const env = getEnv();
  const client = getSesClient();
  if (!client || !env.SES_FROM_EMAIL) {
    if (!warnedMissing) {
      logger.warn(
        { template: payload.template },
        "SES not configured; skipping templated email send.",
      );
      warnedMissing = true;
    }
    return false;
  }
  try {
    await client.send(
      new SendTemplatedEmailCommand({
        Source: env.SES_FROM_EMAIL,
        Destination: { ToAddresses: [payload.to] },
        Template: payload.template,
        TemplateData: JSON.stringify(payload.data),
      }),
    );
    logger.info(
      { template: payload.template, to: payload.to },
      "SES templated email sent.",
    );
    return true;
  } catch (error) {
    // Don't log secrets — only message + the template/recipient context.
    logger.error(
      {
        template: payload.template,
        to: payload.to,
        err: error instanceof Error ? error.message : String(error),
      },
      "SES templated email failed.",
    );
    return false;
  }
}
