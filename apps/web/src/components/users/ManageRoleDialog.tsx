import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { AuthUser, Role } from "@elkatech/contracts";
import { ApiError, apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ROLE_LABELS,
  ROLE_WARNINGS,
  isElevatedRole,
  roleChangeOptions,
  type ActorContext,
} from "./user-access";

/**
 * Deliberate role change. Two steps by design: pick the target role, then
 * confirm a plain-language summary. A role can never be changed by a single
 * click from the table, which is what made the old inline buttons dangerous.
 *
 * Options come from the shared role-transition helper, so the UI can only
 * offer what the gateway will accept — it re-checks on every request.
 */
export default function ManageRoleDialog({
  user,
  actor,
  open,
  onOpenChange,
  onChanged,
}: {
  user: AuthUser | null;
  actor: ActorContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void | Promise<void>;
}) {
  const [selected, setSelected] = useState<Role | null>(null);
  const [step, setStep] = useState<"select" | "confirm">("select");

  // Reset whenever the dialog is opened for a different account.
  useEffect(() => {
    if (open) {
      setSelected(null);
      setStep("select");
    }
  }, [open, user?.id]);

  const options = user ? roleChangeOptions(user, actor) : [];

  const changeRole = useMutation({
    mutationFn: () =>
      apiRequest(`/api/admin/users/${user!.id}/role`, {
        method: "POST",
        body: JSON.stringify({ role: selected }),
      }),
    onSuccess: async () => {
      toast.success(
        `${user!.displayName} is now ${ROLE_LABELS[selected!]}.`,
      );
      await onChanged();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof ApiError ? error.message : "Could not change this role. Please try again.",
      );
    },
  });

  if (!user) return null;

  const elevated = selected !== null && isElevatedRole(selected);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage role</DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Changing a role changes what this person can see and do immediately."
              : "Review the change before applying it."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60 p-3">
          <p className="truncate text-sm font-medium text-[var(--lp-ink)]">{user.displayName}</p>
          <p className="truncate text-xs text-[var(--lp-faint)]">{user.email}</p>
          <p className="mt-1.5 text-xs text-[var(--lp-ink-soft)]">
            Current role:{" "}
            <span className="font-semibold text-[var(--lp-ink)]">{ROLE_LABELS[user.role]}</span>
          </p>
        </div>

        {step === "select" ? (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-[var(--lp-ink)]">New role</legend>
              {options.length === 0 ? (
                <p className="text-sm text-[var(--lp-faint)]">
                  You are not permitted to change this account&apos;s role.
                </p>
              ) : (
                <div className="space-y-2">
                  {options.map((role) => (
                    <label
                      key={role}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-lg border p-2.5 transition-colors",
                        selected === role
                          ? "border-[var(--lp-accent)]/55 bg-[var(--lp-accent)]/[0.07]"
                          : "border-[var(--lp-line)] hover:border-[var(--lp-line-strong)]",
                      )}
                    >
                      <input
                        type="radio"
                        name="new-role"
                        value={role}
                        checked={selected === role}
                        onChange={() => setSelected(role)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--lp-accent)]"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--lp-ink)]">
                          {ROLE_LABELS[role]}
                          {isElevatedRole(role) && (
                            <span className="rounded-full border border-amber-400/35 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-700 dark:text-amber-300">
                              Elevated
                            </span>
                          )}
                        </span>
                        <span className="block text-xs leading-5 text-[var(--lp-ink-soft)]">
                          {ROLE_WARNINGS[role]}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="cta"
                size="sm"
                // Disabled until a genuinely different role is chosen.
                disabled={selected === null || selected === user.role}
                onClick={() => setStep("confirm")}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div
              className={cn(
                "flex gap-3 rounded-lg border p-3",
                elevated
                  ? "border-amber-400/40 bg-amber-400/10"
                  : "border-[var(--lp-line)] bg-[var(--lp-panel-2)]/60",
              )}
              role={elevated ? "alert" : undefined}
            >
              {elevated && (
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300"
                />
              )}
              <div className="min-w-0 text-sm leading-6">
                <p className="text-[var(--lp-ink)]">
                  Change {user.displayName} from{" "}
                  <span className="font-semibold">{ROLE_LABELS[user.role]}</span> to{" "}
                  <span className="font-semibold">{ROLE_LABELS[selected!]}</span>?
                </p>
                <p className="mt-1 text-[var(--lp-ink-soft)]">{ROLE_WARNINGS[selected!]}</p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep("select")}
                disabled={changeRole.isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn(
                  elevated
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-[var(--lp-accent)] text-[#fbfaf6] hover:bg-[var(--lp-accent-2)]",
                )}
                disabled={changeRole.isPending}
                onClick={() => changeRole.mutate()}
              >
                {changeRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {changeRole.isPending ? "Saving…" : "Confirm role change"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
