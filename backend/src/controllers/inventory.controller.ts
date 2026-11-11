import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

import {
  getIngredients, getIngredient, createIngredient, updateIngredient,
  setIngredientActive, getBranchInventory, getBranchInventoryItem,
  setMinimumStockLevel, receiveStock, adjustStock, getInventoryTransactions,
  getInventoryAlerts, startStocktake, getStocktakes, getStocktake,
  updateStocktakeCount, completeStocktake,
} from "../services/inventory.service.js";
import { AppError } from "../utils/app-error.js";

const unitSchema = z.enum(["G", "KG", "ML", "L", "CAN", "BOTTLE", "GLASS", "PIECE", "PORTION"]);
const createIngredientSchema = z.object({ name: z.string().trim().min(2).max(100), unit: unitSchema }).strict();
const updateIngredientSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), unit: unitSchema.optional() }).strict().refine((data) => Object.keys(data).length > 0, "At least one field must be provided");
const receiveSchema = z.object({ ingredientId: z.uuid(), quantity: z.number().positive(), supplierName: z.string().trim().max(150).optional(), unitCost: z.number().nonnegative().optional(), notes: z.string().trim().max(500).optional(), idempotencyKey: z.string().trim().min(1).max(100).optional() }).strict();
const adjustmentSchema = z.object({ ingredientId: z.uuid(), quantityChange: z.number().finite().refine((value) => value !== 0), transactionType: z.enum(["WASTAGE", "CORRECTION_INCREASE", "CORRECTION_DECREASE"]), reason: z.string().trim().min(2).max(500), notes: z.string().trim().max(500).optional(), idempotencyKey: z.string().trim().min(1).max(100).optional() }).strict();
const minimumSchema = z.object({ minimumStockLevel: z.number().finite().min(0) }).strict();
const countSchema = z.object({ actualQuantity: z.number().finite().min(0) }).strict();

function param(value: string | string[] | undefined, label: string) {
  if (typeof value !== "string") throw new AppError(`Invalid ${label}`, 400);
  return value;
}
function auth(req: Request) {
  if (!req.auth) throw new AppError("Authentication required", 401);
  return req.auth;
}

export async function listIngredients(_req: Request, res: Response, next: NextFunction) {
  try { const data = await getIngredients(); res.status(200).json({ success: true, count: data.length, data }); } catch (error) { next(error); }
}
export async function getIngredientController(req: Request, res: Response, next: NextFunction) {
  try { const data = await getIngredient(param(req.params.ingredientId, "ingredient ID")); res.status(200).json({ success: true, data }); } catch (error) { next(error); }
}
export async function createIngredientController(req: Request, res: Response, next: NextFunction) {
  try { const data = await createIngredient(createIngredientSchema.parse(req.body)); res.status(201).json({ success: true, message: "Ingredient created successfully", data }); } catch (error) { next(error); }
}
export async function updateIngredientController(req: Request, res: Response, next: NextFunction) {
  try { const data = await updateIngredient(param(req.params.ingredientId, "ingredient ID"), updateIngredientSchema.parse(req.body)); res.status(200).json({ success: true, message: "Ingredient updated successfully", data }); } catch (error) { next(error); }
}
export async function deactivateIngredientController(req: Request, res: Response, next: NextFunction) {
  try { const data = await setIngredientActive(param(req.params.ingredientId, "ingredient ID"), false); res.status(200).json({ success: true, message: "Ingredient deactivated successfully", data }); } catch (error) { next(error); }
}
export async function reactivateIngredientController(req: Request, res: Response, next: NextFunction) {
  try { const data = await setIngredientActive(param(req.params.ingredientId, "ingredient ID"), true); res.status(200).json({ success: true, message: "Ingredient reactivated successfully", data }); } catch (error) { next(error); }
}

export async function getBranchInventoryController(req: Request, res: Response, next: NextFunction) {
  try { const data = await getBranchInventory(param(req.params.branchId, "branch ID")); res.status(200).json({ success: true, data }); } catch (error) { next(error); }
}
export async function getBranchInventoryItemController(req: Request, res: Response, next: NextFunction) {
  try { const data = await getBranchInventoryItem(param(req.params.branchId, "branch ID"), param(req.params.ingredientId, "ingredient ID")); res.status(200).json({ success: true, data }); } catch (error) { next(error); }
}
export async function setMinimumStockLevelController(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = param(req.params.branchId, "branch ID");
    const ingredientId = param(req.params.ingredientId, "ingredient ID");
    const body = minimumSchema.parse(req.body);
    const data = await setMinimumStockLevel(branchId, ingredientId, body.minimumStockLevel);
    res.status(200).json({ success: true, message: "Minimum stock level updated successfully", data });
  } catch (error) { next(error); }
}
export async function receiveStockController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = receiveSchema.parse(req.body);
    const data = await receiveStock({ ...body, branchId: param(req.params.branchId, "branch ID"), userId: auth(req).userId });
    res.status(201).json({ success: true, message: "Stock received successfully", data });
  } catch (error) { next(error); }
}
export async function adjustStockController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = adjustmentSchema.parse(req.body);
    const data = await adjustStock({ ...body, branchId: param(req.params.branchId, "branch ID"), userId: auth(req).userId });
    res.status(201).json({ success: true, message: "Inventory adjustment recorded successfully", data });
  } catch (error) { next(error); }
}
export async function getTransactionsController(req: Request, res: Response, next: NextFunction) {
  try {
    const ingredientId = req.query.ingredientId;
    if (ingredientId !== undefined && typeof ingredientId !== "string") throw new AppError("Invalid ingredient ID", 400);
    const data = await getInventoryTransactions(param(req.params.branchId, "branch ID"), ingredientId);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
}
export async function getAlertsController(req: Request, res: Response, next: NextFunction) {
  try {
    const includeResolved = req.query.includeResolved === "true";
    if (req.query.includeResolved !== undefined && !["true", "false"].includes(String(req.query.includeResolved))) throw new AppError("includeResolved must be true or false", 400);
    const data = await getInventoryAlerts(param(req.params.branchId, "branch ID"), includeResolved);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
}
export async function startStocktakeController(req: Request, res: Response, next: NextFunction) {
  try { const data = await startStocktake(param(req.params.branchId, "branch ID"), auth(req).userId); res.status(201).json({ success: true, message: "Stocktake started successfully", data }); } catch (error) { next(error); }
}
export async function getStocktakesController(req: Request, res: Response, next: NextFunction) {
  try { const data = await getStocktakes(param(req.params.branchId, "branch ID")); res.status(200).json({ success: true, count: data.length, data }); } catch (error) { next(error); }
}
export async function getStocktakeController(req: Request, res: Response, next: NextFunction) {
  try { const data = await getStocktake(param(req.params.branchId, "branch ID"), param(req.params.stocktakeId, "stocktake ID")); res.status(200).json({ success: true, data }); } catch (error) { next(error); }
}
export async function updateStocktakeCountController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = countSchema.parse(req.body);
    const data = await updateStocktakeCount(
      param(req.params.branchId, "branch ID"),
      param(req.params.stocktakeId, "stocktake ID"),
      param(req.params.ingredientId, "ingredient ID"),
      body.actualQuantity,
      auth(req).userId,
    );
    res.status(200).json({ success: true, message: "Stocktake count saved successfully", data });
  } catch (error) { next(error); }
}
export async function completeStocktakeController(req: Request, res: Response, next: NextFunction) {
  try { const data = await completeStocktake(param(req.params.branchId, "branch ID"), param(req.params.stocktakeId, "stocktake ID"), auth(req).userId); res.status(200).json({ success: true, message: "Stocktake completed successfully", data }); } catch (error) { next(error); }
}
