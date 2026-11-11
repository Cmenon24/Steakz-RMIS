// Tests order creation, fixed sides, stock deduction, and branch restrictions.
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const testPassword = "SteakzTest!2026";
const serverEmail = "server.london@test.steakz.com";
const hqEmail = "hqmanager@test.steakz.com";
const cookEmail = "cook.london@test.steakz.com";
const manchesterManagerEmail = "bmanager.manchester@test.steakz.com";
const manchesterServerEmail = "server.manchester@test.steakz.com";
const londonManagerEmail = "bmanager.london@test.steakz.com";

describe("Orders API", () => {
  const suffix = randomUUID().slice(0, 8);
  let londonBranch: any;
  let manchesterBranch: any;
  let server: any;
  let hqManager: any;
  let cook: any;
  let manchesterManager: any;
  let cookToken = "";
  let manchesterManagerToken = "";
  let manchesterServerToken = "";
  let londonManagerToken = "";
  let serverToken = "";
  let hqToken = "";
  let mealCategory: any;
  let createdMealCategory = false;
  let meal: any;
  let ingredient: any;
  let tableOne: any;
  let tableTwo: any;
  let manchesterTable: any;
  let tableThree: any;
  let tableFour: any;
  let tableFive: any;
  let tableSix: any;
  let tableSeven: any;
  let tableEight: any;
  let tableNine: any;
  let tableTen: any;
  let tableEleven: any;
  let tableTwelve: any;
  let tableThirteen: any;
  const orderIds: string[] = [];
  const paymentIds: string[] = [];
  const refundIds: string[] = [];
  const promotionIds: string[] = [];

  // Create only the menu and stock records needed by these tests.
  beforeAll(async () => {
    [londonBranch, manchesterBranch, server, hqManager, cook, manchesterManager] = await Promise.all([
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "LON001" } }),
      prisma.branch.findUniqueOrThrow({ where: { branchCode: "MAN001" } }),
      prisma.user.findUniqueOrThrow({ where: { email: serverEmail } }),
      prisma.user.findUniqueOrThrow({ where: { email: hqEmail } }),
      prisma.user.findUniqueOrThrow({ where: { email: cookEmail } }),
      prisma.user.findUniqueOrThrow({ where: { email: manchesterManagerEmail } }),
    ]);

    const [serverLogin, hqLogin, cookLogin, manchesterManagerLogin, manchesterServerLogin, londonManagerLogin] = await Promise.all([
      request(app).post("/api/v1/auth/login").send({ email: serverEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: hqEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: cookEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: manchesterManagerEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: manchesterServerEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: londonManagerEmail, password: testPassword }),
    ]);
    expect(serverLogin.status).toBe(200);
    expect(hqLogin.status).toBe(200);
    expect(cookLogin.status).toBe(200);
    expect(manchesterManagerLogin.status).toBe(200);
    expect(manchesterServerLogin.status).toBe(200);
    expect(londonManagerLogin.status).toBe(200);
    serverToken = serverLogin.body.data.accessToken;
    hqToken = hqLogin.body.data.accessToken;
    cookToken = cookLogin.body.data.accessToken;
    manchesterManagerToken = manchesterManagerLogin.body.data.accessToken;
    manchesterServerToken = manchesterServerLogin.body.data.accessToken;
    londonManagerToken = londonManagerLogin.body.data.accessToken;

    // Reuse active global categories when a previous test run already created them.
    mealCategory = await prisma.menuCategory.findFirst({
      where: { name: "Steak Meals", isActive: true },
    });
    if (!mealCategory) {
      mealCategory = await prisma.menuCategory.create({
        data: { name: "Steak Meals", description: `Automated order test ${suffix}` },
      });
      createdMealCategory = true;
    }

    meal = await prisma.menuItem.create({
      data: { categoryId: mealCategory.id, name: `Test Steak ${suffix}`, price: 25 },
    });

    await prisma.mealSide.createMany({
      data: [
        { menuItemId: meal.id, sideName: `Test Fries ${suffix}`, position: 1 },
        { menuItemId: meal.id, sideName: `Test Salad ${suffix}`, position: 2 },
      ],
    });

    ingredient = await prisma.ingredient.create({
      data: { name: `Order Test Ingredient ${suffix}`, unit: "KG" },
    });

    const recipe = await prisma.recipe.create({ data: { menuItemId: meal.id } });
    const recipeVersion = await prisma.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        versionNumber: 1,
        status: "PUBLISHED",
        createdByUserId: hqManager.id,
        publishedAt: new Date(),
      },
    });

    await prisma.recipeIngredient.create({
      data: {
        recipeVersionId: recipeVersion.id,
        ingredientId: ingredient.id,
        quantity: 0.5,
        unit: "KG",
      },
    });

    await Promise.all([
      prisma.branchMenuAvailability.create({ data: { branchId: londonBranch.id, menuItemId: meal.id } }),
      prisma.branchInventory.create({
        data: { branchId: londonBranch.id, ingredientId: ingredient.id, quantityOnHand: 10, minimumStockLevel: 1 },
      }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-1`, capacity: 4 },
      }).then((value) => { tableOne = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-2`, capacity: 4 },
      }).then((value) => { tableTwo = value; }),
      prisma.restaurantTable.create({
        data: { branchId: manchesterBranch.id, tableNumber: `OT-${suffix}-3`, capacity: 4 },
      }).then((value) => { manchesterTable = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-4`, capacity: 4 },
      }).then((value) => { tableThree = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-5`, capacity: 4 },
      }).then((value) => { tableFour = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-6`, capacity: 4 },
      }).then((value) => { tableFive = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-7`, capacity: 4 },
      }).then((value) => { tableSix = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-8`, capacity: 4 },
      }).then((value) => { tableSeven = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-9`, capacity: 4 },
      }).then((value) => { tableEight = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-10`, capacity: 4 },
      }).then((value) => { tableNine = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-11`, capacity: 4 },
      }).then((value) => { tableTen = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-12`, capacity: 4 },
      }).then((value) => { tableEleven = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-13`, capacity: 4 },
      }).then((value) => { tableTwelve = value; }),
      prisma.restaurantTable.create({
        data: { branchId: londonBranch.id, tableNumber: `OT-${suffix}-14`, capacity: 4 },
      }).then((value) => { tableThirteen = value; }),
    ]);
  });

    // Deactivate test promotions after each test to prevent cross-test interference.
  afterEach(async () => {
    if (promotionIds.length) {
      await prisma.promotion.updateMany({
        where: { id: { in: promotionIds } },
        data: { isActive: false },
      });
    }
  });

  // Remove only orders connected to this suite's unique test menu item and tables.
  afterAll(async () => {
    if (meal?.id) {
      const mealSides = await prisma.mealSide.findMany({
        where: { menuItemId: meal.id },
        select: { id: true },
      });
      const mealSideIds = mealSides.map((side) => side.id);
      const relatedItems = await prisma.orderItem.findMany({
        where: {
          OR: [
            { menuItemId: meal.id },
            ...(mealSideIds.length ? [{ sides: { some: { sourceMealSideId: { in: mealSideIds } } } }] : []),
          ],
        },
        select: { id: true, orderId: true },
      });
      const cleanupOrderIds = [...new Set([
        ...orderIds,
        ...relatedItems.map((item) => item.orderId),
      ])];

      // Include every line belonging to affected test orders before removing child records.
      const allOrderItems = cleanupOrderIds.length
        ? await prisma.orderItem.findMany({
            where: { orderId: { in: cleanupOrderIds } },
            select: { id: true },
          })
        : [];
      const cleanupItemIds = [...new Set([
        ...relatedItems.map((item) => item.id),
        ...allOrderItems.map((item) => item.id),
      ])];

      if (cleanupItemIds.length) {
        await prisma.orderItemSide.deleteMany({ where: { orderItemId: { in: cleanupItemIds } } });
      }
      if (mealSideIds.length) {
        // Also remove any orphaned test-side references left by an interrupted earlier run.
        await prisma.orderItemSide.deleteMany({ where: { sourceMealSideId: { in: mealSideIds } } });
      }
      const auditEntityIds = [...paymentIds, ...refundIds];
      if (auditEntityIds.length) {
        await prisma.auditLog.deleteMany({
          where: { entityType: { in: ["Payment", "Refund"] }, entityId: { in: auditEntityIds } },
        });
      }
      if (cleanupOrderIds.length) {
        await prisma.auditLog.deleteMany({ where: { entityType: "Order", entityId: { in: cleanupOrderIds } } });
        const orderNumbers = await prisma.order.findMany({ where: { id: { in: cleanupOrderIds } }, select: { orderNumber: true } });
        for (const order of orderNumbers) {
          await prisma.notification.deleteMany({ where: { branchId: londonBranch.id, type: "NEW_ORDER", message: { contains: order.orderNumber } } });
        }
        await prisma.refund.deleteMany({ where: { payment: { orderId: { in: cleanupOrderIds } } } });
        await prisma.orderPromotion.deleteMany({ where: { orderId: { in: cleanupOrderIds } } });
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: cleanupOrderIds } } });
        await prisma.inventoryTransaction.deleteMany({ where: { orderId: { in: cleanupOrderIds } } });
        await prisma.payment.deleteMany({ where: { orderId: { in: cleanupOrderIds } } });
        await prisma.orderItem.deleteMany({ where: { orderId: { in: cleanupOrderIds } } });
        await prisma.order.deleteMany({ where: { id: { in: cleanupOrderIds } } });
      }
    }

    // Remove only promotions created by this test suite after their order snapshots are deleted.
    if (promotionIds.length) {
      await prisma.promotionBranch.deleteMany({ where: { promotionId: { in: promotionIds } } });
      await prisma.promotionItem.deleteMany({ where: { promotionId: { in: promotionIds } } });
      await prisma.promotion.deleteMany({ where: { id: { in: promotionIds } } });
    }

    if (ingredient?.id) {
      await prisma.inventoryAlert.deleteMany({ where: { ingredientId: ingredient.id } });
      await prisma.branchInventory.deleteMany({ where: { ingredientId: ingredient.id } });
    }
    if (meal?.id) {
      await prisma.branchMenuAvailability.deleteMany({ where: { menuItemId: meal.id } });
      await prisma.mealSide.deleteMany({ where: { menuItemId: meal.id } });
      const recipe = await prisma.recipe.findUnique({ where: { menuItemId: meal.id } });
      if (recipe) {
        const versions = await prisma.recipeVersion.findMany({ where: { recipeId: recipe.id }, select: { id: true } });
        if (versions.length) {
          await prisma.recipeIngredient.deleteMany({ where: { recipeVersionId: { in: versions.map((version) => version.id) } } });
          await prisma.recipeVersion.deleteMany({ where: { id: { in: versions.map((version) => version.id) } } });
        }
        await prisma.recipe.delete({ where: { id: recipe.id } });
      }
      await prisma.menuItem.delete({ where: { id: meal.id } });
    }
    // Delete only categories created by this run; shared categories may contain other data.
    if (createdMealCategory && mealCategory?.id) {
      await prisma.menuCategory.delete({ where: { id: mealCategory.id } });
    }
    if (ingredient?.id) await prisma.ingredient.delete({ where: { id: ingredient.id } });

    for (const table of [tableOne, tableTwo, manchesterTable, tableThree, tableFour, tableFive, tableSix, tableSeven, tableEight, tableNine, tableTen, tableEleven, tableTwelve, tableThirteen]) {
      if (table?.id) await prisma.restaurantTable.delete({ where: { id: table.id } });
    }

    await prisma.$disconnect();
  });

  // Submit a basic order using the authenticated Server account.
  async function submitOrder(tableId: string, token = serverToken) {
    return request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ tableId, items: [{ menuItemId: meal.id, quantity: 1 }] });
  }


  // Create an active promotion scoped to selected branches and menu items.
  async function createTestPromotion(input: {
    name: string;
    discountType: "PERCENTAGE" | "FIXED_AMOUNT";
    discountValue: number;
    branchId?: string;
    menuItemId?: string;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
  }) {
    const promotion = await prisma.promotion.create({
      data: {
        name: `${input.name} ${suffix} ${randomUUID().slice(0, 6)}`,
        description: "Automated promotion test",
        discountType: input.discountType,
        discountValue: input.discountValue,
        startDate: input.startDate ?? new Date(Date.now() - 60_000),
        endDate: input.endDate ?? new Date(Date.now() + 86_400_000),
        isActive: input.isActive ?? true,
        branches: { create: { branchId: input.branchId ?? londonBranch.id } },
        items: { create: { menuItemId: input.menuItemId ?? meal.id } },
      },
    });
    promotionIds.push(promotion.id);
    return promotion;
  }

  // Create and pay for a completed order so refund tests start from a valid payment.
  async function createCompletedPaidOrder(tableId: string) {
    const created = await submitOrder(tableId);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "PREPARING" })
      .expect(200);
    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "READY" })
      .expect(200);
    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ status: "COMPLETED" })
      .expect(200);

    const payment = await request(app)
      .post(`/api/v1/payments/orders/${orderId}/payment`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ paymentMethod: "CASH" })
      .expect(201);

    paymentIds.push(payment.body.data.id);
    return { orderId, paymentId: payment.body.data.id, paymentAmount: Number(payment.body.data.amount) };
  }

  it("creates an order, snapshots its two fixed sides, and deducts recipe stock", async () => {
    const response = await submitOrder(tableOne.id);
    if (response.status === 201) orderIds.push(response.body.data.id);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("NEW");
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].sides).toHaveLength(2);
    expect(response.body.data.items[0].sides.map((side: any) => side.sideNameSnapshot))
      .toEqual([`Test Fries ${suffix}`, `Test Salad ${suffix}`]);

    const [stock, table, deductions] = await Promise.all([
      prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
      }),
      prisma.restaurantTable.findUniqueOrThrow({ where: { id: tableOne.id } }),
      prisma.inventoryTransaction.count({
        where: { orderId: response.body.data.id, transactionType: "ORDER_DEDUCTION" },
      }),
    ]);

    expect(Number(stock.quantityOnHand)).toBe(9.5);
    expect(table.status).toBe("OCCUPIED");
    expect(deductions).toBe(1);
  });

  it("prevents a second active order from using the same table", async () => {
    const response = await submitOrder(tableOne.id);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe("Table is not available");
  });

  it("rejects an order when the authenticated Server uses another branch's table", async () => {
    const response = await submitOrder(manchesterTable.id);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it("blocks order creation when recipe stock is insufficient and leaves stock unchanged", async () => {
    const current = await prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
    });

    await prisma.branchInventory.update({
      where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
      data: { quantityOnHand: 0 },
    });

    try {
      const response = await submitOrder(tableTwo.id);
      expect(response.status).toBe(409);
      expect(response.body.error.message).toBe("Insufficient inventory to submit this order");

      const [stock, orderCount] = await Promise.all([
        prisma.branchInventory.findUniqueOrThrow({
          where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
        }),
        prisma.order.count({ where: { tableId: tableTwo.id } }),
      ]);

      expect(Number(stock.quantityOnHand)).toBe(0);
      expect(orderCount).toBe(0);
    } finally {
      await prisma.branchInventory.update({
        where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
        data: { quantityOnHand: current.quantityOnHand },
      });
    }
  });

  it("does not allow the Headquarters Manager to create an order", async () => {
    const response = await submitOrder(tableTwo.id, hqToken);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("rejects an order with invalid request data", async () => {
    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ tableId: "not-a-uuid", items: [] });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("allows the Server to edit their own NEW order and recalculates stock", async () => {
    const created = await submitOrder(tableTwo.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    const edited = await request(app)
      .patch(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ items: [{ menuItemId: meal.id, quantity: 2 }] });

    expect(edited.status).toBe(200);
    expect(edited.body.data.items[0].quantity).toBe(2);

    const stock = await prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
    });
    // One original order and the edited two-unit order consume 1.5 KG in total.
    expect(Number(stock.quantityOnHand)).toBe(8.5);
  });

  it("restores only the remaining stock deduction when an edited order is cancelled", async () => {
    const before = await prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
    });
    const startingQuantity = Number(before.quantityOnHand);

    const created = await submitOrder(tableThree.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    const edited = await request(app)
      .patch(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ items: [{ menuItemId: meal.id, quantity: 2 }] });
    expect(edited.status).toBe(200);

    const cancelled = await request(app)
      .patch(`/api/v1/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ reason: "Automated test cancellation" });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("CANCELLED");

    // A second cancellation must be rejected.
    const repeatedCancellation = await request(app)
      .patch(`/api/v1/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ reason: "Repeated cancellation attempt" });

    expect(repeatedCancellation.status).toBe(409);

    const [stock, table] = await Promise.all([
      prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
      }),
      prisma.restaurantTable.findUniqueOrThrow({ where: { id: tableThree.id } }),
    ]);

    // Cancelling must return inventory to the quantity recorded before this order.
    expect(Number(stock.quantityOnHand)).toBe(startingQuantity);
    expect(table.status).toBe("AVAILABLE");
  });

  it("does not allow editing an order after it leaves NEW status", async () => {
    const created = await submitOrder(tableFour.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    const preparing = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "PREPARING" });
    expect(preparing.status).toBe(200);

    const edited = await request(app)
      .patch(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ items: [{ menuItemId: meal.id, quantity: 2 }] });

    expect(edited.status).toBe(409);
  });


  it("allows the Cook to move an order through PREPARING and READY, then the Server to complete it", async () => {
    const created = await submitOrder(tableFive.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    // The Cook starts preparation and marks the meal ready.
    const preparing = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "PREPARING" });
    expect(preparing.status).toBe(200);
    expect(preparing.body.data.status).toBe("PREPARING");

    const ready = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "READY" });
    expect(ready.status).toBe(200);
    expect(ready.body.data.status).toBe("READY");

    // The Server completes the order after serving it.
    const completed = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ status: "COMPLETED" });
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe("COMPLETED");

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId },
      orderBy: { changedAt: "asc" },
    });
    expect(history.map((entry) => entry.newStatus)).toEqual([
      "NEW", "PREPARING", "READY", "COMPLETED",
    ]);
  });

  it("rejects status changes attempted by the wrong role or out of sequence", async () => {
    const created = await submitOrder(tableSix.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    const serverStartsPreparation = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ status: "PREPARING" });
    expect(serverStartsPreparation.status).toBe(409);

    const cookSkipsToReady = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "READY" });
    expect(cookSkipsToReady.status).toBe(409);

    const cookTriesToComplete = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "COMPLETED" });
    expect(cookTriesToComplete.status).toBe(409);
  });

  it("keeps order details and lists restricted to the authenticated branch", async () => {
    const created = await submitOrder(tableEight.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    const otherBranchDetail = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${manchesterManagerToken}`);
    expect(otherBranchDetail.status).toBe(404);

    const otherBranchList = await request(app)
      .get("/api/v1/orders")
      .set("Authorization", `Bearer ${manchesterManagerToken}`);
    expect(otherBranchList.status).toBe(200);
    expect(otherBranchList.body.data.some((order: any) => order.id === orderId)).toBe(false);

    // Headquarters Manager can view the same order across branches.
    const headquartersDetail = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${hqToken}`);
    expect(headquartersDetail.status).toBe(200);
    expect(headquartersDetail.body.data.id).toBe(orderId);
  });

  it("keeps a completed table occupied until successful payment, then makes it available", async () => {
    const created = await submitOrder(tableSeven.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    // Complete the kitchen and service workflow before checking payment.
    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "PREPARING" })
      .expect(200);
    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "READY" })
      .expect(200);
    await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ status: "COMPLETED" })
      .expect(200);

    const occupiedTables = await request(app)
      .get(`/api/v1/tables/branches/${londonBranch.id}`)
      .set("Authorization", `Bearer ${serverToken}`);
    expect(occupiedTables.status).toBe(200);
    expect(occupiedTables.body.data.tables.find((table: any) => table.id === tableSeven.id).status)
      .toBe("OCCUPIED");

    // A successful full payment releases the table.
    const payment = await request(app)
      .post(`/api/v1/payments/orders/${orderId}/payment`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ paymentMethod: "CASH" });
    expect(payment.status).toBe(201);
    expect(payment.body.data.status).toBe("SUCCESSFUL");

    const availableTables = await request(app)
      .get(`/api/v1/tables/branches/${londonBranch.id}`)
      .set("Authorization", `Bearer ${serverToken}`);
    expect(availableTables.status).toBe(200);
    expect(availableTables.body.data.tables.find((table: any) => table.id === tableSeven.id).status)
      .toBe("AVAILABLE");
  });


  it("allows the Branch Manager to cancel a NEW order in their own branch", async () => {
    // The prior cancellation test has released this table for reuse.
    const created = await submitOrder(tableThree.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    const cancelled = await request(app)
      .patch(`/api/v1/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${londonManagerToken}`)
      .send({ reason: "Branch Manager cancellation test" });

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("CANCELLED");
  });

  it("does not allow a Server from another branch to cancel this branch's order", async () => {
    // Branch scoping rejects the request before another branch's Server can act on the order.
    const orderId = orderIds[0];
    expect(orderId).toBeTruthy();

    const response = await request(app)
      .patch(`/api/v1/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${manchesterServerToken}`)
      .send({ reason: "Cross-branch cancellation test" });

    expect(response.status).toBe(404);
  });

  it("does not allow the Cook to cancel a NEW order", async () => {
    // Use an existing NEW test order; the rejected request must not change its status.
    const orderId = orderIds[0];
    const response = await request(app)
      .patch(`/api/v1/orders/${orderId}/cancel`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ reason: "Cook cancellation attempt" });

    expect(response.status).toBe(403);
  });

  it("does not allow cancellation after an order reaches PREPARING", async () => {
    // Table Six has a NEW order from the earlier status-transition test.
    const order = await prisma.order.findFirstOrThrow({
      where: { tableId: tableSix.id },
      select: { id: true, status: true },
    });
    expect(order.status).toBe("NEW");

    const preparing = await request(app)
      .patch(`/api/v1/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "PREPARING" });
    expect(preparing.status).toBe(200);

    const cancelled = await request(app)
      .patch(`/api/v1/orders/${order.id}/cancel`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ reason: "Cancellation after preparation attempt" });

    expect(cancelled.status).toBe(409);
    const unchanged = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true },
    });
    expect(unchanged.status).toBe("PREPARING");
  });

  it("enforces payment timing, role permissions, and prevents duplicate successful payments", async () => {
    // Table Two has a NEW order from the earlier order-edit test.
    const order = await prisma.order.findFirstOrThrow({
      where: { tableId: tableTwo.id },
      select: { id: true, status: true },
    });
    expect(order.status).toBe("NEW");

    const earlyPayment = await request(app)
      .post(`/api/v1/payments/orders/${order.id}/payment`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ paymentMethod: "CASH" });
    expect(earlyPayment.status).toBe(409);

    const cookPayment = await request(app)
      .post(`/api/v1/payments/orders/${order.id}/payment`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ paymentMethod: "CASH" });
    expect(cookPayment.status).toBe(403);

    // Complete the required kitchen and service status sequence.
    const preparing = await request(app)
      .patch(`/api/v1/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "PREPARING" });
    expect(preparing.status).toBe(200);

    const ready = await request(app)
      .patch(`/api/v1/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ status: "READY" });
    expect(ready.status).toBe(200);

    const completed = await request(app)
      .patch(`/api/v1/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ status: "COMPLETED" });
    expect(completed.status).toBe(200);

    // Two payment requests sent together must result in exactly one successful payment.
    const paymentAttempts = await Promise.all([
      request(app)
        .post(`/api/v1/payments/orders/${order.id}/payment`)
        .set("Authorization", `Bearer ${serverToken}`)
        .send({ paymentMethod: "CASH" }),
      request(app)
        .post(`/api/v1/payments/orders/${order.id}/payment`)
        .set("Authorization", `Bearer ${serverToken}`)
        .send({ paymentMethod: "CASH" }),
    ]);
    expect(paymentAttempts.map((attempt) => attempt.status).sort()).toEqual([201, 409]);
    const payment = paymentAttempts.find((attempt) => attempt.status === 201)!;
    expect(payment.body.data.status).toBe("SUCCESSFUL");
    paymentIds.push(payment.body.data.id);

    const paymentAudit = await prisma.auditLog.findMany({
      where: { entityType: "Payment", entityId: payment.body.data.id },
    });
    expect(paymentAudit).toHaveLength(1);
    expect(paymentAudit[0].action).toBe("PAYMENT_RECORDED");
  });


  it("allows a Server to request a full refund and prevents partial or duplicate requests", async () => {
    const { orderId, paymentId, paymentAmount } = await createCompletedPaidOrder(tableNine.id);

    // The API accepts no refund amount; supplying one is rejected as an unknown field.
    const partial = await request(app)
      .post(`/api/v1/payments/${paymentId}/refunds`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ reason: "Partial refund attempt", amount: 1 });
    expect(partial.status).toBe(400);

    // Two simultaneous refund requests must create only one pending refund.
    const refundAttempts = await Promise.all([
      request(app)
        .post(`/api/v1/payments/${paymentId}/refunds`)
        .set("Authorization", `Bearer ${serverToken}`)
        .send({ reason: "Customer requested a refund" }),
      request(app)
        .post(`/api/v1/payments/${paymentId}/refunds`)
        .set("Authorization", `Bearer ${serverToken}`)
        .send({ reason: "Duplicate simultaneous refund request" }),
    ]);
    expect(refundAttempts.map((attempt) => attempt.status).sort()).toEqual([201, 409]);
    const requested = refundAttempts.find((attempt) => attempt.status === 201)!;
    refundIds.push(requested.body.data.id);
    expect(requested.body.data.status).toBe("REQUESTED");
    expect(Number(requested.body.data.amount)).toBe(paymentAmount);

    const duplicate = await request(app)
      .post(`/api/v1/payments/${paymentId}/refunds`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ reason: "Duplicate refund request" });
    expect(duplicate.status).toBe(409);

    // A user assigned to another branch cannot request a refund for this payment.
    const crossBranch = await request(app)
      .post(`/api/v1/payments/${paymentId}/refunds`)
      .set("Authorization", `Bearer ${manchesterServerToken}`)
      .send({ reason: "Cross-branch refund attempt" });
    expect(crossBranch.status).toBe(404);

    const paidHistory = await request(app)
      .get(`/api/v1/payments/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${serverToken}`);
    expect(paidHistory.status).toBe(200);
    expect(paidHistory.body.data.paymentStatus).toBe("PAID");

    // A Server cannot approve without the Branch Manager's separate credentials.
    const serverReview = await request(app)
      .patch(`/api/v1/payments/refunds/${requested.body.data.id}/review`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ decision: "APPROVED" });
    expect(serverReview.status).toBe(400);

    const hqReview = await request(app)
      .patch(`/api/v1/payments/refunds/${requested.body.data.id}/review`)
      .set("Authorization", `Bearer ${hqToken}`)
      .send({ decision: "APPROVED", managerEmail: londonManagerEmail, password: testPassword });
    expect(hqReview.status).toBe(403);

    const wrongPassword = await request(app)
      .patch(`/api/v1/payments/refunds/${requested.body.data.id}/review`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ decision: "APPROVED", managerEmail: londonManagerEmail, password: "IncorrectPassword!" });
    expect(wrongPassword.status).toBe(401);

    // The Branch Manager can reject the request; a new request may then be submitted.
    const rejected = await request(app)
      .patch(`/api/v1/payments/refunds/${requested.body.data.id}/review`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ decision: "REJECTED", managerEmail: londonManagerEmail, password: testPassword });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.status).toBe("REJECTED");

    const retryRequest = await request(app)
      .post(`/api/v1/payments/${paymentId}/refunds`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ reason: "Customer resubmitted refund after rejection" });
    expect(retryRequest.status).toBe(201);
    refundIds.push(retryRequest.body.data.id);
    expect(retryRequest.body.data.status).toBe("REQUESTED");

    const approved = await request(app)
      .patch(`/api/v1/payments/refunds/${retryRequest.body.data.id}/review`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ decision: "APPROVED", managerEmail: londonManagerEmail, password: testPassword });
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe("PROCESSED");
    expect(Number(approved.body.data.amount)).toBe(paymentAmount);
    expect(approved.body.data.processedByUserId).toBe((await prisma.user.findUniqueOrThrow({
      where: { email: londonManagerEmail }, select: { id: true },
    })).id);

    const refundAudit = await prisma.auditLog.findMany({
      where: { entityType: "Refund", entityId: retryRequest.body.data.id },
      orderBy: { createdAt: "asc" },
    });
    expect(refundAudit).toHaveLength(2);
    expect(refundAudit.map((entry) => entry.action)).toEqual(expect.arrayContaining(["REFUND_REQUESTED", "REFUND_APPROVED"]));

    const refundedHistory = await request(app)
      .get(`/api/v1/payments/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${serverToken}`);
    expect(refundedHistory.status).toBe(200);
    expect(refundedHistory.body.data.paymentStatus).toBe("REFUNDED");
  });

  it("allows a Branch Manager to initiate and immediately process their own full refund", async () => {
    const { orderId, paymentId, paymentAmount } = await createCompletedPaidOrder(tableTen.id);

    // The frontend must show a confirmation prompt before sending this Manager-initiated request.
    const requested = await request(app)
      .post(`/api/v1/payments/${paymentId}/refunds`)
      .set("Authorization", `Bearer ${londonManagerToken}`)
      .send({ reason: "Manager-confirmed full refund" });

    expect(requested.status).toBe(201);
    refundIds.push(requested.body.data.id);
    expect(requested.body.data.status).toBe("PROCESSED");
    expect(Number(requested.body.data.amount)).toBe(paymentAmount);

    const londonManager = await prisma.user.findUniqueOrThrow({
      where: { email: londonManagerEmail },
      select: { id: true },
    });
    expect(requested.body.data.requestedByUserId).toBe(londonManager.id);
    expect(requested.body.data.processedByUserId).toBe(londonManager.id);
    expect(requested.body.data.processedAt).toBeTruthy();

    const managerRefundAudit = await prisma.auditLog.findMany({
      where: { entityType: "Refund", entityId: requested.body.data.id },
    });
    expect(managerRefundAudit).toHaveLength(1);
    expect(managerRefundAudit[0].action).toBe("REFUND_SELF_PROCESSED");

    const history = await request(app)
      .get(`/api/v1/payments/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${londonManagerToken}`);
    expect(history.status).toBe(200);
    expect(history.body.data.paymentStatus).toBe("REFUNDED");
  });

  it("restricts refund approval to the correct branch Manager and records the review", async () => {
    const { orderId, paymentId } = await createCompletedPaidOrder(tableEleven.id);

    const requested = await request(app)
      .post(`/api/v1/payments/${paymentId}/refunds`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ reason: "Refund approval branch-scope test" });

    expect(requested.status).toBe(201);
    refundIds.push(requested.body.data.id);
    expect(requested.body.data.status).toBe("REQUESTED");

    // A Manager from another branch cannot review this refund.
    const wrongBranchReview = await request(app)
      .patch(`/api/v1/payments/refunds/${requested.body.data.id}/review`)
      .set("Authorization", `Bearer ${manchesterManagerToken}`)
      .send({ decision: "APPROVED", managerEmail: londonManagerEmail, password: testPassword });

    expect(wrongBranchReview.status).toBe(404);

    // The assigned Branch Manager can approve and is recorded as the reviewer.
    const approved = await request(app)
      .patch(`/api/v1/payments/refunds/${requested.body.data.id}/review`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ decision: "APPROVED", managerEmail: londonManagerEmail, password: testPassword });

    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe("PROCESSED");

    const londonManager = await prisma.user.findUniqueOrThrow({
      where: { email: londonManagerEmail },
      select: { id: true },
    });
    expect(approved.body.data.processedByUserId).toBe(londonManager.id);
    expect(approved.body.data.processedAt).toBeTruthy();

    // A refund that has already been reviewed cannot be approved again.
    const duplicateReview = await request(app)
      .patch(`/api/v1/payments/refunds/${requested.body.data.id}/review`)
      .set("Authorization", `Bearer ${londonManagerToken}`)
      .send({ decision: "APPROVED", managerEmail: londonManagerEmail, password: testPassword });

    expect(duplicateReview.status).toBe(409);

    const history = await request(app)
      .get(`/api/v1/payments/orders/${orderId}/payments`)
      .set("Authorization", `Bearer ${londonManagerToken}`);
    expect(history.status).toBe(200);
    expect(history.body.data.paymentStatus).toBe("REFUNDED");
  });



  it("consolidates duplicate menu-item lines and deducts stock for the combined quantity", async () => {
    const before = await prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
    });

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${serverToken}`)
      .send({
        tableId: tableTwelve.id,
        items: [
          { menuItemId: meal.id, quantity: 1 },
          { menuItemId: meal.id, quantity: 2 },
        ],
      });

    expect(response.status).toBe(201);
    orderIds.push(response.body.data.id);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].quantity).toBe(3);
    expect(response.body.data.items[0].sides).toHaveLength(2);
    expect(response.body.data.items[0].sides[0].quantity).toBe(3);

    const [after, deductions] = await Promise.all([
      prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
      }),
      prisma.inventoryTransaction.findMany({
        where: { orderId: response.body.data.id, transactionType: "ORDER_DEDUCTION" },
      }),
    ]);

    expect(Number(before.quantityOnHand) - Number(after.quantityOnHand)).toBe(1.5);
    expect(deductions).toHaveLength(1);
    expect(Number(deductions[0].quantityChange)).toBe(-1.5);
  });

  it("rejects a combined menu-item quantity above 50 without changing stock", async () => {
    const before = await prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
    });

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Authorization", `Bearer ${serverToken}`)
      .send({
        tableId: tableThirteen.id,
        items: [
          { menuItemId: meal.id, quantity: 30 },
          { menuItemId: meal.id, quantity: 21 },
        ],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);

    const [after, orderCount] = await Promise.all([
      prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
      }),
      prisma.order.count({ where: { tableId: tableThirteen.id } }),
    ]);

    expect(Number(after.quantityOnHand)).toBe(Number(before.quantityOnHand));
    expect(orderCount).toBe(0);
  });


  it("does not allow HQ or Cook accounts to request refunds", async () => {
    const { paymentId } = await createCompletedPaidOrder(tableNine.id);

    const hqRequest = await request(app)
      .post(`/api/v1/payments/${paymentId}/refunds`)
      .set("Authorization", `Bearer ${hqToken}`)
      .send({ reason: "HQ refund request attempt" });
    expect(hqRequest.status).toBe(403);

    const cookRequest = await request(app)
      .post(`/api/v1/payments/${paymentId}/refunds`)
      .set("Authorization", `Bearer ${cookToken}`)
      .send({ reason: "Cook refund request attempt" });
    expect(cookRequest.status).toBe(403);
  });

  it("automatically applies an eligible promotion and preserves its historical snapshot", async () => {
    const promotion = await createTestPromotion({
      name: "Ten Percent Steak Promotion",
      discountType: "PERCENTAGE",
      discountValue: 10,
    });

    const created = await submitOrder(tableTwo.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    // Confirm that order creation is recorded in the audit log.
    const orderAudit = await prisma.auditLog.findFirst({
      where: {
        entityType: "Order",
        entityId: orderId,
        action: "ORDER_CREATED",
      },
    });

    expect(orderAudit).not.toBeNull();

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    const item = order.items[0];

    expect(item.promotionId).toBe(promotion.id);
    expect(item.promotionNameSnapshot).toBe(promotion.name);
    expect(item.promotionDiscountTypeSnapshot).toBe("PERCENTAGE");
    expect(Number(item.promotionDiscountValueSnapshot)).toBe(10);
    expect(Number(item.promotionDiscountAmount)).toBe(2.5);
    expect(Number(item.lineTotal)).toBe(22.5);
    expect(Number(order.subtotal)).toBe(25);
    expect(Number(order.discountTotal)).toBe(2.5);
    expect(Number(order.taxTotal)).toBe(3.75);
    expect(Number(order.totalAmount)).toBe(22.5);

    // Deactivating a promotion must not rewrite an already-created order snapshot.
    await prisma.promotion.update({
      where: { id: promotion.id },
      data: { isActive: false },
    });

    const detail = await request(app)
      .get(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${serverToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.items[0].promotionId).toBe(promotion.id);
    expect(detail.body.data.items[0].promotionNameSnapshot).toBe(promotion.name);
    expect(Number(detail.body.data.items[0].promotionDiscountAmount)).toBe(2.5);
  });

  it("does not apply a promotion assigned to a different branch", async () => {
    await createTestPromotion({
      name: "Manchester Only Promotion",
      discountType: "PERCENTAGE",
      discountValue: 20,
      branchId: manchesterBranch.id,
    });

    const created = await submitOrder(tableSeven.id);
    expect(created.status).toBe(201);
    orderIds.push(created.body.data.id);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: created.body.data.id },
      include: { items: true },
    });

    expect(order.items[0].promotionId).toBeNull();
    expect(order.items[0].promotionNameSnapshot).toBeNull();
    expect(Number(order.items[0].promotionDiscountAmount)).toBe(0);
    expect(Number(order.discountTotal)).toBe(0);
    expect(Number(order.totalAmount)).toBe(25);
  });

  it("applies only the highest-value eligible promotion without stacking", async () => {
    const percentagePromotion = await createTestPromotion({
      name: "Ten Percent Competing Promotion",
      discountType: "PERCENTAGE",
      discountValue: 10,
    });
    const bestPromotion = await createTestPromotion({
      name: "Three Pound Competing Promotion",
      discountType: "FIXED_AMOUNT",
      discountValue: 3,
    });

    const created = await submitOrder(tableNine.id);
    expect(created.status).toBe(201);
    orderIds.push(created.body.data.id);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: created.body.data.id },
      include: { items: true },
    });

    expect(order.items[0].promotionId).toBe(bestPromotion.id);
    expect(order.items[0].promotionDiscountTypeSnapshot).toBe("FIXED_AMOUNT");
    expect(Number(order.items[0].promotionDiscountValueSnapshot)).toBe(3);
    expect(Number(order.items[0].promotionDiscountAmount)).toBe(3);
    expect(Number(order.discountTotal)).toBe(3);
    expect(Number(order.totalAmount)).toBe(22);

    // Keep this test isolated: later tests must not inherit its active promotions.
    await prisma.promotion.updateMany({
      where: { id: { in: [percentagePromotion.id, bestPromotion.id] } },
      data: { isActive: false },
    });
  });

  it("does not apply expired or inactive promotions", async () => {
    await createTestPromotion({
      name: "Expired Promotion",
      discountType: "PERCENTAGE",
      discountValue: 25,
      startDate: new Date(Date.now() - 172_800_000),
      endDate: new Date(Date.now() - 86_400_000),
    });
    await createTestPromotion({
      name: "Inactive Promotion",
      discountType: "FIXED_AMOUNT",
      discountValue: 5,
      isActive: false,
    });

    const created = await submitOrder(tableTen.id);
    expect(created.status).toBe(201);
    orderIds.push(created.body.data.id);

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: created.body.data.id },
      include: { items: true },
    });

    expect(order.items[0].promotionId).toBeNull();
    expect(Number(order.items[0].promotionDiscountAmount)).toBe(0);
    expect(Number(order.discountTotal)).toBe(0);
    expect(Number(order.totalAmount)).toBe(25);
  });

  it("recalculates promotions when a Server edits their own NEW order", async () => {
    const created = await submitOrder(tableEleven.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    const beforePromotion = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    expect(beforePromotion.items[0].promotionId).toBeNull();
    expect(Number(beforePromotion.discountTotal)).toBe(0);

    const promotion = await createTestPromotion({
      name: "Promotion Added Before Order Edit",
      discountType: "FIXED_AMOUNT",
      discountValue: 4,
    });

    const edited = await request(app)
      .patch(`/api/v1/orders/${orderId}`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ items: [{ menuItemId: meal.id, quantity: 1 }] });

    expect(edited.status).toBe(200);
    expect(edited.body.data.items[0].promotionId).toBe(promotion.id);
    expect(edited.body.data.items[0].promotionNameSnapshot).toBe(promotion.name);
    expect(Number(edited.body.data.items[0].promotionDiscountAmount)).toBe(4);
    expect(Number(edited.body.data.discountTotal)).toBe(4);
    expect(Number(edited.body.data.totalAmount)).toBe(21);
  });

  it("keeps the original recipe version when editing an order after a newer version is published", async () => {
    // Earlier tests consume this shared test ingredient; reset it so this regression test is isolated.
    await prisma.branchInventory.update({
      where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
      data: { quantityOnHand: 10 },
    });
    const startingStock = await prisma.branchInventory.findUniqueOrThrow({
      where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
    });
    const startingQuantity = Number(startingStock.quantityOnHand);

    const created = await submitOrder(tableThirteen.id);
    expect(created.status).toBe(201);
    const orderId = created.body.data.id;
    orderIds.push(orderId);

    const originalItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId },
      select: { recipeVersionId: true },
    });
    const recipe = await prisma.recipe.findUniqueOrThrow({ where: { menuItemId: meal.id } });

    // Publish a newer recipe version with a different ingredient quantity.
    await prisma.recipeVersion.update({
      where: { id: originalItem.recipeVersionId },
      data: { status: "ARCHIVED" },
    });
    const newerVersion = await prisma.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        versionNumber: 2,
        status: "PUBLISHED",
        createdByUserId: hqManager.id,
        publishedAt: new Date(),
        ingredients: {
          create: { ingredientId: ingredient.id, quantity: 1.25, unit: "KG" },
        },
      },
    });

    try {
      const edited = await request(app)
        .patch(`/api/v1/orders/${orderId}`)
        .set("Authorization", `Bearer ${serverToken}`)
        .send({ items: [{ menuItemId: meal.id, quantity: 2 }] });

      expect(edited.status).toBe(200);
      expect(edited.body.data.items[0].recipeVersionId).toBe(originalItem.recipeVersionId);
      expect(edited.body.data.items[0].recipeVersionId).not.toBe(newerVersion.id);

      const stock = await prisma.branchInventory.findUniqueOrThrow({
        where: { branchId_ingredientId: { branchId: londonBranch.id, ingredientId: ingredient.id } },
      });
      // The edited two-unit order must use the original 0.5 KG recipe quantity per unit.
      expect(Number(stock.quantityOnHand)).toBe(startingQuantity - 1);
    } finally {
      // Archive the newer version first to preserve the one-published-version constraint.
      await prisma.recipeVersion.update({
        where: { id: newerVersion.id },
        data: { status: "ARCHIVED" },
      });
      // Restore the original published recipe so this test does not affect other runs.
      await prisma.recipeVersion.update({
        where: { id: originalItem.recipeVersionId },
        data: { status: "PUBLISHED" },
      });
    }
  });

  it("requires a cancellation reason", async () => {
    const response = await request(app)
      .patch(`/api/v1/orders/${orderIds[orderIds.length - 1]}/cancel`)
      .set("Authorization", `Bearer ${serverToken}`)
      .send({ reason: "" });

    expect(response.status).toBe(400);
  });

});
