import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ServiceRequest } from "@elkatech/contracts";
import { useSession } from "@/hooks/use-session";
import { apiRequest } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";
import VerifyEmailNotice from "@/components/VerifyEmailNotice";
import { ApprovalStateCard, isCustomerActionBlocked } from "@/components/ApprovalState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Inbox,
  LifeBuoy,
  Loader2,
  Package2,
  Plus,
  RefreshCw,
  Wrench,
} from "lucide-react";

/* ─── helper: format date ──────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─── Status color mapping ─────────────────────────────────────────────────── */
const statusColors: Record<string, string> = {
  new: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300",
  triaged: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
  assigned: "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-300",
  in_progress: "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-300",
  waiting_for_customer: "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-300",
  resolved: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  closed: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400",
};

/* ─── Priority badge ───────────────────────────────────────────────────────── */
const priorityColors: Record<string, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400",
  normal: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
  high: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-300",
  urgent: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-300",
};

/* ─── Skeleton shimmer ─────────────────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-slate-200 dark:bg-white/[0.05]",
        className,
      )}
    />
  );
}

/* ─── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({
  label,
  count,
  icon: Icon,
  accent,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "blue" | "emerald" | "amber" | "slate";
}) {
  const accentMap = {
    blue: {
      badge: "border-blue-300 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
      glow: "from-blue-500/5 to-transparent",
      count: "text-blue-700 dark:text-blue-100",
    },
    emerald: {
      badge: "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
      glow: "from-emerald-500/5 to-transparent",
      count: "text-emerald-700 dark:text-emerald-100",
    },
    amber: {
      badge: "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300",
      glow: "from-amber-500/5 to-transparent",
      count: "text-amber-700 dark:text-amber-100",
    },
    slate: {
      badge: "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400",
      glow: "from-slate-500/5 to-transparent",
      count: "text-slate-700 dark:text-slate-200",
    },
  };

  const c = accentMap[accent];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-5 transition-colors duration-150",
      "border-slate-200 bg-white hover:border-slate-300",
      "dark:border-white/[0.08] dark:bg-[#0b1626]/80 dark:hover:border-white/[0.14] dark:backdrop-blur-sm",
    )}>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-60",
          c.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
            {label}
          </p>
          <p className={cn("mt-2 font-display text-4xl font-bold", c.count)}>
            {count}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            c.badge,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────────── */
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className={cn(
        "rounded-3xl border p-6 sm:p-8",
        "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0b1626]/80",
      )}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-11 w-48 rounded-full" />
        </div>
      </div>

      {/* Stat skeletons */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[100px] rounded-2xl" />
        ))}
      </div>

      {/* List skeletons */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/* ─── Premium empty state ──────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl border",
      "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0b1626]/80 dark:backdrop-blur-sm",
    )}>
      {/* Subtle grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(59,130,246,0.06),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.04),transparent_40%)]" />

      <div className="relative flex flex-col items-center px-6 py-20 text-center sm:py-24">
        {/* Icon cluster */}
        <div className="relative mb-8">
          <div className={cn(
            "flex h-20 w-20 items-center justify-center rounded-3xl border shadow-[0_0_40px_rgba(59,130,246,0.10)]",
            "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
          )}>
            <ClipboardList className="h-9 w-9" />
          </div>
          <div className={cn(
            "absolute -right-3 -top-2 flex h-9 w-9 items-center justify-center rounded-2xl border",
            "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
          )}>
            <Wrench className="h-4 w-4" />
          </div>
          <div className={cn(
            "absolute -bottom-1 -left-3 flex h-8 w-8 items-center justify-center rounded-xl border",
            "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400",
          )}>
            <LifeBuoy className="h-4 w-4" />
          </div>
        </div>

        <h3 className="font-display text-2xl font-semibold text-slate-900 dark:text-white">
          No service requests yet
        </h3>
        <p className="mt-3 max-w-md text-sm leading-7 text-slate-500 dark:text-slate-400">
          Create your first request to get support for a machine, installation,
          maintenance, or troubleshooting issue.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            className="h-11 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 px-6 font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.22)] hover:from-blue-400 hover:to-emerald-300"
          >
            <Link to="/app/requests/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Service Request
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className={cn(
              "h-11 rounded-full px-6",
              "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              "dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07] dark:hover:text-white",
            )}
          >
            <Link to="/">
              <Package2 className="mr-1.5 h-4 w-4" />
              Browse Products
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Request row card ─────────────────────────────────────────────────────── */
function RequestCard({ request }: { request: ServiceRequest }) {
  return (
    <Link
      to={`/app/requests/${request.id}`}
      className={cn(
        "group block overflow-hidden rounded-2xl border p-5 transition-all duration-150",
        "border-slate-200 bg-white hover:border-blue-300 hover:shadow-[0_4px_16px_rgba(59,130,246,0.08)]",
        "dark:border-white/[0.07] dark:bg-[#0b1626]/70 dark:backdrop-blur-sm dark:hover:border-blue-400/20 dark:hover:bg-[#0d1c30]/80 dark:hover:shadow-[0_0_0_1px_rgba(59,130,246,0.12),0_8px_32px_rgba(0,0,0,0.18)]",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              {request.requestNumber}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                statusColors[request.status] ?? "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400",
              )}
            >
              {request.status.replace(/_/g, " ")}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                priorityColors[request.priority] ?? "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-400/20 dark:bg-slate-500/10 dark:text-slate-400",
              )}
            >
              {request.priority}
            </span>
          </div>
          <h3 className="truncate font-display text-[15px] font-semibold text-slate-900 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
            {request.subject}
          </h3>
          {request.productSnapshot?.name && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              {request.productSnapshot.name}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          <p className="text-xs text-slate-400 dark:text-slate-600">
            {fmtDate((request as unknown as Record<string, string>)["updatedAt"] ?? (request as unknown as Record<string, string>)["createdAt"] ?? "")}
          </p>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-blue-500 dark:text-slate-500 dark:group-hover:text-blue-400">
            View details
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Error state ──────────────────────────────────────────────────────────── */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-12 text-center dark:border-rose-500/20 dark:bg-rose-500/[0.06]">
      <AlertCircle className="mb-4 h-10 w-10 text-rose-500 dark:text-rose-400" />
      <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
        Could not load service requests
      </h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Please try again.</p>
      <Button
        variant="outline"
        className={cn(
          "mt-6 rounded-full",
          "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          "dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]",
        )}
        onClick={onRetry}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
const RequestsPage = () => {
  const { data: session } = useSession();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["requests", "mine"],
    queryFn: () => apiRequest<ServiceRequest[]>("/api/requests"),
  });

  const isCustomer = session?.user?.role === "customer";
  const unverifiedUser =
    session?.user && !session.user.emailVerified ? session.user : null;
  const approvalBlocked = isCustomerActionBlocked(session?.user);
  const approvalStatus =
    approvalBlocked && session?.user && session.user.approvalStatus !== "approved"
      ? session.user.approvalStatus
      : null;

  /* ── Derive stats ─── */
  const requests = data ?? [];
  const totalCount = requests.length;

  const openStatuses = new Set(["new", "triaged"]);
  const inProgressStatuses = new Set(["assigned", "in_progress", "waiting_for_customer"]);
  const resolvedStatuses = new Set(["resolved", "closed"]);

  const openCount = requests.filter((r) => openStatuses.has(r.status)).length;
  const inProgressCount = requests.filter((r) => inProgressStatuses.has(r.status)).length;
  const resolvedCount = requests.filter((r) => resolvedStatuses.has(r.status)).length;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Ambient glow (subtle in light, stronger in dark) ───────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/[0.03] blur-[120px] dark:bg-blue-500/[0.04]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-emerald-500/[0.03] blur-[100px] dark:bg-emerald-500/[0.04]" />
      </div>

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <header className={cn(
        "relative overflow-hidden rounded-3xl border p-6 backdrop-blur-xl sm:p-8",
        "border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0b1626]/80",
      )}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(16,185,129,0.05),transparent_30%)] dark:bg-[radial-gradient(circle_at_14%_0%,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_88%_22%,rgba(16,185,129,0.09),transparent_30%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl border",
                "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300",
              )}>
                <ClipboardList className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-600 dark:text-blue-300">
                Service Requests
              </p>
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              {isCustomer ? "Your Service Requests" : "Assigned Work"}
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              Track your machinery service requests, updates, and support activity in
              one place.
            </p>
          </div>

          <Button
            asChild
            disabled={approvalBlocked}
            className={cn(
              "h-11 w-fit shrink-0 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 px-6 font-semibold text-white shadow-[0_12px_32px_rgba(37,99,235,0.22)] hover:from-blue-400 hover:to-emerald-300",
              approvalBlocked && "pointer-events-none opacity-60",
            )}
          >
            <Link
              to="/app/requests/new"
              aria-disabled={approvalBlocked}
              tabIndex={approvalBlocked ? -1 : 0}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Create Service Request
            </Link>
          </Button>
        </div>
      </header>

      {/* ── Approval gate banner (pending / rejected / suspended) ───────── */}
      {approvalStatus && (
        <ApprovalStateCard status={approvalStatus} variant="banner" />
      )}

      {/* ── Email verification notice ─────────────────────────────────────── */}
      {unverifiedUser && !approvalStatus && (
        <div className="relative">
          <VerifyEmailNotice email={unverifiedUser.email} />
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Requests" count={totalCount} icon={ClipboardList} accent="blue" />
        <StatCard label="Open" count={openCount} icon={Inbox} accent="amber" />
        <StatCard label="In Progress" count={inProgressCount} icon={Wrench} accent="slate" />
        <StatCard label="Resolved" count={resolvedCount} icon={CheckCircle2} accent="emerald" />
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {isError && <ErrorState onRetry={() => refetch()} />}

      {/* ── Empty or list ─────────────────────────────────────────────────── */}
      {!isError && (
        <>
          {requests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                  {requests.length} request{requests.length !== 1 ? "s" : ""}
                </p>
              </div>
              {requests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Help panel ────────────────────────────────────────────────────── */}
      {requests.length > 0 && (
        <div className={cn(
          "rounded-2xl border px-5 py-4",
          "border-slate-200 bg-slate-50 dark:border-white/[0.06] dark:bg-[#0b1626]/60",
        )}>
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />
            <div className="min-w-0 text-sm leading-6 text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Need to report a new issue?</span>{" "}
              You can also start a request directly from a{" "}
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-blue-500 underline-offset-2 hover:underline dark:text-blue-400"
              >
                product page
                <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestsPage;
