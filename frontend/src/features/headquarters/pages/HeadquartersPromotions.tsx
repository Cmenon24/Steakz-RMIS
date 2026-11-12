import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus, Pencil, Ban } from "lucide-react";
import { getBranches, getMenuItems, getPromotions, createPromotion, updatePromotion, deactivatePromotion, type Branch, type MenuItem, type Promotion } from "../headquarters.service";
import { money, date, errorText, PageTitle, Notice, LoadingError, Card, Status, Button, Modal, SearchInput, Select, Field, inputClass, ActionIcon } from "./hq-shared";

type PromotionForm = { name: string; description: string; discountType: "PERCENTAGE" | "FIXED_AMOUNT"; discountValue: string; startDate: string; endDate: string; branchIds: string[]; menuItemIds: string[] };
const emptyForm: PromotionForm = { name: "", description: "", discountType: "PERCENTAGE", discountValue: "10", startDate: "", endDate: "", branchIds: [], menuItemIds: [] };
const toLocalInput = (value: string) => { const d = new Date(value); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const toApiDate = (value: string) => new Date(value).toISOString();

export function HeadquartersPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<PromotionForm>(emptyForm);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const [promotionRows, branchRows, menuRows] = await Promise.all([getPromotions(), getBranches(), getMenuItems()]);
      setPromotions(promotionRows); setBranches(branchRows); setItems(menuRows);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => promotions.filter(promotion => {
    return `${promotion.name} ${promotion.description ?? ""}`.toLowerCase().includes(search.toLowerCase()) &&
      (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? promotion.isActive : !promotion.isActive));
  }), [promotions, search, statusFilter]);

  function openCreate() {
    const activeBranches = branches.filter(branch => branch.isActive).map(branch => branch.id);
    const activeItems = items.filter(item => item.isActive).map(item => item.id);
    setEditing(null); setForm({ ...emptyForm, branchIds: activeBranches, menuItemIds: activeItems });
    setModalOpen(true);
  }
  function openEdit(promotion: Promotion) {
    setEditing(promotion);
    setForm({
      name: promotion.name, description: promotion.description ?? "",
      discountType: promotion.discountType as PromotionForm["discountType"], discountValue: String(promotion.discountValue),
      startDate: toLocalInput(promotion.startDate), endDate: toLocalInput(promotion.endDate),
      branchIds: (promotion.branches ?? []).map(row => row.branchId),
      menuItemIds: (promotion.items ?? []).map(row => row.menuItemId),
    });
    setModalOpen(true);
  }

  function toggleId(key: "branchIds" | "menuItemIds", id: string) {
    setForm(current => ({ ...current, [key]: current[key].includes(id) ? current[key].filter(value => value !== id) : [...current[key], id] }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const value = Number(form.discountValue);
    if (!Number.isFinite(value) || value <= 0) { setError("Enter a positive discount value."); return; }
    if (form.discountType === "PERCENTAGE" && value > 50) { setError("Percentage discounts cannot exceed 50%."); return; }
    if (!form.startDate || !form.endDate || new Date(form.endDate) <= new Date(form.startDate)) { setError("The end date and time must be later than the start date and time."); return; }
    if (!form.branchIds.length || !form.menuItemIds.length) { setError("Select at least one eligible branch and one menu item."); return; }
    const payload = { name: form.name.trim(), description: form.description.trim() || undefined, discountType: form.discountType, discountValue: value, startDate: toApiDate(form.startDate), endDate: toApiDate(form.endDate), branchIds: form.branchIds, menuItemIds: form.menuItemIds };
    setBusy(true);
    try {
      if (editing) await updatePromotion(editing.id, payload);
      else await createPromotion(payload);
      setNotice(editing ? "Promotion updated." : "Promotion created.");
      setModalOpen(false); await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  async function deactivate(promotion: Promotion) {
    if (!confirm(`Deactivate ${promotion.name}? This does not alter completed orders.`)) return;
    setBusy(true); setError("");
    try { await deactivatePromotion(promotion.id); setNotice("Promotion deactivated."); await load(); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }

  return <>
    <PageTitle title="Promotions" subtitle="Manage centrally controlled discounts and their eligible branches and menu items." action={<div className="flex gap-2"><Button variant="light" onClick={() => void load()}><RefreshCw size={15}/>Refresh</Button><Button onClick={openCreate}><Plus size={15}/>Create promotion</Button></div>}/>
    <Notice message={notice} onDismiss={() => setNotice("")}/><Notice message={error} error onDismiss={() => setError("")}/>
    <div className="mb-4 flex flex-wrap gap-3"><SearchInput value={search} onChange={setSearch} placeholder="Search promotion name or description"/><Select value={statusFilter} onChange={setStatusFilter}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select><span className="ml-auto self-center text-xs text-gray-500">{filtered.length} of {promotions.length} promotions</span></div>
    <LoadingError loading={loading} error={error && !promotions.length ? error : ""} retry={() => void load()}/>
    {!loading && <Card><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm">
      <thead className="border-b text-xs uppercase text-gray-500"><tr>{["Promotion", "Discount", "Start date", "End date", "Branches", "Menu items", "Status", "Actions"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
      <tbody className="divide-y">{filtered.map(promotion => <tr key={promotion.id}>
        <td className="px-3 py-3"><p className="font-medium text-gray-800">{promotion.name}</p><p className="text-xs text-gray-500">{promotion.description ?? "—"}</p></td>
        <td className="px-3 py-3">{promotion.discountType === "PERCENTAGE" ? `${promotion.discountValue}%` : money(promotion.discountValue)}</td>
        <td className="px-3 py-3 text-xs text-gray-600">{date(promotion.startDate)}</td><td className="px-3 py-3 text-xs text-gray-600">{date(promotion.endDate)}</td>
        <td className="px-3 py-3">{promotion.branches?.length ?? 0}</td><td className="px-3 py-3">{promotion.items?.length ?? 0}</td>
        <td className="px-3 py-3"><Status value={promotion.status ?? (promotion.isActive ? "ACTIVE" : "INACTIVE")}/></td>
        <td className="px-3 py-3"><div className="flex gap-2">{promotion.isActive ? <ActionIcon label="Edit promotion" onClick={() => openEdit(promotion)}><Pencil size={16}/></ActionIcon> : <button type="button" aria-label="Promotion inactive; editing unavailable" title="Promotion inactive; editing unavailable" disabled className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-gray-400"><Pencil size={16}/></button>}{promotion.isActive && <ActionIcon label="Deactivate promotion" danger disabled={busy} onClick={() => void deactivate(promotion)}><Ban size={16}/></ActionIcon>}</div></td>
      </tr>)}{!filtered.length && <tr><td colSpan={8} className="py-8 text-center text-sm text-gray-500">No promotions match these filters.</td></tr>}</tbody>
    </table></div></Card>}
    <p className="mt-4 text-xs text-gray-500">Promotion dates are submitted with a UTC offset. Percentage discounts are capped at 50%. The backend permits edits only while a promotion is scheduled and unused; any restriction is reported when you save.</p>

    {modalOpen && <Modal title={editing ? "Edit promotion" : "Create promotion"} close={() => setModalOpen(false)} size="max-w-3xl">
      <form onSubmit={event => void save(event)} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Promotion name"><input required minLength={2} maxLength={100} className={inputClass} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></Field>
          <Field label="Discount type"><select className={inputClass} value={form.discountType} onChange={event => setForm({ ...form, discountType: event.target.value as PromotionForm["discountType"] })}><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option></select></Field>
          <Field label={form.discountType === "PERCENTAGE" ? "Discount (%) · maximum 50" : "Discount amount"}><input required type="number" min="0.01" max={form.discountType === "PERCENTAGE" ? 50 : undefined} step="0.01" className={inputClass} value={form.discountValue} onChange={event => setForm({ ...form, discountValue: event.target.value })}/></Field>
          <Field label="Description"><input maxLength={500} className={inputClass} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></Field>
          <Field label="Start date and time"><input required type="datetime-local" className={inputClass} value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })}/></Field>
          <Field label="End date and time"><input required type="datetime-local" className={inputClass} value={form.endDate} onChange={event => setForm({ ...form, endDate: event.target.value })}/></Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <fieldset className="rounded-lg border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold">Eligible branches</legend><div className="max-h-44 space-y-2 overflow-y-auto">{branches.filter(branch => branch.isActive).map(branch => <label key={branch.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.branchIds.includes(branch.id)} onChange={() => toggleId("branchIds", branch.id)}/>{branch.branchCode} · {branch.name}</label>)}</div><p className="mt-2 text-xs text-gray-500">{form.branchIds.length} selected</p></fieldset>
          <fieldset className="rounded-lg border border-gray-200 p-3"><legend className="px-1 text-sm font-semibold">Eligible menu items</legend><div className="max-h-44 space-y-2 overflow-y-auto">{items.filter(item => item.isActive).map(item => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.menuItemIds.includes(item.id)} onChange={() => toggleId("menuItemIds", item.id)}/>{item.name}</label>)}</div><p className="mt-2 text-xs text-gray-500">{form.menuItemIds.length} selected</p></fieldset>
        </div>
        <div className="flex justify-end gap-2 border-t pt-4"><Button variant="light" onClick={() => setModalOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{editing ? "Save changes" : "Create promotion"}</Button></div>
      </form>
    </Modal>}
  </>;
}
