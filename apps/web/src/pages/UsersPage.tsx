import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApprovalStatus, AuthUser } from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ApprovalAction = "approve" | "reject" | "suspend" | "reactivate";

function approvalBadgeClass(status: ApprovalStatus): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "pending_approval":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    case "suspended":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
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

const UsersPage = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    role: "engineer" as "engineer" | "admin",
  });
  const [inviteUrl, setInviteUrl] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<AuthUser[]>("/api/admin/users"),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ inviteUrl: string }>("/api/admin/users/invite", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: async (payload) => {
      setInviteUrl(payload.inviteUrl);
      toast.success("Invitation created.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", "summary"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: ApprovalAction }) =>
      apiRequest<{ user: AuthUser }>(`/api/admin/users/${userId}/${action}`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users", "summary"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof ApiError ? error.message : "Unable to update user.";
      toast.error(message);
    },
  });

  const sortedUsers = [...users].sort((a, b) => {
    const order: Record<ApprovalStatus, number> = {
      pending_approval: 0,
      approved: 1,
      suspended: 2,
      rejected: 3,
    };
    const diff = (order[a.approvalStatus] ?? 9) - (order[b.approvalStatus] ?? 9);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  function actionButton(user: AuthUser, action: ApprovalAction, label: string, variant: "default" | "outline" | "destructive" = "default") {
    return (
      <Button
        key={action}
        variant={variant === "destructive" ? "destructive" : variant}
        size="sm"
        disabled={approvalMutation.isPending}
        onClick={() => {
          approvalMutation.mutate(
            { userId: user.id, action },
            {
              onSuccess: () => toast.success(`${user.displayName}: ${label.toLowerCase()}`),
            },
          );
        }}
      >
        {label}
      </Button>
    );
  }

  function renderActions(user: AuthUser) {
    switch (user.approvalStatus) {
      case "pending_approval":
        return (
          <div className="flex flex-wrap gap-2">
            {actionButton(user, "approve", "Approve")}
            {actionButton(user, "reject", "Reject", "destructive")}
          </div>
        );
      case "approved":
        return (
          <div className="flex flex-wrap gap-2">
            {actionButton(user, "suspend", "Suspend", "destructive")}
          </div>
        );
      case "rejected":
        return (
          <div className="flex flex-wrap gap-2">
            {actionButton(user, "reactivate", "Reactivate")}
          </div>
        );
      case "suspended":
        return (
          <div className="flex flex-wrap gap-2">
            {actionButton(user, "reactivate", "Reactivate")}
          </div>
        );
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Invite Team Member</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">Manage staff access</h2>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            inviteMutation.mutate();
          }}
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Display Name</label>
            <Input
              required
              value={form.displayName}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
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
            <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value as "engineer" | "admin" }))}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="cta" className="w-full" disabled={inviteMutation.isPending}>
            {inviteMutation.isPending ? "Inviting..." : "Create invite"}
          </Button>
        </form>

        {inviteUrl && (
          <div className="mt-6 rounded-2xl border bg-muted/30 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Invite Link</p>
            <p className="mt-2 break-all text-sm text-foreground">{inviteUrl}</p>
          </div>
        )}
      </div>

      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Users</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">Platform accounts</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Approve new customer signups, suspend accounts, or reactivate suspended ones.
        </p>

        <div className="mt-6 space-y-4">
          {sortedUsers.map((user) => (
            <div key={user.id} className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-accent">{user.role}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${approvalBadgeClass(user.approvalStatus)}`}
                    >
                      {approvalLabel(user.approvalStatus)}
                    </span>
                  </div>
                </div>
                <div>{renderActions(user)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
