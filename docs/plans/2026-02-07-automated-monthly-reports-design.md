# Automated Monthly Financial Reports

**Date:** 2026-02-07
**Roadmap Items:** #4 + #9 (merged)
**Status:** Design approved
**Depends on:** #3 (Email service)

## Goal

Send a dynamic monthly financial snapshot as a PDF email attachment to all opted-in users on the 1st of each month. Users can also manually trigger a report for any month/year from the Reports page. PDFs stored in Vercel Blob for archival.

## Architecture

### Two entry points, one shared service

```
CRON (all users)                    MANUAL (single user)
       |                                    |
       v                                    v
GET /api/cron/monthly-report       sendManualReportAction(period)
Auth: CRON_SECRET header           Auth: NextAuth session
       |                                    |
       v                                    v
Query all users where              Get current userId
monthlyReportEnabled = true        from session
       |                                    |
       v                                    v
Loop: for each user                Single call:
  ReportService                    ReportService
    .generateAndSend(userId,         .generateAndSend(userId,
     previousMonth)                   selectedPeriod)
```

| | Cron | Manual |
|---|---|---|
| Entry point | `GET /api/cron/monthly-report` | Server action in report controller |
| Auth | `CRON_SECRET` header | NextAuth session |
| Users | All opted-in users | Current logged-in user only |
| Month | Always previous month (auto) | User picks month + year |
| Respects opt-out? | Yes | No (user explicitly requested) |

### Shared service function

```typescript
ReportService.generateAndSend(
  userId: string,
  period: Date      // first day of target month, e.g. 2026-01-01
)
```

Pipeline: generateDigest() -> renderPDF() -> uploadBlob() -> sendEmail()

- Cron: `generateAndSend(userId, startOfMonth(subMonths(new Date(), 1)))`
- Manual: `generateAndSend(userId, new Date(selectedYear, selectedMonth - 1, 1))`

## Cron Portability

The API route is the abstraction layer. The scheduler is swappable:

- **Vercel:** `vercel.json` cron config hits the API route
- **Docker:** `node-cron` hits `localhost:3000/api/cron/monthly-report`
- **Any host:** External cron service (cron-job.org, EasyCron) hits the public URL

Report generation, PDF rendering, and email sending are platform-agnostic.

### Vercel Cron config (`vercel.json`)

```json
{
  "crons": [{
    "path": "/api/cron/monthly-report",
    "schedule": "0 0 1 * *"
  }]
}
```

### Security

- `CRON_SECRET` env variable checked in API route
- Vercel injects automatically via header
- Self-hosted: cron command passes same secret as header

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
- Toast on success: "Report for January 2026 sent to your email"

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `monthlyReportEnabled` to User model |
| `server/modules/report/report.service.ts` | Add `generateMonthlyDigest()` and `generateAndSend()` |
| `server/modules/report/report.templates.tsx` | NEW - PDF document component via @react-pdf/renderer |
| `server/modules/report/report.controller.ts` | Add `sendManualReportAction()` server action |
| `app/api/cron/monthly-report/route.ts` | NEW - Cron endpoint for all-user batch send |
| `app/api/unsubscribe/route.ts` | NEW - Unsubscribe endpoint |
| `app/(authenticated)/reports/page.tsx` | Add "Send Report" button + monthly toggle popover |
| `components/modules/reports/SendReportDialog.tsx` | NEW - Month/year picker + send dialog |
| `components/modules/reports/MonthlyReportToggle.tsx` | NEW - Opt-in/out toggle popover |
| `vercel.json` | NEW - Cron schedule config |
| `.env.example` | Add CRON_SECRET, BLOB_READ_WRITE_TOKEN |

## Dependencies

| Package | Purpose |
|---------|---------|
| `@react-pdf/renderer` | Server-side PDF generation |
| `@vercel/blob` | PDF storage (if not already installed) |

## Environment Variables

```env
CRON_SECRET=your-secret-here
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
```
