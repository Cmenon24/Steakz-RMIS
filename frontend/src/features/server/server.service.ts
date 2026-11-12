import api from "../../services/api";

export interface ServerMenuItem {
  id: string; name: string; description?: string | null; price: number | string;
  category: { id: string; name: string };
}
export interface ServerTable {
  id: string; tableNumber: string; capacity: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "INACTIVE";
}
export interface ServerOrderItem {
  id?: string; menuItemId: string; menuItemNameSnapshot: string; quantity: number;
  unitPriceSnapshot: number | string; lineTotal: number | string;
  sides?: Array<{ sideNameSnapshot: string }>;
}
export interface ServerOrder {
  id: string; orderNumber: string; status: string; createdAt: string;
  subtotal: number | string; discountTotal: number | string; taxTotal: number | string;
  totalAmount: number | string; paymentStatus?: string; table?: { id?: string; tableNumber: string } | null;
  server?: { id: string; firstName: string; lastName: string } | null;
  items?: ServerOrderItem[];
  payments?: Array<{ id: string; amount: number | string; status: string; paymentMethod?: string; paymentReference?: string; createdAt?: string; refunds?: any[] }>;
  statusHistory?: Array<{ previousStatus: string | null; newStatus: string; changedAt: string; note?: string | null }>;
  cancellationReason?: string | null;
}
const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

export async function getServerOrders(status?: string): Promise<ServerOrder[]> {
  return unwrap(await api.get("/orders", { params: status ? { status } : {} }));
}
export async function getServerOrder(orderId: string): Promise<ServerOrder> {
  return unwrap(await api.get(`/orders/${orderId}`));
}
export async function createServerOrder(input: { tableId: string; items: Array<{ menuItemId: string; quantity: number }> }) {
  return unwrap(await api.post("/orders", input));
}
export async function editServerOrder(orderId: string, items: Array<{ menuItemId: string; quantity: number }>) {
  return unwrap(await api.patch(`/orders/${orderId}`, { items }));
}
export async function updateServerOrderStatus(orderId: string, status: "COMPLETED") {
  return unwrap(await api.patch(`/orders/${orderId}/status`, { status }));
}
export async function cancelServerOrder(orderId: string, reason: string) {
  return unwrap(await api.patch(`/orders/${orderId}/cancel`, { reason }));
}
export async function getServerTables(branchId: string): Promise<{ branch: any; tables: ServerTable[] }> {
  return unwrap(await api.get(`/tables/branches/${branchId}`));
}
export async function getServerMenuItems(): Promise<ServerMenuItem[]> {
  return unwrap(await api.get("/menu/items"));
}
export async function recordServerPayment(orderId: string, paymentMethod: "CASH" | "CARD") {
  return unwrap(await api.post(`/payments/orders/${orderId}/payment`, { paymentMethod }));
}
export async function getServerOrderPayments(orderId: string) {
  return unwrap(await api.get(`/payments/orders/${orderId}/payments`));
}
export async function requestServerRefund(paymentId: string, reason: string) {
  return unwrap(await api.post(`/payments/${paymentId}/refunds`, { reason }));
}

// Review a Server-submitted refund using the existing backend endpoint.
// The Branch Manager's email is supplied from the branch configuration; only the password is entered at the workstation.
export async function reviewServerRefund(
  refundId: string,
  managerEmail: string,
  password: string,
  decision: "APPROVED" | "REJECTED"
) {
  return unwrap(await api.patch(`/payments/refunds/${refundId}/review`, {
    managerEmail,
    password,
    decision,
  }));
}
