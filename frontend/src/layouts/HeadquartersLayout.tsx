import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, BarChart3, Building2, ChefHat, ClipboardList, LayoutDashboard, LogOut, Tags, Utensils, UserCircle, CheckCheck } from "lucide-react";
import { useAuth } from "../hooks/AuthContext";
import { getRecentNotifications, getUnreadNotificationCount, markAdminNotificationRead, markAllAdminNotificationsRead, type AdminNotification } from "../features/admin/admin.service";

const navigation = [
  { label:"Dashboard", path:"/headquarters", icon:LayoutDashboard },
  { label:"Orders", path:"/headquarters/orders", icon:ClipboardList },
  { label:"Branch Overview", path:"/headquarters/branches", icon:Building2 },
  { label:"Menu Management", path:"/headquarters/menu", icon:Utensils },
  { label:"Recipe Management", path:"/headquarters/recipes", icon:ChefHat },
  { label:"Promotions", path:"/headquarters/promotions", icon:Tags },
  { label:"Reports", path:"/headquarters/reports", icon:BarChart3 },
];

export default function HeadquartersLayout() {
  const { user, logout } = useAuth(); const navigate = useNavigate();
  const [notes,setNotes]=useState<AdminNotification[]>([]); const [unread,setUnread]=useState(0); const [open,setOpen]=useState(false); const [noteError,setNoteError]=useState("");
  async function loadNotes(){ try { const [items,count]=await Promise.all([getRecentNotifications(),getUnreadNotificationCount()]); setNotes(items);setUnread(count);setNoteError(""); } catch { setNoteError("Unable to load notifications."); } }
  useEffect(()=>{void loadNotes();},[]);
  async function markRead(id:string){try{await markAdminNotificationRead(id);await loadNotes();}catch{setNoteError("Unable to update notification.");}}
  async function markAll(){try{await markAllAdminNotificationsRead();await loadNotes();}catch{setNoteError("Unable to update notifications.");}}
  function signOut(){logout();navigate("/login",{replace:true});}
  return <div className="flex min-h-screen bg-gray-100">
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-[#1F2937] text-white">
      <div className="border-b border-gray-600 px-6 py-6"><h1 className="text-xl font-bold tracking-wide">STEAKZ RMIS</h1><p className="mt-1 text-xs text-gray-400">Headquarters Operations</p></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6"><p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Main Menu</p>{navigation.map(item=>{const Icon=item.icon;return <NavLink key={item.path} to={item.path} end={item.path==="/headquarters"} className={({isActive})=>`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${isActive?"bg-[#374151] text-white":"text-gray-300 hover:bg-[#374151] hover:text-white"}`}><Icon size={19}/>{item.label}</NavLink>;})}</nav>
      <div className="space-y-1 border-t border-gray-600 p-4"><NavLink to="/headquarters/profile" className={({isActive})=>`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${isActive?"bg-[#374151] text-white":"text-gray-300 hover:bg-[#374151] hover:text-white"}`}><UserCircle size={19}/>My Profile</NavLink><button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-[#374151] hover:text-white"><LogOut size={19}/>Sign Out</button></div>
    </aside>
    <div className="ml-64 flex min-h-screen min-w-0 flex-1 flex-col">
      <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8"><div><p className="text-sm text-gray-500">Steakz RMIS</p><p className="font-semibold text-gray-800">Headquarters Operations Portal</p></div><div className="flex items-center gap-5"><div className="relative"><button type="button" aria-label={`Notifications, ${unread} unread`} onClick={()=>{setOpen(v=>!v);if(!open)void loadNotes();}} className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100"><Bell size={21}/>{unread>0&&<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B91C1C] px-1 text-[10px] font-bold text-white">{unread>99?"99+":unread}</span>}</button>{open&&<div className="absolute right-0 top-full z-50 mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"><div className="flex items-center justify-between border-b px-4 py-4"><div><h2 className="font-semibold text-gray-900">Notifications</h2><p className="mt-1 text-xs text-gray-500">{unread} unread notifications</p></div><button onClick={()=>void markAll()} disabled={!unread} className="flex items-center gap-1 text-xs font-medium text-[#B91C1C] disabled:text-gray-400"><CheckCheck size={15}/>Mark all as read</button></div><div className="max-h-96 overflow-y-auto">{noteError?<p className="p-5 text-sm text-red-600">{noteError}</p>:notes.length===0?<p className="p-6 text-center text-sm text-gray-500">No notifications available.</p>:notes.map(n=><div key={n.id} className={`border-b p-4 ${n.isRead?"bg-white":"bg-red-50/40"}`}><p className="text-sm font-medium text-gray-800">{n.title}</p><p className="mt-1 text-xs text-gray-600">{n.message}</p><p className="mt-2 text-[11px] text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>{!n.isRead&&<button onClick={()=>void markRead(n.id)} className="mt-2 text-xs font-semibold text-[#B91C1C]">Mark as read</button>}</div>)}</div><button onClick={()=>setOpen(false)} className="w-full border-t px-4 py-3 text-xs text-gray-500">Close</button></div>}</div><NavLink to="/headquarters/profile" className="flex items-center gap-3 border-l border-gray-200 pl-5"><UserCircle size={34} className="text-gray-500"/><div><p className="text-sm font-semibold text-gray-800">{user?.firstName} {user?.lastName}</p><p className="text-xs text-gray-500">Headquarters Manager · My Profile</p></div></NavLink></div></header>
      <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-4 py-2 md:hidden">{navigation.map(n=><NavLink key={n.path} to={n.path} end={n.path==="/headquarters"} className={({isActive})=>`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${isActive?"bg-gray-800 text-white":"text-gray-600 hover:bg-gray-100"}`}>{n.label}</NavLink>)}</nav>
      <main className="flex-1 p-4 sm:p-6 lg:p-8"><Outlet/></main>
    </div>
  </div>;
}
