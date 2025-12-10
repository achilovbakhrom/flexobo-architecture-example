/*
  Warnings:

  - You are about to drop the column `adrClassificationId` on the `adr_classification_translations` table. All the data in the column will be lost.
  - You are about to drop the column `languageCode` on the `adr_classification_translations` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `adr_classifications` table. All the data in the column will be lost.
  - You are about to drop the column `currencyCode` on the `countries` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `countries` table. All the data in the column will be lost.
  - You are about to drop the column `phoneCode` on the `countries` table. All the data in the column will be lost.
  - You are about to drop the column `countryId` on the `country_translations` table. All the data in the column will be lost.
  - You are about to drop the column `languageCode` on the `country_translations` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `currencies` table. All the data in the column will be lost.
  - You are about to drop the column `currencyId` on the `currency_translations` table. All the data in the column will be lost.
  - You are about to drop the column `languageCode` on the `currency_translations` table. All the data in the column will be lost.
  - You are about to drop the column `languageCode` on the `load_type_translations` table. All the data in the column will be lost.
  - You are about to drop the column `loadTypeId` on the `load_type_translations` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `load_types` table. All the data in the column will be lost.
  - You are about to drop the column `languageCode` on the `loading_type_translations` table. All the data in the column will be lost.
  - You are about to drop the column `loadingTypeId` on the `loading_type_translations` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `loading_types` table. All the data in the column will be lost.
  - You are about to drop the column `languageCode` on the `permit_translations` table. All the data in the column will be lost.
  - You are about to drop the column `permitId` on the `permit_translations` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `permits` table. All the data in the column will be lost.
  - You are about to drop the column `languageCode` on the `transport_type_translations` table. All the data in the column will be lost.
  - You are about to drop the column `transportTypeId` on the `transport_type_translations` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `transport_types` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[adr_classification_id,language_code]` on the table `adr_classification_translations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[country_id,language_code]` on the table `country_translations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[currency_id,language_code]` on the table `currency_translations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[load_type_id,language_code]` on the table `load_type_translations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[loading_type_id,language_code]` on the table `loading_type_translations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[permit_id,language_code]` on the table `permit_translations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transport_type_id,language_code]` on the table `transport_type_translations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `adr_classification_id` to the `adr_classification_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language_code` to the `adr_classification_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country_id` to the `country_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language_code` to the `country_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency_id` to the `currency_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language_code` to the `currency_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language_code` to the `load_type_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `load_type_id` to the `load_type_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language_code` to the `loading_type_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `loading_type_id` to the `loading_type_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language_code` to the `permit_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `permit_id` to the `permit_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `language_code` to the `transport_type_translations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transport_type_id` to the `transport_type_translations` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "adr_classification_translations" DROP CONSTRAINT "adr_classification_translations_adrClassificationId_fkey";

-- DropForeignKey
ALTER TABLE "country_translations" DROP CONSTRAINT "country_translations_countryId_fkey";

-- DropForeignKey
ALTER TABLE "currency_translations" DROP CONSTRAINT "currency_translations_currencyId_fkey";

-- DropForeignKey
ALTER TABLE "load_type_translations" DROP CONSTRAINT "load_type_translations_loadTypeId_fkey";

-- DropForeignKey
ALTER TABLE "loading_type_translations" DROP CONSTRAINT "loading_type_translations_loadingTypeId_fkey";

-- DropForeignKey
ALTER TABLE "permit_translations" DROP CONSTRAINT "permit_translations_permitId_fkey";

-- DropForeignKey
ALTER TABLE "transport_type_translations" DROP CONSTRAINT "transport_type_translations_transportTypeId_fkey";

-- DropIndex
DROP INDEX "adr_classification_translations_adrClassificationId_languag_key";

-- DropIndex
DROP INDEX "country_translations_countryId_languageCode_key";

-- DropIndex
DROP INDEX "currency_translations_currencyId_languageCode_key";

-- DropIndex
DROP INDEX "load_type_translations_loadTypeId_languageCode_key";

-- DropIndex
DROP INDEX "loading_type_translations_loadingTypeId_languageCode_key";

-- DropIndex
DROP INDEX "permit_translations_permitId_languageCode_key";

-- DropIndex
DROP INDEX "transport_type_translations_transportTypeId_languageCode_key";

-- AlterTable
ALTER TABLE "adr_classification_translations" DROP COLUMN "adrClassificationId",
DROP COLUMN "languageCode",
ADD COLUMN     "adr_classification_id" TEXT NOT NULL,
ADD COLUMN     "language_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "adr_classifications" DROP COLUMN "isActive",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "countries" DROP COLUMN "currencyCode",
DROP COLUMN "isActive",
DROP COLUMN "phoneCode",
ADD COLUMN     "currency_code" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phone_code" TEXT;

-- AlterTable
ALTER TABLE "country_translations" DROP COLUMN "countryId",
DROP COLUMN "languageCode",
ADD COLUMN     "country_id" TEXT NOT NULL,
ADD COLUMN     "language_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "currencies" DROP COLUMN "isActive",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "currency_translations" DROP COLUMN "currencyId",
DROP COLUMN "languageCode",
ADD COLUMN     "currency_id" TEXT NOT NULL,
ADD COLUMN     "language_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "load_type_translations" DROP COLUMN "languageCode",
DROP COLUMN "loadTypeId",
ADD COLUMN     "language_code" TEXT NOT NULL,
ADD COLUMN     "load_type_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "load_types" DROP COLUMN "isActive",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "loading_type_translations" DROP COLUMN "languageCode",
DROP COLUMN "loadingTypeId",
ADD COLUMN     "language_code" TEXT NOT NULL,
ADD COLUMN     "loading_type_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "loading_types" DROP COLUMN "isActive",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "permit_translations" DROP COLUMN "languageCode",
DROP COLUMN "permitId",
ADD COLUMN     "language_code" TEXT NOT NULL,
ADD COLUMN     "permit_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "permits" DROP COLUMN "isActive",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "transport_type_translations" DROP COLUMN "languageCode",
DROP COLUMN "transportTypeId",
ADD COLUMN     "language_code" TEXT NOT NULL,
ADD COLUMN     "transport_type_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "transport_types" DROP COLUMN "isActive",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "adr_classification_translations_adr_classification_id_langu_key" ON "adr_classification_translations"("adr_classification_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "country_translations_country_id_language_code_key" ON "country_translations"("country_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "currency_translations_currency_id_language_code_key" ON "currency_translations"("currency_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "load_type_translations_load_type_id_language_code_key" ON "load_type_translations"("load_type_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "loading_type_translations_loading_type_id_language_code_key" ON "loading_type_translations"("loading_type_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "permit_translations_permit_id_language_code_key" ON "permit_translations"("permit_id", "language_code");

-- CreateIndex
CREATE UNIQUE INDEX "transport_type_translations_transport_type_id_language_code_key" ON "transport_type_translations"("transport_type_id", "language_code");

-- AddForeignKey
ALTER TABLE "country_translations" ADD CONSTRAINT "country_translations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currency_translations" ADD CONSTRAINT "currency_translations_currency_id_fkey" FOREIGN KEY ("currency_id") REFERENCES "currencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_type_translations" ADD CONSTRAINT "transport_type_translations_transport_type_id_fkey" FOREIGN KEY ("transport_type_id") REFERENCES "transport_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "load_type_translations" ADD CONSTRAINT "load_type_translations_load_type_id_fkey" FOREIGN KEY ("load_type_id") REFERENCES "load_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loading_type_translations" ADD CONSTRAINT "loading_type_translations_loading_type_id_fkey" FOREIGN KEY ("loading_type_id") REFERENCES "loading_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adr_classification_translations" ADD CONSTRAINT "adr_classification_translations_adr_classification_id_fkey" FOREIGN KEY ("adr_classification_id") REFERENCES "adr_classifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permit_translations" ADD CONSTRAINT "permit_translations_permit_id_fkey" FOREIGN KEY ("permit_id") REFERENCES "permits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
