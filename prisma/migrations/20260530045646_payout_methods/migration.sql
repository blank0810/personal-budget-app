-- CreateEnum
CREATE TYPE "PayoutProvider" AS ENUM ('WISE', 'PAYPAL', 'GCASH', 'BANK', 'OTHER');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "payoutSnapshot" JSONB;

-- CreateTable
CREATE TABLE "payout_methods" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "PayoutProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "currency" TEXT,
    "payLink" TEXT,
    "accountDetails" TEXT,
    "showQr" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_methods_userId_isArchived_idx" ON "payout_methods"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "payout_methods_userId_currency_idx" ON "payout_methods"("userId", "currency");

-- AddForeignKey
ALTER TABLE "payout_methods" ADD CONSTRAINT "payout_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
