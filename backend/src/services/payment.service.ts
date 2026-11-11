import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";
import { comparePassword } from "../utils/password.js";

// Convert serialization/unique conflicts from simultaneous requests into a clear API conflict.
function throwIfConcurrencyConflict(error: any, message: string): never | void {
  if (error?.code === "P2034" || error?.code === "P2002") {
    throw new AppError(message, 409);
  }
}

// Record one full simulated cash or card payment for a completed order.
export async function recordPayment(input: {
  orderId: string;
  branchId: string;
  userId: string;
  paymentMethod: "CASH" | "CARD";
}) {
  try {
    return await prisma.$transaction(async (tx: any) => {
      // Lock the order row so two Servers cannot pay the same order simultaneously.
      await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${input.orderId}::uuid AND "branchId" = ${input.branchId}::uuid FOR UPDATE`;

      const order = await tx.order.findFirst({
        where: { id: input.orderId, branchId: input.branchId },
        select: {
          id: true,
          orderNumber: true,
          tableId: true,
          status: true,
          totalAmount: true,
          payments: { where: { status: "SUCCESSFUL" }, select: { id: true } },
        },
      });

      if (!order) throw new AppError("Order not found", 404);
      if (order.status !== "COMPLETED") {
        throw new AppError("Payment can only be recorded after an order is completed", 409);
      }
      if (order.payments.length > 0) {
        throw new AppError("This order already has a successful payment", 409);
      }

      // Use a unique reference; the current ReferenceCounter types do not include PAYMENT.
      const branch = await tx.branch.findUnique({
        where: { id: input.branchId },
        select: { branchCode: true },
      });
      if (!branch) throw new AppError("Branch not found", 404);

      const paymentReference = `PAY-${branch.branchCode}-${randomUUID()}`;
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          paymentReference,
          amount: order.totalAmount,
          paymentMethod: input.paymentMethod,
          status: "SUCCESSFUL",
          processedByUserId: input.userId,
        },
        select: {
          id: true,
          paymentReference: true,
          orderId: true,
          amount: true,
          paymentMethod: true,
          status: true,
          processedByUserId: true,
          createdAt: true,
        },
      });

      // Record the payment event in the same transaction as the payment itself.
      await tx.auditLog.create({
        data: {
          userId: input.userId,
          actorType: "USER",
          branchId: input.branchId,
          action: "PAYMENT_RECORDED",
          entityType: "Payment",
          entityId: payment.id,
          details: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            paymentReference: payment.paymentReference,
            amount: payment.amount.toString(),
            paymentMethod: payment.paymentMethod,
          },
        },
      });

      // Keep the legacy table flag synchronized; availability is derived from unpaid active orders.
      await tx.restaurantTable.update({ where: { id: order.tableId }, data: { status: "AVAILABLE" } });
      return payment;
    }, { isolationLevel: "Serializable" });
  } catch (error: any) {
    throwIfConcurrencyConflict(error, "A payment for this order has already been recorded. Refresh payment history.");
    throw error;
  }
}

// Retrieve payment and refund history while enforcing branch ownership.
export async function getOrderPayments(orderId: string, branchId?: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, ...(branchId ? { branchId } : {}) },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      payments: {
        include: {
          refunds: {
            include: {
              requestedBy: { select: { id: true, firstName: true, lastName: true } },
              processedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!order) throw new AppError("Order not found", 404);

  const successfulPayment = order.payments.find((payment: any) => payment.status === "SUCCESSFUL");
  const processedRefund = successfulPayment?.refunds.find((refund: any) => refund.status === "PROCESSED");

  return {
    ...order,
    paymentStatus: processedRefund ? "REFUNDED" : successfulPayment ? "PAID" : order.status === "COMPLETED" ? "PAYMENT_REQUIRED" : null,
  };
}

// Submit a full refund request; Servers need manager approval, Managers can process their own request.
export async function requestRefund(input: {
  paymentId: string;
  branchId: string;
  userId: string;
  role: string;
  reason: string;
}) {
  try {
    return await prisma.$transaction(async (tx: any) => {
      // Lock the payment row so concurrent refund requests cannot both be accepted.
      await tx.$queryRaw`SELECT "id" FROM "Payment" WHERE "id" = ${input.paymentId}::uuid FOR UPDATE`;

      const payment = await tx.payment.findFirst({
        where: {
          id: input.paymentId,
          status: "SUCCESSFUL",
          order: { branchId: input.branchId, status: "COMPLETED" },
        },
        include: { refunds: true, order: { select: { id: true, totalAmount: true } } },
      });
      if (!payment) throw new AppError("Successful payment not found for this branch", 404);
      if (!["SERVER", "BRANCH_MANAGER"].includes(input.role)) {
        throw new AppError("You are not authorized to request a refund", 403);
      }
      if (!input.reason.trim()) throw new AppError("A refund reason is required", 400);
      if (payment.refunds.some((refund: any) => ["REQUESTED", "APPROVED", "PROCESSED"].includes(refund.status))) {
        throw new AppError("A refund request already exists for this payment", 409);
      }

      const managerInitiated = input.role === "BRANCH_MANAGER";
      const processedAt = managerInitiated ? new Date() : null;
      // A Manager's confirmed self-initiated refund is processed immediately; a Server's request awaits approval.
      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          reason: input.reason.trim(),
          status: managerInitiated ? "PROCESSED" : "REQUESTED",
          requestedByUserId: input.userId,
          ...(managerInitiated ? { processedByUserId: input.userId, processedAt } : {}),
        },
        select: {
          id: true,
          paymentId: true,
          amount: true,
          reason: true,
          status: true,
          requestedByUserId: true,
          processedByUserId: true,
          createdAt: true,
          processedAt: true,
        },
      });

      // Audit the request or immediate Manager processing atomically with the refund record.
      await tx.auditLog.create({
        data: {
          userId: input.userId,
          actorType: "USER",
          branchId: input.branchId,
          action: managerInitiated ? "REFUND_SELF_PROCESSED" : "REFUND_REQUESTED",
          entityType: "Refund",
          entityId: refund.id,
          details: {
            paymentId: payment.id,
            orderId: payment.order.id,
            amount: refund.amount.toString(),
            reason: refund.reason,
            status: refund.status,
          },
        },
      });
      return refund;
    }, { isolationLevel: "Serializable" });
  } catch (error: any) {
    throwIfConcurrencyConflict(error, "A refund request for this payment already exists. Refresh refund history.");
    throw error;
  }
}

// Approve or reject a Server's refund request for an order in the Manager's own branch.
export async function reviewRefund(input: {
  refundId: string;
  branchId: string;
  managerEmail: string;
  password: string;
  decision: "APPROVED" | "REJECTED";
}) {
  try {
    return await prisma.$transaction(async (tx: any) => {
      // Lock the refund row to prevent two Managers from reviewing it at the same time.
      await tx.$queryRaw`SELECT "id" FROM "Refund" WHERE "id" = ${input.refundId}::uuid FOR UPDATE`;

      const refund = await tx.refund.findFirst({
        where: { id: input.refundId, payment: { order: { branchId: input.branchId } } },
        include: { payment: { select: { id: true, amount: true, status: true, orderId: true } } },
      });
      if (!refund) throw new AppError("Refund request not found", 404);
      if (refund.status !== "REQUESTED") throw new AppError("Only requested refunds can be reviewed", 409);

      // Require the Branch Manager's password when approving a Server-initiated request at the terminal.
      const manager = await tx.user.findFirst({
        where: {
          email: input.managerEmail.toLowerCase().trim(),
          branchId: input.branchId,
          role: "BRANCH_MANAGER",
          isActive: true,
          deactivatedAt: null,
        },
        select: { id: true, passwordHash: true },
      });
      if (!manager || !(await comparePassword(input.password, manager.passwordHash))) {
        throw new AppError("Manager password is incorrect", 401);
      }

      const processedAt = new Date();
      const reviewed = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: input.decision === "APPROVED" ? "PROCESSED" : "REJECTED",
          processedByUserId: manager.id,
          processedAt,
        },
        select: {
          id: true,
          paymentId: true,
          amount: true,
          reason: true,
          status: true,
          requestedByUserId: true,
          processedByUserId: true,
          createdAt: true,
          processedAt: true,
        },
      });

      // Keep an immutable record of the Manager's approval or rejection.
      await tx.auditLog.create({
        data: {
          userId: manager.id,
          actorType: "USER",
          branchId: input.branchId,
          action: input.decision === "APPROVED" ? "REFUND_APPROVED" : "REFUND_REJECTED",
          entityType: "Refund",
          entityId: reviewed.id,
          details: {
            paymentId: refund.payment.id,
            orderId: refund.payment.orderId,
            amount: reviewed.amount.toString(),
            reason: reviewed.reason,
            status: reviewed.status,
            requestedByUserId: reviewed.requestedByUserId,
            managerEmail: input.managerEmail.toLowerCase().trim(),
          },
        },
      });
      return reviewed;
    }, { isolationLevel: "Serializable" });
  } catch (error: any) {
    throwIfConcurrencyConflict(error, "This refund has already been reviewed. Refresh refund history.");
    throw error;
  }
}
