import { useEffect, useRef, type ReactNode, type ElementType } from "react";
import type { Order } from "../headquarters.service";

export type AnyRecord = Record<string, any>;

export const money = (value: unknown) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value ?? 0));

export const date = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : "—";

export const errorText = (error: unknown) => {
  const value = error as { response?: { data?: { message?: string } }; message?: string };
  return value.response?.data?.message ?? value.message ?? "Something went wrong. Please try again.";
};

export function PageTitle({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="text-2xl font-bold text-gray-900">{title}</h1><p className="mt-1 text-sm text-gray-500">{subtitle}</p></div>{action}
  </div>;
}

export function Notice({ message, error = false, onDismiss }: { message: string; error?: boolean; onDismiss?: () => void }) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  // Successful confirmations disappear automatically; errors remain until dismissed.
  useEffect(() => {
    if (!message || error || !onDismiss) return;
    const timer = window.setTimeout(() => dismissRef.current?.(), 4000);
    return () => window.clearTimeout(timer);
  }, [message, error, Boolean(onDismiss)]);

  if (!message) return null;
  return <div role={error ? "alert" : "status"} className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
    <span>{message}</span>{onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="font-semibold">×</button>}
  </div>;
}

export function LoadingError({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (loading) return <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading information...</p>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}<button onClick={retry} className="ml-3 font-semibold underline">Try again</button></div>;
  return null;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

const statusStyles: Record<string, string> = {
  NEW: "bg-red-100 text-red-700", PREPARING: "bg-amber-100 text-amber-800",
  READY: "bg-blue-100 text-blue-700", COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600", ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-600", DRAFT: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-green-100 text-green-700", ARCHIVED: "bg-gray-100 text-gray-600",
  SCHEDULED: "bg-blue-100 text-blue-700", EXPIRED: "bg-gray-100 text-gray-600",
  LOW_STOCK: "bg-amber-100 text-amber-800", OUT_OF_STOCK: "bg-red-100 text-red-700",
  IN_STOCK: "bg-green-100 text-green-700", AVAILABLE: "bg-green-100 text-green-700", OCCUPIED: "bg-amber-100 text-amber-800", REQUESTED: "bg-amber-100 text-amber-800",
  PROCESSED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700",
};
export function Status({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[value] ?? "bg-gray-100 text-gray-700"}`}>{value.replaceAll("_", " ")}</span>;
}

export function Select({ value, onChange, children, className = "" }: { value: string; onChange: (value: string) => void; children: ReactNode; className?: string }) {
  return <select value={value} onChange={event => onChange(event.target.value)} className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-gray-500 ${className}`}>{children}</select>;
}

export function Button({ children, onClick, variant = "dark", disabled = false, type = "button" }: { children: ReactNode; onClick?: () => void; variant?: "dark" | "light" | "red"; disabled?: boolean; type?: "button" | "submit" }) {
  const style = variant === "dark" ? "bg-[#1F2937] text-white hover:bg-gray-700" : variant === "red" ? "bg-red-700 text-white hover:bg-red-800" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${style}`}>{children}</button>;
}

export function Kpi({ icon: Icon, label, value, detail, alert = false }: { icon: ElementType; label: string; value: ReactNode; detail?: string; alert?: boolean }) {
  return <Card><div className="flex items-center justify-between"><p className="text-sm text-gray-500">{label}</p><span className={`rounded-lg p-2 ${alert ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}><Icon size={19}/></span></div><p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>{detail && <p className="mt-1 text-xs text-gray-500">{detail}</p>}</Card>;
}

export function ActionIcon({ label, onClick, danger = false, children, disabled = false }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode; disabled?: boolean }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${danger ? "border-red-200 text-red-600 hover:bg-red-50" : "border-[#1F2937]/25 text-[#1F2937] hover:border-[#1F2937] hover:bg-gray-50"}`}>{children}</button>;
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="min-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"/>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700"><span className="mb-1.5 block">{label}</span>{children}</label>;
}

export const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-gray-500";
export function Modal({ title, close, children, size = "max-w-2xl" }: { title: string; close: () => void; children: ReactNode; size?: string }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div className={`max-h-[90vh] w-full ${size} overflow-y-auto rounded-xl bg-white shadow-xl`}>
      <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4"><h2 className="font-semibold text-gray-900">{title}</h2><button type="button" onClick={close} aria-label="Close dialog" className="text-xl text-gray-500 hover:text-gray-900">×</button></div>
      <div className="p-5">{children}</div>
    </div>
  </div>;
}

export function OrderTable({ orders, branchNames = {}, onSelect }: { orders: Order[]; branchNames?: Record<string, string>; onSelect?: (order: Order) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
    <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500"><tr>{["Order", "Branch", "Table", "Server", "Submitted", "Total", "Status"].map(label => <th key={label} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
    <tbody className="divide-y divide-gray-100">{orders.map(order => <tr key={order.id} onClick={() => onSelect?.(order)} className={`${onSelect ? "cursor-pointer" : ""} hover:bg-gray-50`}>
      <td className="px-3 py-3 font-semibold text-gray-800">{order.orderNumber}</td><td className="px-3 py-3 text-gray-600">{order.branch?.name ?? branchNames[order.branchId ?? ""] ?? "—"}</td>
      <td className="px-3 py-3 text-gray-600">{order.table?.tableNumber ?? "—"}</td><td className="px-3 py-3 text-gray-600">{order.server ? `${order.server.firstName} ${order.server.lastName}` : "—"}</td>
      <td className="px-3 py-3 text-gray-600">{date(order.createdAt)}</td><td className="px-3 py-3 text-gray-700">{money(order.totalAmount)}</td><td className="px-3 py-3"><Status value={order.status}/></td>
    </tr>)}{!orders.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No orders found.</td></tr>}</tbody>
  </table></div>;
}

export function Info({ label, value }: { label: string; value: ReactNode }) {
  return <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p><p className="mt-1 break-words text-sm text-gray-800">{value}</p></div>;
}

export function ProfileInfo({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return <div className="flex items-start gap-3 border-b border-gray-100 py-4"><div className="rounded-lg bg-gray-100 p-2 text-gray-600"><Icon size={18}/></div><div><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p><p className="mt-1 break-words text-sm font-medium text-gray-900">{value}</p></div></div>;
}
