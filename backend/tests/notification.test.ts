// Tests notification ownership, filtering, counts, read actions, and role access.
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const testPassword = "SteakzTest!2026";

const serverEmail = "server.london@test.steakz.com";
const cookEmail = "cook.london@test.steakz.com";

describe("Notifications API", () => {
  const suffix = randomUUID().slice(0, 8);
  const titlePrefix = `Notification test ${suffix}`;

  const branchManagerEmail = `notification-london-${suffix}@test.steakz.com`;
  const otherBranchManagerEmail = `notification-manchester-${suffix}@test.steakz.com`;

  let branchManagerUser: any;
  let otherBranchManagerUser: any;
  let serverUser: any;
  let cookUser: any;

  let branchManagerToken = "";
  let otherBranchManagerToken = "";
  let serverToken = "";
  let cookToken = "";

  const notificationIds: string[] = [];
  const temporaryUserIds: string[] = [];

  
  // Create isolated Branch Manager accounts and authenticate all test users.
  beforeAll(async () => {
    // Retrieve the two existing branches.
    const [londonBranch, manchesterBranch] = await Promise.all([
      prisma.branch.findUniqueOrThrow({
        where: { branchCode: "LON001" },
      }),
      prisma.branch.findUniqueOrThrow({
        where: { branchCode: "MAN001" },
      }),
    ]);

    // Retrieve existing Server and Cook accounts for permission tests.
    [serverUser, cookUser] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { email: serverEmail },
      }),
      prisma.user.findUniqueOrThrow({
        where: { email: cookEmail },
      }),
    ]);

    // Hash the password used by the temporary accounts.
    const passwordHash = await hash(testPassword, 12);

    // Create two temporary Branch Managers with unique email addresses.
    [branchManagerUser, otherBranchManagerUser] = await Promise.all([
      prisma.user.create({
        data: {
          firstName: "Notification",
          lastName: "London Test",
          email: branchManagerEmail,
          passwordHash,
          role: "BRANCH_MANAGER",
          branchId: londonBranch.id,
        },
      }),
      prisma.user.create({
        data: {
          firstName: "Notification",
          lastName: "Manchester Test",
          email: otherBranchManagerEmail,
          passwordHash,
          role: "BRANCH_MANAGER",
          branchId: manchesterBranch.id,
        },
      }),
    ]);

    // Remember the temporary account IDs for safe cleanup.
    temporaryUserIds.push(
      branchManagerUser.id,
      otherBranchManagerUser.id,
    );

    // Authenticate all four test accounts.
    const [
      branchManagerLogin,
      otherBranchManagerLogin,
      serverLogin,
      cookLogin,
    ] = await Promise.all([
      request(app).post("/api/v1/auth/login").send({
        email: branchManagerEmail,
        password: testPassword,
      }),
      request(app).post("/api/v1/auth/login").send({
        email: otherBranchManagerEmail,
        password: testPassword,
      }),
      request(app).post("/api/v1/auth/login").send({
        email: serverEmail,
        password: testPassword,
      }),
      request(app).post("/api/v1/auth/login").send({
        email: cookEmail,
        password: testPassword,
      }),
    ]);

    expect(branchManagerLogin.status).toBe(200);
    expect(otherBranchManagerLogin.status).toBe(200);
    expect(serverLogin.status).toBe(200);
    expect(cookLogin.status).toBe(200);

    branchManagerToken = branchManagerLogin.body.data.accessToken;
    otherBranchManagerToken = otherBranchManagerLogin.body.data.accessToken;
    serverToken = serverLogin.body.data.accessToken;
    cookToken = cookLogin.body.data.accessToken;

    // Create three notifications for London and one for Manchester.
    const records = await Promise.all([
      prisma.notification.create({
        data: {
          userId: branchManagerUser.id,
          branchId: branchManagerUser.branchId,
          title: `${titlePrefix} unread one`,
          message: "First test notification",
          type: "ORDER",
        },
      }),
      prisma.notification.create({
        data: {
          userId: branchManagerUser.id,
          branchId: branchManagerUser.branchId,
          title: `${titlePrefix} unread two`,
          message: "Second test notification",
          type: "INVENTORY",
        },
      }),
      prisma.notification.create({
        data: {
          userId: branchManagerUser.id,
          branchId: branchManagerUser.branchId,
          title: `${titlePrefix} already read`,
          message: "Previously read test notification",
          type: "SYSTEM",
          isRead: true,
        },
      }),
      prisma.notification.create({
        data: {
          userId: otherBranchManagerUser.id,
          branchId: otherBranchManagerUser.branchId,
          title: `${titlePrefix} another user`,
          message: "This belongs to the Manchester Branch Manager",
          type: "ORDER",
        },
      }),
    ]);

    notificationIds.push(...records.map((record) => record.id));
  });


  afterAll(async () => {
    // Delete only notifications and users created by this test suite.
    await prisma.notification.deleteMany({
      where: { id: { in: notificationIds } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: temporaryUserIds } },
    });
  });

  it("requires authentication for every notification endpoint", async () => {
    const responses = await Promise.all([
      request(app).get("/api/v1/notifications"),
      request(app).get("/api/v1/notifications/unread-count"),
      request(app).patch("/api/v1/notifications/read-all"),
      request(app).patch(`/api/v1/notifications/${randomUUID()}/read`),
    ]);

    responses.forEach((response) => expect(response.status).toBe(401));
  });

  it("denies notification access to Server and Cook accounts", async () => {
    const responses = await Promise.all([
      request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${serverToken}`),
      request(app)
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${serverToken}`),
      request(app)
        .patch("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${serverToken}`),
      request(app)
        .patch(`/api/v1/notifications/${randomUUID()}/read`)
        .set("Authorization", `Bearer ${serverToken}`),

      request(app)
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${cookToken}`),
      request(app)
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${cookToken}`),
      request(app)
        .patch("/api/v1/notifications/read-all")
        .set("Authorization", `Bearer ${cookToken}`),
      request(app)
        .patch(`/api/v1/notifications/${randomUUID()}/read`)
        .set("Authorization", `Bearer ${cookToken}`),
    ]);

    responses.forEach((response) => expect(response.status).toBe(403));
  });

  it("lists only the authenticated user's notifications", async () => {
    const response = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.notifications).toHaveLength(3);

    expect(
      response.body.data.notifications.every(
        (notification: any) =>
          notification.userId === branchManagerUser.id,
      ),
    ).toBe(true);

    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 20,
      total: 3,
      totalPages: 1,
    });
  });

  it("filters unread notifications and returns pagination details", async () => {
    const response = await request(app)
      .get("/api/v1/notifications?page=1&limit=1&unreadOnly=true")
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.notifications).toHaveLength(1);
    expect(response.body.data.notifications[0].isRead).toBe(false);

    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });
  });

  it("rejects invalid pagination and unreadOnly query values", async () => {
    const invalidPage = await request(app)
      .get("/api/v1/notifications?page=0")
      .set("Authorization", `Bearer ${branchManagerToken}`);

    const invalidLimit = await request(app)
      .get("/api/v1/notifications?limit=101")
      .set("Authorization", `Bearer ${branchManagerToken}`);

    const invalidUnreadOnly = await request(app)
      .get("/api/v1/notifications?unreadOnly=yes")
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(invalidPage.status).toBe(400);
    expect(invalidLimit.status).toBe(400);
    expect(invalidUnreadOnly.status).toBe(400);
  });

  it("returns the unread count for the signed-in user only", async () => {
    const [branchManagerResponse, otherManagerResponse] =
      await Promise.all([
        request(app)
          .get("/api/v1/notifications/unread-count")
          .set("Authorization", `Bearer ${branchManagerToken}`),
        request(app)
          .get("/api/v1/notifications/unread-count")
          .set("Authorization", `Bearer ${otherBranchManagerToken}`),
      ]);

    expect(branchManagerResponse.status).toBe(200);
    expect(branchManagerResponse.body.data.unreadCount).toBe(2);

    expect(otherManagerResponse.status).toBe(200);
    expect(otherManagerResponse.body.data.unreadCount).toBe(1);
  });

  it("marks one of the user's notifications as read", async () => {
    const targetId = notificationIds[0];

    const response = await request(app)
      .patch(`/api/v1/notifications/${targetId}/read`)
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: targetId,
      isRead: true,
    });

    const saved = await prisma.notification.findUniqueOrThrow({
      where: { id: targetId },
    });

    expect(saved.isRead).toBe(true);
  });

  it("does not allow a user to mark another user's notification as read", async () => {
    const otherUserNotificationId = notificationIds[3];

    const response = await request(app)
      .patch(`/api/v1/notifications/${otherUserNotificationId}/read`)
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(response.status).toBe(404);

    const saved = await prisma.notification.findUniqueOrThrow({
      where: { id: otherUserNotificationId },
    });

    expect(saved.isRead).toBe(false);
  });

  it("returns 404 for a notification that does not exist", async () => {
    const response = await request(app)
      .patch(`/api/v1/notifications/${randomUUID()}/read`)
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(response.status).toBe(404);
  });

  it("keeps an already-read notification read", async () => {
    const alreadyReadId = notificationIds[2];

    const response = await request(app)
      .patch(`/api/v1/notifications/${alreadyReadId}/read`)
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: alreadyReadId,
      isRead: true,
    });
  });

  it("marks all and only the signed-in user's unread notifications as read", async () => {
    const response = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.updatedCount).toBe(1);

    const [branchManagerUnread, otherManagerUnread] = await Promise.all([
      prisma.notification.count({
        where: {
          id: { in: notificationIds },
          userId: branchManagerUser.id,
          isRead: false,
        },
      }),
      prisma.notification.count({
        where: {
          id: { in: notificationIds },
          userId: otherBranchManagerUser.id,
          isRead: false,
        },
      }),
    ]);

    expect(branchManagerUnread).toBe(0);
    expect(otherManagerUnread).toBe(1);
  });

  it("returns zero when there are no unread notifications left", async () => {
    const response = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${branchManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.updatedCount).toBe(0);
  });
});
