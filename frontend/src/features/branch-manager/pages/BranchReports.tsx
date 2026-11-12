import { useEffect, useMemo, useState } from "react";
import { getInventoryHistory,getInventoryReport,getSalesReport } from "../branch-manager.service";
const periods = ["today", "yesterday", "thisWeek", "thisMonth", "lastMonth", "custom"] as const;

const movementLabel = (type: string) =>
  type.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase());

const getRelatedOrder = (reason?: string | null) =>
  reason?.match(/\border\s+([A-Z0-9-]+)\b/i)?.[1] ?? null;
export default function BranchReports(){const [period,setPeriod]=useState<typeof periods[number]>("thisMonth");const [startDate,setStartDate]=useState("");const [endDate,setEndDate]=useState("");const [sales,setSales]=useState<any>(null);const [inventory,setInventory]=useState<any>(null);const [history,setHistory]=useState<any[]>([]);const [movementSearch,setMovementSearch]=useState("");const [movementType,setMovementType]=useState("ALL");const [loading,setLoading]=useState(true);const [error,setError]=useState("");async function load(){if(period==="custom"&&(!startDate||!endDate)){setError("Select both custom report dates.");return}if(period==="custom"&&startDate>endDate){setError("Start date must not be after end date.");return}setLoading(true);setError("");try{const [s,i,h]=await Promise.all([getSalesReport({period,...(period==="custom"?{startDate,endDate}:{})}),getInventoryReport(),getInventoryHistory(period==="custom"?{startDate,endDate}:{})]);setSales(s);setInventory(i);const historyResult=h as any;const list=Array.isArray(historyResult)?historyResult:historyResult?.branches?.flatMap((b:any)=>b.transactions??[])??[];setHistory(list)}catch(e:any){setError(e.response?.data?.message??"Unable to load reports.")}finally{setLoading(false)}}useEffect(()=>{void load()},[]);const summary=sales?.branches?.[0]?.summary??sales?.summary;const inv=inventory?.branches?.[0]?.summary;
const movementTypes=useMemo(()=>Array.from(new Set(history.map((record:any)=>record.transactionType as string))).sort(),[history]);
const filteredHistory=useMemo(()=>{
  const term=movementSearch.trim().toLowerCase();
  return history.filter((record:any)=>{
    const relatedOrder=getRelatedOrder(record.reason);
    const actor=record.createdBy?`${record.createdBy.firstName} ${record.createdBy.lastName}`:"System";
    const matchesSearch=!term||
      record.ingredient?.name?.toLowerCase().includes(term)||
      record.referenceNumber?.toLowerCase().includes(term)||
      relatedOrder?.toLowerCase().includes(term)||
      record.reason?.toLowerCase().includes(term)||
      record.notes?.toLowerCase().includes(term)||
      actor.toLowerCase().includes(term);
    return matchesSearch&&(movementType==="ALL"||record.transactionType===movementType);
  });
},[history,movementSearch,movementType]);
return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Reports</h1><p className="mt-1 text-sm text-gray-500">Sales and inventory reporting for your assigned branch.</p></div><section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Report period</h2><div className="mt-3 flex flex-wrap items-end gap-3"><label className="text-sm">Period<select value={period} onChange={e=>setPeriod(e.target.value as typeof period)} className="mt-1 block rounded-lg border px-3 py-2"><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="thisWeek">This week</option><option value="thisMonth">This month</option><option value="lastMonth">Last month</option><option value="custom">Custom range</option></select></label>{period==="custom"&&<><label className="text-sm">Start date<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2"/></label><label className="text-sm">End date<input type="date" min={startDate||undefined} value={endDate} onChange={e=>setEndDate(e.target.value)} className="mt-1 block rounded-lg border px-3 py-2"/></label></>}<button onClick={()=>void load()} disabled={loading} className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">Apply period</button></div></section>{error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{label:"Gross sales",value:summary?.grossSales, money:true},{label:"Discounts",value:summary?.discounts,money:true},{label:"Refunds",value:summary?.refunds,money:true},{label:"Net sales",value:summary?.netSales,money:true},{label:"Completed orders",value:summary?.completedOrderCount},{label:"Average order value",value:summary?.averageOrderValue,money:true},{label:"Low stock ingredients",value:inv?.lowStockCount},{label:"Out of stock ingredients",value:inv?.outOfStockCount}].map(x=><div key={x.label} className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">{x.label}</p><p className="mt-2 text-2xl font-bold">{loading?"…":x.value==null?"—":x.money?`$${Number(x.value).toFixed(2)}`:x.value}</p></div>)}</div><div className="grid gap-6 xl:grid-cols-2"><section className="rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Revenue by category</h2></div>{sales?.branches?.[0]?.revenueByCategory?.length?sales.branches[0].revenueByCategory.map((r:any)=><div key={r.category} className="flex justify-between border-b p-4 text-sm"><span>{r.category}</span><b>${Number(r.grossRevenue).toFixed(2)}</b></div>):<p className="p-5 text-sm text-gray-500">No category revenue data for this period.</p>}</section><section className="rounded-xl border bg-white"><div className="border-b p-5"><h2 className="font-semibold">Best-selling items</h2></div>{sales?.branches?.[0]?.bestSellingItems?.length?sales.branches[0].bestSellingItems.slice(0,8).map((r:any)=><div key={r.menuItem} className="flex justify-between border-b p-4 text-sm"><span>{r.menuItem}</span><span>{r.quantitySold} sold · ${Number(r.grossRevenue).toFixed(2)}</span></div>):<p className="p-5 text-sm text-gray-500">No item sales data for this period.</p>}</section></div><section className="overflow-hidden rounded-xl border bg-white">
  <div className="border-b p-5">
    <h2 className="font-semibold">Inventory movement history</h2>
    <p className="mt-1 text-xs text-gray-500">Inventory receipts, adjustments, order deductions and reversals for your assigned branch.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-medium text-gray-600">
        Search movements
        <input
          value={movementSearch}
          onChange={e => setMovementSearch(e.target.value)}
          placeholder="Search ingredient, movement reference, or order number..."
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-normal text-gray-900"
        />
      </label>
      <label className="block text-xs font-medium text-gray-600">
        Movement type
        <select
          value={movementType}
          onChange={e => setMovementType(e.target.value)}
          className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm font-normal text-gray-900"
        >
          <option value="ALL">All movement types</option>
          {movementTypes.map(type => <option key={type} value={type}>{movementLabel(type)}</option>)}
        </select>
      </label>
    </div>
  </div>
  {loading ? <p className="p-6 text-sm text-gray-500">Loading inventory movements…</p> :
   filteredHistory.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">{history.length === 0 ? "No inventory movements returned for the selected period." : "No movements match these filters."}</p> :
   <div className="overflow-x-auto">
    <table className="w-full min-w-[1050px] text-left text-sm">
      <thead className="bg-gray-50 text-xs uppercase text-gray-500">
        <tr>{["Ingredient","Movement","Quantity change","Previous","New balance","Movement reference","Related order / details","Recorded by","Date & time"].map(column => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
      </thead>
      <tbody className="divide-y">
        {filteredHistory.slice(0, 50).map((record:any) => {
          const quantity = Number(record.quantityChange);
          const relatedOrder = getRelatedOrder(record.reason);
          const actor = record.createdBy ? `${record.createdBy.firstName} ${record.createdBy.lastName}` : "System";
          return <tr key={record.id}>
            <td className="px-4 py-4 font-medium">{record.ingredient?.name ?? record.ingredientName ?? "Unknown ingredient"}<p className="text-xs text-gray-500">{record.ingredient?.unit ?? ""}</p></td>
            <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${quantity > 0 ? "bg-green-50 text-green-700" : quantity < 0 ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"}`}>{movementLabel(record.transactionType ?? "UNKNOWN")}</span></td>
            <td className={`px-4 py-4 font-semibold tabular-nums ${quantity > 0 ? "text-green-700" : quantity < 0 ? "text-red-700" : "text-gray-700"}`}>{quantity > 0 ? "+" : ""}{quantity} {record.ingredient?.unit ?? ""}</td>
            <td className="px-4 py-4 tabular-nums">{record.previousQuantity == null ? "—" : Number(record.previousQuantity)}</td>
            <td className="px-4 py-4 tabular-nums">{record.newQuantity == null ? "—" : Number(record.newQuantity)}</td>
            <td className="px-4 py-4 font-medium">{record.referenceNumber ?? "—"}</td>
            <td className="px-4 py-4">{relatedOrder ? <p className="font-medium">{relatedOrder}</p> : <p className="text-gray-400">—</p>}{record.reason && <p className="text-xs text-gray-500">Reason: {record.reason}</p>}{record.notes && <p className="max-w-xs truncate text-xs text-gray-500" title={record.notes}>{record.notes}</p>}</td>
            <td className="px-4 py-4">{actor}</td>
            <td className="whitespace-nowrap px-4 py-4 text-gray-600">{new Date(record.createdAt).toLocaleString()}</td>
          </tr>;
        })}
      </tbody>
    </table>
   </div>}
</section></div>}
