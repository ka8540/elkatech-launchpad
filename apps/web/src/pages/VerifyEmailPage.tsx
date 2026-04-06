import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import AuthPageShell from "@/components/AuthPageShell";
import { apiRequest } from "@/lib/api";

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/api/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
  });

  useEffect(() => {
    if (token) {
      mutation.mutate();
    }
  }, [mutation, token]);

  return (
    <AuthPageShell
      title="Verify your email"
      subtitle="We’re confirming your email so you can securely use the Elkatech service platform."
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        {mutation.isPending && <p>Verifying your email...</p>}
        {mutation.isSuccess && <p className="text-foreground">{mutation.data.message}</p>}
        {mutation.isError && <p>{mutation.error.message}</p>}
        <Link to="/login" className="inline-flex text-accent hover:underline">
          Continue to sign in
        </Link>
      </div>
    </AuthPageShell>
  );
};

export default VerifyEmailPage;
