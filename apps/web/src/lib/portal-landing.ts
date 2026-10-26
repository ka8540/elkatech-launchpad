import { portalHomePathForRole, type AuthUser } from "@elkatech/contracts";

/**
 * Resolve the first page after authentication. Explicit deep links are
 * preserved, while the generic `/app` destination resolves to the role's home.
 */
export function landingPathForUser(user: AuthUser, next = ""): string {
  // Customers must finish onboarding before anything else.
  if (user.role === "customer" && !user.profileCompleted) {
    return "/app/complete-profile";
  }

  if (next && next !== "/app" && next !== "/app/") return next;
  return portalHomePathForRole(user.role);
}
