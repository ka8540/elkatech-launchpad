import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import AuthPageShell from "@/components/AuthPageShell";
import { apiRequest } from "@/lib/api";
import { isFirebaseConfigured } from "@/lib/firebase";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const firebaseReady = isFirebaseConfigured();

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
  });

  useEffect(() => {
    // Only run the legacy backend verification flow for legacy tokens.
    if (token && !firebaseReady) {
      mutation.mutate();
    }
  }, [mutation, token, firebaseReady]);

  if (firebaseReady) {
    return (
      <AuthPageShell
        title="Verify your email"
        subtitle="We’ve sent you a verification email. Open it and follow the link to confirm your address."
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>
            Check your inbox for the verification email. Once you confirm your email there, you can
            continue to sign in.
          </p>
          <Link to="/login" className="inline-flex text-accent hover:underline">
            Continue to sign in
          </Link>
        </div>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Verify your email"
      subtitle="We’re confirming your email so you can securely use the Elkatech service platform."
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        {mutation.isPending && <p>Verifying your email...</p>}
        {mutation.isSuccess && <p className="text-foreground">{mutation.data.message}</p>}
        {mutation.isError && (
          <p>This verification link is no longer valid. Please sign in to request a new one.</p>
        )}
        <Link to="/login" className="inline-flex text-accent hover:underline">
          Continue to sign in
        </Link>
      </div>
    </AuthPageShell>
  );
};

export default VerifyEmailPage;
