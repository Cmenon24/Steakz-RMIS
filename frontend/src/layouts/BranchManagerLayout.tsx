import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell, BarChart3, ClipboardCheck, ClipboardList,
  LayoutDashboard, LogOut, Package, Tags, Table2, UserCircle, Utensils,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "../hooks/AuthContext";
import {
  getRecentNotifications, getUnreadNotificationCount,
  markAdminNotificationRead, markAllAdminNotificationsRead,
  type AdminNotification,
} from "../features/admin/admin.service";

const navigation = [
  { label: "Dashboard", path: "/branch-manager", icon: LayoutDashboard },
  { label: "Orders", path: "/branch-manager/orders", icon: ClipboardList },
  { label: "Inventory", path: "/branch-manager/inventory", icon: Package },
  { label: "Stocktakes", path: "/branch-manager/stocktakes", icon: ClipboardCheck },
  { label: "Table Overview", path: "/branch-manager/tables", icon: Table2 },
  { label: "Menu Availability", path: "/branch-manager/menu", icon: Utensils },
  { label: "Promotions", path: "/branch-manager/promotions", icon: Tags },
  { label: "Reports", path: "/branch-manager/reports", icon: BarChart3 },
];

export default function BranchManagerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  async function loadNotifications() {
    setNotificationLoading(true);
    setNotificationError("");
    try {
      const [items, count] = await Promise.all([
        getRecentNotifications(),
        getUnreadNotificationCount(),
      ]);
      setNotifications(items);
      setUnreadCount(count);
    } catch {
      setNotificationError("Unable to load notifications.");
    } finally {
      setNotificationLoading(false);
    }
  }

  useEffect(() => { void loadNotifications(); }, []);

  async function markRead(id: string) {
    try {
      await markAdminNotificationRead(id);
      await loadNotifications();
    } catch {
      setNotificationError("Unable to update this notification.");
    }
  }

  async function markAllRead() {
    try {
      await markAllAdminNotificationsRead();
      await loadNotifications();
    } catch {
      setNotificationError("Unable to update notifications.");
    }
  }

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#1F2937] text-white">
        <div className="border-b border-gray-600 px-6 py-6">
          <h1 className="text-xl font-bold tracking-wide">STEAKZ RMIS</h1>
          <p className="mt-1 text-xs text-gray-400">Restaurant Operations</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Main Menu</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} end={item.path === "/branch-manager"}
                className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${isActive ? "bg-[#374151] text-white" : "text-gray-300 hover:bg-[#374151] hover:text-white"}`}>
                <Icon size={19} />{item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-gray-600 p-4">
          <NavLink to="/branch-manager/profile" className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${isActive ? "bg-[#374151] text-white" : "text-gray-300 hover:bg-[#374151] hover:text-white"}`}>
            <UserCircle size={19} />My Profile
          </NavLink>
          <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-[#374151] hover:text-white">
            <LogOut size={19} />Sign Out
          </button>
        </div>
      </aside>

      <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8">
          <div>
            <p className="text-sm text-gray-500">Steakz RMIS</p>
            <p className="font-semibold text-gray-800">Restaurant Operations Portal</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative">
              <button type="button" aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={notificationOpen}
                onClick={() => { setNotificationOpen((open) => !open); if (!notificationOpen) void loadNotifications(); }}
                className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <Bell size={21} />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B91C1C] px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
              </button>
              {notificationOpen && <div className="absolute right-0 top-full z-50 mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-4">
                  <div><h2 className="font-semibold text-gray-900">Notifications</h2><p className="mt-1 text-xs text-gray-500">{unreadCount} unread notifications</p></div>
                  <button type="button" onClick={() => void markAllRead()} disabled={!unreadCount} className="flex items-center gap-1 text-xs font-medium text-[#B91C1C] disabled:text-gray-400"><CheckCheck size={15}/>Mark all as read</button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notificationLoading ? <p className="p-6 text-center text-sm text-gray-500">Loading notifications...</p>
                    : notificationError ? <p className="p-5 text-sm text-red-600">{notificationError}</p>
                    : notifications.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">No notifications available.</p>
                    : notifications.map((note) => <div key={note.id} className={`border-b p-4 ${note.isRead ? "bg-white" : "bg-red-50/40"}`}>
                      <p className="text-sm font-medium text-gray-800">{note.title}</p><p className="mt-1 text-xs text-gray-600">{note.message}</p>
                      <p className="mt-2 text-[11px] text-gray-400">{new Date(note.createdAt).toLocaleString()}</p>
                      {!note.isRead && <button type="button" onClick={() => void markRead(note.id)} className="mt-2 text-xs font-semibold text-[#B91C1C]">Mark as read</button>}
                    </div>)}
                </div>
                <button type="button" onClick={() => setNotificationOpen(false)} className="w-full border-t px-4 py-3 text-xs text-gray-500">Close</button>
              </div>}
            </div>
            <NavLink to="/branch-manager/profile" className="flex items-center gap-3 border-l border-gray-200 pl-5 hover:bg-gray-50">
              <UserCircle size={34} className="text-gray-500"/>
              <div><p className="text-sm font-semibold text-gray-800">{user?.firstName} {user?.lastName}</p><p className="text-xs text-gray-500">Branch Manager · My Profile</p></div>
            </NavLink>
          </div>
        </header>
        <main className="flex-1 p-8"><Outlet /></main>
      </div>
    </div>
  );
}
