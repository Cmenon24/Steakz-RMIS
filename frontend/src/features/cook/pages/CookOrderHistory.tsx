import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, RefreshCw, Search, X } from "lucide-react";
import { getCookOrder, getCookOrderHistory, type CookOrder } from "../cook.service";

type Range = "7" | "30" | "all";

export default function CookOrderHistory() {
  const [orders, setOrders] = useState<CookOrder[]>([]);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<Range>("7");
  const [selected, setSelected] = useState<CookOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await getCookOrderHistory());
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load completed kitchen orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const cutoff = range === "all" ? null : Date.now() - Number(range) * 24 * 60 * 60 * 1000;
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const date = new Date(order.completedAt ?? order.createdAt).getTime();
      const inRange = cutoff === null || date >= cutoff;
      const matches = !query || order.orderNumber.toLowerCase().includes(query)
        || String(order.table?.tableNumber ?? "").toLowerCase().includes(query);
      return inRange && matches;
    });
  }, [orders, range, search]);

  async function openOrder(order: CookOrder) {
    setError("");
    try { setSelected(await getCookOrder(order.id)); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to load order details."); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen History</h1>
          <p className="mt-1 text-sm text-gray-500">Review completed orders prepared by your assigned branch.</p>
        </div>
        <button onClick={() => void load()} disabled={loading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh History
        </button>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-wrap gap-3">
            <label className="sr-only" htmlFor="cook-history-range">Date range</label>
            <select id="cook-history-range" value={range} onChange={(e) => setRange(e.target.value as Range)}
              className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700">
              <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All history</option>
            </select>
            <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-gray-300 px-3">
              <Search size={16} className="text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order number or table…"
                className="min-h-10 w-full border-0 bg-transparent text-sm outline-none focus:ring-0" />
            </div>
          </div>
          <p className="text-xs text-gray-500">{visible.length} completed {visible.length === 1 ? "order" : "orders"}</p>
        </div>

        {loading ? <p className="p-8 text-center text-sm text-gray-500">Loading kitchen history…</p>
          : visible.length === 0 ? <div className="p-10 text-center"><Clock3 className="mx-auto text-gray-300" size={30} /><p className="mt-3 font-medium text-gray-800">No completed orders found</p><p className="mt-1 text-sm text-gray-500">Completed orders will appear here after the Server marks them completed.</p></div>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr>
                <th className="px-5 py-3 font-medium">Order</th><th className="px-5 py-3 font-medium">Table</th>
                <th className="px-5 py-3 font-medium">Items</th><th className="px-5 py-3 font-medium">Completed</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">{visible.map((order) => (
                <tr key={order.id}>
                  <td className="px-5 py-4 font-semibold text-gray-900">{order.orderNumber}</td>
                  <td className="px-5 py-4 text-gray-700">{order.table?.tableNumber ?? "—"}</td>
                  <td className="px-5 py-4 text-gray-700">{order.items?.reduce((total, item) => total + item.quantity, 0) ?? 0} items</td>
                  <td className="px-5 py-4 text-gray-500">{order.completedAt ? new Date(order.completedAt).toLocaleString() : new Date(order.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4 text-right"><button onClick={() => void openOrder(order)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">View</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
      </section>

      {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cook-history-order-title">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
            <div><h2 id="cook-history-order-title" className="text-xl font-bold text-gray-900">Completed order · {selected.orderNumber}</h2>
              <p className="mt-1 text-sm text-gray-500">Table {selected.table?.tableNumber ?? "—"} · {selected.completedAt ? new Date(selected.completedAt).toLocaleString() : "Completion time unavailable"}</p></div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close order history details" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={22} /></button>
          </div>
          <div className="space-y-4 p-6">
            <p className="text-sm text-gray-500">Read-only record. This order has been completed by the Server.</p>
            {selected.items?.map((item) => <section key={item.id} className="rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between gap-3"><div><h3 className="font-semibold text-gray-900">{item.menuItemNameSnapshot}</h3><p className="mt-1 text-xs text-gray-500">Quantity: {item.quantity}</p></div><span className="text-xs text-gray-500">Recipe version recorded on order</span></div>
              {item.sides?.length ? <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">Configured sides: {item.sides.map((side) => side.sideNameSnapshot).join(", ")}</p> : null}
            </section>)}
            {selected.statusHistory?.length ? <section><h3 className="font-semibold text-gray-900">Order status history</h3><div className="mt-2 space-y-2">{selected.statusHistory.map((entry, index) =>
              <div key={`${entry.newStatus}-${entry.changedAt}-${index}`} className="flex justify-between gap-3 text-sm"><span className="text-gray-700">{entry.previousStatus ?? "Submitted"} → {entry.newStatus}</span><span className="text-xs text-gray-500">{new Date(entry.changedAt).toLocaleString()}</span></div>
            )}</div></section> : null}
          </div>
          <div className="flex justify-end border-t border-gray-100 px-6 py-4"><button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button></div>
        </div>
      </div>}
    </div>
  );
}
