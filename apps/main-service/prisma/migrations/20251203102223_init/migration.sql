-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outbox" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "routingKey" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadReadModel" (
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

    CONSTRAINT "LoadReadModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripReadModel" (
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

    CONSTRAINT "TripReadModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportReadModel" (
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

    CONSTRAINT "TransportReadModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidReadModel" (
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

    CONSTRAINT "BidReadModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NegotiationStepReadModel" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "priceOffer" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "isRejected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NegotiationStepReadModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingReadModel" (
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

    CONSTRAINT "BookingReadModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardReadModel" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "members" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardReadModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_aggregateId_aggregateType_idx" ON "Event"("aggregateId", "aggregateType");

-- CreateIndex
CREATE INDEX "Event_eventType_idx" ON "Event"("eventType");

-- CreateIndex
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");

-- CreateIndex
CREATE INDEX "Outbox_published_createdAt_idx" ON "Outbox"("published", "createdAt");

-- CreateIndex
CREATE INDEX "LoadReadModel_ownerId_idx" ON "LoadReadModel"("ownerId");

-- CreateIndex
CREATE INDEX "LoadReadModel_companyId_idx" ON "LoadReadModel"("companyId");

-- CreateIndex
CREATE INDEX "LoadReadModel_status_idx" ON "LoadReadModel"("status");

-- CreateIndex
CREATE INDEX "LoadReadModel_transportType_idx" ON "LoadReadModel"("transportType");

-- CreateIndex
CREATE INDEX "LoadReadModel_fromCountry_toCountry_idx" ON "LoadReadModel"("fromCountry", "toCountry");

-- CreateIndex
CREATE INDEX "LoadReadModel_loadingDate_idx" ON "LoadReadModel"("loadingDate");

-- CreateIndex
CREATE INDEX "TripReadModel_ownerId_idx" ON "TripReadModel"("ownerId");

-- CreateIndex
CREATE INDEX "TripReadModel_companyId_idx" ON "TripReadModel"("companyId");

-- CreateIndex
CREATE INDEX "TripReadModel_status_idx" ON "TripReadModel"("status");

-- CreateIndex
CREATE INDEX "TransportReadModel_ownerId_idx" ON "TransportReadModel"("ownerId");

-- CreateIndex
CREATE INDEX "TransportReadModel_companyId_idx" ON "TransportReadModel"("companyId");

-- CreateIndex
CREATE INDEX "TransportReadModel_transportType_idx" ON "TransportReadModel"("transportType");

-- CreateIndex
CREATE INDEX "TransportReadModel_isActive_idx" ON "TransportReadModel"("isActive");

-- CreateIndex
CREATE INDEX "BidReadModel_bidderId_idx" ON "BidReadModel"("bidderId");

-- CreateIndex
CREATE INDEX "BidReadModel_ownerId_idx" ON "BidReadModel"("ownerId");

-- CreateIndex
CREATE INDEX "BidReadModel_postType_postId_idx" ON "BidReadModel"("postType", "postId");

-- CreateIndex
CREATE INDEX "BidReadModel_status_idx" ON "BidReadModel"("status");

-- CreateIndex
CREATE INDEX "BidReadModel_chatRoomId_idx" ON "BidReadModel"("chatRoomId");

-- CreateIndex
CREATE INDEX "NegotiationStepReadModel_bidId_idx" ON "NegotiationStepReadModel"("bidId");

-- CreateIndex
CREATE INDEX "NegotiationStepReadModel_authorId_idx" ON "NegotiationStepReadModel"("authorId");

-- CreateIndex
CREATE INDEX "BookingReadModel_customerId_idx" ON "BookingReadModel"("customerId");

-- CreateIndex
CREATE INDEX "BookingReadModel_ownerId_idx" ON "BookingReadModel"("ownerId");

-- CreateIndex
CREATE INDEX "BookingReadModel_postType_postId_idx" ON "BookingReadModel"("postType", "postId");

-- CreateIndex
CREATE INDEX "BookingReadModel_bidId_idx" ON "BookingReadModel"("bidId");

-- CreateIndex
CREATE INDEX "BookingReadModel_status_idx" ON "BookingReadModel"("status");

-- CreateIndex
CREATE INDEX "BoardReadModel_ownerId_idx" ON "BoardReadModel"("ownerId");

-- CreateIndex
CREATE INDEX "BoardReadModel_companyId_idx" ON "BoardReadModel"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");
