import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Keep promotion responses consistent without adding a separate status column.
function getPromotionStatus(promotion: { isActive: boolean; startDate: Date; endDate: Date }) {
  const now = new Date();

  if (!promotion.isActive) return "INACTIVE";
  if (now < promotion.startDate) return "SCHEDULED";
  if (now > promotion.endDate) return "EXPIRED";
  return "ACTIVE";
}

// Convert a timestamp's explicit UTC offset into minutes.
function getSuppliedOffsetMinutes(value: string) {
  if (value.endsWith("Z")) return 0;

  const match = value.match(/([+-])(\d{2}):(\d{2})$/);
  if (!match) throw new AppError("Promotion dates must include a UTC offset", 400);

  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "+" ? minutes : -minutes;
}

// Find the UTC offset used by an IANA timezone at a specific instant.
function getTimezoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return Math.round((localAsUtc - date.getTime()) / 60000);
}

// Ensure HQ's supplied timestamps use the local offset for every selected branch.
function validateBranchLocalDates(
  branches: Array<{ id: string; timeZone: string }>,
  startDate: Date,
  endDate: Date,
  startDateInput: string,
  endDateInput: string,
) {
  const suppliedStartOffset = getSuppliedOffsetMinutes(startDateInput);
  const suppliedEndOffset = getSuppliedOffsetMinutes(endDateInput);

  for (const branch of branches) {
    const expectedStartOffset = getTimezoneOffsetMinutes(startDate, branch.timeZone);
    const expectedEndOffset = getTimezoneOffsetMinutes(endDate, branch.timeZone);

    if (suppliedStartOffset !== expectedStartOffset || suppliedEndOffset !== expectedEndOffset) {
      throw new AppError(
        `Promotion dates must use the local UTC offset for branch ${branch.id} (${branch.timeZone}) on each selected date`,
        400,
      );
    }
  }
}

// Check that supplied IDs are valid, active records before linking them.
async function validatePromotionSelections(
  branchIds: string[],
  menuItemIds: string[],
  discountType: "PERCENTAGE" | "FIXED_AMOUNT",
  discountValue: number,
  startDate: Date,
  endDate: Date,
  startDateInput: string,
  endDateInput: string,
) {
  const [branches, menuItems] = await Promise.all([
    prisma.branch.findMany({
      where: { id: { in: branchIds }, isActive: true },
      select: { id: true, timeZone: true },
    }),
    prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isActive: true, category: { isActive: true } },
      select: { id: true, price: true },
    }),
  ]);

  if (branches.length !== branchIds.length) {
    throw new AppError("One or more selected branches do not exist or are inactive", 400);
  }

  // Ensure branch time zones are valid IANA identifiers.
  for (const branch of branches) {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: branch.timeZone });
    } catch {
      throw new AppError(`Branch ${branch.id} has an invalid time zone configuration`, 409);
    }
  }

  // Validate both dates separately because the branch offset can change with daylight saving.
  validateBranchLocalDates(branches, startDate, endDate, startDateInput, endDateInput);

  if (menuItems.length !== menuItemIds.length) {
    throw new AppError("One or more selected menu items do not exist or are inactive", 400);
  }

  // A fixed discount applies per eligible unit and cannot exceed any selected item's price.
  if (discountType === "FIXED_AMOUNT") {
    const lowestItemPrice = Math.min(...menuItems.map((item) => Number(item.price)));
    if (discountValue > lowestItemPrice) {
      throw new AppError("The fixed discount cannot exceed the price of any eligible menu item", 400);
    }
  }
}

// Return branch and item details with a status derived from the dates and active flag.
function formatPromotion<T extends { isActive: boolean; startDate: Date; endDate: Date }>(promotion: T) {
  return { ...promotion, status: getPromotionStatus(promotion) };
}

// Retrieve promotions visible to HQ or to one authenticated branch.
export async function getPromotions(input: {
  role: string;
  branchId?: string;
  requestedBranchId?: string;
}) {
  if (
  (input.role === "BRANCH_MANAGER" || input.role === "SERVER") &&
  !input.branchId
) {
  throw new AppError("Branch assignment is required", 403);
}

  // Branch Managers and Servers can only see their assigned branch.
  const branchFilter =
    input.role === "BRANCH_MANAGER" || input.role === "SERVER"
      ? input.branchId
      : input.requestedBranchId;

  const promotions = await prisma.promotion.findMany({
    where: branchFilter
      ? { branches: { some: { branchId: branchFilter } } }
      : {},
    include: {
      branches: {
        include: { branch: { select: { id: true, branchCode: true, name: true, timeZone: true } } },
      },
      items: {
        include: { menuItem: { select: { id: true, name: true, price: true, isActive: true } } },
      },
    },
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });

  return promotions.map(formatPromotion);
}

// Retrieve one promotion while enforcing Branch Manager branch visibility.
export async function getPromotionById(input: { promotionId: string; role: string; branchId?: string }) {
  if (
  (input.role === "BRANCH_MANAGER" || input.role === "SERVER") &&
  !input.branchId
) {
  throw new AppError("Branch assignment is required", 403);
}

  const promotion = await prisma.promotion.findFirst({
    where: {
      id: input.promotionId,
      ...(input.role === "BRANCH_MANAGER" || input.role === "SERVER"
  ? { branches: { some: { branchId: input.branchId } } }
  : {}),
    },
    include: {
      branches: {
        include: { branch: { select: { id: true, branchCode: true, name: true, timeZone: true } } },
      },
      items: {
        include: { menuItem: { select: { id: true, name: true, price: true, isActive: true } } },
      },
    },
  });

  if (!promotion) throw new AppError("Promotion not found", 404);
  return formatPromotion(promotion);
}

type PromotionInput = {
  name: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  startDate: Date;
  endDate: Date;
  startDateInput: string;
  endDateInput: string;
  branchIds: string[];
  menuItemIds: string[];
};

// Create a central promotion and its branch/item eligibility links together.
export async function createPromotion(input: PromotionInput, userId: string) {
  if (input.endDate <= input.startDate) {
    throw new AppError("End date must be later than start date", 400);
  }
  if (input.discountType === "PERCENTAGE" && input.discountValue > 50) {
    throw new AppError("Percentage discounts cannot exceed 50%", 400);
  }

  await validatePromotionSelections(
    input.branchIds,
    input.menuItemIds,
    input.discountType,
    input.discountValue,
    input.startDate,
    input.endDate,
    input.startDateInput,
    input.endDateInput,
  );

  return prisma.$transaction(async (tx) => {
    const promotion = await tx.promotion.create({
      data: {
        name: input.name,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        startDate: input.startDate,
        endDate: input.endDate,
        branches: { create: input.branchIds.map((branchId) => ({ branchId })) },
        items: { create: input.menuItemIds.map((menuItemId) => ({ menuItemId })) },
      },
      include: {
        branches: { include: { branch: { select: { id: true, branchCode: true, name: true, timeZone: true } } } },
        items: { include: { menuItem: { select: { id: true, name: true, price: true, isActive: true } } } },
      },
    });

    // Record the central promotion creation for accountability.
    await tx.auditLog.create({
      data: {
        userId,
        actorType: "USER",
        action: "PROMOTION_CREATED",
        entityType: "Promotion",
        entityId: promotion.id,
        details: { name: promotion.name, branchIds: input.branchIds, menuItemIds: input.menuItemIds } as any,
      },
    });

    return formatPromotion(promotion);
  });
}

// Update a promotion only before its start time and before its first use.
export async function updatePromotion(promotionId: string, input: PromotionInput, userId: string) {
  if (input.endDate <= input.startDate) {
    throw new AppError("End date must be later than start date", 400);
  }
  if (input.discountType === "PERCENTAGE" && input.discountValue > 50) {
    throw new AppError("Percentage discounts cannot exceed 50%", 400);
  }

  await validatePromotionSelections(
    input.branchIds,
    input.menuItemIds,
    input.discountType,
    input.discountValue,
    input.startDate,
    input.endDate,
    input.startDateInput,
    input.endDateInput,
  );

  return prisma.$transaction(async (tx) => {
    const existing = await tx.promotion.findUnique({ where: { id: promotionId } });
    if (!existing) throw new AppError("Promotion not found", 404);

    const [usedOrderItems, legacyOrderPromotionUses] = await Promise.all([
      tx.orderItem.count({ where: { promotionId } }),
      tx.orderPromotion.count({ where: { promotionId } }),
    ]);
    if (new Date() >= existing.startDate || usedOrderItems > 0 || legacyOrderPromotionUses > 0) {
      throw new AppError("A promotion cannot be edited after it has started or been used. Deactivate it and create a replacement", 409);
    }

    const promotion = await tx.promotion.update({
      where: { id: promotionId },
      data: {
        name: input.name,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        startDate: input.startDate,
        endDate: input.endDate,
        branches: {
          deleteMany: {},
          create: input.branchIds.map((branchId) => ({ branchId })),
        },
        items: {
          deleteMany: {},
          create: input.menuItemIds.map((menuItemId) => ({ menuItemId })),
        },
      },
      include: {
        branches: { include: { branch: { select: { id: true, branchCode: true, name: true, timeZone: true } } } },
        items: { include: { menuItem: { select: { id: true, name: true, price: true, isActive: true } } } },
      },
    });

    // Record the update without storing sensitive information.
    await tx.auditLog.create({
      data: {
        userId,
        actorType: "USER",
        action: "PROMOTION_UPDATED",
        entityType: "Promotion",
        entityId: promotion.id,
        details: { name: promotion.name, branchIds: input.branchIds, menuItemIds: input.menuItemIds } as any,
      },
    });

    return formatPromotion(promotion);
  });
}

// Deactivate a promotion without deleting its historical relationships or snapshots.
export async function deactivatePromotion(promotionId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.promotion.findUnique({ where: { id: promotionId } });
    if (!existing) throw new AppError("Promotion not found", 404);
    if (!existing.isActive) throw new AppError("Promotion is already inactive", 409);

    const promotion = await tx.promotion.update({
      where: { id: promotionId },
      data: { isActive: false },
      include: {
        branches: { include: { branch: { select: { id: true, branchCode: true, name: true, timeZone: true } } } },
        items: { include: { menuItem: { select: { id: true, name: true, price: true, isActive: true } } } },
      },
    });

    // Keep an audit record when HQ ends a promotion early.
    await tx.auditLog.create({
      data: {
        userId,
        actorType: "USER",
        action: "PROMOTION_DEACTIVATED",
        entityType: "Promotion",
        entityId: promotion.id,
        details: { name: promotion.name },
      },
    });

    return formatPromotion(promotion);
  });
}
