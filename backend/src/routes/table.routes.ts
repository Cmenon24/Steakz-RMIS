import { Router, type Request, type Response, type NextFunction } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { AppError } from "../utils/app-error.js";
import {
  getBranchTablesController, getAllTablesController, createTableController,
  updateTableController, deactivateTableController, reactivateTableController,
} from "../controllers/table.controller.js";

const router = Router();
router.use(authenticate);

// Branch Managers and Servers are always limited to their assigned branch.
function enforceBranchScope(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.role === "BRANCH_MANAGER" || req.auth?.role === "SERVER") {
    if (!req.auth.branchId) return next(new AppError("Branch assignment is required", 403));
    req.params.branchId = req.auth.branchId;
  }
  next();
}

// Admin and HQ can view the chain-wide table list.
router.get("/", authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER"), getAllTablesController);

// HQ can view all branches; Branch Manager and Server can view only their own branch.
router.get("/branches/:branchId", authorizeRoles("HEADQUARTERS_MANAGER", "BRANCH_MANAGER", "SERVER"), enforceBranchScope, getBranchTablesController);

// Only Admin manages table configuration.
router.post("/", authorizeRoles("ADMIN"), createTableController);
router.patch("/:tableId", authorizeRoles("ADMIN"), updateTableController);
router.patch("/:tableId/deactivate", authorizeRoles("ADMIN"), deactivateTableController);
router.patch("/:tableId/reactivate", authorizeRoles("ADMIN"), reactivateTableController);

export default router;
