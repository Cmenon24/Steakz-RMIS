import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, RefreshCw, Search, Pencil, Ban, X, MapPin, Mail, Phone } from "lucide-react";
import {
  getAdminBranches, createAdminBranch, updateAdminBranch, deactivateAdminBranch,
  type AdminBranch, type CreateAdminBranchInput,
} from "../admin.service";

const blankForm: CreateAdminBranchInput = { branchCode: "", name: "", address: "", contactNumber: "", email: "", timeZone: "Europe/London" };
function apiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (data?.message || data?.error) return data.message || data.error || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
function dateLabel(value: string) { return new Date(value).toLocaleDateString(); }

export default function BranchManagement() {
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [modal, setModal] = useState<"create" | "edit" | "deactivate" | null>(null);
  const [selected, setSelected] = useState<AdminBranch | null>(null);
  const [form, setForm] = useState(blankForm);
  const [modalError, setModalError] = useState("");

  async function loadBranches() {
    setError("");
    try { setBranches(await getAdminBranches()); }
    catch (e) { setError(apiError(e, "Unable to load branches.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadBranches(); }, []);

  const filtered = useMemo(() => branches.filter((branch) => {
    const term = search.toLowerCase();
    const matches = [branch.branchCode, branch.name, branch.address, branch.email].some((v) => v.toLowerCase().includes(term));
    return matches && (status === "ALL" || (status === "ACTIVE" ? branch.isActive : !branch.isActive));
  }), [branches, search, status]);

  function openCreate() { setSelected(null); setForm(blankForm); setModalError(""); setModal("create"); }
  function openEdit(branch: AdminBranch) {
    setSelected(branch); setForm({ branchCode: branch.branchCode, name: branch.name, address: branch.address, contactNumber: branch.contactNumber, email: branch.email, timeZone: branch.timeZone });
    setModalError(""); setModal("edit");
  }
  async function saveBranch(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setModalError("");
    try {
      if (modal === "create") await createAdminBranch(form);
      else if (selected) await updateAdminBranch(selected.id, { name: form.name, address: form.address, contactNumber: form.contactNumber, email: form.email, timeZone: form.timeZone });
      setModal(null); await loadBranches();
    } catch (e) { setModalError(apiError(e, "Unable to save branch.")); }
    finally { setSaving(false); }
  }
  async function deactivate() {
    if (!selected) return; setSaving(true); setModalError("");
    try { await deactivateAdminBranch(selected.id); setModal(null); await loadBranches(); }
    catch (e) { setModalError(apiError(e, "Unable to deactivate branch.")); }
    finally { setSaving(false); }
  }

  const activeCount = branches.filter((b) => b.isActive).length;
  const inactiveCount = branches.length - activeCount;
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><h1 className="text-2xl font-bold text-gray-900">Branch Management</h1><p className="mt-1 text-sm text-gray-500">Manage Steakz locations and branch information.</p></div>
      <div className="flex gap-2"><button onClick={() => void loadBranches()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"><RefreshCw size={16}/>Refresh</button><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"><Plus size={16}/>Add Branch</button></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[{ label: "Total Branches", value: branches.length }, { label: "Active Branches", value: activeCount }, { label: "Inactive Branches", value: inactiveCount }].map((item) => <div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">{item.label}</p><p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p></div>)}
    </div>
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search branch code, name, address or email" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm"/></div><select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="border-b border-gray-200 px-5 py-4"><h2 className="font-semibold text-gray-900">Branches <span className="ml-1 text-sm font-normal text-gray-500">({filtered.length})</span></h2></div>
      {loading ? <p className="p-8 text-center text-sm text-gray-500">Loading branches…</p> : filtered.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No branches match your filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Branch</th><th className="px-5 py-3">Contact details</th><th className="px-5 py-3">Time zone</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{filtered.map((b) => <tr key={b.id} className="hover:bg-gray-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-gray-100 p-2"><Building2 size={18}/></span><div><p className="font-semibold text-gray-900">{b.name}</p><p className="text-xs text-gray-500">{b.branchCode}</p></div></div><p className="mt-2 flex items-center gap-1 text-xs text-gray-500"><MapPin size={13}/>{b.address}</p></td><td className="px-5 py-4"><p className="flex items-center gap-2 text-gray-700"><Phone size={14}/>{b.contactNumber}</p><p className="mt-1 flex items-center gap-2 text-gray-500"><Mail size={14}/>{b.email}</p></td><td className="px-5 py-4 text-gray-600">{b.timeZone}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${b.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{b.isActive ? "Active" : "Inactive"}</span></td><td className="px-5 py-4 text-gray-500">{dateLabel(b.createdAt)}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{b.isActive && <button onClick={() => openEdit(b)} title="Edit branch" className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100"><Pencil size={16}/></button>}{b.isActive && <button onClick={() => { setSelected(b); setModalError(""); setModal("deactivate"); }} title="Deactivate branch" className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50"><Ban size={16}/></button>}</div></td></tr>)}</tbody></table></div>}
    </div>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-xl rounded-2xl bg-white shadow-xl"><div className="flex items-center justify-between border-b px-6 py-4"><h2 className="text-lg font-semibold">{modal === "create" ? "Add Branch" : modal === "edit" ? "Edit Branch" : "Deactivate Branch"}</h2><button onClick={() => setModal(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18}/></button></div>
      {modal === "deactivate" ? <div className="space-y-4 p-6"><p className="text-sm text-gray-600">Deactivate <strong>{selected?.name}</strong>? The branch will remain in historical records. The backend will block this action while active employees, unresolved orders, unpaid completed orders, or an in-progress stocktake remain.</p>{modalError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</p>}<div className="flex justify-end gap-2"><button onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} onClick={() => void deactivate()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Deactivating…" : "Deactivate Branch"}</button></div></div> : <form onSubmit={saveBranch} className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm text-gray-700">Branch code<input required minLength={3} maxLength={10} disabled={modal === "edit"} value={form.branchCode} onChange={(e) => setForm({ ...form, branchCode: e.target.value.toUpperCase() })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 disabled:bg-gray-100"/></label><label className="text-sm text-gray-700">Branch name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"/></label><label className="text-sm text-gray-700 sm:col-span-2">Address<input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"/></label><label className="text-sm text-gray-700">Contact number<input required value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"/></label><label className="text-sm text-gray-700">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"/></label><label className="text-sm text-gray-700 sm:col-span-2">IANA time zone<input required placeholder="Europe/London" value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"/></label></div>{modalError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving…" : modal === "create" ? "Create Branch" : "Save Changes"}</button></div></form>}</div></div>}
  </div>;
}
