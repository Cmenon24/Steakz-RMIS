import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  createRecipeController,
  createRecipeVersionController,
  getRecipeController,
  getRecipesController,
  publishRecipeVersionController,
  setRecipeIngredientsController,
} from "../controllers/recipe.controller.js";

const router = Router();
router.use(authenticate);

// Headquarters manages recipes; Admin and Branch Managers have read-only access.
const recipeReadRoles = ["HEADQUARTERS_MANAGER", "BRANCH_MANAGER", "COOK"] as const;
const recipeManagementRoles = ["HEADQUARTERS_MANAGER"] as const;

router.get("/", authorizeRoles(...recipeReadRoles), getRecipesController);
router.get("/:recipeId", authorizeRoles(...recipeReadRoles), getRecipeController);
router.post("/", authorizeRoles(...recipeManagementRoles), createRecipeController);
router.post("/:recipeId/versions", authorizeRoles(...recipeManagementRoles), createRecipeVersionController);
router.put(
  "/:recipeId/versions/:versionId/ingredients",
  authorizeRoles(...recipeManagementRoles),
  setRecipeIngredientsController,
);
router.patch(
  "/:recipeId/versions/:versionId/publish",
  authorizeRoles(...recipeManagementRoles),
  publishRecipeVersionController,
);

export default router;
