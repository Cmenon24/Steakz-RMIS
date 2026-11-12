import { useEffect, useState } from "react";
import { useAuth } from "../../../hooks/AuthContext";
import {
  completeStocktake,
  getStocktake,
  getStocktakes,
  saveStocktakeCount,
  startStocktake,
  type Stocktake,
} from "../branch-manager.service";

export default function Stocktakes() {
  const { user } = useAuth();
  const branchId = user?.branchId ?? "";

  const [rows, setRows] = useState<Stocktake[]>([]);
  const [active, setActive] = useState<Stocktake | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    if (!branchId) return;

    setLoading(true);
    setError("");
    try {
      setRows(await getStocktakes(branchId));
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Unable to load stocktakes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [branchId]);

  // Automatically dismiss success messages after four seconds.
  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [message]);

  async function open(id: string) {
    setError("");
    try {
      const detail = await getStocktake(branchId, id);
      setActive(detail);

      const initial: Record<string, string> = {};
      detail.items?.forEach((item) => {
        initial[item.ingredientId] =
          item.actualQuantity == null ? "" : String(item.actualQuantity);
      });
      setCounts(initial);
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Unable to load stocktake.");
    }
  }

  async function begin() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const created = await startStocktake(branchId);
      await load();
      if (created?.id) await open(created.id);
      setMessage("Stocktake started.");
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Unable to start stocktake.");
    } finally {
      setBusy(false);
    }
  }

  // Only save counts that have changed since the last successful save.
  const changedItems = (active?.items ?? []).filter((item) => {
    const value = counts[item.ingredientId] ?? "";
    if (value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
      return false;
    }

    return (
      item.actualQuantity == null ||
      Number(value) !== Number(item.actualQuantity)
    );
  });

  const hasUnsavedChanges = changedItems.length > 0;
  const allCountsSaved = Boolean(
    active?.items?.length &&
      active.items.every((item) => {
        const value = counts[item.ingredientId] ?? "";
        return (
          value.trim() !== "" &&
          Number.isFinite(Number(value)) &&
          Number(value) >= 0 &&
          item.actualQuantity != null &&
          Number(value) === Number(item.actualQuantity)
        );
      }),
  );

  async function saveProgress() {
    if (!active || changedItems.length === 0) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      // The existing API saves one ingredient per request, so submit each changed count.
      for (const item of changedItems) {
        await saveStocktakeCount(
          branchId,
          active.id,
          item.ingredientId,
          Number(counts[item.ingredientId]),
        );
      }

      await open(active.id);
      setMessage("Stocktake progress saved.");
    } catch (e: any) {
      // Reload to show any counts that were saved before a request failed.
      await open(active.id);
      setError(e.response?.data?.message ?? "Unable to save all stocktake counts.");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!active || !allCountsSaved) return;

    if (
      !window.confirm(
        "Complete this stocktake? This applies the recorded stocktake adjustments.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");
    try {
      await completeStocktake(branchId, active.id);
      setActive(null);
      setCounts({});
      setMessage("Stocktake completed.");
      await load();
    } catch (e: any) {
      setError(e.response?.data?.message ?? "Unable to complete stocktake.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stocktakes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Count physical stock and reconcile branch inventory.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => void begin()}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Start stocktake
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      {message && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          {message}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-5">
          <h2 className="font-semibold">Stocktake history</h2>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-500">Loading stocktakes…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No stocktakes recorded yet.
          </p>
        ) : (
          <div className="divide-y">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 p-5"
              >
                <div>
                  <p className="font-medium">
                    {row.referenceNumber ?? row.id}
                  </p>
                  <p className="text-xs text-gray-500">
                    {row.startedAt
                      ? new Date(row.startedAt).toLocaleString()
                      : "Date unavailable"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      row.status === "IN_PROGRESS"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {row.status}
                  </span>
                  <button
                    onClick={() => void open(row.id)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    View counts
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {active && (
        <section className="overflow-hidden rounded-xl border bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
            <div>
              <h2 className="font-semibold">Stocktake details</h2>
              <p className="text-xs text-gray-500">
                {active.referenceNumber ?? active.id} · {active.status}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActive(null)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Close
              </button>
              {active.status === "IN_PROGRESS" && (
                <>
                  <button
                    disabled={busy || !hasUnsavedChanges}
                    onClick={() => void saveProgress()}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save progress"}
                  </button>
                  <button
                    disabled={busy || !allCountsSaved}
                    onClick={() => void finish()}
                    className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-600 disabled:text-white disabled:opacity-100"
                  >
                    Complete stocktake
                  </button>
                </>
              )}
            </div>
          </div>

          {active.items?.length ? (
            <div className="divide-y">
              {active.items.map((item) => (
                <div
                  key={item.ingredientId}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium">
                      {item.ingredient?.name ?? "Ingredient"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expected: {Number(item.systemQuantityAtCount)}{" "}
                      {item.ingredient?.unit ?? ""} · Actual: {item.actualQuantity ?? "Not counted"}
                      {item.ingredient?.unit ? ` ${item.ingredient.unit}` : ""}
                    </p>
                  </div>

                  {active.status === "IN_PROGRESS" && (
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={counts[item.ingredientId] ?? ""}
                      onChange={(event) =>
                        setCounts((current) => ({
                          ...current,
                          [item.ingredientId]: event.target.value,
                        }))
                      }
                      placeholder="Actual count"
                      aria-label={`Actual count for ${item.ingredient?.name ?? "ingredient"}`}
                      className="w-36 rounded-lg border px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="p-5 text-sm text-gray-500">
              No count lines were returned for this stocktake.
            </p>
          )}

          {active.status === "IN_PROGRESS" && (
            <div className="border-t bg-gray-50 px-5 py-3 text-xs text-gray-600">
              Enter the physical counts, then select Save progress. You must save
              every ingredient before completing the stocktake.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
