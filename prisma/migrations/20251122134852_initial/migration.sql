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
    "company_id" TEXT,
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
CREATE TABLE "sagas" (
    "id" TEXT NOT NULL,
    "saga_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "sagas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saga_instances" (
    "id" TEXT NOT NULL,
    "saga_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "compensated_at" TIMESTAMP(3),
    "metadata" JSONB,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "saga_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_phase_commits" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "participants" JSONB NOT NULL,
    "coordinator_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prepared_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "timeout" INTEGER NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "two_phase_commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_logs" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "participant_services" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "transaction_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projection_positions" (
    "id" TEXT NOT NULL,
    "projection_name" TEXT NOT NULL,
    "last_event_id" TEXT NOT NULL,
    "last_processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projection_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_partitions" (
    "id" TEXT NOT NULL,
    "partition_name" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "date_range_start" TIMESTAMP(3) NOT NULL,
    "date_range_end" TIMESTAMP(3) NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "s3_location" TEXT,

    CONSTRAINT "event_partitions_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "outbox_messages_company_id_idx" ON "outbox_messages"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "snapshots_aggregate_id_key" ON "snapshots"("aggregate_id");

-- CreateIndex
CREATE INDEX "snapshots_aggregate_type_idx" ON "snapshots"("aggregate_type");

-- CreateIndex
CREATE INDEX "sagas_saga_type_status_idx" ON "sagas"("saga_type", "status");

-- CreateIndex
CREATE INDEX "sagas_status_started_at_idx" ON "sagas"("status", "started_at");

-- CreateIndex
CREATE INDEX "saga_instances_saga_type_status_idx" ON "saga_instances"("saga_type", "status");

-- CreateIndex
CREATE INDEX "saga_instances_status_started_at_idx" ON "saga_instances"("status", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "two_phase_commits_transaction_id_key" ON "two_phase_commits"("transaction_id");

-- CreateIndex
CREATE INDEX "two_phase_commits_state_started_at_idx" ON "two_phase_commits"("state", "started_at");

-- CreateIndex
CREATE INDEX "two_phase_commits_coordinator_id_state_idx" ON "two_phase_commits"("coordinator_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_logs_transaction_id_key" ON "transaction_logs"("transaction_id");

-- CreateIndex
CREATE INDEX "transaction_logs_status_idx" ON "transaction_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "projection_positions_projection_name_key" ON "projection_positions"("projection_name");

-- CreateIndex
CREATE UNIQUE INDEX "event_partitions_partition_name_key" ON "event_partitions"("partition_name");

-- CreateIndex
CREATE INDEX "event_partitions_aggregate_type_idx" ON "event_partitions"("aggregate_type");
