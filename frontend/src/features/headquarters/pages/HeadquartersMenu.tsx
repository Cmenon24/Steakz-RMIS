import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Plus, Pencil, Ban, CheckCircle2, History } from "lucide-react";
import {
  getBranches, getCategories, createCategory, updateCategory, setCategoryActive,
  getMenuItems, createMenuItem, updateMenuItem, setMenuItemActive, getMealSides,
  setMealSides, getBranchAvailability, updateBranchAvailability, getAvailabilityHistory,
  type Branch, type MenuCategory, type MenuItem,
} from "../headquarters.service";
import { type AnyRecord, money, date, errorText, PageTitle, Notice, LoadingError, Card, Status, Select, Button, Modal, ActionIcon, SearchInput, Field, inputClass } from "./hq-shared";

type CategoryForm = { name: string; description: string; displayOrder: string };
type ItemForm = { name: string; description: string; price: string; categoryId: string; drinkType: string; displayOrder: string };
const emptyCategory: CategoryForm = { name: "", description: "", displayOrder: "" };
const emptyItem: ItemForm = { name: "", description: "", price: "", categoryId: "", drinkType: "", displayOrder: "" };

export function HeadquartersMenu() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState("");
  const [availability, setAvailability] = useState<AnyRecord[]>([]);
  const [historyRows, setHistoryRows] = useState<AnyRecord[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tab, setTab] = useState("ITEMS");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [availabilitySearch, setAvailabilitySearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryModal, setCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [itemModal, setItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItem);
  const [sidesModal, setSidesModal] = useState<MenuItem | null>(null);
  const [sideNames, setSideNames] = useState(["", ""]);
  const [availabilityModal, setAvailabilityModal] = useState<{ branchId: string; branchName: string; itemId: string; current: boolean; name: string } | null>(null);
  const [availabilityReason, setAvailabilityReason] = useState("");
  const [busyId, setBusyId] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [categoryRows, itemRows, branchRows] = await Promise.all([getCategories(), getMenuItems(), getBranches()]);
      setCategories(categoryRows); setItems(itemRows); setBranches(branchRows);
      setBranch(current => current || "ALL");
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function loadAvailability(branchId: string) {
    try {
      const selectedBranches = branchId === "ALL"
        ? branches.filter(row => row.isActive)
        : branches.filter(row => row.id === branchId);
      const rows = await Promise.all(selectedBranches.map(async selectedBranch => {
        const response = await getBranchAvailability(selectedBranch.id) as AnyRecord;
        const records = response.availability ?? response.items ?? [];
        return (Array.isArray(records) ? records : []).map((record: AnyRecord) => ({ ...record, branch: selectedBranch }));
      }));
      setAvailability(rows.flat());
    } catch (e) { setError(errorText(e)); }
  }
  useEffect(() => { if (branches.length) void loadAvailability(branch); }, [branch, branches]);

  const activeItems = items.filter(item => item.isActive).length;
  const activeCategories = categories.filter(category => category.isActive).length;
  const filteredItems = useMemo(() => items.filter(item => {
    return `${item.name} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase()) &&
      (categoryFilter === "ALL" || item.categoryId === categoryFilter || item.category?.id === categoryFilter) &&
      (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? item.isActive : !item.isActive));
  }), [items, categories, search, categoryFilter, statusFilter]);
  const filteredCategories = categories.filter(category =>
    `${category.name} ${category.description ?? ""}`.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === "ALL" || (statusFilter === "ACTIVE" ? category.isActive : !category.isActive))
  );

  function openCategory(category?: MenuCategory) {
    setEditingCategory(category ?? null);
    setCategoryForm(category ? { name: category.name, description: category.description ?? "", displayOrder: String(category.displayOrder ?? "") } : emptyCategory);
    setCategoryModal(true);
  }
  async function saveCategory(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const payload = { name: categoryForm.name.trim(), description: categoryForm.description.trim() || undefined, ...(categoryForm.displayOrder ? { displayOrder: Number(categoryForm.displayOrder) } : {}) };
    try {
      if (editingCategory) await updateCategory(editingCategory.id, payload);
      else await createCategory(payload);
      setNotice(editingCategory ? "Category updated." : "Category created.");
      setCategoryModal(false); await load();
    } catch (e) { setError(errorText(e)); }
  }

  function openItem(item?: MenuItem) {
    setEditingItem(item ?? null);
    setItemForm(item ? { name: item.name, description: item.description ?? "", price: String(item.price), categoryId: item.categoryId || item.category?.id || "", drinkType: item.drinkType ?? "", displayOrder: String(item.displayOrder ?? "") } : { ...emptyItem, categoryId: categories.find(category => category.isActive)?.id ?? "" });
    setItemModal(true);
  }
  async function saveItem(event: React.FormEvent) {
    event.preventDefault(); setError("");
    const payload = {
      name: itemForm.name.trim(), description: itemForm.description.trim() || undefined,
      price: Number(itemForm.price), categoryId: itemForm.categoryId,
      drinkType: itemForm.drinkType || null,
      ...(itemForm.displayOrder ? { displayOrder: Number(itemForm.displayOrder) } : {}),
    };
    if (!Number.isFinite(payload.price) || payload.price < 0) { setError("Enter a valid non-negative price."); return; }
    try {
      if (editingItem) await updateMenuItem(editingItem.id, payload);
      else await createMenuItem(payload);
      setNotice(editingItem ? "Menu item updated." : "Menu item created.");
      setItemModal(false); await load();
    } catch (e) { setError(errorText(e)); }
  }

  async function openSides(item: MenuItem) {
    try {
      const response = await getMealSides(item.id) as AnyRecord;
      const rows = response.sideNames ?? response.sides?.map((side: AnyRecord) => side.sideName) ?? response.map?.((side: AnyRecord) => side.sideName) ?? [];
      setSideNames([rows[0] ?? "", rows[1] ?? ""]); setSidesModal(item);
    } catch (e) { setError(errorText(e)); }
  }
  async function saveSides(event: React.FormEvent) {
    event.preventDefault();
    if (!sidesModal) return;
    const values = sideNames.map(value => value.trim());
    if (values.some(value => value.length < 2)) { setError("Enter both fixed side names."); return; }
    try { await setMealSides(sidesModal.id, values); setNotice("The two fixed meal sides have been saved."); setSidesModal(null); }
    catch (e) { setError(errorText(e)); }
  }

  async function toggleStatus(kind: "item" | "category", id: string, active: boolean, name: string) {
    if (!confirm(`${active ? "Deactivate" : "Reactivate"} ${name}?`)) return;
    setBusyId(id); setError("");
    try {
      if (kind === "item") await setMenuItemActive(id, !active);
      else await setCategoryActive(id, !active);
      setNotice(`${name} ${active ? "deactivated" : "reactivated"}.`); await load();
    } catch (e) { setError(errorText(e)); }
    finally { setBusyId(""); }
  }

  async function showHistory() {
    try {
      const selectedBranches = branch === "ALL"
        ? branches.filter(row => row.isActive)
        : branches.filter(row => row.id === branch);
      const rows: AnyRecord[][] = await Promise.all(selectedBranches.map(async selectedBranch => {
        const response = await getAvailabilityHistory(selectedBranch.id) as AnyRecord;
        const records = Array.isArray(response) ? response : response.data ?? response.history ?? response.records ?? [];
        return (Array.isArray(records) ? records : []).map((record: AnyRecord) => ({ ...record, branch: selectedBranch }));
      }));
      setHistoryRows(rows.flat().sort((a, b) => new Date(String(b.changedAt)).getTime() - new Date(String(a.changedAt)).getTime()));
      setHistoryOpen(true);
    } catch (e) { setError(errorText(e)); }
  }
  async function saveAvailability(event: React.FormEvent) {
    event.preventDefault();
    if (!availabilityModal?.branchId) { setError("The selected availability row has no branch ID. Refresh and try again."); return; }
    setBusyId(availabilityModal.itemId); setError("");
    try {
      await updateBranchAvailability(availabilityModal.branchId, availabilityModal.itemId, !availabilityModal.current, availabilityReason.trim() || undefined);
      setNotice(`Availability updated for ${availabilityModal.name}.`);
      setAvailabilityModal(null); setAvailabilityReason(""); await loadAvailability(branch);
    } catch (e) { setError(errorText(e)); }
    finally { setBusyId(""); }
  }

  return <>
    <PageTitle title="Menu Management" subtitle="Manage the central menu, fixed meal sides and branch-level menu availability." action={<Button variant="light" onClick={() => void load()}><RefreshCw size={15}/>Refresh</Button>}/>
    <Notice message={notice} onDismiss={() => setNotice("")}/><Notice message={error} error onDismiss={() => setError("")}/>
    <LoadingError loading={loading} error="" retry={() => void load()}/>
    {!loading && <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><Card><p className="text-sm text-gray-500">Menu items</p><p className="mt-1 text-2xl font-bold">{items.length}</p><p className="text-xs text-gray-500">{activeItems} active · {items.length - activeItems} inactive</p></Card><Card><p className="text-sm text-gray-500">Categories</p><p className="mt-1 text-2xl font-bold">{categories.length}</p><p className="text-xs text-gray-500">{activeCategories} active · {categories.length - activeCategories} inactive</p></Card></div>
      <div className="mb-4 flex flex-wrap gap-2">
        {([["ITEMS", "Menu items"], ["CATEGORIES", "Categories"], ["AVAILABILITY", "Branch availability"]] as const).map(([value, label]) => <Button key={value} variant={tab === value ? "dark" : "light"} onClick={() => { setTab(value); setSearch(""); setStatusFilter("ALL"); }}>{label}</Button>)}
      </div>

      {tab !== "AVAILABILITY" && <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <SearchInput value={search} onChange={setSearch} placeholder={tab === "ITEMS" ? "Search menu items" : "Search categories"}/>
        {tab === "ITEMS" && <Select value={categoryFilter} onChange={setCategoryFilter}><option value="ALL">All categories</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</Select>}
        <Select value={statusFilter} onChange={setStatusFilter}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select>
        <span className="ml-auto text-xs text-gray-500">{tab === "ITEMS" ? `${filteredItems.length} of ${items.length} items` : `${filteredCategories.length} of ${categories.length} categories`}</span>
      </div>}

      {tab === "ITEMS" && <Card>
        <div className="mb-4 flex justify-end"><Button onClick={() => openItem()}><Plus size={15}/>Add menu item</Button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b text-xs uppercase text-gray-500"><tr>{["Item", "Category", "Price", "Status", "Actions"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{filteredItems.map(item => {
            const categoryName = item.category?.name ?? categories.find(category => category.id === item.categoryId)?.name ?? "—";
            const isMeal = /steak|meal/i.test(categoryName);
            return <tr key={item.id}>
              <td className="px-3 py-3"><p className="font-medium text-gray-800">{item.name}</p><p className="text-xs text-gray-400">{item.description ?? "—"}</p></td>
              <td className="px-3 py-3">{categoryName}</td><td className="px-3 py-3">{money(item.price)}</td>
              <td className="px-3 py-3"><Status value={item.isActive ? "ACTIVE" : "INACTIVE"}/></td>
              <td className="px-3 py-3"><div className="flex items-center gap-2">
                <ActionIcon label="Edit menu item" disabled={!item.isActive} onClick={() => openItem(item)}><Pencil size={16}/></ActionIcon>
                <ActionIcon label={item.isActive ? "Deactivate menu item" : "Reactivate menu item"} danger={item.isActive} disabled={busyId === item.id} onClick={() => void toggleStatus("item", item.id, item.isActive, item.name)}>{item.isActive ? <Ban size={16}/> : <CheckCircle2 size={16}/>}</ActionIcon>
                {isMeal && <Button variant="light" disabled={!item.isActive} onClick={() => void openSides(item)}>Fixed sides</Button>}
              </div></td>
            </tr>;
          })}{!filteredItems.length && <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">No menu items match these filters.</td></tr>}</tbody>
        </table></div>
      </Card>}

      {tab === "CATEGORIES" && <Card>
        <div className="mb-4 flex justify-end"><Button onClick={() => openCategory()}><Plus size={15}/>Add category</Button></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-3 py-3">Category</th><th className="px-3 py-3">Menu items</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr></thead>
          <tbody className="divide-y">{filteredCategories.map(category => <tr key={category.id}>
            <td className="px-3 py-3"><p className="font-medium text-gray-800">{category.name}</p><p className="text-xs text-gray-500">{category.description ?? "—"}</p></td>
            <td className="px-3 py-3">{items.filter(item => item.categoryId === category.id).length}</td><td className="px-3 py-3"><Status value={category.isActive ? "ACTIVE" : "INACTIVE"}/></td>
            <td className="px-3 py-3"><div className="flex gap-2"><ActionIcon label="Edit category" disabled={!category.isActive} onClick={() => openCategory(category)}><Pencil size={16}/></ActionIcon><ActionIcon label={category.isActive ? "Deactivate category" : "Reactivate category"} danger={category.isActive} disabled={busyId === category.id} onClick={() => void toggleStatus("category", category.id, category.isActive, category.name)}>{category.isActive ? <Ban size={16}/> : <CheckCircle2 size={16}/>}</ActionIcon></div></td>
          </tr>)}{!filteredCategories.length && <tr><td colSpan={4} className="py-8 text-center text-sm text-gray-500">No categories match these filters.</td></tr>}</tbody>
        </table></div>
      </Card>}

      {tab === "AVAILABILITY" && <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold text-gray-900">Menu availability by branch</h2><p className="mt-1 text-xs text-gray-500">Controls whether a menu item can be ordered at the selected branch.</p></div><div className="flex flex-wrap items-end gap-2"><div><label className="mb-1 block text-xs text-gray-500">Branch</label><Select value={branch} onChange={setBranch}><option value="ALL">All branches</option>{branches.filter(row => row.isActive).map(row => <option key={row.id} value={row.id}>{row.branchCode} · {row.name}</option>)}</Select></div><div><label className="mb-1 block text-xs text-gray-500">Availability</label><Select value={availabilityFilter} onChange={setAvailabilityFilter}><option value="ALL">All statuses</option><option value="AVAILABLE">Available</option><option value="UNAVAILABLE">Unavailable</option></Select></div><Button variant="light" onClick={() => void showHistory()}><History size={15}/>View history</Button></div></div>
        <div className="mb-3"><SearchInput value={availabilitySearch} onChange={setAvailabilitySearch} placeholder="Search menu items"/></div>
        <div className={`grid grid-cols-1 gap-3 border-b border-gray-200 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 ${branch === "ALL" ? "sm:grid-cols-[minmax(0,1fr)_150px_130px_110px]" : "sm:grid-cols-[minmax(0,1fr)_130px_110px]"}`}><span>Menu item</span>{branch === "ALL" && <span>Branch</span>}<span>Availability</span><span>Control</span></div>
        <div className="divide-y">{availability.filter(row => { const item = row.menuItem as MenuItem | undefined; return item && `${item.name} ${item.category?.name ?? ""} ${row.branch?.branchCode ?? ""} ${row.branch?.name ?? ""}`.toLowerCase().includes(availabilitySearch.toLowerCase()) && (availabilityFilter === "ALL" || (availabilityFilter === "AVAILABLE" ? row.isAvailable : !row.isAvailable)); }).map(row => {
          const item = row.menuItem as MenuItem | undefined;
          if (!item) return null;
          const isAvailable = Boolean(row.isAvailable);
          const stockBlocked = Boolean(row.isBlockedByStock);
          return <div key={`${row.branch?.id ?? branch}-${item.id}`} className={`grid grid-cols-1 items-center gap-3 py-3 ${branch === "ALL" ? "sm:grid-cols-[minmax(0,1fr)_150px_130px_110px]" : "sm:grid-cols-[minmax(0,1fr)_130px_110px]"}`}>
            <div><p className="text-sm font-medium text-gray-800">{item.name}</p><p className="text-xs text-gray-500">{item.category?.name ?? "Menu item"} · {money(item.price)}</p>
              {stockBlocked && <p className="mt-1 text-xs font-semibold text-red-700">Blocked by stock</p>}
            </div>
            {branch === "ALL" && <span className="text-sm text-gray-600">{row.branch?.branchCode} · {row.branch?.name}</span>}
            <span className={`text-sm font-semibold ${isAvailable ? "text-green-700" : "text-gray-500"}`}>{isAvailable ? "Available" : "Unavailable"}</span>
            <button type="button" role="switch" aria-checked={isAvailable} aria-label={`${isAvailable ? "Turn off" : "Turn on"} ${item.name}`} disabled={busyId === item.id || !item.isActive} onClick={() => setAvailabilityModal({ branchId: String(row.branch?.id ?? ""), branchName: String(row.branch?.name ?? "selected branch"), itemId: item.id, current: isAvailable, name: item.name })} className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors disabled:opacity-50 ${isAvailable ? "border-green-600 bg-green-600" : "border-red-200 bg-red-100"}`}><span className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${isAvailable ? "translate-x-6" : "translate-x-1"}`}/></button>
          </div>;
        })}{!availability.length && <p className="py-6 text-center text-sm text-gray-500">No availability records found for this branch.</p>}</div>
        <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">HQ availability and branch stock are separate. Turning an item off prevents new orders at this branch; it does not erase or adjust the branch's remaining inventory. A stock-based block is shown separately.</p>
      </Card>}
    </>}

    {categoryModal && <Modal title={editingCategory ? "Edit category" : "Add category"} close={() => setCategoryModal(false)}>
      <form onSubmit={event => void saveCategory(event)} className="space-y-4">
        <Field label="Category name"><input required minLength={2} maxLength={100} className={inputClass} value={categoryForm.name} onChange={event => setCategoryForm({ ...categoryForm, name: event.target.value })}/></Field>
        <Field label="Description"><textarea maxLength={500} rows={3} className={inputClass} value={categoryForm.description} onChange={event => setCategoryForm({ ...categoryForm, description: event.target.value })}/></Field>
        <Field label="Display order (optional)"><input type="number" min="0" className={inputClass} value={categoryForm.displayOrder} onChange={event => setCategoryForm({ ...categoryForm, displayOrder: event.target.value })}/></Field>
        <div className="flex justify-end gap-2"><Button variant="light" onClick={() => setCategoryModal(false)}>Cancel</Button><Button type="submit">{editingCategory ? "Save changes" : "Create category"}</Button></div>
      </form>
    </Modal>}

    {itemModal && <Modal title={editingItem ? "Edit menu item" : "Add menu item"} close={() => setItemModal(false)}>
      <form onSubmit={event => void saveItem(event)} className="space-y-4">
        <Field label="Menu item name"><input required minLength={2} maxLength={100} className={inputClass} value={itemForm.name} onChange={event => setItemForm({ ...itemForm, name: event.target.value })}/></Field>
        <Field label="Description"><textarea rows={2} maxLength={500} className={inputClass} value={itemForm.description} onChange={event => setItemForm({ ...itemForm, description: event.target.value })}/></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Price"><input required type="number" min="0" step="0.01" className={inputClass} value={itemForm.price} onChange={event => setItemForm({ ...itemForm, price: event.target.value })}/></Field>
          <Field label="Category"><select required className={inputClass} value={itemForm.categoryId} onChange={event => setItemForm({ ...itemForm, categoryId: event.target.value })}><option value="">Select category</option>{categories.filter(category => category.isActive || category.id === itemForm.categoryId).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
        </div>
        <Field label="Drink type (only for drinks)"><select className={inputClass} value={itemForm.drinkType} onChange={event => setItemForm({ ...itemForm, drinkType: event.target.value })}><option value="">Not a drink</option><option value="SOFT_DRINK">Soft drink</option><option value="BEER">Beer</option><option value="WINE">Wine</option></select></Field>
        <Field label="Display order (optional)"><input type="number" min="0" className={inputClass} value={itemForm.displayOrder} onChange={event => setItemForm({ ...itemForm, displayOrder: event.target.value })}/></Field>
        <div className="flex justify-end gap-2"><Button variant="light" onClick={() => setItemModal(false)}>Cancel</Button><Button type="submit">{editingItem ? "Save changes" : "Create menu item"}</Button></div>
      </form>
    </Modal>}

    {sidesModal && <Modal title={`Fixed meal sides · ${sidesModal.name}`} close={() => setSidesModal(null)}>
      <form onSubmit={event => void saveSides(event)} className="space-y-4">
        <p className="text-sm text-gray-600">Configure the two fixed sides served with this steak meal. This does not apply to appetizers, drinks or desserts.</p>
        {sideNames.map((value, index) => <Field key={index} label={`Side ${index + 1}`}><input required minLength={2} maxLength={100} className={inputClass} value={value} onChange={event => setSideNames(current => current.map((name, i) => i === index ? event.target.value : name))}/></Field>)}
        <div className="flex justify-end gap-2"><Button variant="light" onClick={() => setSidesModal(null)}>Cancel</Button><Button type="submit">Save fixed sides</Button></div>
      </form>
    </Modal>}

    {availabilityModal && <Modal title={`${availabilityModal.current ? "Turn off" : "Turn on"} menu item`} close={() => setAvailabilityModal(null)}>
      <form onSubmit={event => void saveAvailability(event)} className="space-y-4">
        <p className="text-sm text-gray-700">Change ordering availability for <strong>{availabilityModal.name}</strong> at <strong>{availabilityModal.branchName}</strong>?</p>
        <Field label="Reason (optional)"><textarea rows={3} maxLength={500} className={inputClass} value={availabilityReason} onChange={event => setAvailabilityReason(event.target.value)} placeholder="e.g. Temporarily unavailable at this location"/></Field>
        <div className="flex justify-end gap-2"><Button variant="light" onClick={() => setAvailabilityModal(null)}>Cancel</Button><Button type="submit" disabled={Boolean(busyId)}>{availabilityModal.current ? "Turn off availability" : "Turn on availability"}</Button></div>
      </form>
    </Modal>}

    {historyOpen && <Modal title="Menu availability history" close={() => setHistoryOpen(false)}>
      <div className="mb-3 text-xs text-gray-500">{branch === "ALL" ? "Changes recorded across all active branches, newest first." : "Changes recorded for the selected branch, newest first."}</div>
      <div className="space-y-3">{historyRows.map((row, index) => <div key={row.id ?? index} className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold text-gray-800">{row.menuItem?.name ?? "Menu item"}</p><p className="mt-0.5 text-xs font-medium text-gray-500">{row.branch?.branchCode} · {row.branch?.name}</p></div><span className="text-xs text-gray-500">{date(row.changedAt)}</span></div>
        <p className="mt-2 text-xs text-gray-600">{row.previousIsAvailable === null ? "Not previously set" : row.previousIsAvailable ? "Available" : "Unavailable"} → <strong>{row.newIsAvailable ? "Available" : "Unavailable"}</strong></p>
        {row.reason && <p className="mt-1 text-xs text-gray-500">Reason: {row.reason}</p>}
        {row.changedBy && <p className="mt-1 text-xs text-gray-500">Changed by: {row.changedBy.firstName} {row.changedBy.lastName}</p>}
      </div>)}{!historyRows.length && <p className="py-6 text-center text-sm text-gray-500">No availability changes have been recorded.</p>}</div>
    </Modal>}
  </>;
}
