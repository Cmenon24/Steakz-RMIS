import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { buildPromotionPerformance } from "../src/services/report.service.js";

const TEST_PASSWORD = "SteakzTest!2026";

type Session = { token: string; branchId: string };

async function login(email: string): Promise<Session> {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: TEST_PASSWORD });

  expect(response.status).toBe(200);
  return {
    token: response.body.data.accessToken,
    branchId: response.body.data.user.branchId,
  };
}

describe("Reports API", () => {
  let server: Session;
  let branchManager: Session;
  let headquartersManager: Session;
  let londonBranchId: string;
  let manchesterBranchId: string;

  beforeAll(async () => {
    const [london, manchester] = await Promise.all([
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "LON001" } }),
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "MAN001" } }),
    ]);

    londonBranchId = london.id;
    manchesterBranchId = manchester.id;

    [server, branchManager, headquartersManager] = await Promise.all([
      login("server.london@test.steakz.com"),
      login("bmanager.london@test.steakz.com"),
      login("hqmanager@test.steakz.com"),
    ]);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("promotion performance aggregation", () => {
    it("keeps promotions with the same name separate by ID and counts each once per order", () => {
      const report = buildPromotionPerformance([
        {
          items: [
            {
              promotionId: "promotion-a",
              promotionNameSnapshot: "Weekend Special",
              promotionDiscountAmount: 5,
              lineSubtotal: 50,
            },
            {
              promotionId: "promotion-a",
              promotionNameSnapshot: "Weekend Special",
              promotionDiscountAmount: 2,
              lineSubtotal: 20,
            },
            {
              promotionId: "promotion-b",
              promotionNameSnapshot: "Weekend Special",
              promotionDiscountAmount: 3,
              lineSubtotal: 30,
            },
          ],
        },
        {
          items: [
            {
              promotionId: "promotion-a",
              promotionNameSnapshot: "Weekend Special",
              promotionDiscountAmount: 4,
              lineSubtotal: 40,
            },
          ],
        },
      ]);

      expect(report).toEqual([
        {
          promotionId: "promotion-a",
          promotion: "Weekend Special",
          ordersUsingPromotion: 2,
          discountTotal: 11,
          grossSales: 110,
        },
        {
          promotionId: "promotion-b",
          promotion: "Weekend Special",
          ordersUsingPromotion: 1,
          discountTotal: 3,
          grossSales: 30,
        },
      ]);
    });

    it("continues reporting legacy promotion snapshots without a promotion ID", () => {
      const report = buildPromotionPerformance([
        {
          items: [
            {
              promotionId: null,
              promotionNameSnapshot: "Legacy Promotion",
              promotionDiscountAmount: 2.5,
              lineSubtotal: 25,
            },
          ],
        },
      ]);

      expect(report).toEqual([
        {
          promotionId: null,
          promotion: "Legacy Promotion",
          ordersUsingPromotion: 1,
          discountTotal: 2.5,
          grossSales: 25,
        },
      ]);
    });
  });

  describe("authentication and role access", () => {
    it("requires authentication for sales reports", async () => {
      const response = await request(app).get("/api/v1/reports/sales");
      expect(response.status).toBe(401);
    });

    it("requires authentication for inventory reports", async () => {
      const response = await request(app).get("/api/v1/reports/inventory");
      expect(response.status).toBe(401);
    });

    it("requires authentication for inventory history", async () => {
      const response = await request(app).get("/api/v1/reports/inventory/history");
      expect(response.status).toBe(401);
    });

    it("denies operational Server access to reports", async () => {
      const response = await request(app)
        .get("/api/v1/reports/sales")
        .set("Authorization", `Bearer ${server.token}`);
      expect(response.status).toBe(403);
    });
  });

  describe("sales report", () => {
    it("returns the default period for a Branch Manager's assigned branch only", async () => {
      const response = await request(app)
        .get("/api/v1/reports/sales")
        .set("Authorization", `Bearer ${branchManager.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.scope).toBe("BRANCH");
      expect(response.body.data.branches).toHaveLength(1);
      expect(response.body.data.branches[0].branch.id).toBe(londonBranchId);
      expect(response.body.data.summary).toEqual(expect.objectContaining({
        grossSales: expect.any(Number),
        discounts: expect.any(Number),
        refunds: expect.any(Number),
        netSales: expect.any(Number),
        completedOrderCount: expect.any(Number),
        averageOrderValue: expect.any(Number),
      }));
    });

    it("prevents a Branch Manager from requesting another branch", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/sales?branchId=${manchesterBranchId}`)
        .set("Authorization", `Bearer ${branchManager.token}`);

      expect(response.status).toBe(403);
    });

    it("returns chain-wide results to Headquarters Manager", async () => {
      const response = await request(app)
        .get("/api/v1/reports/sales")
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.scope).toBe("ALL_BRANCHES");
      expect(response.body.data.branches.length).toBeGreaterThanOrEqual(2);
    });

    it("allows Headquarters Manager to filter to one branch", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/sales?branchId=${londonBranchId}`)
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.scope).toBe("BRANCH");
      expect(response.body.data.branches).toHaveLength(1);
      expect(response.body.data.branches[0].branch.id).toBe(londonBranchId);
    });

    it("rejects an unsupported reporting period", async () => {
      const response = await request(app)
        .get("/api/v1/reports/sales?period=quarter")
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(400);
    });

    it("requires both dates for a custom sales report", async () => {
      const response = await request(app)
        .get("/api/v1/reports/sales?period=custom&startDate=2020-01-01")
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(400);
    });

    it("rejects malformed custom dates", async () => {
      const response = await request(app)
        .get("/api/v1/reports/sales?period=custom&startDate=01-01-2020&endDate=2020-01-02")
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(400);
    });

    it("rejects impossible calendar dates", async () => {
      const response = await request(app)
        .get("/api/v1/reports/sales?period=custom&startDate=2020-02-30&endDate=2020-03-01")
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(400);
    });

    it("rejects a custom end date before the start date", async () => {
      const response = await request(app)
        .get("/api/v1/reports/sales?period=custom&startDate=2020-03-02&endDate=2020-03-01")
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(400);
    });
  });

  describe("inventory report", () => {
    it("returns current stock and alert summaries for a Branch Manager's branch", async () => {
      const response = await request(app)
        .get("/api/v1/reports/inventory")
        .set("Authorization", `Bearer ${branchManager.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.branches).toHaveLength(1);
      expect(response.body.data.branches[0].branch.id).toBe(londonBranchId);
      expect(response.body.data.branches[0].summary).toEqual(expect.objectContaining({
        ingredientCount: expect.any(Number),
        lowStockCount: expect.any(Number),
        outOfStockCount: expect.any(Number),
        unresolvedAlertCount: expect.any(Number),
      }));
      expect(response.body.data.branches[0].inventory).toEqual(expect.any(Array));
    });

    it("prevents a Branch Manager from requesting another branch's inventory", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/inventory?branchId=${manchesterBranchId}`)
        .set("Authorization", `Bearer ${branchManager.token}`);

      expect(response.status).toBe(403);
    });

    it("allows Headquarters Manager to filter inventory to one branch", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/inventory?branchId=${manchesterBranchId}`)
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.branches).toHaveLength(1);
      expect(response.body.data.branches[0].branch.id).toBe(manchesterBranchId);
    });
  });

  describe("inventory history report", () => {
    it("returns branch-scoped inventory movement history", async () => {
      const response = await request(app)
        .get("/api/v1/reports/inventory/history")
        .set("Authorization", `Bearer ${branchManager.token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.branches).toHaveLength(1);
      expect(response.body.data.branches[0].branch.id).toBe(londonBranchId);
      expect(response.body.data.branches[0].count).toBeGreaterThanOrEqual(0);
      expect(response.body.data.branches[0].transactions).toEqual(expect.any(Array));
    });

    it("requires startDate and endDate together", async () => {
      const response = await request(app)
        .get("/api/v1/reports/inventory/history?startDate=2020-01-01")
        .set("Authorization", `Bearer ${branchManager.token}`);

      expect(response.status).toBe(400);
    });

    it("rejects invalid history date ranges", async () => {
      const response = await request(app)
        .get("/api/v1/reports/inventory/history?startDate=2020-02-30&endDate=2020-03-01")
        .set("Authorization", `Bearer ${branchManager.token}`);

      expect(response.status).toBe(400);
    });

    it("prevents a Branch Manager from requesting another branch's history", async () => {
      // London manager requests Manchester history to verify branch isolation.
      const response = await request(app)
        .get(`/api/v1/reports/inventory/history?branchId=${manchesterBranchId}`)
        .set("Authorization", `Bearer ${branchManager.token}`);

      expect(response.status).toBe(403);
    });

    it("allows Headquarters Manager to view a selected branch's history", async () => {
      const response = await request(app)
        .get(`/api/v1/reports/inventory/history?branchId=${manchesterBranchId}`)
        .set("Authorization", `Bearer ${headquartersManager.token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.branches).toHaveLength(1);
      expect(response.body.data.branches[0].branch.id).toBe(manchesterBranchId);
    });
  });
});
