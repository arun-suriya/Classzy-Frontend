import { Navigate, Outlet, useLocation } from "react-router-dom";
import { session } from "../services/api";
import type { Role } from "../services/api";

/** Where each kind of user lands after signing in. */
export const homeFor = (role: Role | undefined): string => (role === "INSTITUTION_ADMIN" ? "/school" : "/dashboard");

/**
 * Wrap every page that needs a signed-in user. Visitors without a token are sent to /login,
 * and after signing in they return to the page they asked for.
 * Pass `roles` to limit a group of pages; anyone else is sent to their own home page.
 */
export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const location = useLocation();
  if (!session.isSignedIn()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  const user = session.user();
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />;
  }
  return <Outlet />;
}
