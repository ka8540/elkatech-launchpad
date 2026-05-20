import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApprovalStatus, AuthUser, Role } from "@elkatech/contracts";
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

type RoleChange = { role: Role };

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
    };

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
      return "Pending approval";
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

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<AuthUser[]>("/api/admin/users"),
  });

  const systemAdminEmail = useMemo(() => {
    // The bootstrap/system admin is the longest-tenured admin account.
    // Backend also enforces protection by email, so this is a UX hint only.
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
    onSuccess: async () => {
      await invalidateUserQueries();
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : "Unable to update user.";
      toast.error(message);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string } & RoleChange) =>
      apiRequest<{ user: AuthUser }>(`/api/admin/users/${userId}/role`, {
        method: "POST",
        body: JSON.stringify({ role }),
      }),
    onSuccess: async () => {
      await invalidateUserQueries();
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : "Unable to change role.";
      toast.error(message);
    },
  });

  const sortedUsers = useMemo(() => {
    const order: Record<ApprovalStatus, number> = {
      pending_approval: 0,
      approved: 1,
      suspended: 2,
      rejected: 3,
    };
    return [...users].sort((a, b) => {
      const diff = (order[a.approvalStatus] ?? 9) - (order[b.approvalStatus] ?? 9);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [users]);

  function runApprovalConfirm(
    user: AuthUser,
    action: ApprovalAction,
    successLabel: string,
  ) {
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

  function renderActions(user: AuthUser) {
    const isSelf = user.id === currentUserId;
    const isSystemAdmin = systemAdminEmail !== null && user.email === systemAdminEmail;
    const isOnlyAdmin = user.role === "admin" && adminCount <= 1;
    const buttons: React.ReactNode[] = [];
    const pending = approvalMutation.isPending || roleMutation.isPending;

    // Approval-state actions, scoped to non-admins to avoid the unsafe combos.
    if (user.role !== "admin") {
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

      if (
        user.approvalStatus === "suspended" ||
        user.approvalStatus === "rejected"
      ) {
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

    // Role-change actions.
    const canChangeRole = !isSelf && !isSystemAdmin;

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
      runApprovalConfirm(
        confirmState.user,
        confirmState.action,
        confirmState.action === "reject"
          ? "rejected"
          : confirmState.action === "suspend"
            ? "suspended"
            : confirmState.action === "approve"
              ? "approved"
              : "reactivated",
      );
    } else {
      runRoleConfirm(
        confirmState.user,
        confirmState.role,
        confirmState.role === "admin"
          ? "promoted to admin"
          : confirmState.role === "engineer"
            ? "set as engineer"
            : "set as customer",
      );
    }
    setConfirmState(null);
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
          Send a signup link to a new user. Choose the role that fits their access level.
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
              Customers can create service requests after admin approval. Engineers triage the
              queue. Admins manage users and the platform.
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

      {/* ── User list ────────────────────────────────────────────────── */}
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Users</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">Platform accounts</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Approve customer signups, manage roles, and reactivate suspended users. Admins are
          protected — they must lose admin privileges before they can be suspended.
        </p>

        <div className="mt-6 space-y-3">
          {sortedUsers.map((user) => {
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
                      <p className="font-semibold text-foreground">{user.displayName}</p>
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
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{user.email}</p>
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
                    </div>
                  </div>
                  <div className="shrink-0">{renderActions(user)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Confirmation dialog (shared for dangerous actions) ──────── */}
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
                confirmState?.destructive
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
