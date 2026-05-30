/*
  Warnings:

  - You are about to drop the column `payoutSnapshot` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the `payout_methods` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "payout_methods" DROP CONSTRAINT "payout_methods_userId_fkey";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "payoutSnapshot",
ADD COLUMN     "paymentLink" TEXT;

-- DropTable
DROP TABLE "payout_methods";

-- DropEnum
DROP TYPE "PayoutProvider";
