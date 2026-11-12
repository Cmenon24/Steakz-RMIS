
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";
import type { UserRole } from "../services/auth.service";

// Restrict access to authenticated users with permitted roles.
interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Wait until the existing session has been checked.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Loading Steakz RMIS...</p>
      </div>
    );
  }

  // Redirect unauthenticated users to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Prevent users from accessing another role's dashboard.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
