import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { env } from "../src/config/env.js";
import { hashPassword } from "../src/utils/password.js";

// Connect the seed script to the Steakz PostgreSQL database.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// Define the five demonstration branches.
const branches = [
  {
    branchCode: "LON001",
    name: "London",
    address: "Demo address, London, UK",
    contactNumber: "0000000001",
    email: "london@steakz.com",
    timeZone: "Europe/London",
  },
  {
    branchCode: "MAN001",
    name: "Manchester",
    address: "Demo address, Manchester, UK",
    contactNumber: "0000000002",
    email: "manchester@steakz.com",
    timeZone: "Europe/London",
  },
  {
    branchCode: "LIV001",
    name: "Liverpool",
    address: "Demo address, Liverpool, UK",
    contactNumber: "0000000003",
    email: "liverpool@steakz.com",
    timeZone: "Europe/London",
  },
  {
    branchCode: "BHM001",
    name: "Birmingham",
    address: "Demo address, Birmingham, UK",
    contactNumber: "0000000004",
    email: "birmingham@steakz.com",
    timeZone: "Europe/London",
  },
  {
    branchCode: "LDS001",
    name: "Leeds",
    address: "Demo address, Leeds, UK",
    contactNumber: "0000000005",
    email: "leeds@steakz.com",
    timeZone: "Europe/London",
  },
] as const;

// Define the central management accounts.
const centralUsers = [
  {
    firstName: "System",
    lastName: "Administrator",
    email: "admin@steakz.com",
    password: "admin123",
    role: "ADMIN" as const,
  },
  {
    firstName: "Headquarters",
    lastName: "Manager",
    email: "hqmanager@steakz.com",
    password: "hqmanager123",
    role: "HEADQUARTERS_MANAGER" as const,
  },
];

// Define the three employee accounts for each branch.
const branchUsers = [
  {
    role: "BRANCH_MANAGER" as const,
    prefix: "bmanager",
    passwordPrefix: "bmanager",
    firstName: "Branch",
    lastName: "Manager",
  },
  {
    role: "SERVER" as const,
    prefix: "server",
    passwordPrefix: "server",
    firstName: "Restaurant",
    lastName: "Server",
  },
  {
    role: "COOK" as const,
    prefix: "cook",
    passwordPrefix: "cook",
    firstName: "Kitchen",
    lastName: "Cook",
  },
];

// Define the six menu categories.
const menuCategories = [
  { name: "Appetizers", description: "Starters and small plates.", displayOrder: 1 },
  { name: "Steak Meals", description: "Steak meals served with two fixed sides.", displayOrder: 2 },
  { name: "Soft Drinks", description: "Non-alcoholic cold drinks.", displayOrder: 3 },
  { name: "Beer", description: "Bottled beer selection.", displayOrder: 4 },
  { name: "Wine", description: "House wines served by the 150ml glass.", displayOrder: 5 },
  { name: "Desserts", description: "Desserts and sweet finishes.", displayOrder: 6 },
] as const;

// Define the demonstration menu and agreed prices.
const menuItems = [
  // Appetizers.
  { categoryName: "Appetizers", name: "Garlic Butter Mushrooms", description: "Mushrooms cooked with garlic butter.", price: "6.99", displayOrder: 1 },
  { categoryName: "Appetizers", name: "Crispy Calamari", description: "Crispy fried calamari.", price: "8.99", displayOrder: 2 },
  { categoryName: "Appetizers", name: "Prawn Cocktail", description: "Prawns served with cocktail sauce.", price: "8.49", displayOrder: 3 },
  { categoryName: "Appetizers", name: "Loaded Potato Skins", description: "Potato skins topped with cheese and garlic butter.", price: "7.49", displayOrder: 4 },
  { categoryName: "Appetizers", name: "Beef Carpaccio", description: "Thinly sliced beef with salad garnish.", price: "9.99", displayOrder: 5 },

  // Steak meals.
  { categoryName: "Steak Meals", name: "Ribeye Steak Meal", description: "Ribeye steak served with creamy mashed potatoes and coleslaw.", price: "27.99", displayOrder: 1 },
  { categoryName: "Steak Meals", name: "Classic Sirloin Steak Meal", description: "Sirloin steak served with triple-cooked chips and seasonal vegetables.", price: "21.99", displayOrder: 2 },
  { categoryName: "Steak Meals", name: "Fillet Steak Meal", description: "Fillet steak served with baked potato and green vegetables.", price: "31.99", displayOrder: 3 },
  { categoryName: "Steak Meals", name: "T-Bone Steak Meal", description: "T-bone steak served with triple-cooked chips and onion rings.", price: "29.99", displayOrder: 4 },

  // Soft drinks. Water is bottled; the other soft drinks are cans.
  { categoryName: "Soft Drinks", name: "Coca-Cola", description: "Coca-Cola can.", price: "2.50", drinkType: "SOFT_DRINK" as const, displayOrder: 1 },
  { categoryName: "Soft Drinks", name: "Diet Coke", description: "Diet Coke can.", price: "2.50", drinkType: "SOFT_DRINK" as const, displayOrder: 2 },
  { categoryName: "Soft Drinks", name: "Lemonade", description: "Lemonade can.", price: "2.50", drinkType: "SOFT_DRINK" as const, displayOrder: 3 },
  { categoryName: "Soft Drinks", name: "Still Water", description: "Still water bottle.", price: "1.95", drinkType: "SOFT_DRINK" as const, displayOrder: 4 },
  { categoryName: "Soft Drinks", name: "Sparkling Water", description: "Sparkling water bottle.", price: "2.25", drinkType: "SOFT_DRINK" as const, displayOrder: 5 },

  // Beer.
  { categoryName: "Beer", name: "Guinness", description: "Guinness bottled beer.", price: "5.50", drinkType: "BEER" as const, displayOrder: 1 },
  { categoryName: "Beer", name: "Peroni", description: "Peroni bottled beer.", price: "5.25", drinkType: "BEER" as const, displayOrder: 2 },
  { categoryName: "Beer", name: "Stella Artois", description: "Stella Artois bottled beer.", price: "5.00", drinkType: "BEER" as const, displayOrder: 3 },

  // Wine is sold only by the 150ml glass.
  { categoryName: "Wine", name: "House Red Wine", description: "House red wine, 150ml glass.", price: "6.50", drinkType: "WINE" as const, displayOrder: 1 },
  { categoryName: "Wine", name: "House White Wine", description: "House white wine, 150ml glass.", price: "6.50", drinkType: "WINE" as const, displayOrder: 2 },
  { categoryName: "Wine", name: "Rosé Wine", description: "House rosé wine, 150ml glass.", price: "6.50", drinkType: "WINE" as const, displayOrder: 3 },

  // Desserts.
  { categoryName: "Desserts", name: "Chocolate Brownie", description: "Chocolate brownie dessert.", price: "6.50", displayOrder: 1 },
  { categoryName: "Desserts", name: "Sticky Toffee Pudding", description: "Sticky toffee pudding dessert.", price: "6.95", displayOrder: 2 },
  { categoryName: "Desserts", name: "New York Cheesecake", description: "New York cheesecake dessert.", price: "6.50", displayOrder: 3 },
] as const;

// Define the two fixed sides for each steak meal.
const fixedMealSides = [
  { menuItemName: "Ribeye Steak Meal", sides: ["Creamy mashed potatoes", "Coleslaw"] },
  { menuItemName: "Classic Sirloin Steak Meal", sides: ["Triple-cooked chips", "Seasonal vegetables"] },
  { menuItemName: "Fillet Steak Meal", sides: ["Baked potato", "Green vegetables"] },
  { menuItemName: "T-Bone Steak Meal", sides: ["Triple-cooked chips", "Onion rings"] },
] as const;



// Define the central ingredient catalogue and stock units.
const ingredients = [
  { name: "Ribeye steak", unit: "KG" },
  { name: "Sirloin steak", unit: "KG" },
  { name: "Fillet steak", unit: "KG" },
  { name: "T-Bone steak", unit: "KG" },
  { name: "Potatoes", unit: "KG" },
  { name: "Coleslaw mix", unit: "KG" },
  { name: "Butter", unit: "G" },
  { name: "Cooking oil", unit: "ML" },
  { name: "Triple-cooked chips", unit: "KG" },
  { name: "Seasonal vegetables", unit: "KG" },
  { name: "Green vegetables", unit: "KG" },
  { name: "Onion rings", unit: "KG" },
  { name: "Mushrooms", unit: "KG" },
  { name: "Garlic butter", unit: "G" },
  { name: "Calamari", unit: "KG" },
  { name: "Flour", unit: "G" },
  { name: "Breadcrumbs", unit: "G" },
  { name: "Prawns", unit: "KG" },
  { name: "Cocktail sauce", unit: "G" },
  { name: "Salad garnish", unit: "G" },
  { name: "Cheese", unit: "G" },
  { name: "Beef carpaccio", unit: "KG" },
  { name: "Lemon", unit: "PIECE" },
  { name: "Coca-Cola", unit: "CAN" },
  { name: "Diet Coke", unit: "CAN" },
  { name: "Lemonade", unit: "CAN" },
  { name: "Still Water", unit: "BOTTLE" },
  { name: "Sparkling Water", unit: "BOTTLE" },
  { name: "Guinness", unit: "BOTTLE" },
  { name: "Peroni", unit: "BOTTLE" },
  { name: "Stella Artois", unit: "BOTTLE" },
  { name: "House Red Wine", unit: "ML" },
  { name: "House White Wine", unit: "ML" },
  { name: "Rosé Wine", unit: "ML" },
  { name: "Chocolate Brownie", unit: "PORTION" },
  { name: "Sticky Toffee Pudding", unit: "PORTION" },
  { name: "New York Cheesecake", unit: "PORTION" },
] as const;

// Approved recipe quantities for one menu serving.
const recipeDefinitions: Record<string, Array<{ ingredientName: string; quantity: number; unit: string }>> = {
  "Ribeye Steak Meal": [
    { ingredientName: "Ribeye steak", quantity: 0.3, unit: "KG" },
    { ingredientName: "Potatoes", quantity: 0.25, unit: "KG" },
    { ingredientName: "Coleslaw mix", quantity: 0.12, unit: "KG" },
    { ingredientName: "Butter", quantity: 20, unit: "G" },
    { ingredientName: "Cooking oil", quantity: 15, unit: "ML" },
  ],
  "Classic Sirloin Steak Meal": [
    { ingredientName: "Sirloin steak", quantity: 0.25, unit: "KG" },
    { ingredientName: "Triple-cooked chips", quantity: 0.2, unit: "KG" },
    { ingredientName: "Seasonal vegetables", quantity: 0.15, unit: "KG" },
    { ingredientName: "Cooking oil", quantity: 15, unit: "ML" },
  ],
  "Fillet Steak Meal": [
    { ingredientName: "Fillet steak", quantity: 0.22, unit: "KG" },
    { ingredientName: "Potatoes", quantity: 0.25, unit: "KG" },
    { ingredientName: "Green vegetables", quantity: 0.15, unit: "KG" },
    { ingredientName: "Butter", quantity: 20, unit: "G" },
  ],
  "T-Bone Steak Meal": [
    { ingredientName: "T-Bone steak", quantity: 0.45, unit: "KG" },
    { ingredientName: "Triple-cooked chips", quantity: 0.2, unit: "KG" },
    { ingredientName: "Onion rings", quantity: 0.15, unit: "KG" },
    { ingredientName: "Cooking oil", quantity: 15, unit: "ML" },
  ],
  "Garlic Butter Mushrooms": [
    { ingredientName: "Mushrooms", quantity: 0.18, unit: "KG" },
    { ingredientName: "Garlic butter", quantity: 25, unit: "G" },
  ],
  "Crispy Calamari": [
    { ingredientName: "Calamari", quantity: 0.18, unit: "KG" },
    { ingredientName: "Flour", quantity: 30, unit: "G" },
    { ingredientName: "Breadcrumbs", quantity: 25, unit: "G" },
    { ingredientName: "Cooking oil", quantity: 20, unit: "ML" },
  ],
  "Prawn Cocktail": [
    { ingredientName: "Prawns", quantity: 0.12, unit: "KG" },
    { ingredientName: "Cocktail sauce", quantity: 40, unit: "G" },
    { ingredientName: "Salad garnish", quantity: 30, unit: "G" },
  ],
  "Loaded Potato Skins": [
    // Use the existing potatoes stock item to avoid a separate potato-skins catalogue entry.
    { ingredientName: "Potatoes", quantity: 0.25, unit: "KG" },
    { ingredientName: "Cheese", quantity: 40, unit: "G" },
    { ingredientName: "Garlic butter", quantity: 10, unit: "G" },
  ],
  "Beef Carpaccio": [
    { ingredientName: "Beef carpaccio", quantity: 0.1, unit: "KG" },
    { ingredientName: "Salad garnish", quantity: 20, unit: "G" },
    { ingredientName: "Lemon", quantity: 0.5, unit: "PIECE" },
  ],
  "Coca-Cola": [{ ingredientName: "Coca-Cola", quantity: 1, unit: "CAN" }],
  "Diet Coke": [{ ingredientName: "Diet Coke", quantity: 1, unit: "CAN" }],
  "Lemonade": [{ ingredientName: "Lemonade", quantity: 1, unit: "CAN" }],
  "Still Water": [{ ingredientName: "Still Water", quantity: 1, unit: "BOTTLE" }],
  "Sparkling Water": [{ ingredientName: "Sparkling Water", quantity: 1, unit: "BOTTLE" }],
  "Guinness": [{ ingredientName: "Guinness", quantity: 1, unit: "BOTTLE" }],
  "Peroni": [{ ingredientName: "Peroni", quantity: 1, unit: "BOTTLE" }],
  "Stella Artois": [{ ingredientName: "Stella Artois", quantity: 1, unit: "BOTTLE" }],
  "House Red Wine": [{ ingredientName: "House Red Wine", quantity: 150, unit: "ML" }],
  "House White Wine": [{ ingredientName: "House White Wine", quantity: 150, unit: "ML" }],
  "Rosé Wine": [{ ingredientName: "Rosé Wine", quantity: 150, unit: "ML" }],
  "Chocolate Brownie": [{ ingredientName: "Chocolate Brownie", quantity: 1, unit: "PORTION" }],
  "Sticky Toffee Pudding": [{ ingredientName: "Sticky Toffee Pudding", quantity: 1, unit: "PORTION" }],
  "New York Cheesecake": [{ ingredientName: "New York Cheesecake", quantity: 1, unit: "PORTION" }],
};

// Approved opening quantity and minimum stock level for each ingredient.
const stockDefaults: Record<string, { opening: number; minimum: number }> = {
  "Ribeye steak": { opening: 12, minimum: 3 },
  "Sirloin steak": { opening: 10, minimum: 2.5 },
  "Fillet steak": { opening: 8, minimum: 2 },
  "T-Bone steak": { opening: 10, minimum: 2.5 },
  "Potatoes": { opening: 25, minimum: 6 },
  "Coleslaw mix": { opening: 8, minimum: 2 },
  "Triple-cooked chips": { opening: 15, minimum: 4 },
  "Seasonal vegetables": { opening: 10, minimum: 3 },
  "Green vegetables": { opening: 8, minimum: 2 },
  "Onion rings": { opening: 8, minimum: 2 },
  "Butter": { opening: 3000, minimum: 750 },
  "Cooking oil": { opening: 10000, minimum: 2500 },
  "Mushrooms": { opening: 8, minimum: 2 },
  "Garlic butter": { opening: 2000, minimum: 500 },
  "Calamari": { opening: 6, minimum: 1.5 },
  "Flour": { opening: 2000, minimum: 500 },
  "Breadcrumbs": { opening: 2000, minimum: 500 },
  "Prawns": { opening: 5, minimum: 1.2 },
  "Cocktail sauce": { opening: 2000, minimum: 500 },
  "Salad garnish": { opening: 3000, minimum: 750 },
  "Cheese": { opening: 2000, minimum: 500 },
  "Beef carpaccio": { opening: 3, minimum: 0.75 },
  "Lemon": { opening: 40, minimum: 10 },
  "Coca-Cola": { opening: 120, minimum: 24 },
  "Diet Coke": { opening: 120, minimum: 24 },
  "Lemonade": { opening: 96, minimum: 24 },
  "Still Water": { opening: 72, minimum: 18 },
  "Sparkling Water": { opening: 72, minimum: 18 },
  "Guinness": { opening: 48, minimum: 12 },
  "Peroni": { opening: 48, minimum: 12 },
  "Stella Artois": { opening: 48, minimum: 12 },
  "House Red Wine": { opening: 6000, minimum: 1500 },
  "House White Wine": { opening: 6000, minimum: 1500 },
  "Rosé Wine": { opening: 6000, minimum: 1500 },
  "Chocolate Brownie": { opening: 30, minimum: 8 },
  "Sticky Toffee Pudding": { opening: 30, minimum: 8 },
  "New York Cheesecake": { opening: 30, minimum: 8 },
};

// One active promotion is assigned to each branch and its eligible category.
const promotionDefinitions = [
  { branchCode: "LON001", name: "Steak Meal Special", description: "10% off all active steak meals.", categoryName: "Steak Meals", discountValue: 10 },
  { branchCode: "MAN001", name: "Appetizer Offer", description: "15% off all active appetizers.", categoryName: "Appetizers", discountValue: 15 },
  { branchCode: "LIV001", name: "Dessert Special", description: "5% off all active desserts.", categoryName: "Desserts", discountValue: 5 },
  { branchCode: "BHM001", name: "Selected Drinks Offer", description: "12% off all active drinks.", categoryName: "__ALL_DRINKS__", discountValue: 12 },
  { branchCode: "LDS001", name: "Steak Night Offer", description: "20% off all active steak meals.", categoryName: "Steak Meals", discountValue: 20 },
] as const;


// Validate existing seed-managed records before making any database changes.
async function validateExistingSeedData() {
  const errors: string[] = [];
  const branchByCode = new Map<string, { id: string; name: string }>();

  for (const expected of branches) {
    const existing = await prisma.branch.findUnique({ where: { branchCode: expected.branchCode } });
    if (!existing) continue;

    const mismatches = [
      existing.name !== expected.name ? "name" : null,
      existing.address !== expected.address ? "address" : null,
      existing.contactNumber !== expected.contactNumber ? "contact number" : null,
      existing.email !== expected.email ? "email" : null,
      existing.timeZone !== expected.timeZone ? "time zone" : null,
    ].filter(Boolean);

    if (mismatches.length) errors.push(`Branch ${expected.branchCode} has unexpected ${mismatches.join(", ")}.`);
    branchByCode.set(expected.branchCode, { id: existing.id, name: existing.name });
  }

  for (const expected of centralUsers) {
    const existing = await prisma.user.findUnique({ where: { email: expected.email } });
    if (existing && (existing.role !== expected.role || existing.branchId !== null)) {
      errors.push(`Account ${expected.email} must have role ${expected.role} and no branch assignment.`);
    }
  }

  for (const branch of branches) {
    const existingBranch = branchByCode.get(branch.branchCode);
    if (!existingBranch) continue;

    for (const employee of branchUsers) {
      const email = `${employee.prefix}.${branch.name.toLowerCase()}@steakz.com`;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && (existing.role !== employee.role || existing.branchId !== existingBranch.id)) {
        errors.push(`Account ${email} must have role ${employee.role} and be assigned to ${branch.branchCode}.`);
      }
    }

    const tables = await prisma.restaurantTable.findMany({
      where: { branchId: existingBranch.id, tableNumber: { in: ["1", "2", "3", "4", "5", "6"] } },
      select: { tableNumber: true, capacity: true },
    });
    for (const table of tables) {
      if (table.capacity !== 4) errors.push(`Table ${branch.branchCode}-${table.tableNumber} has capacity ${table.capacity}; expected 4.`);
    }
  }

  for (const expected of menuCategories) {
    const existing = await prisma.menuCategory.findUnique({ where: { name: expected.name } });
    if (existing && (existing.description !== expected.description || existing.displayOrder !== expected.displayOrder)) {
      errors.push(`Menu category "${expected.name}" differs from the seed description or display order.`);
    }
  }

  for (const expected of menuItems) {
    const category = await prisma.menuCategory.findUnique({ where: { name: expected.categoryName } });
    if (!category) continue;
    const existing = await prisma.menuItem.findUnique({
      where: { categoryId_name: { categoryId: category.id, name: expected.name } },
    });
    if (!existing) continue;

    const expectedDrinkType = "drinkType" in expected ? expected.drinkType : null;
    if (
      existing.description !== expected.description ||
      Number(existing.price) !== Number(expected.price) ||
      existing.drinkType !== expectedDrinkType ||
      existing.displayOrder !== expected.displayOrder
    ) {
      errors.push(`Menu item "${expected.name}" differs from its seed description, price, drink type or display order.`);
    }
  }

  for (const meal of fixedMealSides) {
    const category = await prisma.menuCategory.findUnique({ where: { name: "Steak Meals" } });
    if (!category) continue;
    const menuItem = await prisma.menuItem.findUnique({
      where: { categoryId_name: { categoryId: category.id, name: meal.menuItemName } },
    });
    if (!menuItem) continue;

    const existingSides = await prisma.mealSide.findMany({
      where: { menuItemId: menuItem.id },
      orderBy: { position: "asc" },
      select: { sideName: true, position: true, sideMenuItemId: true },
    });
    if (existingSides.length > 0) {
      const expectedSides = meal.sides.map((sideName, index) => ({ sideName, position: index + 1, sideMenuItemId: null }));
      if (JSON.stringify(existingSides) !== JSON.stringify(expectedSides)) {
        errors.push(`Fixed sides for "${meal.menuItemName}" do not match the two expected side names and positions.`);
      }
    }
  }

  for (const expected of ingredients) {
    const existing = await prisma.ingredient.findUnique({ where: { name: expected.name } });
    if (existing && existing.unit !== expected.unit) {
      errors.push(`Ingredient "${expected.name}" has unit ${existing.unit}; expected ${expected.unit}.`);
    }
  }

  for (const [menuItemName, expectedLines] of Object.entries(recipeDefinitions)) {
    const categoryName = menuItems.find((item) => item.name === menuItemName)?.categoryName;
    if (!categoryName) continue;
    const category = await prisma.menuCategory.findUnique({ where: { name: categoryName } });
    if (!category) continue;
    const menuItem = await prisma.menuItem.findUnique({
      where: { categoryId_name: { categoryId: category.id, name: menuItemName } },
    });
    if (!menuItem) continue;

    const recipe = await prisma.recipe.findUnique({
      where: { menuItemId: menuItem.id },
      include: { versions: { select: { versionNumber: true } } },
    });
    if (!recipe) continue;

    const version = await prisma.recipeVersion.findUnique({
      where: { recipeId_versionNumber: { recipeId: recipe.id, versionNumber: 1 } },
      include: { ingredients: { include: { ingredient: { select: { name: true, unit: true } } } } },
    });

    if (!version && recipe.versions.length > 0) {
      errors.push(`Recipe "${menuItemName}" has later versions but no version 1; review before seeding.`);
      continue;
    }
    if (!version) continue;
    if (version.status !== "PUBLISHED") {
      errors.push(`Recipe version 1 for "${menuItemName}" exists but is not PUBLISHED.`);
      continue;
    }

    const actual = version.ingredients.map((line) => ({
      name: line.ingredient.name, quantity: Number(line.quantity), unit: line.unit,
    })).sort((a, b) => a.name.localeCompare(b.name));
    const expected = expectedLines.map((line) => ({
      name: line.ingredientName, quantity: line.quantity, unit: line.unit,
    })).sort((a, b) => a.name.localeCompare(b.name));

    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(`Published recipe version 1 for "${menuItemName}" differs from the seed recipe.`);
    }
  }

  for (const branch of branches) {
    const existingBranch = branchByCode.get(branch.branchCode);
    if (!existingBranch) continue;

    for (const ingredient of ingredients) {
      const existingIngredient = await prisma.ingredient.findUnique({ where: { name: ingredient.name }, select: { id: true } });
      if (!existingIngredient) continue;

      const idempotencyKey = `SEED_OPENING_${branch.branchCode}_${ingredient.name.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`;
      const [inventory, movement] = await Promise.all([
        prisma.branchInventory.findUnique({
          where: { branchId_ingredientId: { branchId: existingBranch.id, ingredientId: existingIngredient.id } },
          select: { id: true },
        }),
        prisma.inventoryTransaction.findUnique({
          where: { branchId_idempotencyKey: { branchId: existingBranch.id, idempotencyKey } },
          select: { id: true },
        }),
      ]);
      if (!inventory && movement) {
        errors.push(`Opening inventory movement exists without its inventory record for ${branch.branchCode} / ${ingredient.name}.`);
      }
    }
  }

  for (const definition of promotionDefinitions) {
    const existing = await prisma.promotion.findFirst({
      where: { name: definition.name },
      include: { branches: true, items: true },
    });
    if (!existing) continue;

    const branch = branchByCode.get(definition.branchCode);
    if (!branch) continue;

    const eligibleItems = await prisma.menuItem.findMany({
      where: {
        isActive: true,
        category: {
          isActive: true,
          ...(definition.categoryName === "__ALL_DRINKS__"
            ? { name: { in: ["Soft Drinks", "Beer", "Wine"] } }
            : { name: definition.categoryName }),
        },
      },
      select: { id: true },
    });

    const actualBranchIds = existing.branches.map((entry) => entry.branchId).sort();
    const expectedBranchIds = [branch.id].sort();
    const actualItemIds = existing.items.map((entry) => entry.menuItemId).sort();
    const expectedItemIds = eligibleItems.map((entry) => entry.id).sort();

    if (
      existing.description !== definition.description ||
      existing.discountType !== "PERCENTAGE" ||
      Number(existing.discountValue) !== definition.discountValue ||
      JSON.stringify(actualBranchIds) !== JSON.stringify(expectedBranchIds) ||
      JSON.stringify(actualItemIds) !== JSON.stringify(expectedItemIds)
    ) {
      errors.push(`Existing promotion "${definition.name}" differs from its expected description, discount or branch/menu links.`);
    }
  }

  if (errors.length) {
    throw new Error(`Seed preflight validation failed. No seed writes have been made.\n- ${errors.join("\n- ")}`);
  }
  console.log("Preflight validation passed. Existing seed-managed records are consistent.");
}


// Create missing branches, tables, accounts and menu configuration.
async function seedDatabase() {
  console.log("Starting Steakz RMIS database seeding...");
  await validateExistingSeedData();

  // Create branches first so employee accounts can reference them.
  const createdBranches = [];

  for (const branch of branches) {
    const result = await prisma.branch.upsert({
      where: { branchCode: branch.branchCode },
      // Preserve existing branch details and activation status on reruns.
      update: {},
      create: { ...branch },
    });

    createdBranches.push(result);
    console.log(`Branch ready: ${result.name}`);
  }

  // Create six four-seat tables for every branch.
  for (const branch of createdBranches) {
    for (let tableNumber = 1; tableNumber <= 6; tableNumber++) {
      await prisma.restaurantTable.upsert({
        where: {
          branchId_tableNumber: {
            branchId: branch.id,
            tableNumber: String(tableNumber),
          },
        },
        // Preserve existing table configuration on reruns.
        update: {},
        create: {
          branchId: branch.id,
          tableNumber: String(tableNumber),
          capacity: 4,
          status: "AVAILABLE",
        },
      });
    }

    console.log(`Six tables ready: ${branch.name}`);
  }

  // Create the central Admin and Headquarters Manager accounts.
  for (const user of centralUsers) {
    const passwordHash = await hashPassword(user.password);

    await prisma.user.upsert({
      where: { email: user.email },
      // Preserve existing account details, credentials and activation status.
      update: {},
      create: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        passwordHash,
        role: user.role,
        branchId: null,
      },
    });

    console.log(`Central account ready: ${user.email}`);
  }

  // Create a Branch Manager, Server and Cook for every branch.
  for (const branch of createdBranches) {
    const branchName = branch.name.toLowerCase();

    for (const employee of branchUsers) {
      const email = `${employee.prefix}.${branchName}@steakz.com`;
      const password = `${employee.passwordPrefix}${branchName}123`;
      const passwordHash = await hashPassword(password);

      await prisma.user.upsert({
        where: { email },
        // Preserve existing account details, credentials and activation status.
        update: {},
        create: {
          firstName: employee.firstName,
          lastName: `${employee.lastName} - ${branch.name}`,
          email,
          passwordHash,
          role: employee.role,
          branchId: branch.id,
        },
      });

      console.log(`Branch account ready: ${email}`);
    }
  }

  // Create or update the six menu categories.
  const categoryRecords = new Map<string, string>();

  for (const category of menuCategories) {
    const result = await prisma.menuCategory.upsert({
      where: { name: category.name },
      // Preserve existing category details on reruns.
      update: {},
      create: {
        ...category,
      },
    });

    categoryRecords.set(result.name, result.id);
    console.log(`Menu category ready: ${result.name}`);
  }

  // Create or update menu items using their category and name.
  const menuItemRecords = new Map<string, string>();

  for (const item of menuItems) {
    const categoryId = categoryRecords.get(item.categoryName);

    if (!categoryId) {
      throw new Error(`Menu category not found: ${item.categoryName}`);
    }

    const drinkType = "drinkType" in item ? item.drinkType : null;

    const result = await prisma.menuItem.upsert({
      where: {
        categoryId_name: {
          categoryId,
          name: item.name,
        },
      },
      // Preserve existing menu details and activation status on reruns.
      update: {},
      create: {
        categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        drinkType,
        displayOrder: item.displayOrder,
      },
    });

    menuItemRecords.set(result.name, result.id);
    console.log(`Menu item ready: ${result.name}`);
  }

  // Configure the two fixed side-name snapshots for each steak meal.
  for (const meal of fixedMealSides) {
    const menuItemId = menuItemRecords.get(meal.menuItemName);

    if (!menuItemId) {
      throw new Error(`Steak meal not found: ${meal.menuItemName}`);
    }

    for (let index = 0; index < meal.sides.length; index++) {
      await prisma.mealSide.upsert({
        where: {
          menuItemId_position: {
            menuItemId,
            position: index + 1,
          },
        },
        // Preserve existing fixed-side configuration on reruns.
        update: {},
        create: {
          menuItemId,
          sideName: meal.sides[index],
          position: index + 1,
          sideMenuItemId: null,
        },
      });
    }

    console.log(`Two fixed sides ready: ${meal.menuItemName}`);
  }

  // Make every seeded menu item available at all five branches if no record exists.
  for (const branch of createdBranches) {
    for (const menuItemId of menuItemRecords.values()) {
      await prisma.branchMenuAvailability.upsert({
        where: {
          branchId_menuItemId: {
            branchId: branch.id,
            menuItemId,
          },
        },
        // Preserve any branch-level availability changes already made.
        update: {},
        create: {
          branchId: branch.id,
          menuItemId,
          isAvailable: true,
        },
      });
    }

    console.log(`Menu availability checked: ${branch.name}`);
  }

  // Create the central ingredient catalogue without changing existing activation settings.
  const ingredientRecords = new Map<string, { id: string; unit: string }>();

  for (const ingredient of ingredients) {
    const result = await prisma.ingredient.upsert({
      where: { name: ingredient.name },
      update: {},
      create: { name: ingredient.name, unit: ingredient.unit as never },
    });
    if (result.unit !== ingredient.unit) {
      throw new Error(`Ingredient unit mismatch for ${ingredient.name}: catalogue ${result.unit}, seed ${ingredient.unit}`);
    }
    ingredientRecords.set(result.name, { id: result.id, unit: result.unit });
  }

  // Publish the initial recipe version only when it does not already exist.
  const headquartersManager = await prisma.user.findUniqueOrThrow({
    where: { email: "hqmanager@steakz.com" },
    select: { id: true },
  });

  for (const [menuItemName, recipeLines] of Object.entries(recipeDefinitions)) {
    const menuItemId = menuItemRecords.get(menuItemName);
    if (!menuItemId) throw new Error(`Menu item missing for recipe: ${menuItemName}`);

    const recipe = await prisma.recipe.upsert({
      where: { menuItemId },
      update: {},
      create: { menuItemId },
    });

    const recipeVersion = await prisma.recipeVersion.upsert({
      where: { recipeId_versionNumber: { recipeId: recipe.id, versionNumber: 1 } },
      update: {},
      create: {
        recipeId: recipe.id,
        versionNumber: 1,
        status: "PUBLISHED",
        createdByUserId: headquartersManager.id,
        publishedAt: new Date(),
      },
      include: {
        ingredients: {
          include: { ingredient: { select: { name: true, unit: true } } },
        },
      },
    });

    if (recipeVersion.status !== "PUBLISHED") {
      throw new Error(`Recipe version 1 for ${menuItemName} exists but is not PUBLISHED. Review it before seeding.`);
    }

    // Validate existing recipe lines; only create them when the version is empty.
    const existingLines = recipeVersion.ingredients.map((line) => ({
      name: line.ingredient.name,
      quantity: Number(line.quantity),
      unit: line.unit,
    })).sort((a, b) => a.name.localeCompare(b.name));
    const expectedLines = recipeLines.map((line) => ({
      name: line.ingredientName,
      quantity: line.quantity,
      unit: line.unit,
    })).sort((a, b) => a.name.localeCompare(b.name));

    if (existingLines.length === 0) {
      for (const line of recipeLines) {
        const ingredient = ingredientRecords.get(line.ingredientName);
        if (!ingredient) throw new Error(`Ingredient missing for recipe: ${line.ingredientName}`);
        if (ingredient.unit !== line.unit) {
          throw new Error(`Unit mismatch for ${line.ingredientName}: catalogue ${ingredient.unit}, recipe ${line.unit}`);
        }
        await prisma.recipeIngredient.create({
          data: {
            recipeVersionId: recipeVersion.id,
            ingredientId: ingredient.id,
            quantity: line.quantity,
            unit: line.unit as never,
          },
        });
      }
    } else if (JSON.stringify(existingLines) !== JSON.stringify(expectedLines)) {
      throw new Error(`Existing published recipe version 1 for ${menuItemName} differs from the approved recipe. It was not changed.`);
    }
  }

  // Create opening stock only for branch/ingredient pairs with no inventory record.
  for (const branch of createdBranches) {
    for (const ingredient of ingredients) {
      const ingredientRecord = ingredientRecords.get(ingredient.name);
      const defaults = stockDefaults[ingredient.name];
      if (!ingredientRecord || !defaults) {
        throw new Error(`Missing ingredient or stock defaults: ${ingredient.name}`);
      }

      await prisma.$transaction(async (tx) => {
        const existingInventory = await tx.branchInventory.findUnique({
          where: {
            branchId_ingredientId: {
              branchId: branch.id,
              ingredientId: ingredientRecord.id,
            },
          },
        });
        if (existingInventory) return;

        const idempotencyKey = `SEED_OPENING_${branch.branchCode}_${ingredient.name.replace(/[^A-Za-z0-9]+/g, "_").toUpperCase()}`;
        const existingMovement = await tx.inventoryTransaction.findUnique({
          where: { branchId_idempotencyKey: { branchId: branch.id, idempotencyKey } },
        });
        if (existingMovement) {
          throw new Error(`Opening movement exists without matching inventory for ${branch.branchCode} / ${ingredient.name}. Review before continuing.`);
        }

        const counter = await tx.referenceCounter.upsert({
          where: {
            branchId_referenceType: {
              branchId: branch.id,
              referenceType: "INVENTORY_TRANSACTION",
            },
          },
          create: { branchId: branch.id, referenceType: "INVENTORY_TRANSACTION", lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
          select: { lastNumber: true },
        });
        const referenceNumber = `${branch.branchCode}${String(counter.lastNumber).padStart(4, "0")}`;

        await tx.branchInventory.create({
          data: {
            branchId: branch.id,
            ingredientId: ingredientRecord.id,
            quantityOnHand: defaults.opening,
            minimumStockLevel: defaults.minimum,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            referenceNumber,
            referenceType: "INVENTORY_TRANSACTION",
            idempotencyKey,
            branchId: branch.id,
            ingredientId: ingredientRecord.id,
            transactionType: "OPENING_BALANCE",
            quantityChange: defaults.opening,
            previousQuantity: 0,
            newQuantity: defaults.opening,
            reason: "Initial branch stock created by the approved database seed.",
            notes: "System-generated opening balance; existing branch stock is never overwritten.",
            actorType: "SYSTEM",
          },
        });

        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            branchId: branch.id,
            action: "OPENING_INVENTORY_CREATED",
            entityType: "BranchInventory",
            entityId: `${branch.id}:${ingredientRecord.id}`,
            details: {
              ingredientName: ingredient.name,
              quantity: defaults.opening,
              minimumStockLevel: defaults.minimum,
              unit: ingredient.unit,
              referenceNumber,
            },
          },
        });
      });
    }
    console.log(`Opening inventory checked: ${branch.name}`);
  }

  // Create each approved branch promotion once; never replace an existing promotion.
  const promotionStart = new Date();
  const promotionEnd = new Date(promotionStart);
  promotionEnd.setMonth(promotionEnd.getMonth() + 1);

  for (const definition of promotionDefinitions) {
    const branch = createdBranches.find((item) => item.branchCode === definition.branchCode);
    if (!branch) throw new Error(`Promotion branch not found: ${definition.branchCode}`);

    const existingPromotion = await prisma.promotion.findFirst({
      where: { name: definition.name },
      include: { branches: true, items: true },
    });

    const eligibleItems = await prisma.menuItem.findMany({
      where: {
        isActive: true,
        category: {
          isActive: true,
          ...(definition.categoryName === "__ALL_DRINKS__"
            ? { name: { in: ["Soft Drinks", "Beer", "Wine"] } }
            : { name: definition.categoryName }),
        },
      },
      select: { id: true },
    });

    if (existingPromotion) {
      const existingBranchIds = existingPromotion.branches.map((entry) => entry.branchId).sort();
      const expectedBranchIds = [branch.id].sort();
      const existingItemIds = existingPromotion.items.map((entry) => entry.menuItemId).sort();
      const expectedItemIds = eligibleItems.map((item) => item.id).sort();

      if (
        existingPromotion.discountType !== "PERCENTAGE" ||
        Number(existingPromotion.discountValue) !== definition.discountValue ||
        JSON.stringify(existingBranchIds) !== JSON.stringify(expectedBranchIds) ||
        JSON.stringify(existingItemIds) !== JSON.stringify(expectedItemIds)
      ) {
        throw new Error(`Existing promotion "${definition.name}" differs from the approved setup. It was not changed.`);
      }
      continue;
    }

    await prisma.promotion.create({
      data: {
        name: definition.name,
        description: definition.description,
        discountType: "PERCENTAGE",
        discountValue: definition.discountValue,
        startDate: promotionStart,
        endDate: promotionEnd,
        isActive: true,
        branches: { create: { branchId: branch.id } },
        items: { create: eligibleItems.map((item) => ({ menuItemId: item.id })) },
      },
    });
  }

  // Add four realistic demo orders per branch, once, without replacing existing orders.
  const demoOrderStatuses = ["NEW", "PREPARING", "READY", "COMPLETED"] as const;
  const demoOrderMarker = "SEED_DEMO_ORDER_V1";
  // Vary meals, sides, drinks, starters and desserts across branches and order statuses.
  const demoOrderPlans = [
    [
      { items: [{ name: "Classic Sirloin Steak Meal", quantity: 1 }, { name: "Diet Coke", quantity: 2 }] },
      { items: [{ name: "Ribeye Steak Meal", quantity: 1 }, { name: "Garlic Butter Mushrooms", quantity: 1 }, { name: "Lemonade", quantity: 1 }] },
      { items: [{ name: "Fillet Steak Meal", quantity: 1 }, { name: "Still Water", quantity: 1 }, { name: "Chocolate Brownie", quantity: 1 }] },
      { items: [{ name: "T-Bone Steak Meal", quantity: 1 }, { name: "Guinness", quantity: 1 }, { name: "Loaded Potato Skins", quantity: 1 }] },
    ],
    [
      { items: [{ name: "Fillet Steak Meal", quantity: 1 }, { name: "Sparkling Water", quantity: 1 }, { name: "Prawn Cocktail", quantity: 1 }] },
      { items: [{ name: "T-Bone Steak Meal", quantity: 1 }, { name: "Peroni", quantity: 2 }] },
      { items: [{ name: "Ribeye Steak Meal", quantity: 1 }, { name: "Coca-Cola", quantity: 1 }, { name: "Sticky Toffee Pudding", quantity: 1 }] },
      { items: [{ name: "Classic Sirloin Steak Meal", quantity: 1 }, { name: "House Red Wine", quantity: 1 }, { name: "Crispy Calamari", quantity: 1 }] },
    ],
    [
      { items: [{ name: "T-Bone Steak Meal", quantity: 1 }, { name: "Stella Artois", quantity: 1 }, { name: "Beef Carpaccio", quantity: 1 }] },
      { items: [{ name: "Classic Sirloin Steak Meal", quantity: 1 }, { name: "Lemonade", quantity: 1 }, { name: "Loaded Potato Skins", quantity: 1 }] },
      { items: [{ name: "Fillet Steak Meal", quantity: 1 }, { name: "Diet Coke", quantity: 1 }, { name: "New York Cheesecake", quantity: 1 }] },
      { items: [{ name: "Ribeye Steak Meal", quantity: 1 }, { name: "House White Wine", quantity: 1 }, { name: "Garlic Butter Mushrooms", quantity: 1 }] },
    ],
    [
      { items: [{ name: "Ribeye Steak Meal", quantity: 1 }, { name: "Still Water", quantity: 1 }, { name: "Crispy Calamari", quantity: 1 }] },
      { items: [{ name: "Fillet Steak Meal", quantity: 1 }, { name: "Rosé Wine", quantity: 1 }] },
      { items: [{ name: "Classic Sirloin Steak Meal", quantity: 1 }, { name: "Coca-Cola", quantity: 2 }, { name: "Chocolate Brownie", quantity: 1 }] },
      { items: [{ name: "T-Bone Steak Meal", quantity: 1 }, { name: "Sparkling Water", quantity: 1 }, { name: "Prawn Cocktail", quantity: 1 }] },
    ],
    [
      { items: [{ name: "Classic Sirloin Steak Meal", quantity: 1 }, { name: "Guinness", quantity: 1 }, { name: "Sticky Toffee Pudding", quantity: 1 }] },
      { items: [{ name: "Ribeye Steak Meal", quantity: 1 }, { name: "Peroni", quantity: 1 }, { name: "Beef Carpaccio", quantity: 1 }] },
      { items: [{ name: "T-Bone Steak Meal", quantity: 1 }, { name: "Diet Coke", quantity: 1 }, { name: "New York Cheesecake", quantity: 1 }] },
      { items: [{ name: "Fillet Steak Meal", quantity: 1 }, { name: "House Red Wine", quantity: 1 }, { name: "Garlic Butter Mushrooms", quantity: 1 }] },
    ],
  ] as const;
  const orderMenuNames = [...new Set(demoOrderPlans.flatMap((branchPlan) => branchPlan.flatMap((plan) => plan.items.map((item) => item.name))))];
  const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

  const existingDemoOrders = await prisma.order.findMany({
    where: { statusHistory: { some: { note: { startsWith: demoOrderMarker } } } },
    include: { statusHistory: { where: { note: { startsWith: demoOrderMarker } }, select: { note: true } } },
  });
  const existingDemoKeys = new Set<string>();
  for (const order of existingDemoOrders) {
    const marker = order.statusHistory[0]?.note;
    const status = marker?.slice(`${demoOrderMarker}:`.length);
    if (!status || !demoOrderStatuses.includes(status as typeof demoOrderStatuses[number])) {
      throw new Error(`A seeded demo order has an unexpected marker: ${order.orderNumber}`);
    }
    const key = `${order.branchId}:${status}`;
    if (existingDemoKeys.has(key)) {
      throw new Error(`Duplicate seeded demo order found for ${order.branchId} / ${status}. No demo orders were added.`);
    }
    existingDemoKeys.add(key);
  }

  const seededDemoOrderCountBefore = existingDemoOrders.length;
  const demoMenuItems = await prisma.menuItem.findMany({
    where: { name: { in: [...orderMenuNames] }, isActive: true, category: { isActive: true } },
    include: {
      category: true,
      configuredSides: { orderBy: { position: "asc" } },
      recipe: {
        include: {
          versions: {
            where: { status: "PUBLISHED" },
            orderBy: { versionNumber: "desc" },
            take: 1,
            include: { ingredients: { include: { ingredient: true } } },
          },
        },
      },
    },
  });
  const demoMenuByName = new Map(demoMenuItems.map((item) => [item.name, item]));
  for (const menuName of orderMenuNames) {
    if (!demoMenuByName.has(menuName)) throw new Error(`Demo order menu item is missing or inactive: ${menuName}`);
  }

  const demoNow = new Date();
  for (let branchIndex = 0; branchIndex < createdBranches.length; branchIndex++) {
    const branch = createdBranches[branchIndex];
    if (!branch.isActive) throw new Error(`Cannot seed demo orders for inactive branch ${branch.branchCode}.`);

    const [server, cook, recipients, tables] = await Promise.all([
      prisma.user.findFirst({ where: { email: `server.${branch.name.toLowerCase()}@steakz.com`, branchId: branch.id, role: "SERVER", isActive: true } }),
      prisma.user.findFirst({ where: { email: `cook.${branch.name.toLowerCase()}@steakz.com`, branchId: branch.id, role: "COOK", isActive: true } }),
      prisma.user.findMany({ where: { branchId: branch.id, isActive: true, role: { in: ["COOK", "BRANCH_MANAGER"] } }, select: { id: true } }),
      prisma.restaurantTable.findMany({ where: { branchId: branch.id, tableNumber: { in: ["1", "2", "3", "4"] } } }),
    ]);
    if (!server || !cook) throw new Error(`Active demo Server and Cook accounts are required for ${branch.branchCode}.`);

    const tableByNumber = new Map(tables.map((table) => [table.tableNumber, table]));
    for (const [statusIndex, status] of demoOrderStatuses.entries()) {
      const demoKey = `${branch.id}:${status}`;
      if (existingDemoKeys.has(demoKey)) continue;

      const tableNumber = String(statusIndex + 1);
      const table = tableByNumber.get(tableNumber);
      if (!table || table.status === "INACTIVE") {
        throw new Error(`Active table ${tableNumber} is required at ${branch.branchCode} for the ${status} demo order.`);
      }

      const activeUnpaidOrder = await prisma.order.findFirst({
        where: {
          tableId: table.id,
          status: { in: ["NEW", "PREPARING", "READY", "COMPLETED"] },
          payments: { none: { status: "SUCCESSFUL" } },
        },
        select: { id: true, orderNumber: true },
      });
      if (activeUnpaidOrder) {
        throw new Error(`Table ${tableNumber} at ${branch.branchCode} already has an unpaid active order (${activeUnpaidOrder.orderNumber}). Demo orders were not added for this table.`);
      }

      const builtLines: Array<{
        menuItem: (typeof demoMenuItems)[number];
        recipeVersion: NonNullable<(typeof demoMenuItems)[number]["recipe"]>["versions"][number];
        quantity: number;
        lineSubtotal: number;
        promotion: any;
        discount: number;
        lineTotal: number;
      }> = [];
      let subtotal = 0;
      let discountTotal = 0;
      const ingredientNeeds = new Map<string, { quantity: number; unit: string; name: string }>();

      const orderPlan = demoOrderPlans[branchIndex]?.[statusIndex];
      if (!orderPlan) throw new Error(`No demo order plan is configured for ${branch.branchCode} / ${status}.`);

      for (const plannedItem of orderPlan.items) {
        const menuName = plannedItem.name;
        const quantity = plannedItem.quantity;
        const menuItem = demoMenuByName.get(menuName)!;
        const availability = await prisma.branchMenuAvailability.findUnique({
          where: { branchId_menuItemId: { branchId: branch.id, menuItemId: menuItem.id } },
        });
        if (!availability?.isAvailable || availability.isBlockedByStock || availability.requiresReactivationConfirmation) {
          throw new Error(`${menuName} is not available at ${branch.branchCode}; the demo order was not created.`);
        }
        const recipeVersion = menuItem.recipe?.versions[0];
        if (!recipeVersion) throw new Error(`No published recipe version is available for ${menuName}.`);
        if (menuItem.category.name === "Steak Meals" && menuItem.configuredSides.length !== 2) {
          throw new Error(`${menuName} must have exactly two configured sides before demo orders can be created.`);
        }

        for (const recipeLine of recipeVersion.ingredients) {
          if (!recipeLine.ingredient.isActive || recipeLine.unit !== recipeLine.ingredient.unit) {
            throw new Error(`Recipe ingredient configuration is invalid for ${recipeLine.ingredient.name}.`);
          }
          const current = ingredientNeeds.get(recipeLine.ingredientId);
          ingredientNeeds.set(recipeLine.ingredientId, {
            quantity: (current?.quantity ?? 0) + Number(recipeLine.quantity) * quantity,
            unit: recipeLine.unit,
            name: recipeLine.ingredient.name,
          });
        }

        const unitPrice = Number(menuItem.price);
        const lineSubtotal = money(unitPrice * quantity);
        const eligiblePromotions = await prisma.promotion.findMany({
          where: {
            isActive: true,
            startDate: { lte: demoNow },
            endDate: { gte: demoNow },
            branches: { some: { branchId: branch.id } },
            items: { some: { menuItemId: menuItem.id } },
          },
          orderBy: { createdAt: "asc" },
        });
        let bestPromotion: any = null;
        let bestDiscount = 0;
        for (const promotion of eligiblePromotions) {
          const value = Number(promotion.discountValue);
          if (promotion.discountType === "PERCENTAGE" && (value <= 0 || value > 50)) continue;
          if (promotion.discountType === "FIXED_AMOUNT" && (value <= 0 || value > unitPrice)) continue;
          const saving = promotion.discountType === "PERCENTAGE"
            ? money(lineSubtotal * value / 100)
            : money(Math.min(value * quantity, lineSubtotal));
          if (saving > bestDiscount) {
            bestPromotion = promotion;
            bestDiscount = saving;
          }
        }

        builtLines.push({
          menuItem,
          recipeVersion,
          quantity,
          lineSubtotal,
          promotion: bestPromotion,
          discount: bestDiscount,
          lineTotal: money(lineSubtotal - bestDiscount),
        });
        subtotal = money(subtotal + lineSubtotal);
        discountTotal = money(discountTotal + bestDiscount);
      }

      const taxableTotal = Math.max(0, money(subtotal - discountTotal));
      const taxTotal = money(taxableTotal * 0.20 / 1.20);
      const totalAmount = taxableTotal;
      const createdAt = new Date(demoNow.getTime() - statusIndex * 15 * 60 * 1000);
      const statusEvents: Array<{
        previousStatus: "NEW" | "PREPARING" | "READY" | null;
        newStatus: "NEW" | "PREPARING" | "READY" | "COMPLETED";
        changedByUserId: string;
        changedAt: Date;
        note: string;
      }> = [
        { previousStatus: null, newStatus: "NEW", changedByUserId: server.id, changedAt: createdAt, note: `${demoOrderMarker}:${status}` },
      ];
      if (statusIndex >= 1) {
        statusEvents.push({ previousStatus: "NEW", newStatus: "PREPARING", changedByUserId: cook.id, changedAt: new Date(createdAt.getTime() + 2 * 60 * 1000), note: "Order accepted by kitchen" });
      }
      if (statusIndex >= 2) {
        statusEvents.push({ previousStatus: "PREPARING", newStatus: "READY", changedByUserId: cook.id, changedAt: new Date(createdAt.getTime() + 5 * 60 * 1000), note: "Order ready for collection" });
      }
      if (statusIndex >= 3) {
        statusEvents.push({ previousStatus: "READY", newStatus: "COMPLETED", changedByUserId: server.id, changedAt: new Date(createdAt.getTime() + 8 * 60 * 1000), note: "Order served and completed" });
      }

      await prisma.$transaction(async (tx) => {
        const branchRecord = await tx.branch.findUnique({ where: { id: branch.id }, select: { branchCode: true } });
        if (!branchRecord) throw new Error(`Branch not found: ${branch.branchCode}`);
        const orderCounter = await tx.referenceCounter.upsert({
          where: { branchId_referenceType: { branchId: branch.id, referenceType: "ORDER" } },
          create: { branchId: branch.id, referenceType: "ORDER", lastNumber: 1 },
          update: { lastNumber: { increment: 1 } },
          select: { lastNumber: true },
        });
        const orderNumber = `${branchRecord.branchCode}${String(orderCounter.lastNumber).padStart(4, "0")}`;

        const order = await tx.order.create({
          data: {
            orderNumber,
            branchId: branch.id,
            tableId: table.id,
            serverId: server.id,
            status,
            subtotal,
            discountTotal,
            taxTotal,
            totalAmount,
            createdAt,
            ...(status === "COMPLETED" ? { completedAt: new Date(createdAt.getTime() + 8 * 60 * 1000) } : {}),
            items: {
              create: builtLines.map((line) => ({
                menuItemId: line.menuItem.id,
                menuItemNameSnapshot: line.menuItem.name,
                unitPriceSnapshot: line.menuItem.price,
                quantity: line.quantity,
                lineSubtotal: line.lineSubtotal,
                promotionId: line.promotion?.id ?? null,
                promotionNameSnapshot: line.promotion?.name ?? null,
                promotionDiscountTypeSnapshot: line.promotion?.discountType ?? null,
                promotionDiscountValueSnapshot: line.promotion?.discountValue ?? null,
                promotionDiscountAmount: line.discount,
                lineTotal: line.lineTotal,
                recipeVersionId: line.recipeVersion.id,
                sides: {
                  create: line.menuItem.configuredSides.map((side) => ({
                    sourceMealSideId: side.id,
                    sideNameSnapshot: side.sideName,
                    quantity: line.quantity,
                  })),
                },
              })),
            },
            statusHistory: { create: statusEvents },
          },
        });

        // Deduct each recipe ingredient and record the matching stock movement.
        for (const [ingredientId, need] of ingredientNeeds) {
          const inventory = await tx.branchInventory.findUnique({
            where: { branchId_ingredientId: { branchId: branch.id, ingredientId } },
            select: { quantityOnHand: true, minimumStockLevel: true },
          });
          const previous = Number(inventory?.quantityOnHand ?? 0);
          const next = previous - need.quantity;
          if (next < 0) throw new Error(`Insufficient ${need.name} stock at ${branch.branchCode} for the demo order.`);
          const updated = await tx.branchInventory.upsert({
            where: { branchId_ingredientId: { branchId: branch.id, ingredientId } },
            create: { branchId: branch.id, ingredientId, quantityOnHand: next },
            update: { quantityOnHand: next },
            select: { quantityOnHand: true, minimumStockLevel: true },
          });
          const inventoryCounter = await tx.referenceCounter.upsert({
            where: { branchId_referenceType: { branchId: branch.id, referenceType: "INVENTORY_TRANSACTION" } },
            create: { branchId: branch.id, referenceType: "INVENTORY_TRANSACTION", lastNumber: 1 },
            update: { lastNumber: { increment: 1 } },
            select: { lastNumber: true },
          });
          await tx.inventoryTransaction.create({
            data: {
              referenceNumber: `${branchRecord.branchCode}${String(inventoryCounter.lastNumber).padStart(4, "0")}`,
              referenceType: "INVENTORY_TRANSACTION",
              branchId: branch.id,
              ingredientId,
              transactionType: "ORDER_DEDUCTION",
              quantityChange: -need.quantity,
              previousQuantity: previous,
              newQuantity: next,
              reason: `Order ${order.orderNumber} submitted (demo seed)`,
              createdByUserId: server.id,
              actorType: "USER",
              orderId: order.id,
              createdAt,
            },
          });

          const alertType = Number(updated.quantityOnHand) <= 0
            ? "OUT_OF_STOCK"
            : Number(updated.quantityOnHand) <= Number(updated.minimumStockLevel)
              ? "LOW_STOCK"
              : null;
          const openAlerts = await tx.inventoryAlert.findMany({
            where: { branchId: branch.id, ingredientId, resolvedAt: null },
            select: { id: true },
          });
          if (!alertType && openAlerts.length) {
            await tx.inventoryAlert.updateMany({ where: { id: { in: openAlerts.map((alert) => alert.id) } }, data: { resolvedAt: demoNow } });
          } else if (alertType && openAlerts.length) {
            await tx.inventoryAlert.update({ where: { id: openAlerts[0].id }, data: { alertType } });
            if (openAlerts.length > 1) {
              await tx.inventoryAlert.updateMany({ where: { id: { in: openAlerts.slice(1).map((alert) => alert.id) } }, data: { resolvedAt: demoNow } });
            }
          } else if (alertType) {
            await tx.inventoryAlert.create({ data: { branchId: branch.id, ingredientId, alertType } });
          }
        }

        await tx.restaurantTable.update({ where: { id: table.id }, data: { status: status === "COMPLETED" ? "AVAILABLE" : "OCCUPIED" } });
        await tx.auditLog.create({
          data: {
            userId: server.id,
            actorType: "USER",
            branchId: branch.id,
            action: "ORDER_CREATED",
            entityType: "Order",
            entityId: order.id,
            details: { orderNumber: order.orderNumber, itemCount: builtLines.length, totalAmount: String(totalAmount), seededDemoOrder: true },
            createdAt,
          },
        });
        for (const event of statusEvents.slice(1)) {
          await tx.auditLog.create({
            data: {
              userId: event.changedByUserId,
              actorType: "USER",
              branchId: branch.id,
              action: "ORDER_STATUS_CHANGED",
              entityType: "Order",
              entityId: order.id,
              details: { orderNumber: order.orderNumber, previousStatus: event.previousStatus, newStatus: event.newStatus },
              createdAt: event.changedAt,
            },
          });
        }
        if (recipients.length) {
          await tx.notification.createMany({
            data: recipients.map((recipient) => ({
              userId: recipient.id,
              branchId: branch.id,
              title: "New order received",
              message: `Order ${order.orderNumber} has been submitted and is ready for the kitchen queue.`,
              type: "NEW_ORDER",
              createdAt,
            })),
          });
        }

        if (status === "COMPLETED") {
          const paymentMethod = branchIndex % 2 === 0 ? "CASH" : "CARD";
          const paymentReference = `PAY-${branchRecord.branchCode}-${randomUUID()}`;
          const payment = await tx.payment.create({
            data: {
              orderId: order.id,
              paymentReference,
              amount: totalAmount,
              paymentMethod,
              status: "SUCCESSFUL",
              processedByUserId: server.id,
            },
          });
          await tx.auditLog.create({
            data: {
              userId: server.id,
              actorType: "USER",
              branchId: branch.id,
              action: "PAYMENT_RECORDED",
              entityType: "Payment",
              entityId: payment.id,
              details: {
                orderId: order.id,
                orderNumber: order.orderNumber,
                paymentReference: payment.paymentReference,
                amount: payment.amount.toString(),
                paymentMethod: payment.paymentMethod,
                seededDemoPayment: true,
              },
            },
          });
        }
      }, { isolationLevel: "Serializable" });

      existingDemoKeys.add(demoKey);
      console.log(`Demo order ready: ${branch.branchCode} / ${status}`);
    }
  }

  const seededDemoOrderCountAfter = await prisma.order.count({
    where: { statusHistory: { some: { note: { startsWith: demoOrderMarker } } } },
  });
  console.log(`Demo orders checked: ${seededDemoOrderCountAfter} total (${seededDemoOrderCountAfter - seededDemoOrderCountBefore} added this run).`);

  console.log("\nSteakz RMIS database seeding completed!");
  console.log("Created or verified 5 branches, 30 tables, 17 demo accounts, 6 categories, 23 menu items, recipes, opening inventory, 5 branch promotions and 20 varied demo orders.");
  console.log("Existing branch, table, account, menu, recipe, inventory and order data are preserved on reruns.");
}

// Run the seed and always disconnect from PostgreSQL.
seedDatabase()
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });