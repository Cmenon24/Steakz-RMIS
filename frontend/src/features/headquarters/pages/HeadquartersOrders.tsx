import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { getBranches, getOrders, getOrder, type Branch, type Order } from "../headquarters.service";
import { money, date, errorText, PageTitle, LoadingError, Card, Select, Button, OrderTable, Info, Modal, Status } from "./hq-shared";

export function HeadquartersOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branch, setBranch] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [orderRows, branchRows] = await Promise.all([getOrders(), getBranches()]);
      setOrders(orderRows); setBranches(branchRows);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const branchNames = Object.fromEntries(branches.map(row => [row.id, row.name]));
  const rows = orders.filter(order =>
    (branch === "ALL" || order.branchId === branch) &&
    (status === "ALL" || order.status === status) &&
    `${order.orderNumber} ${branchNames[order.branchId ?? ""] ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  async function openOrder(order: Order) {
    setError("");
    try { setSelected(await getOrder(order.id)); }
    catch (e) { setError(errorText(e)); }
  }

  return <>
    <PageTitle title="Orders" subtitle="Monitor orders across all active restaurant branches." action={<Button variant="light" onClick={() => void load()}><RefreshCw size={15}/>Refresh</Button>}/>
    <div className="mb-4 flex flex-wrap gap-3">
      <label className="relative"><Search size={16} className="absolute left-3 top-2.5 text-gray-400"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search order or branch" className="rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400"/></label>
      <Select value={branch} onChange={setBranch}><option value="ALL">All branches</option>{branches.map(row => <option key={row.id} value={row.id}>{row.branchCode} · {row.name}</option>)}</Select>
      <Select value={status} onChange={setStatus}><option value="ALL">All statuses</option>{["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"].map(value => <option key={value}>{value}</option>)}</Select>
    </div>
    <LoadingError loading={loading} error={error} retry={() => void load()}/>
    {!loading && !error && <Card><OrderTable orders={rows} branchNames={branchNames} onSelect={order => void openOrder(order)}/><p className="mt-3 text-xs text-gray-500">Showing {rows.length} of {orders.length} orders. Headquarters order access is read-only.</p></Card>}
    {selected && <Modal title={`Order ${selected.orderNumber}`} close={() => setSelected(null)}>
      <div className="mb-3 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"><span className="text-sm font-medium text-gray-600">Order status</span><Status value={selected.status}/></div>
      <div className="mb-5 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm">
        <Info label="Branch" value={selected.branch?.name ?? branchNames[selected.branchId ?? ""] ?? "—"}/>
        <Info label="Table" value={selected.table?.tableNumber ?? "—"}/>
        <Info label="Server" value={selected.server ? `${selected.server.firstName} ${selected.server.lastName}` : "—"}/>
        <Info label="Submitted" value={date(selected.createdAt)}/>
        <Info label="Status" value={<Status value={selected.status}/>}/>
        <Info label="Order total" value={<span className="font-semibold">{money(selected.totalAmount)}</span>}/>
      </div>
      <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-gray-900">Order items</h3><span className="text-xs text-gray-500">{selected.items?.length ?? 0} line items</span></div>
      <div className="space-y-2">{selected.items?.map((item, index) => <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="flex items-start gap-2"><span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-gray-700 shadow-sm">{item.quantity}×</span><div><p className="text-sm font-semibold text-gray-800">{item.menuItemNameSnapshot}</p>{item.sides?.length ? <p className="mt-1 text-xs text-gray-500">Sides: {item.sides.map(side => side.sideNameSnapshot).join(", ")}</p> : null}</div></div><span className="text-sm font-semibold text-gray-800">{item.lineTotal !== undefined ? money(item.lineTotal) : "—"}</span></div>
      </div>)}</div>
      <div className="mt-4 flex items-center justify-between border-t pt-4"><span className="text-sm font-semibold text-gray-700">Total</span><span className="text-lg font-bold text-gray-900">{money(selected.totalAmount)}</span></div>
      <p className="mt-3 text-xs text-gray-500">Order details are read-only for Headquarters Managers.</p>
    </Modal>}
  </>;
}
