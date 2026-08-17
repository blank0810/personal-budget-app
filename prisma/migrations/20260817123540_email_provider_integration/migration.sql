-- CreateEnum
CREATE TYPE "EmailProviderKey" AS ENUM ('RESEND');

-- CreateEnum
CREATE TYPE "EmailPriority" AS ENUM ('CRITICAL', 'HIGH', 'NORMAL');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'SUPPRESSED_QUOTA', 'SKIPPED_PREF');

-- CreateTable
CREATE TABLE "email_provider_configs" (
    "id" TEXT NOT NULL,
    "provider" "EmailProviderKey" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "replyToEmail" TEXT,
    "credentials" TEXT NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_send_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "notificationKey" TEXT,
    "priority" "EmailPriority" NOT NULL,
    "status" "EmailStatus" NOT NULL,
    "provider" "EmailProviderKey",
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "idempotencyKey" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_provider_configs_provider_key" ON "email_provider_configs"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "email_send_logs_idempotencyKey_key" ON "email_send_logs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "email_send_logs_createdAt_idx" ON "email_send_logs"("createdAt");

-- CreateIndex
CREATE INDEX "email_send_logs_userId_createdAt_idx" ON "email_send_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
