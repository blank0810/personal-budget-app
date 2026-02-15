# SMS Notifications

**Feature:** #25 — SMS notifications
**Date:** 2026-02-12
**Status:** Design Complete

---

## Problem

Email notifications (budget alerts, income confirmations, monthly reports) are live but emails get buried (~20% open rate). SMS has ~98% open rate and delivers time-sensitive alerts immediately. Budget threshold alerts are most impactful when they're impossible to miss.

## Decision: Free PH SMS API + BullMQ Rate-Limited Queue

Use the free Philippine SMS API (`sms-api-ph.netlify.app`) with BullMQ queue for rate limiting. SMS plugs into the existing notification infrastructure as a second delivery channel alongside email.

**API details:**
- Endpoint: `POST /send/sms` with `x-api-key` header
- Philippine numbers only (`+639`)
- Rate limit: 1 request per 10 seconds, 6 per minute
- No daily/monthly limits

**Why BullMQ queue:**
- Rate limit compliance for batch scenarios (monthly report cron with many users)
- Native `limiter` option: `{ max: 1, duration: 10000 }`
- Retry with backoff on failure
- Already have Redis + BullMQ infrastructure from monthly reports

---

## Schema Changes

### NotificationChannel Enum

```prisma
enum NotificationChannel {
  EMAIL
  SMS
}
```

### UserNotificationPreference — Add Channel

```prisma
model UserNotificationPreference {
  id                 String              @id @default(cuid())
  userId             String
  notificationTypeId String
  channel            NotificationChannel @default(EMAIL)
  enabled            Boolean
  user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  notificationType   NotificationType    @relation(fields: [notificationTypeId], references: [id], onDelete: Cascade)

  @@unique([userId, notificationTypeId, channel])
}
```

### User — Add Phone Number

```prisma
model User {
  // existing fields...
  phoneNumber  String?   // +639XXXXXXXXX format
}
```

### Migration Strategy

1. Add `NotificationChannel` enum
2. Add `channel` column with default `EMAIL` (existing rows become email preferences)
3. Update unique constraint from `(userId, notificationTypeId)` to `(userId, notificationTypeId, channel)`
4. Add `phoneNumber` to User (nullable)

All existing data stays intact — zero data loss.

---

## SMS Service + Queue

### sms.service.ts

Thin wrapper around the PH SMS API:

- POST to `SMS_API_URL/send/sms`
- Headers: `x-api-key` from `SMS_API_KEY` env var
- Validates PH format (`+639`, 12 digits) before sending
- Returns `true`/`false` — never throws

### sms.queue.ts

BullMQ queue with rate limiter:

- Queue name: `sms-notifications`
- Limiter: `{ max: 1, duration: 10000 }` (1 per 10 seconds)
- Retry: 2 attempts, 15s exponential backoff
- Worker: short-lived, processes jobs and calls `SmsService.send()`

### Notification Flow

**Budget alerts / income** (single user action):
```
Controller → NotificationService.sendBudgetAlert()
  → EmailService.send()          // direct, fire-and-forget
  → SmsQueue.add(job)            // queued, rate-limited
```

**Monthly report cron** (batch):
```
Cron → processes reports per user
  → EmailService.sendWithAttachment()  // direct
  → SmsQueue.add(job)                  // queued, paced at 1 per 10s
```

### SMS Cron Route

`/api/cron/process-sms` — runs every minute, starts short-lived BullMQ worker, processes up to 5 SMS jobs per invocation (50 seconds at 10s rate limit, within Vercel's 60s timeout).

---

## NotificationService Changes

### isEnabled() — Gains Channel Parameter

```typescript
isEnabled(userId, 'budget_alerts', 'EMAIL')  // → boolean
isEnabled(userId, 'budget_alerts', 'SMS')    // → boolean
```

### sendBudgetAlert() — Adds SMS Path

1. Check `isEnabled(userId, 'budget_alerts', 'EMAIL')` → send email
2. Check `isEnabled(userId, 'budget_alerts', 'SMS')` → check user has phoneNumber → queue SMS with roast message
3. Roast tier based on percentage (80-90%, 90-100%, 100-110%, 110%+)

### sendIncomeNotification() — Adds SMS Path

Same pattern. Roast tier based on amount brackets (<₱1k, ₱1k-₱50k, ₱50k+).

### New: sendMonthlyReportSms()

Called from `ReportService.generateAndSend()` after email. Roast tier based on health score (80+, 70-79, 40-69, <40).

---

## Roast SMS Templates

Messages are picked randomly per tier so users don't get the same text every time.

### Budget Alert (80%)

- 80-90%: `[Budget Planner] ⚠️ 82% of your "{name}" budget gone (₱4,100/₱5,000). ₱900 left — maybe cook at home tonight?`
- 90-100%: `[Budget Planner] 🔥 Your "{name}" budget is on life support — 93% gone (₱4,650/₱5,000). ₱350 to survive the rest of the month. Good luck.`

### Budget Alert (100%)

- 100-110%: `[Budget Planner] 🚨 "{name}" budget OBLITERATED — ₱5,300 on a ₱5,000 limit. You're ₱300 over. Your budget didn't die, you murdered it.`
- 110%+: `[Budget Planner] 💀 "{name}" budget at 130% — ₱6,500 on ₱5,000. You're not overspending, you're committing financial arson. You are COOKED.`

### Income Notification

- Small (<₱1k): `[Budget Planner] ₱500 ({category}) → {account}. That's not income, that's a consolation prize. Stack harder.`
- Medium (₱1k-₱50k): `[Budget Planner] 💰 ₱25,000 ({category}) → {account}. Balance: ₱47,500. Decent bag. Touch it and I'll know.`
- Large (₱50k+): `[Budget Planner] 🤑 ₱80,000 ({category}) → {account}. Balance: ₱127,500. Big bag alert. Invest it before you blow it on shopee.`

### Monthly Report Summary

- Great (80+): `[Budget Planner] 📊 {month} report: Health {score}/100 | Net +₱18,000. You actually cooked this month (the good kind). Don't let it go to your head. Full report in email.`
- Good (70-79): `[Budget Planner] 📊 {month} report: Health {score}/100 | Net +₱8,200. Not bad, not great. Financial C+ student. Room to grow. Details in email.`
- Mid (40-69): `[Budget Planner] 📊 {month} report: Health {score}/100 | Net +₱2,100. Barely breathing financially. One impulse purchase from disaster. Wake-up call in email.`
- Bad (<40): `[Budget Planner] 📊 {month} report: Health {score}/100 | Net -₱8,500. You are financially COOKED. This isn't a budget, it's a crime scene. Damage report in email.`

---

## Profile Page UI Changes

### Personal Info Card — Phone Number Field

- New row below email: phone icon + phone number (or "Not set" muted)
- Inline edit with pencil icon (same pattern as name)
- Validates PH format: `+639` prefix, 12 digits total
- Placeholder: `+639XXXXXXXXX`

### Notification Preferences Card — Dual Toggles

```
┌─────────────────────────────────────────────────────────┐
│  Notification Preferences                 Email    SMS  │
├─────────────────────────────────────────────────────────┤
│  ┌ Info Banner (if no phone number) ──────────────────┐ │
│  │ 📱 Add your mobile number in Personal Info above   │ │
│  │    to unlock SMS notifications.                    │ │
│  └────────────────────────────────────────────────────┘ │
│                                                         │
│  REPORTS                                                │
│  Monthly Financial Report              [✓]    [✗]       │
│                                                         │
│  ALERTS                                                 │
│  Budget Alerts                         [✓]    [✓]       │
│                                                         │
│  ACTIVITY                                               │
│  Income Notifications                  [✓]    [✗]       │
└─────────────────────────────────────────────────────────┘
```

- SMS toggles disabled + grayed out when no phone number
- Tooltip on disabled SMS toggle: "Add your phone number to enable"
- Info banner disappears once phone number is saved
- Optimistic UI with revert on error (existing pattern)

---

## Environment + Docker

### New Env Vars

```
SMS_API_KEY=your-api-key-here
SMS_API_URL=https://sms-api-ph.netlify.app
```

### docker-compose.yml

```yaml
app:
  environment:
    # ...existing vars
    SMS_API_KEY: ${SMS_API_KEY}
    SMS_API_URL: ${SMS_API_URL}
```

### vercel.json

Add `/api/cron/process-sms` schedule (every minute).

---

## New/Modified Files

### New Files

| File | Purpose |
|------|---------|
| `server/modules/notification/sms.service.ts` | SmsService — POST to PH SMS API, PH number validation |
| `server/modules/notification/sms.queue.ts` | BullMQ queue with `limiter: { max: 1, duration: 10000 }`, short-lived worker |
| `app/api/cron/process-sms/route.ts` | Cron route — processes up to 5 SMS jobs per invocation |
| `prisma/migrations/2026XXXX_add_sms_notifications/` | NotificationChannel enum, channel column, phoneNumber field |

### Modified Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `NotificationChannel` enum, `channel` on UserNotificationPreference, `phoneNumber` on User |
| `server/modules/notification/notification.types.ts` | Channel param on schemas, roast message lookup objects (per tier, randomized) |
| `server/modules/notification/notification.service.ts` | `isEnabled()` gains channel param, `sendBudgetAlert()` + `sendIncomeNotification()` add SMS path, new `sendMonthlyReportSms()` |
| `server/modules/notification/notification.controller.ts` | `updateNotificationPreferenceAction()` gains channel param, new `updatePhoneNumberAction()` |
| `server/modules/report/report.service.ts` | Call `sendMonthlyReportSms()` after email in `generateAndSend()` |
| `components/modules/profile/ProfilePage.tsx` | Phone number in Personal Info, dual Email/SMS toggles, info banner, disabled SMS without phone |
| `docker-compose.yml` | Add `SMS_API_KEY`, `SMS_API_URL` env vars |
| `vercel.json` | Add `/api/cron/process-sms` schedule |

---

## Implementation Order

1. **Schema migration** — Add enum, channel column, phoneNumber field
2. **SMS service + queue** — sms.service.ts, sms.queue.ts, cron route
3. **NotificationService changes** — isEnabled() channel param, SMS paths in existing methods, roast templates
4. **Profile page UI** — Phone number field, dual toggles, info banner
5. **Report integration** — sendMonthlyReportSms() in generateAndSend()
6. **Docker + env** — Pass through new env vars
