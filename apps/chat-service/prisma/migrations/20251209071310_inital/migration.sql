-- CreateEnum
CREATE TYPE "ChatRoomStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'VIDEO', 'AUDIO', 'VOICE', 'GIF', 'STATUS');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'DELIVERED', 'READ');

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

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "participants" TEXT[],
    "is_group" BOOLEAN NOT NULL DEFAULT false,
    "group_name" TEXT,
    "is_support_chat" BOOLEAN NOT NULL DEFAULT false,
    "status" "ChatRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "unread_counts" JSONB NOT NULL DEFAULT '{}',
    "translation_settings" JSONB NOT NULL DEFAULT '{}',
    "last_message_id" TEXT,
    "last_message_preview" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "identifier_id" TEXT,
    "identifier_type" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "last_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "sender_type" "SenderType" NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "file_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "file_name" TEXT,
    "file_metadata" JSONB,
    "voice_duration" INTEGER,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "reply_to_id" TEXT,
    "translations" JSONB NOT NULL DEFAULT '[]',
    "edit_history" JSONB NOT NULL DEFAULT '[]',
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "last_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_uploads" (
    "id" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "uploader_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_history" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "previous_state" TEXT,
    "new_state" TEXT,
    "changed_by" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message_history" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "previous_state" TEXT,
    "new_state" TEXT,
    "changed_by" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_history_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "chat_rooms_participants_idx" ON "chat_rooms"("participants");

-- CreateIndex
CREATE INDEX "chat_rooms_status_last_message_at_idx" ON "chat_rooms"("status", "last_message_at");

-- CreateIndex
CREATE INDEX "chat_rooms_is_deleted_last_message_at_idx" ON "chat_rooms"("is_deleted", "last_message_at");

-- CreateIndex
CREATE INDEX "chat_rooms_identifier_id_idx" ON "chat_rooms"("identifier_id");

-- CreateIndex
CREATE INDEX "chat_rooms_identifier_id_identifier_type_idx" ON "chat_rooms"("identifier_id", "identifier_type");

-- CreateIndex
CREATE INDEX "chat_messages_room_id_created_at_idx" ON "chat_messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_sender_type_idx" ON "chat_messages"("sender_id", "sender_type");

-- CreateIndex
CREATE INDEX "chat_messages_is_deleted_created_at_idx" ON "chat_messages"("is_deleted", "created_at");

-- CreateIndex
CREATE INDEX "file_uploads_uploader_id_idx" ON "file_uploads"("uploader_id");

-- CreateIndex
CREATE INDEX "chat_room_history_room_id_idx" ON "chat_room_history"("room_id");

-- CreateIndex
CREATE INDEX "chat_room_history_event_type_idx" ON "chat_room_history"("event_type");

-- CreateIndex
CREATE INDEX "chat_room_history_occurred_at_idx" ON "chat_room_history"("occurred_at");

-- CreateIndex
CREATE INDEX "chat_room_history_room_id_version_idx" ON "chat_room_history"("room_id", "version");

-- CreateIndex
CREATE INDEX "chat_message_history_message_id_idx" ON "chat_message_history"("message_id");

-- CreateIndex
CREATE INDEX "chat_message_history_room_id_idx" ON "chat_message_history"("room_id");

-- CreateIndex
CREATE INDEX "chat_message_history_event_type_idx" ON "chat_message_history"("event_type");

-- CreateIndex
CREATE INDEX "chat_message_history_occurred_at_idx" ON "chat_message_history"("occurred_at");

-- CreateIndex
CREATE INDEX "chat_message_history_message_id_version_idx" ON "chat_message_history"("message_id", "version");
