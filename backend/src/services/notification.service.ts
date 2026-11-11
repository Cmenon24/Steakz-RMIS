import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/app-error.js";

// Create one notification for each active recipient.
export async function createNotifications(input: {
  branchId?: string | null;
  recipientUserIds: string[];
  title: string;
  message: string;
  type: string;
}) {
  const userIds = [...new Set(input.recipientUserIds)];
  if (userIds.length === 0) return { count: 0 };

  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      branchId: input.branchId ?? null,
      title: input.title,
      message: input.message,
      type: input.type,
    })),
  });
}

// Notify active employees with selected roles in a branch.
// Include HEADQUARTERS_MANAGER when a chain-wide operational view is required.
export async function notifyBranchRoles(input: {
  branchId: string;
  roles: Array<"ADMIN" | "HEADQUARTERS_MANAGER" | "BRANCH_MANAGER" | "SERVER" | "COOK">;
  title: string;
  message: string;
  type: string;
}) {
  const recipients = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: input.roles },
      OR: [
        { branchId: input.branchId },
        { role: "HEADQUARTERS_MANAGER", branchId: null },
        { role: "ADMIN", branchId: null },
      ],
    },
    select: { id: true },
  });

  return createNotifications({
    branchId: input.branchId,
    recipientUserIds: recipients.map((user) => user.id),
    title: input.title,
    message: input.message,
    type: input.type,
  });
}

// Return the signed-in user's notifications, newest first.
export async function getMyNotifications(input: {
  userId: string;
  page: number;
  limit: number;
  unreadOnly: boolean;
}) {
  const where = {
    userId: input.userId,
    ...(input.unreadOnly ? { isRead: false } : {}),
  };

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

// Calculate the unread badge count for the current user only.
export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

// A user can mark only their own notification as read.
export async function markNotificationAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, isRead: true },
  });
  if (!notification) throw new AppError("Notification not found", 404);
  if (notification.isRead) return notification;

  return prisma.notification.update({
    where: { id: notification.id },
    data: { isRead: true },
    select: { id: true, isRead: true },
  });
}

// Mark all unread notifications belonging to the current user as read.
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
