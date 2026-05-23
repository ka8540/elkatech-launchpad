import type { AuthUser } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";

const SESSION_COOKIE_BLOCKED_MESSAGE =
  "Your browser or extension blocked ElkaTech's secure login cookies. Allow cookies for this site, then try again.";

export class SessionCookieBlockedError extends Error {
  constructor() {
    super(SESSION_COOKIE_BLOCKED_MESSAGE);
    this.name = "SessionCookieBlockedError";
  }
}

export function isSessionCookieBlockedError(error: unknown): error is SessionCookieBlockedError {
  return error instanceof SessionCookieBlockedError;
}

export async function ensurePortalSessionReadable(): Promise<AuthUser> {
  await new Promise((resolve) => window.setTimeout(resolve, 75));
  const session = await apiRequest<{ user: AuthUser | null }>("/api/auth/me");

  if (!session.user) {
    throw new SessionCookieBlockedError();
  }

  return session.user;
}
