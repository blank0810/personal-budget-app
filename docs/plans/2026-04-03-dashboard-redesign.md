# Dashboard Redesign

**Date:** 2026-04-03
**Status:** Approved
**Reference:** Aniq UI Financial Dashboard (https://dashboard-1.aniq-ui.com)

## Layout

```
Row 1: Greeting + Date Range + Quick Actions (+Income, +Expense)
Row 2: [Account Card Carousel (~65%)]  [Tabbed: Health | Invoices | Goals (~35%)]
Row 3: [Recent Transactions (~57%)]    [Quick Transfer/Payment (~43%)]
Row 4: [AI Financial Advisor - Coming Soon (~50%)] [Income vs Expense 6mo Chart (~50%)]
```

## Row 1: Greeting Header

- Time-based greeting: "Good morning/afternoon/evening, [name]"
- Subtitle: "Welcome back to your financial dashboard"
- Date range selector (right side)
- Quick action buttons: +Income, +Expense

## Row 2 Left (~65%): Account Card Carousel

- Visual gradient cards per account using `account.color` field
- Card content: account type icon, type badge, account name, balance, currency
- Credit/Loan accounts: mini utilization bar at bottom of card
- Animated number counter on the selected account's large balance display
- Quick action icons below balance: +Income, +Expense, Transfer, Payment
- Horizontal scroll with CSS scroll-snap, auto-fit card width (~280px min)
- Selected card shows with ring highlight

## Row 2 Right (~35%): Tabbed Widget

3 tabs using shadcn Tabs component:

### Tab 1: "Health" (default for non-invoicing users)
- 4 KPI mini-cards in 2x2 grid:
  - Net Worth (green/red based on positive/negative)
  - Savings Rate (with status icon)
  - Emergency Fund / Runway (with health status)
  - Credit Utilization (with color-coded progress)

### Tab 2: "Invoices" (default for invoicing users)
- Outstanding total (large number)
- Overdue count (red alert if > 0)
- Drafts count
- "New Invoice" quick action button
- Hidden/empty state if user has never invoiced

### Tab 3: "Goals"
- Active goals with compact progress bars (top 3)
- Budget utilization summary bar
- Count of on-track / warning / over-budget categories

## Row 3 Left (~57%): Recent Transactions

- Last 7-8 transactions
- Grouped by date: Today, Yesterday, Earlier
- Each row: direction icon (income/expense), description, category, amount
- Color-coded: green for income (+), red for expense (-)
- "View all" link

## Row 3 Right (~43%): Quick Transfer/Payment

- Toggle between Transfer and Payment modes
- Transfer mode: From account, To account, Amount, Transfer button
- Payment mode: From asset, To liability, Amount, Pay button
- Recent recipients/contacts (avatar row like Aniq UI)

## Row 4 Left (~50%): AI Financial Advisor (Coming Soon)

- Teaser card with lock icon or "Coming Soon" badge
- Brief description: "Your personal AI finance advisor"
- Subtle visual hint of a chat interface (grayed out)
- Conversational agent that can analyze spending, suggest budgets, execute transactions

## Row 4 Right (~50%): Income vs Expense Trend

- 6-month bar chart using Recharts (already installed)
- Side-by-side bars: income (green) vs expense (red) per month
- Summary stats below: total income, total expense, net
- Time range toggle: "This Month" dropdown

## Animations

- **Section entry**: CSS fade-up animation (keyframes in globals.css), staggered per section
- **Number counter**: `useEffect` + `requestAnimationFrame` hook, ease-out over ~600ms
- **Card hover**: `hover:scale-[1.02]` with `transition-transform`
- **No Framer Motion**: CSS-only approach, zero bundle cost

## Technical Approach

- CSS animations only (no Framer Motion)
- CSS scroll-snap for card carousel (no carousel library)
- Recharts for the trend chart (already in project)
- Suspense boundaries with skeleton fallbacks (existing pattern)
- shadcn Tabs, ScrollArea, Progress, Badge components
- Thin `<AnimatedNumber>` client component for counter effect
- Account card gradients via Tailwind `bg-gradient-to-br` with color-mapped stops

## Data Sources (all existing)

- `DashboardService.getDashboardData(userId)` -- KPIs
- `DashboardService.getRecentTransactions(userId, limit)` -- transactions
- `DashboardService.getAccountBalances(userId)` -- accounts
- `GoalService.getAll(userId)` -- goals
- `BudgetService.getBudgetHealthSummary(userId, month)` -- budget health
- `InvoiceService.getSummary(userId)` -- invoice metrics
- `UserService.getCurrency(userId)` -- currency formatting
- New: 6-month income vs expense aggregation query

## Files to Create/Modify

### New Components
- `components/modules/dashboard/GreetingHeader.tsx`
- `components/modules/dashboard/AccountCardCarousel.tsx`
- `components/modules/dashboard/AccountCard.tsx`
- `components/modules/dashboard/DashboardTabs.tsx` (Health/Invoices/Goals)
- `components/modules/dashboard/QuickTransferPayment.tsx`
- `components/modules/dashboard/AiAdvisorTeaser.tsx`
- `components/modules/dashboard/IncomeExpenseTrend.tsx`
- `components/modules/dashboard/AnimatedNumber.tsx`
- `components/modules/dashboard/RecentTransactions.tsx`

### Modified
- `app/(authenticated)/dashboard/page.tsx` -- complete rewrite
- `app/(authenticated)/dashboard/_components/` -- replace existing section components
- `app/globals.css` -- add fade-up keyframes

### Removed (replaced by new components)
- `KpiCardsSection.tsx` -- absorbed into Health tab
- `BudgetHealthSection.tsx` -- absorbed into Goals tab
- `GoalsSection.tsx` -- absorbed into Goals tab
- `InvoiceSection.tsx` -- absorbed into Invoices tab
- `TransactionsAndAccountsSection.tsx` -- split into carousel + transactions
