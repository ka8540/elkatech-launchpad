import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import AuthPageShell from "@/components/AuthPageShell";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("inviteToken") ?? undefined;
  const inviteRole = searchParams.get("role");
  const [form, setForm] = useState({
    displayName: "",
    email: searchParams.get("email") ?? "",
    password: "",
  });

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

  return (
    <AuthPageShell
      title={title}
      subtitle="Your Elkatech account lets you create service requests and collaborate with the service team in one secure place."
    >
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
