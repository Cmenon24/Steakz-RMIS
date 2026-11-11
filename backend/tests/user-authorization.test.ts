// Tests Admin user-role changes and the branch assignment rules.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const testPassword = "SteakzTest!2026";
const adminEmail = "admin@test.steakz.com";
const suffix = randomUUID().slice(0, 8);
const employeeEmail = `role-change-${suffix}@test.steakz.com`;

describe("User role and branch authorization", () => {
  let adminToken = "";
  let hqToken = "";
  let serverToken = "";
  let manchesterServerToken = "";
  let branchManagerToken = "";
  let londonBranchId = "";
  let manchesterBranchId = "";
  let createdUserId = "";
  let mealCategoryId = "";
  let testMealId = "";

  beforeAll(async () => {
    const [adminLogin, hqLogin, serverLogin, manchesterServerLogin, managerLogin, london, manchester] = await Promise.all([
      request(app).post("/api/v1/auth/login").send({ email: adminEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: "hqmanager@test.steakz.com", password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: "server.london@test.steakz.com", password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: "server.manchester@test.steakz.com", password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: "bmanager.london@test.steakz.com", password: testPassword }),
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "LON001" }, select: { id: true } }),
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "MAN001" }, select: { id: true } }),
    ]);

    expect(adminLogin.status).toBe(200);
    expect(hqLogin.status).toBe(200);
    expect(serverLogin.status).toBe(200);
    expect(manchesterServerLogin.status).toBe(200);
    expect(managerLogin.status).toBe(200);
    adminToken = adminLogin.body.data.accessToken;
    hqToken = hqLogin.body.data.accessToken;
    serverToken = serverLogin.body.data.accessToken;
    manchesterServerToken = manchesterServerLogin.body.data.accessToken;
    branchManagerToken = managerLogin.body.data.accessToken;
    londonBranchId = london.id;
    manchesterBranchId = manchester.id;
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } });
    }
    if (testMealId) {
      await prisma.mealSide.deleteMany({ where: { menuItemId: testMealId } });
    }
    const testItemIds = [testMealId].filter(Boolean);
    if (testItemIds.length) {
      await prisma.branchMenuAvailability.deleteMany({ where: { menuItemId: { in: testItemIds } } });
      await prisma.menuItem.deleteMany({ where: { id: { in: testItemIds } } });
    }
    if (mealCategoryId) await prisma.menuCategory.delete({ where: { id: mealCategoryId } });
    await prisma.$disconnect();
  });

  it("allows Admin to change any role and enforces the matching branch assignment", async () => {
    const created = await request(app)
      .post("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Role",
        lastName: "Change",
        email: employeeEmail,
        password: testPassword,
        role: "SERVER",
        branchId: londonBranchId,
      });

    expect(created.status).toBe(201);
    createdUserId = created.body.data.id;

    // Branch employee can be promoted to a central role; the branch is cleared.
    const promoted = await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "HEADQUARTERS_MANAGER" });
    expect(promoted.status).toBe(200);
    expect(promoted.body.data.role).toBe("HEADQUARTERS_MANAGER");
    expect(promoted.body.data.branchId).toBeNull();

    // Moving from a central role to a branch role requires an active branch assignment.
    const missingBranch = await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "BRANCH_MANAGER" });
    expect(missingBranch.status).toBe(400);

    const assigned = await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "BRANCH_MANAGER", branchId: manchesterBranchId });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.role).toBe("BRANCH_MANAGER");
    expect(assigned.body.data.branchId).toBe(manchesterBranchId);

    // Changing between branch roles preserves the current assignment.
    const changedToCook = await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "COOK" });
    expect(changedToCook.status).toBe(200);
    expect(changedToCook.body.data.role).toBe("COOK");
    expect(changedToCook.body.data.branchId).toBe(manchesterBranchId);

    // A branch-to-branch move must use the dedicated transfer endpoint.
    const bypassTransfer = await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ branchId: londonBranchId });
    expect(bypassTransfer.status).toBe(400);

    // Converting the user to Admin clears the branch assignment again.
    const changedToAdmin = await request(app)
      .patch(`/api/v1/users/${createdUserId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "ADMIN" });
    expect(changedToAdmin.status).toBe(200);
    expect(changedToAdmin.body.data.role).toBe("ADMIN");
    expect(changedToAdmin.body.data.branchId).toBeNull();
  });

  it("enforces role restrictions on branch, menu, and table administration", async () => {
    // Admin cannot access operational menu or recipe information.
    const adminMenuList = await request(app)
      .get("/api/v1/menu/items")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminMenuList.status).toBe(403);

    const adminRecipeList = await request(app)
      .get("/api/v1/recipes")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminRecipeList.status).toBe(403);
    
    const serverBranchList = await request(app)
      .get("/api/v1/branches")
      .set("Authorization", `Bearer ${serverToken}`);
    expect(serverBranchList.status).toBe(403);

    const hqBranchList = await request(app)
      .get("/api/v1/branches")
      .set("Authorization", `Bearer ${hqToken}`);
    expect(hqBranchList.status).toBe(200);

    const managerMenuWrite = await request(app)
      .post("/api/v1/menu/items")
      .set("Authorization", `Bearer ${branchManagerToken}`)
      .send({});
    expect(managerMenuWrite.status).toBe(403);

    const serverAllTables = await request(app)
      .get("/api/v1/tables")
      .set("Authorization", `Bearer ${serverToken}`);
    expect(serverAllTables.status).toBe(403);

    // Supplying another branch ID cannot expand a Server's table access.
    const scopedTables = await request(app)
      .get(`/api/v1/tables/branches/${manchesterBranchId}`)
      .set("Authorization", `Bearer ${serverToken}`);
    expect(scopedTables.status).toBe(200);
    expect(scopedTables.body.data.branch.id).toBe(londonBranchId);
    expect(scopedTables.body.data.tables.every((table: any) => table.branchId === londonBranchId)).toBe(true);
  });

  it("returns the same fixed meal side names to authorized branches", async () => {
    const mealCategory = await prisma.menuCategory.create({
      data: { name: `Role Test Meals ${suffix}` },
      select: { id: true },
    });
    mealCategoryId = mealCategory.id;

    const meal = await prisma.menuItem.create({
      data: { categoryId: mealCategoryId, name: `Role Test Meal ${suffix}`, price: 20 },
      select: { id: true },
    });
    testMealId = meal.id;

    await prisma.mealSide.createMany({
      data: [
        { menuItemId: testMealId, sideName: `Mashed Potatoes ${suffix}`, position: 1 },
        { menuItemId: testMealId, sideName: `Seasonal Vegetables ${suffix}`, position: 2 },
      ],
    });

    await prisma.branchMenuAvailability.createMany({
      data: [
        { branchId: londonBranchId, menuItemId: testMealId },
        { branchId: manchesterBranchId, menuItemId: testMealId },
      ],
    });

    const [londonResponse, manchesterResponse] = await Promise.all([
      request(app)
        .get(`/api/v1/menu/items/${testMealId}/sides`)
        .set("Authorization", `Bearer ${serverToken}`),
      request(app)
        .get(`/api/v1/menu/items/${testMealId}/sides`)
        .set("Authorization", `Bearer ${manchesterServerToken}`),
    ]);

    expect(londonResponse.status).toBe(200);
    expect(manchesterResponse.status).toBe(200);
    expect(londonResponse.body.data.sides.map((side: any) => side.sideName))
      .toEqual([`Mashed Potatoes ${suffix}`, `Seasonal Vegetables ${suffix}`]);
    expect(manchesterResponse.body.data.sides).toEqual(londonResponse.body.data.sides);
  });
});
