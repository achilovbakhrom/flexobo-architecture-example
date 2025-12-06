/*
  Warnings:

  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Outbox` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Event";

-- DropTable
DROP TABLE "Outbox";

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "snapshot_data" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projection_positions" (
    "id" TEXT NOT NULL,
    "projection_name" TEXT NOT NULL,
    "last_event_id" TEXT NOT NULL,
    "last_processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projection_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_aggregate_id_idx" ON "events"("aggregate_id");

-- CreateIndex
CREATE INDEX "events_aggregate_type_occurred_at_idx" ON "events"("aggregate_type", "occurred_at");

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");

-- CreateIndex
CREATE UNIQUE INDEX "events_aggregate_id_version_key" ON "events"("aggregate_id", "version");

-- CreateIndex
CREATE INDEX "outbox_messages_status_created_at_idx" ON "outbox_messages"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_messages_aggregate_id_idx" ON "outbox_messages"("aggregate_id");

-- CreateIndex
CREATE UNIQUE INDEX "snapshots_aggregate_id_key" ON "snapshots"("aggregate_id");

-- CreateIndex
CREATE INDEX "snapshots_aggregate_type_idx" ON "snapshots"("aggregate_type");

-- CreateIndex
CREATE UNIQUE INDEX "projection_positions_projection_name_key" ON "projection_positions"("projection_name");
