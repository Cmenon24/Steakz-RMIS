import { Router } from "express";
import { getBranches, getBranch, createBranchController, updateBranchController, deactivateBranchController, } from "../controllers/branch.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

// Create the branch management router.
const router = Router();

// Only Admin and HQ Manager can view all branches.
router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER"),
  getBranches
);

// Only Admin and HQ Manager can view an individual branch.
router.get(
  "/:branchId",
  authenticate,
  authorizeRoles("ADMIN", "HEADQUARTERS_MANAGER", "BRANCH_MANAGER"),
  getBranch
);

// Only Admin can create new branches.
router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN"),
  createBranchController
);

// Only Admin can update branch details.
router.patch(
  "/:branchId",
  authenticate,
  authorizeRoles("ADMIN"),
  updateBranchController
);

// Only Admin can deactivate a branch.
router.patch(
  "/:branchId/deactivate",
  authenticate,
  authorizeRoles("ADMIN"),
  deactivateBranchController
);

export default router;