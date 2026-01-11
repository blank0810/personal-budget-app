-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AccountType" ADD VALUE 'EMERGENCY_FUND';
ALTER TYPE "AccountType" ADD VALUE 'FUND';

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "fundCalculationMode" TEXT,
ADD COLUMN     "fundThresholdHigh" INTEGER DEFAULT 6,
ADD COLUMN     "fundThresholdLow" INTEGER DEFAULT 2,
ADD COLUMN     "fundThresholdMid" INTEGER DEFAULT 4,
ADD COLUMN     "targetAmount" DECIMAL(12,2);
