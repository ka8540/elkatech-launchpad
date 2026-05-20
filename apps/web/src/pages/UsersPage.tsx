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
      return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "pending_approval":
      return "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300";
    case "rejected":
      return "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300";
    case "suspended":
      return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300";
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
      return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300";
    case "engineer":
      return "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-300";
    case "customer":
      return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300";
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
            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
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
            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-400/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
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
            className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
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
            className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-400/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
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
            className="border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-400/30 dark:text-amber-300 dark:hover:bg-amber-500/10"
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
        <span className="text-xs italic text-slate-400 dark:text-slate-500">
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
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Invite team member</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
          Manage staff access
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
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
            className="h-11 w-full rounded-md bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700"
            disabled={inviteMutation.isPending}
          >
            {inviteMutation.isPending ? "Inviting..." : "Create invite"}
          </Button>
        </form>

        {inviteUrl && (
          <div className="mt-6 rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Invite link
            </p>
            <p className="mt-2 break-all text-sm text-foreground">{inviteUrl}</p>
          </div>
        )}
      </div>

      {/* ── Users list ───────────────────────────────────────────────── */}
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">Users</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
              Platform accounts
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
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
                  className="h-[88px] animate-pulse rounded-2xl bg-slate-200/60 dark:bg-white/[0.04]"
                />
              ))}
            </div>
          )}

          {isError && !isLoading && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
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
            <div className="rounded-2xl border bg-muted/30 p-8 text-center">
              <p className="font-medium text-foreground">No users match your filters.</p>
              <p className="mt-1 text-sm text-muted-foreground">
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
                    "rounded-2xl border bg-muted/30 p-4",
                    user.role === "admin" &&
                      "border-blue-200 bg-blue-50/40 dark:border-blue-400/20 dark:bg-blue-500/5",
                  )}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-foreground">
                          {user.displayName}
                        </p>
                        {isSelf && (
                          <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300">
                            You
                          </span>
                        )}
                        {isSystemAdmin && (
                          <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300">
                            System admin
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
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
                              ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300"
                              : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-300",
                          )}
                        >
                          {originLabel(user.accountOrigin)}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
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
            <p className="text-muted-foreground">
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
              <span className="text-xs text-muted-foreground">
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
                    : "bg-blue-600 text-white hover:bg-blue-700",
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
