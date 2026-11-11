import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Record important user or system actions; never pass passwords or tokens in details.
export async function createAuditLog(input: {
  userId?: string | null;
  actorType: "USER" | "SYSTEM";
  branchId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown> | null;
}) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      actorType: input.actorType,
      branchId: input.branchId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details as any,
    },
  });
}

// Retrieve audit history with pagination and optional filters.
export async function getAuditLogs(input: {
  role: string;
  branchId?: string;
  requestedBranchId?: string;
  page: number;
  limit: number;
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {
    ...(input.role === "BRANCH_MANAGER" ? { branchId: input.branchId } : {}),
    ...(input.role === "HEADQUARTERS_MANAGER" && input.requestedBranchId
      ? { branchId: input.requestedBranchId }
      : {}),
    ...(input.action ? { action: { contains: input.action, mode: "insensitive" } } : {}),
    ...(input.entityType ? { entityType: { equals: input.entityType, mode: "insensitive" } } : {}),
    ...(input.startDate || input.endDate
      ? {
          createdAt: {
            ...(input.startDate ? { gte: input.startDate } : {}),
            ...(input.endDate ? { lte: input.endDate } : {}),
          },
        }
      : {}),
  };

  // Branch Managers must always have a branch scope.
  if (input.role === "BRANCH_MANAGER" && !input.branchId) {
    throw new AppError("Branch assignment is required", 403);
  }

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        branch: { select: { id: true, branchCode: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

// Retrieve one audit record using the same role and branch restrictions.
export async function getAuditLogById(input: {
  logId: string;
  role: string;
  branchId?: string;
}) {
  const log = await prisma.auditLog.findFirst({
    where: {
      id: input.logId,
      ...(input.role === "BRANCH_MANAGER" ? { branchId: input.branchId } : {}),
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      branch: { select: { id: true, branchCode: true, name: true } },
    },
  });
  if (!log) throw new AppError("Audit log not found", 404);
  return log;
}
