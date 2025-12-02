-- CreateEnum
CREATE TYPE "load_status" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "truck_load_type" AS ENUM ('FTL', 'LTL');

-- CreateEnum
CREATE TYPE "price_mode" AS ENUM ('FIXED', 'NEGOTIABLE', 'PER_KM');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'CREDIT_CARD', 'NDS', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "weight_unit" AS ENUM ('KG', 'TON', 'LB');

-- CreateEnum
CREATE TYPE "capacity_unit" AS ENUM ('M3', 'TON', 'PALLET');

-- CreateEnum
CREATE TYPE "transport_type_feature" AS ENUM ('OPEN', 'CLOSED', 'REFRIGERATED');

-- CreateEnum
CREATE TYPE "transport_loading_feature" AS ENUM ('SIDE_LOADING', 'TOP_LOADING', 'REAR_LOADING');

-- CreateEnum
CREATE TYPE "load_document_type" AS ENUM ('TTN', 'INVOICE', 'CMR');

-- CreateEnum
CREATE TYPE "trip_document_type" AS ENUM ('PASSPORT', 'INVOICE', 'CMR', 'OTHER');

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "version" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_messages" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "outbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snapshots" (
    "id" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projection_positions" (
    "id" TEXT NOT NULL,
    "projectionId" TEXT NOT NULL,
    "lastEventId" TEXT,
    "lastTimestamp" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projection_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" TEXT NOT NULL,
    "country_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country_translations" (
    "id" TEXT NOT NULL,
    "country_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "country_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "exchange_rate" DOUBLE PRECISION NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "min_amount" DOUBLE PRECISION,
    "max_amount" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_translations" (
    "id" TEXT NOT NULL,
    "currency_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "currency_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "continent_code" TEXT,
    "country_code" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "location_id" TEXT,
    "parent_id" INTEGER,
    "type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_translations" (
    "id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "location_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_types" (
    "id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_type_translations" (
    "id" TEXT NOT NULL,
    "transport_type_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "transport_type_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_loading_types" (
    "id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_loading_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_loading_type_translations" (
    "id" TEXT NOT NULL,
    "transport_loading_type_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "transport_loading_type_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_types" (
    "id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "load_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_type_translations" (
    "id" TEXT NOT NULL,
    "load_type_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "load_type_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adrs" (
    "id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adr_translations" (
    "id" TEXT NOT NULL,
    "adr_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "adr_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permits" (
    "id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_translations" (
    "id" TEXT NOT NULL,
    "permit_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permit_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loads" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "company_id" TEXT,
    "transport_type_id" TEXT NOT NULL,
    "from_location_id" TEXT NOT NULL,
    "to_location_id" TEXT NOT NULL,
    "from_country_code" TEXT NOT NULL,
    "to_country_code" TEXT NOT NULL,
    "distance" DOUBLE PRECISION,
    "toll_distance" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "base_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency_id" TEXT NOT NULL,
    "loading_type_id" TEXT NOT NULL,
    "unloading_type_id" TEXT NOT NULL,
    "target_date" TIMESTAMP(3) NOT NULL,
    "additional_extra_day" TIMESTAMP(3),
    "status" "load_status" NOT NULL DEFAULT 'OPEN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "private_date" TIMESTAMP(3),
    "truck_load_type" "truck_load_type" NOT NULL DEFAULT 'FTL',
    "negotiable" BOOLEAN NOT NULL DEFAULT false,
    "payment_methods" "payment_method"[],
    "payment_condition" BOOLEAN NOT NULL DEFAULT false,
    "payment_days" INTEGER NOT NULL DEFAULT 0,
    "pre_payment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_per_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_price_per_km_exceed" BOOLEAN,
    "price_mode" "price_mode",
    "parent_id" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certificates" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "other_docs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_system_load" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL,
    "load_id" TEXT NOT NULL,
    "cargo_type_id" TEXT NOT NULL,
    "cargo_type_weight" DOUBLE PRECISION NOT NULL,
    "cargo_weight_unit" "weight_unit" NOT NULL,
    "cargo_weight_tons" DOUBLE PRECISION,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_features" (
    "id" TEXT NOT NULL,
    "load_id" TEXT NOT NULL,
    "straps" INTEGER NOT NULL DEFAULT 0,
    "coupling" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cars_count" INTEGER NOT NULL DEFAULT 0,
    "carrying_capacity" TEXT,
    "special_notes" TEXT,

    CONSTRAINT "load_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_documents" (
    "id" TEXT NOT NULL,
    "load_id" TEXT NOT NULL,
    "type" "load_document_type" NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "load_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "company_id" TEXT,
    "transport_type_id" TEXT NOT NULL,
    "transport_type_feature" "transport_type_feature" NOT NULL,
    "transport_loading_feature" "transport_loading_feature" NOT NULL,
    "loading_capacity" DOUBLE PRECISION NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "capacity_unit" "capacity_unit" NOT NULL,
    "transport_length" DOUBLE PRECISION,
    "transport_width" DOUBLE PRECISION,
    "transport_height" DOUBLE PRECISION,
    "currency_id" TEXT NOT NULL,
    "distance" DOUBLE PRECISION,
    "toll_distance" DOUBLE PRECISION,
    "loading_point_id" TEXT NOT NULL,
    "unloading_point_id" TEXT NOT NULL,
    "from_location_id" TEXT NOT NULL,
    "to_location_id" TEXT NOT NULL,
    "from_country_code" TEXT NOT NULL,
    "to_country_code" TEXT NOT NULL,
    "loading_radius" DOUBLE PRECISION NOT NULL,
    "unloading_radius" DOUBLE PRECISION NOT NULL,
    "loading_ready_date" TIMESTAMP(3) NOT NULL,
    "additional_loading_ready_date" TIMESTAMP(3),
    "price" DOUBLE PRECISION,
    "base_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payment_methods" "payment_method"[],
    "note" TEXT,
    "is_negotiable" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "private_date" TIMESTAMP(3),
    "price_per_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_price_per_km_exceed" BOOLEAN,
    "price_mode" "price_mode",
    "status" "load_status" NOT NULL DEFAULT 'OPEN',
    "parent_id" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_system_trip" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_documents" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "type" "trip_document_type" NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "trip_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transports" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT,
    "transport_type_id" TEXT NOT NULL,
    "transport_type_feature" "transport_type_feature" NOT NULL,
    "transport_loading_feature" "transport_loading_feature" NOT NULL,
    "loading_capacity" DOUBLE PRECISION NOT NULL,
    "capacity" DOUBLE PRECISION NOT NULL,
    "capacity_unit" "capacity_unit" NOT NULL,
    "transport_length" DOUBLE PRECISION,
    "transport_width" DOUBLE PRECISION,
    "transport_height" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "currency_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "last_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_LoadAdrClasses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LoadAdrClasses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TransportAdrClasses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TransportAdrClasses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TransportPermits" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TransportPermits_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LoadPermits" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_LoadPermits_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TransportLoadingTypes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TransportLoadingTypes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "events_aggregateId_aggregateType_idx" ON "events"("aggregateId", "aggregateType");

-- CreateIndex
CREATE INDEX "events_type_idx" ON "events"("type");

-- CreateIndex
CREATE INDEX "events_timestamp_idx" ON "events"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "events_aggregateId_version_key" ON "events"("aggregateId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "outbox_messages_eventId_key" ON "outbox_messages"("eventId");

-- CreateIndex
CREATE INDEX "outbox_messages_status_createdAt_idx" ON "outbox_messages"("status", "createdAt");

-- CreateIndex
CREATE INDEX "snapshots_aggregateId_idx" ON "snapshots"("aggregateId");

-- CreateIndex
CREATE UNIQUE INDEX "snapshots_aggregateId_aggregateType_key" ON "snapshots"("aggregateId", "aggregateType");

-- CreateIndex
CREATE UNIQUE INDEX "projection_positions_projectionId_key" ON "projection_positions"("projectionId");

-- CreateIndex
CREATE UNIQUE INDEX "countries_country_code_key" ON "countries"("country_code");

-- CreateIndex
CREATE INDEX "countries_country_code_idx" ON "countries"("country_code");

-- CreateIndex
CREATE INDEX "country_translations_language_idx" ON "country_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "country_translations_country_id_language_key" ON "country_translations"("country_id", "language");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_code_idx" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "currencies_is_active_idx" ON "currencies"("is_active");

-- CreateIndex
CREATE INDEX "currency_translations_language_idx" ON "currency_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "currency_translations_currency_id_language_key" ON "currency_translations"("currency_id", "language");

-- CreateIndex
CREATE INDEX "locations_country_code_idx" ON "locations"("country_code");

-- CreateIndex
CREATE INDEX "locations_location_id_idx" ON "locations"("location_id");

-- CreateIndex
CREATE INDEX "locations_lat_lon_idx" ON "locations"("lat", "lon");

-- CreateIndex
CREATE INDEX "location_translations_language_idx" ON "location_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "location_translations_location_id_language_key" ON "location_translations"("location_id", "language");

-- CreateIndex
CREATE INDEX "transport_type_translations_language_idx" ON "transport_type_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "transport_type_translations_transport_type_id_language_key" ON "transport_type_translations"("transport_type_id", "language");

-- CreateIndex
CREATE INDEX "transport_loading_type_translations_language_idx" ON "transport_loading_type_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "transport_loading_type_translations_transport_loading_type__key" ON "transport_loading_type_translations"("transport_loading_type_id", "language");

-- CreateIndex
CREATE INDEX "load_type_translations_language_idx" ON "load_type_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "load_type_translations_load_type_id_language_key" ON "load_type_translations"("load_type_id", "language");

-- CreateIndex
CREATE INDEX "adr_translations_language_idx" ON "adr_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "adr_translations_adr_id_language_key" ON "adr_translations"("adr_id", "language");

-- CreateIndex
CREATE INDEX "permit_translations_language_idx" ON "permit_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "permit_translations_permit_id_language_key" ON "permit_translations"("permit_id", "language");

-- CreateIndex
CREATE INDEX "loads_owner_id_status_idx" ON "loads"("owner_id", "status");

-- CreateIndex
CREATE INDEX "loads_owner_id_created_at_idx" ON "loads"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "loads_company_id_idx" ON "loads"("company_id");

-- CreateIndex
CREATE INDEX "loads_company_id_status_idx" ON "loads"("company_id", "status");

-- CreateIndex
CREATE INDEX "loads_status_idx" ON "loads"("status");

-- CreateIndex
CREATE INDEX "loads_is_active_owner_id_idx" ON "loads"("is_active", "owner_id");

-- CreateIndex
CREATE INDEX "loads_is_system_load_idx" ON "loads"("is_system_load");

-- CreateIndex
CREATE INDEX "loads_target_date_idx" ON "loads"("target_date");

-- CreateIndex
CREATE INDEX "loads_from_location_id_idx" ON "loads"("from_location_id");

-- CreateIndex
CREATE INDEX "loads_to_location_id_idx" ON "loads"("to_location_id");

-- CreateIndex
CREATE INDEX "cargos_load_id_idx" ON "cargos"("load_id");

-- CreateIndex
CREATE INDEX "cargos_cargo_type_id_idx" ON "cargos"("cargo_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "load_features_load_id_key" ON "load_features"("load_id");

-- CreateIndex
CREATE INDEX "load_documents_load_id_idx" ON "load_documents"("load_id");

-- CreateIndex
CREATE INDEX "trips_owner_id_status_idx" ON "trips"("owner_id", "status");

-- CreateIndex
CREATE INDEX "trips_owner_id_created_at_idx" ON "trips"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "trips_company_id_idx" ON "trips"("company_id");

-- CreateIndex
CREATE INDEX "trips_company_id_status_idx" ON "trips"("company_id", "status");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_is_active_owner_id_idx" ON "trips"("is_active", "owner_id");

-- CreateIndex
CREATE INDEX "trips_is_system_trip_idx" ON "trips"("is_system_trip");

-- CreateIndex
CREATE INDEX "trips_loading_ready_date_idx" ON "trips"("loading_ready_date");

-- CreateIndex
CREATE INDEX "trips_loading_point_id_idx" ON "trips"("loading_point_id");

-- CreateIndex
CREATE INDEX "trips_unloading_point_id_idx" ON "trips"("unloading_point_id");

-- CreateIndex
CREATE INDEX "trip_documents_trip_id_idx" ON "trip_documents"("trip_id");

-- CreateIndex
CREATE INDEX "transports_owner_id_idx" ON "transports"("owner_id");

-- CreateIndex
CREATE INDEX "transports_is_active_idx" ON "transports"("is_active");

-- CreateIndex
CREATE INDEX "transports_transport_type_id_idx" ON "transports"("transport_type_id");

-- CreateIndex
CREATE INDEX "transports_owner_id_is_active_idx" ON "transports"("owner_id", "is_active");

-- CreateIndex
CREATE INDEX "_LoadAdrClasses_B_index" ON "_LoadAdrClasses"("B");

-- CreateIndex
CREATE INDEX "_TransportAdrClasses_B_index" ON "_TransportAdrClasses"("B");

-- CreateIndex
CREATE INDEX "_TransportPermits_B_index" ON "_TransportPermits"("B");

-- CreateIndex
CREATE INDEX "_LoadPermits_B_index" ON "_LoadPermits"("B");

-- CreateIndex
CREATE INDEX "_TransportLoadingTypes_B_index" ON "_TransportLoadingTypes"("B");

-- AddForeignKey
ALTER TABLE "country_translations" ADD CONSTRAINT "country_translations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_translations" ADD CONSTRAINT "currency_translations_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_country_code_fkey" FOREIGN KEY ("country_code") REFERENCES "countries"("country_code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_translations" ADD CONSTRAINT "location_translations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_type_translations" ADD CONSTRAINT "transport_type_translations_transport_type_id_fkey" FOREIGN KEY ("transport_type_id") REFERENCES "transport_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_loading_type_translations" ADD CONSTRAINT "transport_loading_type_translations_transport_loading_type_fkey" FOREIGN KEY ("transport_loading_type_id") REFERENCES "transport_loading_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_type_translations" ADD CONSTRAINT "load_type_translations_load_type_id_fkey" FOREIGN KEY ("load_type_id") REFERENCES "load_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adr_translations" ADD CONSTRAINT "adr_translations_adr_id_fkey" FOREIGN KEY ("adr_id") REFERENCES "adrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_translations" ADD CONSTRAINT "permit_translations_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_transport_type_id_fkey" FOREIGN KEY ("transport_type_id") REFERENCES "transport_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_loading_type_id_fkey" FOREIGN KEY ("loading_type_id") REFERENCES "transport_loading_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loads" ADD CONSTRAINT "loads_unloading_type_id_fkey" FOREIGN KEY ("unloading_type_id") REFERENCES "transport_loading_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargos" ADD CONSTRAINT "cargos_cargo_type_id_fkey" FOREIGN KEY ("cargo_type_id") REFERENCES "load_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_features" ADD CONSTRAINT "load_features_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_documents" ADD CONSTRAINT "load_documents_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_transport_type_id_fkey" FOREIGN KEY ("transport_type_id") REFERENCES "transport_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_loading_point_id_fkey" FOREIGN KEY ("loading_point_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_unloading_point_id_fkey" FOREIGN KEY ("unloading_point_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_documents" ADD CONSTRAINT "trip_documents_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_transport_type_id_fkey" FOREIGN KEY ("transport_type_id") REFERENCES "transport_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transports" ADD CONSTRAINT "transports_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LoadAdrClasses" ADD CONSTRAINT "_LoadAdrClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "adrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LoadAdrClasses" ADD CONSTRAINT "_LoadAdrClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "load_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TransportAdrClasses" ADD CONSTRAINT "_TransportAdrClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "adrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TransportAdrClasses" ADD CONSTRAINT "_TransportAdrClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TransportPermits" ADD CONSTRAINT "_TransportPermits_A_fkey" FOREIGN KEY ("A") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TransportPermits" ADD CONSTRAINT "_TransportPermits_B_fkey" FOREIGN KEY ("B") REFERENCES "transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LoadPermits" ADD CONSTRAINT "_LoadPermits_A_fkey" FOREIGN KEY ("A") REFERENCES "load_features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LoadPermits" ADD CONSTRAINT "_LoadPermits_B_fkey" FOREIGN KEY ("B") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TransportLoadingTypes" ADD CONSTRAINT "_TransportLoadingTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "transports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TransportLoadingTypes" ADD CONSTRAINT "_TransportLoadingTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "transport_loading_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
