import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, CheckCircle2, Minus, Plus, Search, ShoppingBag,
  Utensils, X,
} from "lucide-react";
import { useAuth } from "../../../hooks/AuthContext";
import {
  createServerOrder, getServerMenuItems, getServerTables,
  type ServerMenuItem, type ServerTable,
} from "../server.service";

// Keep the POS focused on the menu, table selection, and order submission.
export default function ServerPOS() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<ServerMenuItem[]>([]);
  const [tables, setTables] = useState<ServerTable[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("All items");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ orderNumber?: string; totalAmount?: number | string } | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (!user?.branchId) throw new Error("Your account is not assigned to a branch.");
      const [menuItems, tableResult] = await Promise.all([
        getServerMenuItems(),
        getServerTables(user.branchId),
      ]);
      setMenu(menuItems);
      setTables(tableResult.tables);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? "Unable to load the POS.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [user?.branchId]);

  const categories = ["All items", "Appetizers", "Steak Meals", "Desserts", "Soft Drinks", "Beer", "Wine"];
  const categoryMatches = (item: ServerMenuItem, selected: string) => {
    if (selected === "All items") return true;
    const categoryName = (item.category?.name ?? "").toLowerCase().replace(/[^a-z]/g, "");
    const itemName = item.name.toLowerCase();
    const aliases: Record<string, string[]> = {
      Appetizers: ["appetizer", "appetizers", "starter", "starters"],
      "Steak Meals": ["steakmeal", "steakmeals", "meal", "meals", "main", "mains"],
      Desserts: ["dessert", "desserts"],
      "Soft Drinks": ["softdrink", "softdrinks", "nonalcoholic", "soda"],
      Beer: ["beer", "beers"],
      Wine: ["wine", "wines"],
    };
    if (aliases[selected]?.some((alias) => categoryName.includes(alias))) return true;
    if (categoryName === "drinks" || categoryName === "beverages") {
      if (selected === "Beer") return /beer|guinness|lager|ale|stout/.test(itemName);
      if (selected === "Wine") return /wine|merlot|cabernet|pinot|chardonnay/.test(itemName);
      if (selected === "Soft Drinks") return !/beer|guinness|lager|ale|stout|wine|merlot|cabernet|pinot|chardonnay/.test(itemName);
    }
    return false;
  };
  const visibleMenu = useMemo(() => menu.filter((item) =>
    categoryMatches(item, category) &&
    `${item.name} ${item.description ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  ), [menu, category, search]);
  const selectedItems = menu.filter((item) => (quantities[item.id] ?? 0) > 0);
  const itemCount = selectedItems.reduce((total, item) => total + quantities[item.id], 0);
  const availableTables = tables.filter((table) => table.status === "AVAILABLE");

  function changeQuantity(itemId: string, change: number) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min(50, (current[itemId] ?? 0) + change));
      return { ...current, [itemId]: next };
    });
  }

  async function submitOrder() {
    const items = selectedItems.map((item) => ({ menuItemId: item.id, quantity: quantities[item.id] }));
    if (!selectedTable) { setError("Select an available table before submitting the order."); return; }
    if (!items.length) { setError("Add at least one menu item to the order."); return; }

    setSaving(true);
    setError("");
    try {
      const created: any = await createServerOrder({ tableId: selectedTable, items });
      const order = created?.order ?? created;
      setSuccess({ orderNumber: order?.orderNumber, totalAmount: order?.totalAmount });
      setQuantities({});
      setSelectedTable("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to submit the order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <button onClick={() => navigate("/pos")} className="mb-2 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
            <ArrowLeft size={16} /> Back to dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
          <p className="mt-1 text-sm text-gray-500">Build an order for {user?.branchName ?? "your assigned branch"}.</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
          <span className="font-medium text-gray-900">{itemCount}</span> {itemCount === 1 ? "item" : "items"} selected
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 text-green-700" size={20} />
            <div>
              <p className="font-semibold text-green-900">Order submitted successfully</p>
              <p className="mt-1 text-sm text-green-800">
                {success.orderNumber ? `Order ${success.orderNumber}` : "Your order"}
                {success.totalAmount !== undefined ? ` · Total $${Number(success.totalAmount).toFixed(2)}` : ""}
              </p>
              <p className="mt-1 text-xs text-green-800">The backend has applied the order pricing, promotions, tax and inventory rules.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSuccess(null)} className="rounded-lg border border-green-300 px-3 py-2 text-sm text-green-900">New order</button>
            <button onClick={() => navigate("/pos/orders")} className="rounded-lg bg-[#1F2937] px-3 py-2 text-sm font-medium text-white">View orders</button>
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row">
            <label className="relative flex-1">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu items…" className="w-full rounded-lg border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gray-400" />
            </label>
            <label className="sm:w-56">
              <span className="sr-only">Menu category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">
                {categories.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((name) => (
              <button key={name} onClick={() => setCategory(name)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${category === name ? "bg-[#1F2937] text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"}`}>
                {name}
              </button>
            ))}
          </div>

          {loading ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">Loading menu…</div> : visibleMenu.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
              <Utensils className="mx-auto text-gray-400" size={28} />
              <p className="mt-3 font-medium text-gray-800">No menu items found</p>
              <p className="mt-1 text-sm text-gray-500">Try another category or search term.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {visibleMenu.map((item) => {
                const quantity = quantities[item.id] ?? 0;
                return (
                  <article key={item.id} className={`flex min-h-44 flex-col rounded-xl border bg-white p-4 transition ${quantity ? "border-[#1F2937] ring-1 ring-[#1F2937]/10" : "border-gray-200"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600"><Utensils size={19} /></div>
                      {quantity > 0 && <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">Added · {quantity}</span>}
                    </div>
                    <div className="mt-4 flex-1">
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      {item.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{item.description}</p>}
                      <p className="mt-2 text-sm font-semibold text-[#15803d]">${Number(item.price).toFixed(2)}</p>
                    </div>
                    {quantity === 0 ? (
                      <button onClick={() => changeQuantity(item.id, 1)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-200"><Plus size={16} /> Add to order</button>
                    ) : (
                      <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-100 p-1">
                        <button aria-label={`Remove one ${item.name}`} onClick={() => changeQuantity(item.id, -1)} className="rounded-md p-2 text-gray-700 hover:bg-white"><Minus size={16} /></button>
                        <span className="text-sm font-semibold text-gray-900">{quantity}</span>
                        <button aria-label={`Add one ${item.name}`} onClick={() => changeQuantity(item.id, 1)} className="rounded-md p-2 text-gray-700 hover:bg-white"><Plus size={16} /></button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="rounded-xl border border-gray-200 bg-white xl:sticky xl:top-6">
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg font-semibold text-gray-900">Current order</h2><p className="mt-1 text-xs text-gray-500">Review selections before submitting</p></div>
              <span className="rounded-lg bg-gray-100 p-2 text-gray-600"><ShoppingBag size={19} /></span>
            </div>
            <label className="mt-4 block text-sm font-medium text-gray-700">Dining table
              <select value={selectedTable} onChange={(event) => setSelectedTable(event.target.value)} className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm">
                <option value="">Select an available table</option>
                {availableTables.map((table) => <option key={table.id} value={table.id}>Table {table.tableNumber}{table.capacity ? ` · ${table.capacity} seats` : ""}</option>)}
              </select>
            </label>
            {availableTables.length === 0 && !loading && <p className="mt-2 text-xs text-amber-700">There are currently no available tables.</p>}
          </div>

          <div className="max-h-[420px] space-y-3 overflow-y-auto p-5">
            {selectedItems.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingBag className="mx-auto text-gray-300" size={30} />
                <p className="mt-3 text-sm font-medium text-gray-700">Your order is empty</p>
                <p className="mt-1 text-xs text-gray-500">Add menu items to get started.</p>
              </div>
            ) : selectedItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-0">
                <div className="min-w-0 flex-1"><p className="text-sm font-medium text-gray-900">{item.name}</p><p className="mt-1 text-xs text-gray-500">Qty {quantities[item.id]}</p></div>
                <button aria-label={`Remove ${item.name}`} onClick={() => setQuantities((current) => ({ ...current, [item.id]: 0 }))} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"><X size={15} /></button>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-5">
            <div className="rounded-lg bg-gray-50 p-3 text-xs leading-5 text-gray-600">
              Final item pricing, promotions, discounts, tax, total and inventory deductions are calculated by the backend when you submit. Meal recipes and included sides are applied automatically; no side substitutions are selected here.
            </div>
            <button onClick={() => void submitOrder()} disabled={saving || loading || itemCount === 0 || !selectedTable} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F2937] px-4 py-3 text-sm font-semibold text-white hover:bg-[#111827] disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? "Submitting…" : "Submit order"}
            </button>
            <button onClick={() => { setQuantities({}); setSelectedTable(""); setError(""); }} disabled={saving || itemCount === 0} className="mt-2 w-full rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40">Clear order</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
