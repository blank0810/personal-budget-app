-- ============================================================
-- Consolidate EMERGENCY_FUND / FUND account types into Goals
-- ============================================================

-- Step 0: Add new columns to goals table FIRST (before data migration)
-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('FIXED_AMOUNT', 'MONTHS_COVERAGE');

-- AddColumn
ALTER TABLE "goals" ADD COLUMN "goalType" "GoalType" NOT NULL DEFAULT 'FIXED_AMOUNT';
ALTER TABLE "goals" ADD COLUMN "isEmergencyFund" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "goals" ADD COLUMN "thresholdLow" INTEGER DEFAULT 2;
ALTER TABLE "goals" ADD COLUMN "thresholdMid" INTEGER DEFAULT 4;
ALTER TABLE "goals" ADD COLUMN "thresholdHigh" INTEGER DEFAULT 6;

-- Step 1: Migrate EMERGENCY_FUND accounts → Goals
INSERT INTO "goals" ("id", "name", "targetAmount", "currentAmount", "baselineAmount",
                     "status", "linkedAccountId", "userId", "createdAt", "updatedAt",
                     "goalType", "isEmergencyFund", "thresholdLow", "thresholdMid", "thresholdHigh")
SELECT
    gen_random_uuid()::text,
    a."name",
    COALESCE(a."targetAmount", 0),
    a."balance",
    0,
    'ACTIVE',
    a."id",
    a."userId",
    NOW(),
    NOW(),
    'MONTHS_COVERAGE',
    true,
    COALESCE(a."fundThresholdLow", 2),
    COALESCE(a."fundThresholdMid", 4),
    COALESCE(a."fundThresholdHigh", 6)
FROM "accounts" a
WHERE a."type" = 'EMERGENCY_FUND'
  AND a."isArchived" = false
  -- Don't duplicate if a goal already links to this account
  AND NOT EXISTS (SELECT 1 FROM "goals" g WHERE g."linkedAccountId" = a."id");

-- Step 2: Migrate FUND accounts → Goals
INSERT INTO "goals" ("id", "name", "targetAmount", "currentAmount", "baselineAmount",
                     "status", "linkedAccountId", "userId", "createdAt", "updatedAt",
                     "goalType", "isEmergencyFund", "thresholdLow", "thresholdMid", "thresholdHigh")
SELECT
    gen_random_uuid()::text,
    a."name",
    COALESCE(a."targetAmount", a."balance"),
    a."balance",
    0,
    'ACTIVE',
    a."id",
    a."userId",
    NOW(),
    NOW(),
    'FIXED_AMOUNT',
    false,
    COALESCE(a."fundThresholdLow", 2),
    COALESCE(a."fundThresholdMid", 4),
    COALESCE(a."fundThresholdHigh", 6)
FROM "accounts" a
WHERE a."type" = 'FUND'
  AND a."isArchived" = false
  AND NOT EXISTS (SELECT 1 FROM "goals" g WHERE g."linkedAccountId" = a."id");

-- Step 3: Convert fund account types to SAVINGS
UPDATE "accounts" SET "type" = 'SAVINGS' WHERE "type" IN ('EMERGENCY_FUND', 'FUND');

-- Step 4: Drop fund-specific columns from accounts
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "targetAmount";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "fundCalculationMode";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "fundThresholdLow";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "fundThresholdMid";
ALTER TABLE "accounts" DROP COLUMN IF EXISTS "fundThresholdHigh";

-- Step 5: Remove enum values
-- PostgreSQL doesn't support DROP VALUE from enum directly.
-- We need to create a new enum, migrate, and swap.
CREATE TYPE "AccountType_new" AS ENUM ('BANK', 'CASH', 'CREDIT', 'INVESTMENT', 'LOAN', 'SAVINGS', 'TITHE');
ALTER TABLE "accounts" ALTER COLUMN "type" TYPE "AccountType_new" USING ("type"::text::"AccountType_new");
DROP TYPE "AccountType";
ALTER TYPE "AccountType_new" RENAME TO "AccountType";
