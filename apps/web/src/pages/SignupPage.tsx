import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import AuthPageShell from "@/components/AuthPageShell";
import GoogleIcon from "@/components/GoogleIcon";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_oauth_failed: "Google sign-in failed. Please try again or continue with email.",
  google_oauth_cancelled: "Google sign-in was cancelled.",
  google_email_unverified: "Your Google email is not verified. Please verify it with Google first.",
};

const SignupPage = () => {
  const navigate = useNavigate();
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

  const signupMutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          inviteToken,
        }),
      }),
    onSuccess: ({ message }) => {
      toast.success(message);
      navigate(`/login?email=${encodeURIComponent(form.email)}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleGoogleSignup = () => {
    setGoogleLoading(true);
    const params = new URLSearchParams();
    if (inviteToken) params.set("inviteToken", inviteToken);
    const qs = params.toString();
    window.location.href = `/api/auth/google/start${qs ? `?${qs}` : ""}`;
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
          disabled={googleLoading}
          aria-label="Continue with Google"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Continue with Google"}
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
          <Input
            type="password"
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
    </AuthPageShell>
  );
};

export default SignupPage;
