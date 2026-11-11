import { Router } from "express";

import {
  getUsers,
  getUser,
  createUserController,
  updateUserController,
  deactivateUserController,
  reactivateUserController,
  transferEmployeeController,
  resetUserPasswordController,
} from "../controllers/user.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

// Create the user management router.
const router = Router();

// Admin, HQ Manager, and Branch Manager can view permitted users.
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"),
  getUsers
);

// Admin, HQ Manager, and Branch Manager can view permitted user details.
router.get(
  "/:userId",
  authenticate,
  authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"),
  getUser
);

// Only Admin can create users.
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createUserController
);

// Only Admin can update user details.
router.patch(
  "/:userId",
  authenticate,
  authorizeRoles("ADMIN"),
  updateUserController
);

// Only Admin can deactivate users.
router.patch(
  "/:userId/deactivate",
  authenticate,
  authorizeRoles("ADMIN"),
  deactivateUserController
);

// Only Admin can reactivate users.
router.patch(
  "/:userId/reactivate",
  authenticate,
  authorizeRoles("ADMIN"),
  reactivateUserController
);

// Only Admin can transfer employees between branches.
router.patch(
  "/:userId/transfer",
  authenticate,
  authorizeRoles("ADMIN"),
  transferEmployeeController
);

// Only Admin can reset user passwords.
router.patch(
  "/:userId/reset-password",
  authenticate,
  authorizeRoles("ADMIN"),
  resetUserPasswordController
);

export default router;