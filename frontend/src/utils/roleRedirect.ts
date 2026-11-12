
import type { UserRole } from "../services/auth.service";

// Return the dashboard route assigned to each backend role.
export function getRoleDashboard(role: UserRole): string {
  const dashboardRoutes: Record<UserRole, string> = {
    ADMIN: "/admin",
    HEADQUARTERS_MANAGER: "/headquarters",
    BRANCH_MANAGER: "/branch-manager",
    SERVER: "/pos",
    COOK: "/kitchen",
  };

  return dashboardRoutes[role];
}
