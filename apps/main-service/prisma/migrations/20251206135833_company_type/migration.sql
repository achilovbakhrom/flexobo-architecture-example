/*
  Warnings:

  - You are about to drop the column `description` on the `adr_classifications` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `adr_classifications` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `countries` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `currencies` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `load_types` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `load_types` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `loading_types` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `loading_types` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `permits` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `permits` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `transport_types` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `transport_types` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "load_types_name_key";

-- DropIndex
DROP INDEX "loading_types_name_key";

-- DropIndex
DROP INDEX "permits_name_key";

-- DropIndex
DROP INDEX "transport_types_name_key";

-- AlterTable
ALTER TABLE "adr_classifications" DROP COLUMN "description",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "countries" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "currencies" DROP COLUMN "name";

-- AlterTable
ALTER TABLE "load_types" DROP COLUMN "description",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "loading_types" DROP COLUMN "description",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "permits" DROP COLUMN "description",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "transport_types" DROP COLUMN "description",
DROP COLUMN "name";

-- CreateTable
CREATE TABLE "company_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "company_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_type_translations" (
    "id" TEXT NOT NULL,
    "company_type_id" TEXT NOT NULL,
    "language_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "company_type_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_types_code_key" ON "company_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "company_type_translations_company_type_id_language_code_key" ON "company_type_translations"("company_type_id", "language_code");

-- AddForeignKey
ALTER TABLE "company_type_translations" ADD CONSTRAINT "company_type_translations_company_type_id_fkey" FOREIGN KEY ("company_type_id") REFERENCES "company_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
