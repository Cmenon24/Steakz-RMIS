import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Retrieve all menu categories.
export async function getAllMenuCategories() {
  return prisma.menuCategory.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      displayOrder: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          menuItems: true,
        },
      },
    },
    orderBy: [
      { displayOrder: "asc" },
      { name: "asc" },
    ],
  });
}

// Retrieve one menu category by ID.
export async function getMenuCategoryById(categoryId: string) {
  const category = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      displayOrder: true,
      createdAt: true,
      updatedAt: true,
      menuItems: {
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          isActive: true,
          displayOrder: true,
        },
        orderBy: [
          { displayOrder: "asc" },
          { name: "asc" },
        ],
      },
    },
  });

  // Return an error when the category does not exist.
  if (!category) {
    throw new AppError("Menu category not found", 404);
  }

  return category;
}

// Create a new menu category.
export async function createMenuCategory(input: {
  name: string;
  description?: string;
  displayOrder?: number;
}) {
  const name = input.name.trim();

  // Check whether the category name already exists.
  const existingCategory = await prisma.menuCategory.findUnique({
    where: { name },
  });

  if (existingCategory) {
    throw new AppError("Menu category already exists", 409);
  }

  // Create the category and return its details.
  return prisma.menuCategory.create({
    data: {
      name,
      description: input.description?.trim() || null,
      displayOrder: input.displayOrder ?? null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      displayOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Update an existing menu category.
export async function updateMenuCategory(
  categoryId: string,
  input: {
    name?: string;
    description?: string | null;
    displayOrder?: number | null;
  }
) {
  // Confirm that the category exists.
  const existingCategory = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
  });

  if (!existingCategory) {
    throw new AppError("Menu category not found", 404);
  }

  // Check whether the new name belongs to another category.
  if (input.name) {
    const name = input.name.trim();

    const duplicateCategory = await prisma.menuCategory.findFirst({
      where: {
        name,
        id: { not: categoryId },
      },
    });

    if (duplicateCategory) {
      throw new AppError("Menu category name already exists", 409);
    }
  }

  // Update the category and return its details.
  return prisma.menuCategory.update({
    where: { id: categoryId },
    data: {
      ...(input.name !== undefined && {
        name: input.name.trim(),
      }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.displayOrder !== undefined && {
        displayOrder: input.displayOrder,
      }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      displayOrder: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Deactivate a menu category without deleting its records.
export async function deactivateMenuCategory(categoryId: string) {
  // Confirm that the category exists.
  const category = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError("Menu category not found", 404);
  }

  // Prevent an already inactive category from being deactivated again.
  if (!category.isActive) {
    throw new AppError("Menu category is already inactive", 409);
  }

  // Deactivate the category.
  return prisma.menuCategory.update({
    where: { id: categoryId },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      displayOrder: true,
      updatedAt: true,
    },
  });
}

// Reactivate a previously deactivated menu category.
export async function reactivateMenuCategory(categoryId: string) {
  // Confirm that the category exists.
  const category = await prisma.menuCategory.findUnique({
    where: { id: categoryId },
  });

  if (!category) {
    throw new AppError("Menu category not found", 404);
  }

  // Prevent an already active category from being reactivated.
  if (category.isActive) {
    throw new AppError("Menu category is already active", 409);
  }

  // Reactivate the category.
  return prisma.menuCategory.update({
    where: { id: categoryId },
    data: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      displayOrder: true,
      updatedAt: true,
    },
  });
}

// Retrieve menu items, optionally filtered by branch availability.
export async function getAllMenuItems(branchId?: string) {
  return prisma.menuItem.findMany({
    where: branchId
      ? {
          isActive: true,
          category: {
            isActive: true,
          },
          branchAvailabilities: {
            some: {
              branchId,
              isAvailable: true,
              isBlockedByStock: false,
              requiresReactivationConfirmation: false,
            },
          },
        }
      : undefined,
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      drinkType: true,
      isActive: true,
      displayOrder: true,
      category: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [
      { category: { name: "asc" } },
      { displayOrder: "asc" },
      { name: "asc" },
    ],
  });
}

// Retrieve one menu item, optionally checking branch availability.
export async function getMenuItemById(
  menuItemId: string,
  branchId?: string,
) {
  const menuItem = await prisma.menuItem.findFirst({
    where: {
      id: menuItemId,
      ...(branchId
        ? {
            isActive: true,
            category: {
              isActive: true,
            },
            branchAvailabilities: {
              some: {
                branchId,
                isAvailable: true,
                isBlockedByStock: false,
                requiresReactivationConfirmation: false,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      drinkType: true,
      isActive: true,
      displayOrder: true,
      category: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      configuredSides: {
        select: {
          id: true,
          sideName: true,
          position: true,
        },
        orderBy: { position: "asc" },
      },
      createdAt: true,
      updatedAt: true,
    },
  });

  // Return an error when the menu item does not exist or is unavailable.
  if (!menuItem) {
    throw new AppError("Menu item not found or unavailable", 404);
  }

  return menuItem;
}

// Create a new menu item and initialize branch availability.
export async function createMenuItem(input: {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  drinkType?: "SOFT_DRINK" | "BEER" | "WINE" | null;
  displayOrder?: number;
}) {
  // Confirm that the category exists and is active.
  const category = await prisma.menuCategory.findUnique({
    where: { id: input.categoryId },
  });

  if (!category || !category.isActive) {
    throw new AppError("Menu category not found or inactive", 404);
  }

  // Prevent duplicate item names within the same category.
  const name = input.name.trim();

  const existingItem = await prisma.menuItem.findFirst({
    where: {
      categoryId: input.categoryId,
      name,
    },
  });

  if (existingItem) {
    throw new AppError("Menu item already exists in this category", 409);
  }

  // Validate the price.
  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new AppError(
      "Menu item price must be a valid non-negative amount",
      400,
    );
  }

  // Create the item and branch availability records together.
  return prisma.$transaction(async (tx) => {
    const menuItem = await tx.menuItem.create({
      data: {
        categoryId: input.categoryId,
        name,
        description: input.description?.trim() || null,
        price: input.price,
        imageUrl: input.imageUrl?.trim() || null,
        drinkType: input.drinkType ?? null,
        displayOrder: input.displayOrder ?? null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        drinkType: true,
        isActive: true,
        displayOrder: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // Find all active branches.
    const activeBranches = await tx.branch.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    // Make the new menu item available at every active branch.
    if (activeBranches.length > 0) {
      await tx.branchMenuAvailability.createMany({
        data: activeBranches.map((branch) => ({
          branchId: branch.id,
          menuItemId: menuItem.id,
          isAvailable: true,
        })),
      });
    }

    return menuItem;
  });
}

// Update an existing menu item.
export async function updateMenuItem(
  menuItemId: string,
  input: {
    categoryId?: string;
    name?: string;
    description?: string | null;
    price?: number;
    imageUrl?: string | null;
    drinkType?: "SOFT_DRINK" | "BEER" | "WINE" | null;
    displayOrder?: number | null;
  }
) {
  // Confirm that the menu item exists.
  const existingItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
  });

  if (!existingItem) {
    throw new AppError("Menu item not found", 404);
  }

  // Confirm that a new category exists and is active.
  if (input.categoryId !== undefined) {
    const category = await prisma.menuCategory.findUnique({
      where: { id: input.categoryId },
    });

    if (!category || !category.isActive) {
      throw new AppError("Menu category not found or inactive", 404);
    }
  }

  const categoryId = input.categoryId ?? existingItem.categoryId;
  const name = input.name?.trim() ?? existingItem.name;

  // Prevent duplicate names within the same category.
  const duplicateItem = await prisma.menuItem.findFirst({
    where: {
      categoryId,
      name,
      id: { not: menuItemId },
    },
  });

  if (duplicateItem) {
    throw new AppError("Menu item already exists in this category", 409);
  }

  // Validate the price if one is provided.
  if (
    input.price !== undefined &&
    (!Number.isFinite(input.price) || input.price < 0)
  ) {
    throw new AppError("Menu item price must be a valid non-negative amount", 400);
  }

  // Update the menu item and return its details.
  return prisma.menuItem.update({
    where: { id: menuItemId },
    data: {
      ...(input.categoryId !== undefined && {
        categoryId: input.categoryId,
      }),
      ...(input.name !== undefined && {
        name: input.name.trim(),
      }),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.price !== undefined && {
        price: input.price,
      }),
      ...(input.imageUrl !== undefined && {
        imageUrl: input.imageUrl?.trim() || null,
      }),
      ...(input.drinkType !== undefined && {
        drinkType: input.drinkType,
      }),
      ...(input.displayOrder !== undefined && {
        displayOrder: input.displayOrder,
      }),
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      imageUrl: true,
      drinkType: true,
      isActive: true,
      displayOrder: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
  });
}

// Deactivate a menu item without deleting its records.
export async function deactivateMenuItem(menuItemId: string) {
  // Confirm that the menu item exists.
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
  });

  if (!menuItem) {
    throw new AppError("Menu item not found", 404);
  }

  // Prevent an already inactive item from being deactivated again.
  if (!menuItem.isActive) {
    throw new AppError("Menu item is already inactive", 409);
  }

  // Deactivate the menu item.
  return prisma.menuItem.update({
    where: { id: menuItemId },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      categoryId: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

// Reactivate a previously deactivated menu item.
export async function reactivateMenuItem(menuItemId: string) {
  // Confirm that the menu item exists.
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
  });

  if (!menuItem) {
    throw new AppError("Menu item not found", 404);
  }

  // Prevent an already active item from being reactivated.
  if (menuItem.isActive) {
    throw new AppError("Menu item is already active", 409);
  }

  // Confirm that the item's category is still active.
  const category = await prisma.menuCategory.findUnique({
    where: { id: menuItem.categoryId },
  });

  if (!category || !category.isActive) {
    throw new AppError(
      "Cannot reactivate an item belonging to an inactive category",
      409
    );
  }

  // Reactivate the menu item.
  return prisma.menuItem.update({
    where: { id: menuItemId },
    data: { isActive: true },
    select: {
      id: true,
      name: true,
      categoryId: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

// Configure the two fixed side names for a steak meal.
export async function configureMealSides(menuItemId: string, sideNames: string[]) {
  if (sideNames.length !== 2) {
    throw new AppError("A steak meal must have exactly two sides", 400);
  }

  const normalizedNames = sideNames.map((name) => name.trim());
  if (normalizedNames.some((name) => name.length < 2 || name.length > 100)) {
    throw new AppError("Each side name must be between 2 and 100 characters", 400);
  }
  if (new Set(normalizedNames.map((name) => name.toLocaleLowerCase())).size !== 2) {
    throw new AppError("The two sides must be different", 400);
  }

  const meal = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: { category: true },
  });

  if (!meal || !meal.isActive || !meal.category.isActive || meal.category.name !== "Steak Meals") {
    throw new AppError("Only active items in the Steak Meals category can have fixed sides", 400);
  }

  return prisma.$transaction(async (tx) => {
    await tx.mealSide.deleteMany({ where: { menuItemId } });
    await tx.mealSide.createMany({
      data: normalizedNames.map((sideName, index) => ({
        menuItemId,
        sideName,
        sideMenuItemId: null,
        position: index + 1,
      })),
    });

    return tx.mealSide.findMany({
      where: { menuItemId },
      select: { id: true, sideName: true, position: true },
      orderBy: { position: "asc" },
    });
  });
}

// Retrieve the fixed side names for a steak meal.
export async function getMealSides(menuItemId: string, branchId?: string) {
  const meal = await prisma.menuItem.findFirst({
    where: {
      id: menuItemId,
      ...(branchId
        ? {
            isActive: true,
            category: { isActive: true },
            branchAvailabilities: {
              some: {
                branchId,
                isAvailable: true,
                isBlockedByStock: false,
                requiresReactivationConfirmation: false,
              },
            },
          }
        : {}),
    },
    select: { id: true, name: true },
  });

  if (!meal) throw new AppError("Menu item not found", 404);

  const sides = await prisma.mealSide.findMany({
    where: { menuItemId },
    select: { id: true, position: true, sideName: true },
    orderBy: { position: "asc" },
  });

  return { meal, sides, isConfigured: sides.length === 2 };
}

// Retrieve menu availability settings for a branch.
export async function getBranchMenuAvailability(branchId: string) {
  // Confirm that the branch exists.
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      name: true,
      branchCode: true,
      isActive: true,
    },
  });

  if (!branch) {
    throw new AppError("Branch not found", 404);
  }

  // Retrieve menu items and their availability settings.
  const availability = await prisma.branchMenuAvailability.findMany({
    where: { branchId },
    select: {
      id: true,
      isAvailable: true,
      isBlockedByStock: true,
      requiresReactivationConfirmation: true,
      updatedAt: true,
      menuItem: {
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      menuItem: {
        name: "asc",
      },
    },
  });

  return {
    branch,
    availability,
  };
}

// Update menu item availability for a specific branch.
export async function updateBranchMenuAvailability(input: {
  branchId: string;
  menuItemId: string;
  isAvailable: boolean;
  changedByUserId: string;
  reason?: string;
}) {
  // Confirm that the branch exists and is active.
  const branch = await prisma.branch.findUnique({
    where: { id: input.branchId },
  });

  if (!branch || !branch.isActive) {
    throw new AppError("Branch not found or inactive", 404);
  }

  // Confirm that the menu item and its category are active.
  const menuItem = await prisma.menuItem.findUnique({
    where: { id: input.menuItemId },
    include: {
      category: true,
    },
  });

  if (!menuItem || !menuItem.isActive || !menuItem.category.isActive) {
    throw new AppError("Menu item or category not found or inactive", 404);
  }

  // Find the existing availability record, if one exists.
  const existing = await prisma.branchMenuAvailability.findUnique({
    where: {
      branchId_menuItemId: {
        branchId: input.branchId,
        menuItemId: input.menuItemId,
      },
    },
  });

  // Avoid creating duplicate history when nothing changes.
  if (existing?.isAvailable === input.isAvailable) {
    throw new AppError("Menu availability is already set to this value", 409);
  }

  // Update availability and record its history atomically.
  return prisma.$transaction(async (tx) => {
    const availability = await tx.branchMenuAvailability.upsert({
      where: {
        branchId_menuItemId: {
          branchId: input.branchId,
          menuItemId: input.menuItemId,
        },
      },
      create: {
        branchId: input.branchId,
        menuItemId: input.menuItemId,
        isAvailable: input.isAvailable,
      },
      update: {
        isAvailable: input.isAvailable,
      },
    });

    const history = await tx.menuAvailabilityHistory.create({
      data: {
        branchId: input.branchId,
        menuItemId: input.menuItemId,
        changedByUserId: input.changedByUserId,
        previousIsAvailable: existing?.isAvailable ?? null,
        newIsAvailable: input.isAvailable,
        previousIsBlockedByStock: existing?.isBlockedByStock ?? null,
        newIsBlockedByStock: availability.isBlockedByStock,
        previousRequiresReactivationConfirmation:
          existing?.requiresReactivationConfirmation ?? null,
        newRequiresReactivationConfirmation:
          availability.requiresReactivationConfirmation,
        reason: input.reason?.trim() || null,
      },
    });

    return {
      availability,
      history,
    };
  });
}

// Retrieve availability change history for a branch.
export async function getMenuAvailabilityHistory(
  branchId: string,
  menuItemId?: string
) {
  // Confirm that the branch exists.
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new AppError("Branch not found", 404);
  }

  // Retrieve historical availability changes.
  return prisma.menuAvailabilityHistory.findMany({
    where: {
      branchId,
      ...(menuItemId !== undefined && { menuItemId }),
    },
    select: {
      id: true,
      previousIsAvailable: true,
      newIsAvailable: true,
      previousIsBlockedByStock: true,
      newIsBlockedByStock: true,
      previousRequiresReactivationConfirmation: true,
      newRequiresReactivationConfirmation: true,
      reason: true,
      changedAt: true,
      menuItem: {
        select: {
          id: true,
          name: true,
        },
      },
      changedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      changedAt: "desc",
    },
  });
}