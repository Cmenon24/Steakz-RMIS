import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getSalesReport,
  getInventoryReport,
  getInventoryHistory,
} from "../services/report.service.js";
import { AppError } from "../utils/app-error.js";

const periodSchema = z.enum(["today", "yesterday", "thisWeek", "thisMonth", "lastMonth", "custom"]);

function getAuth(req: Request) {
  if (!req.auth) throw new AppError("Authentication required", 401);
  return req.auth;
}

function optionalString(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) throw new AppError(`${field} must be a non-empty string`, 400);
  return value.trim();
}

function getRangeQuery(req: Request) {
  const period = periodSchema.parse(req.query.period ?? "thisMonth");
  const startDate = optionalString(req.query.startDate, "startDate");
  const endDate = optionalString(req.query.endDate, "endDate");
  if (period === "custom" && (!startDate || !endDate)) {
    throw new AppError("Custom reports require startDate and endDate", 400);
  }
  return { period, startDate, endDate };
}

// Return sales KPIs and sales breakdowns for the permitted branch scope.
export async function salesReportController(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    const data = await getSalesReport({
      role: auth.role,
      assignedBranchId: auth.branchId,
      requestedBranchId: optionalString(req.query.branchId, "branchId"),
      range: getRangeQuery(req),
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// Return current stock levels and unresolved alerts.
export async function inventoryReportController(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    const data = await getInventoryReport({
      role: auth.role,
      assignedBranchId: auth.branchId,
      requestedBranchId: optionalString(req.query.branchId, "branchId"),
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// Return a branch-scoped inventory movement history.
export async function inventoryHistoryReportController(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req);
    const startDate = optionalString(req.query.startDate, "startDate");
    const endDate = optionalString(req.query.endDate, "endDate");
    const ingredientId = optionalString(req.query.ingredientId, "ingredientId");
    if ((startDate && !endDate) || (!startDate && endDate)) {
      throw new AppError("Provide both startDate and endDate", 400);
    }

    const data = await getInventoryHistory({
      role: auth.role,
      assignedBranchId: auth.branchId,
      requestedBranchId: optionalString(req.query.branchId, "branchId"),
      startDate,
      endDate,
      ingredientId,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
