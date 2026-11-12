import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CreditCard, Plus, RefreshCw, X } from "lucide-react";
import {
  cancelServerOrder, editServerOrder, getServerMenuItems, getServerOrder, getServerOrders, recordServerPayment, updateServerOrderStatus,
  type ServerMenuItem, type ServerOrder,
} from "../server.service";

const workflow = [
  { status: "NEW", title: "New", description: "Submitted orders", style: "bg-red-100 text-red-800", border: "border-t-red-500" },
  { status: "PREPARING", title: "Preparing", description: "Being prepared by kitchen", style: "bg-amber-100 text-amber-800", border: "border-t-amber-500" },
  { status: "READY", title: "Ready", description: "Ready for server", style: "bg-blue-100 text-blue-800", border: "border-t-blue-500" },
  { status: "COMPLETED", title: "Completed", description: "Awaiting or completed payment", style: "bg-green-100 text-green-800", border: "border-t-green-500" },
];

function paid(order: ServerOrder) {
  return order.paymentStatus?.toUpperCase() === "PAID" || order.payments?.some((payment) => payment.status === "SUCCESSFUL") === true;
}
function paymentLabel(order: ServerOrder) {
  if (order.status === "CANCELLED") return "—";
  if (paid(order)) return "PAID";
  return order.status === "COMPLETED" ? "PAYMENT DUE" : "NOT PAID";
}
function paymentStyle(order: ServerOrder) {
  const label = paymentLabel(order);
  if (label === "PAID") return "bg-green-100 text-green-800";
  if (label === "PAYMENT DUE") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}

export default function ServerOrders() {
  const [orders, setOrders] = useState<ServerOrder[]>([]);
  const [menu, setMenu] = useState<ServerMenuItem[]>([]);
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED">("ALL");
  const [detail, setDetail] = useState<ServerOrder | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CARD");
  const [busy, setBusy] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [result, menuResult] = await Promise.all([getServerOrders(), getServerMenuItems()]);
      setMenu(menuResult);
      const completed = result.filter((order) => order.status === "COMPLETED");
      const details = await Promise.all(completed.map(async (order) => {
        if (order.paymentStatus || order.payments) return order;
        try { return await getServerOrder(order.id); } catch { return order; }
      }));
      const detailMap = new Map(details.map((order) => [order.id, order]));
      setOrders(result.map((order) => detailMap.get(order.id) ?? order));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const searchedOrders = useMemo(() => orders.filter((order) =>
    `${order.orderNumber} ${order.table?.tableNumber ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  ), [orders, search]);

  // Paid completed orders leave the operational queue; payment history remains on the Payments page.
  const queueOrders = searchedOrders.filter((order) =>
    ["NEW", "PREPARING", "READY"].includes(order.status) || (order.status === "COMPLETED" && !paid(order)),
  );
  const cancelled = searchedOrders.filter((order) => order.status === "CANCELLED");
  const tabCounts = {
    ALL: queueOrders.length,
    NEW: queueOrders.filter((order) => order.status === "NEW").length,
    PREPARING: queueOrders.filter((order) => order.status === "PREPARING").length,
    READY: queueOrders.filter((order) => order.status === "READY").length,
    COMPLETED: queueOrders.filter((order) => order.status === "COMPLETED").length,
    CANCELLED: cancelled.length,
  };
  const visibleWorkflow = activeTab === "ALL" ? workflow : workflow.filter((column) => column.status === activeTab);

  async function openDetail(order: ServerOrder) {
    setError("");
    setPaymentMethod("CARD");
    try { setDetail(await getServerOrder(order.id)); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to load order details."); }
  }

  async function completeOrder(order: ServerOrder) {
    setBusy(true);
    setError("");
    try { await updateServerOrderStatus(order.id, "COMPLETED"); await load(); setDetail(await getServerOrder(order.id)); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to complete order."); }
    finally { setBusy(false); }
  }

  async function cancelOrder(order: ServerOrder) {
    const reason = cancelReason.trim();
    if (reason.length < 3) { setError("Enter a cancellation reason (at least 3 characters)."); return; }
    setBusy(true);
    setError("");
    try { await cancelServerOrder(order.id, reason); setCancelReason(""); await load(); setDetail(await getServerOrder(order.id)); }
    catch (err: any) { setError(err.response?.data?.message ?? "Unable to cancel order."); }
    finally { setBusy(false); }
  }

  async function startEdit(order: ServerOrder) {
    setError("");
    try {
      const full = await getServerOrder(order.id);
      const quantities: Record<string, number> = {};
      full.items?.forEach((item) => { quantities[item.menuItemId] = (quantities[item.menuItemId] ?? 0) + item.quantity; });
      setDetail(full);
      setEditQuantities(quantities);
      setEditing(true);
    } catch (err: any) { setError(err.response?.data?.message ?? "Unable to load this order for editing."); }
  }

  async function saveEdit() {
    if (!detail) return;
    const items = Object.entries(editQuantities).filter(([, quantity]) => quantity > 0).map(([menuItemId, quantity]) => ({ menuItemId, quantity }));
    if (!items.length) { setError("An order must contain at least one item."); return; }
    setBusy(true);
    setError("");
    try {
      await editServerOrder(detail.id, items);
      setEditing(false);
      setDetail(await getServerOrder(detail.id));
      await load();
    } catch (err: any) { setError(err.response?.data?.message ?? "Unable to update this order."); }
    finally { setBusy(false); }
  }

  async function takePayment() {
    if (!detail || detail.status !== "COMPLETED" || paid(detail)) return;
    setBusy(true);
    setError("");
    try {
      await recordServerPayment(detail.id, paymentMethod);
      const refreshed = await getServerOrder(detail.id);
      setDetail(refreshed);
      await load();
      const printReceipt = window.confirm("Payment successful. Would you like to print a receipt?");
      if (printReceipt) window.alert(`Receipt for ${refreshed.orderNumber} printed successfully. (Simulation)`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to record payment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><h1 className="text-2xl font-bold text-gray-900">Orders</h1><p className="mt-1 text-sm text-gray-500">Follow each order from submission through kitchen preparation, service and payment.</p></div>
        <Link to="/pos/new-order" aria-label="Create a new order" style={{ color: "#FFFFFF" }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#1F2937] px-5 py-2.5 !text-white font-bold shadow-sm hover:bg-[#111827]"><Plus size={17} aria-hidden="true" /><span className="!text-white">New Order</span></Link>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order or table" className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm sm:max-w-sm" />
        <div className="flex flex-wrap items-center gap-3"><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"><RefreshCw size={15} />Refresh</button></div>
      </div>

      <div className="flex gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2">
        {([
          ["ALL", "Order Queue"], ["NEW", "New"], ["PREPARING", "Preparing"],
          ["READY", "Ready"], ["COMPLETED", "Completed · Payment Due"], ["CANCELLED", "Cancelled"],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} aria-pressed={activeTab === key}
            className={`shrink-0 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition ${activeTab === key ? "bg-[#1F2937] text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {label}<span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${activeTab === key ? "bg-white/15 text-white" : "bg-gray-100 text-gray-600"}`}>{tabCounts[key]}</span>
          </button>
        ))}
      </div>

      {loading ? <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading order queue…</div> : activeTab === "CANCELLED" ? (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold text-gray-900">Cancelled orders</h2><p className="mt-1 text-xs text-gray-500">Cancelled orders are retained for reference.</p></div>{cancelled.length === 0 ? <p className="p-5 text-sm text-gray-500">No cancelled orders found.</p> : <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{cancelled.map((order) => <button key={order.id} onClick={() => void openDetail(order)} className="rounded-lg border border-gray-200 p-4 text-left hover:bg-gray-50"><div className="flex justify-between gap-2"><b className="text-sm">{order.orderNumber}</b><span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">CANCELLED</span></div><p className="mt-2 text-xs text-gray-500">Table {order.table?.tableNumber ?? "—"}</p><p className="mt-1 text-sm font-semibold">${Number(order.totalAmount).toFixed(2)}</p></button>)}</div>}</section>
      ) : (
        <div className={`grid items-start gap-4 ${activeTab === "ALL" ? "xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3"}`}>
          {visibleWorkflow.map((column) => {
            const columnOrders = queueOrders.filter((order) => order.status === column.status);
            return <section key={column.status} className={`overflow-hidden rounded-xl border border-gray-200 border-t-4 ${column.border} bg-gray-50`}>
              <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4"><div><h2 className="font-semibold text-gray-900">{column.title}</h2><p className="mt-0.5 text-xs text-gray-500">{column.description}</p></div><span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">{columnOrders.length}</span></div>
              <div className="max-h-[680px] min-h-40 space-y-3 overflow-y-auto p-3">
                {columnOrders.length === 0 ? <p className="px-2 py-8 text-center text-xs text-gray-400">No {column.title.toLowerCase()} orders</p> : columnOrders.map((order) => <button key={order.id} onClick={() => void openDetail(order)} className="block w-full rounded-lg border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-gray-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <div className="flex items-start justify-between gap-2"><span className="text-sm font-bold text-gray-900">{order.orderNumber}</span><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${column.style}`}>{order.status}</span></div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500"><span>Table {order.table?.tableNumber ?? "—"}</span><span>{new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3"><span className="text-xs text-gray-500">{order.items?.reduce((count, item) => count + item.quantity, 0) ?? 0} items</span><span className="text-sm font-semibold text-gray-900">${Number(order.totalAmount).toFixed(2)}</span></div>
                  <div className="mt-2 flex items-center justify-between"><span className={`rounded-md px-2 py-1 text-[10px] font-bold ${paymentStyle(order)}`}>{paymentLabel(order)}</span><span className="text-[11px] font-medium text-gray-500">View details →</span></div>
                </button>)}
              </div>
            </section>;
          })}
        </div>
      )}

      {detail && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-3 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setDetail(null); }}><section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-start justify-between border-b border-gray-200 bg-white px-6 py-5"><div><h2 className="text-xl font-bold text-gray-900">Order {detail.orderNumber}</h2><p className="mt-1 text-sm text-gray-500">Table {detail.table?.tableNumber ?? "—"} · {new Date(detail.createdAt).toLocaleString()}</p></div><button onClick={() => setDetail(null)} disabled={busy} aria-label="Close order details" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X size={24} /></button></div>
        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-md px-3 py-1.5 text-xs font-bold ${workflow.find((item) => item.status === detail.status)?.style ?? "bg-gray-100 text-gray-700"}`}>{detail.status}</span><span className={`rounded-md px-3 py-1.5 text-xs font-bold ${paymentStyle(detail)}`}>{paymentLabel(detail)}</span></div>
          <div><h3 className="mb-3 text-sm font-semibold text-gray-900">Order items</h3><div className="divide-y divide-gray-100 rounded-lg border border-gray-200">{detail.items?.map((item, index) => <div key={item.id ?? `${item.menuItemId}-${index}`} className="flex justify-between gap-4 p-4"><div><p className="text-sm font-medium text-gray-900">{item.menuItemNameSnapshot} × {item.quantity}</p>{item.sides?.length ? <p className="mt-1 text-xs text-gray-500">{item.sides.map((side) => side.sideNameSnapshot).join(", ")}</p> : null}</div><p className="shrink-0 text-sm font-medium text-gray-900">${Number(item.lineTotal).toFixed(2)}</p></div>)}</div></div>
          <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm"><div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>${Number(detail.subtotal).toFixed(2)}</span></div><div className="flex justify-between"><span className="text-gray-600">Discount</span><span>-${Number(detail.discountTotal).toFixed(2)}</span></div><div className="flex justify-between"><span className="text-gray-600">Tax</span><span>${Number(detail.taxTotal).toFixed(2)}</span></div><div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold"><span>Order total</span><span>${Number(detail.totalAmount).toFixed(2)}</span></div></div>

          {detail.status === "NEW" && <div className="space-y-3 rounded-lg border border-gray-200 p-4"><p className="text-sm font-semibold text-gray-900">Order actions</p><p className="text-xs text-gray-500">You may edit or cancel your own order while it is still NEW.</p>{!editing ? <button onClick={() => void startEdit(detail)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Edit order items</button> : <div className="space-y-3">{menu.map((item) => <div key={item.id} className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-gray-900">{item.name}</p><p className="text-xs text-gray-500">${Number(item.price).toFixed(2)}</p></div><div className="flex items-center gap-2"><button onClick={() => setEditQuantities((current) => ({ ...current, [item.id]: Math.max(0, (current[item.id] ?? 0) - 1) }))} className="rounded border px-2 py-1">−</button><span className="w-5 text-center text-sm">{editQuantities[item.id] ?? 0}</span><button onClick={() => setEditQuantities((current) => ({ ...current, [item.id]: Math.min(50, (current[item.id] ?? 0) + 1) }))} className="rounded border px-2 py-1">+</button></div></div>)}<button onClick={() => void saveEdit()} disabled={busy} className="rounded-lg bg-[#1F2937] px-3 py-2 text-sm font-semibold text-white">Save changes</button><button onClick={() => setEditing(false)} className="ml-2 rounded-lg border px-3 py-2 text-sm">Discard edits</button></div>}<label className="block text-xs font-medium text-gray-700">Cancellation reason<textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={2} className="mt-1.5 w-full rounded-lg border border-gray-200 p-2.5 text-sm" placeholder="Reason for cancellation" /></label><button onClick={() => void cancelOrder(detail)} disabled={busy} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Cancel order</button></div>}

          {detail.status === "READY" && <button onClick={() => void completeOrder(detail)} disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F2937] px-4 py-3 text-sm font-bold text-white hover:bg-[#111827] disabled:opacity-50"><CheckCircle2 size={17} />{busy ? "Updating…" : "Mark order completed"}</button>}

          {detail.status === "COMPLETED" && !paid(detail) && <div className="space-y-4 rounded-xl border border-red-200 bg-red-50/50 p-4"><div><h3 className="font-semibold text-gray-900">Payment due</h3><p className="mt-1 text-sm text-gray-600">Record the full order amount using cash or card.</p></div><div className="grid grid-cols-2 gap-3"><button onClick={() => setPaymentMethod("CASH")} className={`rounded-lg border p-3 text-sm font-semibold ${paymentMethod === "CASH" ? "border-[#1F2937] bg-white text-gray-900 ring-1 ring-[#1F2937]" : "border-gray-200 bg-white text-gray-600"}`}><CreditCard className="mx-auto mb-1" size={18} />Cash</button><button onClick={() => setPaymentMethod("CARD")} className={`rounded-lg border p-3 text-sm font-semibold ${paymentMethod === "CARD" ? "border-[#1F2937] bg-white text-gray-900 ring-1 ring-[#1F2937]" : "border-gray-200 bg-white text-gray-600"}`}><CreditCard className="mx-auto mb-1" size={18} />Card</button></div><button onClick={() => void takePayment()} disabled={busy} className="w-full rounded-lg bg-[#1F2937] px-4 py-3 text-sm font-bold text-white hover:bg-[#111827] disabled:opacity-50">{busy ? "Processing payment…" : `Confirm ${paymentMethod === "CASH" ? "cash" : "card"} payment · $${Number(detail.totalAmount).toFixed(2)}`}</button></div>}

          {detail.status === "COMPLETED" && paid(detail) && <div className="rounded-lg border border-green-200 bg-green-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-green-800"><CheckCircle2 size={18} />Payment recorded</p><p className="mt-1 text-xs text-green-700">This order has been paid in full.</p></div>}
        </div>
      </section></div>}
    </div>
  );
}
