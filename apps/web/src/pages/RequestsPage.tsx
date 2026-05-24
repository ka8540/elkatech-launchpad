import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ServiceRequest } from "@elkatech/contracts";
import { useSession } from "@/hooks/use-session";
import { apiRequest } from "@/lib/api";
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

/* ─── Status color mapping (industrial copper / steel palette) ─────────────── */
const statusColors: Record<string, string> = {
  new: "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
  triaged: "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  assigned: "border-sky-400/35 bg-sky-400/10 text-sky-600 dark:text-sky-300",
  in_progress: "border-[var(--lp-accent)]/35 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
  waiting_for_customer: "border-orange-400/35 bg-orange-400/10 text-orange-600 dark:text-orange-300",
  resolved: "border-emerald-400/35 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
  closed: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
};

/* ─── Priority badge ───────────────────────────────────────────────────────── */
const priorityColors: Record<string, string> = {
  low: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
  normal: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  high: "border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  urgent: "border-rose-400/35 bg-rose-400/10 text-rose-600 dark:text-rose-300",
};

/* ─── Skeleton shimmer ─────────────────────────────────────────────────────── */
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[var(--lp-panel-2)]",
        className,
      )}
    />
  );
}

/* ─── Matte card surface (shared utility — see index.css `.lp-card`) ──────── */
const cardSurface = "lp-card border";

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
  accent: "copper" | "emerald" | "amber" | "steel";
}) {
  const badgeMap = {
    copper: "border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]",
    emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-600 dark:text-amber-300",
    steel: "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-ink-soft)]",
  };

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl p-5 transition-colors duration-150",
      cardSurface,
      "hover:border-[var(--lp-line-strong)]",
    )}>
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="lp-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--lp-faint)]">
            {label}
          </p>
          <p className="lp-display mt-2 text-4xl font-bold text-[var(--lp-ink)]">
            {count}
          </p>
        </div>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            badgeMap[accent],
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
      <div className={cn("rounded-3xl p-6 sm:p-8", cardSurface)}>
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
    <div className={cn("relative overflow-hidden rounded-3xl", cardSurface)}>
      {/* Very subtle blueprint grid only — no copper glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.22]"
        style={{
          maskImage: "radial-gradient(ellipse at 50% 35%, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 35%, black 30%, transparent 80%)",
        }}
      />

      <div className="relative flex flex-col items-center px-6 py-14 text-center sm:py-16">
        {/* Icon cluster */}
        <div className="relative mb-7">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
            <ClipboardList className="h-9 w-9" />
          </div>
          <div className="absolute -right-3 -top-2 flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-ink-soft)]">
            <Wrench className="h-4 w-4" />
          </div>
          <div className="absolute -bottom-1 -left-3 flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--lp-line-strong)] bg-[var(--lp-panel)] text-[var(--lp-faint)]">
            <LifeBuoy className="h-4 w-4" />
          </div>
        </div>

        <h3 className="lp-display text-2xl font-semibold text-[var(--lp-ink)]">
          No service requests yet
        </h3>
        <p className="mt-3 max-w-md text-sm leading-7 text-[var(--lp-ink-soft)]">
          Create your first request to get support for a machine, installation,
          maintenance, or troubleshooting issue.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            asChild
            className="h-11 rounded-full bg-[var(--lp-accent)] px-6 font-semibold text-[#fbfaf6] transition-colors hover:bg-[var(--lp-accent-2)]"
          >
            <Link to="/app/requests/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Create Service Request
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] px-6 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
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
        "group block overflow-hidden rounded-2xl p-5 transition-colors duration-150",
        cardSurface,
        "hover:border-[var(--lp-accent)]/45",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="lp-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--lp-faint)]">
              {request.requestNumber}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                statusColors[request.status] ?? "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
              )}
            >
              {request.status.replace(/_/g, " ")}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                priorityColors[request.priority] ?? "border-[var(--lp-line-strong)] bg-[var(--lp-panel-2)] text-[var(--lp-faint)]",
              )}
            >
              {request.priority}
            </span>
          </div>
          <h3 className="truncate lp-display text-[15px] font-semibold text-[var(--lp-ink)]">
            {request.subject}
          </h3>
          {request.productSnapshot?.name && (
            <p className="mt-1 text-xs text-[var(--lp-faint)]">
              {request.productSnapshot.name}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          <p className="text-xs text-[var(--lp-faint)]">
            {fmtDate((request as unknown as Record<string, string>)["updatedAt"] ?? (request as unknown as Record<string, string>)["createdAt"] ?? "")}
          </p>
          <span className="flex items-center gap-1 text-xs font-medium text-[var(--lp-faint)] transition-colors group-hover:text-[var(--lp-accent)]">
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
    <div className="flex flex-col items-center rounded-2xl border border-rose-400/30 bg-rose-500/[0.07] px-6 py-12 text-center">
      <AlertCircle className="mb-4 h-10 w-10 text-rose-500 dark:text-rose-400" />
      <h3 className="lp-display text-lg font-semibold text-[var(--lp-ink)]">
        Could not load service requests
      </h3>
      <p className="mt-2 text-sm text-[var(--lp-ink-soft)]">Please try again.</p>
      <Button
        variant="outline"
        className="mt-6 rounded-full border-[var(--lp-line-strong)] bg-[var(--lp-panel)]/60 text-[var(--lp-ink-soft)] hover:border-[var(--lp-accent)]/50 hover:bg-[var(--lp-panel)] hover:text-[var(--lp-ink)]"
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
      {/* ── Header card ───────────────────────────────────────────────────── */}
      <header className={cn("relative overflow-hidden rounded-3xl p-6 sm:p-8", cardSurface)}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lp-grid-fine opacity-[0.18]"
          style={{
            maskImage: "linear-gradient(to right, black, transparent 70%)",
            WebkitMaskImage: "linear-gradient(to right, black, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--lp-accent)]/30 bg-[var(--lp-accent)]/10 text-[var(--lp-accent)]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <p className="lp-mono text-xs font-semibold uppercase tracking-[0.28em] text-[var(--lp-accent)]">
                Service Requests
              </p>
            </div>
            <h1 className="lp-display text-2xl font-bold text-[var(--lp-ink)] sm:text-3xl">
              {isCustomer ? "Your Service Requests" : "Assigned Work"}
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-7 text-[var(--lp-ink-soft)]">
              Track your machinery service requests, updates, and support activity in
              one place.
            </p>
          </div>

          <Button
            asChild
            disabled={approvalBlocked}
            className={cn(
              "h-11 w-fit shrink-0 rounded-full bg-[var(--lp-accent)] px-6 font-semibold text-[#fbfaf6] transition-colors hover:bg-[var(--lp-accent-2)]",
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
        <StatCard label="Total Requests" count={totalCount} icon={ClipboardList} accent="copper" />
        <StatCard label="Open" count={openCount} icon={Inbox} accent="amber" />
        <StatCard label="In Progress" count={inProgressCount} icon={Wrench} accent="steel" />
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
                <p className="lp-mono text-xs font-medium uppercase tracking-[0.18em] text-[var(--lp-faint)]">
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
        <div className={cn("rounded-2xl px-5 py-4 border", cardSurface)}>
          <div className="flex items-start gap-3">
            <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lp-accent)]" />
            <div className="min-w-0 text-sm leading-6 text-[var(--lp-ink-soft)]">
              <span className="font-medium text-[var(--lp-ink)]">Need to report a new issue?</span>{" "}
              You can also start a request directly from a{" "}
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-[var(--lp-accent)] underline-offset-2 hover:underline"
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
