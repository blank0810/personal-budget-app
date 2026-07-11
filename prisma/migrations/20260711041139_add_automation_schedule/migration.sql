-- CreateEnum
CREATE TYPE "AutomationFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "automation_schedules" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "userId" TEXT,
    "frequency" "AutomationFrequency" NOT NULL,
    "atMinute" INTEGER,
    "atHour" INTEGER,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "automation_schedules_jobKey_userId_key" ON "automation_schedules"("jobKey", "userId");
