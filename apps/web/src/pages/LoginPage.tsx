import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AuthUser } from "@elkatech/contracts";
import AuthPageShell from "@/components/AuthPageShell";
import GoogleIcon from "@/components/GoogleIcon";
import { ApiError, apiRequest } from "@/lib/api";
import {
  firebaseSignInEmail,
  firebaseSignInWithGoogle,
  getFirebaseIdToken,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_oauth_failed: "Google sign-in failed. Please try again or continue with email.",
  google_oauth_cancelled: "Google sign-in was cancelled.",
  google_email_unverified: "Your Google email is not verified. Please verify it with Google first.",
};

function describeFirebaseError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/auth\/wrong-password|auth\/invalid-credential|auth\/user-not-found/i.test(message)) {
    return "Invalid email or password.";
  }
  if (/auth\/too-many-requests/i.test(message)) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  if (/auth\/popup-closed-by-user/i.test(message)) {
    return "Google sign-in was cancelled.";
  }
  if (/auth\/network-request-failed/i.test(message)) {
    return "Network error. Please check your connection and try again.";
  }
  return "Sign-in failed. Please try again.";
}

function landingPathForUser(user: AuthUser, next: string): string {
  if (next) return next;
  if (user.role === "customer") return "/app/requests";
  return "/app/queue";
}

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({
    email: searchParams.get("email") ?? "",
    password: "",
  });

  const next = searchParams.get("next") ?? location.state?.next ?? "";
  const oauthError = searchParams.get("error");
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (oauthError && OAUTH_ERROR_MESSAGES[oauthError]) {
      toast.error(OAUTH_ERROR_MESSAGES[oauthError]);
    }
  }, [oauthError]);

  async function exchangeFirebaseToken(idToken: string): Promise<AuthUser> {
    const result = await apiRequest<{ user: AuthUser }>("/api/auth/firebase/session", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    return result.user;
  }

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (firebaseReady) {
        const credential = await firebaseSignInEmail(form.email, form.password);
        const idToken = await getFirebaseIdToken(credential.user);
        return exchangeFirebaseToken(idToken);
      }
      const result = await apiRequest<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      return result.user;
    },
    onSuccess: async (user) => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Logged in successfully.");
      navigate(landingPathForUser(user, next));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error(describeFirebaseError(error));
    },
  });

  const googleMutation = useMutation({
    mutationFn: async () => {
      if (firebaseReady) {
        const credential = await firebaseSignInWithGoogle();
        const idToken = await getFirebaseIdToken(credential.user);
        return exchangeFirebaseToken(idToken);
      }
      // Legacy Google OAuth fallback: redirect to gateway-driven flow.
      const params = new URLSearchParams();
      if (next) params.set("returnTo", next);
      const qs = params.toString();
      window.location.href = `/api/auth/google/start${qs ? `?${qs}` : ""}`;
      return null;
    },
    onSuccess: async (user) => {
      if (!user) return;
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Logged in with Google.");
      navigate(landingPathForUser(user, next));
    },
    onError: (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
        return;
      }
      toast.error(describeFirebaseError(error));
    },
    onSettled: () => setGoogleLoading(false),
  });

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    googleMutation.mutate();
  };

  return (
    <AuthPageShell
      title="Welcome back"
      subtitle="Sign in to create, track, and manage Elkatech service requests."
    >
      {/* Google OAuth */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="relative w-full gap-3 rounded-xl border-border/60 bg-background text-foreground shadow-sm transition-all hover:border-accent/40 hover:bg-accent/5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-accent/50"
          onClick={handleGoogleLogin}
          disabled={googleLoading || googleMutation.isPending}
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
          loginMutation.mutate();
        }}
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
          <Input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="you@company.com"
            className="bg-background"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
          <Input
            type="password"
            required
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Enter your password"
            className="bg-background"
          />
        </div>
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link to="/forgot-password" className="text-accent hover:underline">
          Forgot password?
        </Link>
        <Link to="/signup" className="text-muted-foreground hover:text-foreground">
          Create account
        </Link>
      </div>
    </AuthPageShell>
  );
};

export default LoginPage;
