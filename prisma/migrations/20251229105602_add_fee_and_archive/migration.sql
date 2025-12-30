-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "transfers" ADD COLUMN     "fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "accounts_userId_isArchived_idx" ON "accounts"("userId", "isArchived");
