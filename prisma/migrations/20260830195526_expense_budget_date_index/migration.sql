-- CreateIndex
CREATE INDEX "expenses_userId_budgetId_date_idx" ON "expenses"("userId", "budgetId", "date");
