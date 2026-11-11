-- CreateTable
CREATE TABLE "ReferenceCounter" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "referenceType" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReferenceCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceCounter_branchId_referenceType_key" ON "ReferenceCounter"("branchId", "referenceType");

-- AddForeignKey
ALTER TABLE "ReferenceCounter" ADD CONSTRAINT "ReferenceCounter_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
