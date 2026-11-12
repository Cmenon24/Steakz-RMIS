import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw, Building2, ChevronDown, ChevronUp, MapPin, Phone, Mail } from "lucide-react";
import { getBranches, getAllTables, getSalesReport, getInventoryReport, type Branch } from "../headquarters.service";
import { type AnyRecord, money, errorText, PageTitle, LoadingError, Card, Status, Select, Button, Info, SearchInput } from "./hq-shared";

export function HeadquartersBranches() {
  const location = useLocation();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tables, setTables] = useState<AnyRecord[]>([]);
  const [stock, setStock] = useState<AnyRecord[]>([]);
  const [sales, setSales] = useState<AnyRecord[]>([]);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [branchRows, tableResponse, inventoryResponse, salesResponse] = await Promise.all([
        getBranches(), getAllTables(), getInventoryReport(), getSalesReport({ period: "thisMonth" }),
      ]);
      setBranches(branchRows);
      setTables(Array.isArray(tableResponse) ? tableResponse : (tableResponse as AnyRecord)?.tables ?? []);
      setStock((inventoryResponse as AnyRecord).branches ?? []);
      setSales((salesResponse as AnyRecord).branches ?? []);
    } catch (e) { setError(errorText(e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const state = location.state as { branchId?: string; showInventory?: boolean } | null;
    if (state?.branchId) setExpanded(state.branchId);
  }, [location.state]);

  const visible = useMemo(() => branches.filter(branch => {
    const statusMatch = status === "ALL" || (status === "ACTIVE" ? branch.isActive : !branch.isActive);
    const query = `${branch.branchCode} ${branch.name} ${branch.address} ${branch.email}`.toLowerCase();
    return statusMatch && query.includes(search.toLowerCase());
  }), [branches, status, search]);

  const activeCount = branches.filter(branch => branch.isActive).length;
  const inactiveCount = branches.length - activeCount;

  return <>
    <PageTitle title="Branch Overview" subtitle="Review branch details, sales performance, tables and inventory attention across locations." action={<Button variant="light" onClick={() => void load()}><RefreshCw size={15}/>Refresh</Button>}/>
    <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card><p className="text-sm text-gray-500">Total branches</p><p className="mt-2 text-3xl font-bold text-gray-900">{branches.length}</p></Card>
      <Card><p className="text-sm text-gray-500">Active branches</p><p className="mt-2 text-3xl font-bold text-green-700">{activeCount}</p></Card>
      <Card><p className="text-sm text-gray-500">Inactive branches</p><p className="mt-2 text-3xl font-bold text-gray-500">{inactiveCount}</p></Card>
    </div>
    <div className="mb-4 flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <SearchInput value={search} onChange={setSearch} placeholder="Search code, name, address or email"/>
      <Select value={status} onChange={setStatus}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></Select>
    </div>
    <LoadingError loading={loading} error={error} retry={() => void load()}/>
    {!loading && !error && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {visible.map(branch => {
        const inv = stock.find(row => row.branch.id === branch.id);
        const sale = sales.find(row => row.branch.id === branch.id);
        const branchTables = tables.filter((table: AnyRecord) => table.branchId === branch.id);
        const lowItems = (inv?.inventory ?? []).filter((item: AnyRecord) => item.stockStatus === "LOW_STOCK" || item.stockStatus === "OUT_OF_STOCK");
        const isExpanded = expanded === branch.id;
        return <Card key={branch.id} className={isExpanded ? "ring-1 ring-gray-300" : ""}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-gray-900">{branch.name}</h2><Status value={branch.isActive ? "ACTIVE" : "INACTIVE"}/></div><p className="mt-1 text-xs font-semibold text-gray-500">{branch.branchCode}</p></div>
            <Building2 className="text-gray-400"/>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Info label="Tables" value={branchTables.length}/>
            <Info label="Net sales · this month" value={money(sale?.summary?.netSales)}/>
            <Info label="Low stock" value={<span className="font-semibold text-amber-700">{inv?.summary?.lowStockCount ?? 0}</span>}/>
            <Info label="Out of stock" value={<span className="font-semibold text-red-700">{inv?.summary?.outOfStockCount ?? 0}</span>}/>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <span className="text-xs text-gray-500">{inv?.summary?.unresolvedAlertCount ?? 0} unresolved inventory alerts</span>
            <button onClick={() => setExpanded(isExpanded ? null : branch.id)} className="inline-flex items-center gap-1 text-sm font-semibold text-gray-700 hover:text-red-700">{isExpanded ? "Hide details" : "View branch details"}{isExpanded ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}</button>
          </div>
          {isExpanded && <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Info label="Created" value={(branch as AnyRecord).createdAt ? new Date((branch as AnyRecord).createdAt).toLocaleDateString() : "—"}/>
              <Info label="Address" value={<span className="inline-flex gap-1"><MapPin size={14}/>{branch.address || "—"}</span>}/>
              <Info label="Contact" value={<span className="inline-flex gap-1"><Phone size={14}/>{branch.contactNumber || "—"}</span>}/>
              <Info label="Email" value={<span className="inline-flex gap-1 break-all"><Mail size={14}/>{branch.email || "—"}</span>}/>
              <Info label="Time zone" value={branch.timeZone}/>
            </div>
            <div><h3 className="mb-2 text-sm font-semibold text-gray-800">Table overview</h3><div className="flex flex-wrap gap-2 text-xs"><Status value="AVAILABLE"/><span>{branchTables.filter((table: AnyRecord) => table.status === "AVAILABLE").length}</span><Status value="OCCUPIED"/><span>{branchTables.filter((table: AnyRecord) => table.status === "OCCUPIED").length}</span><Status value="INACTIVE"/><span>{branchTables.filter((table: AnyRecord) => table.status === "INACTIVE").length}</span></div></div>
            <div><h3 className="mb-2 text-sm font-semibold text-gray-800">Inventory attention</h3>{lowItems.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase text-gray-500"><tr><th className="py-2">Ingredient</th><th>On hand</th><th>Minimum</th><th>Status</th></tr></thead><tbody>{lowItems.map((item: AnyRecord) => <tr key={item.ingredientId} className="border-b border-gray-100"><td className="py-2">{item.ingredient}</td><td>{item.quantityOnHand} {item.unit}</td><td>{item.minimumStockLevel} {item.unit}</td><td><Status value={item.stockStatus}/></td></tr>)}</tbody></table></div> : <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">No low-stock or out-of-stock ingredients reported.</p>}</div>
          </div>}
        </Card>;
      })}
      {!visible.length && <Card>No branches match the selected search and status filters.</Card>}
    </div>}
  </>;
}
