import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  getMyNotificationsController,
  getUnreadCountController,
  markAllNotificationsReadController,
  markNotificationReadController,
} from "../controllers/notification.controller.js";

const router = Router();

// Every notification endpoint is restricted to the signed-in user.
router.use(authenticate, authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"));
router.get("/", getMyNotificationsController);
router.get("/unread-count", getUnreadCountController);
router.patch("/read-all", markAllNotificationsReadController);
router.patch("/:notificationId/read", markNotificationReadController);

export default router;
