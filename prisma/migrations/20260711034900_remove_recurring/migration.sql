/*
  Warnings:

  - The values [RECURRING] on the enum `TransactionSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `isRecurring` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `recurringPeriod` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `isRecurring` on the `incomes` table. All the data in the column will be lost.
  - You are about to drop the column `recurringPeriod` on the `incomes` table. All the data in the column will be lost.
  - You are about to drop the `recurring_transactions` table. If the table is not empty, all the data it contains will be lost.

*/
-- DefensiveBackfill
UPDATE "incomes" SET "source" = 'MANUAL' WHERE "source" = 'RECURRING';
UPDATE "expenses" SET "source" = 'MANUAL' WHERE "source" = 'RECURRING';

-- AlterTable
ALTER TABLE "incomes" DROP COLUMN "isRecurring",
DROP COLUMN "recurringPeriod";

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "isRecurring",
DROP COLUMN "recurringPeriod";

-- DropForeignKey
ALTER TABLE "recurring_transactions" DROP CONSTRAINT "recurring_transactions_accountId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_transactions" DROP CONSTRAINT "recurring_transactions_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_transactions" DROP CONSTRAINT "recurring_transactions_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "recurring_transactions" DROP CONSTRAINT "recurring_transactions_userId_fkey";

-- DropTable
DROP TABLE "recurring_transactions";

-- DropEnum
DROP TYPE "RecurringFrequency";

-- DropEnum
DROP TYPE "RecurringType";

-- AlterEnum
BEGIN;
CREATE TYPE "TransactionSource_new" AS ENUM ('MANUAL', 'IMPORT');
ALTER TABLE "expenses" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "incomes" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "incomes" ALTER COLUMN "source" TYPE "TransactionSource_new" USING ("source"::text::"TransactionSource_new");
ALTER TABLE "expenses" ALTER COLUMN "source" TYPE "TransactionSource_new" USING ("source"::text::"TransactionSource_new");
ALTER TYPE "TransactionSource" RENAME TO "TransactionSource_old";
ALTER TYPE "TransactionSource_new" RENAME TO "TransactionSource";
DROP TYPE "TransactionSource_old";
ALTER TABLE "expenses" ALTER COLUMN "source" SET DEFAULT 'MANUAL';
ALTER TABLE "incomes" ALTER COLUMN "source" SET DEFAULT 'MANUAL';
COMMIT;

-- RemoveFeatureMetadata
DELETE FROM "user_features" WHERE "flagKey" = 'recurring_transactions';
DELETE FROM "feature_flags" WHERE "key" = 'recurring_transactions';
DELETE FROM "cron_run_logs" WHERE "key" = 'process-recurring';
