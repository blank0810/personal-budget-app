-- CreateEnum
CREATE TYPE "RequestCategory" AS ENUM ('BUG', 'ENHANCEMENT', 'NEW_FEATURE', 'UI_UX');

-- DropIndex
DROP INDEX "user_notification_preferences_userId_notificationTypeId_key";

-- CreateTable
CREATE TABLE "feature_requests" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "RequestCategory" NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
