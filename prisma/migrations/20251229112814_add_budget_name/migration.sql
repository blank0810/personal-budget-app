/*
  Warnings:

  - A unique constraint covering the columns `[userId,name,month]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `budgets` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "budgets_userId_categoryId_month_key";

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "budgets_userId_categoryId_idx" ON "budgets"("userId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_name_month_key" ON "budgets"("userId", "name", "month");
