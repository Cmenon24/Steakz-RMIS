import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock3, RefreshCw, Utensils } from "lucide-react";
import { getKitchenQueue, type CookOrder } from "../cook.service";

const statusStyles: Record<string, string> = {
  NEW: "bg-red-100 text-red-800",
  PREPARING: "bg-amber-100 text-amber-800",
  READY: "bg-blue-100 text-blue-800",
};

function StatCard({ label, count, detail, icon: Icon }: {
  label: string; count: number; detail: string; icon: typeof ClipboardList;
}) {
  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="rounded-lg bg-gray-100 p-2.5 text-gray-600"><Icon size={19} /></span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-gray-900">{count}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </article>
  );
}

export default function CookDashboard() {
  const [orders, setOrders] = useState<CookOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      setOrders(await getKitchenQueue());
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load the kitchen queue.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(false); }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const count = (status: string) => orders.filter((order) => order.status === status).length;
  const recent = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor incoming orders and preparation activity for your assigned branch.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh
          </button>
          <Link to="/kitchen/queue"
            style={{ color: "#FFFFFF", backgroundColor: "#1F2937" }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold shadow-sm hover:bg-[#111827]">
            <ClipboardList size={17} />Open Kitchen Queue
          </Link>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="New Orders" count={count("NEW")} detail="Awaiting preparation" icon={ClipboardList} />
        <StatCard label="Preparing" count={count("PREPARING")} detail="Currently in the kitchen" icon={Utensils} />
        <StatCard label="Ready" count={count("READY")} detail="Awaiting Server collection" icon={Clock3} />
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">Order Status</h2>
            <p className="mt-1 text-xs text-gray-500">Current kitchen orders for your branch. Automatically refreshed every 30 seconds.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Order Status</span>
        </div>
        {loading ? <p className="p-8 text-center text-sm text-gray-500">Loading kitchen activity…</p>
          : recent.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">There are no active kitchen orders.</p>
          : <div className="divide-y divide-gray-100">
            {recent.map((order) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                  <p className="mt-1 text-xs text-gray-500">Table {order.table?.tableNumber ?? "—"} · {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[order.status] ?? "bg-gray-100 text-gray-700"}`}>{order.status}</span>
              </div>
            ))}
          </div>}
      </section>
    </div>
  );
}
