import { describe, expect, it } from "vitest";
import type { AuthUser, Role } from "@elkatech/contracts";
import {
  INVITABLE_ROLES,
  INVITE_ADMIN_WARNING,
  ROLE_WARNINGS,
  actionsFor,
  canDecideApprovalFor,
  canInviteAdmins,
  canManageRoleFor,
  canReactivateFor,
  invitableRolesFor,
  isElevatedRole,
  isStaffManaged,
  roleChangeOptions,
  filterUsers,
  initialsFor,
  isProtectedAccount,
  matchesTab,
  originLabel,
  profileLabel,
  resolveSystemAdminId,
  sortUsers,
  summarise,
  tabCounts,
  validateInvite,
  type ActorContext,
} from "./user-access";

function user(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "u-1",
    email: "person@elkatech.local",
    displayName: "Test Person",
    role: "customer",
    emailVerified: true,
    approvalStatus: "approved",
    accountOrigin: "self_signup",
    profileCompleted: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  } as AuthUser;
}

const admin: ActorContext = { role: "admin", id: "admin-1", systemAdminId: "system-1" };
const owner: ActorContext = { role: "owner", id: "owner-1", systemAdminId: "system-1" };

describe("tabs", () => {
  const users = [
    user({ id: "c1", role: "customer" }),
    user({ id: "c2", role: "customer", approvalStatus: "pending_approval" }),
    user({ id: "e1", role: "engineer" }),
    user({ id: "s1", role: "support", approvalStatus: "suspended" }),
    user({ id: "a1", role: "admin" }),
  ];

  it("routes each account to the right tab", () => {
    expect(matchesTab(users[0], "customers")).toBe(true);
    expect(matchesTab(users[0], "staff")).toBe(false);
    expect(matchesTab(users[2], "staff")).toBe(true);
    expect(matchesTab(users[1], "pending")).toBe(true);
    expect(matchesTab(users[3], "suspended")).toBe(true);
    expect(matchesTab(users[4], "all")).toBe(true);
  });

  it("counts every tab from one dataset", () => {
    expect(tabCounts(users)).toEqual({
      all: 5,
      customers: 2,
      staff: 3,
      pending: 1,
      suspended: 1,
    });
  });

  it("treats owner and support as staff, not customers", () => {
    expect(matchesTab(user({ role: "owner" }), "staff")).toBe(true);
    expect(matchesTab(user({ role: "support" }), "staff")).toBe(true);
    expect(matchesTab(user({ role: "owner" }), "customers")).toBe(false);
  });
});

describe("filtering", () => {
  const users = [
    user({ id: "1", displayName: "Kush Ahir", email: "kush@example.com", role: "customer" }),
    user({ id: "2", displayName: "Love Ahir", email: "love@example.com", role: "support" }),
    user({
      id: "3",
      displayName: "Jayesh K",
      email: "jayesh@example.com",
      role: "owner",
      accountOrigin: "admin_invite",
    }),
  ];
  const base = { tab: "all" as const, search: "", role: "all" as const, status: "all" as const, origin: "all" as const };

  it("searches name and email", () => {
    expect(filterUsers(users, { ...base, search: "kush" }).map((u) => u.id)).toEqual(["1"]);
    expect(filterUsers(users, { ...base, search: "love@" }).map((u) => u.id)).toEqual(["2"]);
    expect(filterUsers(users, { ...base, search: "AHIR" }).map((u) => u.id)).toEqual(["1", "2"]);
  });

  it("filters by every role including support and owner", () => {
    expect(filterUsers(users, { ...base, role: "support" }).map((u) => u.id)).toEqual(["2"]);
    expect(filterUsers(users, { ...base, role: "owner" }).map((u) => u.id)).toEqual(["3"]);
  });

  it("filters by status and origin", () => {
    expect(filterUsers(users, { ...base, status: "approved" })).toHaveLength(3);
    expect(filterUsers(users, { ...base, origin: "admin_invite" }).map((u) => u.id)).toEqual(["3"]);
  });

  it("combines tab and filters", () => {
    expect(filterUsers(users, { ...base, tab: "staff", role: "owner" }).map((u) => u.id)).toEqual([
      "3",
    ]);
  });
});

describe("sorting and summary", () => {
  it("surfaces pending approvals first", () => {
    const rows = sortUsers([
      user({ id: "a", approvalStatus: "approved" }),
      user({ id: "p", approvalStatus: "pending_approval" }),
      user({ id: "s", approvalStatus: "suspended" }),
    ]);
    expect(rows[0].id).toBe("p");
  });

  it("summarises the account mix", () => {
    expect(
      summarise([
        user({ id: "1", role: "customer" }),
        user({ id: "2", role: "engineer" }),
        user({ id: "3", role: "support", approvalStatus: "suspended" }),
        user({ id: "4", role: "customer", approvalStatus: "pending_approval" }),
      ]),
    ).toEqual({ total: 4, customers: 2, activeStaff: 1, pending: 1, suspended: 1 });
  });
});

describe("row actions", () => {
  it("never offers a direct make-<role> promotion action", () => {
    // Role changes exist, but only as the deliberate "role" action that opens
    // a two-step dialog — never a one-click "make admin"-style shortcut.
    const everyRole: Role[] = ["customer", "engineer", "support", "owner", "admin"];
    for (const role of everyRole) {
      const actions = actionsFor(user({ id: "x", role, accountOrigin: "admin_invite" }), admin);
      for (const forbidden of ["make-engineer", "make-admin", "make-support", "make-owner"]) {
        expect(actions.join(",")).not.toContain(forbidden);
      }
    }
  });

  it("offers machines only for customers", () => {
    expect(actionsFor(user({ role: "customer" }), admin)).toContain("machines");
    expect(actionsFor(user({ role: "engineer" }), admin)).not.toContain("machines");
  });

  it("keeps approve/reject out of the row actions even while pending", () => {
    const pending = actionsFor(user({ approvalStatus: "pending_approval" }), admin);
    expect(pending).not.toContain("approve");
    expect(pending).not.toContain("reject");
    expect(actionsFor(user({ approvalStatus: "approved" }), admin)).not.toContain("approve");
  });

  it("swaps suspend for reactivate based on account state", () => {
    expect(actionsFor(user({ approvalStatus: "approved" }), admin)).toContain("suspend");
    expect(actionsFor(user({ approvalStatus: "suspended" }), admin)).toContain("reactivate");
    expect(actionsFor(user({ approvalStatus: "suspended" }), admin)).not.toContain("suspend");
    expect(actionsFor(user({ approvalStatus: "rejected" }), admin)).toContain("reactivate");
  });

  it("keeps permanent removal admin-only", () => {
    expect(actionsFor(user({ role: "customer" }), admin)).toContain("remove");
    expect(actionsFor(user({ role: "customer" }), owner)).not.toContain("remove");
  });

  it("never offers removal of an admin account", () => {
    expect(actionsFor(user({ id: "other-admin", role: "admin" }), admin)).not.toContain("remove");
  });

  it("stops an owner from acting on an admin account", () => {
    const actions = actionsFor(user({ id: "a2", role: "admin" }), owner);
    expect(actions).toEqual(["details"]);
  });

  it("gates drawer approval decisions with status, manageability, and shared RBAC", () => {
    const pending = user({ id: "pending", approvalStatus: "pending_approval" });
    expect(canDecideApprovalFor(pending, admin)).toBe(true);
    expect(canDecideApprovalFor(pending, owner)).toBe(true);
    expect(canDecideApprovalFor(pending, { ...admin, role: "support" })).toBe(false);
    expect(canDecideApprovalFor(pending, { ...admin, role: "engineer" })).toBe(false);
    expect(canDecideApprovalFor(user({ approvalStatus: "approved" }), admin)).toBe(false);
    expect(canDecideApprovalFor(pending, { ...admin, id: pending.id })).toBe(false);
    expect(
      canDecideApprovalFor(user({ id: "a2", role: "admin", approvalStatus: "pending_approval" }), owner),
    ).toBe(false);
  });

  it("offers drawer reactivation only for supported states and permitted actors", () => {
    expect(canReactivateFor(user({ approvalStatus: "rejected" }), admin)).toBe(true);
    expect(canReactivateFor(user({ approvalStatus: "suspended" }), owner)).toBe(true);
    expect(canReactivateFor(user({ approvalStatus: "approved" }), admin)).toBe(false);
    expect(
      canReactivateFor(user({ approvalStatus: "suspended" }), {
        ...admin,
        role: "support",
      }),
    ).toBe(false);
  });

  it("offers no state changes and no role change on your own row", () => {
    expect(actionsFor(user({ id: admin.id, accountOrigin: "admin_invite" }), admin)).toEqual([
      "details",
      "machines",
    ]);
  });

  it("leaves the protected system account with no actions at all", () => {
    const systemAdmin = user({ id: "system-1", role: "admin" });
    expect(actionsFor(systemAdmin, admin)).toEqual([]);
    expect(isProtectedAccount(systemAdmin, admin)).toBe(true);
  });

  it("identifies the oldest admin as the system account", () => {
    const users = [
      user({ id: "new-admin", role: "admin", createdAt: "2026-06-01T00:00:00.000Z" }),
      user({ id: "old-admin", role: "admin", createdAt: "2024-01-01T00:00:00.000Z" }),
    ];
    expect(resolveSystemAdminId(users)).toBe("old-admin");
    expect(resolveSystemAdminId([user({ role: "customer" })])).toBeNull();
  });
});

describe("labels", () => {
  it("maps account origins to product wording", () => {
    expect(originLabel(user({ accountOrigin: "self_signup" }), false)).toBe("Public signup");
    expect(originLabel(user({ accountOrigin: "firebase_google" }), false)).toBe("Google signup");
    expect(originLabel(user({ accountOrigin: "admin_invite" }), false)).toBe("Staff invited");
    expect(originLabel(user({ accountOrigin: "admin_invite" }), true)).toBe("System account");
  });

  it("reports profile completion only for customers", () => {
    expect(profileLabel(user({ role: "customer", profileCompleted: true }))).toBe("Complete");
    expect(profileLabel(user({ role: "customer", profileCompleted: false }))).toBe("Incomplete");
    expect(profileLabel(user({ role: "engineer", profileCompleted: false }))).toBe("Not applicable");
  });

  it("builds initials defensively", () => {
    expect(initialsFor("Kush Jayesh Ahir")).toBe("KA");
    expect(initialsFor("Love")).toBe("LO");
    expect(initialsFor("  ")).toBe("?");
  });
});

describe("invite", () => {
  it("knows about Engineer, Support and Admin — never Owner or Customer", () => {
    expect(INVITABLE_ROLES.map((r) => r.value)).toEqual(["engineer", "support", "admin"]);
    expect(INVITABLE_ROLES.map((r) => r.value)).not.toContain("owner");
    expect(INVITABLE_ROLES.map((r) => r.value)).not.toContain("customer");
  });

  it("gives each invitable role a description", () => {
    for (const role of INVITABLE_ROLES) {
      expect(role.description.length).toBeGreaterThan(10);
    }
  });

  it("offers Admin only to an actor who may assign it", () => {
    expect(invitableRolesFor("admin").map((r) => r.value)).toEqual([
      "engineer",
      "support",
      "admin",
    ]);
    // An owner may never grant admin, so the option is absent rather than
    // disabled — matching what the gateway would accept.
    expect(invitableRolesFor("owner").map((r) => r.value)).toEqual(["engineer", "support"]);
    expect(invitableRolesFor("support")).toEqual([]);
    expect(invitableRolesFor("engineer")).toEqual([]);
    expect(invitableRolesFor("customer")).toEqual([]);
  });

  it("derives admin-invite permission from the shared RBAC helper", () => {
    expect(canInviteAdmins("admin")).toBe(true);
    expect(canInviteAdmins("owner")).toBe(false);
    expect(canInviteAdmins("support")).toBe(false);
    expect(canInviteAdmins("engineer")).toBe(false);
    expect(canInviteAdmins("customer")).toBe(false);
  });

  it("keeps Engineer and Support wording unchanged", () => {
    const byValue = Object.fromEntries(INVITABLE_ROLES.map((r) => [r.value, r]));
    expect(byValue.engineer.description).toBe(
      "Handles assigned service requests and updates work status.",
    );
    expect(byValue.support.description).toBe(
      "Coordinates customers, requests, and engineer assignments.",
    );
    expect(byValue.admin.description).toBe(
      "Manages platform users, permissions, approvals, and operational settings.",
    );
  });

  it("warns about the reach of administrator access", () => {
    expect(INVITE_ADMIN_WARNING).toContain("full platform management privileges");
    expect(INVITE_ADMIN_WARNING).toContain("Invite only trusted personnel.");
  });

  it("validates the invite form inline", () => {
    expect(validateInvite({ displayName: "", email: "" })).toEqual({
      displayName: "Enter a display name.",
      email: "Enter an email address.",
    });
    expect(validateInvite({ displayName: "A", email: "nope" })).toEqual({
      displayName: "Display name must be at least 2 characters.",
      email: "Enter a valid email address.",
    });
    expect(validateInvite({ displayName: "Ada L", email: "ada@example.com" })).toEqual({});
  });
});

describe("role management availability", () => {
  const staffInvited = { accountOrigin: "admin_invite" as const };

  it("offers Manage role for a staff-managed account", () => {
    expect(actionsFor(user({ id: "e1", role: "engineer", ...staffInvited }), admin)).toContain(
      "role",
    );
    expect(canManageRoleFor(user({ id: "e1", role: "engineer", ...staffInvited }), admin)).toBe(true);
  });

  it("never offers Manage role for the protected system account", () => {
    const systemAdmin = user({ id: "system-1", role: "admin", ...staffInvited });
    expect(canManageRoleFor(systemAdmin, admin)).toBe(false);
    expect(actionsFor(systemAdmin, admin)).not.toContain("role");
  });

  it("never offers Manage role on your own row, so you cannot lock yourself out", () => {
    const self = user({ id: admin.id, role: "admin", ...staffInvited });
    expect(canManageRoleFor(self, admin)).toBe(false);
    expect(actionsFor(self, admin)).not.toContain("role");
  });

  it("does not let a public or Google signup be promoted from the UI", () => {
    expect(isStaffManaged("self_signup")).toBe(false);
    expect(isStaffManaged("firebase_google")).toBe(false);
    expect(isStaffManaged("admin_invite")).toBe(true);
    expect(isStaffManaged("legacy")).toBe(true);

    for (const origin of ["self_signup", "firebase_google"] as const) {
      const customer = user({ id: "c9", role: "customer", accountOrigin: origin });
      expect(canManageRoleFor(customer, admin)).toBe(false);
      expect(actionsFor(customer, admin)).not.toContain("role");
    }
  });

  it("blocks an owner from managing an admin account's role", () => {
    const target = user({ id: "a9", role: "admin", ...staffInvited });
    expect(canManageRoleFor(target, owner)).toBe(false);
    expect(roleChangeOptions(target, owner)).toEqual([]);
  });

  it("sources options from assignableRolesFor and excludes the current role", () => {
    const engineer = user({ id: "e1", role: "engineer", ...staffInvited });
    const adminOptions = roleChangeOptions(engineer, admin);
    expect(adminOptions).toEqual(["customer", "support", "owner", "admin"]);
    expect(adminOptions).not.toContain("engineer");

    // Owner may never grant admin — the shared helper already says so.
    const ownerOptions = roleChangeOptions(engineer, owner);
    expect(ownerOptions).toEqual(["customer", "support", "owner"]);
    expect(ownerOptions).not.toContain("admin");
  });

  it("flags owner and admin as elevated and carries the agreed warning copy", () => {
    expect(isElevatedRole("admin")).toBe(true);
    expect(isElevatedRole("owner")).toBe(true);
    expect(isElevatedRole("engineer")).toBe(false);
    expect(isElevatedRole("support")).toBe(false);
    expect(ROLE_WARNINGS.admin).toBe(
      "Admin access grants full platform control, including destructive user-management actions.",
    );
    expect(ROLE_WARNINGS.owner).toBe(
      "Owner access grants operational and account-management privileges.",
    );
  });

  it("returns no options when the actor cannot change roles at all", () => {
    const support: ActorContext = { role: "support", id: "s1", systemAdminId: "system-1" };
    expect(roleChangeOptions(user({ role: "engineer", ...staffInvited }), support)).toEqual([]);
  });
});
