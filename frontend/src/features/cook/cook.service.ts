import api from "../../services/api";

export interface CookOrderItem {
  id: string;
  menuItemId: string;
  menuItemNameSnapshot: string;
  quantity: number;
  recipeVersionId?: string | null;
  sides?: Array<{ id?: string; sideNameSnapshot: string; quantity?: number }>;
}
export interface CookOrder {
  id: string;
  orderNumber: string;
  status: "NEW" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  createdAt: string;
  completedAt?: string | null;
  table?: { tableNumber: string } | null;
  items: CookOrderItem[];
  statusHistory?: Array<{ previousStatus: string | null; newStatus: string; changedAt: string }>;
}
export interface CookRecipeIngredient {
  id: string;
  quantity: number | string;
  unit: string;
  ingredient: { id: string; name: string; unit: string; isActive: boolean };
}
export interface CookRecipeVersion {
  id: string;
  versionNumber: number;
  status: string;
  publishedAt?: string | null;
  ingredients: CookRecipeIngredient[];
}
export interface CookRecipe {
  id: string;
  menuItemId: string;
  menuItem: { id: string; name: string; category?: { name: string } | null };
  versions: CookRecipeVersion[];
}

const unwrap = <T,>(response: { data: { data: T } }): T => response.data.data;

// Retrieve the authenticated Cook's branch-scoped active kitchen queue.
export async function getKitchenQueue(): Promise<CookOrder[]> {
  return unwrap(await api.get("/orders/kitchen-queue"));
}

// Retrieve full order details, including captured recipe version IDs and status history.
export async function getCookOrder(orderId: string): Promise<CookOrder> {
  return unwrap(await api.get(`/orders/${orderId}`));
}

// Cooks have read-only access to published recipes and their ingredient quantities.
export async function getCookRecipes(): Promise<CookRecipe[]> {
  return unwrap(await api.get("/recipes"));
}

// Apply only the status transitions permitted to Cooks by the backend.
export async function updateCookOrderStatus(orderId: string, status: "PREPARING" | "READY"): Promise<CookOrder> {
  return unwrap(await api.patch(`/orders/${orderId}/status`, { status }));
}


// Retrieve completed orders for the authenticated Cook's assigned branch.
export async function getCookOrderHistory(): Promise<CookOrder[]> {
  return unwrap(await api.get("/orders", { params: { status: "COMPLETED" } }));
}
