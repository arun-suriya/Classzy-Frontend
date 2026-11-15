import { Navigate, Outlet, useLocation } from "react-router-dom";
import { session } from "../services/api";

/**
 * Wrap every page that needs a signed-in user. Visitors without a token are sent to /login,
 * and after signing in they return to the page they asked for.
 */
export default function ProtectedRoute() {
  const location = useLocation();
  if (!session.isSignedIn()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
