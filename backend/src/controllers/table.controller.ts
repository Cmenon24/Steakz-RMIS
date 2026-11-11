import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getBranchTables, getAllTables, createTable, updateTable, deactivateTable, reactivateTable,
} from "../services/table.service.js";
import { AppError } from "../utils/app-error.js";

const createSchema = z.object({
  branchId: z.uuid(),
  tableNumber: z.string().trim().min(1).max(20),
  capacity: z.number().int().positive().max(50).optional(),
}).strict();

const updateSchema = z.object({
  tableNumber: z.string().trim().min(1).max(20).optional(),
  capacity: z.number().int().positive().max(50).nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

function param(value: string | string[] | undefined) {
  if (typeof value !== "string") throw new AppError("Invalid table ID", 400);
  return value;
}

function auth(req: Request) {
  if (!req.auth) throw new AppError("Authentication required", 401);
  return req.auth;
}

// Branch-scoped table view for HQ, Branch Managers and Servers.
export async function getBranchTablesController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getBranchTables(param(req.params.branchId), req.query.availableOnly === "true");
    res.status(200).json({ success: true, count: data.tables.length, data });
  } catch (error) { next(error); }
}

// Chain-wide table list for Admin and HQ.
export async function getAllTablesController(req: Request, res: Response, next: NextFunction) {
  try {
    const branchId = req.query.branchId;
    if (branchId !== undefined && typeof branchId !== "string") throw new AppError("Invalid branch ID", 400);
    const data = await getAllTables(branchId);
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) { next(error); }
}

// Admin creates a table for a selected branch.
export async function createTableController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await createTable(createSchema.parse(req.body));
    res.status(201).json({ success: true, message: "Table created successfully", data });
  } catch (error) { next(error); }
}

export async function updateTableController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await updateTable(param(req.params.tableId), updateSchema.parse(req.body));
    res.status(200).json({ success: true, message: "Table updated successfully", data });
  } catch (error) { next(error); }
}

export async function deactivateTableController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await deactivateTable(param(req.params.tableId));
    res.status(200).json({ success: true, message: "Table deactivated successfully", data });
  } catch (error) { next(error); }
}

export async function reactivateTableController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await reactivateTable(param(req.params.tableId));
    res.status(200).json({ success: true, message: "Table reactivated successfully", data });
  } catch (error) { next(error); }
}
