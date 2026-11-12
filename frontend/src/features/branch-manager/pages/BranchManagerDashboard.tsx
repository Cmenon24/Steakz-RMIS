import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ClipboardCheck, ClipboardList, DollarSign,
  Package, RefreshCw,
} from "lucide-react";
import { useAuth } from "../../../hooks/AuthContext";
import {
  getBranchOrders, getSalesReport, getInventoryReport, getStocktakes,
  type BranchOrder, type Stocktake,
} from "../branch-manager.service";

type SalesSummary = {
  netSales: number;
  completedOrderCount: number;
};
type InventorySummary = {
  lowStockCount: number;
  outOfStockCount: number;
  unresolvedAlertCount: number;
};

function statusStyle(status: string) {
  const styles: Record<string, string> = {
    NEW: "bg-red-100 text-red-800",
    PREPARING: "bg-amber-100 text-amber-800",
    READY: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-200 text-gray-700",
  };
  return styles[status] ?? "bg-gray-100 text-gray-700";
}

export default function BranchManagerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<BranchOrder[]>([]);
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [activeStocktake, setActiveStocktake] = useState<Stocktake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load branch-scoped dashboard data from the existing reporting and operations APIs.
  async function load() {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      getBranchOrders(),
      getSalesReport({ period: "today" }),
      getInventoryReport(),
      user?.branchId ? getStocktakes(user.branchId) : Promise.resolve([] as Stocktake[]),
    ]);

    const failures: string[] = [];

    if (results[0].status === "fulfilled") {
      setOrders(results[0].value);
    } else failures.push("orders");

    if (results[1].status === "fulfilled") {
      // The report service returns an aggregate summary and a branches array.
      const report = results[1].value as any;
      setSales(report?.summary ?? report?.branches?.[0]?.summary ?? null);
    } else failures.push("sales report");

    if (results[2].status === "fulfilled") {
      const report = results[2].value as any;
      setInventory(report?.branches?.[0]?.summary ?? null);
    } else failures.push("inventory report");

    if (results[3].status === "fulfilled") {
      setActiveStocktake(results[3].value.find((item) => item.status === "IN_PROGRESS") ?? null);
    } else failures.push("stocktakes");

    if (failures.length) {
      setError(`Unable to load: ${failures.join(", ")}. Use Refresh to try again.`);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [user?.branchId]);

  const activeOrders = orders.filter((order) =>
    ["NEW", "PREPARING", "READY"].includes(order.status),
  );

  const cards = [
    { label: "Today's Net Sales", value: sales ? `$${Number(sales.netSales).toFixed(2)}` : "—", icon: DollarSign },
    { label: "Completed Today", value: sales?.completedOrderCount ?? "—", icon: ClipboardList },
    { label: "Active Orders", value: activeOrders.length, icon: Activity },
    { label: "Unresolved Inventory Alerts", value: inventory?.unresolvedAlertCount ?? "—", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Operations</h1>
          <p className="mt-1 text-sm text-gray-500">{user?.branchName ?? "Your assigned branch"} · Daily overview</p>
        </div>
        <button onClick={() => void load()} disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh
        </button>
      </div>

      {error && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{card.label}</p><Icon size={19} className="text-gray-400" />
              </div>
              <p className="mt-3 text-3xl font-bold text-gray-900">{loading ? "…" : card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <div><h2 className="font-semibold text-gray-900">Recent Orders</h2><p className="mt-1 text-xs text-gray-500">Latest activity for your branch</p></div>
            <Link to="/branch-manager/orders" className="text-sm font-medium text-red-700">View all</Link>
          </div>
          {loading ? <p className="p-6 text-sm text-gray-500">Loading orders…</p>
            : orders.length === 0 ? <p className="p-6 text-sm text-gray-500">No orders found.</p>
            : <div className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">Table {order.table?.tableNumber ?? "—"} · {new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${statusStyle(order.status)}`}>
                    {order.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 p-5">
            <div><h2 className="font-semibold text-gray-900">Inventory Overview</h2><p className="mt-1 text-xs text-gray-500">Current stock alerts and count activity</p></div>
            <Link to="/branch-manager/inventory" className="text-sm font-medium text-red-700">Manage inventory</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 p-5">
            <div className="rounded-lg bg-amber-50 p-4"><p className="text-xs text-amber-800">Low stock</p><p className="mt-1 text-2xl font-bold text-amber-900">{loading ? "…" : inventory?.lowStockCount ?? "—"}</p></div>
            <div className="rounded-lg bg-red-50 p-4"><p className="text-xs text-red-800">Out of stock</p><p className="mt-1 text-2xl font-bold text-red-900">{loading ? "…" : inventory?.outOfStockCount ?? "—"}</p></div>
          </div>
          <div className="mx-5 mb-4 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className={activeStocktake ? "text-amber-700" : "text-gray-500"} />
              <p className="text-sm font-semibold text-gray-800">Stocktake status</p>
            </div>
            {loading ? <p className="mt-2 text-sm text-gray-500">Checking stocktakes…</p>
              : activeStocktake ? <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div><p className="text-sm font-medium text-amber-800">Stocktake in progress</p><p className="text-xs text-gray-500">Started {activeStocktake.startedAt ? new Date(activeStocktake.startedAt).toLocaleString() : "date unavailable"}</p></div>
                <Link to="/branch-manager/stocktakes" className="text-sm font-medium text-red-700">Continue stocktake</Link>
              </div>
              : <p className="mt-2 text-sm text-gray-500">No stocktake currently in progress.</p>}
          </div>
          <div className="px-5 pb-5">
            <Link to="/branch-manager/stocktakes" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Package size={16} />Open stocktakes</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
