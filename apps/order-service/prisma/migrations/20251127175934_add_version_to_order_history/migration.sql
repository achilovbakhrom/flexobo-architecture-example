-- AlterTable
ALTER TABLE "order_history" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "order_history_order_id_version_idx" ON "order_history"("order_id", "version");
