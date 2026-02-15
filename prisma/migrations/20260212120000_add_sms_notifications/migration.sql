-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- Add phoneNumber to users
ALTER TABLE "users" ADD COLUMN "phoneNumber" TEXT;

-- Add channel column with default EMAIL (existing rows become email preferences)
ALTER TABLE "user_notification_preferences" ADD COLUMN "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL';

-- Drop old unique constraint
ALTER TABLE "user_notification_preferences" DROP CONSTRAINT IF EXISTS "user_notification_preferences_userId_notificationTypeId_key";

-- Create new unique constraint including channel
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_notificationTypeId_cha_key" UNIQUE ("userId", "notificationTypeId", "channel");
