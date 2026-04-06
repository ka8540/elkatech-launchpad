import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AuthUser } from "@elkatech/contracts";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ inviteUrl: string }>("/api/admin/users/invite", {
        method: "POST",
        body: JSON.stringify(form),
      }),
    onSuccess: async (payload) => {
      setInviteUrl(payload.inviteUrl);
      toast.success("Invitation created.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-3xl border bg-card p-6 shadow-soft">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Invite Team Member</p>
        <h2 className="mt-2 font-display text-3xl font-bold text-foreground">Manage staff access</h2>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
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
          <Button type="submit" variant="cta" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Inviting..." : "Create invite"}
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

        <div className="mt-6 space-y-4">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border bg-muted/30 p-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-foreground">{user.displayName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-accent">{user.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
