-- AlterTable
ALTER TABLE "transfers" ADD COLUMN     "efGoalId" TEXT,
ADD COLUMN     "parentIncomeId" TEXT;

-- CreateIndex
CREATE INDEX "transfers_parentIncomeId_idx" ON "transfers"("parentIncomeId");

-- CreateIndex
CREATE INDEX "transfers_efGoalId_idx" ON "transfers"("efGoalId");

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_parentIncomeId_fkey" FOREIGN KEY ("parentIncomeId") REFERENCES "incomes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_efGoalId_fkey" FOREIGN KEY ("efGoalId") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: parentIncomeId for Tithe-labeled transfers
-- Match by same user, same fromAccount, same date, suffix-match on description.
-- Only set when exactly one income matches (ambiguous left null).
WITH tithe_candidates AS (
  SELECT
    t.id AS transfer_id,
    i.id AS income_id,
    COUNT(*) OVER (PARTITION BY t.id) AS match_count
  FROM transfers t
  INNER JOIN incomes i ON
    t."userId" = i."userId"
    AND t."fromAccountId" = i."accountId"
    AND t."date" = i."date"
    AND (
      SUBSTRING(t.description FROM 11) = i.description
      OR (SUBSTRING(t.description FROM 11) = 'Income' AND i.description IS NULL)
    )
  WHERE t.description LIKE 'Tithe for %'
    AND t."parentIncomeId" IS NULL
)
UPDATE transfers t
SET "parentIncomeId" = c.income_id
FROM tithe_candidates c
WHERE t.id = c.transfer_id
  AND c.match_count = 1;

-- Backfill: parentIncomeId for Emergency-Fund-labeled transfers
WITH ef_income_candidates AS (
  SELECT
    t.id AS transfer_id,
    i.id AS income_id,
    COUNT(*) OVER (PARTITION BY t.id) AS match_count
  FROM transfers t
  INNER JOIN incomes i ON
    t."userId" = i."userId"
    AND t."fromAccountId" = i."accountId"
    AND t."date" = i."date"
    AND (
      SUBSTRING(t.description FROM 33) = i.description
      OR (SUBSTRING(t.description FROM 33) = 'Income' AND i.description IS NULL)
    )
  WHERE t.description LIKE 'Emergency Fund contribution for %'
    AND t."parentIncomeId" IS NULL
)
UPDATE transfers t
SET "parentIncomeId" = c.income_id
FROM ef_income_candidates c
WHERE t.id = c.transfer_id
  AND c.match_count = 1;

-- Backfill: efGoalId for Emergency-Fund-labeled transfers
-- Match the EF goal by user + linkedAccountId = transfer.toAccountId + isEmergencyFund.
-- Only set when exactly one goal matches.
WITH ef_goal_candidates AS (
  SELECT
    t.id AS transfer_id,
    g.id AS goal_id,
    COUNT(*) OVER (PARTITION BY t.id) AS match_count
  FROM transfers t
  INNER JOIN goals g ON
    g."userId" = t."userId"
    AND g."linkedAccountId" = t."toAccountId"
    AND g."isEmergencyFund" = true
  WHERE t.description LIKE 'Emergency Fund contribution for %'
    AND t."efGoalId" IS NULL
)
UPDATE transfers t
SET "efGoalId" = c.goal_id
FROM ef_goal_candidates c
WHERE t.id = c.transfer_id
  AND c.match_count = 1;
