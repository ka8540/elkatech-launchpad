import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AuthUser } from "@elkatech/contracts";
import AuthPageShell from "@/components/AuthPageShell";
import GoogleIcon from "@/components/GoogleIcon";
import { ApiError, apiRequest } from "@/lib/api";
import { ensurePortalSessionReadable, isSessionCookieBlockedError } from "@/lib/sessionGuard";
import {
  firebaseSignInWithGoogle,
  firebaseSignUpEmail,
  getFirebaseIdToken,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_oauth_failed: "Google sign-in failed. Please try again or continue with email.",
  google_oauth_cancelled: "Google sign-in was cancelled.",
  google_email_unverified: "Your Google email is not verified. Please verify it with Google first.",
};

function describeFirebaseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/auth\/email-already-in-use/i.test(message)) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (/auth\/weak-password/i.test(message)) {
    return "Please choose a stronger password (at least 8 characters).";
  }
  if (/auth\/invalid-email/i.test(message)) {
    return "Please enter a valid email address.";
  }
  if (/auth\/popup-closed-by-user/i.test(message)) {
    return "Google sign-up was cancelled.";
  }
  if (/auth\/network-request-failed/i.test(message)) {
    return "Network error. Please check your connection and try again.";
  }
  return "Sign-up failed. Please try again.";
}

const SignupPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("inviteToken") ?? undefined;
  const inviteRole = searchParams.get("role");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: searchParams.get("email") ?? "",
    password: "",
  });

  const oauthError = searchParams.get("error");
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (oauthError && OAUTH_ERROR_MESSAGES[oauthError]) {
      toast.error(OAUTH_ERROR_MESSAGES[oauthError]);
    }
  }, [oauthError]);

  const title = useMemo(() => {
    if (inviteToken) {
      return `Complete your ${inviteRole ?? "team"} account`;
    }
    return "Create your account";
  }, [inviteRole, inviteToken]);

  async function exchangeFirebaseToken(idToken: string): Promise<AuthUser> {
    const result = await apiRequest<{ user: AuthUser }>("/api/auth/firebase/session", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    return result.user;
  }

  function landingForRoleAndStatus(user: AuthUser): string {
    if (user.role !== "customer") {
      return user.role === "admin" ? "/app/queue" : "/app/queue";
    }
    return "/app/requests";
  }

  const signupMutation = useMutation({
    mutationFn: async () => {
      // For invite-token signups the legacy backend flow handles role
      // assignment, so we keep using that route. For self-service
      // signups we use Firebase Auth + the session bridge.
      if (inviteToken || !firebaseReady) {
        const result = await apiRequest<{ message: string }>("/api/auth/signup", {
          method: "POST",
          body: JSON.stringify({ ...form, inviteToken }),
        });
        return { kind: "legacy" as const, message: result.message };
      }

      const credential = await firebaseSignUpEmail(form.email, form.password);
      const idToken = await getFirebaseIdToken(credential.user);
      await exchangeFirebaseToken(idToken);
      const user = await ensurePortalSessionReadable();
      return { kind: "firebase" as const, user };
    },
    onSuccess: async (result) => {
      if (result.kind === "legacy") {
        toast.success(result.message);
        navigate(`/login?email=${encodeURIComponent(form.email)}`);
        return;
      }
      // Seed cache synchronously so ProtectedRoute sees the fresh user on
      // first render (the session query is inactive on this page, so an
      // invalidate alone would not refetch before navigation).
      queryClient.setQueryData(["session"], { user: result.user });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Account created. An administrator will activate your account shortly.");
      navigate(landingForRoleAndStatus(result.user));
    },
    onError: (error: unknown) => {
      if (isSessionCookieBlockedError(error)) {
        toast.error(error.message, { duration: 7000 });
        return;
      }
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error(describeFirebaseError(error));
    },
  });

  const googleSignupMutation = useMutation({
    mutationFn: async () => {
      if (firebaseReady) {
        const credential = await firebaseSignInWithGoogle();
        const idToken = await getFirebaseIdToken(credential.user);
        await exchangeFirebaseToken(idToken);
        return ensurePortalSessionReadable();
      }
      const params = new URLSearchParams();
      if (inviteToken) params.set("inviteToken", inviteToken);
      const qs = params.toString();
      window.location.href = `/api/auth/google/start${qs ? `?${qs}` : ""}`;
      return null;
    },
    onSuccess: async (user) => {
      if (!user) return;
      queryClient.setQueryData(["session"], { user });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Account created with Google.");
      navigate(landingForRoleAndStatus(user));
    },
    onError: (error: unknown) => {
      if (isSessionCookieBlockedError(error)) {
        toast.error(error.message, { duration: 7000 });
        return;
      }
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error(describeFirebaseError(error));
    },
    onSettled: () => setGoogleLoading(false),
  });

  const handleGoogleSignup = () => {
    setGoogleLoading(true);
    googleSignupMutation.mutate();
  };

  return (
    <AuthPageShell
      title={title}
      subtitle="Your Elkatech account lets you create service requests and collaborate with the service team in one secure place."
    >
      {/* Google OAuth */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="relative w-full gap-3 rounded-xl border-border/60 bg-background text-foreground shadow-sm transition-all hover:border-accent/40 hover:bg-accent/5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent/50"
          onClick={handleGoogleSignup}
          disabled={googleLoading || googleSignupMutation.isPending}
          aria-label="Continue with Google"
        >
          <GoogleIcon />
          {googleLoading ? "Connecting…" : "Continue with Google"}
        </Button>

        {/* Divider */}
        <div className="relative flex items-center gap-4 py-2">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-xs font-medium text-muted-foreground">or continue with email</span>
          <div className="h-px flex-1 bg-border/60" />
        </div>
      </div>

      {/* Email/password form */}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          signupMutation.mutate();
        }}
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Display Name</label>
          <Input
            required
            value={form.displayName}
            onChange={(event) =>
              setForm((current) => ({ ...current, displayName: event.target.value }))
            }
            placeholder="Your full name"
            className="bg-background"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@company.com"
            className="bg-background"
            readOnly={Boolean(inviteToken)}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
          <PasswordInput
            required
            minLength={8}
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="At least 8 characters"
            className="bg-background"
          />
        </div>
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={signupMutation.isPending}>
          {signupMutation.isPending ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <div className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </div>
      <p className="mt-5 rounded-[8px] border border-[rgba(210,130,63,0.24)] bg-[rgba(210,130,63,0.08)] px-3 py-2 text-xs leading-5 text-muted-foreground">
        Secure sign-up uses first-party cookies. If Firefox or an extension stops after Google,
        allow cookies for this site and try again.
      </p>
    </AuthPageShell>
  );
};

export default SignupPage;
