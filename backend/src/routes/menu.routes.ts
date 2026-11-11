import { Router } from "express";
import type { Request, Response, NextFunction } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

import {
  getMenuCategories,
  getMenuCategory,
  createMenuCategoryController,
  updateMenuCategoryController,
  deactivateMenuCategoryController,
  reactivateMenuCategoryController,
  getMenuItems,
  getMenuItem,
  createMenuItemController,
  updateMenuItemController,
  deactivateMenuItemController,
  reactivateMenuItemController,
  configureMealSidesController,
  getMealSidesController,
  getBranchMenuAvailabilityController,
  updateBranchMenuAvailabilityController,
  getMenuAvailabilityHistoryController,
} from "../controllers/menu.controller.js";

const router = Router();

// Roles allowed to view menu information.
const menuReadRoles = [
  "HEADQUARTERS_MANAGER",
  "BRANCH_MANAGER",
  "SERVER",
  "COOK",
] as const;

// Only HQ Manager manages the central menu.
const menuManagementRoles = ["HEADQUARTERS_MANAGER"] as const;

// Restrict branch-level requests to the authenticated user's branch.
const enforceBranchScope = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (
    req.auth &&
    ["BRANCH_MANAGER", "SERVER", "COOK"].includes(req.auth.role)
  ) {
    req.params.branchId = req.auth.branchId ?? "";
  }

  next();
};

// All menu routes require authentication.
router.use(authenticate);

// Menu categories
router.get("/categories", authorizeRoles(...menuReadRoles), getMenuCategories);
router.get(
  "/categories/:categoryId",
  authorizeRoles(...menuReadRoles),
  getMenuCategory,
);
router.post(
  "/categories",
  authorizeRoles(...menuManagementRoles),
  createMenuCategoryController,
);
router.patch(
  "/categories/:categoryId",
  authorizeRoles(...menuManagementRoles),
  updateMenuCategoryController,
);
router.patch(
  "/categories/:categoryId/deactivate",
  authorizeRoles(...menuManagementRoles),
  deactivateMenuCategoryController,
);
router.patch(
  "/categories/:categoryId/reactivate",
  authorizeRoles(...menuManagementRoles),
  reactivateMenuCategoryController,
);

// Menu items
router.get("/items", authorizeRoles(...menuReadRoles), getMenuItems);
router.get("/items/:menuItemId", authorizeRoles(...menuReadRoles), getMenuItem);
router.post(
  "/items",
  authorizeRoles(...menuManagementRoles),
  createMenuItemController,
);
router.patch(
  "/items/:menuItemId",
  authorizeRoles(...menuManagementRoles),
  updateMenuItemController,
);
router.patch(
  "/items/:menuItemId/deactivate",
  authorizeRoles(...menuManagementRoles),
  deactivateMenuItemController,
);
router.patch(
  "/items/:menuItemId/reactivate",
  authorizeRoles(...menuManagementRoles),
  reactivateMenuItemController,
);

// Fixed meal sides
router.get(
  "/items/:menuItemId/sides",
  authorizeRoles(...menuReadRoles),
  getMealSidesController,
);
router.put(
  "/items/:menuItemId/sides",
  authorizeRoles(...menuManagementRoles),
  configureMealSidesController,
);

// Branch menu availability
router.get(
  "/branches/:branchId/availability",
  authorizeRoles(...menuReadRoles),
  enforceBranchScope,
  getBranchMenuAvailabilityController,
);
router.patch(
  "/branches/:branchId/availability/:menuItemId",
  authorizeRoles(...menuManagementRoles),
  updateBranchMenuAvailabilityController,
);
router.get(
  "/branches/:branchId/availability/history",
  authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"),
  enforceBranchScope,
  getMenuAvailabilityHistoryController,
);

export default router;