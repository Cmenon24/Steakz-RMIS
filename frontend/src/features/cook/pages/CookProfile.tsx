import { useEffect, useState } from "react";
import { Building2, Fingerprint, Mail, RefreshCw, ShieldCheck, UserCircle } from "lucide-react";
import { useAuth } from "../../../hooks/AuthContext";
import { getProfile, type AuthUser } from "../../../services/auth.service";

export default function CookProfile() {
  const {user}=useAuth();
  const [profile,setProfile]=useState<AuthUser|null>(user);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  async function load(){setLoading(true);setError("");try{setProfile(await getProfile());}catch(e:any){setError(e.response?.data?.message??"Unable to load profile.");}finally{setLoading(false);}}
  useEffect(()=>{void load();},[]);
  const name=[profile?.firstName,profile?.lastName].filter(Boolean).join(" ")||"Cook";
  const fields=[
    {label:"Full name",value:name,icon:UserCircle},{label:"Email address",value:profile?.email??"—",icon:Mail},
    {label:"Role",value:"Cook",icon:ShieldCheck},{label:"Account ID",value:profile?.id??"—",icon:Fingerprint},
    {label:"Assigned branch",value:profile?.branchName??"Not assigned",icon:Building2},{label:"Branch ID",value:profile?.branchId??"Not assigned",icon:Building2},
  ];
  return <div className="mx-auto max-w-4xl space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">My Profile</h1><p className="mt-1 text-sm text-gray-500">View the account details associated with your signed-in Cook account.</p></div>
    {error&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"><p className="text-sm text-red-700">{error}</p><button onClick={()=>void load()} className="flex items-center gap-2 text-sm font-medium text-red-700 hover:underline"><RefreshCw size={15}/>Try again</button></div>}
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><div className="flex flex-wrap items-center gap-4 bg-[#1F2937] px-6 py-7 text-white"><div className="rounded-full bg-white/10 p-3"><UserCircle size={42}/></div><div className="min-w-0 flex-1"><h2 className="text-xl font-semibold">{name}</h2><p className="mt-1 text-sm text-gray-300">Cook</p></div><button onClick={()=>void load()} disabled={loading} className="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"><RefreshCw size={15} className={loading?"animate-spin":""}/>Refresh</button></div>
      <div className="p-6">{loading&&!profile?<p className="py-8 text-center text-sm text-gray-500">Loading profile details…</p>:<div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">{fields.map(({label,value,icon:Icon})=><div key={label} className="flex items-start gap-3 border-b border-gray-100 py-4 last:border-0"><div className="rounded-lg bg-gray-100 p-2 text-gray-600"><Icon size={18}/></div><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 break-all text-sm font-medium text-gray-900">{value}</p></div></div>)}</div>}</div>
    </section>
    <p className="text-xs leading-5 text-gray-500">This page is view-only. Account details and access permissions are managed through the System Administration user management process.</p>
  </div>;
}
