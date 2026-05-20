import { Link } from "react-router-dom";
import { Clock, ShieldOff, XCircle } from "lucide-react";
import type { ApprovalStatus, AuthUser } from "@elkatech/contracts";
import { Button } from "@/components/ui/button";

type Copy = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  tone: "info" | "warning" | "danger";
};

const COPY: Record<Exclude<ApprovalStatus, "approved">, Copy> = {
  pending_approval: {
    icon: Clock,
    title: "Account pending approval",
    body:
      "Your account has been created and is waiting for ElkaTech admin approval. " +
      "You’ll be able to create service requests once your account is approved.",
    tone: "info",
  },
  rejected: {
    icon: XCircle,
    title: "Account not approved",
    body:
      "Your account was not approved. If you believe this is a mistake, please contact " +
      "your ElkaTech administrator.",
    tone: "danger",
  },
  suspended: {
    icon: ShieldOff,
    title: "Account suspended",
    body:
      "Your account is currently suspended. Please contact your ElkaTech administrator " +
      "to restore access.",
    tone: "warning",
  },
};

const toneToClasses: Record<Copy["tone"], string> = {
  info: "border-accent/30 bg-accent/5 text-accent-foreground",
  warning: "border-amber-500/40 bg-amber-500/5",
  danger: "border-destructive/40 bg-destructive/5",
};

export function isCustomerActionBlocked(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role !== "customer") return false;
  return user.approvalStatus !== "approved";
}

type Props = {
  status: Exclude<ApprovalStatus, "approved">;
  variant?: "card" | "banner";
  showBackToRequests?: boolean;
};

export function ApprovalStateCard({ status, variant = "card", showBackToRequests = true }: Props) {
  const copy = COPY[status];
  const Icon = copy.icon;

  if (variant === "banner") {
    return (
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 text-sm shadow-soft ${toneToClasses[copy.tone]}`}
        role="status"
      >
        <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold text-foreground">{copy.title}</p>
          <p className="mt-1 text-muted-foreground">{copy.body}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border p-8 shadow-soft ${toneToClasses[copy.tone]}`} role="status">
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-3">
          <Icon className="h-6 w-6 text-foreground" />
          <h3 className="font-display text-2xl font-semibold text-foreground">{copy.title}</h3>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">{copy.body}</p>
        {showBackToRequests && (
          <Button asChild variant="outline">
            <Link to="/app/requests">Back to requests</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
