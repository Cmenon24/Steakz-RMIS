import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../utils/app-error.js";
import {
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../services/notification.service.js";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.enum(["true", "false"]).default("false"),
});

// List notifications for the authenticated user.
export async function getMyNotificationsController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) throw new AppError("Authentication required", 401);
    const query = listQuerySchema.parse(req.query);
    const result = await getMyNotifications({
      userId: req.auth.userId,
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly === "true",
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) { next(error); }
}

// Return the unread count used by the application's notification badge.
export async function getUnreadCountController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) throw new AppError("Authentication required", 401);
    const count = await getUnreadNotificationCount(req.auth.userId);
    res.status(200).json({ success: true, data: { unreadCount: count } });
  } catch (error) { next(error); }
}

// Mark one notification as read without exposing another user's record.
export async function markNotificationReadController(req: Request, res: Response, next: NextFunction) {
  try {
    const notificationId = req.params.notificationId;
    if (typeof notificationId !== "string" || !req.auth?.userId) {
      throw new AppError("Invalid notification ID or authentication", 400);
    }
    const notification = await markNotificationAsRead(notificationId, req.auth.userId);
    res.status(200).json({ success: true, data: notification });
  } catch (error) { next(error); }
}

// Mark every unread notification for this user as read.
export async function markAllNotificationsReadController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth?.userId) throw new AppError("Authentication required", 401);
    const result = await markAllNotificationsAsRead(req.auth.userId);
    res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      data: { updatedCount: result.count },
    });
  } catch (error) { next(error); }
}
