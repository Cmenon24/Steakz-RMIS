import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Archive, ClipboardList, LayoutDashboard, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "../hooks/AuthContext";

const navigation = [
  { label: "Dashboard", path: "/kitchen", icon: LayoutDashboard, end: true },
  { label: "Kitchen Queue", path: "/kitchen/queue", icon: ClipboardList, end: false },
  { label: "Kitchen History", path: "/kitchen/history", icon: Archive, end: false },
];

export default function CookLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function signOut() { logout(); navigate("/login", { replace: true }); }

  return <div className="min-h-screen bg-gray-100">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[#1F2937] text-white md:flex">
      <div className="border-b border-gray-600 px-6 py-6"><h1 className="text-xl font-bold tracking-wide">STEAKZ RMIS</h1><p className="mt-1 text-xs text-gray-400">Restaurant Operations</p></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6"><p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Kitchen Workspace</p>
        {navigation.map((item) => { const Icon = item.icon; return <NavLink key={item.path} to={item.path} end={item.end} className={({isActive}) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${isActive ? "bg-[#374151] text-white shadow-sm" : "text-gray-300 hover:bg-[#374151] hover:text-white"}`}><Icon size={19}/>{item.label}</NavLink>; })}
      </nav>
      <div className="space-y-1 border-t border-gray-600 p-4">
        <NavLink to="/kitchen/profile" className={({isActive}) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${isActive ? "bg-[#374151] text-white" : "text-gray-300 hover:bg-[#374151] hover:text-white"}`}><UserCircle size={19}/>My Profile</NavLink>
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-[#374151] hover:text-white"><LogOut size={19}/>Sign Out</button>
      </div>
    </aside>
    <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
      <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between border-b border-gray-200 bg-white px-5 sm:px-8">
        <div><p className="text-xs text-gray-500">Steakz RMIS</p><p className="font-semibold text-gray-800">Kitchen Workspace</p></div>
        <NavLink to="/kitchen/profile" className="flex items-center gap-3 rounded-lg py-1 pl-3 hover:bg-gray-50"><UserCircle size={34} className="text-gray-500"/><span className="text-left"><span className="block text-sm font-semibold text-gray-800">{user?.firstName} {user?.lastName}</span><span className="block text-xs text-gray-500">Cook · {user?.branchName ?? "Assigned branch"}</span></span></NavLink>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2 md:hidden">
        {navigation.map((item) => <NavLink key={item.path} to={item.path} end={item.end} className={({isActive}) => `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${isActive ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{item.label}</NavLink>)}
        <NavLink to="/kitchen/profile" className="whitespace-nowrap rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-100">My Profile</NavLink>
        <button onClick={signOut} className="whitespace-nowrap rounded-lg px-3 py-2 text-xs text-gray-600 hover:bg-gray-100">Sign out</button>
      </nav>
      <main className="w-full flex-1 p-4 sm:p-6 lg:p-8"><Outlet/></main>
    </div>
  </div>;
}
