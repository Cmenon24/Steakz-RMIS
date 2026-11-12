import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock3, CreditCard, Plus, RefreshCw, ShoppingBag, Utensils } from "lucide-react";
import { useAuth } from "../../../hooks/AuthContext";
import { getServerOrder, getServerOrders, getServerTables, type ServerOrder, type ServerTable } from "../server.service";

const statusClasses: Record<string, string> = {
  NEW: "bg-red-100 text-red-800", PREPARING: "bg-amber-100 text-amber-800",
  READY: "bg-blue-100 text-blue-800", COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
};

function isPaid(order: ServerOrder) {
  return order.paymentStatus?.toUpperCase() === "PAID" || order.payments?.some((payment) => payment.status === "SUCCESSFUL") === true;
}

export default function ServerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [tables, setTables] = useState<ServerTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      if (!user?.branchId) throw new Error("Your account is not assigned to a branch.");
      const [orderResult, tableResult] = await Promise.all([getServerOrders(), getServerTables(user.branchId)]);
      // The list response may omit payment records, so verify each completed order before counting payment due.
      const completed = orderResult.filter((order) => order.status === "COMPLETED");
      const completedDetails = await Promise.all(completed.map(async (order) => {
        if (order.paymentStatus || order.payments) return order;
        try { return await getServerOrder(order.id); } catch { return order; }
      }));
      const detailsById = new Map(completedDetails.map((order) => [order.id, order]));
      setOrders(orderResult.map((order) => detailsById.get(order.id) ?? order));
      setTables(tableResult.tables);
    } catch (err: any) {
      setError(err.response?.data?.message ?? err.message ?? "Unable to load dashboard information.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [user?.branchId]);

  const active = orders.filter((order) => ["NEW", "PREPARING", "READY"].includes(order.status));
  const ready = orders.filter((order) => order.status === "READY");
  const due = orders.filter((order) => order.status === "COMPLETED" && !isPaid(order));
  const availableTables = tables.filter((table) => table.status === "AVAILABLE");
  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6), [orders]);

  const metrics = [
    { label: "Active Orders", value: active.length, icon: ShoppingBag, detail: "New, preparing or ready" },
    { label: "Ready to Serve", value: ready.length, icon: CheckCircle2, detail: "Awaiting server completion" },
    { label: "Payments Due", value: due.length, icon: CreditCard, detail: "Completed orders awaiting payment" },
    { label: "Available Tables", value: availableTables.length, icon: Utensils, detail: "Available for new orders" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div><p className="text-sm font-medium text-gray-500">{user?.branchName ?? "Your assigned branch"}</p><h1 className="mt-1 text-2xl font-bold text-gray-900">Good service starts here.</h1><p className="mt-1 text-sm text-gray-500">Your daily service overview and order activity.</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} />Refresh</button>
          <Link to="/pos/new-order" aria-label="Create a new order" style={{ color: "#FFFFFF" }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1F2937] px-5 py-2.5 !text-white font-bold shadow-sm hover:bg-[#111827] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"><Plus size={17} aria-hidden="true" /><span className="!text-white">New Order</span></Link>
        </div>
      </div>

      {error && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {metrics.map((metric) => { const Icon = metric.icon; return <article key={metric.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm shadow-gray-100/60"><div className="flex items-center justify-between"><p className="text-sm font-medium text-gray-500">{metric.label}</p><span className="rounded-lg bg-gray-100 p-2.5 text-gray-600"><Icon size={19} /></span></div><p className="mt-4 text-3xl font-bold tracking-tight text-gray-900">{loading ? "—" : metric.value}</p><p className="mt-1 text-xs text-gray-500">{metric.detail}</p></article>; })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Ready to Serve</h2><p className="mt-1 text-xs text-gray-500">Orders the kitchen has marked READY</p></div><Link to="/pos/orders" className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-red-700">All orders <ArrowRight size={15} /></Link></div>
          {loading ? <p className="p-5 text-sm text-gray-500">Loading orders…</p> : ready.length === 0 ? <div className="p-8 text-center"><CheckCircle2 className="mx-auto text-gray-300" size={28} /><p className="mt-2 text-sm font-medium text-gray-700">No orders waiting to be served</p><p className="mt-1 text-xs text-gray-500">Ready orders will appear here.</p></div> : <div className="divide-y divide-gray-100">{ready.slice(0, 6).map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p><p className="mt-1 text-xs text-gray-500">Table {order.table?.tableNumber ?? "—"} · {order.items?.reduce((count, item) => count + item.quantity, 0) ?? 0} items</p></div><div className="flex items-center gap-3"><span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusClasses.READY}`}>READY</span><Link to="/pos/orders" className="text-xs font-semibold text-gray-700 underline underline-offset-4">Open</Link></div></div>)}</div>}
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Payment Follow-up</h2><p className="mt-1 text-xs text-gray-500">Completed orders awaiting payment</p></div><Link to="/pos/payments" className="text-sm font-medium text-gray-700 hover:text-red-700">Payments <ArrowRight className="ml-1 inline" size={15} /></Link></div>
          {loading ? <p className="p-5 text-sm text-gray-500">Loading payments…</p> : due.length === 0 ? <div className="p-8 text-center"><CreditCard className="mx-auto text-gray-300" size={28} /><p className="mt-2 text-sm font-medium text-gray-700">No payments due</p><p className="mt-1 text-xs text-gray-500">Completed unpaid orders will appear here.</p></div> : <div className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto">{due.map((order) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div className="min-w-0"><p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p><p className="mt-1 text-xs text-gray-500">Table {order.table?.tableNumber ?? "—"} · ${Number(order.totalAmount).toFixed(2)}</p></div><Link to="/pos/payments" style={{ color: "#FFFFFF", backgroundColor: "#1F2937" }} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold shadow-sm hover:bg-[#111827]">Take payment</Link></div>)}</div>}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h2 className="font-semibold text-gray-900">Recent Order Activity</h2><p className="mt-1 text-xs text-gray-500">Latest orders available to your server account</p></div><Clock3 size={18} className="text-gray-400" /></div>
        {loading ? <p className="p-5 text-sm text-gray-500">Loading activity…</p> : recentOrders.length === 0 ? <p className="p-6 text-sm text-gray-500">No order activity yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-5 py-3 font-medium">Order</th><th className="px-5 py-3 font-medium">Table</th><th className="px-5 py-3 font-medium">Items</th><th className="px-5 py-3 font-medium">Time</th><th className="px-5 py-3 font-medium">Status</th></tr></thead><tbody className="divide-y divide-gray-100">{recentOrders.map((order) => <tr key={order.id}><td className="px-5 py-3.5 font-semibold text-gray-900">{order.orderNumber}</td><td className="px-5 py-3.5">{order.table?.tableNumber ?? "—"}</td><td className="px-5 py-3.5">{order.items?.reduce((count, item) => count + item.quantity, 0) ?? 0}</td><td className="px-5 py-3.5 text-gray-500">{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td><td className="px-5 py-3.5"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${statusClasses[order.status] ?? "bg-gray-100 text-gray-700"}`}>{order.status}</span></td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
