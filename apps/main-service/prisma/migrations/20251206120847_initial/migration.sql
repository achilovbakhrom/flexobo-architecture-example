/*
  Warnings:

  - You are about to drop the `BidReadModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BoardReadModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BookingReadModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoadReadModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NegotiationStepReadModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TransportReadModel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TripReadModel` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "BidReadModel";

-- DropTable
DROP TABLE "BoardReadModel";

-- DropTable
DROP TABLE "BookingReadModel";

-- DropTable
DROP TABLE "LoadReadModel";

-- DropTable
DROP TABLE "NegotiationStepReadModel";

-- DropTable
DROP TABLE "TransportReadModel";

-- DropTable
DROP TABLE "TripReadModel";

-- CreateTable
CREATE TABLE "loads" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fromCountry" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "fromAddress" TEXT,
    "fromLat" DOUBLE PRECISION,
    "fromLng" DOUBLE PRECISION,
    "toCountry" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "toAddress" TEXT,
    "toLat" DOUBLE PRECISION,
    "toLng" DOUBLE PRECISION,
    "transportType" TEXT NOT NULL,
    "loadingTypes" TEXT[],
    "cargos" JSONB NOT NULL,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "totalVolume" DOUBLE PRECISION,
    "features" TEXT[],
    "adrClasses" TEXT[],
    "temperatureMin" DOUBLE PRECISION,
    "temperatureMax" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentTerms" TEXT,
    "loadingDate" TIMESTAMP(3) NOT NULL,
    "loadingDateTo" TIMESTAMP(3),
    "unloadingDate" TIMESTAMP(3),
    "boardIds" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "transport" JSONB NOT NULL,
    "loadingPoints" JSONB NOT NULL,
    "unloadingPoints" JSONB NOT NULL,
    "price" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentTerms" TEXT,
    "boardIds" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transports" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transportType" TEXT NOT NULL,
    "loadingTypes" TEXT[],
    "capacityTons" DOUBLE PRECISION NOT NULL,
    "capacityM3" DOUBLE PRECISION,
    "lengthM" DOUBLE PRECISION,
    "widthM" DOUBLE PRECISION,
    "heightM" DOUBLE PRECISION,
    "features" TEXT[],
    "adrClasses" TEXT[],
    "permits" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "transportIds" TEXT[],
    "proposedPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "negotiationRound" INTEGER NOT NULL DEFAULT 1,
    "chatRoomId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiation_steps" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "priceOffer" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "negotiation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "customerRating" DOUBLE PRECISION,
    "customerComment" TEXT,
    "ownerRating" DOUBLE PRECISION,
    "ownerComment" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "members" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loads_ownerId_idx" ON "loads"("ownerId");

-- CreateIndex
CREATE INDEX "loads_companyId_idx" ON "loads"("companyId");

-- CreateIndex
CREATE INDEX "loads_status_idx" ON "loads"("status");

-- CreateIndex
CREATE INDEX "loads_transportType_idx" ON "loads"("transportType");

-- CreateIndex
CREATE INDEX "loads_fromCountry_toCountry_idx" ON "loads"("fromCountry", "toCountry");

-- CreateIndex
CREATE INDEX "loads_loadingDate_idx" ON "loads"("loadingDate");

-- CreateIndex
CREATE INDEX "trips_ownerId_idx" ON "trips"("ownerId");

-- CreateIndex
CREATE INDEX "trips_companyId_idx" ON "trips"("companyId");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "transports_ownerId_idx" ON "transports"("ownerId");

-- CreateIndex
CREATE INDEX "transports_companyId_idx" ON "transports"("companyId");

-- CreateIndex
CREATE INDEX "transports_transportType_idx" ON "transports"("transportType");

-- CreateIndex
CREATE INDEX "transports_isActive_idx" ON "transports"("isActive");

-- CreateIndex
CREATE INDEX "bids_bidderId_idx" ON "bids"("bidderId");

-- CreateIndex
CREATE INDEX "bids_ownerId_idx" ON "bids"("ownerId");

-- CreateIndex
CREATE INDEX "bids_postType_postId_idx" ON "bids"("postType", "postId");

-- CreateIndex
CREATE INDEX "bids_status_idx" ON "bids"("status");

-- CreateIndex
CREATE INDEX "bids_chatRoomId_idx" ON "bids"("chatRoomId");

-- CreateIndex
CREATE INDEX "negotiation_steps_bidId_idx" ON "negotiation_steps"("bidId");

-- CreateIndex
CREATE INDEX "negotiation_steps_authorId_idx" ON "negotiation_steps"("authorId");

-- CreateIndex
CREATE INDEX "bookings_customerId_idx" ON "bookings"("customerId");

-- CreateIndex
CREATE INDEX "bookings_ownerId_idx" ON "bookings"("ownerId");

-- CreateIndex
CREATE INDEX "bookings_postType_postId_idx" ON "bookings"("postType", "postId");

-- CreateIndex
CREATE INDEX "bookings_bidId_idx" ON "bookings"("bidId");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "boards_ownerId_idx" ON "boards"("ownerId");

-- CreateIndex
CREATE INDEX "boards_companyId_idx" ON "boards"("companyId");
