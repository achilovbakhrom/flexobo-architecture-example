/*
  Warnings:

  - You are about to drop the column `code` on the `adr_classifications` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `adr_classifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `company_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `countries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `currencies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `load_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `loading_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `permits` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `transport_types` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "adr_classifications_code_key";

-- AlterTable
ALTER TABLE "adr_classifications" DROP COLUMN "code",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "company_types" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "countries" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "currencies" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "load_types" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "loading_types" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "permits" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "transport_types" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
