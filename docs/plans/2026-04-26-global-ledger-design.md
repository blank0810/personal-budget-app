# Global Ledger

**Status:** Design (not yet implemented)
**Date:** 2026-04-26
**Target:** v1.9.13 / v1.9.14

## Problem

Per-account ledgers exist at `/accounts/[id]` (with running balance per row).
The unified `/transactions` page exists but is a flat feed — no running totals.
There is no surface that shows *all* transactions across *all* accounts with
chronological running state. That's what users mean when they say "my whole
ledger."

## Approach

A new `/ledger` route — server-paginated datatable, three running totals
(Assets / Liabilities / Net Worth), running totals reflect actual financial
state regardless of filters, fixed chronological sort.

The design fits the existing **single-entry** data model: `Income { accountId }`,
`Expense { accountId }`, `Transfer { fromAccountId, toAccountId }`. No journal
table, no debit/credit pairs — running totals derived by walking transactions
ordered by `(date ASC, createdAt ASC)`. Same machinery `AccountLedger` already
uses, just unscoped from a single account.

## Surface

### Sidebar Placement

`Dashboard · Accounts · **Ledger** · Transactions · Budgets · Goals · …`

Reasoning: the global ledger is the aggregate of every per-account ledger
(which lives inside `Account` detail pages). Sits next to its source.
Transactions stays focused on browse/filter/edit of individual events.

### Page Layout

1. **Three KPI cards** — Total Assets, Total Liabilities, Net Worth. Current
   values + delta vs the first visible row's opening totals (so the user sees
   how the visible window moved net worth).
2. **Filter row** — date range picker (defaults to "All time"), chip filters
   for Type / Account (multi) / Category (multi). Same UI patterns as
   `/transactions`.
3. **Datatable** — fixed sort, server-paginated, page-size selector
   (25 / 50 / 100, hard cap 250).

### Columns (desktop ≥ 1280px)

`Date · Type badge · Description · Account · Category · Amount ·
Assets↑ · Liabilities↑ · Net Worth↑`

- Type badge — reuse `TYPE_CONFIG` from `TransactionTable.tsx`.
- Amount — signed and color-coded (`+₱500` green, `−₱200` red) — same as
  `AccountLedger.tsx`.
- Running totals — right-aligned, tabular numerals. Small ▲/▼ caret on the
  Net Worth column only.

### Breakpoints

- **md:** hide Assets and Liabilities; keep Net Worth.
- **< sm:** collapse to `Date · Description · Amount · Net Worth`.

## Math

### Filter behaviour

Filters narrow which rows are displayed. **Running totals always reflect the
user's actual state at that moment**, not a sum of only the filtered rows.
Otherwise filtered totals would lie about reality. (A "running total of only
my groceries" is a category subtotal, not a ledger.)

### Per-page computation

For each requested page, with filters + date range applied:

1. **Opening totals** for the page's first row's chronological position —
   one aggregate query partitioned by `Account.isLiability`:

   ```
   openingAssets      = Σ(asset.openingBalance)
                      + Σ(Income.amount where target = asset)
                      − Σ(Expense.amount where source = asset)
                      ± Σ(Transfer impacts on assets)
   openingLiabilities = mirror, but for liability accounts
   openingNetWorth    = openingAssets − openingLiabilities
   ```

   All bounded `WHERE date < page.firstRow.date OR
   (date = page.firstRow.date AND createdAt < page.firstRow.createdAt)`.

2. **Walk the page's rows in order**, accumulating per-row running totals.

3. **Return rows + per-row running totals + tripwire diff** (see below).

### Sort order

Fixed: `date ASC, createdAt ASC`. Column headers don't sort. There is no
honest way to allow re-sorting — running totals are only meaningful in a
chronological order.

## Reliability — "no false data"

1. **Single source of truth.** Walk `Income ∪ Expense ∪ Transfer` plus the
   per-account `Account.openingBalance` as a starting offset. Do not trust
   cached `Account.balance` for ledger row math; derive everything from
   transactions + opening balances.
2. **Synthetic opening-balance row** when no date filter is set. Mirrors the
   pattern `AccountLedger.tsx` already uses (commit 87ea323). The tripwire
   relies on this offset being included — without it, `Σ(running)` would
   trail `Σ(Account.balance)` by exactly `Σ(account.openingBalance)`.
3. **Tripwire.** After running totals are computed for the last reachable
   row in the user's full history, the server compares
   `Σ(running.assets)` and `Σ(running.liabilities)` against
   `Σ(Account.balance)` partitioned by `isLiability` for ALL accounts
   (archived included — see "Required Changes Inside the Ledger Module"
   below). If diff ≥ ₱0.01, response includes
   `{ discrepancy: { assetsDiff, liabilitiesDiff } }` and the UI surfaces a
   one-line "Ledger out of sync — please contact support" banner. Log to
   monitoring with the diff.

### Edge cases inherited correctly from existing services

- **Manual balance adjustments** — already create real `Income`/`Expense`
  rows via `AccountService.adjustBalance` (account.service.ts:265). Show
  up in the ledger.
- **Tithe / EF child transfers** — already auto-created as real `Transfer`
  rows by `IncomeService` (per v1.9.12 P0 fix).
- **Transfer fees** — already saved as real `Expense` rows linked via
  `feeExpenseId` (per v1.9.12 P0-2 fix).
- **Deletes** — services already reverse balances atomically.
- **Orphaned `accountId: null` rows** (from accounts deleted via SetNull) —
  no longer affect any account balance, so excluding them from the ledger
  is correct. Filter them out at the query level.

### Archived accounts

**Include** their historical transactions, render a small "archived" badge.
Excluding would create a phantom jump in running totals on the day an
account was archived. The tripwire excludes archived accounts from the
right-hand-side comparison so the math reconciles.

## Row Actions

**Delete only** — matches the current `/transactions` parity (`TransactionRowActions`
exposes only Delete today). On delete, the page refetches and running totals
are recomputed by the server.

Edit capability is deferred. There are no income / expense / transfer edit
dialogs in the app yet, and `updateIncomeAction` / no `updateTransfer` method
exist with known reversal bugs (see "Deferred Prerequisites" below). When the
team builds row-level edit, those bugs need to be fixed in the same PR.

## Out of Scope (v1)

- **Bulk actions on ledger.** Per founder's rollout list in memory, the
  next-2 are `AccountLedger` and `FeatureRequestTable`; global ledger isn't
  on the list. Defer indefinitely unless a real user pain signal arrives.
- **PDF / CSV export.** Defer to v2; will plug into existing Reports module.
- **Custom sort orders.** Fundamentally incompatible with running totals.
- **Multi-currency display.** Single currency locked at onboarding; revisit
  if multi-currency lands.

## Implementation Outline

### Backend

- `server/modules/ledger/ledger.types.ts` — Zod schemas for filter input,
  TypeScript types for `LedgerRow`, `LedgerPage`, `LedgerKpi`.
- `server/modules/ledger/ledger.service.ts` — three methods:
  - `getKpiSnapshot(userId, filter)` — Σ Assets, Σ Liabilities, Net Worth
    + delta vs filter window opening.
  - `getPage(userId, filter, page, pageSize)` — opening totals + paged
    rows + running totals + discrepancy.
  - `computeOpeningTotals(userId, asOfDate, asOfCreatedAt)` — internal,
    one aggregate query.
- `server/modules/ledger/ledger.controller.ts` — server actions
  `getLedgerPageAction`, `getLedgerKpiAction`, both gated by
  `getAuthenticatedUser`, Zod-validated, `revalidateTag` on edits.

### Frontend

- `app/(authenticated)/ledger/page.tsx` — server component, fetches first
  page + KPIs, hands to client component.
- `components/modules/ledger/LedgerPage.tsx` — client component with
  filter state, page state, calls server actions.
- `components/modules/ledger/LedgerTable.tsx` — table with running
  totals, breakpoint behaviour, badges, color-coded amounts.
- `components/modules/ledger/LedgerKPICards.tsx` — three KPI cards.
- `components/modules/ledger/LedgerFilters.tsx` — date range + quick
  filter chips.
- `components/modules/ledger/LedgerDiscrepancyBanner.tsx` — tripwire
  warning surface.

### Sidebar

- Add `Ledger` entry in `components/common/SidebarNav.tsx` between Accounts
  and Transactions. Icon: `BookOpen` from lucide-react.

## Verification Before Merge

- **`accountant` agent** reviews:
  - Running-totals derivation
  - Tripwire equation correctness
  - Tithe/EF/fee edge cases reconciled
  - Archived-account handling
- **`money-feature-review` skill** runs before merge.
- **Manual end-to-end test** in dev:
  - Seed transactions across multiple accounts including a CC liability,
    a tithe-enabled income, a transfer with fee.
  - Walk the ledger; confirm last-row totals match `Account.balance` sum.
  - Add and delete a transaction; confirm tripwire stays at 0 diff.
  - Archive an account; confirm tripwire still reconciles (excludes
    archived from RHS).

## Prerequisites (P0 — fix BEFORE the ledger PR)

### P0-3 — `updateAccount` accepts `balance` in payload

`server/modules/account/account.service.ts:322-328` spreads `updateData`
directly into `prisma.account.update`. A future caller that passes
`balance` or `openingBalance` bypasses the Income/Expense/Transfer trail
entirely and the tripwire fires permanently. Fix: strip `balance` and
`openingBalance` at the controller layer and in `account.types.ts`.

This is the only currently-reachable prerequisite. Ships in its own
commit with `money-feature-review` before the ledger PR lands.

## Deferred Prerequisites (not blockers — required only when row-level Edit lands)

Per accountant review (2026-04-26), two upstream bugs exist in code that has
no UI caller today (`updateIncomeAction` is dead code; `transfer.service.ts`
has no `updateTransfer`). They cannot be triggered by users right now and
the ledger v1 ships Delete-only row actions, so the tripwire will not see
them. They MUST be fixed in the same PR as any future row-level Edit dialog.

### P0-1 (deferred) — `IncomeService.updateIncome` does not reverse child transfers

`server/modules/income/income.service.ts:401-488`. When a tithe-enabled
income is edited (amount or account change), the parent balance is
adjusted but the existing tithe / EF child Transfer rows are not
recalculated. Result: child transfers reflect the old amount, parent
reflects the new. `Account.balance` and the walked transaction trail
diverge by `(newAmount − oldAmount) × tithe%` per edit. Fix: reverse +
recreate child transfers symmetrically inside the same transaction.

### P0-2 (deferred) — Transfer edit path

`server/modules/transfer/transfer.service.ts` has no `updateTransfer`
method. When edit is built, audit the path with the same lens as P0-1
(rebalance both legs + linked fee Expense).

## Required Changes Inside the Ledger Module

Per the same accountant review:

1. **Tripwire: include archived accounts on BOTH sides of the equation.**
   Excluding archived from RHS while including their historical txns on
   LHS makes the equation diverge by Σ(archived account balances).
   Either include in both, or exclude in both. No mixing.
   The KPI cards may filter archived accounts at the **display** layer
   (Net Worth shouldn't include zombie accounts), but the **tripwire**'s
   account set must match the walk's account set exactly.

2. **Wrap tripwire computation in `prisma.$transaction`** so the walk
   results and `Σ(Account.balance)` read from the same snapshot.
   Without this the tripwire flickers in/out of sync with concurrent
   writes.

3. **Walk filters:** `Income.accountId IS NOT NULL`,
   `Expense.accountId IS NOT NULL`. Transfers can't be orphaned
   (`Restrict` on both legs per schema). **Do NOT** filter on
   `parentIncomeId IS NOT NULL` — orphaned-parent transfers must remain
   in the walk; both legs are still intact.

4. **Net Worth column tooltip:** "Reflects all transactions, not just
   filtered." Mitigates the UX risk of running totals jumping between
   visible rows when the user has applied a non-date filter.

## Known Behaviours (Document, Don't Engineer Around)

- **Same-day order is arbitrary.** `(date ASC, createdAt ASC)` is
  honest but tied to import order for backdated CSV rows. Within a single
  date, the per-row running totals on screen reflect this arbitrary order;
  the *cumulative* totals at end-of-day are correct (Σ is commutative),
  so the tripwire is unaffected.
- **Time zones.** `Account.balance` and the walk both operate on stored
  UTC `Date`. A user in PHT creating "Jan 15 02:00 PHT" persists as
  "Jan 14 18:00 UTC" and walks under Jan 14. This already affects
  `AccountLedger`; the global ledger inherits the same behaviour. Frontend
  formats in user locale; backend orders in stored UTC. Document; don't
  fix in this PR.

## Open Questions

None — locked through brainstorm with the user (2026-04-26) and
accountant review (same date).
