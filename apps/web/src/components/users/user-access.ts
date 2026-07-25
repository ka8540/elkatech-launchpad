import type { AccountOrigin, ApprovalStatus, AuthUser, Role } from "@elkatech/contracts";
import {
  assignableRolesFor,
  canApproveUsers,
  canChangeRoles,
  canDeleteUsers,
  canManageTargetUser,
  canSuspendUsers,
} from "@elkatech/contracts";

/**
 * Pure logic for the Users & Access page: which tab a row belongs to, which
 * filters it satisfies, and which actions the signed-in actor may perform on
 * it. Kept out of the component so the RBAC surface is unit-testable and can't
 * drift from the gateway's own checks.
 */

export type UserTabId = "all" | "customers" | "staff" | "pending" | "suspended";

export const USER_TABS: Array<{ id: UserTabId; label: string }> = [
  { id: "all", label: "All" },
  { id: "customers", label: "Customers" },
  { id: "staff", label: "Staff" },
  { id: "pending", label: "Pending approval" },
  { id: "suspended", label: "Suspended" },
];

/** Staff = anyone who is not a customer. */
export function isStaffRole(role: Role): boolean {
  return role !== "customer";
}

export function matchesTab(user: AuthUser, tab: UserTabId): boolean {
  switch (tab) {
    case "customers":
      return user.role === "customer";
    case "staff":
      return isStaffRole(user.role);
    case "pending":
      return user.approvalStatus === "pending_approval";
    case "suspended":
      return user.approvalStatus === "suspended";
    case "all":
    default:
      return true;
  }
}

export function tabCounts(users: AuthUser[]): Record<UserTabId, number> {
  return {
    all: users.length,
    customers: users.filter((u) => matchesTab(u, "customers")).length,
    staff: users.filter((u) => matchesTab(u, "staff")).length,
    pending: users.filter((u) => matchesTab(u, "pending")).length,
    suspended: users.filter((u) => matchesTab(u, "suspended")).length,
  };
}

/* ── Labels ──────────────────────────────────────────────────────────────── */

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  engineer: "Engineer",
  support: "Support",
  owner: "Owner",
  admin: "Admin",
};

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  approved: "Approved",
  pending_approval: "Pending",
  rejected: "Rejected",
  suspended: "Suspended",
};

/** Account type shown in its own column — how the account came to exist. */
export const ORIGIN_LABELS: Record<AccountOrigin, string> = {
  self_signup: "Public signup",
  firebase_google: "Google signup",
  admin_invite: "Staff invited",
  legacy: "System account",
};

export function originLabel(user: AuthUser, isSystemAdmin: boolean): string {
  if (isSystemAdmin) return "System account";
  return ORIGIN_LABELS[user.accountOrigin] ?? "Public signup";
}

/** Profile completion only means something for customers. */
export function profileLabel(user: AuthUser): "Complete" | "Incomplete" | "Not applicable" {
  if (user.role !== "customer") return "Not applicable";
  return user.profileCompleted ? "Complete" : "Incomplete";
}

export function initialsFor(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/* ── Filtering ───────────────────────────────────────────────────────────── */

export type RoleFilter = "all" | Role;
export type StatusFilter = "all" | ApprovalStatus;
export type OriginFilter = "all" | AccountOrigin;

export type UserFilters = {
  tab: UserTabId;
  search: string;
  role: RoleFilter;
  status: StatusFilter;
  origin: OriginFilter;
};

export function filterUsers(users: AuthUser[], filters: UserFilters): AuthUser[] {
  const needle = filters.search.trim().toLowerCase();
  return users.filter((user) => {
    if (!matchesTab(user, filters.tab)) return false;
    if (filters.role !== "all" && user.role !== filters.role) return false;
    if (filters.status !== "all" && user.approvalStatus !== filters.status) return false;
    if (filters.origin !== "all" && user.accountOrigin !== filters.origin) return false;
    if (needle) {
      const haystack = `${user.displayName} ${user.email}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/** Pending first so approvals surface, then newest. Stable id tie-break. */
export function sortUsers(users: AuthUser[]): AuthUser[] {
  const rank: Record<ApprovalStatus, number> = {
    pending_approval: 0,
    approved: 1,
    suspended: 2,
    rejected: 3,
  };
  return [...users].sort((a, b) => {
    const byStatus = (rank[a.approvalStatus] ?? 9) - (rank[b.approvalStatus] ?? 9);
    if (byStatus !== 0) return byStatus;
    const byDate = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

export function summarise(users: AuthUser[]) {
  return {
    total: users.length,
    customers: users.filter((u) => u.role === "customer").length,
    activeStaff: users.filter((u) => isStaffRole(u.role) && u.approvalStatus === "approved").length,
    pending: users.filter((u) => u.approvalStatus === "pending_approval").length,
    suspended: users.filter((u) => u.approvalStatus === "suspended").length,
  };
}

/* ── Row actions ─────────────────────────────────────────────────────────── */

export type UserActionId =
  | "details"
  | "machines"
  | "role"
  | "approve"
  | "reject"
  | "suspend"
  | "reactivate"
  | "remove";

/**
 * Staff-managed accounts are the only ones eligible for a role change. This
 * mirrors the product rule the previous page enforced ("only staff-invited
 * accounts can be promoted") — the gateway's role endpoint does not itself
 * check origin, so a public or Google signup must not be quietly turned into
 * privileged staff from the UI.
 */
export function isStaffManaged(origin: AccountOrigin): boolean {
  return origin === "admin_invite" || origin === "legacy";
}

/** Promoting to these carries platform-wide power, so the dialog warns harder. */
export const ELEVATED_ROLES: Role[] = ["owner", "admin"];

export function isElevatedRole(role: Role): boolean {
  return ELEVATED_ROLES.includes(role);
}

export const ROLE_WARNINGS: Partial<Record<Role, string>> = {
  admin: "Admin access grants full platform control, including destructive user-management actions.",
  owner: "Owner access grants operational and account-management privileges.",
  support: "Support can coordinate customers, requests, and engineer assignments.",
  engineer: "Engineers work assigned service requests and update their status.",
  customer: "Customers only see their own machines and service requests.",
};

/**
 * Roles the actor may move this user to. Sourced from the shared
 * `assignableRolesFor` helper the gateway enforces, minus the user's current
 * role — "change to what they already are" is not an option.
 */
export function roleChangeOptions(user: AuthUser, actor: ActorContext): Role[] {
  if (!canChangeRoles(actor.role)) return [];
  if (!canManageTargetUser(actor.role, user.role)) return [];
  return assignableRolesFor(actor.role).filter((role) => role !== user.role);
}

/**
 * Whether the Manage role action should be offered at all. Deliberately
 * conservative: never the protected system account, never your own row (a
 * self-demotion could lock you out), never a target RBAC says you cannot
 * manage, and never a self-signup customer.
 */
export function canManageRoleFor(user: AuthUser, actor: ActorContext): boolean {
  if (isProtectedAccount(user, actor)) return false;
  if (user.id === actor.id) return false;
  if (!isStaffManaged(user.accountOrigin)) return false;
  return roleChangeOptions(user, actor).length > 0;
}

export type ActorContext = {
  role: Role;
  id: string;
  /** Oldest admin account — the built-in platform owner. Never mutable. */
  systemAdminId: string | null;
};

/**
 * Actions the actor may take on this row. Every entry maps to a gateway
 * endpoint the actor is permitted to call, so the menu can never offer
 * something the backend will 403. Role promotion is deliberately absent:
 * staff are created through the invite flow only.
 */
export function actionsFor(user: AuthUser, actor: ActorContext): UserActionId[] {
  const isSelf = user.id === actor.id;
  const isSystemAdmin = actor.systemAdminId !== null && user.id === actor.systemAdminId;

  // The built-in admin is protected: no state changes, no deletion, ever.
  if (isSystemAdmin) return [];

  const canTouch = canManageTargetUser(actor.role, user.role);
  const actions: UserActionId[] = ["details"];

  if (user.role === "customer") actions.push("machines");

  // Role management is available but never as a one-click row button — the
  // menu entry opens a two-step confirmation dialog.
  if (canManageRoleFor(user, actor)) actions.push("role");

  if (canTouch && !isSelf) {
    if (user.approvalStatus === "pending_approval" && canApproveUsers(actor.role)) {
      actions.push("approve", "reject");
    }
    if (user.approvalStatus === "approved" && canSuspendUsers(actor.role)) {
      actions.push("suspend");
    }
    if (
      (user.approvalStatus === "suspended" || user.approvalStatus === "rejected") &&
      canSuspendUsers(actor.role)
    ) {
      actions.push("reactivate");
    }
    // Permanent deletion is admin-only and never offered for an admin account.
    if (canDeleteUsers(actor.role) && user.role !== "admin") {
      actions.push("remove");
    }
  }

  return actions;
}

/** True when the row represents the protected built-in admin. */
export function isProtectedAccount(user: AuthUser, actor: ActorContext): boolean {
  return actor.systemAdminId !== null && user.id === actor.systemAdminId;
}

/** Oldest admin account id — treated as the immutable system account. */
export function resolveSystemAdminId(users: AuthUser[]): string | null {
  const admins = users.filter((u) => u.role === "admin");
  if (admins.length === 0) return null;
  return admins.reduce((oldest, candidate) =>
    new Date(candidate.createdAt).getTime() < new Date(oldest.createdAt).getTime()
      ? candidate
      : oldest,
  ).id;
}

/* ── Invite ──────────────────────────────────────────────────────────────── */

/** Staff invitations are limited to the two operational roles. Owner and admin
 *  are intentionally not creatable from the UI. */
export const INVITABLE_ROLES = [
  {
    value: "engineer" as const,
    label: "Engineer",
    description: "Handles assigned service requests and updates work status.",
  },
  {
    value: "support" as const,
    label: "Support",
    description: "Coordinates customers, requests, and engineer assignments.",
  },
];

export type InviteRole = (typeof INVITABLE_ROLES)[number]["value"];

export function validateInvite(input: { displayName: string; email: string }): {
  displayName?: string;
  email?: string;
} {
  const errors: { displayName?: string; email?: string } = {};
  const name = input.displayName.trim();
  const email = input.email.trim();

  if (name.length === 0) errors.displayName = "Enter a display name.";
  else if (name.length < 2) errors.displayName = "Display name must be at least 2 characters.";

  if (email.length === 0) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  return errors;
}

export function formatJoined(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
