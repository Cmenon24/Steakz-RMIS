import { useEffect, useState } from "react";
import { Eye, RefreshCw, X } from "lucide-react";
import { cancelBranchOrder, getBranchOrder, getBranchOrders, type BranchOrder } from "../branch-manager.service";

const statuses = ["ALL", "NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"];

function statusBadge(status: string) {
  const classes: Record<string, string> = {
    NEW: "bg-red-100 text-red-800",
    PREPARING: "bg-amber-100 text-amber-800",
    READY: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-gray-200 text-gray-700",
  };
  return classes[status] ?? "bg-gray-100 text-gray-700";
}

// Refunds are full-only; the original payment remains SUCCESSFUL in the database.
function paymentSummary(order: Pick<BranchOrder, "status" | "totalAmount" | "payments">) {
  if (order.status === "CANCELLED") {
    return { label: "—", style: "text-gray-400" };
  }

  const refunds = (order.payments ?? []).flatMap((payment) => payment.refunds ?? []);
  if (refunds.some((refund) => refund.status === "PROCESSED")) {
    return { label: "REFUNDED", style: "bg-purple-100 text-purple-800" };
  }
  if (refunds.some((refund) => refund.status === "REQUESTED" || refund.status === "APPROVED")) {
    return { label: "REFUND PENDING", style: "bg-amber-100 text-amber-800" };
  }

  const paid = (order.payments ?? []).some(
    (payment) => payment.status === "SUCCESSFUL" && Number(payment.amount) >= Number(order.totalAmount),
  );
  if (paid) return { label: "PAID", style: "bg-green-100 text-green-800" };
  if (order.status === "COMPLETED") {
    return { label: "PAYMENT DUE", style: "bg-amber-100 text-amber-800" };
  }
  return { label: "NOT PAID", style: "bg-gray-100 text-gray-700" };
}

function refundStatusBadge(status: string) {
  const styles: Record<string, string> = {
    REQUESTED: "bg-amber-100 text-amber-800",
    APPROVED: "bg-blue-100 text-blue-800",
    PROCESSED: "bg-purple-100 text-purple-800",
    REJECTED: "bg-red-100 text-red-800",
  };
  return styles[status] ?? "bg-gray-100 text-gray-700";
}

export default function BranchOrders() {
  const [orders, setOrders] = useState<BranchOrder[]>([]);
  const [status, setStatus] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"ORDERS" | "REFUNDS">("ORDERS");
  const [selected, setSelected] = useState<any>(null);
  const [cancelTarget, setCancelTarget] = useState<BranchOrder | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load(next = status) {
    setLoading(true);
    setError("");
    try {
      setOrders(await getBranchOrders(next === "ALL" ? undefined : next));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(status); }, [status]);

  async function inspect(order: BranchOrder) {
    try {
      setSelected(await getBranchOrder(order.id));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load order details.");
    }
  }

  async function cancel() {
    if (!cancelTarget || reason.trim().length < 3) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await cancelBranchOrder(cancelTarget.id, reason.trim());
      setCancelTarget(null);
      setReason("");
      setMessage("Order cancelled. The backend has applied its inventory reversal rules.");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to cancel this order.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Orders</h1><p className="mt-1 text-sm text-gray-500">Review orders and payment status for your assigned branch.</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50"><RefreshCw size={16} />Refresh</button>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab("ORDERS")} className={`border-b-2 px-4 py-2 text-sm font-medium ${activeTab === "ORDERS" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"}`}>Orders</button>
        <button onClick={() => { setActiveTab("REFUNDS"); setStatus("ALL"); }} className={`border-b-2 px-4 py-2 text-sm font-medium ${activeTab === "REFUNDS" ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"}`}>Refunds</button>
      </div>

      {activeTab === "ORDERS" && <div className="flex flex-wrap gap-2">
        {statuses.map((item) => <button key={item} onClick={() => setStatus(item)} className={`rounded-lg px-3 py-2 text-sm ${status === item ? "bg-gray-900 text-white" : "border bg-white text-gray-700"}`}>{item === "ALL" ? "All orders" : item.replace("_", " ")}</button>)}
      </div>}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p>}

      {activeTab === "ORDERS" ? <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b p-5"><h2 className="font-semibold">Order history</h2><p className="mt-1 text-xs text-gray-500">Branch-scoped orders, newest first. Payment status reflects any processed refund.</p></div>
        {loading ? <p className="p-8 text-center text-sm text-gray-500">Loading orders…</p>
          : orders.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No orders found.</p>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Order", "Date", "Table", "Server", "Items", "Total", "Order status", "Payment status", "Actions"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody className="divide-y">
                {orders.map((order) => {
                  const payment = paymentSummary(order);
                  return <tr key={order.id}>
                    <td className="px-4 py-4 font-semibold">{order.orderNumber}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">{new Date(order.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-4">{order.table?.tableNumber ?? "—"}</td>
                    <td className="px-4 py-4">{order.server ? `${order.server.firstName} ${order.server.lastName}` : "—"}</td>
                    <td className="px-4 py-4">{order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0}</td>
                    <td className="px-4 py-4">${Number(order.totalAmount).toFixed(2)}</td>
                    <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>{order.status.replace("_", " ")}</span></td>
                    <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${payment.style}`}>{payment.label}</span></td>
                    <td className="px-4 py-4"><div className="flex gap-2">
                      <button onClick={() => void inspect(order)} className="rounded-md border p-2" title="View details"><Eye size={15} /></button>
                      {order.status === "NEW" && <button onClick={() => { setCancelTarget(order); setReason(""); }} className="rounded-md border border-red-200 p-2 text-red-700" title="Cancel order"><X size={15} /></button>}
                    </div></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
      </div> : <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b p-5"><h2 className="font-semibold">Refund history</h2><p className="mt-1 text-xs text-gray-500">Refund requests for orders in your assigned branch.</p></div>
        {loading ? <p className="p-8 text-center text-sm text-gray-500">Loading refunds…</p> : (() => {
          const refunds = orders.flatMap((order) => (order.payments ?? []).flatMap((payment) =>
            (payment.refunds ?? []).map((refund) => ({ ...refund, orderNumber: order.orderNumber }))
          )).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return refunds.length === 0 ? <p className="p-8 text-center text-sm text-gray-500">No refund records found.</p> : <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Order", "Requested", "Amount", "Reason", "Status", "Processed"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead>
              <tbody className="divide-y">{refunds.map((refund) => <tr key={refund.id}>
                <td className="px-4 py-4 font-semibold">{refund.orderNumber}</td>
                <td className="whitespace-nowrap px-4 py-4 text-gray-600">{new Date(refund.createdAt).toLocaleString()}</td>
                <td className="px-4 py-4">${Number(refund.amount).toFixed(2)}</td>
                <td className="max-w-xs px-4 py-4 text-gray-600">{refund.reason}</td>
                <td className="px-4 py-4"><span className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold ${refundStatusBadge(refund.status)}`}>{refund.status}</span></td>
                <td className="whitespace-nowrap px-4 py-4 text-gray-600">{refund.processedAt ? new Date(refund.processedAt).toLocaleString() : "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>;
        })()}
      </div>}

      {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
          <div className="flex justify-between gap-3"><div><h2 className="text-xl font-semibold">Order {selected.orderNumber}</h2><p className="text-sm text-gray-500">{selected.status} · {new Date(selected.createdAt).toLocaleString()}</p></div><button onClick={() => setSelected(null)} aria-label="Close order details"><X /></button></div>
          <div className="mt-5 space-y-3">{selected.items?.map((item: any) => <div key={item.id} className="flex justify-between border-b pb-3"><div><p className="font-medium">{item.menuItemNameSnapshot} × {item.quantity}</p><p className="text-xs text-gray-500">{item.sides?.map((side: any) => side.sideNameSnapshot).join(", ")}</p></div><p>${Number(item.lineSubtotal ?? item.lineTotal ?? 0).toFixed(2)}</p></div>)}</div>
          <div className="mt-5 rounded-lg bg-gray-50 p-4"><div className="flex justify-between font-semibold"><span>Order total</span><span>${Number(selected.totalAmount).toFixed(2)}</span></div><div className="mt-3 flex justify-between text-sm"><span>Payment status</span><span className={`rounded-md px-2 py-1 text-xs font-semibold ${paymentSummary(selected).style}`}>{paymentSummary(selected).label}</span></div></div>
        </div>
      </div>}

      {cancelTarget && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6">
          <h2 className="text-lg font-semibold">Cancel {cancelTarget.orderNumber}?</h2>
          <p className="mt-2 text-sm text-gray-600">Only NEW orders can be cancelled. If eligible, the backend reverses the original inventory deductions exactly once.</p>
          <label className="mt-4 block text-sm">Reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border p-3" placeholder="Enter a reason (at least 3 characters)" /></label>
          <div className="mt-4 flex justify-end gap-2"><button onClick={() => setCancelTarget(null)} className="rounded-lg border px-4 py-2">Keep order</button><button disabled={busy || reason.trim().length < 3} onClick={() => void cancel()} className="rounded-lg bg-red-700 px-4 py-2 text-white disabled:opacity-50">{busy ? "Cancelling…" : "Confirm cancellation"}</button></div>
        </div>
      </div>}
    </div>
  );
}
