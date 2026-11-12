import { useEffect, useState } from "react";
import { Building2, Fingerprint, Mail, RefreshCw, ShieldCheck, UserCircle } from "lucide-react";
import { useAuth } from "../../../hooks/AuthContext";
import { getProfile, type AuthUser } from "../../../services/auth.service";

export default function ServerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(user);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setProfile(await getProfile());
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Server";
  const fields = [
    { label: "Full name", value: fullName, icon: UserCircle },
    { label: "Email address", value: profile?.email ?? "—", icon: Mail },
    { label: "Role", value: "Server", icon: ShieldCheck },
    { label: "Account ID", value: profile?.id ?? "—", icon: Fingerprint },
    { label: "Assigned branch", value: profile?.branchName ?? "Not assigned", icon: Building2 },
    { label: "Branch ID", value: profile?.branchId ?? "Not assigned", icon: Building2 },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">View the account details associated with your signed-in Server account.</p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 bg-[#1F2937] px-6 py-7 text-white sm:flex-row sm:items-center sm:px-9">
          <div className="flex items-center gap-5">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 text-white"><UserCircle size={58} strokeWidth={1.7} /></span>
            <div><h2 className="text-xl font-semibold sm:text-2xl">{fullName}</h2><p className="mt-1 text-sm text-gray-300">Server</p></div>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-gray-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60 sm:self-center"><RefreshCw size={16} />Refresh</button>
        </div>

        <div className="p-6 sm:p-9">
          {loading ? <p className="py-8 text-sm text-gray-500">Loading profile…</p> : (
            <div className="grid gap-x-10 sm:grid-cols-2">
              {fields.map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex min-w-0 gap-4 border-b border-gray-100 py-5 last:border-b-0 sm:odd:pr-5 sm:even:pl-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600"><Icon size={23} /></span>
                  <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 break-all text-sm font-medium text-gray-900 sm:text-base">{value}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <p className="text-sm leading-6 text-gray-500">This page is view-only. Account details and access permissions are managed through the System Administration user management process.</p>
    </div>
  );
}
