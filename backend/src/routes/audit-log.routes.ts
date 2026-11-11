import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  getAuditLogByIdController,
  getAuditLogsController,
} from "../controllers/audit-log.controller.js";

const router = Router();
router.use(authenticate);

// Only Admin, HQ Manager and Branch Manager can view audit history.
router.get("/", authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"), getAuditLogsController);
router.get("/:logId", authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"), getAuditLogByIdController);

export default router;
