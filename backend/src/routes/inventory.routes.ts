import { Router } from "express";
import type { Request, Response, NextFunction } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  listIngredients, getIngredientController, createIngredientController,
  updateIngredientController, deactivateIngredientController, reactivateIngredientController,
  getBranchInventoryController, getBranchInventoryItemController,
  setMinimumStockLevelController, receiveStockController, adjustStockController,
  getTransactionsController, getAlertsController, startStocktakeController,
  getStocktakesController, getStocktakeController, updateStocktakeCountController,
  completeStocktakeController,
} from "../controllers/inventory.controller.js";

const router = Router();

const inventoryReadRoles = ["HEADQUARTERS_MANAGER", "BRANCH_MANAGER"] as const;
const branchInventoryRoles = ["BRANCH_MANAGER"] as const;

// Branch Managers are always restricted to their assigned branch.
const enforceBranchScope = (req: Request, _res: Response, next: NextFunction) => {
  if (req.auth?.role === "BRANCH_MANAGER") req.params.branchId = req.auth.branchId ?? "";
  next();
};

router.use(authenticate);

// Central ingredient catalogue: HQ Manager manages; Admin has read-only oversight.
router.get("/ingredients", authorizeRoles(...inventoryReadRoles), listIngredients);
router.get("/ingredients/:ingredientId", authorizeRoles(...inventoryReadRoles), getIngredientController);
router.post("/ingredients", authorizeRoles("HEADQUARTERS_MANAGER"), createIngredientController);
router.patch("/ingredients/:ingredientId", authorizeRoles("HEADQUARTERS_MANAGER"), updateIngredientController);
router.patch("/ingredients/:ingredientId/deactivate", authorizeRoles("HEADQUARTERS_MANAGER"), deactivateIngredientController);
router.patch("/ingredients/:ingredientId/reactivate", authorizeRoles("HEADQUARTERS_MANAGER"), reactivateIngredientController);

// Branch inventory overview and history.
router.get("/branches/:branchId", authorizeRoles(...inventoryReadRoles), enforceBranchScope, getBranchInventoryController);
router.get("/branches/:branchId/items/:ingredientId", authorizeRoles(...inventoryReadRoles), enforceBranchScope, getBranchInventoryItemController);
router.get("/branches/:branchId/transactions", authorizeRoles(...inventoryReadRoles), enforceBranchScope, getTransactionsController);
router.get("/branches/:branchId/alerts", authorizeRoles("BRANCH_MANAGER"), enforceBranchScope, getAlertsController);

// Branch Managers record and adjust stock only at their own branch.
router.patch("/branches/:branchId/items/:ingredientId/minimum", authorizeRoles(...branchInventoryRoles), enforceBranchScope, setMinimumStockLevelController);
router.post("/branches/:branchId/receiving", authorizeRoles(...branchInventoryRoles), enforceBranchScope, receiveStockController);
router.post("/branches/:branchId/adjustments", authorizeRoles(...branchInventoryRoles), enforceBranchScope, adjustStockController);

// Stocktake workflow.
router.post("/branches/:branchId/stocktakes", authorizeRoles(...branchInventoryRoles), enforceBranchScope, startStocktakeController);
router.get("/branches/:branchId/stocktakes", authorizeRoles(...inventoryReadRoles), enforceBranchScope, getStocktakesController);
router.get("/branches/:branchId/stocktakes/:stocktakeId", authorizeRoles(...inventoryReadRoles), enforceBranchScope, getStocktakeController);
router.patch("/branches/:branchId/stocktakes/:stocktakeId/items/:ingredientId", authorizeRoles(...branchInventoryRoles), enforceBranchScope, updateStocktakeCountController);
router.patch("/branches/:branchId/stocktakes/:stocktakeId/complete", authorizeRoles(...branchInventoryRoles), enforceBranchScope, completeStocktakeController);

export default router;
