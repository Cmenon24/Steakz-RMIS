import { Router } from "express";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  createPromotionController,
  deactivatePromotionController,
  getPromotionController,
  getPromotionsController,
  updatePromotionController,
} from "../controllers/promotion.controller.js";

const router = Router();

// All promotion endpoints require a valid authenticated account.
router.use(authenticate);

// HQ, Branch Managers, and Servers can view promotions.
router.get("/", authorizeRoles("HEADQUARTERS_MANAGER", "BRANCH_MANAGER", "SERVER"), getPromotionsController);
router.get("/:promotionId", authorizeRoles("HEADQUARTERS_MANAGER", "BRANCH_MANAGER", "SERVER"), getPromotionController);

// Only HQ can create, edit, or deactivate central promotions.
router.post("/", authorizeRoles("HEADQUARTERS_MANAGER"), createPromotionController);
router.patch("/:promotionId", authorizeRoles("HEADQUARTERS_MANAGER"), updatePromotionController);
router.patch("/:promotionId/deactivate", authorizeRoles("HEADQUARTERS_MANAGER"), deactivatePromotionController);

export default router;
