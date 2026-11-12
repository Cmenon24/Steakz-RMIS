import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const ORDER_REFERENCE_TYPE = "ORDER";
const INVENTORY_REFERENCE_TYPE = "INVENTORY_TRANSACTION";
const VAT_RATE = 0.20;

type OrderLineInput = { menuItemId: string; quantity: number };
type CreateOrderInput = {
  branchId: string;
  tableId: string;
  serverId: string;
  items: OrderLineInput[];
  idempotencyKey?: string;
};

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function nextReference(tx: any, branchId: string, referenceType: string) {
  const branch = await tx.branch.findUnique({
    where: { id: branchId },
    select: { branchCode: true },
  });
  if (!branch) throw new AppError("Branch not found", 404);

  const counter = await tx.referenceCounter.upsert({
    where: { branchId_referenceType: { branchId, referenceType } },
    create: { branchId, referenceType, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  return `${branch.branchCode}${String(counter.lastNumber).padStart(4, "0")}`;
}

async function recordOrderStockMovement(
  tx: any,
  input: { branchId: string; ingredientId: string; orderId: string; userId: string; quantityChange: number; reason: string },
) {
  const current = await tx.branchInventory.findUnique({
    where: { branchId_ingredientId: { branchId: input.branchId, ingredientId: input.ingredientId } },
    select: { quantityOnHand: true, minimumStockLevel: true },
  });
  const previous = Number(current?.quantityOnHand ?? 0);
  const next = previous + input.quantityChange;
  if (next < 0) throw new AppError("Insufficient inventory to submit this order", 409);

  const updated = await tx.branchInventory.upsert({
    where: { branchId_ingredientId: { branchId: input.branchId, ingredientId: input.ingredientId } },
    create: { branchId: input.branchId, ingredientId: input.ingredientId, quantityOnHand: next },
    update: { quantityOnHand: next },
    select: { quantityOnHand: true, minimumStockLevel: true },
  });

  const referenceNumber = await nextReference(tx, input.branchId, INVENTORY_REFERENCE_TYPE);
  await tx.inventoryTransaction.create({
    data: {
      referenceNumber,
      referenceType: INVENTORY_REFERENCE_TYPE,
      branchId: input.branchId,
      ingredientId: input.ingredientId,
      transactionType: input.quantityChange < 0 ? "ORDER_DEDUCTION" : "ORDER_REVERSAL",
      quantityChange: input.quantityChange,
      previousQuantity: previous,
      newQuantity: next,
      reason: input.reason,
      createdByUserId: input.userId,
      actorType: "USER",
      orderId: input.orderId,
    },
  });

    const alertType = Number(updated.quantityOnHand) <= 0
    ? "OUT_OF_STOCK"
    : Number(updated.quantityOnHand) <= Number(updated.minimumStockLevel)
      ? "LOW_STOCK"
      : null;

  const openAlerts = await tx.inventoryAlert.findMany({
    where: {
      branchId: input.branchId,
      ingredientId: input.ingredientId,
      resolvedAt: null,
    },
    select: { id: true, alertType: true },
  });

  if (!alertType) {
    if (openAlerts.length) {
      await tx.inventoryAlert.updateMany({
        where: { id: { in: openAlerts.map((a: any) => a.id) } },
        data: { resolvedAt: new Date() },
      });
    }
  } else {
    let shouldNotify = false;

    if (openAlerts.length) {
      const [first, ...duplicates] = openAlerts;

      // Notify only when the existing alert changes severity.
      if (first.alertType !== alertType) {
        await tx.inventoryAlert.update({
          where: { id: first.id },
          data: { alertType },
        });
        shouldNotify = true;
      }

      if (duplicates.length) {
        await tx.inventoryAlert.updateMany({
          where: { id: { in: duplicates.map((a: any) => a.id) } },
          data: { resolvedAt: new Date() },
        });
      }
    } else {
      await tx.inventoryAlert.create({
        data: {
          branchId: input.branchId,
          ingredientId: input.ingredientId,
          alertType,
        },
      });
      shouldNotify = true;
    }

    if (shouldNotify) {
      const ingredient = await tx.ingredient.findUnique({
        where: { id: input.ingredientId },
        select: { name: true, unit: true },
      });

      // Notify only active Branch Managers assigned to this branch.
      const managers = await tx.user.findMany({
        where: {
          branchId: input.branchId,
          role: "BRANCH_MANAGER",
          isActive: true,
        },
        select: { id: true },
      });

      if (managers.length) {
        await tx.notification.createMany({
          data: managers.map((manager: { id: string }) => ({
            userId: manager.id,
            branchId: input.branchId,
            title:
              alertType === "OUT_OF_STOCK"
                ? "Ingredient out of stock"
                : "Low inventory alert",
            message: `${ingredient?.name ?? "An ingredient"} is ${
              alertType === "OUT_OF_STOCK"
                ? "out of stock"
                : "at or below its minimum stock level"
            }. Current quantity: ${Number(updated.quantityOnHand)} ${ingredient?.unit ?? "units"}.`,
            type: alertType,
          })),
        });
      }
    }
  }
}

async function validateAndBuildOrder(
  tx: any,
  input: CreateOrderInput,
  allowOccupiedTable = false,
  preservedRecipeVersionIds?: Map<string, string>,
) {
  const branch = await tx.branch.findUnique({
    where: { id: input.branchId },
    select: { id: true, isActive: true },
  });
  if (!branch?.isActive) throw new AppError("Branch not found or inactive", 404);

  const table = await tx.restaurantTable.findUnique({
    where: { id: input.tableId },
    select: { id: true, branchId: true, status: true },
  });
  if (!table || table.branchId !== input.branchId) throw new AppError("Table not found at this branch", 404);
  if (table.status === "INACTIVE") throw new AppError("This table is inactive", 409);

  // Active orders, not the stored OCCUPIED flag, determine table availability.
  if (!allowOccupiedTable) {
    const activeOrder = await tx.order.findFirst({
      where: { tableId: input.tableId, status: { in: ["NEW", "PREPARING", "READY", "COMPLETED"] }, payments: { none: { status: "SUCCESSFUL" } } },
      select: { id: true },
    });
    if (activeOrder) throw new AppError("Table is not available", 409);
  }

  const server = await tx.user.findUnique({
    where: { id: input.serverId },
    select: { id: true, role: true, branchId: true, isActive: true },
  });
  if (!server || !server.isActive || server.role !== "SERVER" || server.branchId !== input.branchId) {
    throw new AppError("Assigned server is not active at this branch", 400);
  }

  if (!input.items.length) throw new AppError("An order must contain at least one item", 400);

  const consolidated = new Map<string, number>();
  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
      throw new AppError("Item quantities must be whole numbers between 1 and 50", 400);
    }
    consolidated.set(item.menuItemId, (consolidated.get(item.menuItemId) ?? 0) + item.quantity);
  }

  // Enforce the per-item limit after duplicate menu-item lines are combined.
  for (const quantity of consolidated.values()) {
    if (quantity > 50) {
      throw new AppError("Item quantities must be whole numbers between 1 and 50", 400);
    }
  }

  const lines: any[] = [];
  const ingredientNeeds = new Map<string, { quantity: number; unit: string; name: string }>();
  let subtotal = 0;

  for (const [menuItemId, quantity] of consolidated) {
    const menuItem = await tx.menuItem.findUnique({
      where: { id: menuItemId },
      include: {
        category: true,
        branchAvailabilities: { where: { branchId: input.branchId } },
        configuredSides: {
          orderBy: { position: "asc" },
          select: { id: true, sideName: true, position: true },
        },
        recipe: { include: { versions: { where: { status: "PUBLISHED" }, orderBy: { versionNumber: "desc" }, take: 1, include: { ingredients: { include: { ingredient: true } } } } } },
      },
    });

    const availability = menuItem?.branchAvailabilities[0];
    if (!menuItem || !menuItem.isActive || !menuItem.category.isActive ||
        !availability?.isAvailable || availability.isBlockedByStock ||
        availability.requiresReactivationConfirmation) {
      throw new AppError("One or more menu items are unavailable at this branch", 409);
    }

    // Existing order lines keep their original recipe version, even if it has since been archived.
    const preservedVersionId = preservedRecipeVersionIds?.get(menuItemId);
    const recipeVersion = preservedVersionId
      ? await tx.recipeVersion.findFirst({
          where: { id: preservedVersionId, recipeId: menuItem.recipe?.id },
          include: { ingredients: { include: { ingredient: true } } },
        })
      : menuItem.recipe?.versions[0];
    if (!recipeVersion) {
      throw new AppError(`No valid recipe version is available for ${menuItem.name}`, 409);
    }

    for (const ingredientLine of recipeVersion.ingredients) {
      if (!ingredientLine.ingredient.isActive) throw new AppError(`Ingredient ${ingredientLine.ingredient.name} is inactive`, 409);
      if (ingredientLine.unit !== ingredientLine.ingredient.unit) {
        throw new AppError(`Recipe unit does not match inventory unit for ${ingredientLine.ingredient.name}`, 409);
      }
      const needed = Number(ingredientLine.quantity) * quantity;
      const current = ingredientNeeds.get(ingredientLine.ingredientId);
      ingredientNeeds.set(ingredientLine.ingredientId, {
        quantity: (current?.quantity ?? 0) + needed,
        unit: ingredientLine.unit,
        name: ingredientLine.ingredient.name,
      });
    }

    const price = Number(menuItem.price);
    const lineSubtotal = money(price * quantity);
    subtotal = money(subtotal + lineSubtotal);

    const sides = menuItem.configuredSides.map((side: any) => ({
      sourceMealSideId: side.id,
      sideNameSnapshot: side.sideName,
      quantity,
    }));
    if (menuItem.category.name === "Steak Meals" && sides.length !== 2) {
      throw new AppError(`${menuItem.name} must have exactly two configured sides`, 409);
    }

    lines.push({
      menuItemId,
      menuItemNameSnapshot: menuItem.name,
      unitPriceSnapshot: price,
      quantity,
      lineSubtotal,
      recipeVersionId: recipeVersion.id,
      sides,
    });
  }

  // Apply the best eligible promotion separately to each menu item.
  let discountTotal = 0;
  const now = new Date();

  for (const line of lines) {
    // Promotion timestamps are stored as instants; comparing them with now respects the branch-local schedule
    // once HQ saves the branch-local start/end values converted to UTC.
    const eligiblePromotions = await tx.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        branches: { some: { branchId: input.branchId } },
        items: { some: { menuItemId: line.menuItemId } },
      },
      orderBy: { createdAt: "asc" },
    });

    let bestPromotion: any = null;
    let bestDiscount = 0;

    for (const promotion of eligiblePromotions) {
      const value = Number(promotion.discountValue);

      // Ignore invalid promotion settings so a bad promotion cannot block an otherwise valid order.
      if (promotion.discountType === "PERCENTAGE" && (value <= 0 || value > 50)) continue;
      if (promotion.discountType === "FIXED_AMOUNT" && (value <= 0 || value > line.unitPriceSnapshot)) continue;

      // Fixed discounts apply once per eligible unit; percentage discounts apply to the line subtotal.
      const saving = promotion.discountType === "PERCENTAGE"
        ? money(line.lineSubtotal * value / 100)
        : money(Math.min(value * line.quantity, line.lineSubtotal));

      if (saving > bestDiscount) {
        bestPromotion = promotion;
        bestDiscount = saving;
      }
    }

    line.promotionId = bestPromotion?.id ?? null;
    line.promotionNameSnapshot = bestPromotion?.name ?? null;
    line.promotionDiscountTypeSnapshot = bestPromotion?.discountType ?? null;
    line.promotionDiscountValueSnapshot = bestPromotion?.discountValue ?? null;
    line.promotionDiscountAmount = bestDiscount;
    line.lineTotal = money(line.lineSubtotal - bestDiscount);
    discountTotal = money(discountTotal + bestDiscount);
  }

  const taxableTotal = Math.max(0, money(subtotal - discountTotal));
  const taxTotal = money(taxableTotal * VAT_RATE / (1 + VAT_RATE));
  const totalAmount = taxableTotal;

  return { lines, ingredientNeeds, subtotal, discountTotal, taxTotal, totalAmount };
}

// Create an order, snapshot its menu and recipe data, and deduct stock atomically.
export async function createOrder(input: CreateOrderInput) {
  const order = await prisma.$transaction(async (tx: any) => {
    const built = await validateAndBuildOrder(tx, input);
    const orderNumber = await nextReference(tx, input.branchId, ORDER_REFERENCE_TYPE);

    const order = await tx.order.create({
      data: {
        orderNumber,
        branchId: input.branchId,
        tableId: input.tableId,
        serverId: input.serverId,
        subtotal: built.subtotal,
        discountTotal: built.discountTotal,
        taxTotal: built.taxTotal,
        totalAmount: built.totalAmount,
        items: {
          create: built.lines.map((line) => ({
            menuItemId: line.menuItemId,
            menuItemNameSnapshot: line.menuItemNameSnapshot,
            unitPriceSnapshot: line.unitPriceSnapshot,
            quantity: line.quantity,
            lineSubtotal: line.lineSubtotal,
            promotionId: line.promotionId,
            promotionNameSnapshot: line.promotionNameSnapshot,
            promotionDiscountTypeSnapshot: line.promotionDiscountTypeSnapshot,
            promotionDiscountValueSnapshot: line.promotionDiscountValueSnapshot,
            promotionDiscountAmount: line.promotionDiscountAmount,
            lineTotal: line.lineTotal,
            recipeVersionId: line.recipeVersionId,
            sides: { create: line.sides },
          })),
        },
        statusHistory: { create: { previousStatus: null, newStatus: "NEW", changedByUserId: input.serverId, note: "Order submitted" } },
      },
      include: { items: { include: { sides: true } }, promotion: true },
    });

    for (const [ingredientId, need] of built.ingredientNeeds) {
      await recordOrderStockMovement(tx, {
        branchId: input.branchId,
        ingredientId,
        orderId: order.id,
        userId: input.serverId,
        quantityChange: -need.quantity,
        reason: `Order ${order.orderNumber} submitted`,
      });
    }

    await tx.restaurantTable.update({ where: { id: input.tableId }, data: { status: "OCCUPIED" } });
    await tx.auditLog.create({
      data: {
        userId: input.serverId, actorType: "USER", branchId: input.branchId,
        action: "ORDER_CREATED", entityType: "Order", entityId: order.id,
        details: { orderNumber: order.orderNumber, itemCount: built.lines.length, totalAmount: String(built.totalAmount) },
      },
    });
    
    return order;
  }, { isolationLevel: "Serializable" });
  return order;
}

// Edit only the authenticated Server's own NEW order and keep stock changes atomic.
export async function editOrder(input: { orderId: string; branchId: string; serverId: string; items: OrderLineInput[] }) {
  return prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, branchId: input.branchId },
      include: { items: { include: { sides: true } }, payments: true },
    });
    if (!order) throw new AppError("Order not found", 404);
    if (order.serverId !== input.serverId) throw new AppError("Servers can only edit orders they created", 403);
    if (order.status !== "NEW") throw new AppError("Only NEW orders can be edited", 409);
    if (order.payments.length) throw new AppError("An order with a payment cannot be edited", 409);

    // Keep the recipe version already attached to each existing menu item.
    // Newly added menu items still use their latest published recipe version.
    const preservedRecipeVersionIds = new Map<string, string>(
      order.items.map((item: any) => [item.menuItemId, item.recipeVersionId]),
    );

    // Rebuild the order using current menu and promotion rules without changing its recipe history.
    const built = await validateAndBuildOrder(tx, {
      branchId: order.branchId,
      tableId: order.tableId,
      serverId: input.serverId,
      items: input.items,
    }, true, preservedRecipeVersionIds);

    // Reverse the order's current net stock effect, including any earlier edits.
    const movements = await tx.inventoryTransaction.findMany({
      where: { orderId: order.id },
      select: { ingredientId: true, quantityChange: true },
    });
    const currentNetByIngredient = new Map<string, number>();
    for (const movement of movements) {
      currentNetByIngredient.set(
        movement.ingredientId,
        (currentNetByIngredient.get(movement.ingredientId) ?? 0) + Number(movement.quantityChange),
      );
    }
    for (const [ingredientId, netChange] of currentNetByIngredient) {
      if (netChange !== 0) {
        await recordOrderStockMovement(tx, {
          branchId: order.branchId,
          ingredientId,
          orderId: order.id,
          userId: input.serverId,
          quantityChange: -netChange,
          reason: `Inventory adjustment for editing order ${order.orderNumber}`,
        });
      }
    }

    // Apply the revised recipe quantities; insufficient stock rolls back the entire edit.
    for (const [ingredientId, need] of built.ingredientNeeds) {
      await recordOrderStockMovement(tx, {
        branchId: order.branchId,
        ingredientId,
        orderId: order.id,
        userId: input.serverId,
        quantityChange: -need.quantity,
        reason: `Revised inventory deduction for order ${order.orderNumber}`,
      });
    }

    // Replace the order's item and side snapshots with the recalculated versions.
    const itemIds = order.items.map((item: any) => item.id);
    if (itemIds.length) {
      await tx.orderItemSide.deleteMany({ where: { orderItemId: { in: itemIds } } });
      await tx.orderItem.deleteMany({ where: { id: { in: itemIds } } });
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        subtotal: built.subtotal,
        discountTotal: built.discountTotal,
        taxTotal: built.taxTotal,
        totalAmount: built.totalAmount,
        items: {
          create: built.lines.map((line) => ({
            menuItemId: line.menuItemId,
            menuItemNameSnapshot: line.menuItemNameSnapshot,
            unitPriceSnapshot: line.unitPriceSnapshot,
            quantity: line.quantity,
            lineSubtotal: line.lineSubtotal,
            promotionId: line.promotionId,
            promotionNameSnapshot: line.promotionNameSnapshot,
            promotionDiscountTypeSnapshot: line.promotionDiscountTypeSnapshot,
            promotionDiscountValueSnapshot: line.promotionDiscountValueSnapshot,
            promotionDiscountAmount: line.promotionDiscountAmount,
            lineTotal: line.lineTotal,
            recipeVersionId: line.recipeVersionId,
            sides: { create: line.sides },
          })),
        },
      },
      include: { items: { include: { sides: true } }, promotion: true },
    });
  }, { isolationLevel: "Serializable" });
}

// Retrieve an order with its item-level promotion snapshots, sides, history, and payment summary.
export async function getOrder(orderId: string, branchId?: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...(branchId ? { branchId } : {}) },
    include: {
      items: { include: { sides: true } },
      statusHistory: { orderBy: { changedAt: "asc" } },
      promotion: true,
      payments: { include: { refunds: true }, orderBy: { createdAt: "desc" } },
      table: { select: { id: true, tableNumber: true } },
      server: { select: { id: true, firstName: true, lastName: true } },
      inventoryTransactions: { select: { id: true, ingredientId: true, transactionType: true, quantityChange: true, reason: true, createdAt: true } },
    },
  });
  if (!order) throw new AppError("Order not found", 404);
  return order;
}

// List orders, scoped to a branch when required.
export async function getOrders(input: { branchId?: string; status?: string; from?: Date; to?: Date }) {
  return prisma.order.findMany({
    where: {
      ...(input.branchId && { branchId: input.branchId }),
      ...(input.status && { status: input.status as never }),
      ...(input.from || input.to ? { createdAt: { ...(input.from && { gte: input.from }), ...(input.to && { lte: input.to }) } } : {}),
    },
    include: {
      items: { include: { sides: true } },
      table: { select: { tableNumber: true } },
      server: { select: { id: true, firstName: true, lastName: true } },
      payments: {
        select: {
          id: true,
          status: true,
          amount: true,
          refunds: {
            select: {
              id: true,
              amount: true,
              reason: true,
              status: true,
              createdAt: true,
              processedAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Retrieve active kitchen orders for one branch.
export async function getKitchenQueue(branchId: string) {
  return prisma.order.findMany({
    where: { branchId, status: { in: ["NEW", "PREPARING", "READY"] } },
    include: {
      items: { include: { sides: true } },
      table: { select: { tableNumber: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// Apply an allowed order status transition and record its history.
export async function updateOrderStatus(input: { orderId: string; branchId?: string; userId: string; role: string; status: "PREPARING" | "READY" | "COMPLETED" }) {
  return prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findFirst({ where: { id: input.orderId, ...(input.branchId && { branchId: input.branchId }) } });
    if (!order) throw new AppError("Order not found", 404);

    const allowed =
      (order.status === "NEW" && input.status === "PREPARING" && input.role === "COOK") ||
      (order.status === "PREPARING" && input.status === "READY" && input.role === "COOK") ||
      (order.status === "READY" && input.status === "COMPLETED" && input.role === "SERVER");
    if (!allowed) throw new AppError("This order status transition is not permitted", 409);

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: input.status,
        ...(input.status === "COMPLETED" && { completedAt: new Date() }),
        ...(input.status === "COMPLETED" && { }),
      },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, previousStatus: order.status, newStatus: input.status, changedByUserId: input.userId },
    });
    await tx.auditLog.create({
      data: { userId: input.userId, actorType: "USER", branchId: order.branchId, action: "ORDER_STATUS_CHANGED", entityType: "Order", entityId: order.id, details: { orderNumber: order.orderNumber, previousStatus: order.status, newStatus: input.status } },
    });
    return updated;
  });
}

// Cancel only NEW orders; restore the exact quantities recorded by deductions.
export async function cancelOrder(input: { orderId: string; branchId: string; userId: string; role: string; reason: string }) {
  return prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findFirst({ where: { id: input.orderId, branchId: input.branchId } });
    if (!order) throw new AppError("Order not found", 404);
    if (order.status !== "NEW") throw new AppError("Only NEW orders can be cancelled", 409);
    if (input.role === "SERVER" && order.serverId !== input.userId) {
      throw new AppError("Servers can only cancel orders they created", 403);
    }
    if (!["SERVER", "BRANCH_MANAGER"].includes(input.role)) {
      throw new AppError("You are not authorized to cancel this order", 403);
    }
    if (!input.reason.trim()) throw new AppError("A cancellation reason is required", 400);

    // Calculate the remaining net inventory deduction, including previous reversals.
const movements = await tx.inventoryTransaction.findMany({
  where: { orderId: order.id },
  select: { ingredientId: true, quantityChange: true },
});

const grouped = new Map<string, number>();

for (const movement of movements) {
  grouped.set(
    movement.ingredientId,
    (grouped.get(movement.ingredientId) ?? 0) +
      Number(movement.quantityChange),
  );
}

// Reverse only the remaining deduction for each ingredient.
for (const [ingredientId, netChange] of grouped) {
  if (netChange < 0) {
    await recordOrderStockMovement(tx, {
      branchId: order.branchId,
      ingredientId,
      orderId: order.id,
      userId: input.userId,
      quantityChange: -netChange,
      reason: `Cancellation reversal for order ${order.orderNumber}`,
    });
  }
}

    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelledByUserId: input.userId, cancellationReason: input.reason.trim() },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, previousStatus: "NEW", newStatus: "CANCELLED", changedByUserId: input.userId, note: input.reason.trim() },
    });
    await tx.restaurantTable.update({ where: { id: order.tableId }, data: { status: "AVAILABLE" } });
    await tx.auditLog.create({
      data: { userId: input.userId, actorType: "USER", branchId: order.branchId, action: "ORDER_CANCELLED", entityType: "Order", entityId: order.id, details: { orderNumber: order.orderNumber, reason: input.reason.trim() } },
    });
    return { id: order.id, orderNumber: order.orderNumber, status: "CANCELLED" };
  }, { isolationLevel: "Serializable" });
}
