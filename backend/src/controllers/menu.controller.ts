import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  getAllMenuCategories,
  getMenuCategoryById,
  createMenuCategory,
  updateMenuCategory,
  deactivateMenuCategory,
  reactivateMenuCategory,
  getAllMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deactivateMenuItem,
  reactivateMenuItem,
  configureMealSides,
  getMealSides,
  getBranchMenuAvailability,
  updateBranchMenuAvailability,
  getMenuAvailabilityHistory,
} from "../services/menu.service.js";

import { AppError } from "../utils/app-error.js";

// Validate information required to create a menu category.
const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  displayOrder: z.number().int().min(0).optional(),
}).strict();

// Validate optional menu category updates.
const updateCategorySchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  displayOrder: z.number().int().min(0).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided"
);

// Validate information required to create a menu item.
const createMenuItemSchema = z.object({
  categoryId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().finite().min(0),
  imageUrl: z.url().optional(),
  drinkType: z.enum(["SOFT_DRINK", "BEER", "WINE"]).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
}).strict();

// Validate optional menu item updates.
const updateMenuItemSchema = z.object({
  categoryId: z.uuid().optional(),
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  price: z.number().finite().min(0).optional(),
  imageUrl: z.url().nullable().optional(),
  drinkType: z.enum(["SOFT_DRINK", "BEER", "WINE"]).nullable().optional(),
  displayOrder: z.number().int().min(0).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  "At least one field must be provided"
);

// Validate the two fixed sides assigned to a meal.
const configureMealSidesSchema = z.object({
  sideNames: z.array(z.string().trim().min(2).max(100)).length(2),
}).strict();

// Validate branch menu availability changes.
const updateAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
  reason: z.string().trim().max(500).optional(),
}).strict();

// Branch-level menu reads must never fall back to chain-wide access.
function getMenuBranchScope(req: Request): string | undefined {
  if (["BRANCH_MANAGER", "SERVER", "COOK"].includes(req.auth!.role)) {
    if (!req.auth!.branchId) {
      throw new AppError("Branch assignment is required", 403);
    }
    return req.auth!.branchId;
  }

  return undefined;
}

// Handle requests to retrieve all menu categories.
export async function getMenuCategories(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const categories = await getAllMenuCategories();

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to retrieve one menu category.
export async function getMenuCategory(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const categoryId = req.params.categoryId;

    if (typeof categoryId !== "string") {
      throw new AppError("Invalid category ID", 400);
    }

    const category = await getMenuCategoryById(categoryId);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to create a menu category.
export async function createMenuCategoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the submitted category information.
    const validatedData = createCategorySchema.parse(req.body);

    // Create the category through the service.
    const category = await createMenuCategory(validatedData);

    res.status(201).json({
      success: true,
      message: "Menu category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to update a menu category.
export async function updateMenuCategoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the category ID from the URL.
    const categoryId = req.params.categoryId;

    if (typeof categoryId !== "string") {
      throw new AppError("Invalid category ID", 400);
    }

    // Validate the submitted update information.
    const validatedData = updateCategorySchema.parse(req.body);

    // Update the category through the service.
    const category = await updateMenuCategory(categoryId, validatedData);

    res.status(200).json({
      success: true,
      message: "Menu category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to deactivate a menu category.
export async function deactivateMenuCategoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the category ID from the URL.
    const categoryId = req.params.categoryId;

    if (typeof categoryId !== "string") {
      throw new AppError("Invalid category ID", 400);
    }

    // Deactivate the category through the service.
    const category = await deactivateMenuCategory(categoryId);

    res.status(200).json({
      success: true,
      message: "Menu category deactivated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to reactivate a menu category.
export async function reactivateMenuCategoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the category ID from the URL.
    const categoryId = req.params.categoryId;

    if (typeof categoryId !== "string") {
      throw new AppError("Invalid category ID", 400);
    }

    // Reactivate the category through the service.
    const category = await reactivateMenuCategory(categoryId);

    res.status(200).json({
      success: true,
      message: "Menu category reactivated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to retrieve menu items.
export async function getMenuItems(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Branch-level roles only see their own branch's available menu items.
    const branchId = getMenuBranchScope(req);
    const menuItems = await getAllMenuItems(branchId);

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to retrieve one menu item.
export async function getMenuItem(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const menuItemId = req.params.menuItemId;

    if (typeof menuItemId !== "string") {
      throw new AppError("Invalid menu item ID", 400);
    }

    // Branch-level roles only access items available at their own branch.
    const branchId = getMenuBranchScope(req);
    const menuItem = await getMenuItemById(menuItemId, branchId);

    res.status(200).json({
      success: true,
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to create a menu item.
export async function createMenuItemController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the submitted menu item information.
    const validatedData = createMenuItemSchema.parse(req.body);

    // Create the menu item through the service.
    const menuItem = await createMenuItem(validatedData);

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to update a menu item.
export async function updateMenuItemController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the menu item ID from the URL.
    const menuItemId = req.params.menuItemId;

    if (typeof menuItemId !== "string") {
      throw new AppError("Invalid menu item ID", 400);
    }

    // Validate the submitted update information.
    const validatedData = updateMenuItemSchema.parse(req.body);

    // Update the menu item through the service.
    const menuItem = await updateMenuItem(menuItemId, validatedData);

    res.status(200).json({
      success: true,
      message: "Menu item updated successfully",
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to deactivate a menu item.
export async function deactivateMenuItemController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the menu item ID from the URL.
    const menuItemId = req.params.menuItemId;

    if (typeof menuItemId !== "string") {
      throw new AppError("Invalid menu item ID", 400);
    }

    // Deactivate the menu item through the service.
    const menuItem = await deactivateMenuItem(menuItemId);

    res.status(200).json({
      success: true,
      message: "Menu item deactivated successfully",
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to reactivate a menu item.
export async function reactivateMenuItemController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the menu item ID from the URL.
    const menuItemId = req.params.menuItemId;

    if (typeof menuItemId !== "string") {
      throw new AppError("Invalid menu item ID", 400);
    }

    // Reactivate the menu item through the service.
    const menuItem = await reactivateMenuItem(menuItemId);

    res.status(200).json({
      success: true,
      message: "Menu item reactivated successfully",
      data: menuItem,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to configure the two fixed sides for a meal.
export async function configureMealSidesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the meal ID from the URL.
    const menuItemId = req.params.menuItemId;

    if (typeof menuItemId !== "string") {
      throw new AppError("Invalid menu item ID", 400);
    }

    // Validate the two submitted fixed side names.
    const validatedData = configureMealSidesSchema.parse(req.body);

    // Configure the fixed sides through the service.
    const result = await configureMealSides(menuItemId, validatedData.sideNames);

    res.status(200).json({
      success: true,
      message: "Meal sides configured successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to retrieve the fixed sides for a meal.
export async function getMealSidesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the meal ID from the URL.
    const menuItemId = req.params.menuItemId;

    if (typeof menuItemId !== "string") {
      throw new AppError("Invalid menu item ID", 400);
    }

    // Branch-level roles only see sides available at their assigned branch.
    const branchId = getMenuBranchScope(req);

    // Retrieve the configured sides through the service.
    const result = await getMealSides(menuItemId, branchId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to retrieve menu availability for a branch.
export async function getBranchMenuAvailabilityController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the branch ID from the URL.
    const branchId = req.params.branchId;

    if (typeof branchId !== "string") {
      throw new AppError("Invalid branch ID", 400);
    }

    // Retrieve branch menu availability through the service.
    const result = await getBranchMenuAvailability(branchId);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to update menu availability at a branch.
export async function updateBranchMenuAvailabilityController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the branch and menu item IDs from the URL.
    const branchId = req.params.branchId;
    const menuItemId = req.params.menuItemId;

    if (
      typeof branchId !== "string" ||
      typeof menuItemId !== "string"
    ) {
      throw new AppError("Invalid branch or menu item ID", 400);
    }

    // Ensure the authenticated user is available.
    if (!req.auth) {
      throw new AppError("Authentication required", 401);
    }

    // Validate the availability update.
    const validatedData = updateAvailabilitySchema.parse(req.body);

    // Update availability and record the authenticated user's ID.
    const result = await updateBranchMenuAvailability({
      branchId,
      menuItemId,
      isAvailable: validatedData.isAvailable,
      changedByUserId: req.auth.userId,
      reason: validatedData.reason,
    });

    res.status(200).json({
      success: true,
      message: "Branch menu availability updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// Handle requests to retrieve menu availability history.
export async function getMenuAvailabilityHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Validate the branch ID from the URL.
    const branchId = req.params.branchId;

    if (typeof branchId !== "string") {
      throw new AppError("Invalid branch ID", 400);
    }

    // Validate an optional menu item ID from the query.
    const menuItemId = req.query.menuItemId;

    if (menuItemId !== undefined && typeof menuItemId !== "string") {
      throw new AppError("Invalid menu item ID", 400);
    }

    // Retrieve availability history through the service.
    const history = await getMenuAvailabilityHistory(
      branchId,
      menuItemId
    );

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}