-- Backfill: set accountId to the user's first BANK account for any NULL rows
UPDATE recurring_transactions rt
SET "accountId" = (
  SELECT a.id FROM accounts a
  WHERE a."userId" = rt."userId" AND a.type = 'BANK'
  ORDER BY a."createdAt" ASC
  LIMIT 1
)
WHERE rt."accountId" IS NULL;

-- Delete any remaining rows where no bank account exists (edge case)
DELETE FROM recurring_transactions WHERE "accountId" IS NULL;

-- Now make accountId required
ALTER TABLE "recurring_transactions" ALTER COLUMN "accountId" SET NOT NULL;

-- Update accountId foreign key from SET NULL to RESTRICT
ALTER TABLE "recurring_transactions" DROP CONSTRAINT "recurring_transactions_accountId_fkey";
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add budgetId column
ALTER TABLE "recurring_transactions" ADD COLUMN "budgetId" TEXT;

-- Add foreign key for budgetId
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on budgetId
CREATE INDEX "recurring_transactions_budgetId_idx" ON "recurring_transactions"("budgetId");
