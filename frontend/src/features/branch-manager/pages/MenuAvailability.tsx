import { useEffect, useMemo, useState } from "react";
import { History, RefreshCw, X } from "lucide-react";
import { useAuth } from "../../../hooks/AuthContext";
import { getBranchMenuAvailability, getMenuAvailabilityHistory } from "../branch-manager.service";

type AvailabilityRow = {
  id: string;
  isAvailable: boolean;
  isBlockedByStock: boolean;
  requiresReactivationConfirmation: boolean;
  updatedAt?: string;
  menuItem: {
    id: string;
    name: string;
    price: number | string;
    isActive: boolean;
    category?: { name: string };
  };
};

type HistoryRow = {
  id: string;
  menuItem?: { id: string; name: string };
  previousIsAvailable: boolean | null;
  newIsAvailable: boolean | null;
  previousIsBlockedByStock: boolean | null;
  newIsBlockedByStock: boolean | null;
  previousRequiresReactivationConfirmation: boolean | null;
  newRequiresReactivationConfirmation: boolean | null;
  reason: string | null;
  changedAt: string;
  changedBy?: { firstName: string; lastName: string } | null;
};

function isCurrentlyAvailable(row: AvailabilityRow) {
  return row.isAvailable && !row.isBlockedByStock && !row.requiresReactivationConfirmation;
}

export default function MenuAvailability() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItemFilter, setHistoryItemFilter] = useState("");
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  // Load the assigned branch's menu availability records.
  async function load() {
    if (!user?.branchId) return;
    setLoading(true);
    setError("");
    try {
      const result = await getBranchMenuAvailability(user.branchId) as any;
      setRows(Array.isArray(result) ? result : result.availability ?? []);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load branch menu availability.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [user?.branchId]);

  const categories = useMemo(
    () => [...new Set(rows.map((row) => row.menuItem?.category?.name).filter(Boolean))].sort(),
    [rows],
  );

  const filteredRows = useMemo(() => rows.filter((row) => {
    const name = row.menuItem?.name ?? "";
    const category = row.menuItem?.category?.name ?? "";
    const available = isCurrentlyAvailable(row);
    const matchesName = name.toLowerCase().includes(itemFilter.trim().toLowerCase());
    const matchesCategory = !categoryFilter || category === categoryFilter;
    const matchesAvailability =
      availabilityFilter === "ALL" ||
      (availabilityFilter === "AVAILABLE" && available) ||
      (availabilityFilter === "UNAVAILABLE" && !available);
    return matchesName && matchesCategory && matchesAvailability;
  }), [rows, itemFilter, categoryFilter, availabilityFilter]);

  // Load branch-wide history or limit it to one menu item.
  async function viewHistory(row?: AvailabilityRow) {
    if (!user?.branchId) return;
    setHistoryItemFilter(row?.menuItem.id ?? "");
    setHistory([]);
    setHistoryError("");
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const result = await getMenuAvailabilityHistory(user.branchId) as any;
      setHistory(Array.isArray(result) ? result : []);
    } catch (err: any) {
      setHistoryError(err.response?.data?.message ?? "Unable to load availability history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  const visibleHistory = useMemo(
    () => history.filter((entry) => !historyItemFilter || entry.menuItem?.id === historyItemFilter),
    [history, historyItemFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Availability</h1>
          <p className="mt-1 text-sm text-gray-500">Review centrally managed menu availability for {user?.branchName ?? "your branch"}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => void viewHistory()} disabled={historyLoading || !user?.branchId} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <History size={16} />Availability history
          </button>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">Branch menu items</h2>
          <p className="mt-1 text-xs text-gray-500">View-only for Branch Managers. Availability changes are controlled by Headquarters.</p>
        </div>

        <div className="grid gap-3 border-b border-gray-200 bg-gray-50 p-5 md:grid-cols-3">
          <label className="text-xs font-medium text-gray-600">
            Search menu item
            <input value={itemFilter} onChange={(event) => setItemFilter(event.target.value)} placeholder="Enter menu item name" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Category
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">
            Availability
            <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
              <option value="ALL">All statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="UNAVAILABLE">Unavailable</option>
            </select>
          </label>
        </div>

        {loading ? <p className="p-6 text-sm text-gray-500">Loading menu availability…</p>
          : filteredRows.length === 0 ? <p className="p-6 text-sm text-gray-500">{rows.length ? "No menu items match these filters." : "No menu availability records were returned."}</p>
          : <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>{["Menu item", "Category", "Price", "Availability", "Stock restriction", "History"].map((heading) => <th key={heading} className="px-5 py-3">{heading}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRows.map((row) => {
                  const available = isCurrentlyAvailable(row);
                  return <tr key={row.id}>
                    <td className="px-5 py-4 font-medium text-gray-900">{row.menuItem?.name ?? "Menu item"}</td>
                    <td className="px-5 py-4">{row.menuItem?.category?.name ?? "—"}</td>
                    <td className="px-5 py-4">{row.menuItem?.price != null ? `$${Number(row.menuItem.price).toFixed(2)}` : "—"}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${available ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                        {available ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {row.isBlockedByStock ? "Blocked by stock" : row.requiresReactivationConfirmation ? "Requires HQ confirmation" : "—"}
                    </td>
                    <td className="px-5 py-4"><button onClick={() => void viewHistory(row)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50">View history</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
      </section>

      {historyOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <section role="dialog" aria-modal="true" aria-labelledby="availability-history-title" className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
            <div>
              <h2 id="availability-history-title" className="font-semibold text-gray-900">Availability history</h2>
              <p className="mt-1 text-xs text-gray-500">Recorded menu availability changes for {user?.branchName ?? "your branch"}.</p>
            </div>
            <button onClick={() => setHistoryOpen(false)} aria-label="Close history" className="rounded-md p-1 text-gray-500 hover:bg-gray-100"><X size={20} /></button>
          </div>

          <div className="border-b border-gray-200 bg-gray-50 p-4">
            <label className="block max-w-sm text-xs font-medium text-gray-600">
              Filter by menu item
              <select value={historyItemFilter} onChange={(event) => setHistoryItemFilter(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                <option value="">All menu items</option>
                {rows.map((row) => <option key={row.menuItem.id} value={row.menuItem.id}>{row.menuItem.name}</option>)}
              </select>
            </label>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {historyLoading ? <p className="p-6 text-sm text-gray-500">Loading history…</p>
              : historyError ? <p className="p-6 text-sm text-red-700">{historyError}</p>
              : visibleHistory.length === 0 ? <p className="p-6 text-sm text-gray-500">No recorded availability changes were found{historyItemFilter ? " for this item" : " for this branch"}.</p>
              : <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>{["Menu item", "Change", "Stock restriction", "Reason", "Changed by", "Date / time"].map((heading) => <th key={heading} className="px-4 py-3">{heading}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {visibleHistory.map((entry) => <tr key={entry.id}>
                      <td className="px-4 py-4 font-medium text-gray-900">{entry.menuItem?.name ?? "Menu item"}</td>
                      <td className="px-4 py-4 text-gray-700">{entry.previousIsAvailable === null ? "Initial record" : `${entry.previousIsAvailable ? "Available" : "Unavailable"} → ${entry.newIsAvailable ? "Available" : "Unavailable"}`}</td>
                      <td className="px-4 py-4 text-gray-700">{entry.previousIsBlockedByStock === entry.newIsBlockedByStock ? "No change" : `${entry.previousIsBlockedByStock ? "Blocked" : "Not blocked"} → ${entry.newIsBlockedByStock ? "Blocked" : "Not blocked"}`}</td>
                      <td className="px-4 py-4 text-gray-700">{entry.reason || "—"}</td>
                      <td className="px-4 py-4 text-gray-700">{entry.changedBy ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}` : "System"}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-gray-600">{new Date(entry.changedAt).toLocaleString()}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>}
          </div>
          <div className="flex justify-end border-t border-gray-200 p-4">
            <button onClick={() => setHistoryOpen(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Close</button>
          </div>
        </section>
      </div>}
    </div>
  );
}
