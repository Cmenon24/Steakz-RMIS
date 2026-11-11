import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  createRecipe,
  createRecipeVersion,
  getRecipeById,
  getRecipes,
  publishRecipeVersion,
  setRecipeVersionIngredients,
} from "../services/recipe.service.js";
import { AppError } from "../utils/app-error.js";

const createRecipeSchema = z.object({ menuItemId: z.uuid() }).strict();
const ingredientsSchema = z.object({
  ingredients: z.array(z.object({
    ingredientId: z.uuid(),
    quantity: z.number().finite().positive(),
    unit: z.enum(["G", "KG", "ML", "L", "CAN", "BOTTLE", "GLASS", "PIECE", "PORTION"]),
  }).strict()).max(200),
}).strict();


// List recipes, filtering versions according to the user's role.
export async function getRecipesController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new AppError("Authentication required", 401);

    const recipes = await getRecipes(req.auth.role);
    res.status(200).json({ success: true, count: recipes.length, data: recipes });
  } catch (error) {
    next(error);
  }
}

// Retrieve one recipe with role-appropriate version visibility.
export async function getRecipeController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new AppError("Authentication required", 401);

    const recipeId = req.params.recipeId;
    if (typeof recipeId !== "string") throw new AppError("Invalid recipe ID", 400);

    const recipe = await getRecipeById(recipeId, req.auth.role);
    res.status(200).json({ success: true, data: recipe });
  } catch (error) {
    next(error);
  }
}


// Create a recipe with its first draft version.
export async function createRecipeController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) throw new AppError("Authentication required", 401);
    const input = createRecipeSchema.parse(req.body);
    const recipe = await createRecipe({ ...input, userId: req.auth.userId });
    res.status(201).json({ success: true, message: "Recipe created with its first draft version", data: recipe });
  } catch (error) { next(error); }
}

// Create the next draft version for an existing recipe.
export async function createRecipeVersionController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) throw new AppError("Authentication required", 401);
    const recipeId = req.params.recipeId;
    if (typeof recipeId !== "string") throw new AppError("Invalid recipe ID", 400);
    const version = await createRecipeVersion({ recipeId, userId: req.auth.userId });
    res.status(201).json({ success: true, message: "Draft recipe version created", data: version });
  } catch (error) { next(error); }
}

// Replace ingredients on a draft version.
export async function setRecipeIngredientsController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) throw new AppError("Authentication required", 401);
    const { recipeId, versionId } = req.params;
    if (typeof recipeId !== "string" || typeof versionId !== "string") throw new AppError("Invalid recipe or version ID", 400);
    const input = ingredientsSchema.parse(req.body);
    const version = await setRecipeVersionIngredients({ ...input, recipeId, versionId, userId: req.auth.userId });
    res.status(200).json({ success: true, message: "Draft recipe ingredients updated", data: version });
  } catch (error) { next(error); }
}

// Publish a validated draft version.
export async function publishRecipeVersionController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) throw new AppError("Authentication required", 401);
    const { recipeId, versionId } = req.params;
    if (typeof recipeId !== "string" || typeof versionId !== "string") throw new AppError("Invalid recipe or version ID", 400);
    const version = await publishRecipeVersion({ recipeId, versionId, userId: req.auth.userId });
    res.status(200).json({ success: true, message: "Recipe version published successfully", data: version });
  } catch (error) { next(error); }
}
