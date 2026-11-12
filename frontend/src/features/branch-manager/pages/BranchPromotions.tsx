import { useEffect, useState } from "react";
import { getPromotion, getPromotions } from "../branch-manager.service";

function promotionStatusStyle(status: string) {
  if (status === "ACTIVE") return "bg-green-100 text-green-800";
  if (status === "SCHEDULED") return "bg-blue-100 text-blue-800";
  return "bg-gray-200 text-gray-600";
}

export default function BranchPromotions() {
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      setRows(await getPromotions() as any[]);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load promotions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function view(id: string) {
    try {
      setSelected(await getPromotion(id));
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Unable to load promotion.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Promotions</h1><p className="mt-1 text-sm text-gray-500">View promotions assigned to your branch.</p></div>
        <button onClick={() => void load()} disabled={loading} className="rounded-lg border bg-white px-4 py-2 text-sm disabled:opacity-50">Refresh</button>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="p-6 text-sm text-gray-500">Loading promotions…</p>
        : rows.length === 0 ? <p className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">No promotions are assigned to this branch.</p>
        : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((promotion) => <article key={promotion.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex justify-between gap-2">
              <h2 className="font-semibold text-gray-900">{promotion.name}</h2>
              <span className={`h-fit rounded-md px-2 py-1 text-xs font-semibold ${promotionStatusStyle(promotion.status)}`}>{promotion.status}</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">{promotion.description || "No description provided."}</p>
            <p className="mt-4 text-2xl font-bold text-gray-900">{promotion.discountType === "PERCENTAGE" ? `${promotion.discountValue}%` : `$${Number(promotion.discountValue).toFixed(2)}`} <span className="text-sm font-normal text-gray-500">discount</span></p>
            <p className="mt-3 text-xs text-gray-500">{new Date(promotion.startDate).toLocaleString()} – {new Date(promotion.endDate).toLocaleString()}</p>
            <button onClick={() => void view(promotion.id)} className="mt-4 rounded-lg bg-[#1F2937] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#111827]">View details</button>
          </article>)}
        </div>}

      {selected && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
          <div className="flex justify-between gap-3"><h2 className="text-xl font-semibold text-gray-900">{selected.name}</h2><button onClick={() => setSelected(null)} className="text-sm text-gray-500 hover:text-gray-900">Close</button></div>
          <p className="mt-2 text-sm text-gray-600">{selected.description || "No description provided."}</p>
          <div className="mt-4 space-y-3 text-sm">
            <p><b>Status:</b> <span className={`rounded-md px-2 py-1 text-xs font-semibold ${promotionStatusStyle(selected.status)}`}>{selected.status}</span></p>
            <p><b>Discount:</b> {selected.discountType} · {selected.discountValue}</p>
            <p><b>Start:</b> {new Date(selected.startDate).toLocaleString()}</p>
            <p><b>End:</b> {new Date(selected.endDate).toLocaleString()}</p>
            <p className="font-semibold">Eligible menu items</p>
            {selected.items?.length ? selected.items.map((item: any) => <p key={item.id} className="text-gray-600">{item.menuItem?.name ?? "Menu item"}</p>) : <p className="text-gray-500">No eligible items listed.</p>}
          </div>
        </div>
      </div>}
    </div>
  );
}
