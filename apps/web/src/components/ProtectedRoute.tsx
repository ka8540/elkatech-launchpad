import { Navigate, useLocation } from "react-router-dom";
import type { Role } from "@elkatech/contracts";
import { useSession } from "@/hooks/use-session";

type ProtectedRouteProps = {
  children: React.ReactNode;
  roles?: Role[];
};

const ProtectedRoute = ({ children, roles }: ProtectedRouteProps) => {
  const location = useLocation();
  const { data, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="lp lp-portal-bg relative flex min-h-screen items-center justify-center overflow-hidden text-[var(--lp-ink)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 lp-grid opacity-[0.18]"
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 75%)",
          }}
        />
        <div
          role="status"
          aria-live="polite"
          className="relative flex items-center gap-3 rounded-2xl border border-[var(--lp-line)] bg-[var(--lp-panel)] px-6 py-4 text-sm font-medium text-[var(--lp-ink-soft)] shadow-[0_14px_36px_-28px_rgba(0,0,0,0.55)]"
        >
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--lp-line-strong)] border-t-[var(--lp-accent)]"
          />
          <span>
            Loading your workspace...
          </span>
        </div>
      </div>
    );
  }

  if (!data?.user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  if (roles && !roles.includes(data.user.role)) {
    const fallback = data.user.role === "customer" ? "/app/requests" : "/app/queue";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
