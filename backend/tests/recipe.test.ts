// Tests recipe creation, draft editing, immutable publication, version history, and role access.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";

const testPassword = "SteakzTest!2026";
const hqEmail = "hqmanager@test.steakz.com";
const branchManagerEmail = "bmanager.london@test.steakz.com";
const serverEmail = "server.london@test.steakz.com";

describe("Recipe Management API", () => {
  const suffix = randomUUID().slice(0, 8);
  let hqToken = "";
  let branchManagerToken = "";
  let serverToken = "";
  let menuCategory: any;
  let menuItem: any;
  let ingredient: any;
  let recipeId = "";
  let firstVersionId = "";
  let secondVersionId = "";

  beforeAll(async () => {
    const [hqLogin, managerLogin, serverLogin] = await Promise.all([
      request(app).post("/api/v1/auth/login").send({ email: hqEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: branchManagerEmail, password: testPassword }),
      request(app).post("/api/v1/auth/login").send({ email: serverEmail, password: testPassword }),
    ]);
    expect(hqLogin.status).toBe(200);
    expect(managerLogin.status).toBe(200);
    expect(serverLogin.status).toBe(200);
    hqToken = hqLogin.body.data.accessToken;
    branchManagerToken = managerLogin.body.data.accessToken;
    serverToken = serverLogin.body.data.accessToken;

    menuCategory = await prisma.menuCategory.create({
      data: { name: `Recipe Test Category ${suffix}`, description: "Automated recipe API tests" },
    });
    menuItem = await prisma.menuItem.create({
      data: { categoryId: menuCategory.id, name: `Recipe Test Item ${suffix}`, price: 22.5 },
    });
    ingredient = await prisma.ingredient.create({
      data: { name: `Recipe Test Ingredient ${suffix}`, unit: "G" },
    });
  });

  afterAll(async () => {
    if (recipeId) {
      const versions = await prisma.recipeVersion.findMany({ where: { recipeId }, select: { id: true } });
      const versionIds = versions.map((version) => version.id);
      await prisma.auditLog.deleteMany({ where: { entityType: "RecipeVersion", entityId: { in: versionIds } } });
      await prisma.auditLog.deleteMany({ where: { entityType: "Recipe", entityId: recipeId } });
      await prisma.recipeIngredient.deleteMany({ where: { recipeVersionId: { in: versionIds } } });
      await prisma.recipeVersion.deleteMany({ where: { recipeId } });
      await prisma.recipe.delete({ where: { id: recipeId } });
    }
    if (ingredient?.id) await prisma.ingredient.delete({ where: { id: ingredient.id } });
    if (menuItem?.id) await prisma.menuItem.delete({ where: { id: menuItem.id } });
    if (menuCategory?.id) await prisma.menuCategory.delete({ where: { id: menuCategory.id } });
    await prisma.$disconnect();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/v1/recipes");
    expect(response.status).toBe(401);
  });

  it("allows Branch Managers to view recipes but not manage them", async () => {
    const read = await request(app).get("/api/v1/recipes").set(auth(branchManagerToken));
    expect(read.status).toBe(200);
    const create = await request(app).post("/api/v1/recipes").set(auth(branchManagerToken)).send({ menuItemId: menuItem.id });
    expect(create.status).toBe(403);
  });

  it("does not expose recipe management to Servers", async () => {
    const response = await request(app).get("/api/v1/recipes").set(auth(serverToken));
    expect(response.status).toBe(403);
  });

  it("creates a recipe and its first draft version", async () => {
    const response = await request(app).post("/api/v1/recipes").set(auth(hqToken)).send({ menuItemId: menuItem.id });
    expect(response.status).toBe(201);
    expect(response.body.data.menuItemId).toBe(menuItem.id);
    expect(response.body.data.versions).toHaveLength(1);
    expect(response.body.data.versions[0].versionNumber).toBe(1);
    expect(response.body.data.versions[0].status).toBe("DRAFT");
    recipeId = response.body.data.id;
    firstVersionId = response.body.data.versions[0].id;
  });

  it("rejects a second recipe for the same menu item", async () => {
    const response = await request(app).post("/api/v1/recipes").set(auth(hqToken)).send({ menuItemId: menuItem.id });
    expect(response.status).toBe(409);
  });

  it("rejects invalid create payloads", async () => {
    const response = await request(app).post("/api/v1/recipes").set(auth(hqToken)).send({ menuItemId: "not-a-uuid", extra: true });
    expect(response.status).toBe(400);
  });

  it("sets the complete ingredient list on a draft version", async () => {
    const response = await request(app)
      .put(`/api/v1/recipes/${recipeId}/versions/${firstVersionId}/ingredients`)
      .set(auth(hqToken))
      .send({ ingredients: [{ ingredientId: ingredient.id, quantity: 250, unit: "G" }] });
    expect(response.status).toBe(200);
    expect(response.body.data.ingredients).toHaveLength(1);
    expect(Number(response.body.data.ingredients[0].quantity)).toBe(250);
  });

  it("rejects duplicate ingredients and mismatched units", async () => {
    const duplicate = await request(app)
      .put(`/api/v1/recipes/${recipeId}/versions/${firstVersionId}/ingredients`)
      .set(auth(hqToken))
      .send({ ingredients: [
        { ingredientId: ingredient.id, quantity: 100, unit: "G" },
        { ingredientId: ingredient.id, quantity: 200, unit: "G" },
      ] });
    expect(duplicate.status).toBe(400);

    const mismatch = await request(app)
      .put(`/api/v1/recipes/${recipeId}/versions/${firstVersionId}/ingredients`)
      .set(auth(hqToken))
      .send({ ingredients: [{ ingredientId: ingredient.id, quantity: 1, unit: "KG" }] });
    expect(mismatch.status).toBe(400);
  });

  it("requires at least one ingredient before publishing", async () => {
    const emptyRecipe = await prisma.recipe.create({
      data: {
        menuItemId: (await prisma.menuItem.create({
          data: { categoryId: menuCategory.id, name: `Empty Recipe Item ${suffix}`, price: 10 },
        })).id,
        versions: { create: { versionNumber: 1, createdByUserId: (await prisma.user.findUniqueOrThrow({ where: { email: hqEmail }, select: { id: true } })).id } },
      },
      include: { versions: true },
    });
    const response = await request(app)
      .patch(`/api/v1/recipes/${emptyRecipe.id}/versions/${emptyRecipe.versions[0].id}/publish`)
      .set(auth(hqToken));
    expect(response.status).toBe(400);
    await prisma.recipeVersion.deleteMany({ where: { recipeId: emptyRecipe.id } });
    await prisma.recipe.delete({ where: { id: emptyRecipe.id } });
    await prisma.menuItem.delete({ where: { id: emptyRecipe.menuItemId } });
  });

  it("publishes a valid draft version", async () => {
    const response = await request(app)
      .patch(`/api/v1/recipes/${recipeId}/versions/${firstVersionId}/publish`)
      .set(auth(hqToken));
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PUBLISHED");
    expect(response.body.data.publishedAt).toBeTruthy();
  });

  it("prevents edits to a published version", async () => {
    const response = await request(app)
      .put(`/api/v1/recipes/${recipeId}/versions/${firstVersionId}/ingredients`)
      .set(auth(hqToken))
      .send({ ingredients: [{ ingredientId: ingredient.id, quantity: 300, unit: "G" }] });
    expect(response.status).toBe(409);
  });

  it("creates and publishes a new version while archiving the previous published version", async () => {
    const create = await request(app).post(`/api/v1/recipes/${recipeId}/versions`).set(auth(hqToken));
    expect(create.status).toBe(201);
    expect(create.body.data.versionNumber).toBe(2);
    secondVersionId = create.body.data.id;

    const ingredients = await request(app)
      .put(`/api/v1/recipes/${recipeId}/versions/${secondVersionId}/ingredients`)
      .set(auth(hqToken))
      .send({ ingredients: [{ ingredientId: ingredient.id, quantity: 275, unit: "G" }] });
    expect(ingredients.status).toBe(200);

    const publish = await request(app)
      .patch(`/api/v1/recipes/${recipeId}/versions/${secondVersionId}/publish`)
      .set(auth(hqToken));
    expect(publish.status).toBe(200);

    const history = await request(app).get(`/api/v1/recipes/${recipeId}`).set(auth(hqToken));
    expect(history.status).toBe(200);
    expect(history.body.data.versions.find((version: any) => version.id === firstVersionId).status).toBe("ARCHIVED");
    expect(history.body.data.versions.find((version: any) => version.id === secondVersionId).status).toBe("PUBLISHED");
  });

  it("rejects publishing the same version twice", async () => {
    const response = await request(app)
      .patch(`/api/v1/recipes/${recipeId}/versions/${secondVersionId}/publish`)
      .set(auth(hqToken));
    expect(response.status).toBe(409);
  });
});
