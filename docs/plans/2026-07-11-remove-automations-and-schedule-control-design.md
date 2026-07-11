# Remove Recurring + SMS Dispatch, add Automation Schedule Control

**Date:** 2026-07-11
**Status:** Validated design — ready for implementation
**Review gates:** `money-feature-review` skill + **accountant** sign-off (Workstream A migration; Workstream C report job)

## Summary

Three independent workstreams, ordered A → B → C so the risky money-migration
lands first and C's registry only lists what survives.

- **A. Remove Recurring** — full wipe. The automation makes no sense unless it is
  tied directly to a bank account; removing it entirely.
- **B. Remove SMS dispatch** — gut the current dispatch plumbing; a new
  integration will replace it. Keep the saved details (phone numbers, prefs).
- **C. Automation schedule control** — DB-driven cadence, admin system-wide now,
  shaped so per-user cadence is an additive change later.

## Decisions locked (from brainstorm)

| Decision | Choice |
|---|---|
| Removal depth | Full deletion |
| Recurring data reach | **Wipe all traces** — drop table, drop `isRecurring`/`recurringPeriod`, migrate `source=RECURRING`→`MANUAL`, drop enum value |
| SMS scope | **Keep scaffolding, gut dispatch** — keep `phoneNumber`, `SMS` channel, per-user SMS prefs; delete cron/queue/service/send-calls |
| Schedule control | **DB-driven cadence** — frequent tick, jobs self-gate on stored cadence |
| Audience | **Admin system-wide now, per-user later** (`userId` nullable from day one) |
| Dormant SMS toggles | Show a "SMS notifications coming soon" hint (option b) |

---

## Workstream A — Remove Recurring

### Code deletions
- `server/modules/recurring/{service,controller,types}.ts`
- `app/api/cron/process-recurring/route.ts` + its `vercel.json` cron entry
- `recurring_transactions` feature flag (seed + `feature-flag.types.ts`)
- `recurring` cache tag in `server/lib/cache-tags.ts`
- **UI entry points:** `RECURRING` filter in `TransactionFilters.tsx`; recurring
  quick-action in `QuickActionSheet.tsx`; onboarding step in
  `onboarding.controller.ts`; recurring stat in `AdminDashboard.tsx`; recurring
  toggle in `ProfilePage.tsx`
- **Marketing (must go — false advertising otherwise):** `FeatureRowRecurring`,
  how-it-works step (`LagoonHowItWorks`/`HowItWorksSteps`), pricing bullet
  (`PricingPlans`/`LagoonPricing`), `PricingFAQ`/`faq-data`, `LagoonStats`,
  `LagoonFeatureGrid`, `FeaturesHero`, `app/(public)/features/page.tsx`,
  `app/(public)/layout.tsx` mentions. **budget-seo** verifies no orphaned
  internal links / schema references remain.
- **Money code:** strip `isRecurring`/`recurringPeriod` from `income.{service,types}`
  and `expense.{service,types}`; remove `source=RECURRING` branches in
  payment/transfer/account/account-reset/admin-analytics/admin-system services.
- **Docs:** CLAUDE.md line ~130 `TransactionSource enum (MANUAL/IMPORT/RECURRING)`
  → drop `RECURRING`; remove `recurring` from module list + cron comment.

### The migration (order is load-bearing)
1. **Pre-flight count** — `SELECT count(*)` on `RecurringTransaction` and on
   `source='RECURRING'` rows. Report before destroying. Runs against **prod on
   deploy**, so the counts get eyeballed first.
2. **Backfill** — `UPDATE income/expense SET source='MANUAL' WHERE source='RECURRING'`.
3. **Drop columns** — `isRecurring`, `recurringPeriod` from Income + Expense.
4. **Drop table** — `RecurringTransaction` (+ FKs on User/Account/Category/Budget).
5. **Drop enum value** — Postgres **cannot** drop an enum value in place; Prisma
   recreates `TransactionSource` without `RECURRING` and re-points columns. Must
   come **after** step 2 or the type swap fails on existing rows.

### Gates
`money-feature-review` + accountant review the diff and the migration before merge.

---

## Workstream B — Remove SMS dispatch

### Delete
- `app/api/cron/process-sms/route.ts` + its `vercel.json` entry
- `server/modules/notification/sms.queue.ts`, `sms.service.ts`
- `sms-notifications` BullMQ queue + its health check in `admin-system.service.ts`
- Dispatch call sites: SMS branch in `sendBudgetAlert` and `sendIncomeNotification`,
  the whole `sendMonthlyReportSms` method (`notification.service.ts`) and its
  caller in `report.service.ts` (~line 1096)
- Roast-SMS templates: `getBudgetRoastSms`/`getIncomeRoastSms`/`getReportRoastSms`
- **Docs:** CLAUDE.md Stack line (`BullMQ … monthly-reports, sms-notifications` →
  drop the SMS queue); cron list comment.

### Keep (saved details)
- `phoneNumber` column, `SMS` value in `NotificationChannel`, all per-user SMS
  notification preferences + profile SMS toggles — dormant, ready for the new
  integration.

### Net effect
Budget alerts, income notifications, and the monthly report become **email-only**.
`lib/redis.ts` stays (report queue still uses it). Profile SMS toggles render with
a "SMS notifications coming soon" hint.

---

## Workstream C — Automation schedule control

### Data model — `AutomationSchedule`
```
id          String   @id @default(cuid)
jobKey      String                    // 'monthly-report' | 'process-reports' | 'invoice-overdue'
userId      String?                   // NULL = system default (forward-compat)
frequency   AutomationFrequency       // HOURLY | DAILY | WEEKLY | MONTHLY
atMinute    Int?     // 0–59
atHour      Int?     // 0–23
dayOfWeek   Int?     // 0–6  (WEEKLY)
dayOfMonth  Int?     // 1–31 (MONTHLY)
enabled     Boolean  @default(true)
lastRunAt   DateTime?
nextRunAt   DateTime?
lastStatus  String?
@@unique([jobKey, userId])
```
Structured cadence (not raw cron) — friendlier to edit, sufficient for these jobs.

### Job registry
`server/modules/automation/registry.ts` maps each `jobKey` to its handler (the
surviving report-enqueue, report-drain, invoice-overdue functions). Code owns
*what jobs exist*; the DB owns *when they run*. Seed one system row per registered
job with today's cadence (monthly-report → MONTHLY, others → DAILY).

### The tick
Collapse the per-job `vercel.json` crons into a single `/api/cron/scheduler`
firing **hourly** (CRON_SECRET-gated). Each tick: load enabled schedules where
`nextRunAt <= now`, run each via registry, update
`lastRunAt`/`nextRunAt`/`lastStatus`, write `CronRunLog`. Hourly is the finest
cadence granularity — fine for daily/weekly/monthly.

### Admin UI — `/admin/automations`
Sits beside admin system-health (ADMIN role + sudo gate already enforced by the
admin layout). Table, one row per job: name, cadence, enabled, last run, status,
next run. Cadence edited inline — frequency dropdown reveals only the relevant
time fields. "Enabled" is a pause toggle.

### Data flow (controller → service → Prisma)
- Page (server) → `automation.controller.getSchedules()` → `automation.service` → Prisma
- Edit → `automation.controller.updateSchedule()` — `getAuthenticatedUser()` +
  admin assertion + Zod (hour 0–23, dayOfMonth 1–31…), recompute `nextRunAt`,
  `invalidateTags(['automation-schedules'])`
- Scheduler route → `automation.service.runDue()` → registry handlers

### Error handling
Per-job `try/catch` in the tick; one failing job logs to `CronRunLog` and does
not block others. Scheduler returns 200 with a per-job result array. Overlap
guard: skip a job whose previous run is still `lastStatus='running'`. Handlers
stay idempotent — monthly-report dedup via the `monthlyReport` unique constraint
already protects against double-send on cadence edits.

### Testing
Unit tests for `nextRunAt` computation per frequency, due-selection, registry
dispatch, idempotency. Money-review pass since report-enqueue is user-facing money
output.

---

## Sequencing & workflow
- Order: A → B → C.
- **Git:** commit straight to `main`, no feature branch / PR (solo-project rule).
- **Implementation:** handed to **Codex** (available), reviewed by the relevant
  Claude council agents; money-touching diffs (A, C) pass `money-feature-review` +
  accountant before commit.
- The destructive prod migration (A) is confirmed against the pre-flight counts
  before it ships.
