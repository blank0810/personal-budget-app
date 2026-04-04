# Unified Transactions Page Design

**Date:** 2026-04-04
**Version:** v1.9.9
**Status:** Approved

## Overview

Merge the 4 separate transaction pages (Income, Expenses, Transfers, Payments) into a single unified `/transactions` page. The old pages remain until the new page is validated, then get removed in a follow-up.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Merge all 4 pages? | Yes | Users model all transactions as "money moved". 4 pages is over-segmented. |
| Payment vs Transfer | Merge — auto-detect | PaymentService already writes to the Transfer table. System labels it "Payment" when destination is a liability. |
| Add Transaction flow | 3 options: Income, Expense, Transfer | No separate "Payment" option. Transfer auto-labels as Payment based on destination account type. |
| Quick filter chips | Type-only (Income, Expense, Transfer, Payment) | Category/account/date/amount filters go in a Filter panel. No mixing type + category chips. |
| KPI cards behavior | Always stable, highlight active filter | KPIs reflect full date range. Clicking a type chip highlights the corresponding card but doesn't change KPI values. |
| Status column | Skip | All transactions are immediate in this app. No pending state needed. |
| URL-based filtering | Yes | Server-side filtering via search params. Bookmarkable, shareable. |
| Old pages | Keep until validated, then remove | Build `/transactions` first, confirm it works, delete old pages in follow-up. |

## Page Layout

**Route:** `app/(authenticated)/transactions/page.tsx`

**Sidebar:** Replace collapsible "Transactions" group (Income, Expenses, Transfers, Payments) with a single "Transactions" link. Recurring stays as its own sidebar item.

**Structure (top to bottom):**

1. **Page header** — "Transactions" title + subtitle
2. **KPI cards row** — 4 cards scoped to selected date range:
   - Total Income
   - Total Expenses
   - Net Flow (income - expenses)
   - Average Amount
   - Active type filter highlights the corresponding card
3. **Transaction History card:**
   - Header: date range picker (left), Filter button, Export button, "+ Add Transaction" button (right)
   - Quick filter chips: All | Income | Expense | Transfer | Payment
   - Search bar (debounced 300ms, server-side)
   - Unified data table
   - Pagination footer

**"+ Add Transaction"** opens the existing `QuickActionSheet` with 3 options: Income, Expense, Transfer.

## Unified Data Table

| Column | Content |
|--------|---------|
| Description | Transaction description + subtitle (category, "From -> To" for transfers) |
| Type | Badge: Income (green), Expense (red), Transfer (blue), Payment (orange) |
| Amount | Signed & colored: +green for income, -red for expense, -blue for transfers/payments |
| Account | Primary account. For transfers: source account. |
| Category | Badge for income/expense. Blank for transfers/payments. |
| Date | Formatted date |
| Actions | "..." menu: View details, Edit, Delete |

**Sorting:** Default by date descending. Sortable: Description, Amount, Date.

**Row rendering:** Discriminated union on `kind` — table renders differently per transaction type.

**Actions menu:** Routes Edit/Delete to the correct existing server action based on `kind`.

## Filtering & Pagination

### Quick filter chips
- Single-select: All (default), Income, Expense, Transfer, Payment
- Active chip = filled/primary style, inactive = outlined
- "Payment" filters to transfers where destination is a liability

### Filter panel (behind Filter button)
- Date range picker (defaults to current month)
- Category dropdown (disabled when type is Transfer/Payment)
- Account dropdown
- Amount range (min/max)
- Source: Manual, Imported, Recurring
- Clear filters + Apply buttons

### Search
- Debounced 300ms, server-side `contains` on description

### URL params
All filters stored in search params: `?type=income&category=food&from=2026-04-01&to=2026-04-30&page=1`

### Pagination
- Offset-based: "Showing 1 to 10 of 26 transactions"
- Page sizes: 10 (default), 25, 50
- Backend: over-fetch-and-slice across tables

## Backend Architecture

### New files
- `server/modules/transaction/transaction.service.ts`
- `server/modules/transaction/transaction.controller.ts`
- `server/modules/transaction/transaction.types.ts`

### UnifiedTransaction type

```ts
type UnifiedTransaction =
  | { kind: 'income'; id: string; amount: number; date: Date; description: string; accountName: string; categoryName: string; source: TransactionSource; }
  | { kind: 'expense'; id: string; amount: number; date: Date; description: string; accountName: string; categoryName: string; budgetName: string | null; source: TransactionSource; }
  | { kind: 'transfer'; id: string; amount: number; date: Date; description: string; fromAccountName: string; toAccountName: string; fee: number; isPayment: boolean; }
```

### Service methods

**`getUnifiedTransactions()`**
- Accepts: userId, type?, dateRange, categoryId?, accountId?, search?, source?, amountMin?, amountMax?, page, pageSize
- Runs parallel queries against only the needed tables (type filter skips irrelevant tables)
- Maps to UnifiedTransaction, merges, sorts by date desc, slices for pagination
- For transfers: `isPayment = toAccount.isLiability`

**`getTransactionSummary()`**
- Runs 3 parallel aggregate queries (income sum, expense sum, transfer/count)
- Returns: totalIncome, totalExpenses, netFlow, averageAmount
- Scoped to date range only — ignores type/category filters (KPIs stay stable)

### Controller
- `getUnifiedTransactionsAction()` — auth + Zod validation + cache
- `getTransactionSummaryAction()` — auth + cache
- No create/update/delete — those stay in existing income/expense/transfer modules

## Component Architecture

### New files under `components/modules/transactions/`

| Component | Type | Responsibility |
|-----------|------|----------------|
| `TransactionKPICards.tsx` | Client | 4 summary cards, highlights active card based on type filter |
| `TransactionFilters.tsx` | Client | Search, chips, Filter panel, date range, Export. Reads/writes URL params. |
| `TransactionTable.tsx` | Client | Unified table with polymorphic row rendering based on `kind` |
| `TransactionRowActions.tsx` | Client | "..." menu routing to correct edit/delete action per `kind` |
| `TransactionPageContainer.tsx` | Client | Wrapper, receives serialized data, hosts QuickActionSheet provider |

### Page
`app/(authenticated)/transactions/page.tsx` — server component. Auth, reads searchParams, calls both service methods in parallel, serializes, renders container.

### Reused
- `QuickActionSheet` from dashboard (imported, not duplicated)
- Existing server actions for CRUD (income, expense, transfer controllers)
- shadcn/ui primitives (CurrencyInput, date pickers, badges, etc.)

### Not reused
- Existing per-page tables (IncomeTable, ExpenseTable, etc.) — too coupled to page-specific forms

## Migration Plan

1. Build `/transactions` page with all components
2. Update sidebar to show single "Transactions" link
3. Validate the new page works correctly
4. Remove old pages (`/income`, `/expense`, `/transfers`, `/payments`) and their components in a follow-up
5. Remove `PaymentService` (redundant — `TransferService` handles both)
