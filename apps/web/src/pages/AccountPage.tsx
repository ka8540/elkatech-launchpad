import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CircleUser,
  KeyRound,
  Mail,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import type { AuthUser } from "@elkatech/contracts";
import { useSession } from "@/hooks/use-session";
import { apiRequest, ApiError } from "@/lib/api";
import { firebaseSignOut } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const cardSurface = "lp-card border";

function statusBadgeClass(status: AuthUser["approvalStatus"]) {
  switch (status) {
    case "approved":
      return "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300";
    case "pending_approval":
      return "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300";
    case "rejected":
      return "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300";
    case "suspended":
      return "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]";
    default:
      return "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]";
  }
}

function originLabel(origin: AuthUser["accountOrigin"]) {
  switch (origin) {
    case "admin_invite":
      return "Staff invited";
    case "firebase_google":
      return "Google sign-in";
    case "legacy":
      return "Legacy account";
    case "self_signup":
    default:
      return "Self signup";
  }
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
        {label}
      </p>
      <div className="mt-1 text-sm text-[var(--lp-ink)]">{value}</div>
    </div>
  );
}

const AccountPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useSession();
  const user = data?.user ?? null;

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (user) setDisplayName(user.displayName);
  }, [user?.id, user?.displayName]);

  const profileMutation = useMutation({
    mutationFn: (input: { displayName: string }) =>
      apiRequest<{ user: AuthUser | null }>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      toast.success("Display name updated.");
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      await refetch();
    },
    onError: (error: unknown) => {
      const raw = error instanceof ApiError ? error.message : "";
      const looksTechnical = /FST_ERR|column|relation|Bad Request/i.test(raw);
      toast.error(
        raw && !looksTechnical ? raw : "Could not update profile. Please try again.",
      );
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/api/me/password-reset", {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Password reset email sent. Check your inbox.");
    },
    onError: () => {
      toast.error("Could not send reset email. Please try again.");
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className={cn("h-28 animate-pulse rounded-2xl", cardSurface)} />
        <div className={cn("h-48 animate-pulse rounded-2xl", cardSurface)} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("mx-auto max-w-3xl rounded-2xl p-6 text-sm text-[var(--lp-ink-soft)]", cardSurface)}>
        Your session has expired. Please sign in again.
      </div>
    );
  }

  const dirty = displayName.trim() !== user.displayName && displayName.trim().length >= 2;

  async function handleSignOutAfterChange() {
    try {
      await firebaseSignOut();
    } catch {
      /* non-fatal */
    }
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      /* non-fatal */
    }
    queryClient.clear();
    navigate("/login");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header */}
      <header className={cn("relative overflow-hidden rounded-2xl p-5 sm:p-6", cardSurface)}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
          style={{
            maskImage: "linear-gradient(to right, black, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
              <CircleUser className="h-4 w-4" />
            </div>
            <p className="lp-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
              Account
            </p>
          </div>
          <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)]">My Account</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-[var(--lp-ink-soft)]">
            View your portal details and manage sign-in settings.
          </p>
        </div>
      </header>

      {/* Profile summary */}
      <section className={cn("rounded-2xl p-5", cardSurface)}>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--lp-accent)] to-[var(--lp-accent-2)] text-xl font-bold text-[#08090b]">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="lp-display truncate text-lg font-semibold text-[var(--lp-ink)]">
              {user.displayName}
            </p>
            <p className="truncate text-sm text-[var(--lp-ink-soft)]">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center rounded-full border border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--lp-accent)]">
                {user.role}
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                  statusBadgeClass(user.approvalStatus),
                )}
              >
                {user.approvalStatus.replace(/_/g, " ")}
              </span>
              <span className="inline-flex items-center rounded-full border border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--lp-ink-soft)]">
                {originLabel(user.accountOrigin)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className={cn("rounded-2xl p-5", cardSurface)}>
        <div className="mb-4 flex items-center gap-2.5">
          <ShieldCheck className="h-4 w-4 text-[var(--lp-accent)]" />
          <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">Account details</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role" value={<span className="capitalize">{user.role}</span>} />
          <Field
            label="Approval status"
            value={<span className="capitalize">{user.approvalStatus.replace(/_/g, " ")}</span>}
          />
          <Field label="Account origin" value={originLabel(user.accountOrigin)} />
          <Field label="Joined" value={formatDate(user.createdAt)} />
          <Field
            label="Email verified"
            value={user.emailVerified ? "Yes" : "Pending verification"}
          />
        </div>
      </section>

      {/* Update display name */}
      <section className={cn("rounded-2xl p-5", cardSurface)}>
        <div className="mb-4 flex items-center gap-2.5">
          <UserCog className="h-4 w-4 text-[var(--lp-accent)]" />
          <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">Update display name</h2>
        </div>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!dirty) return;
            profileMutation.mutate({ displayName: displayName.trim() });
          }}
        >
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            minLength={2}
            maxLength={80}
            required
            className="lp-field"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-4 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
              onClick={() => setDisplayName(user.displayName)}
              disabled={!dirty || profileMutation.isPending}
            >
              Reset
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-[var(--lp-accent)] px-5 font-semibold text-[#fbfaf6] transition-colors hover:bg-[var(--lp-accent-2)]"
              disabled={!dirty || profileMutation.isPending}
            >
              {profileMutation.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </section>

      {/* Email — view + contact-admin note */}
      <section className={cn("rounded-2xl p-5", cardSurface)}>
        <div className="mb-4 flex items-center gap-2.5">
          <Mail className="h-4 w-4 text-[var(--lp-accent)]" />
          <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">Email address</h2>
        </div>
        <p className="text-sm text-[var(--lp-ink)]">{user.email}</p>
        <p className="mt-3 rounded-xl border border-amber-400/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-200">
          Your email is tied to your sign-in identity. To change it, contact a
          platform admin so they can re-issue the account safely.
        </p>
      </section>

      {/* Password reset */}
      <section className={cn("rounded-2xl p-5", cardSurface)}>
        <div className="mb-4 flex items-center gap-2.5">
          <KeyRound className="h-4 w-4 text-[var(--lp-accent)]" />
          <h2 className="lp-display text-base font-semibold text-[var(--lp-ink)]">Password</h2>
        </div>
        <p className="text-sm leading-6 text-[var(--lp-ink-soft)]">
          Send a password reset link to <span className="text-[var(--lp-ink)]">{user.email}</span>.
          For security you'll be signed out after using the link, and will need
          to sign in again with your new password.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={() => passwordResetMutation.mutate()}
            disabled={passwordResetMutation.isPending}
            className="rounded-full bg-[var(--lp-accent)] px-5 font-semibold text-[#fbfaf6] transition-colors hover:bg-[var(--lp-accent-2)]"
          >
            {passwordResetMutation.isPending ? "Sending…" : "Send password reset email"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSignOutAfterChange()}
            className="rounded-full border-rose-400/40 bg-transparent px-5 text-rose-600 hover:bg-rose-400/10 dark:text-rose-300"
          >
            Sign out
          </Button>
        </div>
        <p className="mt-3 text-xs text-[var(--lp-faint)]">
          For security, email or password changes may require you to sign in
          again.
        </p>
      </section>
    </div>
  );
};

export default AccountPage;
