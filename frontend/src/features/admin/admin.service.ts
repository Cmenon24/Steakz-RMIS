import api from "../../services/api";

export type AdminRole = "ADMIN" | "HEADQUARTERS_MANAGER" | "BRANCH_MANAGER" | "SERVER" | "COOK";

export interface AdminUser {
  id: string; firstName: string; lastName: string; email: string; role: AdminRole;
  branchId: string | null; isActive: boolean; deactivatedAt: string | null;
  createdAt: string; updatedAt: string;
  branch: { name: string; branchCode: string } | null;
}

export interface AdminBranch {
  id: string; branchCode: string; name: string; address: string; contactNumber: string;
  email: string; timeZone: string; isActive: boolean; createdAt: string;
  updatedAt: string; deactivatedAt: string | null;
}

export interface AdminTable {
  id: string; branchId: string; tableNumber: string; capacity: number | null;
  status: "AVAILABLE" | "OCCUPIED" | "INACTIVE"; createdAt: string; updatedAt: string;
  branch: { id: string; branchCode: string; name: string; isActive: boolean };
}

export interface AdminAuditLog {
  id: string; action: string; entityType: string; entityId: string; details: unknown;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string; role: string } | null;
  branch: { id: string; branchCode: string; name: string } | null;
}

export interface AdminNotification {
  id: string; title: string; message: string; type: string; isRead: boolean; createdAt: string;
}

export interface AdminProfile {
  id: string; firstName: string; lastName: string; email: string; role: AdminRole;
  branchId: string | null; branchName: string | null;
}

export interface CreateAdminUserInput {
  firstName: string; lastName: string; email: string; password: string; role: AdminRole; branchId?: string | null;
}
export interface UpdateAdminUserInput {
  firstName?: string; lastName?: string; email?: string; role?: AdminRole; branchId?: string | null;
}
export interface TransferAdminUserInput { newBranchId: string; reason?: string; }
export interface CreateAdminBranchInput {
  branchCode: string; name: string; address: string; contactNumber: string; email: string; timeZone: string;
}
export interface UpdateAdminBranchInput {
  name?: string; address?: string; contactNumber?: string; email?: string; timeZone?: string;
}
export interface CreateAdminTableInput { branchId: string; tableNumber: string; capacity?: number; }
export interface UpdateAdminTableInput { tableNumber?: string; capacity?: number | null; }
export interface AuditLogFilters {
  page?: number; limit?: number; branchId?: string; action?: string; entityType?: string;
  startDate?: string; endDate?: string;
}
export interface AuditLogResult {
  logs: AdminAuditLog[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// User management
export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await api.get<{ data: AdminUser[] }>("/users"); return response.data.data;
}
export async function getAdminUser(userId: string): Promise<AdminUser> {
  const response = await api.get<{ data: AdminUser }>(`/users/${userId}`); return response.data.data;
}
export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminUser> {
  const response = await api.post<{ data: AdminUser }>("/users", input); return response.data.data;
}
export async function updateAdminUser(userId: string, input: UpdateAdminUserInput): Promise<AdminUser> {
  const response = await api.patch<{ data: AdminUser }>(`/users/${userId}`, input); return response.data.data;
}
export async function deactivateAdminUser(userId: string): Promise<AdminUser> {
  const response = await api.patch<{ data: AdminUser }>(`/users/${userId}/deactivate`); return response.data.data;
}
export async function reactivateAdminUser(userId: string): Promise<AdminUser> {
  const response = await api.patch<{ data: AdminUser }>(`/users/${userId}/reactivate`); return response.data.data;
}
export async function transferAdminUser(userId: string, input: TransferAdminUserInput) {
  const response = await api.patch<{ data: AdminUser }>(`/users/${userId}/transfer`, input); return response.data.data;
}
export async function resetAdminUserPassword(userId: string, newPassword: string): Promise<AdminUser> {
  const response = await api.patch<{ data: AdminUser }>(`/users/${userId}/reset-password`, { newPassword }); return response.data.data;
}

// Branch management
export async function getAdminBranches(): Promise<AdminBranch[]> {
  const response = await api.get<{ data: AdminBranch[] }>("/branches"); return response.data.data;
}
export async function getAdminBranch(branchId: string): Promise<AdminBranch> {
  const response = await api.get<{ data: AdminBranch }>(`/branches/${branchId}`); return response.data.data;
}
export async function createAdminBranch(input: CreateAdminBranchInput): Promise<AdminBranch> {
  const response = await api.post<{ data: AdminBranch }>("/branches", input); return response.data.data;
}
export async function updateAdminBranch(branchId: string, input: UpdateAdminBranchInput): Promise<AdminBranch> {
  const response = await api.patch<{ data: AdminBranch }>(`/branches/${branchId}`, input); return response.data.data;
}
export async function deactivateAdminBranch(branchId: string): Promise<AdminBranch> {
  const response = await api.patch<{ data: AdminBranch }>(`/branches/${branchId}/deactivate`); return response.data.data;
}

// Table management
export async function getAdminTables(branchId?: string): Promise<AdminTable[]> {
  const response = await api.get<{ data: AdminTable[] }>("/tables", { params: branchId ? { branchId } : {} });
  return response.data.data;
}
export async function createAdminTable(input: CreateAdminTableInput): Promise<Partial<AdminTable>> {
  const response = await api.post<{ data: Partial<AdminTable> }>("/tables", input); return response.data.data;
}
export async function updateAdminTable(tableId: string, input: UpdateAdminTableInput): Promise<Partial<AdminTable>> {
  const response = await api.patch<{ data: Partial<AdminTable> }>(`/tables/${tableId}`, input); return response.data.data;
}
export async function deactivateAdminTable(tableId: string): Promise<Partial<AdminTable>> {
  const response = await api.patch<{ data: Partial<AdminTable> }>(`/tables/${tableId}/deactivate`); return response.data.data;
}
export async function reactivateAdminTable(tableId: string): Promise<Partial<AdminTable>> {
  const response = await api.patch<{ data: Partial<AdminTable> }>(`/tables/${tableId}/reactivate`); return response.data.data;
}

// Audit history
export async function getAdminAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogResult> {
  const response = await api.get<{ data: AuditLogResult }>("/audit-logs", { params: filters }); return response.data.data;
}
export async function getAdminAuditLog(logId: string): Promise<AdminAuditLog> {
  const response = await api.get<{ data: AdminAuditLog }>(`/audit-logs/${logId}`); return response.data.data;
}
export async function getRecentAuditLogs(): Promise<AdminAuditLog[]> {
  const response = await getAdminAuditLogs({ page: 1, limit: 5 }); return response.logs;
}

// Signed-in account and notifications
export async function getAdminProfile(): Promise<AdminProfile> {
  const response = await api.get<{ data: AdminProfile }>("/auth/profile"); return response.data.data;
}
export async function getRecentNotifications(): Promise<AdminNotification[]> {
  const response = await api.get<{ data: { notifications: AdminNotification[] } }>("/notifications", { params: { page: 1, limit: 5 } });
  return response.data.data.notifications;
}
export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get<{ data: { unreadCount: number } }>("/notifications/unread-count"); return response.data.data.unreadCount;
}
export async function markAdminNotificationRead(notificationId: string): Promise<void> {
  await api.patch(`/notifications/${notificationId}/read`);
}
export async function markAllAdminNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read-all");
}
