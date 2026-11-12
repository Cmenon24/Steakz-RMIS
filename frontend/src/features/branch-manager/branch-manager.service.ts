import api from "../../services/api";

export interface BranchManagerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "BRANCH_MANAGER";
  branchId: string | null;
  branchName: string | null;
}

export interface BranchInventoryItem {
  ingredientId: string;
  name: string;
  unit: string;
  quantityOnHand: number;
  minimumStockLevel: number;
  updatedAt: string | null;
}

export interface BranchOrder {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  subtotal: number | string;
  discountTotal: number | string;
  totalAmount: number | string;
  table?: { tableNumber: string } | null;
  server?: { firstName: string; lastName: string } | null;
  items?: Array<{ menuItemNameSnapshot: string; quantity: number; lineTotal: number | string; sides?: Array<{ sideNameSnapshot: string }> }>;
  payments?: Array<{
    id?: string;
    status: string;
    amount: number | string;
    refunds?: Array<{
      id: string;
      amount: number | string;
      reason: string;
      status: "REQUESTED" | "APPROVED" | "REJECTED" | "PROCESSED" | string;
      createdAt: string;
      processedAt?: string | null;
    }>;
  }>;
}

export interface BranchTable {
  id: string;
  branchId: string;
  tableNumber: string;
  capacity: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "INACTIVE";
}

export interface Stocktake {
  id: string;
  referenceNumber?: string;
  status: string;
  startedAt?: string;
  completedAt?: string | null;
  items?: Array<{
    ingredientId: string;
    ingredient?: { id: string; name: string; unit: string };
    systemQuantityAtCount: number | string;
    actualQuantity: number | string | null;
    variance?: number | string | null;
  }>;
}

export interface ReportRange {
  period: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "custom";
  startDate?: string;
  endDate?: string;
}

const data = <T,>(response: { data: { data: T } }) => response.data.data;

export async function getBranchOrders(status?: string): Promise<BranchOrder[]> {
  return data(await api.get("/orders", { params: status ? { status } : {} }));
}
export async function getBranchOrder(orderId: string): Promise<BranchOrder> {
  return data(await api.get(`/orders/${orderId}`));
}
export async function cancelBranchOrder(orderId: string, reason: string) {
  return data(await api.patch(`/orders/${orderId}/cancel`, { reason }));
}
export async function getKitchenQueue() {
  return data(await api.get("/orders/kitchen-queue"));
}

export async function getBranchInventory(branchId: string) {
  return data(await api.get(`/inventory/branches/${branchId}`)) as {
    branch: { id: string; branchCode: string; name: string };
    inventory: BranchInventoryItem[];
  };
}
export async function getInventoryItem(branchId: string, ingredientId: string) {
  return data(await api.get(`/inventory/branches/${branchId}/items/${ingredientId}`));
}
export async function getInventoryTransactions(branchId: string, ingredientId?: string) {
  return data(await api.get(`/inventory/branches/${branchId}/transactions`, {
    params: ingredientId ? { ingredientId } : {},
  }));
}
export async function getInventoryAlerts(branchId: string, includeResolved = false) {
  return data(await api.get(`/inventory/branches/${branchId}/alerts`, {
    params: { includeResolved: String(includeResolved) },
  }));
}
export async function setMinimumStock(branchId: string, ingredientId: string, minimumStockLevel: number) {
  return data(await api.patch(`/inventory/branches/${branchId}/items/${ingredientId}/minimum`, { minimumStockLevel }));
}
export async function receiveBranchStock(branchId: string, input: {
  ingredientId: string; quantity: number; supplierName?: string; unitCost?: number; notes?: string; idempotencyKey?: string;
}) {
  return data(await api.post(`/inventory/branches/${branchId}/receiving`, input));
}
export async function adjustBranchStock(branchId: string, input: {
  ingredientId: string; quantityChange: number;
  transactionType: "WASTAGE" | "CORRECTION_INCREASE" | "CORRECTION_DECREASE";
  reason: string; notes?: string; idempotencyKey?: string;
}) {
  return data(await api.post(`/inventory/branches/${branchId}/adjustments`, input));
}

export async function getStocktakes(branchId: string): Promise<Stocktake[]> {
  return data(await api.get(`/inventory/branches/${branchId}/stocktakes`));
}
export async function getStocktake(branchId: string, stocktakeId: string): Promise<Stocktake> {
  return data(await api.get(`/inventory/branches/${branchId}/stocktakes/${stocktakeId}`));
}
export async function startStocktake(branchId: string): Promise<Stocktake> {
  return data<Stocktake>(
    await api.post(`/inventory/branches/${branchId}/stocktakes`),
  );
}
export async function saveStocktakeCount(branchId: string, stocktakeId: string, ingredientId: string, actualQuantity: number) {
  return data(await api.patch(`/inventory/branches/${branchId}/stocktakes/${stocktakeId}/items/${ingredientId}`, { actualQuantity }));
}
export async function completeStocktake(branchId: string, stocktakeId: string) {
  return data(await api.patch(`/inventory/branches/${branchId}/stocktakes/${stocktakeId}/complete`));
}

export async function getBranchTables(branchId: string): Promise<{ branch: unknown; tables: BranchTable[] }> {
  return data(await api.get(`/tables/branches/${branchId}`));
}
export async function getMenuCategories() {
  return data(await api.get("/menu/categories"));
}
export async function getMenuItems() {
  return data(await api.get("/menu/items"));
}
export async function getBranchMenuAvailability(branchId: string) {
  return data(await api.get(`/menu/branches/${branchId}/availability`));
}
export async function getMenuAvailabilityHistory(branchId: string, menuItemId?: string) {
  return data(await api.get(`/menu/branches/${branchId}/availability/history`, {
    params: menuItemId ? { menuItemId } : {},
  }));
}
export async function getPromotions() {
  return data(await api.get("/promotions"));
}
export async function getPromotion(promotionId: string) {
  return data(await api.get(`/promotions/${promotionId}`));
}
export async function getSalesReport(range: ReportRange) {
  return data(await api.get("/reports/sales", { params: range }));
}
export async function getInventoryReport() {
  return data(await api.get("/reports/inventory"));
}
export async function getInventoryHistory(input: { startDate?: string; endDate?: string; ingredientId?: string }) {
  return data(await api.get("/reports/inventory/history", { params: input }));
}
