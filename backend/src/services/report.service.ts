import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

type ReportPeriod = "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "custom";

type DateRangeInput = {
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
};

type DateRange = { start: Date; endExclusive: Date };

// Read a calendar date in the branch's own IANA time zone.
function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { year: Number(value("year")), month: Number(value("month")), day: Number(value("day")) };
}

// Convert local midnight to UTC without relying on the server's configured time zone.
function localMidnightUtc(year: number, month: number, day: number, timeZone: string) {
  const target = Date.UTC(year, month - 1, day);
  let guess = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));

    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const represented = Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
      value("second"),
    );
    guess += target - represented;
  }

  return new Date(guess);
}

function addCalendarDays(year: number, month: number, day: number, amount: number) {
  const result = new Date(Date.UTC(year, month - 1, day + amount));
  return { year: result.getUTCFullYear(), month: result.getUTCMonth() + 1, day: result.getUTCDate() };
}

// Build a half-open date range [start, endExclusive) in the branch's local time.
function getDateRange(input: DateRangeInput, timeZone: string): DateRange {
  if (input.period === "custom") {
    if (!input.startDate || !input.endDate) {
      throw new AppError("Custom reports require startDate and endDate", 400);
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(input.startDate) || !datePattern.test(input.endDate)) {
      throw new AppError("Dates must use YYYY-MM-DD format", 400);
    }

    const [startYear, startMonth, startDay] = input.startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = input.endDate.split("-").map(Number);
    const validDate = (year: number, month: number, day: number) => {
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
    };
    if (!validDate(startYear, startMonth, startDay) || !validDate(endYear, endMonth, endDay)) {
      throw new AppError("Custom dates must be valid calendar dates", 400);
    }

    const start = localMidnightUtc(startYear, startMonth, startDay, timeZone);
    const endStart = localMidnightUtc(endYear, endMonth, endDay, timeZone);

    if (Number.isNaN(start.getTime()) || Number.isNaN(endStart.getTime()) || start > endStart) {
      throw new AppError("Custom endDate must be on or after startDate", 400);
    }

    const nextDay = addCalendarDays(endYear, endMonth, endDay, 1);
    return { start, endExclusive: localMidnightUtc(nextDay.year, nextDay.month, nextDay.day, timeZone) };
  }

  const now = new Date();
  const today = localDateParts(now, timeZone);
  let startParts = today;
  let endParts = addCalendarDays(today.year, today.month, today.day, 1);

  if (input.period === "yesterday") {
    startParts = addCalendarDays(today.year, today.month, today.day, -1);
    endParts = today;
  } else if (input.period === "thisWeek") {
    const weekday = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    const daysSinceMonday = (weekday + 6) % 7;
    startParts = addCalendarDays(today.year, today.month, today.day, -daysSinceMonday);
  } else if (input.period === "thisMonth") {
    startParts = { year: today.year, month: today.month, day: 1 };
  } else if (input.period === "lastMonth") {
    const firstOfThisMonth = { year: today.year, month: today.month, day: 1 };
    startParts = addCalendarDays(firstOfThisMonth.year, firstOfThisMonth.month, 1, -1);
    endParts = firstOfThisMonth;
  }

  return {
    start: localMidnightUtc(startParts.year, startParts.month, startParts.day, timeZone),
    endExclusive: localMidnightUtc(endParts.year, endParts.month, endParts.day, timeZone),
  };
}

// Resolve the permitted branch set before any report query is made.
async function getReportBranches(role: string, assignedBranchId: string | null, requestedBranchId?: string) {
  if (role === "BRANCH_MANAGER") {
    if (!assignedBranchId) throw new AppError("Branch assignment is required", 403);
    if (requestedBranchId && requestedBranchId !== assignedBranchId) {
      throw new AppError("You can only view reports for your assigned branch", 403);
    }
    const branch = await prisma.branch.findFirst({
      where: { id: assignedBranchId, isActive: true },
      select: { id: true, branchCode: true, name: true, timeZone: true },
    });
    if (!branch) throw new AppError("Assigned branch not found or inactive", 404);
    return [branch];
  }

  if (role !== "HEADQUARTERS_MANAGER") {
    throw new AppError("You are not authorized to view reports", 403);
  }

  const branches = await prisma.branch.findMany({
    where: { isActive: true, ...(requestedBranchId ? { id: requestedBranchId } : {}) },
    select: { id: true, branchCode: true, name: true, timeZone: true },
    orderBy: { branchCode: "asc" },
  });
  if (requestedBranchId && branches.length === 0) throw new AppError("Branch not found or inactive", 404);
  return branches;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dateFilter(range: DateRange) {
  return { gte: range.start, lt: range.endExclusive };
}

type PromotionReportItem = {
  promotionId: string | null;
  promotionNameSnapshot: string | null;
  promotionDiscountAmount: unknown;
  lineSubtotal: unknown;
};

type PromotionReportOrder = {
  items: PromotionReportItem[];
};

// Group by the immutable promotion ID, not its display name.
// The name snapshot remains the label shown in historical reports.
export function buildPromotionPerformance(orders: PromotionReportOrder[]) {
  const promotionTotals = new Map<string, {
    promotionId: string | null;
    promotion: string;
    orders: number;
    discount: number;
    grossSales: number;
  }>();

  for (const order of orders) {
    const orderPromotions = new Map<string, {
      promotionId: string | null;
      promotion: string;
      discount: number;
      grossSales: number;
    }>();

    for (const item of order.items) {
      if (!item.promotionNameSnapshot) continue;

      // Legacy rows without an ID remain reportable by their name snapshot.
      const key = item.promotionId
        ? `id:${item.promotionId}`
        : `name:${item.promotionNameSnapshot}`;

      const current = orderPromotions.get(key) ?? {
        promotionId: item.promotionId,
        promotion: item.promotionNameSnapshot,
        discount: 0,
        grossSales: 0,
      };

      current.discount += Number(item.promotionDiscountAmount);
      current.grossSales += Number(item.lineSubtotal);
      orderPromotions.set(key, current);
    }

    // Count a promotion once per order, even when multiple items use it.
    for (const [key, values] of orderPromotions) {
      const current = promotionTotals.get(key) ?? {
        promotionId: values.promotionId,
        promotion: values.promotion,
        orders: 0,
        discount: 0,
        grossSales: 0,
      };

      current.orders += 1;
      current.discount += values.discount;
      current.grossSales += values.grossSales;
      promotionTotals.set(key, current);
    }
  }

  return [...promotionTotals.values()]
    .map((values) => ({
      promotionId: values.promotionId,
      promotion: values.promotion,
      ordersUsingPromotion: values.orders,
      discountTotal: roundMoney(values.discount),
      grossSales: roundMoney(values.grossSales),
    }))
    .sort((a, b) => b.discountTotal - a.discountTotal);
}

// Return sales totals and line-item breakdowns using completed-order dates.
export async function getSalesReport(input: {
  role: string;
  assignedBranchId: string | null;
  requestedBranchId?: string;
  range: DateRangeInput;
}) {
  const branches = await getReportBranches(input.role, input.assignedBranchId, input.requestedBranchId);
  const results = await Promise.all(branches.map(async (branch) => {
    const range = getDateRange(input.range, branch.timeZone);
    const orders = await prisma.order.findMany({
      where: { branchId: branch.id, status: "COMPLETED", completedAt: dateFilter(range) },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        discountTotal: true,
        totalAmount: true,
        completedAt: true,
        items: {
          select: {
            menuItemNameSnapshot: true,
            quantity: true,
            lineSubtotal: true,
            promotionId: true,
            promotionNameSnapshot: true,
            promotionDiscountAmount: true,
            menuItem: { select: { category: { select: { name: true } } } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    const refunds = await prisma.refund.findMany({
      where: {
        status: "PROCESSED",
        processedAt: dateFilter(range),
        payment: { order: { branchId: branch.id } },
      },
      select: { amount: true },
    });

    const grossSales = orders.reduce((sum, order) => sum + Number(order.subtotal), 0);
    const discounts = orders.reduce((sum, order) => sum + Number(order.discountTotal), 0);
    const refundTotal = refunds.reduce((sum, refund) => sum + Number(refund.amount), 0);
    const netSales = grossSales - discounts - refundTotal;

    const categoryTotals = new Map<string, number>();
    const itemTotals = new Map<string, { quantity: number; revenue: number }>();
    
    for (const order of orders) {
      for (const item of order.items) {
        const categoryName = item.menuItem.category.name;
        categoryTotals.set(categoryName, (categoryTotals.get(categoryName) ?? 0) + Number(item.lineSubtotal));

        const current = itemTotals.get(item.menuItemNameSnapshot) ?? { quantity: 0, revenue: 0 };
        current.quantity += item.quantity;
        current.revenue += Number(item.lineSubtotal);
        itemTotals.set(item.menuItemNameSnapshot, current);
      }

    }

    return {
      branch: { id: branch.id, branchCode: branch.branchCode, name: branch.name, timeZone: branch.timeZone },
      period: { start: range.start, endExclusive: range.endExclusive, timeZone: branch.timeZone },
      summary: {
        grossSales: roundMoney(grossSales),
        discounts: roundMoney(discounts),
        refunds: roundMoney(refundTotal),
        netSales: roundMoney(netSales),
        completedOrderCount: orders.length,
        averageOrderValue: orders.length ? roundMoney(netSales / orders.length) : 0,
      },
      revenueByCategory: [...categoryTotals.entries()]
        .map(([category, revenue]) => ({ category, grossRevenue: roundMoney(revenue) }))
        .sort((a, b) => b.grossRevenue - a.grossRevenue),
      bestSellingItems: [...itemTotals.entries()]
        .map(([menuItem, values]) => ({ menuItem, quantitySold: values.quantity, grossRevenue: roundMoney(values.revenue) }))
        .sort((a, b) => b.quantitySold - a.quantitySold),
      promotionPerformance: buildPromotionPerformance(orders),
    };
  }));

  const summary = results.reduce((total, result) => ({
    grossSales: total.grossSales + result.summary.grossSales,
    discounts: total.discounts + result.summary.discounts,
    refunds: total.refunds + result.summary.refunds,
    netSales: total.netSales + result.summary.netSales,
    completedOrderCount: total.completedOrderCount + result.summary.completedOrderCount,
  }), { grossSales: 0, discounts: 0, refunds: 0, netSales: 0, completedOrderCount: 0 });

  return {
    scope: input.requestedBranchId ? "BRANCH" : input.role === "BRANCH_MANAGER" ? "BRANCH" : "ALL_BRANCHES",
    summary: {
      ...Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, key === "completedOrderCount" ? value : roundMoney(value)])),
      averageOrderValue: summary.completedOrderCount ? roundMoney(summary.netSales / summary.completedOrderCount) : 0,
    },
    branches: results,
  };
}

// Current stock and unresolved stock alerts for the permitted branch set.
export async function getInventoryReport(input: {
  role: string;
  assignedBranchId: string | null;
  requestedBranchId?: string;
}) {
  const branches = await getReportBranches(input.role, input.assignedBranchId, input.requestedBranchId);
  const results = await Promise.all(branches.map(async (branch) => {
    const [inventory, alerts] = await Promise.all([
      prisma.branchInventory.findMany({
        where: { branchId: branch.id, ingredient: { isActive: true } },
        select: {
          quantityOnHand: true,
          minimumStockLevel: true,
          ingredient: { select: { id: true, name: true, unit: true } },
        },
        orderBy: { ingredient: { name: "asc" } },
      }),
      prisma.inventoryAlert.findMany({
        where: { branchId: branch.id, resolvedAt: null },
        select: {
          id: true,
          alertType: true,
          createdAt: true,
          ingredient: { select: { id: true, name: true, unit: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const stockItems = inventory.map((record) => ({
      ingredientId: record.ingredient.id,
      ingredient: record.ingredient.name,
      unit: record.ingredient.unit,
      quantityOnHand: Number(record.quantityOnHand),
      minimumStockLevel: Number(record.minimumStockLevel),
      stockStatus: Number(record.quantityOnHand) <= 0
        ? "OUT_OF_STOCK"
        : Number(record.quantityOnHand) <= Number(record.minimumStockLevel)
          ? "LOW_STOCK"
          : "IN_STOCK",
    }));

    return {
      branch: { id: branch.id, branchCode: branch.branchCode, name: branch.name },
      summary: {
        ingredientCount: stockItems.length,
        lowStockCount: stockItems.filter((item) => item.stockStatus === "LOW_STOCK").length,
        outOfStockCount: stockItems.filter((item) => item.stockStatus === "OUT_OF_STOCK").length,
        unresolvedAlertCount: alerts.length,
      },
      inventory: stockItems,
      alerts,
    };
  }));

  return { branches: results };
}

// Historical receipts, adjustments, wastage and other inventory movements.
export async function getInventoryHistory(input: {
  role: string;
  assignedBranchId: string | null;
  requestedBranchId?: string;
  startDate?: string;
  endDate?: string;
  ingredientId?: string;
}) {
  const branches = await getReportBranches(input.role, input.assignedBranchId, input.requestedBranchId);
  const results = await Promise.all(branches.map(async (branch) => {
    let createdAt: { gte?: Date; lt?: Date } | undefined;
    if (input.startDate || input.endDate) {
      const startDate = input.startDate ?? input.endDate!;
      const endDate = input.endDate ?? input.startDate!;
      const range = getDateRange({ period: "custom", startDate, endDate }, branch.timeZone);
      createdAt = dateFilter(range);
    }

    const transactions = await prisma.inventoryTransaction.findMany({
      where: {
        branchId: branch.id,
        ...(input.ingredientId ? { ingredientId: input.ingredientId } : {}),
        ...(createdAt ? { createdAt } : {}),
      },
      select: {
        id: true,
        referenceNumber: true,
        transactionType: true,
        quantityChange: true,
        previousQuantity: true,
        newQuantity: true,
        unitCost: true,
        supplierName: true,
        reason: true,
        notes: true,
        createdAt: true,
        ingredient: { select: { id: true, name: true, unit: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return {
      branch: { id: branch.id, branchCode: branch.branchCode, name: branch.name },
      count: transactions.length,
      transactions,
    };
  }));

  return { branches: results };
}
