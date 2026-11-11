import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";
import { getAuditLogById, getAuditLogs } from "../services/audit-log.service.js";

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  branchId: z.string().uuid().optional(),
  action: z.string().trim().min(1).max(100).optional(),
  entityType: z.string().trim().min(1).max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: "startDate must be before or equal to endDate", path: ["startDate"] },
);

// Admin and HQ can search chain-wide; Branch Managers remain branch-scoped.
export async function getAuditLogsController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) throw new AppError("Authentication required", 401);
    const query = auditQuerySchema.parse(req.query);

    const result = await getAuditLogs({
      role: req.auth.role,
      branchId: req.auth.branchId ?? undefined,
      requestedBranchId: req.auth.role === "HEADQUARTERS_MANAGER" ? query.branchId : undefined,
      page: query.page,
      limit: query.limit,
      action: query.action,
      entityType: query.entityType,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
}

// Fetch a single audit record without allowing branch-scope bypass.
export async function getAuditLogByIdController(req: Request, res: Response, next: NextFunction) {
  try {
    const logId = req.params.logId;
    if (typeof logId !== "string" || !req.auth) {
      throw new AppError("Invalid audit log ID or authentication", 400);
    }

    const log = await getAuditLogById({
      logId,
      role: req.auth.role,
      branchId: req.auth.branchId ?? undefined,
    });

    res.status(200).json({ success: true, data: log });
  } catch (error) { next(error); }
}
