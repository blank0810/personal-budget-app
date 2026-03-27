-- AlterTable
ALTER TABLE "users" ADD COLUMN "resetConfirmToken" TEXT,
ADD COLUMN "resetConfirmExpiresAt" TIMESTAMP(3);
