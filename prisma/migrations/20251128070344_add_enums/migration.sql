/*
  Warnings:

  - Changed the type of `type` on the `accounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `categories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'CASH', 'CREDIT', 'INVESTMENT', 'LOAN');

-- CreateEnum
CREATE TYPE "CategoryType" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "type",
ADD COLUMN     "type" "AccountType" NOT NULL;

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "type",
ADD COLUMN     "type" "CategoryType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "categories_userId_name_type_key" ON "categories"("userId", "name", "type");
