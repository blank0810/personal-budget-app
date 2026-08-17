/*
  Warnings:

  - The `provider` column on the `email_send_logs` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `email_provider_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "IntegrationCategory" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('RESEND');

-- AlterTable
ALTER TABLE "email_send_logs" DROP COLUMN "provider",
ADD COLUMN     "provider" "IntegrationProvider";

-- DropTable
DROP TABLE "email_provider_configs";

-- DropEnum
DROP TYPE "EmailProviderKey";

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "category" "IntegrationCategory" NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "credentials" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "lastVerifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integrations_category_isActive_idx" ON "integrations"("category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_category_provider_key" ON "integrations"("category", "provider");
