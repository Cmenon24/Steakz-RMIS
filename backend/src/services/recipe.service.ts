import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

const recipeInclude = {
  menuItem: {
    select: {
      id: true,
      name: true,
      price: true,
      isActive: true,
      category: { select: { id: true, name: true, isActive: true } },
    },
  },
  versions: {
    orderBy: { versionNumber: "desc" as const },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      ingredients: {
        include: {
          ingredient: { select: { id: true, name: true, unit: true, isActive: true } },
        },
        orderBy: { ingredient: { name: "asc" as const } },
      },
    },
  },
};


// Return all versions to management roles, but only published versions to cooks.
export async function getRecipes(role: string) {
  const isCook = role === "COOK";

  return prisma.recipe.findMany({
    include: {
      ...recipeInclude,
      versions: {
        ...recipeInclude.versions,
        ...(isCook && { where: { status: "PUBLISHED" } }),
      },
    },
    orderBy: { menuItem: { name: "asc" } },
  });
}

// Retrieve a recipe with version visibility based on the user's role.
export async function getRecipeById(recipeId: string, role: string) {
  const isCook = role === "COOK";

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ...recipeInclude,
      versions: {
        ...recipeInclude.versions,
        ...(isCook && { where: { status: "PUBLISHED" } }),
      },
    },
  });

  if (!recipe) throw new AppError("Recipe not found", 404);
  return recipe;
}


// Create the recipe and its first draft version together.
export async function createRecipe(input: { menuItemId: string; userId: string }) {
  return prisma.$transaction(async (tx) => {
    const menuItem = await tx.menuItem.findUnique({
      where: { id: input.menuItemId },
      select: { id: true, name: true, isActive: true },
    });
    if (!menuItem) throw new AppError("Menu item not found", 404);
    if (!menuItem.isActive) throw new AppError("Cannot create a recipe for an inactive menu item", 409);

    const existing = await tx.recipe.findUnique({ where: { menuItemId: input.menuItemId } });
    if (existing) throw new AppError("A recipe already exists for this menu item", 409);

    const recipe = await tx.recipe.create({
      data: {
        menuItemId: input.menuItemId,
        versions: { create: { versionNumber: 1, createdByUserId: input.userId } },
      },
      select: { id: true, menuItemId: true, createdAt: true },
    });

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        actorType: "USER",
        action: "RECIPE_CREATED",
        entityType: "Recipe",
        entityId: recipe.id,
        details: { menuItemId: input.menuItemId, initialVersionNumber: 1 },
      },
    });
    return tx.recipe.findUniqueOrThrow({ where: { id: recipe.id }, include: recipeInclude });
  });
}

// Create the next numbered draft without changing the currently published version.
export async function createRecipeVersion(input: { recipeId: string; userId: string }) {
  return prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.findUnique({
      where: { id: input.recipeId },
      select: { id: true, menuItem: { select: { isActive: true } }, versions: { select: { versionNumber: true } } },
    });
    if (!recipe) throw new AppError("Recipe not found", 404);
    if (!recipe.menuItem.isActive) throw new AppError("Cannot create a version for an inactive menu item", 409);

    const versionNumber = Math.max(0, ...recipe.versions.map((version) => version.versionNumber)) + 1;
    const version = await tx.recipeVersion.create({
      data: { recipeId: input.recipeId, versionNumber, createdByUserId: input.userId },
      select: { id: true, recipeId: true, versionNumber: true, status: true, createdAt: true },
    });
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        actorType: "USER",
        action: "RECIPE_VERSION_CREATED",
        entityType: "RecipeVersion",
        entityId: version.id,
        details: { recipeId: input.recipeId, versionNumber },
      },
    });
    return version;
  });
}

// Replace the complete ingredient list on a draft version only.
export async function setRecipeVersionIngredients(input: {
  recipeId: string;
  versionId: string;
  userId: string;
  ingredients: Array<{ ingredientId: string; quantity: number; unit: string }>;
}) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.recipeVersion.findFirst({
      where: { id: input.versionId, recipeId: input.recipeId },
      select: { id: true, status: true, versionNumber: true },
    });
    if (!version) throw new AppError("Recipe version not found", 404);
    if (version.status !== "DRAFT") throw new AppError("Only draft recipe versions can be edited", 409);

    const ingredientIds = input.ingredients.map((line) => line.ingredientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      throw new AppError("Each ingredient can only be added once to a recipe version", 400);
    }

    if (input.ingredients.length) {
      const records = await tx.ingredient.findMany({
        where: { id: { in: ingredientIds } },
        select: { id: true, name: true, unit: true, isActive: true },
      });
      if (records.length !== ingredientIds.length) throw new AppError("One or more ingredients were not found", 404);
      const byId = new Map(records.map((record) => [record.id, record]));
      for (const line of input.ingredients) {
        const ingredient = byId.get(line.ingredientId)!;
        if (!ingredient.isActive) throw new AppError(`Ingredient ${ingredient.name} is inactive`, 409);
        if (ingredient.unit !== line.unit) throw new AppError(`Recipe unit does not match inventory unit for ${ingredient.name}`, 400);
      }
    }

    await tx.recipeIngredient.deleteMany({ where: { recipeVersionId: version.id } });
    if (input.ingredients.length) {
      await tx.recipeIngredient.createMany({
        data: input.ingredients.map((line) => ({
          recipeVersionId: version.id,
          ingredientId: line.ingredientId,
          quantity: line.quantity,
          unit: line.unit as any,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.userId,
        actorType: "USER",
        action: "RECIPE_INGREDIENTS_UPDATED",
        entityType: "RecipeVersion",
        entityId: version.id,
        details: { recipeId: input.recipeId, versionNumber: version.versionNumber, ingredientCount: input.ingredients.length },
      },
    });
    return tx.recipeVersion.findUniqueOrThrow({
      where: { id: version.id },
      include: {
        ingredients: {
          include: { ingredient: { select: { id: true, name: true, unit: true, isActive: true } } },
          orderBy: { ingredient: { name: "asc" } },
        },
      },
    });
  });
}

// Publish a complete valid draft and archive the previous published version atomically.
export async function publishRecipeVersion(input: { recipeId: string; versionId: string; userId: string }) {
  return prisma.$transaction(async (tx) => {
    const version = await tx.recipeVersion.findFirst({
      where: { id: input.versionId, recipeId: input.recipeId },
      include: {
        recipe: { select: { menuItem: { select: { isActive: true } } } },
        ingredients: { include: { ingredient: { select: { id: true, name: true, unit: true, isActive: true } } } },
      },
    });
    if (!version) throw new AppError("Recipe version not found", 404);
    if (version.status !== "DRAFT") throw new AppError("Only draft recipe versions can be published", 409);
    if (!version.recipe.menuItem.isActive) throw new AppError("Cannot publish a recipe for an inactive menu item", 409);
    if (!version.ingredients.length) throw new AppError("A recipe version must contain at least one ingredient", 400);

    for (const line of version.ingredients) {
      if (!line.ingredient.isActive) throw new AppError(`Ingredient ${line.ingredient.name} is inactive`, 409);
      if (line.unit !== line.ingredient.unit) throw new AppError(`Recipe unit does not match inventory unit for ${line.ingredient.name}`, 400);
      if (Number(line.quantity) <= 0) throw new AppError("Recipe ingredient quantities must be greater than zero", 400);
    }

    await tx.recipeVersion.updateMany({
      where: { recipeId: input.recipeId, status: "PUBLISHED" },
      data: { status: "ARCHIVED" },
    });
    const published = await tx.recipeVersion.update({
      where: { id: version.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
      include: {
        ingredients: {
          include: { ingredient: { select: { id: true, name: true, unit: true, isActive: true } } },
          orderBy: { ingredient: { name: "asc" } },
        },
      },
    });
    await tx.auditLog.create({
      data: {
        userId: input.userId,
        actorType: "USER",
        action: "RECIPE_VERSION_PUBLISHED",
        entityType: "RecipeVersion",
        entityId: published.id,
        details: { recipeId: input.recipeId, versionNumber: published.versionNumber },
      },
    });
    return published;
  });
}
