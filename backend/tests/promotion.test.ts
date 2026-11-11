// Tests HQ promotion management, branch visibility, validation, and audit records.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const testPassword = "SteakzTest!2026";
const hqEmail = "hqmanager@test.steakz.com";
const londonManagerEmail = "bmanager.london@test.steakz.com";
const manchesterManagerEmail = "bmanager.manchester@test.steakz.com";
const serverEmail = "server.london@test.steakz.com";

describe("Promotion Management API", () => {
  const suffix = randomUUID().slice(0, 8);
  const createdPromotionIds: string[] = [];

  let londonBranch: any;
  let manchesterBranch: any;
  let hqToken = "";
  let londonManagerToken = "";
  let manchesterManagerToken = "";
  let serverToken = "";
  let category: any;
  let menuItem: any;

  // Fixed winter dates use the +00:00 offset for the current Europe/London branches.
  const startDate = "2030-01-15T12:00:00Z";
  const endDate = "2030-01-20T12:00:00Z";

  beforeAll(async () => {
    [londonBranch, manchesterBranch] = await Promise.all([
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "LON001" } }),
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "MAN001" } }),
    ]);

    const [hqLogin, londonLogin, manchesterLogin, serverLogin] = await Promise.all([
      request(app).post("/api/v1/auth/login").send({ email: hqEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: londonManagerEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: manchesterManagerEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: serverEmail, password: testPassword }),
    ]);

    expect(hqLogin.status).toBe(200);
    expect(londonLogin.status).toBe(200);
    expect(manchesterLogin.status).toBe(200);
    expect(serverLogin.status).toBe(200);

    hqToken = hqLogin.body.data.accessToken;
    londonManagerToken = londonLogin.body.data.accessToken;
    manchesterManagerToken = manchesterLogin.body.data.accessToken;
    serverToken = serverLogin.body.data.accessToken;

    // Use isolated menu records so these tests do not alter shared menu data.
    category = await prisma.menuCategory.create({
      data: { name: `Promotion Test Category ${suffix}`, description: "Automated promotion API tests" },
    });
    menuItem = await prisma.menuItem.create({
      data: {
        categoryId: category.id,
        name: `Promotion Test Item ${suffix}`,
        price: 25,
      },
    });
  });

  // Remove only promotions and menu records created by this test suite.
  afterAll(async () => {
    if (createdPromotionIds.length) {
      await prisma.auditLog.deleteMany({
        where: { entityType: "Promotion", entityId: { in: createdPromotionIds } },
      });
      await prisma.promotionBranch.deleteMany({
        where: { promotionId: { in: createdPromotionIds } },
      });
      await prisma.promotionItem.deleteMany({
        where: { promotionId: { in: createdPromotionIds } },
      });
      await prisma.promotion.deleteMany({
        where: { id: { in: createdPromotionIds } },
      });
    }

    if (menuItem?.id) {
      await prisma.menuItem.delete({ where: { id: menuItem.id } });
    }
    if (category?.id) {
      await prisma.menuCategory.delete({ where: { id: category.id } });
    }

    await prisma.$disconnect();
  });

  // Build a valid scheduled promotion payload for the test branches and menu item.
  function promotionPayload(overrides: Record<string, unknown> = {}) {
    return {
      name: `Promotion API Test ${suffix}`,
      description: "Created by automated API tests",
      discountType: "PERCENTAGE",
      discountValue: 10,
      startDate,
      endDate,
      branchIds: [londonBranch.id],
      menuItemIds: [menuItem.id],
      ...overrides,
    };
  }

  // Create a promotion through the API and track it for isolated cleanup.
  async function createPromotion(overrides: Record<string, unknown> = {}) {
    const response = await request(app)
      .post("/api/v1/promotions")
      .set("Authorization", `Bearer ${hqToken}`)
      .send(promotionPayload(overrides));

    if (response.status === 201 && response.body.data?.id) {
      createdPromotionIds.push(response.body.data.id);
    }
    return response;
  }

  it("requires authentication for promotion endpoints", async () => {
    const response = await request(app).get("/api/v1/promotions");
    expect(response.status).toBe(401);
  });

  it("allows HQ to create a scheduled promotion with branch and item eligibility", async () => {
    const response = await createPromotion();

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("SCHEDULED");
    expect(response.body.data.name).toBe(`Promotion API Test ${suffix}`);
    expect(response.body.data.branches).toHaveLength(1);
    expect(response.body.data.branches[0].branchId).toBe(londonBranch.id);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].menuItemId).toBe(menuItem.id);

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "Promotion",
        entityId: response.body.data.id,
        action: "PROMOTION_CREATED",
      },
    });
    expect(audit).toBeTruthy();
  });

  it("allows HQ to list all promotions and filter by branch", async () => {
    const londonPromotion = await createPromotion();
    expect(londonPromotion.status).toBe(201);

    const manchesterPromotion = await createPromotion({
      name: `Manchester Promotion ${suffix}`,
      branchIds: [manchesterBranch.id],
    });
    expect(manchesterPromotion.status).toBe(201);

    const all = await request(app)
      .get("/api/v1/promotions")
      .set("Authorization", `Bearer ${hqToken}`);
    expect(all.status).toBe(200);
    expect(all.body.data.some((item: any) => item.id === londonPromotion.body.data.id)).toBe(true);
    expect(all.body.data.some((item: any) => item.id === manchesterPromotion.body.data.id)).toBe(true);

    const filtered = await request(app)
      .get(`/api/v1/promotions?branchId=${londonBranch.id}`)
      .set("Authorization", `Bearer ${hqToken}`);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.some((item: any) => item.id === londonPromotion.body.data.id)).toBe(true);
    expect(filtered.body.data.some((item: any) => item.id === manchesterPromotion.body.data.id)).toBe(false);
  });

  it("restricts Branch Managers to promotions assigned to their own branch", async () => {
    const londonPromotion = await createPromotion();
    expect(londonPromotion.status).toBe(201);

    const manchesterPromotion = await createPromotion({
      name: `Manchester Scoped Promotion ${suffix}`,
      branchIds: [manchesterBranch.id],
    });
    expect(manchesterPromotion.status).toBe(201);

    const londonList = await request(app)
      .get("/api/v1/promotions")
      .set("Authorization", `Bearer ${londonManagerToken}`);
    expect(londonList.status).toBe(200);
    expect(londonList.body.data.some((item: any) => item.id === londonPromotion.body.data.id)).toBe(true);
    expect(londonList.body.data.some((item: any) => item.id === manchesterPromotion.body.data.id)).toBe(false);

    const crossBranchDetail = await request(app)
      .get(`/api/v1/promotions/${manchesterPromotion.body.data.id}`)
      .set("Authorization", `Bearer ${londonManagerToken}`);
    expect(crossBranchDetail.status).toBe(404);
  });

  it("allows HQ and the assigned Branch Manager to retrieve promotion details", async () => {
    const created = await createPromotion();
    expect(created.status).toBe(201);
    const promotionId = created.body.data.id;

    const [hqDetail, branchDetail] = await Promise.all([
      request(app)
        .get(`/api/v1/promotions/${promotionId}`)
        .set("Authorization", `Bearer ${hqToken}`),
      request(app)
        .get(`/api/v1/promotions/${promotionId}`)
        .set("Authorization", `Bearer ${londonManagerToken}`),
    ]);

    expect(hqDetail.status).toBe(200);
    expect(branchDetail.status).toBe(200);
    expect(hqDetail.body.data.id).toBe(promotionId);
    expect(branchDetail.body.data.id).toBe(promotionId);
  });

  it("does not allow Branch Managers or Servers to create promotions", async () => {
    const payload = promotionPayload();

    const [managerResponse, serverResponse] = await Promise.all([
      request(app)
        .post("/api/v1/promotions")
        .set("Authorization", `Bearer ${londonManagerToken}`)
        .send(payload),
      request(app)
        .post("/api/v1/promotions")
        .set("Authorization", `Bearer ${serverToken}`)
        .send(payload),
    ]);

    expect(managerResponse.status).toBe(403);
    expect(serverResponse.status).toBe(403);
  });

  it("rejects percentage discounts above 50 percent", async () => {
    const response = await createPromotion({ discountValue: 51 });
    expect(response.status).toBe(400);
  });

  it("rejects duplicate branch IDs and duplicate menu item IDs", async () => {
    const duplicateBranches = await createPromotion({
      branchIds: [londonBranch.id, londonBranch.id],
    });
    expect(duplicateBranches.status).toBe(400);

    const duplicateItems = await createPromotion({
      menuItemIds: [menuItem.id, menuItem.id],
    });
    expect(duplicateItems.status).toBe(400);
  });

  it("rejects invalid date ranges and branch timezone offsets", async () => {
    const invalidRange = await createPromotion({
      startDate: endDate,
      endDate: startDate,
    });
    expect(invalidRange.status).toBe(400);

    // London uses UTC+00:00 in January, so +01:00 is not its local offset.
    const invalidOffset = await createPromotion({
      startDate: "2030-01-15T12:00:00+01:00",
      endDate: "2030-01-20T12:00:00+01:00",
    });
    expect(invalidOffset.status).toBe(400);
  });

  it("rejects a fixed discount greater than an eligible item's price", async () => {
    const response = await createPromotion({
      discountType: "FIXED_AMOUNT",
      discountValue: 26,
    });
    expect(response.status).toBe(400);
  });

  it("rejects inactive or unknown branch and menu item selections", async () => {
    const invalidBranch = await createPromotion({ branchIds: [randomUUID()] });
    expect(invalidBranch.status).toBe(400);

    const invalidMenuItem = await createPromotion({ menuItemIds: [randomUUID()] });
    expect(invalidMenuItem.status).toBe(400);
  });

  it("allows HQ to update a scheduled unused promotion and replace its eligibility", async () => {
    const created = await createPromotion();
    expect(created.status).toBe(201);
    const promotionId = created.body.data.id;

    const updated = await request(app)
      .patch(`/api/v1/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${hqToken}`)
      .send(promotionPayload({
        name: `Updated Promotion ${suffix}`,
        description: "Updated before the promotion starts",
        discountValue: 15,
        branchIds: [londonBranch.id, manchesterBranch.id],
      }));

    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe(`Updated Promotion ${suffix}`);
    expect(Number(updated.body.data.discountValue)).toBe(15);
    expect(updated.body.data.branches).toHaveLength(2);

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "Promotion",
        entityId: promotionId,
        action: "PROMOTION_UPDATED",
      },
    });
    expect(audit).toBeTruthy();
  });

  it("does not allow a Branch Manager to update or deactivate a promotion", async () => {
    const created = await createPromotion();
    expect(created.status).toBe(201);
    const promotionId = created.body.data.id;

    const [updateResponse, deactivateResponse] = await Promise.all([
      request(app)
        .patch(`/api/v1/promotions/${promotionId}`)
        .set("Authorization", `Bearer ${londonManagerToken}`)
        .send(promotionPayload()),
      request(app)
        .patch(`/api/v1/promotions/${promotionId}/deactivate`)
        .set("Authorization", `Bearer ${londonManagerToken}`),
    ]);

    expect(updateResponse.status).toBe(403);
    expect(deactivateResponse.status).toBe(403);
  });

  it("prevents edits after a promotion has started", async () => {
    const created = await createPromotion({
      name: `Started Promotion ${suffix}`,
      startDate: "2020-01-15T12:00:00Z",
      endDate: "2030-01-20T12:00:00Z",
    });
    expect(created.status).toBe(201);

    const update = await request(app)
      .patch(`/api/v1/promotions/${created.body.data.id}`)
      .set("Authorization", `Bearer ${hqToken}`)
      .send(promotionPayload({ name: `Attempted Edit ${suffix}` }));

    expect(update.status).toBe(409);
  });

  it("allows HQ to deactivate a promotion and retains its eligibility records", async () => {
    const created = await createPromotion();
    expect(created.status).toBe(201);
    const promotionId = created.body.data.id;

    const deactivated = await request(app)
      .patch(`/api/v1/promotions/${promotionId}/deactivate`)
      .set("Authorization", `Bearer ${hqToken}`);

    expect(deactivated.status).toBe(200);
    expect(deactivated.body.data.isActive).toBe(false);
    expect(deactivated.body.data.status).toBe("INACTIVE");
    expect(deactivated.body.data.branches).toHaveLength(1);
    expect(deactivated.body.data.items).toHaveLength(1);

    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "Promotion",
        entityId: promotionId,
        action: "PROMOTION_DEACTIVATED",
      },
    });
    expect(audit).toBeTruthy();

    const duplicateDeactivation = await request(app)
      .patch(`/api/v1/promotions/${promotionId}/deactivate`)
      .set("Authorization", `Bearer ${hqToken}`);
    expect(duplicateDeactivation.status).toBe(409);
  });
});
