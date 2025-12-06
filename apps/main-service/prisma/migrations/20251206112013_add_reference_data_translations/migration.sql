-- CreateTable
CREATE TABLE "country_translations" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "country_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_translations" (
    "id" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "currency_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_type_translations" (
    "id" TEXT NOT NULL,
    "transportTypeId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "transport_type_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "load_type_translations" (
    "id" TEXT NOT NULL,
    "loadTypeId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "load_type_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loading_type_translations" (
    "id" TEXT NOT NULL,
    "loadingTypeId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "loading_type_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adr_classification_translations" (
    "id" TEXT NOT NULL,
    "adrClassificationId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "adr_classification_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permit_translations" (
    "id" TEXT NOT NULL,
    "permitId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permit_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "country_translations_countryId_languageCode_key" ON "country_translations"("countryId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "currency_translations_currencyId_languageCode_key" ON "currency_translations"("currencyId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "transport_type_translations_transportTypeId_languageCode_key" ON "transport_type_translations"("transportTypeId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "load_type_translations_loadTypeId_languageCode_key" ON "load_type_translations"("loadTypeId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "loading_type_translations_loadingTypeId_languageCode_key" ON "loading_type_translations"("loadingTypeId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "adr_classification_translations_adrClassificationId_languag_key" ON "adr_classification_translations"("adrClassificationId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "permit_translations_permitId_languageCode_key" ON "permit_translations"("permitId", "languageCode");

-- AddForeignKey
ALTER TABLE "country_translations" ADD CONSTRAINT "country_translations_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_translations" ADD CONSTRAINT "currency_translations_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_type_translations" ADD CONSTRAINT "transport_type_translations_transportTypeId_fkey" FOREIGN KEY ("transportTypeId") REFERENCES "transport_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_type_translations" ADD CONSTRAINT "load_type_translations_loadTypeId_fkey" FOREIGN KEY ("loadTypeId") REFERENCES "load_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loading_type_translations" ADD CONSTRAINT "loading_type_translations_loadingTypeId_fkey" FOREIGN KEY ("loadingTypeId") REFERENCES "loading_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adr_classification_translations" ADD CONSTRAINT "adr_classification_translations_adrClassificationId_fkey" FOREIGN KEY ("adrClassificationId") REFERENCES "adr_classifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_translations" ADD CONSTRAINT "permit_translations_permitId_fkey" FOREIGN KEY ("permitId") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
