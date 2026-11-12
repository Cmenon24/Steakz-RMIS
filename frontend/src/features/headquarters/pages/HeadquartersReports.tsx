import { useEffect, useState } from "react";
import { RefreshCw, ShoppingBag, DollarSign, Tags, AlertTriangle } from "lucide-react";
import { getBranches, getSalesReport, getInventoryReport, getInventoryHistory, type Branch, type ReportRange } from "../headquarters.service";
import { type AnyRecord, money, date, errorText, PageTitle, LoadingError, Card, Status, Select, Button, Kpi } from "./hq-shared";

const transactionTypes = ["OPENING_BALANCE", "RECEIVING", "WASTAGE", "CORRECTION_INCREASE", "CORRECTION_DECREASE", "ORDER_DEDUCTION", "ORDER_REVERSAL", "STOCKTAKE_ADJUSTMENT"];

function BarRow({ label, value, max, display }: { label: string; value: number; max: number; display: string }) {
  return <div className="space-y-1"><div className="flex justify-between gap-3 text-sm"><span className="text-gray-700">{label}</span><span className="font-medium text-gray-700">{display}</span></div><div className="h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-red-600 transition-[width] duration-300" style={{ width: `${Math.max(value > 0 ? 1 : 0, value / Math.max(max, 1) * 100)}%` }}/></div></div>;
}

export function HeadquartersReports() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState("ALL");
  const [period, setPeriod] = useState<ReportRange["period"]>("thisMonth");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sales, setSales] = useState<AnyRecord | null>(null);
  const [inventory, setInventory] = useState<AnyRecord | null>(null);
  const [history, setHistory] = useState<AnyRecord | null>(null);
  const [tab, setTab] = useState("SALES");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventoryStatus, setInventoryStatus] = useState("ALL");
  const [historyType, setHistoryType] = useState("ALL");

  async function load() {
    setLoading(true); setError("");
    try {
      const branchId = branch === "ALL" ? undefined : branch;
      const [branchRows, salesResponse, inventoryResponse, historyResponse] = await Promise.all([
        getBranches(),
        getSalesReport({ period, ...(period === "custom" ? { startDate: start, endDate: end } : {}) }, branchId),
        getInventoryReport(branchId),
        getInventoryHistory({ branchId }),
      ]);
      setBranches(branchRows); setSales(salesResponse as AnyRecord); setInventory(inventoryResponse as AnyRecord); setHistory(historyResponse as AnyRecord);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const summary = sales?.summary ?? {};
  const inventoryBranches = (inventory?.branches ?? []) as AnyRecord[];
  const historyBranches = (history?.branches ?? []) as AnyRecord[];
  const flatInventory = inventoryBranches.flatMap(row => (row.inventory ?? []).map((item: AnyRecord) => ({ ...item, branch: row.branch })));
  const flatHistory = historyBranches.flatMap(row => (row.transactions ?? []).map((item: AnyRecord) => ({ ...item, branch: row.branch })));

  const filteredSales = (sales?.branches ?? []) as AnyRecord[];
  const filteredInventory = flatInventory.filter(item => inventoryStatus === "ALL" || item.stockStatus === inventoryStatus);
  const filteredHistory = flatHistory.filter(row => historyType === "ALL" || row.transactionType === historyType);

  const lowCount = flatInventory.filter(row => row.stockStatus === "LOW_STOCK").length;
  const outCount = flatInventory.filter(row => row.stockStatus === "OUT_OF_STOCK").length;
  const unresolvedCount = inventoryBranches.reduce((sum, row) => sum + Number(row.summary?.unresolvedAlertCount ?? 0), 0);

  return <>
    <PageTitle title="Reports" subtitle="Analyze chain-wide sales, branch performance and inventory movement."/>
    {!loading && !error && tab === "SALES" && <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-5"><Kpi icon={DollarSign} label="Gross sales" value={money(summary.grossSales)}/><Kpi icon={Tags} label="Discounts" value={money(summary.discounts)}/><Kpi icon={DollarSign} label="Refunds" value={money(summary.refunds)}/><Kpi icon={DollarSign} label="Net sales" value={money(summary.netSales)}/><Kpi icon={ShoppingBag} label="Completed orders" value={summary.completedOrderCount ?? 0}/></div>}
    {!loading && !error && tab === "INVENTORY" && <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><Kpi icon={AlertTriangle} label="Low stock" value={lowCount} alert={lowCount > 0}/><Kpi icon={AlertTriangle} label="Out of stock" value={outCount} alert={outCount > 0}/><Kpi icon={AlertTriangle} label="Unresolved alerts" value={unresolvedCount} alert={unresolvedCount > 0}/></div>}
    {!loading && !error && tab === "HISTORY" && <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3"><Kpi icon={ShoppingBag} label="Transactions" value={flatHistory.length}/><Kpi icon={DollarSign} label="Stock increases" value={flatHistory.filter(row => Number(row.quantityChange) > 0).length}/><Kpi icon={AlertTriangle} label="Stock decreases" value={flatHistory.filter(row => Number(row.quantityChange) < 0).length}/></div>}
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div><label className="mb-1 block text-xs font-semibold text-gray-500">Branch</label><Select value={branch} onChange={setBranch}><option value="ALL">All branches</option>{branches.map(row => <option key={row.id} value={row.id}>{row.branchCode} · {row.name}</option>)}</Select></div>
        {tab === "SALES" && <div><label className="mb-1 block text-xs font-semibold text-gray-500">Sales period</label><Select value={period} onChange={value => setPeriod(value as ReportRange["period"])}>{[["today", "Today"], ["yesterday", "Yesterday"], ["thisWeek", "This week"], ["thisMonth", "This month"], ["lastMonth", "Last month"], ["custom", "Custom range"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>}
        {tab === "INVENTORY" && <div><label className="mb-1 block text-xs font-semibold text-gray-500">Stock status</label><Select value={inventoryStatus} onChange={setInventoryStatus}><option value="ALL">All stock statuses</option><option value="IN_STOCK">In stock</option><option value="LOW_STOCK">Low stock</option><option value="OUT_OF_STOCK">Out of stock</option></Select></div>}
        {tab === "HISTORY" && <div><label className="mb-1 block text-xs font-semibold text-gray-500">Transaction type</label><Select value={historyType} onChange={setHistoryType}><option value="ALL">All transaction types</option>{transactionTypes.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</Select></div>}
        {tab === "SALES" && period === "custom" && <><div><label className="mb-1 block text-xs font-semibold text-gray-500">Start date</label><input type="date" value={start} onChange={event => setStart(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"/></div><div><label className="mb-1 block text-xs font-semibold text-gray-500">End date</label><input type="date" value={end} onChange={event => setEnd(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"/></div></>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {([["SALES", "Sales"], ["INVENTORY", "Inventory"], ["HISTORY", "Inventory history"]] as const).map(([value, label]) => <Button key={value} variant={tab === value ? "dark" : "light"} onClick={() => setTab(value)}>{label}</Button>)}
        <Button onClick={() => void load()} variant="light" disabled={loading || (tab === "SALES" && period === "custom" && (!start || !end))}><RefreshCw size={15}/>Run report</Button>
      </div>
    </div>
    <LoadingError loading={loading} error={error} retry={() => void load()}/>

    {!loading && !error && tab === "SALES" && <>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">{filteredSales.map(row => {
        const categoryRows = row.revenueByCategory ?? [];
        const itemRows = (row.bestSellingItems ?? []).slice(0, 5);
        const maxCategory = Math.max(1, ...categoryRows.map((item: AnyRecord) => Number(item.grossRevenue)));
        const maxItem = Math.max(1, ...itemRows.map((item: AnyRecord) => Number(item.quantitySold)));
        return <Card key={row.branch.id}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{row.branch.branchCode} · {row.branch.name}</h2><p className="mt-1 text-sm text-gray-500">Average order value: {money(row.summary.averageOrderValue)}</p></div><span className="text-xs text-gray-500">{row.summary.completedOrderCount} completed orders</span></div>
          <h3 className="mb-3 mt-5 text-sm font-semibold">Revenue by category</h3><div className="space-y-3">{categoryRows.map((item: AnyRecord) => <BarRow key={item.category} label={item.category} value={Number(item.grossRevenue)} max={maxCategory} display={money(item.grossRevenue)}/>)}</div>
          <h3 className="mb-3 mt-5 text-sm font-semibold">Best-selling items · by quantity</h3><div className="space-y-3">{itemRows.map((item: AnyRecord) => <BarRow key={item.menuItem} label={item.menuItem} value={Number(item.quantitySold)} max={maxItem} display={`${item.quantitySold} sold · ${money(item.grossRevenue)}`}/>)}</div>
        </Card>;
      })}{!filteredSales.length && <Card>No branch sales are available for this selection.</Card>}</div>
    </>}

    {!loading && !error && tab === "INVENTORY" && <>
      <Card><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Branch", "Ingredient", "On hand", "Minimum", "Status"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{filteredInventory.map((row, index) => <tr key={`${row.branch?.id}-${row.ingredientId}-${index}`}><td className="px-3 py-2">{row.branch?.branchCode} · {row.branch?.name}</td><td className="px-3 py-2 font-medium">{row.ingredient}</td><td className="px-3 py-2">{row.quantityOnHand} {row.unit}</td><td className="px-3 py-2 text-gray-500">{row.minimumStockLevel} {row.unit}</td><td className="px-3 py-2"><Status value={row.stockStatus}/></td></tr>)}{!filteredInventory.length && <tr><td colSpan={5} className="py-8 text-center text-sm text-gray-500">No inventory rows match these filters.</td></tr>}</tbody></table></div></Card>
    </>}

    {!loading && !error && tab === "HISTORY" && <>
      <p className="mb-3 text-xs text-gray-500">{filteredHistory.length} matching inventory movements. Showing the latest history returned by the API.</p>
      <Card><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Date", "Branch", "Reference", "Ingredient", "Type", "Change", "Previous", "New", "Recorded by"].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y">{filteredHistory.map(row => {
        const change = Number(row.quantityChange);
        const increase = change > 0;
        return <tr key={row.id}>
          <td className="px-3 py-2 text-xs text-gray-500">{date(row.createdAt)}</td><td className="px-3 py-2">{row.branch?.branchCode} · {row.branch?.name}</td><td className="px-3 py-2 font-medium">{row.referenceNumber}</td><td className="px-3 py-2">{row.ingredient?.name ?? "—"}</td><td className="px-3 py-2"><span className="text-xs">{String(row.transactionType).replaceAll("_", " ")}</span></td>
          <td className={`px-3 py-2 font-semibold ${increase ? "text-green-700" : "text-red-700"}`}>{increase ? "+" : ""}{row.quantityChange} {row.ingredient?.unit ?? ""}</td>
          <td className="px-3 py-2 text-gray-500">{row.previousQuantity} {row.ingredient?.unit ?? ""}</td><td className={`px-3 py-2 font-semibold ${increase ? "text-green-700" : "text-red-700"}`}>{row.newQuantity} {row.ingredient?.unit ?? ""}</td>
          <td className="px-3 py-2">{row.createdBy ? `${row.createdBy.firstName} ${row.createdBy.lastName}` : "System"}</td>
        </tr>;
      })}{!filteredHistory.length && <tr><td colSpan={9} className="py-8 text-center text-sm text-gray-500">No inventory movements match these filters.</td></tr>}</tbody></table></div></Card>
    </>}
  </>;
}
