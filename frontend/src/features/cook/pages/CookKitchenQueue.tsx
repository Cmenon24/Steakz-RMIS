import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock3, RefreshCw, Utensils, X } from "lucide-react";
import { getCookOrder, getCookRecipes, getKitchenQueue, updateCookOrderStatus, type CookOrder, type CookRecipe } from "../cook.service";

type Tab="ALL"|"NEW"|"PREPARING"|"READY";
const tabs:Array<{value:Tab;label:string}>=[{value:"ALL",label:"All active"},{value:"NEW",label:"New"},{value:"PREPARING",label:"Preparing"},{value:"READY",label:"Ready"}];
const badge=(s:string)=>s==="NEW"?"bg-red-100 text-red-800":s==="PREPARING"?"bg-amber-100 text-amber-800":"bg-blue-100 text-blue-800";
function recipeMatch(item:CookOrder["items"][number],recipes:CookRecipe[]) {
  return recipes.flatMap(recipe=>recipe.versions.map(version=>({recipe,version}))).find(x=>x.version.id===item.recipeVersionId);
}
export default function CookKitchenQueue() {
  const [orders,setOrders]=useState<CookOrder[]>([]);
  const [recipes,setRecipes]=useState<CookRecipe[]>([]);
  const [tab,setTab]=useState<Tab>("ALL");
  const [selected,setSelected]=useState<CookOrder|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  // Keep queue polling independent of the selected order so opening/closing
  // the details modal does not restart the polling effect or cause UI flicker.
  const load=useCallback(async(show=true)=>{
    if(show)setLoading(true);
    setError("");
    try {
      const queue=await getKitchenQueue();
      setOrders(queue);
    } catch(e:any) {
      setError(e.response?.data?.message??"Unable to load the kitchen queue.");
    } finally {
      if(show)setLoading(false);
    }
  },[]);

  // Recipe data is read once when the page mounts; it does not need to be
  // downloaded every time the kitchen queue refreshes.
  useEffect(()=>{
    void getCookRecipes()
      .then(setRecipes)
      .catch((e:any)=>setError(e.response?.data?.message??"Unable to load recipe information."));
  },[]);

  useEffect(()=>{
    void load();
    const timer=window.setInterval(()=>{void load(false);},30000);
    return()=>window.clearInterval(timer);
  },[load]);

  // Automatically dismiss the success message after a short confirmation period.
  useEffect(()=>{
    if(!notice)return;
    const timer=window.setTimeout(()=>setNotice(""),4000);
    return()=>window.clearTimeout(timer);
  },[notice]);
  const visible=useMemo(()=>tab==="ALL"?orders:orders.filter(o=>o.status===tab),[orders,tab]);
  async function openOrder(order:CookOrder){setError("");try{setSelected(await getCookOrder(order.id));}catch(e:any){setError(e.response?.data?.message??"Unable to load order details.");}}
  async function changeStatus(order:CookOrder,next:"PREPARING"|"READY"){
    const action=next==="PREPARING"?"start preparing":"mark this order as ready";
    if(!window.confirm(`Are you sure you want to ${action} (${order.orderNumber})?`))return;
    setBusy(true);setError("");setNotice("");
    try{await updateCookOrderStatus(order.id,next);await load(false);if(selected?.id===order.id){try{setSelected(await getCookOrder(order.id));}catch{setSelected(null);}}setNotice(`${order.orderNumber} updated to ${next}.`);}
    catch(e:any){setError(e.response?.data?.message??"Unable to update this order.");}finally{setBusy(false);}
  }
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold text-gray-900">Kitchen Queue</h1><p className="mt-1 text-sm text-gray-500">Work through orders in submission order and mark completed preparation as ready.</p></div><button onClick={()=>{setNotice("");void load();}} disabled={loading||busy} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw size={16} className={loading?"animate-spin":""}/>Refresh Queue</button></div>
    {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice&&<p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
    <div className="flex flex-wrap gap-2">{tabs.map(t=><button key={t.value} onClick={()=>setTab(t.value)} className={`rounded-lg border px-4 py-2 text-sm font-medium ${tab===t.value?"border-[#1F2937] bg-[#1F2937] text-white":"border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>{t.label} <span className="ml-1 opacity-75">({t.value==="ALL"?orders.length:orders.filter(o=>o.status===t.value).length})</span></button>)}</div>
    {loading?<div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500">Loading kitchen queue…</div>:visible.length===0?<div className="rounded-xl border border-gray-200 bg-white p-12 text-center"><Utensils className="mx-auto text-gray-300" size={32}/><p className="mt-3 font-medium text-gray-800">No orders in this queue</p><p className="mt-1 text-sm text-gray-500">New orders appear when submitted by a Server.</p></div>:<div className="grid gap-4 xl:grid-cols-2">{visible.map(o=><article key={o.id} className={`overflow-hidden rounded-xl border border-gray-200 border-t-4 bg-white shadow-sm ${o.status==="NEW"?"border-t-red-500":o.status==="PREPARING"?"border-t-amber-500":"border-t-blue-500"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4"><div><p className="text-lg font-bold text-gray-900">{o.orderNumber}</p><p className="mt-1 text-sm text-gray-500">Table {o.table?.tableNumber??"—"}</p><p className="mt-1 flex items-center gap-1 text-xs text-gray-400"><Clock3 size={13}/>{new Date(o.createdAt).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge(o.status)}`}>{o.status}</span></div>
      <div className="space-y-3 px-5 py-4">{o.items?.map(item=><div key={item.id} className="flex justify-between gap-3"><div><p className="text-sm font-semibold text-gray-800">{item.menuItemNameSnapshot}</p>{item.sides?.length?<p className="mt-1 text-xs text-gray-500">Sides: {item.sides.map(s=>s.sideNameSnapshot).join(", ")}</p>:null}</div><span className="text-sm font-semibold text-gray-700">× {item.quantity}</span></div>)}</div>
      <div className="flex flex-wrap justify-between gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3"><button onClick={()=>void openOrder(o)} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">View order & recipe</button>{o.status==="NEW"&&<button onClick={()=>void changeStatus(o,"PREPARING")} disabled={busy} className="rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50">Start Preparing</button>}{o.status==="PREPARING"&&<button onClick={()=>void changeStatus(o,"READY")} disabled={busy} className="rounded-lg bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">Mark as Ready</button>}{o.status==="READY"&&<span className="self-center text-sm font-medium text-blue-700">Awaiting Server</span>}</div>
    </article>)}</div>}
    {selected&&<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cook-order-title"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5"><div><h2 id="cook-order-title" className="text-xl font-bold text-gray-900">Order details · {selected.orderNumber}</h2><p className="mt-1 text-sm text-gray-500">Table {selected.table?.tableNumber??"—"} · Submitted {new Date(selected.createdAt).toLocaleString()}</p></div><button type="button" onClick={()=>setSelected(null)} aria-label="Close order details" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X size={22}/></button></div>
      <div className="space-y-5 p-6"><div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900">Order items and preparation recipes</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge(selected.status)}`}>{selected.status}</span></div>
        {selected.items?.map(item=>{const match=recipeMatch(item,recipes);return <section key={item.id} className="rounded-xl border border-gray-200 p-4"><div className="flex flex-wrap justify-between gap-2"><div><h4 className="font-semibold text-gray-900">{item.menuItemNameSnapshot}</h4><p className="text-xs text-gray-500">Quantity: {item.quantity}</p></div><span className="text-xs text-gray-500">Recipe version {match?.version.versionNumber??"not available"}</span></div>
          <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ingredients</p>{match?<div className="mt-2 divide-y divide-gray-100">{match.version.ingredients.map(line=><div key={line.id} className="flex justify-between gap-3 py-2 text-sm"><span className="text-gray-700">{line.ingredient.name}</span><span className="font-medium text-gray-900">{Number(line.quantity)*item.quantity} {line.unit}</span></div>)}</div>:<p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">The exact recipe version attached to this order is not available in the current Cook recipe response. Do not substitute a newer recipe; ask the manager to verify the captured version.</p>}</div>
          {item.sides?.length?<div className="mt-4 border-t border-gray-100 pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Configured sides</p><p className="mt-2 text-sm text-gray-700">{item.sides.map(s=>s.sideNameSnapshot).join(", ")}</p></div>:null}</section>;})}
        {selected.statusHistory?.length?<section><h3 className="font-semibold text-gray-900">Order status history</h3><div className="mt-2 space-y-2">{selected.statusHistory.map((h,i)=><div key={`${h.newStatus}-${h.changedAt}-${i}`} className="flex justify-between gap-3 text-sm"><span className="text-gray-700">{h.previousStatus??"Submitted"} → {h.newStatus}</span><span className="text-xs text-gray-500">{new Date(h.changedAt).toLocaleString()}</span></div>)}</div></section>:null}
      </div><div className="flex justify-end border-t border-gray-100 px-6 py-4"><button type="button" onClick={()=>setSelected(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button></div>
    </div></div>}
  </div>;
}
