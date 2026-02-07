# Automated Monthly Financial Reports

**Date:** 2026-02-07
**Roadmap Items:** #4 + #9 (merged)
**Status:** Design approved
**Depends on:** #3 (Email service)

## Goal

Send a dynamic monthly financial snapshot as a PDF email attachment to all opted-in users on the 1st of each month. Users can also manually trigger a report for any month/year from the Reports page. PDFs stored in Vercel Blob for archival. Jobs processed via Redis (BullMQ) queue for scalability.

## Architecture

### Three-layer system

```
PRODUCERS                        QUEUE                    PROCESSOR
(add jobs)                       (stores jobs)            (does the work)

Cron 1: monthly-report ──┐                           ┌── Cron 2: process-reports
  Adds N jobs (all users) ├──→  Redis (BullMQ)  ──→──┤   Runs every 1 minute
Manual: server action ────┘     Upstash (prod)        │   Pulls batch of 5 jobs
  Adds 1 job (current user)     Docker (local)        │   Generates PDFs, sends emails
                                                      └── Returns within 60s timeout
```

### How it flows

**Cron batch (1st of month):**
1. `GET /api/cron/monthly-report` fires at midnight
2. Queries all users where `monthlyReportEnabled = true`
3. Adds one job per user to the `monthly-reports` BullMQ queue
4. Returns 200 immediately (takes <1 second)

**Worker cron (every minute):**
1. `GET /api/cron/process-reports` fires every minute
2. Pulls next batch (5 jobs) from the Redis queue
3. For each job: generateDigest -> renderPDF -> uploadBlob -> sendEmail
4. Marks jobs as completed or failed (BullMQ handles retry)
5. Returns within Vercel's 60s function timeout
6. 1,000 users processed in ~200 minutes (~3.3 hours)

**Manual trigger (user clicks button):**
1. Server action adds 1 job to queue with `priority: 1` (high — processed before batch jobs)
2. Next worker cron picks it up within 1 minute
3. User gets toast: "Report queued — you'll receive it shortly"

### Why this works on Vercel

Traditional BullMQ needs a long-running worker process. Vercel is serverless (functions die after each request). The workaround: replace the persistent worker with a cron that runs every minute and processes jobs in batches. Same Redis, same BullMQ API, no persistent process needed.

### Entry point comparison

| | Cron (batch) | Manual (single) | Worker (processor) |
|---|---|---|---|
| Endpoint | `GET /api/cron/monthly-report` | Server action | `GET /api/cron/process-reports` |
| Auth | `CRON_SECRET` header | NextAuth session | `CRON_SECRET` header |
| Does what | Adds N jobs to queue | Adds 1 job to queue | Processes batch from queue |
| Frequency | 1st of month, midnight | On demand | Every 1 minute |

### Shared service function

```typescript
ReportService.generateAndSend(
  userId: string,
  period: Date      // first day of target month, e.g. 2026-01-01
)
```

Pipeline: generateDigest() -> renderPDF() -> uploadBlob() -> sendEmail()

- Cron: `period = startOfMonth(subMonths(new Date(), 1))` (previous month)
- Manual: `period = new Date(selectedYear, selectedMonth - 1, 1)` (user's choice)

## Redis + BullMQ Setup

### Why BullMQ

Without a queue, the cron loops through all users sequentially in one request. If there are 1,000 users and each report takes 10 seconds, that's 2.7 hours in a single function call — which times out at 60 seconds on Vercel. BullMQ solves this by decoupling "what needs to be done" from "doing the work."

### Queue configuration

```typescript
// Queue name: 'monthly-reports'
// Job data: { userId: string, period: string (ISO date) }
// Job options:
//   - attempts: 3 (retry on failure)
//   - backoff: { type: 'exponential', delay: 60000 } (1m, 2m, 4m)
//   - priority: 1 for manual, 10 for batch (lower = higher priority)
//   - removeOnComplete: true
//   - removeOnFail: { age: 7 * 24 * 3600 } (keep failed jobs for 7 days)
```

### Portability

Redis is accessed via `REDIS_URL` environment variable. The code is 100% portable:

| Environment | Redis | Worker |
|---|---|---|
| **Local (Docker)** | Redis container in docker-compose | Worker container or cron |
| **Vercel + Upstash** | Upstash Redis (free tier) | Vercel cron every 1 minute |
| **Self-hosted VPS** | Redis container | BullMQ long-running worker |

Zero vendor lock-in. Same BullMQ code everywhere. Only the connection URL and worker strategy change.

### Docker Compose additions (local dev)

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

No separate worker container needed for local dev — can use the same cron-based approach or run a worker script via `npm run worker`.

## Vercel Cron Config (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/monthly-report",
      "schedule": "0 0 1 * *"
    },
    {
      "path": "/api/cron/process-reports",
      "schedule": "* * * * *"
    }
  ]
}
```

Note: Vercel free tier allows 2 cron jobs. This uses both. The process-reports cron is smart — if the queue is empty, it returns immediately (no wasted compute).

### Security

- `CRON_SECRET` env variable checked in both API routes
- Vercel injects automatically via `x-vercel-cron-secret` header
- Self-hosted: cron command passes same secret as header
- Manual trigger uses NextAuth session (no CRON_SECRET needed)

## Database Change

Add to User model:

```prisma
model User {
  ...existing fields...
  monthlyReportEnabled Boolean @default(true)
}
```

Single migration. All existing users default to opted-in (opt-out model).

## Dynamic Email Content

### Digest data structure

```typescript
ReportService.generateMonthlyDigest(userId, period) -> {
  userName: string
  month: string                    // "January 2026"
  sections: {
    healthScore: { score, label, roast, topRecommendation, focusPillar }  // always
    incomeExpense?: { totalIncome, totalExpense, netResult, savingsRate }
    topCategories?: { name, amount, percentage }[]   // top 5
    budgetPerformance?: { totalBudgeted, totalSpent, overUnder }
    liabilities?: { accounts: { name, balance, creditLimit?, utilization? }[], totalDebt, monthlyPaydown }
    funds?: { accounts: { name, balance, target?, progress? }[], emergencyFundMonths? }
    netWorth: { current, previousMonth, change, changePercent }           // always
  }
}
```

### Section rendering rules

| Section | Renders when | Data source |
|---------|-------------|-------------|
| Health Score + roast | Always | `DashboardService.getFinancialHealthScore()` |
| Income vs Expense | Income OR expenses exist for month | `ReportService.getFinancialStatement()` |
| Top 5 categories | Expenses exist for month | `ReportService.getCategoryBreakdown()` |
| Budget performance | Active budgets exist for month | `BudgetService.getBudgetTrends()` |
| Liabilities snapshot | User has liability accounts | `DashboardService.getFinancialHealthMetrics()` |
| Funds progress | User has fund accounts | `DashboardService.getFundHealthMetrics()` |
| Net Worth change | Always | `DashboardService.getNetWorth()` |

## PDF Design (Editorial Style)

Generated via `@react-pdf/renderer`. Narrative-driven, not spreadsheet-style.

### Typography
- Header font: DM Serif Display or Playfair Display (section titles)
- Body font: DM Sans or Source Sans (numbers and text)
- Accent color: Teal (#0D9488) for headers, green/red for financial status

### Layout (top to bottom)

```
HEADER
  Budget Planner | Monthly Financial Report
  [Month Year] | Prepared for [Name]

HEALTH SCORE (always)
  Score ring visual: 72/100
  Label: "Fair"
  Roast: "Not terrible, not great..."
  Focus: Liquidity (C) + recommendation

YOUR MONTH AT A GLANCE (if income/expenses exist)
  Narrative: "You earned $5,200, spent $3,800"
  "You saved $1,400 — that's 26.9% of your income"

WHERE YOUR MONEY WENT (if expenses exist)
  Top 5 categories with progress bars
  Rent     ||||||||||||..  $1,500
  Food     |||||........   $600

BUDGET CHECK (if budgets exist)
  Narrative: "You budgeted $4,000 and spent $3,800"
  "Under budget by $200. Nice restraint."

YOUR DEBT (if liabilities exist)
  Account list with utilization bars
  Total paydown + percentage

YOUR FUNDS (if funds exist)
  Fund list with progress toward target
  Emergency fund months covered

NET WORTH (always)
  Current value + change from last month
  Arrow + percentage

FOOTER (every page)
  Budget Planner | [Month Year] | Page N
  "Generated on [date]. Data reflects transactions as of [last day]."
  "For up-to-date figures, visit [app URL]."
```

## Email Template

Short and punchy. The email is the envelope, the PDF is the letter.

### Subject line
`Your [Month Year] Financial Report — Score: [X]/100`

### Body (inline HTML/CSS, table-based for Outlook)

```
Hi [Name],

Your [Month] financial snapshot is ready.

  Health Score         72 / 100  Fair
  Net Result           +$1,400
  Net Worth            $45,200  +3.2%

"[Roast feedback one-liner]"

Your full report is attached as a PDF.

---
View full analytics -> [app URL]/reports
Unsubscribe from monthly reports -> [unsubscribe link]

Budget Planner
Your personal financial companion
```

### Unsubscribe flow
- Link in email hits: `GET /api/unsubscribe?token=[signed-token]`
- Sets `monthlyReportEnabled = false`
- Shows confirmation page: "Unsubscribed. Re-enable anytime from the Reports page."

## Manual Trigger UI

### Reports page header
"Send Report" button + gear icon for preferences popover:

```
[Date Picker]    [Send Report]  [Monthly gear icon]

                                 ┌─────────────────────┐
                                 │ Monthly email reports│
                                 │ [toggle] Enabled     │
                                 │                      │
                                 │ Sent on the 1st to   │
                                 │ john@gmail.com       │
                                 └─────────────────────┘
```

### Send Report dialog

```
Email Monthly Report

Month:  [January  v]
Year:   [2026     v]

This will generate your financial snapshot
for January 2026 and send it to your
registered email.

[Cancel]        [Send Report]
```

- Month: January - December
- Year: Current year down to account creation year
- Loading state while generating + sending
- Toast on success: "Report queued — you'll receive it shortly"

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `monthlyReportEnabled` to User model |
| `server/modules/report/report.service.ts` | Add `generateMonthlyDigest()` and `generateAndSend()` |
| `server/modules/report/report.templates.tsx` | NEW - PDF document component via @react-pdf/renderer |
| `server/modules/report/report.controller.ts` | Add `sendManualReportAction()` server action |
| `server/modules/report/report.queue.ts` | NEW - BullMQ queue and job processor |
| `app/api/cron/monthly-report/route.ts` | NEW - Cron endpoint: adds jobs for all opted-in users |
| `app/api/cron/process-reports/route.ts` | NEW - Cron endpoint: processes batch from queue |
| `app/api/unsubscribe/route.ts` | NEW - Unsubscribe endpoint |
| `app/(authenticated)/reports/page.tsx` | Add "Send Report" button + monthly toggle popover |
| `components/modules/reports/SendReportDialog.tsx` | NEW - Month/year picker + send dialog |
| `components/modules/reports/MonthlyReportToggle.tsx` | NEW - Opt-in/out toggle popover |
| `vercel.json` | NEW - Cron schedule config (2 crons) |
| `docker-compose.yml` | Add Redis service |
| `lib/redis.ts` | NEW - Redis connection singleton |
| `.env.example` | Add CRON_SECRET, BLOB_READ_WRITE_TOKEN, REDIS_URL |

## Dependencies

| Package | Purpose |
|---------|---------|
| `@react-pdf/renderer` | Server-side PDF generation |
| `@vercel/blob` | PDF storage |
| `bullmq` | Job queue framework |
| `ioredis` | Redis client (BullMQ peer dependency) |

## Environment Variables

```env
# Job Queue
REDIS_URL=redis://localhost:6379          # Local Docker
# REDIS_URL=rediss://default:xxx@xxx.upstash.io:6379  # Upstash (production)

# Cron Security
CRON_SECRET=your-secret-here

# PDF Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
```
