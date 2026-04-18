# Bulk Actions — Transactions Pilot (v1.9.12)

**Date:** 2026-04-17
**Branch:** v1.9.12
**Pilot surface:** `/transactions` only

## Why

Users who import CSVs or log months of data accumulate rows that need mass
cleanup: duplicates, misfiled categories, bad imports. Today each row requires
a separate click. Bulk actions collapse that into one.

The brainstorm was delegated to the council (founder, lead engineer,
budget-frontend, budget-backend, accountant, QA). Conflicts were resolved as
the synthesizer; this document is the result.

## Scope

**Pilot list:** `/transactions` (unified income/expense/transfer/payment).

**Two bulk operations only:**
- `bulk delete` — atomic `$transaction`, all-or-nothing.
- `bulk categorize` — reassign `categoryId` across selected rows.

**Killed from founder's list:** bulk change-account. Reassigning an account
rewrites balance math on both sides; kept single-row only.

**Defense-in-depth filters (stay permanently):**
- Income rows with `titheEnabled=true OR emergencyFundEnabled=true` are
  excluded from bulk deletable candidates.
- Transfer rows with `fee > 0` are excluded.
- UI shows muted banner: `N items skipped — delete individually.`

**Caps:** 100 rows per call, enforced server-side with Zod `.max(100)`.

**Cross-page selection:** NOT persisted. Paginating clears selection.

**Mobile:** hidden on `sm:` and below.

## Prerequisites (land first, same branch)

### P0-1 — Tithe / emergency-fund reversal gap

**Bug today (single-row):** `deleteIncome` does not reverse the child
tithe/EF transfers auto-created by `createIncome`. Tithe account stays
inflated; `Goal.currentAmount` on the EF goal stays inflated.

**Fix:**
- Prisma schema: `Transfer.parentIncomeId String?`
  (`@relation("IncomeChildren", onDelete: Cascade)`).
- Prisma schema: `Transfer.efGoalId String?` — which goal to decrement.
- Service: `IncomeService.createIncome` sets both fields.
- Service: `IncomeService.deleteIncome` loads child transfers, reverses each
  account, decrements EF goal, deletes children before parent.
- Service: `IncomeService.updateIncome` reverses-and-recreates children when
  amount/tithe settings change.

**Backfill:** match child Transfer rows by description suffix
(`LIKE 'Tithe for%'` / `LIKE 'Emergency Fund contribution for%'`) within
same user/account/date. Best-effort; leave unmatched nulls; log count.

### P0-2 — Fee-expense FK on Transfer

**Bug today:** `deleteTransfer` reverses the fee Expense via `deleteMany`
matching `(accountId, amount, date, description='Transfer fee')`. Two
same-day same-fee transfers = wrong match; expense ledger drifts.

**Fix:**
- Prisma schema: `Transfer.feeExpenseId String? @unique`
  (`@relation(onDelete: SetNull)`).
- Service: `TransferService.createTransfer` creates Expense first, then
  Transfer with `feeExpenseId`.
- Service: `TransferService.deleteTransfer` deletes by FK, not `deleteMany`.

**Backfill:** for each transfer with `fee > 0`, find exactly one matching
Expense; set FK. Ambiguous (0 or 2+) → leave null, log.

## Architecture

### Client

**`components/common/useTableSelection.ts`**
- Generic hook: `{ selected: Set<string>, toggle, toggleMany,
  toggleAllVisible, clear, isSelected, count }`.
- `useState<Set<string>>`. No context, no URL.
- Clears via `useEffect` watching `searchParams`.

**`components/common/BulkActionBar.tsx`**
- Portaled to `document.body`, `fixed bottom-6 left-1/2 -translate-x-1/2
  z-50`.
- Slides up on `count > 0`, down on 0.
- Props: `count, actions: Array<{ label, variant, onClick }>, onClear`.
- `bg-background border shadow-lg rounded-lg` — dark mode handled.

**`TransactionTable.tsx` changes**
- New leftmost `<TableHead>` with three-state shadcn `<Checkbox>`
  (`checked="indeterminate"` supported).
- Per-row checkbox cell.
- Selected rows: `data-state=selected` → `bg-primary/5 dark:bg-primary/10`.
- Shift-click range within current page.
- Skipped-rows banner inside the action bar shows filter-excluded count.

**Confirmation:** existing `<AlertDialog>` pattern. Copy:
`Delete 47 transactions? This will reverse all associated balance changes.
This cannot be undone.` Red destructive button. No typed confirmation at
≤100 cap.

### Server

**`transaction.types.ts`**
```ts
const bulkTransactionItemSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('INCOME'),   id: z.string().cuid() }),
  z.object({ type: z.literal('EXPENSE'),  id: z.string().cuid() }),
  z.object({ type: z.literal('TRANSFER'), id: z.string().cuid() }),
  z.object({ type: z.literal('PAYMENT'),  id: z.string().cuid() }),
]);

const bulkDeleteSchema = z.object({
  items: z.array(bulkTransactionItemSchema).min(1).max(100),
});

const bulkCategorizeSchema = z.object({
  items: z.array(bulkTransactionItemSchema).min(1).max(100),
  categoryId: z.string().cuid(),
});
```

**`transaction.controller.ts`** (thin):
- `bulkDeleteTransactionsAction(data)`: auth, Zod, call service,
  `invalidateTags(INCOMES, EXPENSES, TRANSFERS, ACCOUNTS, DASHBOARD,
  TRANSACTIONS)`, error-map.
- `bulkCategorizeTransactionsAction(data)`: same shape.

**`transaction.service.ts`**:
- `bulkDelete(userId, items)` — one `prisma.$transaction(fn, { timeout: 15000 })`.
  Per-row `tx.<resource>.findUniqueOrThrow({ where: { id, userId } })`,
  then delete-with-balance-reversal via extracted `_deleteWithinTx`
  helpers. Any throw rolls back all.
- `bulkCategorize(userId, items, categoryId)` — same pattern, updates
  `categoryId` on INCOME/EXPENSE rows only (TRANSFER/PAYMENT have no
  category). Filters incompatible rows server-side.

**Shared helpers:** extract `_deleteIncomeWithinTx(tx, userId, id)` etc. in
each resource service so single-row and bulk paths share one source of truth.

**`BulkOperation` model** (audit foundation for future undo):
```prisma
model BulkOperation {
  id         String   @id @default(cuid())
  userId     String
  kind       String   // 'DELETE' | 'CATEGORIZE'
  itemCount  Int
  payload    Json     // serialized items
  createdAt  DateTime @default(now())
}
```

**Feature flag:** `bulk-actions` gated server-side in
`app/(authenticated)/transactions/page.tsx` via existing `FeatureFlag` /
`UserFeature` models. Default off; granted to the dev user first.

## Observability

One structured log per bulk op, from controller after completion:

```ts
console.log(JSON.stringify({
  event: 'bulk_delete' | 'bulk_categorize',
  userId, requestedCount, deletedCount, failedCount, skippedCount,
  durationMs, timestamp,
}));
```

No PII beyond `userId`.

## Commit order on v1.9.12

1. P0-1 tithe/EF FK + service fix + backfill migration.
2. P0-2 fee expense FK + service fix + backfill migration.
3. `BulkOperation` model migration.
4. Server actions (`bulkDelete`, `bulkCategorize`) + service methods.
5. Client hook + action bar.
6. Table wiring + filter banner.
7. Feature-flag gate + changelog.

Each commit independently revertable.

## Success metric

Bulk-categorize or bulk-delete used by >25% of users who imported a CSV in
the 30 days post-launch. (Founder's call; single metric.)

## Manual QA checklist (pre-ship)

1. Delete 3 expenses → balances decrement; ledger rows gone.
2. Delete a transfer → both account balances restored; no orphan fee.
3. Select transfer **and** its fee expense → skipped banner triggers; no double-credit.
4. Select income with `titheEnabled=true` → skipped banner triggers.
5. Delete income linked to an invoice → invoice survives, `linkedIncomeId` null, invoice page does not 500.
6. Paginate mid-selection → selection cleared.
7. Change filter mid-selection → selection cleared.
8. Two-tab race: tab A selects 5, tab B deletes one, tab A confirms → rollback + error toast ("Transaction no longer exists").
9. Submit 101 IDs → server Zod validation error, not 500.
