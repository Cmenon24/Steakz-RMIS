// Tests audit-log permissions, branch scope, filters, and pagination.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const testPassword = "SteakzTest!2026";
const serverEmail = "server.london@test.steakz.com";
const hqEmail = "hqmanager@test.steakz.com";
const londonManagerEmail = "bmanager.london@test.steakz.com";
const manchesterManagerEmail = "bmanager.manchester@test.steakz.com";
const cookEmail = "cook.london@test.steakz.com";

describe("Audit Logs API", () => {
  const suffix = randomUUID().slice(0, 8);
  const actionPrefix = `AUDIT_TEST_${suffix}`;
  let londonBranch: any;
  let manchesterBranch: any;
  let serverUser: any;
  let hqUser: any;
  let londonManager: any;
  let manchesterManager: any;
  let serverToken = "";
  let hqToken = "";
  let londonManagerToken = "";
  let manchesterManagerToken = "";
  let cookToken = "";
  const auditLogIds: string[] = [];

  // Sign in seeded users and create isolated audit records for both branches.
  beforeAll(async () => {
    [
      londonBranch,
      manchesterBranch,
      serverUser,
      hqUser,
      londonManager,
      manchesterManager,
    ] = await Promise.all([
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "LON001" } }),
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "MAN001" } }),
      prisma.user.findUniqueOrThrow({ where: { email: serverEmail } }),
      prisma.user.findUniqueOrThrow({ where: { email: hqEmail } }),
      prisma.user.findUniqueOrThrow({ where: { email: londonManagerEmail } }),
      prisma.user.findUniqueOrThrow({ where: { email: manchesterManagerEmail } }),
    ]);

    const [serverLogin, hqLogin, londonManagerLogin, manchesterManagerLogin, cookLogin] =
      await Promise.all([
        request(app).post("/api/v1/auth/login").send({
          email: serverEmail,
          password: testPassword,
        }),
        request(app).post("/api/v1/auth/login").send({
          email: hqEmail,
          password: testPassword,
        }),
        request(app).post("/api/v1/auth/login").send({
          email: londonManagerEmail,
          password: testPassword,
        }),
        request(app).post("/api/v1/auth/login").send({
          email: manchesterManagerEmail,
          password: testPassword,
        }),
        request(app).post("/api/v1/auth/login").send({
          email: cookEmail,
          password: testPassword,
        }),
      ]);

    expect(serverLogin.status).toBe(200);
    expect(hqLogin.status).toBe(200);
    expect(londonManagerLogin.status).toBe(200);
    expect(manchesterManagerLogin.status).toBe(200);
    expect(cookLogin.status).toBe(200);

    serverToken = serverLogin.body.data.accessToken;
    hqToken = hqLogin.body.data.accessToken;
    londonManagerToken = londonManagerLogin.body.data.accessToken;
    manchesterManagerToken = manchesterManagerLogin.body.data.accessToken;
    cookToken = cookLogin.body.data.accessToken;

    // Create records directly so these tests do not depend on other modules.
    const records = await Promise.all([
      prisma.auditLog.create({
        data: {
          userId: serverUser.id,
          actorType: "USER",
          branchId: londonBranch.id,
          action: `${actionPrefix}_USER_CREATED`,
          entityType: "User",
          entityId: randomUUID(),
          details: { source: "automated-test", sequence: 1 },
          createdAt: new Date("2026-01-10T10:00:00.000Z"),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: londonManager.id,
          actorType: "USER",
          branchId: londonBranch.id,
          action: `${actionPrefix}_USER_UPDATED`,
          entityType: "User",
          entityId: randomUUID(),
          details: { source: "automated-test", sequence: 2 },
          createdAt: new Date("2026-01-11T10:00:00.000Z"),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: manchesterManager.id,
          actorType: "USER",
          branchId: manchesterBranch.id,
          action: `${actionPrefix}_STOCK_UPDATED`,
          entityType: "Inventory",
          entityId: randomUUID(),
          details: { source: "automated-test", sequence: 3 },
          createdAt: new Date("2026-01-12T10:00:00.000Z"),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: hqUser.id,
          actorType: "USER",
          branchId: null,
          action: `${actionPrefix}_CENTRAL_SETTING`,
          entityType: "Promotion",
          entityId: randomUUID(),
          details: { source: "automated-test", sequence: 4 },
          createdAt: new Date("2026-01-13T10:00:00.000Z"),
        },
      }),
    ]);

    auditLogIds.push(...records.map((record) => record.id));
  });

  afterAll(async () => {
    // Delete only audit records created by this test suite.
    await prisma.auditLog.deleteMany({
      where: { id: { in: auditLogIds } },
    });
  });

  it("requires authentication to list or retrieve audit logs", async () => {
    const [listResponse, detailResponse] = await Promise.all([
      request(app).get("/api/v1/audit-logs"),
      request(app).get(`/api/v1/audit-logs/${randomUUID()}`),
    ]);

    expect(listResponse.status).toBe(401);
    expect(detailResponse.status).toBe(401);
  });

  it("allows Branch Managers and HQ to view audit logs but denies operational staff", async () => {
    const [serverResponse, cookResponse] = await Promise.all([
      request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${serverToken}`),
      request(app)
        .get("/api/v1/audit-logs")
        .set("Authorization", `Bearer ${cookToken}`),
    ]);

    expect(serverResponse.status).toBe(403);
    expect(cookResponse.status).toBe(403);
  });

  it("limits a Branch Manager's list to their assigned branch", async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs?action=${actionPrefix}`)
      .set("Authorization", `Bearer ${londonManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.logs).toHaveLength(2);
    expect(
      response.body.data.logs.every(
        (log: any) => log.branchId === londonBranch.id,
      ),
    ).toBe(true);
  });

  it("does not let a Branch Manager override their branch using branchId", async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs?action=${actionPrefix}&branchId=${manchesterBranch.id}`)
      .set("Authorization", `Bearer ${londonManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.logs).toHaveLength(2);
    expect(
      response.body.data.logs.every(
        (log: any) => log.branchId === londonBranch.id,
      ),
    ).toBe(true);
  });

  it("allows HQ to view chain-wide audit history and filter by branch", async () => {
    const [allResponse, branchResponse] = await Promise.all([
      request(app)
        .get(`/api/v1/audit-logs?action=${actionPrefix}`)
        .set("Authorization", `Bearer ${hqToken}`),
      request(app)
        .get(`/api/v1/audit-logs?action=${actionPrefix}&branchId=${manchesterBranch.id}`)
        .set("Authorization", `Bearer ${hqToken}`),
    ]);

    expect(allResponse.status).toBe(200);
    expect(allResponse.body.data.logs).toHaveLength(4);
    expect(branchResponse.status).toBe(200);
    expect(branchResponse.body.data.logs).toHaveLength(1);
    expect(branchResponse.body.data.logs[0].branchId).toBe(manchesterBranch.id);
  });

  it("filters by action, entity type, and date range", async () => {
    const response = await request(app)
      .get(
        `/api/v1/audit-logs?action=${actionPrefix}_USER&entityType=user&startDate=2026-01-10T00:00:00.000Z&endDate=2026-01-11T23:59:59.999Z`,
      )
      .set("Authorization", `Bearer ${hqToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.logs).toHaveLength(2);
    expect(
      response.body.data.logs.every((log: any) => log.entityType === "User"),
    ).toBe(true);
  });

  it("returns paginated results in newest-first order", async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs?action=${actionPrefix}&page=1&limit=2`)
      .set("Authorization", `Bearer ${hqToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.logs).toHaveLength(2);
    expect(response.body.data.pagination).toMatchObject({
      page: 1,
      limit: 2,
      total: 4,
      totalPages: 2,
    });
    expect(new Date(response.body.data.logs[0].createdAt).getTime()).toBeGreaterThan(
      new Date(response.body.data.logs[1].createdAt).getTime(),
    );
  });

  it("rejects invalid pagination, branch IDs, filters, and date ranges", async () => {
    const invalidRequests = [
      "/api/v1/audit-logs?page=0",
      "/api/v1/audit-logs?limit=101",
      "/api/v1/audit-logs?branchId=not-a-uuid",
      "/api/v1/audit-logs?action=",
      "/api/v1/audit-logs?entityType=",
      "/api/v1/audit-logs?startDate=2026-01-12T00:00:00.000Z&endDate=2026-01-10T00:00:00.000Z",
    ];

    const responses = await Promise.all(
      invalidRequests.map((path) =>
        request(app)
          .get(path)
          .set("Authorization", `Bearer ${hqToken}`),
      ),
    );

    responses.forEach((response) => expect(response.status).toBe(400));
  });

  it("allows a Branch Manager to retrieve a record from their own branch", async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs/${auditLogIds[0]}`)
      .set("Authorization", `Bearer ${londonManagerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(auditLogIds[0]);
    expect(response.body.data.branchId).toBe(londonBranch.id);
  });

  it("hides another branch's individual audit record from a Branch Manager", async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs/${auditLogIds[2]}`)
      .set("Authorization", `Bearer ${londonManagerToken}`);

    expect(response.status).toBe(404);
  });

  it("allows HQ to retrieve an individual audit record from any branch", async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs/${auditLogIds[2]}`)
      .set("Authorization", `Bearer ${hqToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(auditLogIds[2]);
    expect(response.body.data.branchId).toBe(manchesterBranch.id);
  });

  it("returns 404 when an audit log does not exist", async () => {
    const response = await request(app)
      .get(`/api/v1/audit-logs/${randomUUID()}`)
      .set("Authorization", `Bearer ${hqToken}`);

    expect(response.status).toBe(404);
  });
});
