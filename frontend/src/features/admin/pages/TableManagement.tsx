import { useEffect, useMemo, useState } from "react";
import { Armchair, Plus, RefreshCw, Search, Pencil, Ban, RotateCcw, X } from "lucide-react";
import {
  getAdminBranches, getAdminTables, createAdminTable, updateAdminTable, deactivateAdminTable, reactivateAdminTable,
  type AdminBranch, type AdminTable,
} from "../admin.service";

function apiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (data?.message || data?.error) return data.message || data.error || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
type ModalMode = "create" | "edit" | "deactivate" | "reactivate" | null;

export default function TableManagement() {
  const [tables, setTables] = useState<AdminTable[]>([]);
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modal, setModal] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<AdminTable | null>(null);
  const [form, setForm] = useState({ branchId: "", tableNumber: "", capacity: "" });
  const [modalError, setModalError] = useState("");

  async function loadData() {
    setError("");
    try {
      const [branchData, tableData] = await Promise.all([getAdminBranches(), getAdminTables()]);
      setBranches(branchData); setTables(tableData);
    } catch (e) { setError(apiError(e, "Unable to load tables and branches.")); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadData(); }, []);

  const filtered = useMemo(() => tables.filter((table) => {
    const term = search.toLowerCase();
    const matchesSearch = [table.tableNumber, table.branch?.name ?? "", table.branch?.branchCode ?? ""].some((v) => v.toLowerCase().includes(term));
    return matchesSearch && (branchFilter === "ALL" || table.branchId === branchFilter) && (statusFilter === "ALL" || table.status === statusFilter);
  }), [tables, search, branchFilter, statusFilter]);

  function openCreate() {
    const firstActive = branches.find((b) => b.isActive)?.id ?? "";
    setSelected(null); setForm({ branchId: firstActive, tableNumber: "", capacity: "" }); setModalError(""); setModal("create");
  }
  function openEdit(table: AdminTable) {
    setSelected(table); setForm({ branchId: table.branchId, tableNumber: table.tableNumber, capacity: table.capacity?.toString() ?? "" }); setModalError(""); setModal("edit");
  }
  async function saveTable(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setModalError("");
    const capacity = form.capacity.trim() ? Number(form.capacity) : undefined;
    try {
      if (modal === "create") {
        await createAdminTable({ branchId: form.branchId, tableNumber: form.tableNumber.trim(), ...(capacity !== undefined ? { capacity } : {}) });
      } else if (selected) {
        await updateAdminTable(selected.id, { tableNumber: form.tableNumber.trim(), capacity: capacity ?? null });
      }
      setModal(null); await loadData();
    } catch (e) { setModalError(apiError(e, "Unable to save table.")); }
    finally { setSaving(false); }
  }
  async function runAction() {
    if (!selected || !modal) return; setSaving(true); setModalError("");
    try {
      if (modal === "deactivate") await deactivateAdminTable(selected.id);
      if (modal === "reactivate") await reactivateAdminTable(selected.id);
      setModal(null); await loadData();
    } catch (e) { setModalError(apiError(e, "Unable to update table status.")); }
    finally { setSaving(false); }
  }

  const count = (status: AdminTable["status"]) => tables.filter((t) => t.status === status).length;
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-gray-900">Table Management</h1><p className="mt-1 text-sm text-gray-500">Configure dining tables across all active branches.</p></div><div className="flex gap-2"><button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><RefreshCw size={16}/>Refresh</button><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"><Plus size={16}/>Add Table</button></div></div>
    <div className="grid gap-4 sm:grid-cols-4">{[{label:"Total Tables",value:tables.length},{label:"Available",value:count("AVAILABLE")},{label:"Occupied",value:count("OCCUPIED")},{label:"Inactive",value:count("INACTIVE")}].map((item)=><div key={item.label} className="rounded-xl border border-gray-200 bg-white p-5"><p className="text-sm text-gray-500">{item.label}</p><p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p></div>)}</div>
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search table number or branch" className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm"/></div><select value={branchFilter} onChange={(e)=>setBranchFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="ALL">All branches</option>{branches.map((b)=><option key={b.id} value={b.id}>{b.branchCode} — {b.name}</option>)}</select><select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="ALL">All statuses</option><option value="AVAILABLE">Available</option><option value="OCCUPIED">Occupied</option><option value="INACTIVE">Inactive</option></select></div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="border-b border-gray-200 px-5 py-4"><h2 className="font-semibold text-gray-900">Dining Tables <span className="ml-1 text-sm font-normal text-gray-500">({filtered.length})</span></h2><p className="mt-1 text-xs text-gray-500">Availability is calculated from current unpaid orders by the backend.</p></div>
      {loading ? <p className="p-8 text-center text-sm text-gray-500">Loading tables…</p> : filtered.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No tables match your filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3">Table</th><th className="px-5 py-3">Branch</th><th className="px-5 py-3">Capacity</th><th className="px-5 py-3">Availability</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{filtered.map((table)=><tr key={table.id} className="hover:bg-gray-50"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-gray-100 p-2"><Armchair size={18}/></span><span className="font-semibold text-gray-900">Table {table.tableNumber}</span></div></td><td className="px-5 py-4"><p className="font-medium text-gray-800">{table.branch?.name ?? "—"}</p><p className="text-xs text-gray-500">{table.branch?.branchCode ?? ""}</p></td><td className="px-5 py-4 text-gray-600">{table.capacity ?? "Not specified"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${table.status === "AVAILABLE" ? "bg-green-50 text-green-700" : table.status === "OCCUPIED" ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{table.status === "AVAILABLE" ? "Available" : table.status === "OCCUPIED" ? "Occupied" : "Inactive"}</span></td><td className="px-5 py-4"><div className="flex justify-end gap-2">{table.status !== "INACTIVE" && <button onClick={()=>openEdit(table)} title="Edit table" className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-100"><Pencil size={16}/></button>}{table.status === "INACTIVE" ? <button onClick={()=>{setSelected(table);setModalError("");setModal("reactivate");}} title="Reactivate table" className="rounded-lg border border-gray-200 p-2 text-green-700 hover:bg-green-50"><RotateCcw size={16}/></button> : <button onClick={()=>{setSelected(table);setModalError("");setModal("deactivate");}} title="Deactivate table" className="rounded-lg border border-gray-200 p-2 text-red-600 hover:bg-red-50"><Ban size={16}/></button>}</div></td></tr>)}</tbody></table></div>}
    </div>
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-2xl bg-white shadow-xl"><div className="flex items-center justify-between border-b px-6 py-4"><h2 className="text-lg font-semibold">{modal === "create" ? "Add Table" : modal === "edit" ? "Edit Table" : modal === "deactivate" ? "Deactivate Table" : "Reactivate Table"}</h2><button onClick={()=>setModal(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={18}/></button></div>
      {modal === "deactivate" || modal === "reactivate" ? <div className="space-y-4 p-6"><p className="text-sm text-gray-600">{modal === "deactivate" ? <>Deactivate <strong>Table {selected?.tableNumber}</strong>? An occupied table cannot be deactivated.</> : <>Reactivate <strong>Table {selected?.tableNumber}</strong>? It will return to Available status.</>}</p>{modalError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</p>}<div className="flex justify-end gap-2"><button onClick={()=>setModal(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} onClick={()=>void runAction()} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${modal === "deactivate" ? "bg-red-600" : "bg-gray-900"}`}>{saving ? "Please wait…" : modal === "deactivate" ? "Deactivate" : "Reactivate"}</button></div></div> : <form onSubmit={saveTable} className="space-y-4 p-6">{modal === "create" && <label className="block text-sm text-gray-700">Branch<select required value={form.branchId} onChange={(e)=>setForm({...form,branchId:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Select a branch</option>{branches.filter((b)=>b.isActive).map((b)=><option key={b.id} value={b.id}>{b.branchCode} — {b.name}</option>)}</select></label>}<label className="block text-sm text-gray-700">Table number<input required maxLength={20} value={form.tableNumber} onChange={(e)=>setForm({...form,tableNumber:e.target.value})} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"/></label><label className="block text-sm text-gray-700">Seating capacity<input type="number" min="1" max="50" value={form.capacity} onChange={(e)=>setForm({...form,capacity:e.target.value})} placeholder="Optional" className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"/></label>{modalError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setModal(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving || (modal === "create" && !branches.some((b)=>b.id===form.branchId && b.isActive))} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving…" : modal === "create" ? "Create Table" : "Save Changes"}</button></div></form>}</div></div>}
  </div>;
}
