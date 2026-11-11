-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HEADQUARTERS_MANAGER', 'BRANCH_MANAGER', 'SERVER', 'COOK');

-- CreateEnum
CREATE TYPE "TableStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DrinkType" AS ENUM ('SOFT_DRINK', 'BEER', 'WINE');

-- CreateEnum
CREATE TYPE "RecipeVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('G', 'KG', 'ML', 'L', 'CAN', 'BOTTLE', 'GLASS', 'PIECE', 'PORTION');

-- CreateEnum
CREATE TYPE "InventoryTransactionType" AS ENUM ('OPENING_BALANCE', 'RECEIVING', 'WASTAGE', 'CORRECTION_INCREASE', 'CORRECTION_DECREASE', 'ORDER_DEDUCTION', 'ORDER_REVERSAL', 'STOCKTAKE_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InventoryActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "InventoryAlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK');

-- CreateEnum
CREATE TYPE "StocktakeStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SystemLogOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "SystemLogSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "branchCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "deactivatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "branchId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeBranchHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "previousBranchId" UUID NOT NULL,
    "newBranchId" UUID NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "EmployeeBranchHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestaurantTable" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "tableNumber" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" "TableStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuCategory" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MenuCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "imageUrl" TEXT,
    "drinkType" "DrinkType",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealSide" (
    "id" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "sideMenuItemId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MealSide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchMenuAvailability" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isBlockedByStock" BOOLEAN NOT NULL DEFAULT false,
    "requiresReactivationConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BranchMenuAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuAvailabilityHistory" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "changedByUserId" UUID,
    "previousIsAvailable" BOOLEAN,
    "newIsAvailable" BOOLEAN,
    "previousIsBlockedByStock" BOOLEAN,
    "newIsBlockedByStock" BOOLEAN,
    "previousRequiresReactivationConfirmation" BOOLEAN,
    "newRequiresReactivationConfirmation" BOOLEAN,
    "reason" TEXT,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuAvailabilityHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeVersion" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "RecipeVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "RecipeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" UUID NOT NULL,
    "recipeVersionId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchInventory" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantityOnHand" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minimumStockLevel" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BranchInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTransaction" (
    "id" UUID NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "branchId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "transactionType" "InventoryTransactionType" NOT NULL,
    "quantityChange" DECIMAL(12,3) NOT NULL,
    "previousQuantity" DECIMAL(12,3) NOT NULL,
    "newQuantity" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(10,2),
    "supplierName" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdByUserId" UUID,
    "actorType" "InventoryActorType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orderId" UUID,
    "stocktakeId" UUID,

    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAlert" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "alertType" "InventoryAlertType" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ(3),

    CONSTRAINT "InventoryAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stocktake" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "status" "StocktakeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedByUserId" UUID NOT NULL,
    "completedByUserId" UUID,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Stocktake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakeItem" (
    "id" UUID NOT NULL,
    "stocktakeId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "systemQuantityAtCount" DECIMAL(12,3) NOT NULL,
    "actualQuantity" DECIMAL(12,3),
    "variance" DECIMAL(12,3),
    "countedAt" TIMESTAMPTZ(3),

    CONSTRAINT "StocktakeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "branchId" UUID NOT NULL,
    "tableId" UUID NOT NULL,
    "serverId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'NEW',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledByUserId" UUID,
    "cancellationReason" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,
    "menuItemNameSnapshot" TEXT NOT NULL,
    "unitPriceSnapshot" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineSubtotal" DECIMAL(10,2) NOT NULL,
    "recipeVersionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItemSide" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "sourceMealSideId" UUID,
    "sideNameSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "OrderItemSide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "previousStatus" "OrderStatus",
    "newStatus" "OrderStatus" NOT NULL,
    "changedByUserId" UUID NOT NULL,
    "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "paymentReference" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "processedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedByUserId" UUID NOT NULL,
    "processedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "endDate" TIMESTAMPTZ(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPromotion" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "promotionId" UUID NOT NULL,
    "promotionNameSnapshot" TEXT NOT NULL,
    "discountTypeSnapshot" "DiscountType" NOT NULL,
    "discountValueSnapshot" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "branchId" UUID,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "actorType" "ActorType" NOT NULL,
    "branchId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "actorType" "ActorType" NOT NULL,
    "branchId" UUID,
    "operation" TEXT NOT NULL,
    "outcome" "SystemLogOutcome" NOT NULL,
    "severity" "SystemLogSeverity" NOT NULL,
    "failureReason" TEXT,
    "technicalDetails" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_branchCode_key" ON "Branch"("branchCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_branchId_idx" ON "User"("branchId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "EmployeeBranchHistory_userId_idx" ON "EmployeeBranchHistory"("userId");

-- CreateIndex
CREATE INDEX "EmployeeBranchHistory_changedByUserId_idx" ON "EmployeeBranchHistory"("changedByUserId");

-- CreateIndex
CREATE INDEX "EmployeeBranchHistory_previousBranchId_idx" ON "EmployeeBranchHistory"("previousBranchId");

-- CreateIndex
CREATE INDEX "EmployeeBranchHistory_newBranchId_idx" ON "EmployeeBranchHistory"("newBranchId");

-- CreateIndex
CREATE INDEX "RestaurantTable_branchId_idx" ON "RestaurantTable"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantTable_branchId_tableNumber_key" ON "RestaurantTable"("branchId", "tableNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MenuCategory_name_key" ON "MenuCategory"("name");

-- CreateIndex
CREATE INDEX "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_categoryId_name_key" ON "MenuItem"("categoryId", "name");

-- CreateIndex
CREATE INDEX "MealSide_sideMenuItemId_idx" ON "MealSide"("sideMenuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MealSide_menuItemId_position_key" ON "MealSide"("menuItemId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "MealSide_menuItemId_sideMenuItemId_key" ON "MealSide"("menuItemId", "sideMenuItemId");

-- CreateIndex
CREATE INDEX "BranchMenuAvailability_menuItemId_idx" ON "BranchMenuAvailability"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchMenuAvailability_branchId_menuItemId_key" ON "BranchMenuAvailability"("branchId", "menuItemId");

-- CreateIndex
CREATE INDEX "MenuAvailabilityHistory_branchId_menuItemId_idx" ON "MenuAvailabilityHistory"("branchId", "menuItemId");

-- CreateIndex
CREATE INDEX "MenuAvailabilityHistory_changedByUserId_idx" ON "MenuAvailabilityHistory"("changedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_menuItemId_key" ON "Recipe"("menuItemId");

-- CreateIndex
CREATE INDEX "RecipeVersion_createdByUserId_idx" ON "RecipeVersion"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeVersion_recipeId_versionNumber_key" ON "RecipeVersion"("recipeId", "versionNumber");

-- CreateIndex
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeIngredient_recipeVersionId_ingredientId_key" ON "RecipeIngredient"("recipeVersionId", "ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_key" ON "Ingredient"("name");

-- CreateIndex
CREATE INDEX "BranchInventory_ingredientId_idx" ON "BranchInventory"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "BranchInventory_branchId_ingredientId_key" ON "BranchInventory"("branchId", "ingredientId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_ingredientId_createdAt_idx" ON "InventoryTransaction"("ingredientId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTransaction_orderId_idx" ON "InventoryTransaction"("orderId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_stocktakeId_idx" ON "InventoryTransaction"("stocktakeId");

-- CreateIndex
CREATE INDEX "InventoryTransaction_createdByUserId_idx" ON "InventoryTransaction"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_branchId_referenceType_referenceNumber_key" ON "InventoryTransaction"("branchId", "referenceType", "referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryTransaction_branchId_idempotencyKey_key" ON "InventoryTransaction"("branchId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "InventoryAlert_branchId_ingredientId_idx" ON "InventoryAlert"("branchId", "ingredientId");

-- CreateIndex
CREATE INDEX "InventoryAlert_resolvedAt_idx" ON "InventoryAlert"("resolvedAt");

-- CreateIndex
CREATE INDEX "Stocktake_branchId_status_idx" ON "Stocktake"("branchId", "status");

-- CreateIndex
CREATE INDEX "StocktakeItem_ingredientId_idx" ON "StocktakeItem"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "StocktakeItem_stocktakeId_ingredientId_key" ON "StocktakeItem"("stocktakeId", "ingredientId");

-- CreateIndex
CREATE INDEX "Order_branchId_status_idx" ON "Order"("branchId", "status");

-- CreateIndex
CREATE INDEX "Order_tableId_idx" ON "Order"("tableId");

-- CreateIndex
CREATE INDEX "Order_serverId_idx" ON "Order"("serverId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_branchId_orderNumber_key" ON "Order"("branchId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");

-- CreateIndex
CREATE INDEX "OrderItem_recipeVersionId_idx" ON "OrderItem"("recipeVersionId");

-- CreateIndex
CREATE INDEX "OrderItemSide_orderItemId_idx" ON "OrderItemSide"("orderItemId");

-- CreateIndex
CREATE INDEX "OrderItemSide_sourceMealSideId_idx" ON "OrderItemSide"("sourceMealSideId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_changedAt_idx" ON "OrderStatusHistory"("orderId", "changedAt");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_changedByUserId_idx" ON "OrderStatusHistory"("changedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentReference_key" ON "Payment"("paymentReference");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_processedByUserId_idx" ON "Payment"("processedByUserId");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_requestedByUserId_idx" ON "Refund"("requestedByUserId");

-- CreateIndex
CREATE INDEX "Refund_processedByUserId_idx" ON "Refund"("processedByUserId");

-- CreateIndex
CREATE INDEX "Promotion_isActive_startDate_endDate_idx" ON "Promotion"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "OrderPromotion_orderId_key" ON "OrderPromotion"("orderId");

-- CreateIndex
CREATE INDEX "OrderPromotion_promotionId_idx" ON "OrderPromotion"("promotionId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_branchId_idx" ON "Notification"("branchId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_branchId_createdAt_idx" ON "AuditLog"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_branchId_createdAt_idx" ON "SystemLog"("branchId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_operation_createdAt_idx" ON "SystemLog"("operation", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_outcome_severity_createdAt_idx" ON "SystemLog"("outcome", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "SystemLog_userId_createdAt_idx" ON "SystemLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranchHistory" ADD CONSTRAINT "EmployeeBranchHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranchHistory" ADD CONSTRAINT "EmployeeBranchHistory_previousBranchId_fkey" FOREIGN KEY ("previousBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranchHistory" ADD CONSTRAINT "EmployeeBranchHistory_newBranchId_fkey" FOREIGN KEY ("newBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeBranchHistory" ADD CONSTRAINT "EmployeeBranchHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestaurantTable" ADD CONSTRAINT "RestaurantTable_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSide" ADD CONSTRAINT "MealSide_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealSide" ADD CONSTRAINT "MealSide_sideMenuItemId_fkey" FOREIGN KEY ("sideMenuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMenuAvailability" ADD CONSTRAINT "BranchMenuAvailability_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchMenuAvailability" ADD CONSTRAINT "BranchMenuAvailability_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuAvailabilityHistory" ADD CONSTRAINT "MenuAvailabilityHistory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuAvailabilityHistory" ADD CONSTRAINT "MenuAvailabilityHistory_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuAvailabilityHistory" ADD CONSTRAINT "MenuAvailabilityHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeVersion" ADD CONSTRAINT "RecipeVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "RecipeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchInventory" ADD CONSTRAINT "BranchInventory_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTransaction" ADD CONSTRAINT "InventoryTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAlert" ADD CONSTRAINT "InventoryAlert_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_startedByUserId_fkey" FOREIGN KEY ("startedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stocktake" ADD CONSTRAINT "Stocktake_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeItem" ADD CONSTRAINT "StocktakeItem_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeItem" ADD CONSTRAINT "StocktakeItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_recipeVersionId_fkey" FOREIGN KEY ("recipeVersionId") REFERENCES "RecipeVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemSide" ADD CONSTRAINT "OrderItemSide_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItemSide" ADD CONSTRAINT "OrderItemSide_sourceMealSideId_fkey" FOREIGN KEY ("sourceMealSideId") REFERENCES "MealSide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPromotion" ADD CONSTRAINT "OrderPromotion_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPromotion" ADD CONSTRAINT "OrderPromotion_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- User
-- ADMIN and HEADQUARTERS_MANAGER have no branch.
-- BRANCH_MANAGER, SERVER, and COOK require a branch.
ALTER TABLE "User"
ADD CONSTRAINT "User_role_branch_check"
CHECK (
  (
    "role" IN ('ADMIN', 'HEADQUARTERS_MANAGER')
    AND "branchId" IS NULL
  )
  OR
  (
    "role" IN ('BRANCH_MANAGER', 'SERVER', 'COOK')
    AND "branchId" IS NOT NULL
  )
);


-- MenuItem
-- Menu prices cannot be negative.
ALTER TABLE "MenuItem"
ADD CONSTRAINT "MenuItem_price_nonnegative_check"
CHECK ("price" >= 0);


-- MealSide
-- The only valid configured side positions are 1 and 2.
ALTER TABLE "MealSide"
ADD CONSTRAINT "MealSide_position_check"
CHECK ("position" IN (1, 2));


-- RecipeVersion
-- There may be at most one published version for a recipe.
CREATE UNIQUE INDEX "RecipeVersion_one_published_per_recipe"
ON "RecipeVersion" ("recipeId")
WHERE "status" = 'PUBLISHED';


-- RecipeIngredient
-- Recipe ingredient quantities must be positive.
ALTER TABLE "RecipeIngredient"
ADD CONSTRAINT "RecipeIngredient_positive_quantity_check"
CHECK ("quantity" > 0);


-- BranchInventory
-- Stock and minimum stock levels cannot be negative.
ALTER TABLE "BranchInventory"
ADD CONSTRAINT "BranchInventory_nonnegative_check"
CHECK ("quantityOnHand" >= 0 AND "minimumStockLevel" >= 0);


-- InventoryTransaction
-- Both balances must be nonnegative, and transaction arithmetic must reconcile.
ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_balance_check"
CHECK (
  "previousQuantity" >= 0
  AND "newQuantity" >= 0
  AND "previousQuantity" + "quantityChange" = "newQuantity"
);

-- Documented stock movement directions.
-- Zero opening balance is allowed; stocktake adjustments must be nonzero.
ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_sign_check"
CHECK (
  (
    "transactionType" = 'OPENING_BALANCE'
    AND "quantityChange" >= 0
  )
  OR
  (
    "transactionType" IN (
      'RECEIVING',
      'CORRECTION_INCREASE',
      'ORDER_REVERSAL'
    )
    AND "quantityChange" > 0
  )
  OR
  (
    "transactionType" IN (
      'ORDER_DEDUCTION',
      'WASTAGE',
      'CORRECTION_DECREASE'
    )
    AND "quantityChange" < 0
  )
  OR
  (
    "transactionType" = 'STOCKTAKE_ADJUSTMENT'
    AND "quantityChange" <> 0
  )
);

ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_unitCost_nonnegative_check"
CHECK ("unitCost" IS NULL OR "unitCost" >= 0);

-- These transaction types require a nonblank reason.
ALTER TABLE "InventoryTransaction"
ADD CONSTRAINT "InventoryTransaction_reason_check"
CHECK (
  "transactionType" NOT IN (
    'WASTAGE',
    'CORRECTION_INCREASE',
    'CORRECTION_DECREASE',
    'STOCKTAKE_ADJUSTMENT'
  )
  OR NULLIF(BTRIM("reason"), '') IS NOT NULL
);


-- InventoryAlert
-- Only one unresolved alert per branch and ingredient.
CREATE UNIQUE INDEX "InventoryAlert_one_active_per_branch_ingredient"
ON "InventoryAlert" ("branchId", "ingredientId")
WHERE "resolvedAt" IS NULL;


-- Stocktake
-- Only one in-progress stocktake per branch.
CREATE UNIQUE INDEX "Stocktake_one_in_progress_per_branch"
ON "Stocktake" ("branchId")
WHERE "status" = 'IN_PROGRESS';

-- StocktakeItem
-- System and actual counts cannot be negative.
ALTER TABLE "StocktakeItem"
ADD CONSTRAINT "StocktakeItem_count_check"
CHECK (
  "systemQuantityAtCount" >= 0
  AND ("actualQuantity" IS NULL OR "actualQuantity" >= 0)
);


-- Order
-- Amounts are nonnegative; discount cannot exceed subtotal.
ALTER TABLE "Order"
ADD CONSTRAINT "Order_amounts_check"
CHECK (
  "subtotal" >= 0
  AND "discountTotal" >= 0
  AND "discountTotal" <= "subtotal"
  AND "taxTotal" >= 0
  AND "totalAmount" >= 0
);

-- A cancelled order requires cancellation time, actor, and nonblank reason.
-- Other statuses must have all cancellation fields unset.
ALTER TABLE "Order"
ADD CONSTRAINT "Order_cancellation_fields_check"
CHECK (
  (
    "status" = 'CANCELLED'
    AND "cancelledAt" IS NOT NULL
    AND "cancelledByUserId" IS NOT NULL
    AND NULLIF(BTRIM("cancellationReason"), '') IS NOT NULL
  )
  OR
  (
    "status" <> 'CANCELLED'
    AND "cancelledAt" IS NULL
    AND "cancelledByUserId" IS NULL
    AND "cancellationReason" IS NULL
  )
);


-- OrderItem
-- Quantity must be positive; snapshot unit price and subtotal nonnegative.
ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_amounts_check"
CHECK (
  "quantity" > 0
  AND "unitPriceSnapshot" >= 0
  AND "lineSubtotal" >= 0
);


-- OrderItemSide
-- Quantity must be positive; the agreed rule is not to force quantity = 1.
ALTER TABLE "OrderItemSide"
ADD CONSTRAINT "OrderItemSide_quantity_check"
CHECK ("quantity" > 0);


-- Payment
-- Payment amount must be positive.
ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_amount_positive_check"
CHECK ("amount" > 0);

-- At most one successful payment per order.
CREATE UNIQUE INDEX "Payment_one_successful_per_order"
ON "Payment" ("orderId")
WHERE "status" = 'SUCCESSFUL';


-- Refund
-- Refund amount must be positive.
ALTER TABLE "Refund"
ADD CONSTRAINT "Refund_amount_positive_check"
CHECK ("amount" > 0);


-- Promotion
-- Discount value cannot be negative; percentage is 0 through 100;
-- end date must follow start date.
ALTER TABLE "Promotion"
ADD CONSTRAINT "Promotion_discount_and_dates_check"
CHECK (
  "discountValue" >= 0
  AND "endDate" > "startDate"
  AND (
    "discountType" <> 'PERCENTAGE'
    OR "discountValue" <= 100
  )
);


-- OrderPromotion
-- Applied discount snapshots cannot be negative.
-- Percentage snapshots are limited to 0 through 100.
ALTER TABLE "OrderPromotion"
ADD CONSTRAINT "OrderPromotion_discount_check"
CHECK (
  "discountValueSnapshot" >= 0
  AND "discountAmount" >= 0
  AND (
    "discountTypeSnapshot" <> 'PERCENTAGE'
    OR "discountValueSnapshot" <= 100
  )
);