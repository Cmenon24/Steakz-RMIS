
import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Building2,
  Store,
  Utensils,
  RefreshCw,
} from "lucide-react";

import {
  getAdminUsers,
  getAdminBranches,
  getAdminTables,
  getRecentAuditLogs,
  getRecentNotifications,
  type AdminUser,
  type AdminBranch,
  type AdminTable,
  type AdminAuditLog,
  type AdminNotification,
} from "../admin.service";

// Define the dashboard data collected from the backend.
interface DashboardData {
  users: AdminUser[];
  branches: AdminBranch[];
  tables: AdminTable[];
  auditLogs: AdminAuditLog[];
  notifications: AdminNotification[];
}

// Reusable statistics card.
function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: number;
  icon: typeof Users;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="rounded-lg bg-gray-100 p-2 text-gray-700">
          <Icon size={20} />
        </div>
      </div>

      <p className="mt-4 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Load dashboard records from the existing backend endpoints.
  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      const [users, branches, tables, auditLogs, notifications] = await Promise.all([
        getAdminUsers(),
        getAdminBranches(),
        getAdminTables(),
        getRecentAuditLogs(),
        getRecentNotifications(),
      ]);

      setData({ users, branches, tables, auditLogs, notifications });
    } catch (err) {
      console.error("Unable to load Admin dashboard:", err);
      setError("Unable to load dashboard information. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-gray-500">Loading dashboard information...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <p className="text-sm text-red-700">{error || "Dashboard data unavailable."}</p>
        <button
          onClick={loadDashboard}
          className="mt-4 flex items-center gap-2 rounded-lg bg-[#1F2937] px-4 py-2 text-sm text-white hover:bg-[#374151]"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  // Calculate dashboard statistics from the returned records.
  const activeUsers = data.users.filter((user) => user.isActive).length;
  const inactiveUsers = data.users.length - activeUsers;
  const activeBranches = data.branches.filter((branch) => branch.isActive).length;

  const roleCounts = [
    { label: "Admin", role: "ADMIN" },
    { label: "Headquarters Manager", role: "HEADQUARTERS_MANAGER" },
    { label: "Branch Manager", role: "BRANCH_MANAGER" },
    { label: "Server", role: "SERVER" },
    { label: "Cook", role: "COOK" },
  ].map((item) => ({
    ...item,
    count: data.users.filter((user) => user.role === item.role).length,
  }));

  return (
    <div className="space-y-8">
      {/* Dashboard heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of system users, branches, and administration.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* System statistics */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-800">
          System Overview
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Total Users"
            value={data.users.length}
            icon={Users}
            description="All registered accounts"
          />
          <StatCard
            title="Active Users"
            value={activeUsers}
            icon={UserCheck}
            description="Currently active accounts"
          />
          <StatCard
            title="Inactive Users"
            value={inactiveUsers}
            icon={UserX}
            description="Deactivated accounts"
          />
          <StatCard
            title="Total Branches"
            value={data.branches.length}
            icon={Building2}
            description="All registered branches"
          />
          <StatCard
            title="Active Branches"
            value={activeBranches}
            icon={Store}
            description="Currently operating branches"
          />
          <StatCard
            title="Configured Tables"
            value={data.tables.length}
            icon={Utensils}
            description="Tables registered across branches"
          />
        </div>
      </section>

      {/* Branch overview */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          Branch Overview
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Current status of registered restaurant branches.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
                <th className="px-3 py-3">Branch Code</th>
                <th className="px-3 py-3">Branch Name</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {data.branches.map((branch) => (
                <tr key={branch.id} className="border-b border-gray-100">
                  <td className="px-3 py-4 font-medium text-gray-800">
                    {branch.branchCode}
                  </td>
                  <td className="px-3 py-4 text-gray-600">
                    {branch.name}
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        branch.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {branch.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}

              {data.branches.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-gray-500">
                    No branches found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Role distribution and account status */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Role Distribution</h2>
          <p className="mt-1 text-sm text-gray-500">
            User accounts grouped by assigned role.
          </p>

          <div className="mt-5 space-y-4">
            {roleCounts.map((item) => (
              <div key={item.role}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-800">
                    {item.count}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#B91C1C]"
                    style={{
                      width: `${
                        data.users.length > 0
                          ? (item.count / data.users.length) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">Account Status</h2>
          <p className="mt-1 text-sm text-gray-500">
            Active and inactive user account breakdown.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-50 p-5">
              <p className="text-sm text-green-700">Active</p>
              <p className="mt-2 text-3xl font-bold text-green-800">
                {activeUsers}
              </p>
            </div>

            <div className="rounded-lg bg-gray-100 p-5">
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="mt-2 text-3xl font-bold text-gray-800">
                {inactiveUsers}
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Recent notifications */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              Recent Notifications
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Latest notifications for your Admin account.
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {data.notifications.filter((notification) => !notification.isRead).length} unread
          </span>
        </div>

        <div className="mt-5 space-y-4">
          {data.notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 last:border-0"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    notification.isRead ? "bg-gray-300" : "bg-[#B91C1C]"
                  }`}
                />

                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {notification.title}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {notification.message}
                  </p>

                  <span className="mt-2 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                    {notification.type.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <time className="text-xs text-gray-400">
                  {new Date(notification.createdAt).toLocaleString()}
                </time>

                <span
                  className={`text-xs font-medium ${
                    notification.isRead
                      ? "text-gray-400"
                      : "text-[#B91C1C]"
                  }`}
                >
                  {notification.isRead ? "Read" : "Unread"}
                </span>
              </div>
            </div>
          ))}

          {data.notifications.length === 0 && (
            <p className="py-4 text-sm text-gray-500">
              No notifications available.
            </p>
          )}
        </div>
      </section>

      {/* Recent administrative activity */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900">
          Recent Administrative Activity
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Latest recorded actions from the audit log.
        </p>

        <div className="mt-5 space-y-4">
          {data.auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {log.action} · {log.entityType}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {log.user
                    ? `${log.user.firstName} ${log.user.lastName}`
                    : "System"}
                  {log.branch ? ` · ${log.branch.branchCode}` : ""}
                </p>
              </div>

              <time className="text-xs text-gray-400">
                {new Date(log.createdAt).toLocaleString()}
              </time>
            </div>
          ))}

          {data.auditLogs.length === 0 && (
            <p className="py-4 text-sm text-gray-500">
              No administrative activity recorded yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
