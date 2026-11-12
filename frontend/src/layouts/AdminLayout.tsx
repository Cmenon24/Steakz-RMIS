import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  Utensils,
  ClipboardList,
  Bell,
  LogOut,
  UserCircle,
  CheckCheck,
} from "lucide-react";

import { useAuth } from "../hooks/AuthContext";
import {
  getRecentNotifications,
  getUnreadNotificationCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
} from "../features/admin/admin.service";

// Navigation items available to the System Administrator.
const navigation = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "User Management", path: "/admin/users", icon: Users },
  { label: "Branch Management", path: "/admin/branches", icon: Building2 },
  { label: "Table Management", path: "/admin/tables", icon: Utensils },
  { label: "Audit Logs", path: "/admin/audit-logs", icon: ClipboardList },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Load the notification inbox and unread count.
  async function loadNotifications() {
    setIsLoadingNotifications(true);
    setNotificationError("");

    try {
      const [recentNotifications, count] = await Promise.all([
        getRecentNotifications(),
        getUnreadNotificationCount(),
      ]);
      setNotifications(recentNotifications);
      setUnreadCount(count);
    } catch (err) {
      console.error("Unable to load notifications:", err);
      setNotificationError("Unable to load notifications. Please try again.");
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  // Open the notification dropdown and refresh its contents.
  async function handleNotificationClick() {
    const shouldOpen = !isNotificationOpen;
    setIsNotificationOpen(shouldOpen);
    if (shouldOpen) await loadNotifications();
  }

  // Mark one notification as read.
  async function handleMarkAsRead(notificationId: string) {
    setIsUpdating(true);
    try {
      await markAdminNotificationRead(notificationId);
      await loadNotifications();
    } catch (err) {
      console.error("Unable to mark notification as read:", err);
      setNotificationError("Unable to update this notification.");
    } finally {
      setIsUpdating(false);
    }
  }

  // Mark every notification as read.
  async function handleMarkAllAsRead() {
    setIsUpdating(true);
    try {
      await markAllAdminNotificationsRead();
      await loadNotifications();
    } catch (err) {
      console.error("Unable to mark all notifications as read:", err);
      setNotificationError("Unable to update notifications.");
    } finally {
      setIsUpdating(false);
    }
  }

  // End the session and return to login.
  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Admin sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#1F2937] text-white">
        <div className="border-b border-gray-600 px-6 py-6">
          <h1 className="text-xl font-bold tracking-wide">STEAKZ RMIS</h1>
          <p className="mt-1 text-xs text-gray-400">System Administration</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Main Menu
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#374151] text-white"
                      : "text-gray-300 hover:bg-[#374151] hover:text-white"
                  }`
                }
              >
                <Icon size={19} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-gray-600 p-4">
          <NavLink
            to="/admin/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-[#374151] text-white"
                  : "text-gray-300 hover:bg-[#374151] hover:text-white"
              }`
            }
          >
            <UserCircle size={19} />
            My Profile
          </NavLink>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-300 transition hover:bg-[#374151] hover:text-white"
          >
            <LogOut size={19} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main application area */}
      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8">
          <div>
            <p className="text-sm text-gray-500">Steakz RMIS</p>
            <p className="font-semibold text-gray-800">Administration Portal</p>
          </div>

          <div className="flex items-center gap-5">
            {/* Notification bell and dropdown */}
            <div className="relative">
              <button
                type="button"
                aria-label={`Notifications, ${unreadCount} unread`}
                aria-expanded={isNotificationOpen}
                onClick={handleNotificationClick}
                className="relative rounded-full p-2 text-gray-500 transition hover:bg-gray-100"
              >
                <Bell size={21} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B91C1C] px-1 text-[10px] font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
                    <div>
                      <h2 className="font-semibold text-gray-900">Notifications</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        {unreadCount} unread notifications
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      disabled={unreadCount === 0 || isUpdating}
                      className="flex items-center gap-1 text-xs font-medium text-[#B91C1C] hover:underline disabled:cursor-not-allowed disabled:text-gray-400"
                    >
                      <CheckCheck size={15} />
                      Mark all as read
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <p className="p-6 text-center text-sm text-gray-500">
                        Loading notifications...
                      </p>
                    ) : notificationError ? (
                      <div className="p-5 text-center">
                        <p className="text-sm text-red-600">{notificationError}</p>
                        <button
                          type="button"
                          onClick={() => void loadNotifications()}
                          className="mt-2 text-sm font-medium text-[#B91C1C] hover:underline"
                        >
                          Try again
                        </button>
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="p-6 text-center text-sm text-gray-500">
                        No notifications available.
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`border-b border-gray-100 p-4 last:border-0 ${
                            notification.isRead ? "bg-white" : "bg-red-50/40"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                notification.isRead ? "bg-gray-300" : "bg-[#B91C1C]"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-gray-600">
                                {notification.message}
                              </p>
                              <p className="mt-2 text-[11px] text-gray-400">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                              {!notification.isRead && (
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => void handleMarkAsRead(notification.id)}
                                  className="mt-2 text-xs font-semibold text-[#B91C1C] hover:underline disabled:opacity-50"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-gray-100 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setIsNotificationOpen(false)}
                      className="w-full text-center text-xs font-medium text-gray-500 hover:text-gray-800"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* The signed-in user's name opens their profile page. */}
            <NavLink
              to="/admin/profile"
              className="flex items-center gap-3 rounded-lg border-l border-gray-200 pl-5 transition hover:bg-gray-50"
              aria-label="Open my profile"
            >
              <UserCircle size={34} className="text-gray-500" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">Administrator · My Profile</p>
              </div>
            </NavLink>
          </div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
