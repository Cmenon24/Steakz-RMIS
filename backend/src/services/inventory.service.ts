import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const INVENTORY_REFERENCE_TYPE = "INVENTORY_TRANSACTION";

// Generate a sequential inventory reference for the branch inside the current transaction.
async function nextReference(tx: any, branchId: string) {
  const branch = await tx.branch.findUnique({
    where: { id: branchId },
    select: { branchCode: true },
  });
  if (!branch) throw new AppError("Branch not found", 404);

  const counter = await tx.referenceCounter.upsert({
    where: {
      branchId_referenceType: {
        branchId,
        referenceType: INVENTORY_REFERENCE_TYPE,
      },
    },
    create: { branchId, referenceType: INVENTORY_REFERENCE_TYPE, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  return `${branch.branchCode}${String(counter.lastNumber).padStart(4, "0")}`;
}

async function ensureBranchActive(tx: any, branchId: string) {
  const branch = await tx.branch.findUnique({ where: { id: branchId }, select: { id: true, isActive: true } });
  if (!branch || !branch.isActive) throw new AppError("Branch not found or inactive", 404);
}

async function getCurrentQuantity(tx: any, branchId: string, ingredientId: string) {
  const record = await tx.branchInventory.findUnique({
    where: { branchId_ingredientId: { branchId, ingredientId } },
    select: { quantityOnHand: true, minimumStockLevel: true },
  });
  return { quantity: Number(record?.quantityOnHand ?? 0), minimum: Number(record?.minimumStockLevel ?? 0) };
}

// Notify branch and headquarters managers about inventory alerts.
async function notifyInventoryManagers(
  tx: any,
  branchId: string,
  alertType: string,
  ingredientId: string,
  quantity: number
) {
  const ingredient = await tx.ingredient.findUnique({
    where: { id: ingredientId },
    select: { name: true, unit: true },
  });

  // Notify only active Branch Managers assigned to this branch.
  const managers = await tx.user.findMany({
    where: {
      branchId,
      role: "BRANCH_MANAGER",
      isActive: true,
    },
    select: { id: true },
  });

  if (managers.length) {
    await tx.notification.createMany({
      data: managers.map((manager: { id: string }) => ({
        userId: manager.id,
        branchId,
        title:
          alertType === "OUT_OF_STOCK"
            ? "Ingredient out of stock"
            : "Low inventory alert",
        message: `${ingredient?.name ?? "An ingredient"} is ${
          alertType === "OUT_OF_STOCK"
            ? "out of stock"
            : "at or below its minimum stock level"
        }. Current quantity: ${quantity} ${ingredient?.unit ?? "units"}.`,
        type: alertType,
      })),
    });
  }
}

// Keep one unresolved alert per ingredient and update its type when stock changes.
async function refreshAlert(
  tx: any,
  branchId: string,
  ingredientId: string,
  quantity: number,
  minimum: number
) {
  const alertType =
    quantity <= 0
      ? "OUT_OF_STOCK"
      : quantity <= minimum
        ? "LOW_STOCK"
        : null;

  const openAlerts = await tx.inventoryAlert.findMany({
    where: { branchId, ingredientId, resolvedAt: null },
    select: { id: true, alertType: true },
  });

  if (!alertType) {
    if (openAlerts.length) {
      await tx.inventoryAlert.updateMany({
        where: { branchId, ingredientId, resolvedAt: null },
        data: { resolvedAt: new Date() },
      });
    }
    return;
  }

  if (openAlerts.length) {
    const [first, ...duplicates] = openAlerts;

    // Notify managers only when the alert severity changes.
    if (first.alertType !== alertType) {
      await tx.inventoryAlert.update({
        where: { id: first.id },
        data: { alertType },
      });

      await notifyInventoryManagers(
        tx,
        branchId,
        alertType,
        ingredientId,
        quantity
      );
    }

    if (duplicates.length) {
      await tx.inventoryAlert.updateMany({
        where: {
          id: { in: duplicates.map((item: { id: string }) => item.id) },
        },
        data: { resolvedAt: new Date() },
      });
    }
  } else {
    await tx.inventoryAlert.create({
      data: { branchId, ingredientId, alertType },
    });

    await notifyInventoryManagers(
      tx,
      branchId,
      alertType,
      ingredientId,
      quantity
    );
  }
}

async function recordMovement(tx: any, input: {
  branchId: string; ingredientId: string; quantityChange: number;
  transactionType: "OPENING_BALANCE" | "RECEIVING" | "WASTAGE" | "CORRECTION_INCREASE" | "CORRECTION_DECREASE" | "STOCKTAKE_ADJUSTMENT";
  userId: string; reason?: string; notes?: string; supplierName?: string;
  unitCost?: number; idempotencyKey?: string; stocktakeId?: string;
}) {
  if (input.idempotencyKey) {
    const prior = await tx.inventoryTransaction.findUnique({
      where: { branchId_idempotencyKey: { branchId: input.branchId, idempotencyKey: input.idempotencyKey } },
    });
    if (prior) return prior;
  }

  const ingredient = await tx.ingredient.findUnique({
    where: { id: input.ingredientId },
    select: { id: true, isActive: true },
  });
  if (!ingredient || !ingredient.isActive) throw new AppError("Ingredient not found or inactive", 404);

  const current = await getCurrentQuantity(tx, input.branchId, input.ingredientId);
  const next = current.quantity + input.quantityChange;
  if (next < 0) throw new AppError("This stock movement would result in negative inventory", 409);

  const inventory = await tx.branchInventory.upsert({
    where: { branchId_ingredientId: { branchId: input.branchId, ingredientId: input.ingredientId } },
    create: { branchId: input.branchId, ingredientId: input.ingredientId, quantityOnHand: next },
    update: { quantityOnHand: next },
    select: { quantityOnHand: true, minimumStockLevel: true },
  });

  const referenceNumber = await nextReference(tx, input.branchId);
  const transaction = await tx.inventoryTransaction.create({
    data: {
      referenceNumber,
      referenceType: INVENTORY_REFERENCE_TYPE,
      idempotencyKey: input.idempotencyKey ?? null,
      branchId: input.branchId,
      ingredientId: input.ingredientId,
      transactionType: input.transactionType,
      quantityChange: input.quantityChange,
      previousQuantity: current.quantity,
      newQuantity: next,
      unitCost: input.unitCost ?? null,
      supplierName: input.supplierName?.trim() || null,
      reason: input.reason?.trim() || null,
      notes: input.notes?.trim() || null,
      createdByUserId: input.userId,
      actorType: "USER",
      stocktakeId: input.stocktakeId ?? null,
    },
  });

  await refreshAlert(tx, input.branchId, input.ingredientId, Number(inventory.quantityOnHand), Number(inventory.minimumStockLevel));
  await tx.auditLog.create({
    data: {
      userId: input.userId, actorType: "USER", branchId: input.branchId,
      action: "INVENTORY_MOVEMENT_RECORDED", entityType: "InventoryTransaction", entityId: transaction.id,
      details: { transactionType: input.transactionType, ingredientId: input.ingredientId, quantityChange: String(input.quantityChange), referenceNumber },
    },
  });
  return transaction;
}

// List the central ingredient catalogue.
export async function getIngredients() {
  return prisma.ingredient.findMany({
    select: { id: true, name: true, unit: true, isActive: true, createdAt: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
}

export async function getIngredient(ingredientId: string) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    select: { id: true, name: true, unit: true, isActive: true, createdAt: true, updatedAt: true },
  });
  if (!ingredient) throw new AppError("Ingredient not found", 404);
  return ingredient;
}

export async function createIngredient(input: { name: string; unit: string }) {
  const name = input.name.trim();
  if (await prisma.ingredient.findUnique({ where: { name } })) throw new AppError("Ingredient already exists", 409);
  return prisma.ingredient.create({
    data: { name, unit: input.unit as never },
    select: { id: true, name: true, unit: true, isActive: true, createdAt: true },
  });
}

export async function updateIngredient(ingredientId: string, input: { name?: string; unit?: string }) {
  const existing = await getIngredient(ingredientId);
  if (input.name) {
    const duplicate = await prisma.ingredient.findFirst({ where: { name: input.name.trim(), id: { not: ingredientId } } });
    if (duplicate) throw new AppError("Ingredient name already exists", 409);
  }
  return prisma.ingredient.update({
    where: { id: existing.id },
    data: { ...(input.name !== undefined && { name: input.name.trim() }), ...(input.unit !== undefined && { unit: input.unit as never }) },
    select: { id: true, name: true, unit: true, isActive: true, updatedAt: true },
  });
}

export async function setIngredientActive(ingredientId: string, isActive: boolean) {
  const ingredient = await getIngredient(ingredientId);
  if (ingredient.isActive === isActive) throw new AppError(`Ingredient is already ${isActive ? "active" : "inactive"}`, 409);
  if (!isActive) {
    const usedInPublishedRecipe = await prisma.recipeIngredient.findFirst({
      where: { ingredientId, recipeVersion: { status: "PUBLISHED" } },
    });
    if (usedInPublishedRecipe) throw new AppError("Ingredient is used in a published recipe and cannot be deactivated", 409);
  }
  return prisma.ingredient.update({ where: { id: ingredientId }, data: { isActive }, select: { id: true, name: true, unit: true, isActive: true, updatedAt: true } });
}

// Show every active ingredient for a branch, including ingredients with zero recorded stock.
export async function getBranchInventory(branchId: string) {
  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true, branchCode: true, name: true, isActive: true } });
  if (!branch) throw new AppError("Branch not found", 404);
  const ingredients = await prisma.ingredient.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, unit: true,
      inventoryRecords: { where: { branchId }, select: { quantityOnHand: true, minimumStockLevel: true, updatedAt: true } },
    },
    orderBy: { name: "asc" },
  });
  return {
    branch,
    inventory: ingredients.map((item) => ({
      ingredientId: item.id,
      name: item.name,
      unit: item.unit,
      quantityOnHand: Number(item.inventoryRecords[0]?.quantityOnHand ?? 0),
      minimumStockLevel: Number(item.inventoryRecords[0]?.minimumStockLevel ?? 0),
      updatedAt: item.inventoryRecords[0]?.updatedAt ?? null,
    })),
  };
}

export async function getBranchInventoryItem(branchId: string, ingredientId: string) {
  const inventory = await getBranchInventory(branchId);
  const item = inventory.inventory.find((record) => record.ingredientId === ingredientId);
  if (!item) throw new AppError("Inventory item not found", 404);
  return item;
}

export async function setMinimumStockLevel(branchId: string, ingredientId: string, minimumStockLevel: number) {
  return prisma.$transaction(async (tx) => {
    await ensureBranchActive(tx, branchId);
    const ingredient = await tx.ingredient.findUnique({ where: { id: ingredientId }, select: { id: true, isActive: true } });
    if (!ingredient || !ingredient.isActive) throw new AppError("Ingredient not found or inactive", 404);
    const current = await getCurrentQuantity(tx, branchId, ingredientId);
    const updated = await tx.branchInventory.upsert({
      where: { branchId_ingredientId: { branchId, ingredientId } },
      create: { branchId, ingredientId, quantityOnHand: current.quantity, minimumStockLevel },
      update: { minimumStockLevel },
      select: { ingredientId: true, quantityOnHand: true, minimumStockLevel: true, updatedAt: true },
    });
    await refreshAlert(tx, branchId, ingredientId, Number(updated.quantityOnHand), Number(updated.minimumStockLevel));
    return updated;
  });
}

export async function receiveStock(input: { branchId: string; userId: string; ingredientId: string; quantity: number; supplierName?: string; unitCost?: number; notes?: string; idempotencyKey?: string }) {
  if (input.quantity <= 0) throw new AppError("Received quantity must be greater than zero", 400);
  return prisma.$transaction(async (tx) => {
    await ensureBranchActive(tx, input.branchId);
    return recordMovement(tx, { ...input, quantityChange: input.quantity, transactionType: "RECEIVING" });
  });
}

export async function adjustStock(input: { branchId: string; userId: string; ingredientId: string; quantityChange: number; transactionType: "WASTAGE" | "CORRECTION_INCREASE" | "CORRECTION_DECREASE"; reason: string; notes?: string; idempotencyKey?: string }) {
  if (input.quantityChange === 0) throw new AppError("Adjustment quantity cannot be zero", 400);
  if (!input.reason.trim()) throw new AppError("A reason is required for stock adjustments", 400);
  if (input.transactionType === "WASTAGE" && input.quantityChange >= 0) throw new AppError("Wastage must reduce stock", 400);
  if (input.transactionType === "CORRECTION_INCREASE" && input.quantityChange <= 0) throw new AppError("Correction increase must be positive", 400);
  if (input.transactionType === "CORRECTION_DECREASE" && input.quantityChange >= 0) throw new AppError("Correction decrease must be negative", 400);
  return prisma.$transaction(async (tx) => {
    await ensureBranchActive(tx, input.branchId);
    return recordMovement(tx, input);
  });
}

export async function getInventoryTransactions(branchId: string, ingredientId?: string) {
  return prisma.inventoryTransaction.findMany({
    where: { branchId, ...(ingredientId && { ingredientId }) },
    select: {
      id: true, referenceNumber: true, transactionType: true, quantityChange: true,
      previousQuantity: true, newQuantity: true, unitCost: true, supplierName: true,
      reason: true, notes: true, createdAt: true,
      ingredient: { select: { id: true, name: true, unit: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInventoryAlerts(branchId: string, includeResolved = false) {
  return prisma.inventoryAlert.findMany({
    where: { branchId, ...(includeResolved ? {} : { resolvedAt: null }) },
    select: {
      id: true, alertType: true, createdAt: true, resolvedAt: true,
      ingredient: { select: { id: true, name: true, unit: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Create count lines for active ingredients; each baseline is refreshed when its physical count is saved.
export async function startStocktake(branchId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    await ensureBranchActive(tx, branchId);
    const existing = await tx.stocktake.findFirst({ where: { branchId, status: "IN_PROGRESS" }, select: { id: true } });
    if (existing) throw new AppError("An inventory stocktake is already in progress for this branch", 409);
    const ingredients = await tx.ingredient.findMany({ where: { isActive: true }, select: { id: true } });
    const stocktake = await tx.stocktake.create({
      data: {
        branchId,
        startedByUserId: userId,
        items: {
          create: await Promise.all(ingredients.map(async (ingredient) => {
            const current = await getCurrentQuantity(tx, branchId, ingredient.id);
            return { ingredientId: ingredient.id, systemQuantityAtCount: current.quantity };
          })),
        },
      },
      select: { id: true, branchId: true, status: true, startedAt: true, items: true },
    });
    // Record who started the stocktake.
    await tx.auditLog.create({
      data: {
        userId,
        actorType: "USER",
        branchId,
        action: "STOCKTAKE_STARTED",
        entityType: "Stocktake",
        entityId: stocktake.id,
        details: {
          status: stocktake.status,
          itemCount: stocktake.items.length,
        },
      },
    });
    return stocktake;
  });
}

export async function getStocktakes(branchId: string) {
  return prisma.stocktake.findMany({
    where: { branchId },
    select: { id: true, status: true, startedAt: true, completedAt: true, _count: { select: { items: true } } },
    orderBy: { startedAt: "desc" },
  });
}

export async function getStocktake(branchId: string, stocktakeId: string) {
  const stocktake = await prisma.stocktake.findFirst({
    where: { id: stocktakeId, branchId },
    select: {
      id: true, status: true, startedAt: true, completedAt: true,
      items: {
        select: { id: true, ingredientId: true, systemQuantityAtCount: true, actualQuantity: true, variance: true, countedAt: true, ingredient: { select: { name: true, unit: true } } },
        orderBy: { ingredient: { name: "asc" } },
      },
    },
  });
  if (!stocktake) throw new AppError("Stocktake not found", 404);
  return stocktake;
}
export async function updateStocktakeCount(
  branchId: string,
  stocktakeId: string,
  ingredientId: string,
  actualQuantity: number,
  userId: string,
) {
  if (actualQuantity < 0) throw new AppError("Actual quantity cannot be negative", 400);
  return prisma.$transaction(async (tx) => {
    const stocktake = await tx.stocktake.findFirst({ where: { id: stocktakeId, branchId }, select: { id: true, status: true } });
    if (!stocktake) throw new AppError("Stocktake not found", 404);
    if (stocktake.status !== "IN_PROGRESS") throw new AppError("Stocktake is already completed", 409);
    const item = await tx.stocktakeItem.findUnique({ where: { stocktakeId_ingredientId: { stocktakeId, ingredientId } } });
    if (!item) throw new AppError("Ingredient is not part of this stocktake", 404);

    // Snapshot the system balance when the physical count is saved, not when the stocktake started.
    const current = await getCurrentQuantity(tx, branchId, ingredientId);
    const countedAt = new Date();
    const updatedItem = await tx.stocktakeItem.update({
      where: { id: item.id },
      data: {
        systemQuantityAtCount: current.quantity,
        actualQuantity,
        variance: actualQuantity - current.quantity,
        countedAt,
      },
      select: { id: true, ingredientId: true, systemQuantityAtCount: true, actualQuantity: true, variance: true, countedAt: true },
    });

    // Record who saved the physical count.
    await tx.auditLog.create({
      data: {
        userId,
        actorType: "USER",
        branchId,
        action: "STOCKTAKE_COUNT_RECORDED",
        entityType: "StocktakeItem",
        entityId: item.id,
        details: {
          stocktakeId,
          ingredientId,
          actualQuantity: String(actualQuantity),
          systemQuantityAtCount: String(current.quantity),
          variance: String(actualQuantity - current.quantity),
        },
      },
    });

    return updatedItem;
  });
}

export async function completeStocktake(branchId: string, stocktakeId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const stocktake = await tx.stocktake.findFirst({
      where: { id: stocktakeId, branchId },
      include: { items: true },
    });
    if (!stocktake) throw new AppError("Stocktake not found", 404);
    if (stocktake.status !== "IN_PROGRESS") throw new AppError("Stocktake is already completed", 409);
    const uncounted = stocktake.items.filter((item: { actualQuantity: unknown }) => item.actualQuantity === null);
    if (uncounted.length) throw new AppError("Every ingredient must be counted before completing the stocktake", 409);

    for (const item of stocktake.items) {
      const variance = Number(item.actualQuantity) - Number(item.systemQuantityAtCount);
      if (variance === 0) continue;
      await recordMovement(tx, {
        branchId, userId, ingredientId: item.ingredientId,
        quantityChange: variance, transactionType: "STOCKTAKE_ADJUSTMENT",
        reason: "Stocktake reconciliation", stocktakeId,
        idempotencyKey: `stocktake:${stocktakeId}:${item.ingredientId}`,
      });
    }

    const completedStocktake = await tx.stocktake.update({
      where: { id: stocktakeId },
      data: { status: "COMPLETED", completedByUserId: userId, completedAt: new Date() },
      select: { id: true, status: true, startedAt: true, completedAt: true },
    });

    // Record who completed the stocktake.
    await tx.auditLog.create({
      data: {
        userId,
        actorType: "USER",
        branchId,
        action: "STOCKTAKE_COMPLETED",
        entityType: "Stocktake",
        entityId: stocktakeId,
        details: {
          status: completedStocktake.status,
          itemCount: stocktake.items.length,
        },
      },
    });

    return completedStocktake;
  });
}
