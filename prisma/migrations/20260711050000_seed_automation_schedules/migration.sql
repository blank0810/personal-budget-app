-- Seed the system-wide AutomationSchedule rows so a prod deploy (which runs
-- `prisma migrate deploy` but NOT `prisma db seed`) still populates the scheduler.
-- Idempotent via the deterministic `system-<jobKey>` ids used by prisma/seed.ts;
-- ON CONFLICT (id) DO NOTHING preserves any admin-edited cadence on re-deploy.
-- nextRunAt is left NULL: runDue() treats NULL as "due now" and computes the next
-- occurrence after the first run.
INSERT INTO "automation_schedules"
  ("id", "jobKey", "userId", "frequency", "atMinute", "atHour", "dayOfWeek", "dayOfMonth", "enabled", "lastRunAt", "nextRunAt", "lastStatus", "createdAt", "updatedAt")
VALUES
  ('system-monthly-report',  'monthly-report',  NULL, 'MONTHLY', 0, 0, NULL, 1,    true, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('system-process-reports', 'process-reports', NULL, 'DAILY',   0, 0, NULL, NULL, true, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('system-invoice-overdue', 'invoice-overdue', NULL, 'DAILY',   0, 6, NULL, NULL, true, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
