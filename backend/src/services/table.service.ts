import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Derive occupancy from active unpaid orders; keep INACTIVE as an administrative state.
async function withDerivedAvailability(tables: any[]) {
  if (!tables.length) return tables;
  const activeOrders = await prisma.order.findMany({
    where: {
      tableId: { in: tables.map((table) => table.id) },
      status: { in: ["NEW", "PREPARING", "READY", "COMPLETED"] },
      payments: { none: { status: "SUCCESSFUL" } },
    },
    select: { tableId: true },
  });
  const occupiedIds = new Set(activeOrders.map((order) => order.tableId));
  return tables.map((table) => ({
    ...table,
    status: table.status === "INACTIVE" ? "INACTIVE" : occupiedIds.has(table.id) ? "OCCUPIED" : "AVAILABLE",
  }));
}

// Return tables using active orders as the source of truth for availability.
export async function getBranchTables(branchId: string, availableOnly = false) {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, branchCode: true, name: true, isActive: true },
  });
  if (!branch || !branch.isActive) throw new AppError("Branch not found or inactive", 404);

  const tables = await prisma.restaurantTable.findMany({
    where: { branchId },
    select: { id: true, branchId: true, tableNumber: true, capacity: true, status: true, createdAt: true, updatedAt: true },
    orderBy: { tableNumber: "asc" },
  });
  const derivedTables = await withDerivedAvailability(tables);
  return { branch, tables: availableOnly ? derivedTables.filter((table) => table.status === "AVAILABLE") : derivedTables };
}

// HQ and Admin can view tables across branches; availability is derived consistently.
export async function getAllTables(branchId?: string) {
  const tables = await prisma.restaurantTable.findMany({
    where: branchId ? { branchId } : undefined,
    select: {
      id: true, branchId: true, tableNumber: true, capacity: true, status: true, createdAt: true, updatedAt: true,
      branch: { select: { id: true, branchCode: true, name: true, isActive: true } },
    },
    orderBy: [{ branch: { branchCode: "asc" } }, { tableNumber: "asc" }],
  });
  return withDerivedAvailability(tables);
}

// Admin creates tables for an active branch; tables cannot be moved between branches later.
export async function createTable(input: {
  branchId: string;
  tableNumber: string;
  capacity?: number;
}) {
  const branch = await prisma.branch.findUnique({
    where: { id: input.branchId },
    select: { id: true, isActive: true },
  });
  if (!branch || !branch.isActive) throw new AppError("Branch not found or inactive", 404);

  const tableNumber = input.tableNumber.trim().toUpperCase();
  const existing = await prisma.restaurantTable.findUnique({
    where: { branchId_tableNumber: { branchId: input.branchId, tableNumber } },
    select: { id: true },
  });
  if (existing) throw new AppError("A table with this number already exists in the branch", 409);

  return prisma.restaurantTable.create({
    data: {
      branchId: input.branchId,
      tableNumber,
      capacity: input.capacity ?? null,
      status: "AVAILABLE",
    },
    select: {
      id: true, branchId: true, tableNumber: true, capacity: true, status: true, createdAt: true,
    },
  });
}

// Admin may update the table label or seating capacity, but not its branch or operational status.
export async function updateTable(tableId: string, input: {
  tableNumber?: string;
  capacity?: number | null;
}) {
  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
    select: { id: true, branchId: true, tableNumber: true, status: true },
  });
  if (!table) throw new AppError("Table not found", 404);

  const data: { tableNumber?: string; capacity?: number | null } = {};
  if (input.tableNumber !== undefined) {
    const tableNumber = input.tableNumber.trim().toUpperCase();
    const duplicate = await prisma.restaurantTable.findFirst({
      where: { branchId: table.branchId, tableNumber, id: { not: tableId } },
      select: { id: true },
    });
    if (duplicate) throw new AppError("A table with this number already exists in the branch", 409);
    data.tableNumber = tableNumber;
  }
  if (input.capacity !== undefined) data.capacity = input.capacity;

  return prisma.restaurantTable.update({
    where: { id: tableId },
    data,
    select: {
      id: true, branchId: true, tableNumber: true, capacity: true, status: true, updatedAt: true,
    },
  });
}

// A table cannot be deactivated while occupied by an active order.
export async function deactivateTable(tableId: string) {
  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
    select: { id: true, status: true },
  });
  if (!table) throw new AppError("Table not found", 404);
  const activeOrder = await prisma.order.findFirst({
    where: { tableId, status: { in: ["NEW", "PREPARING", "READY", "COMPLETED"] }, payments: { none: { status: "SUCCESSFUL" } } },
    select: { id: true },
  });
  if (activeOrder) throw new AppError("An occupied table cannot be deactivated", 409);
  if (table.status === "INACTIVE") throw new AppError("Table is already inactive", 409);

  return prisma.restaurantTable.update({
    where: { id: tableId },
    data: { status: "INACTIVE" },
    select: { id: true, branchId: true, tableNumber: true, capacity: true, status: true, updatedAt: true },
  });
}

// Reactivation makes a table available for new orders.
export async function reactivateTable(tableId: string) {
  const table = await prisma.restaurantTable.findUnique({
    where: { id: tableId },
    select: { id: true, status: true },
  });
  if (!table) throw new AppError("Table not found", 404);
  if (table.status !== "INACTIVE") throw new AppError("Only inactive tables can be reactivated", 409);

  return prisma.restaurantTable.update({
    where: { id: tableId },
    data: { status: "AVAILABLE" },
    select: { id: true, branchId: true, tableNumber: true, capacity: true, status: true, updatedAt: true },
  });
}
