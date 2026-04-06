import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import AuthPageShell from "@/components/AuthPageShell";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: ({ message }) => {
      toast.success(message);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <AuthPageShell
      title="Reset your password"
      subtitle="Enter the email for your Elkatech account and we’ll send you a reset link."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Email</label>
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            className="bg-background"
          />
        </div>
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Sending..." : "Send reset link"}
        </Button>
      </form>
      <div className="mt-6 text-sm text-muted-foreground">
        <Link to="/login" className="text-accent hover:underline">
          Back to sign in
        </Link>
      </div>
    </AuthPageShell>
  );
};

export default ForgotPasswordPage;
