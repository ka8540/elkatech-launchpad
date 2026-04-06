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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="rounded-2xl border bg-card px-6 py-4 text-sm text-muted-foreground shadow-soft">
          Loading your workspace...
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
