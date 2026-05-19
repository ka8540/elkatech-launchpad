import { useMutation } from "@tanstack/react-query";
import { Loader2, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Shown inside the portal to a signed-in user whose email is not yet verified.
 * Service request creation stays blocked until they verify, so this explains
 * why and lets them request a fresh verification email.
 */
const VerifyEmailNotice = ({
  email,
  className,
}: {
  email: string;
  className?: string;
}) => {
  const resend = useMutation({
    mutationFn: () =>
      apiRequest<{ message: string }>("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    onSuccess: ({ message }) => toast.success(message),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 sm:p-5",
        "border-amber-200 bg-amber-50 text-amber-900",
        "dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-50",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-200" />
          <div className="min-w-0">
            <p className="font-semibold">Verify your email to create service requests</p>
            <p className="mt-1 text-sm leading-6 text-amber-800/80 dark:text-amber-50/75">
              We sent a verification link to{" "}
              <span className="font-medium">{email}</span>. Open it to unlock service
              request creation. Running locally? Check the Mailpit inbox at{" "}
              <a
                href="http://127.0.0.1:8025"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline underline-offset-2"
              >
                127.0.0.1:8025
              </a>
              .
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
          className={cn(
            "h-10 shrink-0 rounded-xl",
            "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200 hover:text-amber-950",
            "dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-50 dark:hover:bg-amber-200/20 dark:hover:text-white",
          )}
        >
          {resend.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {resend.isPending ? "Sending…" : "Resend email"}
        </Button>
      </div>
    </div>
  );
};

export default VerifyEmailNotice;
