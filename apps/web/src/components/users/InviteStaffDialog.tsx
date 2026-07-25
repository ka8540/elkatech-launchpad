import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Role } from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  INVITE_ADMIN_WARNING,
  invitableRolesFor,
  validateInvite,
  type InviteRole,
} from "./user-access";

/**
 * Staff invitation. Lives in a modal so it stops occupying half the page. The
 * role cards on offer come from the shared RBAC helper, so Admin only appears
 * for an actor the gateway would actually let create one.
 */
export default function InviteStaffDialog({
  open,
  onOpenChange,
  onInvited,
  actorRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void | Promise<void>;
  actorRole: Role;
}) {
  const roles = useMemo(() => invitableRolesFor(actorRole), [actorRole]);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    role: "engineer" as InviteRole,
  });
  const [errors, setErrors] = useState<{ displayName?: string; email?: string }>({});
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  // A role the actor is not allowed to offer can never be the one submitted,
  // even if the permitted set narrows while the dialog is open.
  const selectedRole = roles.find((role) => role.value === form.role) ?? roles[0];
  const role = selectedRole?.value ?? "engineer";

  function reset() {
    setForm({ displayName: "", email: "", role: "engineer" });
    setErrors({});
    setInviteUrl(null);
  }

  const invite = useMutation({
    mutationFn: () =>
      apiRequest<{ inviteUrl: string }>("/api/admin/users/invite", {
        method: "POST",
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          role,
        }),
      }),
    onSuccess: async (payload) => {
      toast.success(`Invitation sent to ${form.email.trim()}.`);
      setInviteUrl(payload.inviteUrl);
      await onInvited();
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError ? error.message : "Could not create the invitation.",
      );
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = validateInvite(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    invite.mutate();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite staff</DialogTitle>
          <DialogDescription>
            The invited person receives a link to set up their own password.
          </DialogDescription>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 p-3">
              <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
                Invite link
              </p>
              <p className="mt-2 break-all text-sm text-[var(--lp-ink)]">{inviteUrl}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => reset()}>
                Invite another
              </Button>
              <Button
                variant="cta"
                size="sm"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // noValidate: we show inline messages rather than the browser's
          // native validation bubble.
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div>
              <label
                htmlFor="invite-name"
                className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
              >
                Display name
              </label>
              <Input
                id="invite-name"
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
                aria-invalid={Boolean(errors.displayName)}
                aria-describedby={errors.displayName ? "invite-name-error" : undefined}
                className="lp-field"
              />
              {errors.displayName && (
                <p id="invite-name-error" className="mt-1.5 text-xs text-rose-600 dark:text-rose-300">
                  {errors.displayName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="invite-email"
                className="mb-1.5 block text-sm font-medium text-[var(--lp-ink)]"
              >
                Email
              </label>
              <Input
                id="invite-email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "invite-email-error" : undefined}
                className="lp-field"
              />
              {errors.email && (
                <p id="invite-email-error" className="mt-1.5 text-xs text-rose-600 dark:text-rose-300">
                  {errors.email}
                </p>
              )}
            </div>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-[var(--lp-ink)]">Role</legend>
              <div className="space-y-2">
                {roles.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors",
                      role === option.value
                        ? "border-[var(--lp-accent)]/55 bg-[var(--lp-accent)]/[0.07]"
                        : "border-[var(--lp-line)] hover:border-[var(--lp-line-strong)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="invite-role"
                      value={option.value}
                      checked={role === option.value}
                      onChange={() => setForm((current) => ({ ...current, role: option.value }))}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--lp-accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--lp-ink)]">
                        {option.label}
                      </span>
                      <span className="block text-xs leading-5 text-[var(--lp-ink-soft)]">
                        {option.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              {role === "admin" && (
                <div
                  role="alert"
                  className="mt-2 flex gap-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3"
                >
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
                  />
                  <p className="min-w-0 text-xs leading-5 text-[var(--lp-ink-soft)]">
                    {INVITE_ADMIN_WARNING}
                  </p>
                </div>
              )}
            </fieldset>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="cta" size="sm" disabled={invite.isPending}>
                {invite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {invite.isPending ? "Sending…" : "Send invite"}
              </Button>
            </DialogFooter>
            <p className="text-xs leading-5 text-[var(--lp-faint)]">
              Invited staff receive the {selectedRole?.label} role.{" "}
              {role === "admin"
                ? "Administrator invitations should be used only for trusted personnel."
                : "Owner access is not granted through invitations."}
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
