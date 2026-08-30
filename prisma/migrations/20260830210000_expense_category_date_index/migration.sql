-- CreateIndex
CREATE INDEX "expenses_userId_categoryId_date_idx" ON "expenses"("userId", "categoryId", "date");
