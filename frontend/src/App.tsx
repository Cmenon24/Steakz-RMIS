import { Navigate, Route, Routes } from "react-router-dom";

import { useAuth } from "./hooks/AuthContext";
import ProtectedRoute from "./routes/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import AdminLayout from "./layouts/AdminLayout";
import { getRoleDashboard } from "./utils/roleRedirect";
import AdminDashboard from "./features/admin/pages/AdminDashboard";
import UserManagement from "./features/admin/pages/UserManagement";
import MyProfile from "./features/admin/pages/MyProfile";
import BranchManagement from "./features/admin/pages/BranchManagement";
import TableManagement from "./features/admin/pages/TableManagement";
import AuditLogs from "./features/admin/pages/AuditLogs";
import BranchManagerLayout from "./layouts/BranchManagerLayout";
import BranchManagerDashboard from "./features/branch-manager/pages/BranchManagerDashboard";
import BranchOrders from "./features/branch-manager/pages/BranchOrders";
import BranchInventory from "./features/branch-manager/pages/BranchInventory";
import Stocktakes from "./features/branch-manager/pages/Stocktakes";
import TableOverview from "./features/branch-manager/pages/TableOverview";
import MenuAvailability from "./features/branch-manager/pages/MenuAvailability";
import BranchPromotions from "./features/branch-manager/pages/BranchPromotions";
import BranchReports from "./features/branch-manager/pages/BranchReports";
import BranchProfile from "./features/branch-manager/pages/BranchProfile";
import ServerLayout from "./layouts/ServerLayout";
import ServerDashboard from "./features/server/pages/ServerDashboard";
import ServerOrders from "./features/server/pages/ServerOrders";
import ServerPOS from "./features/server/pages/ServerPOS";
import ServerPayments from "./features/server/pages/ServerPayments";
import ServerProfile from "./features/server/pages/ServerProfile";
import CookLayout from "./layouts/CookLayout";
import CookDashboard from "./features/cook/pages/CookDashboard";
import CookKitchenQueue from "./features/cook/pages/CookKitchenQueue";
import CookOrderHistory from "./features/cook/pages/CookOrderHistory";
import CookProfile from "./features/cook/pages/CookProfile";
import HeadquartersLayout from "./layouts/HeadquartersLayout";
import { HeadquartersDashboard } from "./features/headquarters/pages/HeadquartersDashboard";
import { HeadquartersOrders } from "./features/headquarters/pages/HeadquartersOrders";
import { HeadquartersBranches } from "./features/headquarters/pages/HeadquartersBranches";
import { HeadquartersMenu } from "./features/headquarters/pages/HeadquartersMenu";
import { HeadquartersRecipes } from "./features/headquarters/pages/HeadquartersRecipes";
import { HeadquartersPromotions } from "./features/headquarters/pages/HeadquartersPromotions";
import { HeadquartersReports } from "./features/headquarters/pages/HeadquartersReports";
import { HeadquartersProfile } from "./features/headquarters/pages/HeadquartersProfile";

// Redirect users to the dashboard assigned to their role.
function HomeRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="p-8 text-center">Loading...</p>;
  }

  return (
    <Navigate
      to={user ? getRoleDashboard(user.role) : "/login"}
      replace
    />
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Admin pages share one layout and navigation. */}
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="branches" element={<BranchManagement />} />
          <Route path="tables" element={<TableManagement />} />
          <Route path="audit-logs" element={<AuditLogs />} />
          <Route path="profile" element={<MyProfile />} />
        </Route>
      </Route>

      {/* Headquarters pages share a chain-wide operations layout. */}
      <Route element={<ProtectedRoute allowedRoles={["HEADQUARTERS_MANAGER"]} />}>
        <Route path="/headquarters" element={<HeadquartersLayout />}>
          <Route index element={<HeadquartersDashboard />} />
          <Route path="orders" element={<HeadquartersOrders />} />
          <Route path="branches" element={<HeadquartersBranches />} />
          <Route path="menu" element={<HeadquartersMenu />} />
          <Route path="recipes" element={<HeadquartersRecipes />} />
          <Route path="promotions" element={<HeadquartersPromotions />} />
          <Route path="reports" element={<HeadquartersReports />} />
          <Route path="profile" element={<HeadquartersProfile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["BRANCH_MANAGER"]} />}>
        <Route path="/branch-manager" element={<BranchManagerLayout />}>
          <Route index element={<BranchManagerDashboard />} />
          <Route path="orders" element={<BranchOrders />} />
          <Route path="inventory" element={<BranchInventory />} />
          <Route path="stocktakes" element={<Stocktakes />} />
          <Route path="tables" element={<TableOverview />} />
          <Route path="menu" element={<MenuAvailability />} />
          <Route path="promotions" element={<BranchPromotions />} />
          <Route path="reports" element={<BranchReports />} />
          <Route path="profile" element={<BranchProfile />} />
        </Route>
      </Route>

      {/* Server pages share the POS layout and branch-scoped workflows. */}
      <Route element={<ProtectedRoute allowedRoles={["SERVER"]} />}>
        <Route path="/pos" element={<ServerLayout />}>
          <Route index element={<ServerDashboard />} />
          <Route path="new-order" element={<ServerPOS />} />
          <Route path="orders" element={<ServerOrders />} />
          <Route path="payments" element={<ServerPayments />} />
          <Route path="profile" element={<ServerProfile />} />
        </Route>
      </Route>

      {/* Cook pages share the kitchen workspace and branch-scoped order queue. */}
      <Route element={<ProtectedRoute allowedRoles={["COOK"]} />}>
        <Route path="/kitchen" element={<CookLayout />}>
          <Route index element={<CookDashboard />} />
          <Route path="queue" element={<CookKitchenQueue />} />
          <Route path="history" element={<CookOrderHistory />} />
          <Route path="profile" element={<CookProfile />} />
        </Route>
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default App;
