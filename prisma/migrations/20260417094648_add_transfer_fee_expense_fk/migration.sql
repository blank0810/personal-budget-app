-- AlterTable
ALTER TABLE "transfers" ADD COLUMN "feeExpenseId" TEXT;

-- Backfill: set feeExpenseId for existing transfers with fee > 0.
-- Match each fee-bearing transfer to its fee Expense by (userId, accountId, amount, date, description).
-- Only set when exactly one Expense matches — ambiguous/missing rows stay null
-- (and will be filtered out of bulk delete as defense-in-depth).
WITH fee_candidates AS (
  SELECT
    t.id AS transfer_id,
    e.id AS expense_id,
    COUNT(*) OVER (PARTITION BY t.id) AS match_count
  FROM transfers t
  INNER JOIN expenses e ON
    e."userId"      = t."userId"
    AND e."accountId" = t."fromAccountId"
    AND e.amount       = t.fee
    AND e.date         = t.date
    AND e.description  = 'Transfer fee'
  WHERE t.fee > 0
    AND t."feeExpenseId" IS NULL
)
UPDATE transfers t
SET "feeExpenseId" = c.expense_id
FROM fee_candidates c
WHERE t.id = c.transfer_id
  AND c.match_count = 1;

-- CreateIndex (unique)
CREATE UNIQUE INDEX "transfers_feeExpenseId_key" ON "transfers"("feeExpenseId");

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_feeExpenseId_fkey" FOREIGN KEY ("feeExpenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
