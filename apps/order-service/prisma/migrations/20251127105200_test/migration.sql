-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "last_event_id" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;
