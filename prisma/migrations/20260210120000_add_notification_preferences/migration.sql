-- CreateTable
CREATE TABLE "notification_types" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationTypeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_types_key_key" ON "notification_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_userId_notificationTypeId_key" ON "user_notification_preferences"("userId", "notificationTypeId");

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_notificationTypeId_fkey" FOREIGN KEY ("notificationTypeId") REFERENCES "notification_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed notification types
INSERT INTO "notification_types" ("id", "key", "label", "description", "category", "defaultEnabled") VALUES
    ('nt_monthly_report', 'monthly_report', 'Monthly Financial Report', 'Receive a PDF financial digest on the 1st of each month', 'reports', true),
    ('nt_budget_alerts', 'budget_alerts', 'Budget Alerts', 'Get notified when a budget reaches 80% or exceeds 100%', 'alerts', true),
    ('nt_income_notifications', 'income_notifications', 'Income Notifications', 'Get notified when income is recorded to your account', 'activity', true);

-- Data migration: for users who had monthlyReportEnabled = false, insert override row
INSERT INTO "user_notification_preferences" ("id", "userId", "notificationTypeId", "enabled")
SELECT
    'unp_' || "id",
    "id",
    'nt_monthly_report',
    false
FROM "users"
WHERE "monthlyReportEnabled" = false;

-- Drop old column
ALTER TABLE "users" DROP COLUMN "monthlyReportEnabled";
