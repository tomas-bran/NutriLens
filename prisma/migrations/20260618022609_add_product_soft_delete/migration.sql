-- DropIndex
DROP INDEX "Product_embedding_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");
