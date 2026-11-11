import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";
import {
  createOrder, editOrder, getOrder, getOrders, getKitchenQueue, updateOrderStatus, cancelOrder,
} from "../services/order.service.js";

// Servers submit menu items only; eligible promotions are calculated automatically by the order service.
const createOrderSchema = z.object({
  tableId: z.uuid(),
  items: z.array(z.object({ menuItemId: z.uuid(), quantity: z.number().int().min(1).max(50) }).strict()).min(1),
}).strict();

const editOrderSchema = z.object({
  items: z.array(z.object({ menuItemId: z.uuid(), quantity: z.number().int().min(1).max(50) }).strict()).min(1),
}).strict();

const statusSchema = z.object({
  status: z.enum(["PREPARING", "READY", "COMPLETED"]),
}).strict();

const cancelSchema = z.object({
  reason: z.string().trim().min(3).max(500),
}).strict();

function branchScope(req: Request) {
  const role = req.auth!.role;
  return ["BRANCH_MANAGER", "SERVER", "COOK"].includes(role) ? req.auth!.branchId ?? undefined : undefined;
}

// Create an order using the authenticated Server's assigned branch.
export async function createOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createOrderSchema.parse(req.body);
    if (!req.auth || req.auth.role !== "SERVER" || !req.auth.branchId) throw new AppError("Only an assigned Server can create orders", 403);
    const order = await createOrder({
      branchId: req.auth.branchId,
      tableId: data.tableId,
      serverId: req.auth.userId,
      items: data.items,
    });
    res.status(201).json({ success: true, message: "Order created successfully", data: order });
  } catch (error) { next(error); }
}

// Servers may edit only their own orders while the order is still NEW.
export async function editOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId;
    if (typeof orderId !== "string" || !req.auth?.branchId || req.auth.role !== "SERVER") {
      throw new AppError("Only an assigned Server can edit an order", 403);
    }
    const data = editOrderSchema.parse(req.body);
    const order = await editOrder({
      orderId,
      branchId: req.auth.branchId,
      serverId: req.auth.userId,
      items: data.items,
    });
    res.status(200).json({ success: true, message: "Order updated successfully", data: order });
  } catch (error) { next(error); }
}

export async function getOrdersController(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status;
    if (status !== undefined && !["NEW", "PREPARING", "READY", "COMPLETED", "CANCELLED"].includes(String(status))) {
      throw new AppError("Invalid order status", 400);
    }
    const orders = await getOrders({ branchId: branchScope(req), status: status as string | undefined });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) { next(error); }
}

export async function getOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId;
    if (typeof orderId !== "string") throw new AppError("Invalid order ID", 400);
    const order = await getOrder(orderId, branchScope(req));
    res.status(200).json({ success: true, data: order });
  } catch (error) { next(error); }
}

export async function getKitchenQueueController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.branchId) throw new AppError("A branch assignment is required", 403);
    const orders = await getKitchenQueue(req.auth.branchId);
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) { next(error); }
}

export async function updateOrderStatusController(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId;
    if (typeof orderId !== "string" || !req.auth) throw new AppError("Invalid order ID or authentication", 400);
    const data = statusSchema.parse(req.body);
    const order = await updateOrderStatus({
      orderId, branchId: branchScope(req), userId: req.auth.userId, role: req.auth.role, status: data.status,
    });
    res.status(200).json({ success: true, message: "Order status updated", data: order });
  } catch (error) { next(error); }
}

export async function cancelOrderController(req: Request, res: Response, next: NextFunction) {
  try {
    const orderId = req.params.orderId;
    if (typeof orderId !== "string" || !req.auth?.branchId) throw new AppError("Invalid order ID or branch assignment", 400);
    const data = cancelSchema.parse(req.body);
    const result = await cancelOrder({
      orderId, branchId: req.auth.branchId, userId: req.auth.userId, role: req.auth.role, reason: data.reason,
    });
    res.status(200).json({ success: true, message: "Order cancelled and inventory reversed", data: result });
  } catch (error) { next(error); }
}

