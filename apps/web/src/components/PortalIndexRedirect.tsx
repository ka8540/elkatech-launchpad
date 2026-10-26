import { Navigate } from "react-router-dom";
import { portalHomePathForRole } from "@elkatech/contracts";
import { useSession } from "@/hooks/use-session";

/**
 * Role-aware `/app` index. The parent ProtectedRoute resolves authentication
 * first, so this never renders a destination before the current role is known.
 */
const PortalIndexRedirect = () => {
  const { data } = useSession();
  if (!data?.user) return null;

  return <Navigate to={portalHomePathForRole(data.user.role)} replace />;
};

export default PortalIndexRedirect;
