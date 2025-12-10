/*
  Warnings:

  - You are about to drop the column `address` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `taxId` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `companies` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `permits` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `permits` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `permits` table. All the data in the column will be lost.
  - You are about to drop the column `adrClasses` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `capacityM3` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `capacityTons` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `heightM` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `lengthM` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `loadingTypes` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `transportType` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `transports` table. All the data in the column will be lost.
  - You are about to drop the column `widthM` on the `transports` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[companyUniqueId]` on the table `companies` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyName` to the `companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyTypeId` to the `companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `companyUniqueId` to the `companies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `permits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `capacity_tons` to the `transports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `company_id` to the `transports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_id` to the `transports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transport_type` to the `transports` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `transports` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "company_members" DROP CONSTRAINT "company_members_companyId_fkey";

-- DropIndex
DROP INDEX "companies_country_city_idx";

-- DropIndex
DROP INDEX "companies_type_idx";

-- DropIndex
DROP INDEX "transports_companyId_idx";

-- DropIndex
DROP INDEX "transports_isActive_idx";

-- DropIndex
DROP INDEX "transports_ownerId_idx";

-- DropIndex
DROP INDEX "transports_transportType_idx";

-- AlterTable
ALTER TABLE "adr_classifications" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "companies" DROP COLUMN "address",
DROP COLUMN "country",
DROP COLUMN "description",
DROP COLUMN "isActive",
DROP COLUMN "logo",
DROP COLUMN "name",
DROP COLUMN "phone",
DROP COLUMN "taxId",
DROP COLUMN "type",
DROP COLUMN "website",
ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "companyDescription" TEXT,
ADD COLUMN     "companyName" TEXT NOT NULL,
ADD COLUMN     "companyTypeId" TEXT NOT NULL,
ADD COLUMN     "companyUniqueId" TEXT NOT NULL,
ADD COLUMN     "countRatings" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "countryId" TEXT,
ADD COLUMN     "documents" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "dotMc" TEXT,
ADD COLUMN     "isLegalEntity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "statusHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "verifyStatus" TEXT NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "company_types" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "countries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "currencies" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "load_types" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "loading_types" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "permits" DROP COLUMN "created_at",
DROP COLUMN "is_active",
DROP COLUMN "updated_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "transport_types" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "transports" DROP COLUMN "adrClasses",
DROP COLUMN "capacityM3",
DROP COLUMN "capacityTons",
DROP COLUMN "companyId",
DROP COLUMN "createdAt",
DROP COLUMN "heightM",
DROP COLUMN "isActive",
DROP COLUMN "lengthM",
DROP COLUMN "loadingTypes",
DROP COLUMN "ownerId",
DROP COLUMN "transportType",
DROP COLUMN "updatedAt",
DROP COLUMN "widthM",
ADD COLUMN     "adr_classes" TEXT[],
ADD COLUMN     "capacity_m3" DOUBLE PRECISION,
ADD COLUMN     "capacity_tons" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "company_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "height_m" DOUBLE PRECISION,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "length_m" DOUBLE PRECISION,
ADD COLUMN     "loading_types" TEXT[],
ADD COLUMN     "owner_id" TEXT NOT NULL,
ADD COLUMN     "transport_type" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "width_m" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "companies_companyUniqueId_key" ON "companies"("companyUniqueId");

-- CreateIndex
CREATE INDEX "companies_verifyStatus_idx" ON "companies"("verifyStatus");

-- CreateIndex
CREATE INDEX "companies_companyTypeId_idx" ON "companies"("companyTypeId");

-- CreateIndex
CREATE INDEX "companies_countryId_idx" ON "companies"("countryId");

-- CreateIndex
CREATE INDEX "companies_city_idx" ON "companies"("city");

-- CreateIndex
CREATE INDEX "company_members_companyId_idx" ON "company_members"("companyId");

-- CreateIndex
CREATE INDEX "transports_owner_id_idx" ON "transports"("owner_id");

-- CreateIndex
CREATE INDEX "transports_company_id_idx" ON "transports"("company_id");

-- CreateIndex
CREATE INDEX "transports_transport_type_idx" ON "transports"("transport_type");

-- CreateIndex
CREATE INDEX "transports_is_active_idx" ON "transports"("is_active");
