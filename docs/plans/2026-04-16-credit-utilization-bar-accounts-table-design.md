# Credit Utilization Bar — Accounts Table

**Date:** 2026-04-16
**Branch:** v1.9.12
**Scope:** `components/modules/account/AccountList.tsx` only

## Problem

The accounts datatable's Balance column shows a single-line number for every
account. Credit card rows give no sense of "how much is used, how much is
available" at a glance. The dashboard's per-account card (`AccountCard.tsx`)
already shows a utilization bar for credit cards — that visual language is
missing from the table since commit `128a5d7` (dense-row restore, dropped the
card layout).

Restoring the bar on the table brings parity back. The dashboard card is
untouched in this change.

## Decisions (locked during brainstorm)

1. **Scope:** Table only. Leave `AccountCard.tsx` on the dashboard alone.
2. **Information density:** Full. Balance number on top; under it, a two-line
   block with `X% used` (left), `₱N avail.` (right), and a thin color-coded
   bar.
3. **Which accounts get the bar:** Credit cards only —
   `type === 'CREDIT' && creditLimit > 0`. LOAN accounts are liabilities but
   keep the existing single-number balance.
4. **Color coding:** Same utilization thresholds as the dashboard
   (30 / 50 / 70 / 90%), but darker Tailwind shades tuned for the table's
   light card background.
5. **Over-limit handling:** Cap the bar at 100% fill; show the true percent on
   the label (`107% used`); replace the available string with `Over limit` in
   red when `available < 0`.
6. **Layout:** Bar and labels span the full balance-cell width, right-aligned
   stack, under the balance number.

## Predicate & math

```ts
const balance   = Number(account.balance);
const limit     = Number(account.creditLimit ?? 0);
const show      = account.type === 'CREDIT' && limit > 0;

const rawPct    = limit > 0 ? balance / limit : 0;
const displayPct = Math.round(rawPct * 100);        // label: "107% used"
const fillPct   = Math.min(rawPct, 1) * 100;         // bar: capped at 100
const available = limit - balance;                   // can go negative
const overLimit = available < 0;
```

## Color band helper

Local helper inside `AccountList.tsx` — single-use, not extracted.

| Utilization | Light mode        | Dark mode          |
| ----------- | ----------------- | ------------------ |
| `≥ 0.9`     | `bg-red-600`      | `dark:bg-red-500`    |
| `≥ 0.7`     | `bg-red-500`      | `dark:bg-red-400`    |
| `≥ 0.5`     | `bg-orange-500`   | `dark:bg-orange-400` |
| `≥ 0.3`     | `bg-yellow-500`   | `dark:bg-yellow-400` |
| `< 0.3`     | `bg-green-500`    | `dark:bg-green-400`  |

## Cell markup

Replaces the current single-line `TableCell` at
`AccountList.tsx:233-235`:

```tsx
<TableCell className='w-[25%] text-right'>
  <div className='flex flex-col items-end gap-1'>
    <span className='font-bold tabular-nums'>
      {formatCurrency(balance)}
    </span>
    {show && (
      <div className='w-full'>
        <div className='flex justify-between text-[10px] font-medium text-muted-foreground'>
          <span className={overLimit ? 'text-red-600 dark:text-red-400' : ''}>
            {displayPct}% used
          </span>
          <span
            className={
              overLimit
                ? 'font-semibold text-red-600 dark:text-red-400'
                : ''
            }
          >
            {overLimit ? 'Over limit' : `${formatCurrency(available)} avail.`}
          </span>
        </div>
        <div className='mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted'>
          <div
            className={cn('h-full rounded-full transition-all', colorClass)}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>
    )}
  </div>
</TableCell>
```

## Row-height impact

- Non-liability rows: unchanged height.
- Liability rows without a `creditLimit`: unchanged height (predicate is
  false).
- Credit-card rows with a `creditLimit > 0`: +24-28px (two label line + 6px
  bar + `gap-1` spacing).

Accepted cost of the "Full density" choice.

## Not in scope

- No changes to `AccountCard.tsx`, `AccountKPICards.tsx`, server queries,
  Prisma schema, or service layer.
- No tooltips, no hover detail, no animation beyond the existing
  `transition-all`.
- No extraction of a shared utility — single call site.

## Verification steps

1. Seed a credit account with `creditLimit = 15000, balance = 5000` → bar at
   33%, green, label `33% used · ₱10,000.00 avail.`.
2. Push balance to `balance = 12000` → bar at 80%, red-500, label
   `80% used · ₱3,000.00 avail.`.
3. Push balance to `balance = 16000` → bar at 100% fill, red-600, label
   `107% used · Over limit` (in red).
4. Credit account with `creditLimit = null` → no bar; only the balance number
   renders (today's behavior).
5. Non-credit accounts (BANK, CASH, SAVINGS, LOAN, INVESTMENT, TITHE) →
   no bar.
6. Toggle dark mode → bar colors swap to the dark-mode variants; track stays
   `bg-muted`.
