import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  salesReportController,
  inventoryReportController,
  inventoryHistoryReportController,
} from "../controllers/report.controller.js";

const router = Router();

// Reports are available to HQ Managers and Branch Managers only.
router.use(authenticate, authorizeRoles("HEADQUARTERS_MANAGER", "BRANCH_MANAGER"));

router.get("/sales", salesReportController);
router.get("/inventory", inventoryReportController);
router.get("/inventory/history", inventoryHistoryReportController);

export default router;
