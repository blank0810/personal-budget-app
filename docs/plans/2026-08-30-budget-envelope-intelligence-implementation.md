# Budget Envelope Intelligence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 12 confirmed defects in the budget/goal analytics path, then make envelope
data trustworthy (coverage), legible (pace), and useful to users who never set a budget.

**Architecture:** Existing controller → service → Prisma flow is preserved throughout.
New read-only analytics land in a sibling `budget.analytics.service.ts` rather than
extending the 787-line `budget.service.ts`. No new tables until Tier 4. Money is summed
in SQL and kept as `Prisma.Decimal` until the service return boundary.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Prisma 5, PostgreSQL,
Vitest 4, Tailwind 4, shadcn/ui.

**Design doc:** `docs/plans/2026-08-30-budget-envelope-intelligence-design.md`

---

## Ground rules for the implementing engineer

Read these before Task 1. They are not optional.

1. **Git:** This is a solo project. Commit **directly to `main`**. Do NOT create a
   feature branch, do NOT open a PR. Push after each tier.
2. **Tests run on the HOST**, not in Docker: `npx vitest run <path>`.
   The full suite is `npx vitest run`. Typecheck is `npx tsc --noEmit`.
3. **Builds and lint run in Docker only:**
   `docker compose exec app npm run build`, `docker compose exec app npm run lint`.
   Never run `npm run build` on the host.
4. **After any Prisma schema change** you must restart the app container or the dev
   server throws stale "Unknown field" errors:
   `docker compose exec app npx prisma generate && docker compose restart app`
5. **Money is `Decimal`, never float.** Where you must reduce in JS, seed with
   `new Prisma.Decimal(0)` and call `.toNumber()` exactly once, at the return boundary.
6. **Test convention** — copy the shape of
   `server/modules/budget/budget.service.getBudgetOptions.test.ts`: a `vi.hoisted()`
   mock holder, `vi.mock('@/lib/prisma')` exposing only the methods used, and assertions
   on the **full call-args object**, not partial matches.
7. **Money-touching diffs** (Tasks 1, 2, 4, 8, 9) must pass the `money-feature-review`
   skill and **accountant** review before the tier is pushed.

---

# TIER 0 — Fix the broken numbers

Four independent defects. Each produces a wrong number on screen today. No new UI.

---

### Task 1: Emergency-fund baseline divides a 4-month window by 3

**The bug:** `goal.service.ts` builds an expense window from `getMonth() - 3` to the end
of the current month — that is **four** calendar months — then divides the sum by a
hardcoded `3`. Every `MONTHS_COVERAGE` goal therefore believes a month costs ~33% more
than it does, and reports fewer months of coverage than the user actually has.

Verified: window `May 1 → Aug 31` (viewed 2026-08-30) spans 4 months, divisor 3, error +33.3%.

**Files:**
- Modify: `server/modules/goal/goal.service.ts:326-348`
- Test: `server/modules/goal/goal.service.expenseBaseline.test.ts` (create)

**Step 1: Write the failing test**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';

const mocks = vi.hoisted(() => ({
	goalFindMany: vi.fn(),
	expenseAggregate: vi.fn(),
	budgetFindMany: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
	default: {
		goal: { findMany: mocks.goalFindMany },
		expense: { aggregate: mocks.expenseAggregate },
		budget: { findMany: mocks.budgetFindMany },
	},
}));

import { GoalService } from './goal.service';

describe('GoalService.getGoalHealthMetrics — expense baseline', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		// 2026-08-30: window is May 1 -> Aug 31 = 4 months
		vi.setSystemTime(new Date(2026, 7, 30));

		mocks.goalFindMany.mockResolvedValue([
			{
				id: 'goal-1',
				goalType: 'MONTHS_COVERAGE',
				targetAmount: new Prisma.Decimal(0),
				currentAmount: new Prisma.Decimal(0),
				thresholdLow: 2,
				thresholdMid: 4,
				thresholdHigh: 6,
				linkedAccount: { id: 'acc-1', balance: new Prisma.Decimal(120000) },
			},
		]);
		mocks.budgetFindMany.mockResolvedValue([]);
	});

	it('divides the expense sum by the number of months the window actually spans', async () => {
		// 4 months of spending at 10,000/mo = 40,000 total
		mocks.expenseAggregate.mockResolvedValue({
			_sum: { amount: new Prisma.Decimal(40000) },
		});

		const result = await GoalService.getGoalHealthMetrics('user-1');

		// Correct: 40000 / 4 = 10000. Buggy old behaviour was 40000 / 3 = 13333.33
		expect(result.monthlyExpenseBaseline).toBe(10000);
		// 120000 / 10000 = 12 months of coverage, not 9
		expect(result.emergencyFundMonths).toBe(12);
	});

	it('falls back to the envelope total only when nothing has been logged', async () => {
		mocks.expenseAggregate.mockResolvedValue({ _sum: { amount: null } });
		mocks.budgetFindMany.mockResolvedValue([
			{ amount: new Prisma.Decimal(8000) },
			{ amount: new Prisma.Decimal(4000) },
		]);

		const result = await GoalService.getGoalHealthMetrics('user-1');

		expect(result.monthlyExpenseBaseline).toBe(12000);
		expect(result.emergencyFundExpenseSource).toBe('budget');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/modules/goal/goal.service.expenseBaseline.test.ts`
Expected: FAIL — first test reports `13333.333333333334`, not `10000`.

**Step 3: Write minimal implementation**

In `server/modules/goal/goal.service.ts`, replace the baseline block (currently ~`:326-348`):

```ts
		// 2. Get expense baseline (hybrid: actual trailing average, fallback to budget)
		const now = new Date();
		const windowStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
		const endCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

		// The window runs from the 1st of `windowStart` to the last day of the
		// current month inclusive — derive the divisor from the window instead of
		// hardcoding it, or the average is inflated by the extra month.
		const windowMonths =
			(endCurrentMonth.getFullYear() - windowStart.getFullYear()) * 12 +
			(endCurrentMonth.getMonth() - windowStart.getMonth()) +
			1;

		const [expenseAgg, budgets] = await Promise.all([
			prisma.expense.aggregate({
				where: { userId, date: { gte: windowStart, lte: endCurrentMonth } },
				_sum: { amount: true },
			}),
			prisma.budget.findMany({
				where: { userId, month: { gte: currentMonth, lt: nextMonth } },
			}),
		]);

		const avgMonthlyExpense =
			(expenseAgg._sum.amount?.toNumber() || 0) / windowMonths;
```

Leave the `totalMonthlyBudget` / `expenseSource` / `monthlyExpenseBaseline` lines below
it unchanged.

**Step 4: Run test to verify it passes**

Run: `npx vitest run server/modules/goal/goal.service.expenseBaseline.test.ts`
Expected: PASS, 2 tests.

**Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add server/modules/goal/goal.service.ts server/modules/goal/goal.service.expenseBaseline.test.ts
git commit -m "fix(goals): derive expense-baseline divisor from actual window span"
```

---

### Task 2: `burnStatus` is meaningless outside the current month

**The bug:** `daysElapsed` is `Math.max(1, ceil((today - monthStart) / day))` with no
upper bound. Viewing a **past** month, `daysElapsed` grows without limit, so
`dailyBurnRate` collapses toward 0 and **every historical envelope reports "ontrack"
even at 300% over**. Viewing a **future** month it clamps to 1, so `dailyBurnRate`
equals the whole spend and it always reports "overpace".

Verified: Jan 2026 envelope, ₱8,000 limit, ₱24,000 spent, viewed Aug 30 →
`daysElapsed 241`, `dailyBurnRate ₱99.59` vs `allowedDailyRate ₱258.06` → `"ontrack"`.

`daysRemaining` has the same root cause and returns `0` for past months, which will
divide-by-zero the safe-to-spend feature in Tier 2.

**Files:**
- Modify: `server/modules/budget/budget.service.ts:180-195`
- Test: `server/modules/budget/budget.service.burnRate.test.ts` (create)

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { computeBurnMetrics } from './budget.burn';

describe('computeBurnMetrics', () => {
	const monthStart = new Date(Date.UTC(2026, 0, 1));
	const monthEnd = new Date(Date.UTC(2026, 0, 31));

	it('clamps daysElapsed to the month length for past months', () => {
		const m = computeBurnMetrics({
			monthStart,
			monthEnd,
			totalSpent: 24000,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 30)),
		});

		expect(m.daysElapsed).toBe(31);
		expect(m.daysRemaining).toBe(0);
		// 24000/31 = 774.19 vs allowed 8000/31 = 258.06
		expect(m.burnStatus).toBe('overpace');
	});

	it('reports a completed month at full elapsed, not partial', () => {
		const m = computeBurnMetrics({
			monthStart,
			monthEnd,
			totalSpent: 4000,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 30)),
		});

		expect(m.daysElapsed).toBe(31);
		expect(m.burnStatus).toBe('ontrack');
	});

	it('clamps to 1 day for a future month and suppresses the verdict', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(Date.UTC(2026, 9, 1)),
			monthEnd: new Date(Date.UTC(2026, 9, 31)),
			totalSpent: 500,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 30)),
		});

		expect(m.daysElapsed).toBe(1);
		expect(m.burnStatus).toBe('insufficient_data');
	});

	it('suppresses the verdict in the first week of the current month', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(Date.UTC(2026, 7, 1)),
			monthEnd: new Date(Date.UTC(2026, 7, 31)),
			totalSpent: 6000,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 2)),
		});

		// A day-1 rent posting must not produce a confident "overpace"
		expect(m.burnStatus).toBe('insufficient_data');
	});

	it('gives a verdict once past day 7', () => {
		const m = computeBurnMetrics({
			monthStart: new Date(Date.UTC(2026, 7, 1)),
			monthEnd: new Date(Date.UTC(2026, 7, 31)),
			totalSpent: 6000,
			budgetLimit: 8000,
			today: new Date(Date.UTC(2026, 7, 10)),
		});

		expect(m.daysElapsed).toBe(10);
		expect(m.burnStatus).toBe('overpace');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/modules/budget/budget.service.burnRate.test.ts`
Expected: FAIL — "Failed to resolve import ./budget.burn".

**Step 3: Write minimal implementation**

Create `server/modules/budget/budget.burn.ts`:

```ts
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Minimum elapsed days before a pace verdict is statistically honest. */
const MIN_DAYS_FOR_VERDICT = 7;

export type BurnStatus = 'ontrack' | 'overpace' | 'insufficient_data';

export interface BurnMetricsInput {
	monthStart: Date;
	monthEnd: Date;
	totalSpent: number;
	budgetLimit: number;
	today?: Date;
}

export interface BurnMetrics {
	daysElapsed: number;
	daysRemaining: number;
	daysInMonth: number;
	dailyBurnRate: number;
	allowedDailyRate: number;
	expectedPercentage: number;
	burnStatus: BurnStatus;
}

/**
 * Pace metrics for one envelope-month.
 *
 * `daysElapsed` is clamped to [1, daysInMonth]. Without the upper clamp a past
 * month's elapsed days grow without bound, driving `dailyBurnRate` toward zero
 * and reporting "ontrack" for an envelope that blew its limit months ago.
 *
 * The verdict is suppressed below MIN_DAYS_FOR_VERDICT because straight-line
 * pacing is not honest early in a month — a single day-1 rent posting would
 * otherwise guarantee "overpace".
 */
export function computeBurnMetrics({
	monthStart,
	monthEnd,
	totalSpent,
	budgetLimit,
	today = new Date(),
}: BurnMetricsInput): BurnMetrics {
	const daysInMonth = monthEnd.getUTCDate();

	const rawElapsed = Math.ceil(
		(today.getTime() - monthStart.getTime()) / MS_PER_DAY
	);
	const daysElapsed = Math.min(daysInMonth, Math.max(1, rawElapsed));
	const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

	const dailyBurnRate = totalSpent / daysElapsed;
	const allowedDailyRate = budgetLimit > 0 ? budgetLimit / daysInMonth : 0;
	const expectedPercentage = (daysElapsed / daysInMonth) * 100;

	// A month that has not started yet, or has barely started, cannot support a
	// pace verdict — rawElapsed <= 0 means the month is in the future.
	const isFuture = rawElapsed <= 0;
	const tooEarly = daysElapsed < MIN_DAYS_FOR_VERDICT && daysRemaining > 0;

	const burnStatus: BurnStatus =
		isFuture || tooEarly
			? 'insufficient_data'
			: dailyBurnRate > allowedDailyRate
				? 'overpace'
				: 'ontrack';

	return {
		daysElapsed,
		daysRemaining,
		daysInMonth,
		dailyBurnRate,
		allowedDailyRate,
		expectedPercentage,
		burnStatus,
	};
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run server/modules/budget/budget.service.burnRate.test.ts`
Expected: PASS, 5 tests.

**Step 5: Wire it into the service**

In `server/modules/budget/budget.service.ts`, delete the inline burn-rate block
(`:180-195`, from `const today = new Date();` through `const allowedDailyRate = ...`)
and replace the `metrics` object construction with:

```ts
		const burn = computeBurnMetrics({
			monthStart,
			monthEnd,
			totalSpent,
			budgetLimit,
		});
```

then spread `...burn` into the returned `metrics` object in place of the individual
`daysElapsed` / `daysRemaining` / `daysInMonth` / `dailyBurnRate` / `allowedDailyRate` /
`burnStatus` keys. Add the import at the top:

```ts
import { computeBurnMetrics } from './budget.burn';
```

**Step 6: Update the consuming type and component**

`burnStatus` gained a third value. Update `BudgetLedger.tsx:218-251` so the
"Daily Pace" card renders a neutral "Building…" state for `'insufficient_data'`
instead of falling through to the ontrack branch.

**Step 7: Verify and commit**

```bash
npx vitest run
npx tsc --noEmit
git add server/modules/budget/budget.burn.ts server/modules/budget/budget.service.burnRate.test.ts server/modules/budget/budget.service.ts components/modules/budget/BudgetLedger.tsx
git commit -m "fix(budgets): clamp daysElapsed and suppress early pace verdicts"
```

---

### Task 3: Hardcoded currency on two screens

**The bug:** Two surfaces render `$`/`USD` regardless of the user's locked currency.
`components/modules/budget/BudgetViews.tsx:222-250` prints a literal `$` before
`toLocaleString('en-US', …)`. `app/(authenticated)/reports/page.tsx:80-85` builds its
own `Intl.NumberFormat('en-US', { currency: 'USD' })`.

**Files:**
- Modify: `components/modules/budget/BudgetViews.tsx:222-250`
- Modify: `app/(authenticated)/reports/page.tsx:80-85`

**Step 1: Fix the client component**

`BudgetViews.tsx` is already `'use client'`. Add the hook import:

```ts
import { useCurrency } from '@/lib/contexts/currency-context';
```

Inside the component body add `const { formatCurrency } = useCurrency();`, then replace
both hardcoded blocks:

```tsx
<span className='font-bold'>
	{formatCurrency(month.totalBudget, { decimals: 0 })}
</span>
```

```tsx
<span
	className={`font-bold ${
		month.isOverBudget ? 'text-red-600' : 'text-green-600'
	}`}
>
	{formatCurrency(month.totalSpent, { decimals: 0 })}
</span>
```

**Step 2: Fix the server component**

`app/(authenticated)/reports/page.tsx` is a **server** component — it cannot call
`useCurrency()`. Fetch the currency and use the shared formatter instead. Add to the
existing `Promise.all` block:

```ts
		UserService.getCurrency(userId),
```

then replace the local helper at `:80-85`:

```ts
	const formatCurrency = (val: number) =>
		formatCurrencyUtil(val, { currency, decimals: 0 });
```

with the import:

```ts
import { formatCurrency as formatCurrencyUtil } from '@/lib/formatters';
```

**Step 3: Verify in the browser**

```bash
docker compose up -d
```

Sign in as the seeded demo user, confirm the account currency is non-USD, then check
`/budgets` (month-grid view) and `/reports` render the correct symbol.

**Step 4: Commit**

```bash
npx tsc --noEmit
git add components/modules/budget/BudgetViews.tsx "app/(authenticated)/reports/page.tsx"
git commit -m "fix(budgets,reports): use the user's currency instead of hardcoded USD"
```

---

### Task 4: One definition of `spent`

**The bug:** `getBudgets` (`:65`) eager-loads `expenses: true` with **no date filter**,
so an expense linked to a January envelope but dated February counts. `getBudgetWithExpenses`
(`:144-155`) filters to the month. The list and the detail page can therefore display
different `spent` values for the same envelope. `getBudgetTrends:469` and
`getBudgetRecommendations:550` share the unfiltered version.

**Decision:** the month-scoped definition wins. An envelope is a month's plan; spend
outside that month is not part of it.

This task also removes the unbounded eager load, closing defect #10's read path.

**Files:**
- Modify: `server/modules/budget/budget.service.ts:50-90`
- Modify: `prisma/schema.prisma` (Expense index)
- Test: `server/modules/budget/budget.service.spentDefinition.test.ts` (create)

**Step 1: Write the failing test**

Assert that `getBudgets` issues a `groupBy` scoped to the month window and ignores an
out-of-month linked expense. Mock `prisma.budget.findMany` and `prisma.expense.groupBy`;
assert on the full `groupBy` args object.

**Step 2: Run test to verify it fails**

Run: `npx vitest run server/modules/budget/budget.service.spentDefinition.test.ts`
Expected: FAIL — `expense.groupBy` was never called.

**Step 3: Implement**

Replace the `getBudgets` body's eager load with:

```ts
		const [budgets, spentByBudget] = await Promise.all([
			prisma.budget.findMany({
				where,
				include: { category: true },
				orderBy: { amount: 'desc' },
			}),
			prisma.expense.groupBy({
				by: ['budgetId'],
				where: {
					userId,
					budgetId: { not: null },
					date: { gte: monthStart, lte: monthEnd },
				},
				_sum: { amount: true },
			}),
		]);

		const spentMap = new Map(
			spentByBudget.map((g) => [
				g.budgetId as string,
				g._sum.amount ?? new Prisma.Decimal(0),
			])
		);
```

then derive `spent` from `spentMap.get(budget.id)`, converting with `.toNumber()` once.

**Step 4: Add the covering index**

In `prisma/schema.prisma`, on the `Expense` model:

```prisma
  @@index([userId, budgetId, date])
```

Then:

```bash
docker compose exec app npx prisma migrate dev --name expense_budget_date_index
docker compose exec app npx prisma generate
docker compose restart app
```

**Step 5: Verify and commit**

```bash
npx vitest run
npx tsc --noEmit
docker compose exec app npm run build
git add server/modules/budget/budget.service.ts server/modules/budget/budget.service.spentDefinition.test.ts prisma/schema.prisma prisma/migrations
git commit -m "fix(budgets): scope spent to the envelope month and drop the eager load"
```

---

### Task 5: Tier 0 gate

Run the money review before pushing.

```bash
npx vitest run          # full suite green
npx tsc --noEmit
docker compose exec app npm run lint
docker compose exec app npm run build
```

Then invoke the `money-feature-review` skill on the Tier 0 diff and dispatch the
**accountant** agent. Tasks 1, 2 and 4 all change user-visible financial figures.

```bash
git push origin main
```

---

# TIER 1 — Coverage: make every other number trustworthy

The unanimous council finding. `Expense.budgetId` is optional, so `spent` is a **floor,
not a total**, and the error is one-directional — envelopes always read healthier than
reality. Until this ships, adherence, recommendations and problem categories all run on
a biased sample with nothing measuring the bias.

---

### Task 6: Coverage ratio in the service

**Files:**
- Create: `server/modules/budget/budget.analytics.service.ts`
- Create: `server/modules/budget/budget.analytics.types.ts`
- Test: `server/modules/budget/budget.analytics.coverage.test.ts`

Compute per envelope-month:

```
coverageRatio = linkedSpend / (linkedSpend + unlinkedSameCategorySpend)
```

Returns `null` when the denominator is 0 (nothing spent in that category — coverage is
undefined, not 100%). Two `groupBy` calls, no eager loads.

**Acceptance:** 3 linked + 2 unlinked in the same category+month → ratio is the linked
share; zero spend → `null`; unlinked in a *different* category does not affect it.

---

### Task 7: Never report "on track" below full coverage

Modify the health rollup so an envelope with `coverageRatio !== null && < 1` cannot be
counted in `onTrack`. It becomes a fourth bucket, `incomplete`. The accountant flagged
"on track + partial coverage" as the app's single most misleading output.

---

### Task 8: Auto-link on expense create — single-envelope case only

**Files:**
- Modify: `server/modules/expense/expense.service.ts:84`

When an expense is created with `budgetId: null` and **exactly one** envelope exists for
that category+month, set `budgetId` automatically inside the existing transaction.
When **two or more** exist, leave it null — `schema.prisma:367` permits multiple
envelopes per category+month and guessing would be a fabricated attribution.

**Acceptance:** exactly one envelope → linked; two envelopes → stays null; zero →
stays null; explicit user-supplied `budgetId` is never overwritten.

---

### Task 9: Surface coverage in the UI

- `BudgetLedger.tsx:356-412` — promote the unlinked block from muted gray to an amber
  alert, and show the true category total beside the official `spent`.
- `BudgetList.tsx` — unlinked-count badge per row.
- `BudgetPressure.tsx` — same badge.

**Gate:** `money-feature-review` + accountant, then push.

---

# TIER 2 — Free insight

No new queries, no schema change. All operands already exist.

### Task 10: `PaceBadge` shared component

`expectedPercentage` already comes out of `computeBurnMetrics` from Task 2. Pipe
`daysElapsed`/`daysInMonth` through `getBudgets` and `dashboard.presenter.ts:441-457`,
then render one shared badge in `BudgetList` and `BudgetPressure`:

```
Groceries          62%  ⚠ ahead of pace
[███████░░░░░░░░]        (expected 40% by today)
```

Renders nothing when `burnStatus === 'insufficient_data'`.

### Task 11: Safe-to-spend

`(limit - spent) / daysRemaining`, guarded for `daysRemaining === 0` (Task 2 makes this
reachable for past months). Per envelope, plus one dashboard rollup.

### Task 12: Decide the orphaned `BudgetHealthSummary`

`getBudgetHealthSummary` and `components/modules/budget/BudgetHealthSummary.tsx` have
zero callers. Either wire the component into the budgets page header — it is the only
surface carrying `onTrack`/`warning`/`over` plus `problemCategories` — or delete the
method, the component and the type. **Do not leave it orphaned.**

---

# TIER 3 — The no-budget floor

The default state for most users. Founder's ruling: a legitimate permanent product
state, not a funnel failure.

### Task 13: `hasBudgets` contract

Add `hasBudgets: boolean` to `BudgetHealthSummary` and set it at both return points
(`budget.service.ts:263-273` and the success path). Zero call sites makes this free.
Zeros are currently indistinguishable from "budgeted 0, spent 0" — an AI advisor handed
`totalBudgeted: 0, totalSpent: 0` would confidently report perfect adherence.

### Task 14: Category analysis for non-budgeters

When `hasBudgets === false`, render this month vs. last per category with movers,
instead of an empty state. Useful with zero setup.

### Task 15: Gate the n=1 recommendation badge

`getBudgetRecommendations` shows a confident green "✓ On track / stable" at one month of
history, because `monthsOver` and `monthsUnder` are both 0-of-0 under the `>= 3` gate.
Replace with a neutral "Building history (1/3 mo)".

### Task 16: Delayed inferred-envelope offer

After ~6 weeks of logging, offer envelopes seeded from the trailing **median** (not mean
— one blowout month must not set the envelope). Label it **"your recent average"**,
never "recommended", and **never pre-fill the input**. Also fix `budget.service.ts:587-592`,
which currently raises the envelope 10% *above* average after 3 months of overspend,
formally ratifying the overrun.

---

# TIER 4 — Foundations

### Task 17: Decimal standardization

Replace the float reductions at `budget.service.ts:75`, `:174`, `:469`, `:550`. Sum in
SQL via `_sum.amount`; keep `Prisma.Decimal` through arithmetic; `.toNumber()` once at
the return boundary. Already user-visible: `percentage > 100` fires at
`100.00000000000001`.

### Task 18: Month-scope the budgets page

`app/(authenticated)/budgets/page.tsx:21` calls `getBudgets(userId)` with no month
filter and filters client-side in `BudgetViews.tsx:88-92`. Pass `{ month }` and make
month navigation a route param.

### Task 19: Resolve the timezone split

`budget.controller.ts:19-21` normalizes `Budget.month` to UTC-midnight-1st;
`budget.service.ts:140-142` builds the month window with local `setDate(0)`/`setHours()`.
Must be resolved before any week-of-month or day-of-month analytics ship.

### Task 20: `$queryRaw` analytics — needs a convention decision first

**There is no `$queryRaw` anywhere in this repo today.** Introducing it is a real
decision. If approved: scope it to `budget.analytics.service.ts`, use `Prisma.sql`
parameterization, always bind `userId`. Unlocks revealed budget (`percentile_cont(0.5)`),
volatility (`stddev_samp / avg`), week-of-month velocity, break-day (window function),
and anomaly detection. Needs `@@index([userId, categoryId, date])` on Expense.

**Ruled out:** personal inflation rate — needs 24 months and stable basket weights;
with manual entry it would track tagging habits, not prices.

### Task 21: `BudgetRevision` table

`updateBudget` (`:227-233`) overwrites `amount` in place, so an envelope raised
mid-month to dodge "over" is undetectable and `getBudgetRecommendations` averages
possibly-edited amounts. The only schema change anyone argued for. Lowest priority.

---

## Deferred / explicitly out of scope

- **Rollover / carry-over envelopes** — hard no. Rolling a target is not rolling money.
- **Settled envelopes** (`settledAt`) — see the earlier design brief. The cross-module
  justification proved unreachable; revisit only if users ask.
- **Caching** — `invalidateTags()` is currently a no-op because no cache producer exists
  (`unstable_cache` / `'use cache'` / `next: { tags }` all absent). Introducing one is a
  separate decision; do not plan around caching until then.
