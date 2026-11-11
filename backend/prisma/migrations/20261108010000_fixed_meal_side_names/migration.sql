-- Preserve existing side labels before allowing new name-only fixed sides.
ALTER TABLE "MealSide" ADD COLUMN "sideName" TEXT;

UPDATE "MealSide" AS meal_side
SET "sideName" = menu_item."name"
FROM "MenuItem" AS menu_item
WHERE meal_side."sideMenuItemId" = menu_item."id";

ALTER TABLE "MealSide" ALTER COLUMN "sideName" SET NOT NULL;
ALTER TABLE "MealSide" ALTER COLUMN "sideMenuItemId" DROP NOT NULL;
