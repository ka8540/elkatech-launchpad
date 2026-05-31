import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search } from "lucide-react";
import type {
  AccountOrigin,
  ApprovalStatus,
  AuthUser,
  Role,
} from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ApprovalAction = "approve" | "reject" | "suspend" | "reactivate";
type InviteRole = "customer" | "engineer" | "admin";

type RoleFilter = "all" | Role;
type StatusFilter = "all" | ApprovalStatus;
type OriginFilter = "all" | "self_signup" | "staff_managed";

type ConfirmState =
  | null
  | {
      kind: "approval";
      user: AuthUser;
      action: ApprovalAction;
      title: string;
      description: string;
      confirmLabel: string;
      destructive?: boolean;
    }
  | {
      kind: "role";
      user: AuthUser;
      role: Role;
      title: string;
      description: string;
      confirmLabel: string;
      destructive?: boolean;
    }
  | {
      kind: "remove";
      user: AuthUser;
      title: string;
      description: string;
      confirmLabel: string;
    };

const PAGE_SIZE = 25;

function approvalBadgeClass(status: ApprovalStatus): string {
  switch (status) {
    case "approved":
      return "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300";
    case "pending_approval":
      return "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300";
    case "rejected":
      return "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300";
    case "suspended":
      return "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]";
  }
}

function approvalLabel(status: ApprovalStatus): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "pending_approval":
      return "Pending";
    case "rejected":
      return "Rejected";
    case "suspended":
      return "Suspended";
  }
}

function roleBadgeClass(role: Role): string {
  switch (role) {
    case "admin":
      return "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]";
    case "engineer":
      return "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]";
    case "customer":
      return "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]";
  }
}

function roleLabel(role: Role): string {
  return role === "customer" ? "Customer" : role.charAt(0).toUpperCase() + role.slice(1);
}

function originLabel(origin: AccountOrigin): string {
  switch (origin) {
    case "admin_invite":
      return "Staff invited";
    case "firebase_google":
      return "Google signup";
    case "legacy":
      return "Legacy";
    case "self_signup":
    default:
      return "Self signup";
  }
}

function isStaffManaged(origin: AccountOrigin): boolean {
  return origin === "admin_invite" || origin === "legacy";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const UsersPage = () => {
  const queryClient = useQueryClient();
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id ?? null;

  const [form, setForm] = useState({
    displayName: "",
    email: "",
    role: "engineer" as InviteRole,
  });
  const [inviteUrl, setInviteUrl] = useState("");
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [page, setPage] = useState(0);

  const { data: users = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<AuthUser[]>("/api/admin/users"),
  });

  const systemAdminEmail = useMemo(() => {
    const admins = users.filter((u) => u.role === "admin");
    if (admins.length === 0) return null;
    return admins.reduce((oldest, u) =>
      new Date(u.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? u : oldest,
    ).email;
  }, [users]);

  const adminCount = useMemo(
    () => users.filter((u) => u.role === "admin").length,
    [users],
  );

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.approvalStatus !== statusFilter) return false;
      if (originFilter !== "all") {
        const staff = isStaffManaged(u.accountOrigin);
        if (originFilter === "staff_managed" && !staff) return false;
        if (originFilter === "self_signup" && staff) return false;
      }
      if (needle.length > 0) {
        const haystack = `${u.displayName} ${u.email}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, statusFilter, originFilter]);

  const sortedUsers = useMemo(() => {
    const order: Record<ApprovalStatus, number> = {
      pending_approval: 0,
      approved: 1,
      suspended: 2,
      rejected: 3,
    };
    return [...filteredUsers].sort((a, b) => {
      const diff = (order[a.approvalStatus] ?? 9) - (order[b.approvalStatus] ?? 9);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredUsers]);

  const pageCount = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageItems = sortedUsers.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  async function invalidateUserQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "users", "summary"] }),
    ]);
  }

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ inviteUrl: string }>("/api/admin/users/invite", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: async (payload) => {
      setInviteUrl(payload.inviteUrl);
      toast.success("Invitation created.");
      await invalidateUserQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approvalMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: string; action: ApprovalAction }) =>
      apiRequest<{ user: AuthUser }>(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: invalidateUserQueries,
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : "Unable to update user.";
      toast.error(message);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      apiRequest<{ user: AuthUser }>(`/api/admin/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role }),
      }),
    onSuccess: invalidateUserQueries,
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : "Unable to change role.";
      toast.error(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      apiRequest<{ user: AuthUser | null }>(`/api/admin/users/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: invalidateUserQueries,
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : "Unable to remove user.";
      toast.error(message);
    },
  });

  function runApprovalConfirm(user: AuthUser, action: ApprovalAction, successLabel: string) {
    approvalMutation.mutate(
      { userId: user.id, action },
      { onSuccess: () => toast.success(`${user.displayName}: ${successLabel}`) },
    );
  }

  function runRoleConfirm(user: AuthUser, role: Role, successLabel: string) {
    roleMutation.mutate(
      { userId: user.id, role },
      { onSuccess: () => toast.success(`${user.displayName}: ${successLabel}`) },
    );
  }

  function runRemoveConfirm(user: AuthUser) {
    removeMutation.mutate(
      { userId: user.id },
      { onSuccess: () => toast.success(`${user.displayName}: removed`) },
    );
  }

  function renderActions(user: AuthUser) {
    const isSelf = user.id === currentUserId;
    const isSystemAdmin = systemAdminEmail !== null && user.email === systemAdminEmail;
    const isOnlyAdmin = user.role === "admin" && adminCount <= 1;
    const isAdmin = user.role === "admin";
    const staffManaged = isStaffManaged(user.accountOrigin);
    const buttons: React.ReactNode[] = [];
    const pending =
      approvalMutation.isPending || roleMutation.isPending || removeMutation.isPending;

    // ── Approval-state actions (only for non-admins) ─────────────────────
    if (!isAdmin) {
      if (user.approvalStatus === "pending_approval") {
        buttons.push(
          <Button
            key="approve"
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={pending}
            onClick={() => runApprovalConfirm(user, "approve", "approved")}
          >
            Approve
          </Button>,
        );
        buttons.push(
          <Button
            key="reject"
            size="sm"
            variant="outline"
            className="border-rose-400/40 text-rose-600 hover:bg-rose-400/10 dark:text-rose-300"
            disabled={pending}
            onClick={() =>
              setConfirmState({
                kind: "approval",
                user,
                action: "reject",
                title: `Reject ${user.displayName}?`,
                description:
                  "They won't be able to create service requests. You can reactivate them later.",
                confirmLabel: "Reject user",
                destructive: true,
              })
            }
          >
            Reject
          </Button>,
        );
      }

      if (user.approvalStatus === "approved" && !isSelf) {
        buttons.push(
          <Button
            key="suspend"
            size="sm"
            variant="outline"
            className="border-rose-400/40 text-rose-600 hover:bg-rose-400/10 dark:text-rose-300"
            disabled={pending}
            onClick={() =>
              setConfirmState({
                kind: "approval",
                user,
                action: "suspend",
                title: `Suspend ${user.displayName}?`,
                description:
                  "They will not be able to sign in or create service requests until reactivated.",
                confirmLabel: "Suspend user",
                destructive: true,
              })
            }
          >
            Suspend
          </Button>,
        );
      }

      if (user.approvalStatus === "suspended" || user.approvalStatus === "rejected") {
        buttons.push(
          <Button
            key="reactivate"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runApprovalConfirm(user, "reactivate", "reactivated")}
          >
            Reactivate
          </Button>,
        );
      }
    }

    // ── Role-change actions (staff-managed only) ─────────────────────────
    const canChangeRole = !isSelf && !isSystemAdmin && staffManaged;

    if (canChangeRole) {
      if (user.role === "customer") {
        buttons.push(
          <Button
            key="promote-engineer"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runRoleConfirm(user, "engineer", "promoted to engineer")}
          >
            Make engineer
          </Button>,
        );
        buttons.push(
          <Button
            key="promote-admin"
            size="sm"
            variant="outline"
            className="border-[var(--lp-accent)]/40 text-[var(--lp-accent)] hover:bg-[var(--lp-accent)]/10"
            disabled={pending}
            onClick={() =>
              setConfirmState({
                kind: "role",
                user,
                role: "admin",
                title: `Promote ${user.displayName} to admin?`,
                description:
                  "Admins can approve users, change roles, and access the full admin dashboard.",
                confirmLabel: "Promote to admin",
              })
            }
          >
            Make admin
          </Button>,
        );
      } else if (user.role === "engineer") {
        buttons.push(
          <Button
            key="demote-customer"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => runRoleConfirm(user, "customer", "changed to customer")}
          >
            Make customer
          </Button>,
        );
        buttons.push(
          <Button
            key="promote-admin"
            size="sm"
            variant="outline"
            className="border-[var(--lp-accent)]/40 text-[var(--lp-accent)] hover:bg-[var(--lp-accent)]/10"
            disabled={pending}
            onClick={() =>
              setConfirmState({
                kind: "role",
                user,
                role: "admin",
                title: `Promote ${user.displayName} to admin?`,
                description:
                  "Admins can approve users, change roles, and access the full admin dashboard.",
                confirmLabel: "Promote to admin",
              })
            }
          >
            Make admin
          </Button>,
        );
      } else if (user.role === "admin" && !isOnlyAdmin) {
        buttons.push(
          <Button
            key="remove-admin"
            size="sm"
            variant="outline"
            className="border-amber-400/40 text-amber-700 hover:bg-amber-400/10 dark:text-amber-300"
            disabled={pending}
            onClick={() =>
              setConfirmState({
                kind: "role",
                user,
                role: "engineer",
                title: `Remove admin privileges from ${user.displayName}?`,
                description:
                  "They'll be demoted to engineer and lose access to admin tools. You can promote them again later.",
                confirmLabel: "Remove admin",
                destructive: true,
              })
            }
          >
            Remove admin
          </Button>,
        );
      }
    }

    // ── Remove user (soft delete; never for self/system/last admin) ──────
    if (!isSelf && !isSystemAdmin && !isOnlyAdmin) {
      buttons.push(
        <Button
          key="remove"
          size="sm"
          variant="outline"
          className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
          disabled={pending}
          onClick={() =>
            setConfirmState({
              kind: "remove",
              user,
              title: `Remove ${user.displayName}?`,
              description:
                "This disables portal access and ends any active sessions. Their service request history is preserved. You can reactivate them later.",
              confirmLabel: "Remove user",
            })
          }
        >
          Remove user
        </Button>,
      );
    }

    if (buttons.length === 0) {
      return (
        <span className="text-xs italic text-[var(--lp-faint)]">
          No actions available
        </span>
      );
    }
    return <div className="flex flex-wrap gap-2 sm:justify-end">{buttons}</div>;
  }

  function onConfirm() {
    if (!confirmState) return;
    if (confirmState.kind === "approval") {
      const labelMap: Record<ApprovalAction, string> = {
        approve: "approved",
        reject: "rejected",
        suspend: "suspended",
        reactivate: "reactivated",
      };
      runApprovalConfirm(confirmState.user, confirmState.action, labelMap[confirmState.action]);
    } else if (confirmState.kind === "role") {
      const labelMap: Record<Role, string> = {
        admin: "promoted to admin",
        engineer: "set as engineer",
        customer: "set as customer",
      };
      runRoleConfirm(confirmState.user, confirmState.role, labelMap[confirmState.role]);
    } else {
      runRemoveConfirm(confirmState.user);
    }
    setConfirmState(null);
  }

  function resetFilters() {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setOriginFilter("all");
    setPage(0);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      {/* ── Invite team member ───────────────────────────────────────── */}
      <div className="lp-card rounded-3xl border p-6">
        <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
          Invite team member
        </p>
        <h2 className="mt-2 lp-display text-2xl font-bold text-[var(--lp-ink)]">
          Manage staff access
        </h2>
        <p className="mt-2 text-sm text-[var(--lp-ink-soft)]">
          Users invited here are staff-managed accounts. Staff-managed accounts can later be
          assigned Engineer or Admin privileges.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            inviteMutation.mutate();
          }}
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Display name</label>
            <Input
              required
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
              className="bg-background"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
            <Input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="bg-background"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Role</label>
            <Select
              value={form.role}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, role: value as InviteRole }))
              }
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer">Customer / User</SelectItem>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              Customers can create service requests once approved. Engineers triage the queue.
              Admins manage users and the platform.
            </p>
          </div>
          <Button
            type="submit"
            className="h-11 w-full rounded-md bg-[var(--lp-accent)] font-semibold text-[#fbfaf6] shadow-sm transition-colors hover:bg-[var(--lp-accent-2)]"
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending ? "Inviting..." : "Create invite"}
          </Button>
        </form>

        {inviteUrl && (
          <div className="mt-6 rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/70 p-4">
            <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
              Invite link
            </p>
            <p className="mt-2 break-all text-sm text-[var(--lp-ink)]">{inviteUrl}</p>
          </div>
        )}
      </div>

      {/* ── Users list ───────────────────────────────────────────────── */}
      <div className="lp-card rounded-3xl border p-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
              Users
            </p>
            <h2 className="mt-2 lp-display text-2xl font-bold text-[var(--lp-ink)]">
              Platform accounts
            </h2>
            <p className="mt-2 text-sm text-[var(--lp-ink-soft)]">
              {users.length} total · {adminCount} admin{adminCount === 1 ? "" : "s"} · only
              staff-invited accounts can be promoted.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid gap-2 md:grid-cols-[1.5fr_repeat(3,_1fr)]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search name or email"
              className="bg-background pl-9"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(value) => {
              setRoleFilter(value as RoleFilter);
              setPage(0);
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="engineer">Engineer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as StatusFilter);
              setPage(0);
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending_approval">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={originFilter}
            onValueChange={(value) => {
              setOriginFilter(value as OriginFilter);
              setPage(0);
            }}
          >
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Origin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All origins</SelectItem>
              <SelectItem value="self_signup">Self signup</SelectItem>
              <SelectItem value="staff_managed">Staff invited</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List / states */}
        <div className="mt-5 space-y-2">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-2xl bg-[var(--lp-panel-2)]"
                />
              ))}
            </div>
          )}

          {isError && !isLoading && (
            <div className="rounded-2xl border border-rose-400/35 bg-rose-400/10 p-4 text-sm text-rose-700 dark:text-rose-200">
              <p className="font-medium">Could not load users.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => refetch()}
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && pageItems.length === 0 && (
            <div className="rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/70 p-8 text-center">
              <p className="font-medium text-[var(--lp-ink)]">No users match your filters.</p>
              <p className="mt-1 text-sm text-[var(--lp-ink-soft)]">
                Try clearing the search or filters to see everyone again.
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                Reset filters
              </Button>
            </div>
          )}

          {!isLoading && !isError &&
            pageItems.map((user) => {
              const isSelf = user.id === currentUserId;
              const isSystemAdmin =
                systemAdminEmail !== null && user.email === systemAdminEmail;
              return (
                <div
                  key={user.id}
                  className={cn(
                    "rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/70 p-4",
                    user.role === "admin" &&
                      "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/[0.06]",
                  )}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-[var(--lp-ink)]">
                          {user.displayName}
                        </p>
                        {isSelf && (
                          <span className="rounded-full border border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--lp-accent)]">
                            You
                          </span>
                        )}
                        {isSystemAdmin && (
                          <span className="rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--lp-ink-soft)]">
                            System admin
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-[var(--lp-ink-soft)]">
                        {user.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                            roleBadgeClass(user.role),
                          )}
                        >
                          {roleLabel(user.role)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                            approvalBadgeClass(user.approvalStatus),
                          )}
                        >
                          {approvalLabel(user.approvalStatus)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                            isStaffManaged(user.accountOrigin)
                              ? "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]"
                              : "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
                          )}
                        >
                          {originLabel(user.accountOrigin)}
                        </span>
                        <span className="text-[11px] text-[var(--lp-faint)]">
                          Joined {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0">{renderActions(user)}</div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Pagination */}
        {!isLoading && !isError && sortedUsers.length > PAGE_SIZE && (
          <div className="mt-5 flex items-center justify-between text-sm">
            <p className="text-[var(--lp-ink-soft)]">
              Showing {currentPage * PAGE_SIZE + 1}–
              {Math.min((currentPage + 1) * PAGE_SIZE, sortedUsers.length)} of{" "}
              {sortedUsers.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <span className="text-xs text-[var(--lp-faint)]">
                Page {currentPage + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={currentPage >= pageCount - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Confirmation dialog ─────────────────────────────────────── */}
      <AlertDialog
        open={confirmState !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirm}
              className={cn(
                confirmState && "destructive" in confirmState && confirmState.destructive
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : confirmState?.kind === "remove"
                    ? "bg-rose-600 text-white hover:bg-rose-700"
                    : "bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]",
              )}
            >
              {confirmState?.confirmLabel ?? "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersPage;
