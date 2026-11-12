import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import {
  getAdminAuditLogs,
  type AdminAuditLog,
  type AuditLogResult,
} from "../admin.service";

interface AuditFilters {
  action: string;
  entityType: string;
  startDate: string;
  endDate: string;
}

// These are the entity types currently written by the backend audit services.
// Keeping this list independent of the current result page prevents options
// disappearing after a filter returns only one entity type.
const KNOWN_ENTITY_TYPES = [
  "BRANCH",
  "InventoryTransaction",
  "Order",
  "Payment",
  "Promotion",
  "Recipe",
  "RecipeVersion",
  "Refund",
  "Stocktake",
  "StocktakeItem",
  "USER",
];

const EMPTY_FILTERS: AuditFilters = {
  action: "",
  entityType: "",
  startDate: "",
  endDate: "",
};

function apiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (
      error as {
        response?: { data?: { message?: string; error?: string } };
      }
    ).response?.data;

    if (data?.message || data?.error) {
      return data.message || data.error || fallback;
    }
  }

  return error instanceof Error ? error.message : fallback;
}

function prettyDate(value: string) {
  return new Date(value).toLocaleString();
}

function detailText(details: unknown) {
  if (details == null) return "No additional details";
  if (typeof details === "string") return details;

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

// Convert the date-only form values to inclusive ISO date boundaries.
function toApiFilters(filters: AuditFilters) {
  return {
    ...(filters.action.trim() ? { action: filters.action.trim() } : {}),
    ...(filters.entityType.trim()
      ? { entityType: filters.entityType.trim() }
      : {}),
    ...(filters.startDate
      ? {
          startDate: new Date(
            `${filters.startDate}T00:00:00`,
          ).toISOString(),
        }
      : {}),
    ...(filters.endDate
      ? {
          endDate: new Date(
            `${filters.endDate}T23:59:59.999`,
          ).toISOString(),
        }
      : {}),
  };
}

export default function AuditLogs() {
  const [result, setResult] = useState<AuditLogResult>({
    logs: [],
    pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Draft values are what the user is currently editing in the filter form.
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Applied values are the filters currently used to retrieve the table data.
  // Pagination and Refresh reuse these rather than accidentally using drafts.
  const [appliedFilters, setAppliedFilters] =
    useState<AuditFilters>(EMPTY_FILTERS);

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminAuditLog | null>(null);

  async function loadLogs(
    nextPage: number,
    filters: AuditFilters,
  ): Promise<void> {
    setLoading(true);
    setError("");

    try {
      const logs = await getAdminAuditLogs({
        page: nextPage,
        limit: 25,
        ...toApiFilters(filters),
      });

      setResult(logs);
      setPage(logs.pagination.page);
    } catch (requestError) {
      setError(apiError(requestError, "Unable to load audit logs."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs(1, EMPTY_FILTERS);
  }, []);

  // Keep known options available even when the current filtered result contains
  // only one entity type. Include any additional types returned by the API too.
  const entityTypes = useMemo(
    () =>
      Array.from(
        new Set([
          ...KNOWN_ENTITY_TYPES,
          ...result.logs.map((log) => log.entityType),
        ]),
      ).sort((a, b) => a.localeCompare(b)),
    [result.logs],
  );

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextFilters: AuditFilters = {
      action,
      entityType,
      startDate,
      endDate,
    };

    setAppliedFilters(nextFilters);
    void loadLogs(1, nextFilters);
  }

  function clearFilters() {
    // Clear the form and immediately request the unfiltered audit history.
    setAction("");
    setEntityType("");
    setStartDate("");
    setEndDate("");
    setAppliedFilters(EMPTY_FILTERS);
    setSelected(null);
    void loadLogs(1, EMPTY_FILTERS);
  }

  function refreshLogs() {
    void loadLogs(page, appliedFilters);
  }

  function goToPage(nextPage: number) {
    void loadLogs(nextPage, appliedFilters);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review system activity and administrative changes across branches.
          </p>
        </div>
        <button
          type="button"
          onClick={refreshLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Matching Records</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {result.pagination.total}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Current Page</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {result.pagination.page}
            <span className="text-base font-normal text-gray-400">
              {" "}
              / {Math.max(result.pagination.totalPages, 1)}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Records Per Page</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {result.pagination.limit}
          </p>
        </div>
      </div>

      <form
        onSubmit={applyFilters}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-5"
      >
        <div className="flex items-center gap-2">
          <Search size={18} className="text-gray-500" />
          <h2 className="font-semibold text-gray-900">Filter audit history</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-gray-700">
            Action contains
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="e.g. USER_UPDATED"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-gray-700">
            Entity type
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All entity types</option>
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-gray-700">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-gray-700">
            End date
            <input
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={clearFilters}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
          >
            Clear filters
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Apply filters
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} />
            <h2 className="font-semibold text-gray-900">Activity History</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Newest events appear first. Select a record to inspect its details.
          </p>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-gray-500">
            Loading audit history…
          </p>
        ) : result.logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">
            No audit records found for these filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Date &amp; time</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Performed by</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {prettyDate(log.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-800">
                        {log.entityType}
                      </p>
                      <p className="max-w-[150px] truncate text-xs text-gray-500">
                        {log.entityId}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {log.user ? (
                        <>
                          <p className="font-medium text-gray-800">
                            {log.user.firstName} {log.user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.user.email}
                          </p>
                        </>
                      ) : (
                        <span className="text-gray-500">System</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {log.branch
                        ? `${log.branch.branchCode} — ${log.branch.name}`
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(log)}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
          <p className="text-xs text-gray-500">
            {result.pagination.total === 0
              ? "No records"
              : `Showing ${
                  (page - 1) * result.pagination.limit + 1
                }–${Math.min(
                  page * result.pagination.limit,
                  result.pagination.total,
                )} of ${result.pagination.total}`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => goToPage(page - 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= result.pagination.totalPages || loading}
              onClick={() => goToPage(page + 1)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Audit Record Details</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {prettyDate(selected.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Close audit record details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Action</p>
                  <p className="mt-1 font-medium">{selected.action}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Entity type</p>
                  <p className="mt-1 font-medium">{selected.entityType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Entity ID</p>
                  <p className="mt-1 break-all text-sm">{selected.entityId}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Actor</p>
                  <p className="mt-1 text-sm">
                    {selected.user
                      ? `${selected.user.firstName} ${selected.user.lastName} (${selected.user.role})`
                      : "System"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Branch</p>
                  <p className="mt-1 text-sm">
                    {selected.branch?.name ?? "Not branch-specific"}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Recorded details
                </p>
                <pre className="max-h-72 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
                  {detailText(selected.details)}
                </pre>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
