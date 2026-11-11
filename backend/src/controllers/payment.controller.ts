import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";
import { recordPayment, getOrderPayments, requestRefund, reviewRefund } from "../services/payment.service.js";

const paymentSchema = z.object({
  paymentMethod: z.enum(["CASH", "CARD"]),
}).strict();

const refundRequestSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

const refundReviewSchema = z.object({
  managerEmail: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
  decision: z.enum(["APPROVED", "REJECTED"]),
}).strict();

// Branch-level roles are restricted to their authenticated branch.
function branchScope(req: Request) {
  return ["BRANCH_MANAGER", "SERVER", "COOK"].includes(req.auth!.role)
    ? req.auth!.branchId ?? undefined
    : undefined;
}

export async function recordPaymentController(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId;
    if (typeof orderId !== "string" || !req.auth?.branchId) {
      throw new AppError("Invalid order ID or branch assignment", 400);
    }
    const data = paymentSchema.parse(req.body);
    const payment = await recordPayment({
      orderId,
      branchId: req.auth.branchId,
      userId: req.auth.userId,
      paymentMethod: data.paymentMethod,
    });
    res.status(201).json({ success: true, message: "Payment recorded successfully", data: payment });
  } catch (error) { next(error); }
}

export async function getOrderPaymentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId;
    if (typeof orderId !== "string") throw new AppError("Invalid order ID", 400);
    const result = await getOrderPayments(orderId, branchScope(req));
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
}

export async function requestRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const paymentId = req.params.paymentId;
    if (typeof paymentId !== "string" || !req.auth?.branchId) {
      throw new AppError("Invalid payment ID or branch assignment", 400);
    }
    const data = refundRequestSchema.parse(req.body);
    const refund = await requestRefund({
      paymentId,
      branchId: req.auth.branchId,
      userId: req.auth.userId,
      role: req.auth.role,
      reason: data.reason,
    });
    res.status(201).json({ success: true, message: "Refund request submitted", data: refund });
  } catch (error) { next(error); }
}

export async function reviewRefundController(req: Request, res: Response, next: NextFunction) {
  try {
    const refundId = req.params.refundId;
    if (typeof refundId !== "string" || !req.auth?.branchId) {
      throw new AppError("Invalid refund ID or branch assignment", 400);
    }
    const data = refundReviewSchema.parse(req.body);
    const refund = await reviewRefund({
      refundId,
      branchId: req.auth.branchId,
      managerEmail: data.managerEmail,
      password: data.password,
      decision: data.decision,
    });
    res.status(200).json({ success: true, message: "Refund request reviewed", data: refund });
  } catch (error) { next(error); }
}
