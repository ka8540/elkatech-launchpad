import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import AuthPageShell from "@/components/AuthPageShell";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      }),
    onSuccess: ({ message }) => {
      toast.success(message);
      navigate("/login");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <AuthPageShell
      title="Choose a new password"
      subtitle="Set a new password for your Elkatech account."
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">New Password</label>
          <Input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            className="bg-background"
          />
        </div>
        <Button type="submit" variant="cta" size="lg" className="w-full" disabled={mutation.isPending || !token}>
          {mutation.isPending ? "Resetting..." : "Reset password"}
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

export default ResetPasswordPage;
