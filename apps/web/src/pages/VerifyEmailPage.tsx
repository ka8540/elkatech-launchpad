import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, MailX, XCircle } from "lucide-react";
import AuthPageShell from "@/components/AuthPageShell";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const token = searchParams.get("token") ?? "";
  const hasRequested = useRef(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    onSuccess: () => {
      // Refresh the cached session so an already-signed-in user immediately
      // gets their verified status (and can create service requests).
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });

  // `mutate` is referentially stable; the ref guard makes sure the single-use
  // token is only ever submitted once (also covers React StrictMode remounts).
  const { mutate } = mutation;
  useEffect(() => {
    if (token && !hasRequested.current) {
      hasRequested.current = true;
      mutate();
    }
  }, [mutate, token]);

  const missingToken = !token;
  const isError = missingToken || mutation.isError;

  return (
    <AuthPageShell
      title="Verify your email"
      subtitle="We’re confirming your email so you can securely use the Elkatech service platform."
    >
      <div className="space-y-6">
        {/* Loading */}
        {!missingToken && (mutation.isPending || mutation.isIdle) && (
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent" />
            <span>Verifying your email address…</span>
          </div>
        )}

        {/* Success */}
        {mutation.isSuccess && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Email verified</p>
                <p className="mt-1 leading-relaxed">
                  {mutation.data.message} You can now sign in and create service requests.
                </p>
              </div>
            </div>
            <Button asChild variant="cta" size="lg" className="w-full">
              <Link to="/app/requests">Go to the service portal</Link>
            </Button>
            <Link
              to="/login"
              className="block text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Continue to sign in
            </Link>
          </div>
        )}

        {/* Error / expired / missing token */}
        {isError && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-200">
              {missingToken ? (
                <MailX className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {missingToken ? "Verification link incomplete" : "Verification failed"}
                </p>
                <p className="mt-1 leading-relaxed">
                  {missingToken
                    ? "This link is missing its verification token. Please open the most recent verification email and use that link."
                    : mutation.error.message}
                </p>
                <p className="mt-2 leading-relaxed text-rose-700/80 dark:text-rose-200/70">
                  If the link has expired, sign in and use “Resend verification email” from the
                  service portal to get a fresh one.
                </p>
              </div>
            </div>
            <Button asChild variant="cta" size="lg" className="w-full">
              <Link to="/login">Continue to sign in</Link>
            </Button>
          </div>
        )}
      </div>
    </AuthPageShell>
  );
};

export default VerifyEmailPage;
