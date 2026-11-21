-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "discountPercent" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

