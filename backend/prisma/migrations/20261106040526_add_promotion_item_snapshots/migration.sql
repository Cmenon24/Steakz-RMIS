-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "lineTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "promotionDiscountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "promotionDiscountTypeSnapshot" "DiscountType",
ADD COLUMN     "promotionDiscountValueSnapshot" DECIMAL(10,2),
ADD COLUMN     "promotionId" UUID,
ADD COLUMN     "promotionNameSnapshot" TEXT;

-- CreateTable
CREATE TABLE "PromotionBranch" (
    "id" UUID NOT NULL,
    "promotionId" UUID NOT NULL,
    "branchId" UUID NOT NULL,

    CONSTRAINT "PromotionBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionItem" (
    "id" UUID NOT NULL,
    "promotionId" UUID NOT NULL,
    "menuItemId" UUID NOT NULL,

    CONSTRAINT "PromotionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PromotionBranch_branchId_idx" ON "PromotionBranch"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionBranch_promotionId_branchId_key" ON "PromotionBranch"("promotionId", "branchId");

-- CreateIndex
CREATE INDEX "PromotionItem_menuItemId_idx" ON "PromotionItem"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionItem_promotionId_menuItemId_key" ON "PromotionItem"("promotionId", "menuItemId");

-- CreateIndex
CREATE INDEX "OrderItem_promotionId_idx" ON "OrderItem"("promotionId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionBranch" ADD CONSTRAINT "PromotionBranch_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionBranch" ADD CONSTRAINT "PromotionBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionItem" ADD CONSTRAINT "PromotionItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionItem" ADD CONSTRAINT "PromotionItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
