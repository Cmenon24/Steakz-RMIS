import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Building2, ShoppingBag, DollarSign, AlertTriangle } from "lucide-react";
import { getBranches, getOrders, getSalesReport, getInventoryReport, type Branch, type Order } from "../headquarters.service";
import { type AnyRecord, money, errorText, PageTitle, LoadingError, Card, Button, Kpi, OrderTable } from "./hq-shared";

export function HeadquartersDashboard() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [sales, setSales] = useState<AnyRecord | null>(null);
  const [stock, setStock] = useState<AnyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"today" | "yesterday" | "thisWeek" | "thisMonth">("today");

  async function load() {
    setLoading(true); setError("");
    try {
      const [branchRows, orderRows, salesReport, inventoryReport] = await Promise.all([
        getBranches(), getOrders(), getSalesReport({ period }), getInventoryReport(),
      ]);
      setBranches(branchRows); setOrders(orderRows); setSales(salesReport as AnyRecord); setStock(inventoryReport as AnyRecord);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [period]);

  const summary = sales?.summary ?? {};
  const invBranches = (stock?.branches ?? []) as AnyRecord[];
  const low = invBranches.reduce((total, branch) => total + Number(branch.summary?.lowStockCount ?? 0), 0);
  const out = invBranches.reduce((total, branch) => total + Number(branch.summary?.outOfStockCount ?? 0), 0);
  const periodOrders = orders.filter(order => {
    const d = new Date(order.createdAt); const now = new Date();
    if (period === "today") return d.toDateString() === now.toDateString();
    if (period === "yesterday") { const y = new Date(now); y.setDate(y.getDate() - 1); return d.toDateString() === y.toDateString(); }
    const start = new Date(now); start.setHours(0,0,0,0);
    if (period === "thisWeek") { const day = (start.getDay() + 6) % 7; start.setDate(start.getDate() - day); }
    else start.setDate(1);
    return d >= start && d <= now;
  });
  const branchNames = Object.fromEntries(branches.map(branch => [branch.id, branch.name]));
  const performance = (sales?.branches ?? []) as AnyRecord[];
  const periodLabel =
  period === "today" ? "today" :
  period === "yesterday" ? "yesterday" :
  period === "thisWeek" ? "this week" :
  "this month";
  const maxSales = Math.max(0, ...performance.map(branch => Number(branch.summary?.netSales ?? 0)));

  return <>
    <PageTitle title="Headquarters Dashboard" subtitle="Chain-wide restaurant operations and performance overview." action={<div className="flex flex-wrap gap-2"><select aria-label="Dashboard period" value={period} onChange={event => setPeriod(event.target.value as typeof period)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="thisWeek">This week</option><option value="thisMonth">This month</option></select><Button variant="light" onClick={() => void load()}><RefreshCw size={15}/>Refresh</Button></div>}/>
    <LoadingError loading={loading} error={error} retry={() => void load()}/>
    {!loading && !error && <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={Building2} label="Active branches" value={branches.filter(branch => branch.isActive).length}/>
        <Kpi icon={ShoppingBag} label={period === "today" ? "Orders today" : period === "yesterday" ? "Orders yesterday" : period === "thisWeek" ? "Orders this week" : "Orders this month"} value={periodOrders.length}/>
        <Kpi icon={DollarSign}label={`Net sales ${periodLabel}`} value={money(summary.netSales)}/>
        <Kpi icon={AlertTriangle} label="Stock alerts" value={low + out} detail={`${low} low · ${out} out of stock`} alert={low + out > 0}/>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-900">Branch performance · {period === "today" ? "Today" : period === "yesterday" ? "Yesterday" : period === "thisWeek" ? "This week" : "This month"}</h2>
            <span className="text-xs text-gray-500">Completed orders · Net sales</span>
          </div>
          <div className="space-y-4">
            {performance.map(branch => {
              const branchId = branch.branch.id as string;
              const amount = Number(branch.summary?.netSales ?? 0);
              return <div key={branchId}>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium text-gray-700">{branch.branch.branchCode} · {branch.branch.name}</span>
                  <span className="text-gray-600">{money(amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-red-600 transition-[width] duration-300" style={{ width: `${Math.max(amount > 0 ? 1 : 0, (maxSales > 0 ? amount / maxSales * 100 : 0))}%` }}/></div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-400">
                  <span>{branch.summary?.completedOrderCount ?? 0} completed orders</span>
                  <button onClick={() => navigate("/headquarters/branches", { state: { branchId } })} className="font-semibold text-gray-700 hover:text-red-700">View branch</button>
                </div>
              </div>;
            })}
            {!performance.length && (
              <p className="py-6 text-center text-sm text-gray-500">
                No completed sales recorded for {periodLabel}.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-gray-900">Inventory attention</h2><span className="text-xs text-gray-500">Current stock</span></div>
          {invBranches.map(branch => <div key={branch.branch.id} className="border-b border-gray-100 py-3 last:border-0">
            <div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-gray-800">{branch.branch.branchCode} · {branch.branch.name}</p><button onClick={() => navigate("/headquarters/branches", { state: { branchId: branch.branch.id, showInventory: true } })} className="shrink-0 text-xs font-semibold text-gray-700 hover:text-red-700">View stock</button></div>
            <p className="mt-1 text-xs text-gray-500"><span className={Number(branch.summary.lowStockCount) > 0 ? "font-semibold text-amber-700" : "text-gray-500"}>{branch.summary.lowStockCount} low</span> · <span className={Number(branch.summary.outOfStockCount) > 0 ? "font-semibold text-red-700" : "text-gray-500"}>{branch.summary.outOfStockCount} out of stock</span></p>
          </div>)}
          {!invBranches.length && <p className="text-sm text-gray-500">No inventory information available.</p>}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-gray-900">Recent orders</h2><button onClick={() => navigate("/headquarters/orders")} className="text-sm font-semibold text-gray-700 hover:text-red-700">View all orders</button></div>
        <OrderTable orders={[...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8)} branchNames={branchNames} onSelect={() => navigate("/headquarters/orders")}/>
      </Card>
    </>}
  </>;
}
