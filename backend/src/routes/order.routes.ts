import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  createOrderController, editOrderController, getOrdersController, getOrderController,
  getKitchenQueueController, updateOrderStatusController, cancelOrderController,
} from "../controllers/order.controller.js";

const router = Router();
router.use(authenticate);

const orderReadRoles = ["HEADQUARTERS_MANAGER", "BRANCH_MANAGER", "SERVER", "COOK"] as const;

router.get("/", authorizeRoles(...orderReadRoles), getOrdersController);
router.get("/kitchen-queue", authorizeRoles("COOK", "BRANCH_MANAGER"), getKitchenQueueController);
router.get("/:orderId", authorizeRoles(...orderReadRoles), getOrderController);
router.post("/", authorizeRoles("SERVER"), createOrderController);
router.patch("/:orderId", authorizeRoles("SERVER"), editOrderController);
router.patch("/:orderId/status", authorizeRoles("COOK", "SERVER"), updateOrderStatusController);
router.patch("/:orderId/cancel", authorizeRoles("SERVER", "BRANCH_MANAGER"), cancelOrderController);

export default router;
