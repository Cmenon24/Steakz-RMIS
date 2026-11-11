import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  recordPaymentController,
  getOrderPaymentsController,
  requestRefundController,
  reviewRefundController,
} from "../controllers/payment.controller.js";

const router = Router();
router.use(authenticate);

// Servers record payments and review payment history for their branch.
router.post("/orders/:orderId/payment", authorizeRoles("SERVER"), recordPaymentController);
router.get("/orders/:orderId/payments", authorizeRoles("HEADQUARTERS_MANAGER", "BRANCH_MANAGER", "SERVER"), getOrderPaymentsController);

// Servers request refunds for Manager approval; Branch Managers can process their own full refunds.
// Only Branch Managers can review Server requests, with password confirmation.
router.post("/:paymentId/refunds", authorizeRoles("SERVER", "BRANCH_MANAGER"), requestRefundController);
router.patch("/refunds/:refundId/review", authorizeRoles("SERVER", "BRANCH_MANAGER"), reviewRefundController);

export default router;
