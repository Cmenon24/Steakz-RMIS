import { useEffect, useState } from "react";
import {
  RefreshCw, UserCircle, Mail, ShieldCheck, Building2, Fingerprint,
} from "lucide-react";
import { useAuth } from "../../../hooks/AuthContext";
import { getProfile, type AuthUser } from "../../../services/auth.service";

// Reuse the same role labels and profile presentation as the Admin screen.
function formatRole(role: AuthUser["role"]): string {
  const labels: Record<AuthUser["role"], string> = {
    ADMIN: "System Administrator",
    HEADQUARTERS_MANAGER: "Headquarters Manager",
    BRANCH_MANAGER: "Branch Manager",
    SERVER: "Server",
    COOK: "Cook",
  };
  return labels[role];
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserCircle;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-4 last:border-0">
      <div className="rounded-lg bg-gray-100 p-2 text-gray-600"><Icon size={18} /></div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function BranchProfile() {
  const { user: sessionUser } = useAuth();
  const [profile, setProfile] = useState<AuthUser | null>(sessionUser);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Refresh profile details from the authenticated profile endpoint.
  async function loadProfile() {
    setIsLoading(true);
    setError("");
    try {
      setProfile(await getProfile());
    } catch (err) {
      console.error("Unable to load Branch Manager profile:", err);
      setError("Unable to load your profile details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  const fullName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : "Branch Manager";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          View the account details associated with your signed-in Branch Manager account.
        </p>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => void loadProfile()} className="flex items-center gap-2 text-sm font-medium text-red-700 hover:underline">
            <RefreshCw size={15} />Try again
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-4 bg-[#1F2937] px-6 py-7 text-white">
          <div className="rounded-full bg-white/10 p-3"><UserCircle size={42} /></div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{fullName}</h2>
            <p className="mt-1 text-sm text-gray-300">{profile ? formatRole(profile.role) : "Account profile"}</p>
          </div>
          <button type="button" onClick={() => void loadProfile()} disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-white/30 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:opacity-50">
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />Refresh
          </button>
        </div>

        <div className="p-6">
          {isLoading && !profile ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading profile details...</p>
          ) : profile ? (
            <div className="grid grid-cols-1 gap-x-10 md:grid-cols-2">
              <DetailRow icon={UserCircle} label="Full Name" value={fullName} />
              <DetailRow icon={Mail} label="Email Address" value={profile.email} />
              <DetailRow icon={ShieldCheck} label="Role" value={formatRole(profile.role)} />
              <DetailRow icon={Fingerprint} label="Account ID" value={profile.id} />
              <DetailRow icon={Building2} label="Assigned Branch" value={profile.branchName || "Not assigned"} />
              <DetailRow icon={Building2} label="Branch ID" value={profile.branchId || "Not applicable"} />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">Profile information is not available.</p>
          )}
        </div>
      </section>

      <p className="text-xs leading-5 text-gray-500">
        This page is view-only. Account details and access permissions are managed through the System Administration user management process.
      </p>
    </div>
  );
}
