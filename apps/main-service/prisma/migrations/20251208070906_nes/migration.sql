/*
  Warnings:

  - You are about to drop the column `code` on the `company_types` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "company_types_code_key";

-- AlterTable
ALTER TABLE "company_types" DROP COLUMN "code";
