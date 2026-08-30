# Budget Envelope Intelligence + the No-Budget State

**Date:** 2026-08-30
**Status:** Validated design — awaiting scope confirmation
**Council:** founder, accountant, lead-engineer, budget-frontend, budget-backend (all 5, parallel)
**Review gates:** `money-feature-review` + **accountant** sign-off on Tier 0 and Tier 1

## Summary

The app already computes more envelope analytics than it displays. The gap is not
missing math — it is that pacing data reaches exactly one low-traffic screen while
the two daily surfaces show context-free percentages. Most high-value insights
need **no new query and no schema change**.

Along the way the council confirmed **12 defects**, several of which produce
user-visible wrong numbers today and are independent of any new feature.

Two framing decisions locked:

| Decision | Choice |
|---|---|
| Is "no budget set" a funnel failure? | **No — legitimate permanent product state.** Fix the floor, don't move the gate. |
| Blanket auto-link untagged expenses? | **No — only when exactly one envelope exists** for that category+month. N>1 is genuinely ambiguous. |
| Inferred envelopes at signup? | **No — offer at ~6 weeks of logging.** No bank sync means no day-1 history; day-1 budget-pushing makes users guess. |
| Rollover / carry-over envelopes? | **Hard no.** Rolling a target is not rolling money. |
| Personal inflation rate? | **Ruled out as junk** — needs 24mo + stable basket weights; would track tagging habits, not prices. |

---

## The unanimous finding — untagged expenses

All five agents independently ranked this #1 without being prompted to.

`Expense.budgetId` is nullable and applied by hand after the fact.
`budget.service.ts:143-176` counts **only** linked expenses. Therefore the headline
`spent` on every envelope is a **floor, not a total**, and the error is
**one-directional** — envelopes always read healthier than reality, never worse.

> "Omitting a real, in-category, in-month outflow because a dropdown wasn't
> touched is not isolation, it is an unreconciled ledger." — accountant

> "Adherence, recommendations, and problem categories all run on a biased sample,
> and nothing measures the bias." — lead-engineer

**Merged position (founder's fix, constrained by the accountant):**

1. Auto-link on expense create **only when exactly one** envelope exists for that
   category+month. Where N>1, require an explicit choice — `schema.prisma:367`
   permits multiple envelopes per category+month, so attribution is ambiguous.
2. Publish a **coverage ratio** per envelope/month:
   `linked / (linked + unlinked)`. Below 100% means `spent` is a floor and must be
   labelled as such.
3. **Never report "on track" while coverage < 100%.** The accountant calls this
   combination the app's single most misleading output.

---

## Confirmed defects

Items 1-6 were verified directly against the code (arithmetic re-run or repo grep).

| # | Defect | Location | Impact |
|---|---|---|---|
| 1 | Window spans **4** months, divides by hardcoded `3` | `goal.service.ts:328-343` | Every emergency-fund goal overstates monthly cost by **33.3%** |
| 2 | `daysElapsed` unbounded | `budget.service.ts:183-189` | Past months: a 300% overrun reports **"ontrack"**. Future months: always "overpace" |
| 3 | Dual `spent` contract | `getBudgets:65` (no date filter) vs `getBudgetWithExpenses:144-155` (month-scoped) | List and detail can disagree under the same name |
| 4 | `getBudgetHealthSummary` + its component orphaned | `budget.service.ts:249`, `components/modules/budget/BudgetHealthSummary.tsx` | ~90 lines of analytics run for nobody; a 4th empty state never renders |
| 5 | `invalidateTags()` is a no-op | `server/actions/cache.ts:12-16` | No cache producers exist (`unstable_cache` / `'use cache'` / `next: { tags }` all absent) — every budget read is dynamic per request |
| 6 | Hardcoded currency | `BudgetViews.tsx:222-250` (`$`), `app/(authenticated)/reports/page.tsx:80-85` (`USD`, `en-US`) | Wrong symbol for every non-USD user; currency is locked after onboarding |
| 7 | `adherencePercent` clamped `Math.min(100, …)` | `budget.service.ts:489` | 300% blowout and a perfect month render identically; trend chart flatlines where it should alarm |
| 8 | `updateBudget` overwrites `amount`, no history | `budget.service.ts:227-233` | Envelope raised mid-month to dodge "over" is undetectable; recommendations average edited amounts |
| 9 | Recommendations raise envelope **+10% above average** after 3 months overspend | `budget.service.ts:587-592` | Formally ratifies the overrun |
| 10 | `/budgets` calls `getBudgets(userId)` with no month filter + unbounded `include: { expenses: true }` | `app/(authenticated)/budgets/page.tsx:21`, filtered client-side in `BudgetViews.tsx:88-92` | At year 3: every budget ever x every linked expense ever, over the wire, per load |
| 11 | Green "✓ On track" badge at n=1 | recommendations, `monthsAnalyzed >= 3` gate | Reads as validated when it means "no data" |
| 12 | Money summed as JS float | `budget.service.ts:75`, `:174`, `:469`, `:550` | Already visible: `percentage > 100` fires at `100.00000000000001` |

---

## What the app already computes but barely shows

Audited by budget-frontend against the actual components.

| Metric | On screen? | Where |
|---|---|---|
| `dailyBurnRate` / `allowedDailyRate` / `burnStatus` | Only on the single-envelope detail page | `BudgetLedger.tsx:218-251` |
| `daysRemaining` | Yes | `BudgetLedger.tsx:213` |
| `daysElapsed` / `daysInMonth` | No — internal only | — |
| per-expense `runningTotal` / `isOverBudget` | **Yes, well done** | `BudgetLedger.tsx:307-350` |
| `unlinkedExpenses` | Yes but weak — muted gray, below fold, detail page only | `BudgetLedger.tsx:356-412` |
| `onTrack`/`warning`/`over`, `problemCategories` | **Dead code** | orphaned |
| `trends.savings` | **Dead field** | `budget.service.ts:486` |
| Dashboard `BudgetPressure` | spent/limit % only — **zero pacing signal** | `dashboard.presenter.ts:441-457` |

**The gap:** a budget at 40% reads identically on day 3 and day 28.

---

## Insights, ranked by value-to-cost

**Free — no new query, no schema change:**

1. **Pace vs. calendar** — `expectedPercentage = daysElapsed / daysInMonth * 100`
   shown beside the existing `percentage`.
   ```
   Groceries          62%  ⚠ ahead of pace
   [███████░░░░░░░░]        (expected 40% by today)
   ```
2. **Safe to spend today** — `(limit - spent) / daysRemaining`, per envelope and
   rolled into one dashboard number. Requires defect #2 fixed first
   (`daysRemaining` is 0 for past months → divide by zero).
3. **Envelope-aware logging** — when a budgeted category is picked in the expense
   form, show remaining **before** save. The input→analysis identity at the one
   moment analysis can change behavior.
4. **Coverage ratio** — data already fetched at `budget.service.ts:158-170` and discarded.
5. **Break-date projection** — `dailyBurnRate * daysInMonth`; both operands
   computed at `:193-194` and never multiplied.
6. **Chronic-breach verdict** — `problemCategories` already tallies `monthsOver`.
   "Groceries broke 5 of 6 months — the budget is wrong, not your spending."
7. **Month-end reckoning** — render the dead `savings` field as
   "PHP 4,100 you planned to spend and didn't."

**Needs `$queryRaw` + one index `@@index([userId, categoryId, date])`:**

- Revealed budget — trailing **median** (not mean; one blowout month must not set
  the envelope), `percentile_cont(0.5)`
- Volatility — `stddev_samp / avg` = coefficient of variation, unit-free
- Week-of-month velocity — `FLOOR((EXTRACT(DAY FROM date)-1)/7)`
- Break day — window function over `SUM(amount) OVER (PARTITION BY budgetId ORDER BY date)`
- Fixed-vs-discretionary — derived from volatility in JS, `CV < 0.15` and >=3 of N months
- Anomaly — `current > median + 2*stddev`, guard `stddev = 0`, require `monthsObserved >= 3`

Note: **`$queryRaw` appears nowhere in this repo today.** Introducing it is a real
convention decision — scope it to the analytics file, `Prisma.sql` parameterized,
`userId` always bound.

**Needs schema — the only one anyone argued for:**
- `BudgetRevision` table, to close defect #8.

**Behavioral guardrail:** inferring envelopes from trailing averages anchors users
to past behavior *including overspending*. Label it "your recent average," never
"recommended," and never pre-fill the input.

---

## The no-budget state

**UI reality (better than assumed):** three real, on-brand empty states already
exist — `BudgetList.tsx:159-192`, `BudgetPressure.tsx`, `BudgetAnalytics.tsx:44-61`.
A fourth, in the orphaned `BudgetHealthSummary.tsx:81-106`, never runs.

**Service reality (wrong):** `getBudgetHealthSummary` returns all zeros at
`:263-273` — indistinguishable downstream from "budgeted 0, spent 0." An AI
advisor handed `totalBudgeted: 0, totalSpent: 0` will confidently report perfect
adherence.

**Contract fix:** add `hasBudgets: boolean`. Zero call sites make this free.
(lead-engineer preferred a discriminated union; backend's flag carries the same
information without forcing narrowing on a component that gets wired up later.
Mirrors the existing three-state `expenseSource` pattern at `goal.service.ts:345-348`.)

**Progressive disclosure:**
- **Month 1** — burn rate needs no history; the ledger page is alive on day one.
  Gate the recommendation badge to neutral "Building history (1/3 mo)".
- **Month 3** — increase/decrease recommendations and `problemCategories` engage.
- **Month 6** — full trend line and pattern detection.

---

## Architecture

New `server/modules/budget/budget.analytics.service.ts` + `budget.analytics.types.ts`,
fronted by the existing `budget.controller.ts`. Precedent: the admin module already
splits `admin-analytics.service.ts` from its siblings.

- **No** intelligence layer, **no** rollup table, **no** cron snapshot. Single-pass
  aggregates over one user's expenses — hundreds to low thousands of rows.
- Do **not** extend the 787-line `budget.service.ts`.
- Boundary worth drawing: **numbers in analytics, wording in the advisor prompt
  layer**, so the UI and the future AI advisor cannot drift.

**Decimal standard:** sum in SQL, never in JS. `_sum.amount` returns
`Prisma.Decimal`; keep Decimal through all arithmetic; `.toNumber()` exactly once
at the service return boundary. Where a JS reduce is unavoidable, reduce over
`Prisma.Decimal` seeded `new Prisma.Decimal(0)`. Ratios/percentages may be
`number` — display-only.

**The `getBudgets` fix (defect #10 + #3 together):**
```ts
const [budgets, spentByBudget] = await Promise.all([
  prisma.budget.findMany({ where, include: { category: true }, orderBy: { amount: 'desc' } }),
  prisma.expense.groupBy({
    by: ['budgetId'],
    where: { userId, budgetId: { not: null },
      date: { gte: startOfMonth(m), lte: endOfMonth(m) } },
    _sum: { amount: true },
  }),
]);
```
Needs `@@index([userId, budgetId, date])` on Expense.

**Timezone caveat:** `budget.controller.ts:19-21` normalizes `Budget.month` to
UTC-midnight-1st, but `budget.service.ts:140-142` builds the month window with
local `setDate(0)`/`setHours()`. Day-of-month cohorts would be off by one at month
edges for non-UTC users. Resolve before shipping week/day analytics.

---

## Implementation order

**Tier 0 — bugs, ship independently of any feature**
Defects 1, 2, 6, 3. Each is small, standalone, and produces wrong numbers today.

**Tier 1 — credibility**
Coverage ratio + single-envelope auto-link + "never on-track below 100% coverage".
Everything else is untrustworthy until this lands.

**Tier 2 — free insight**
Pace-vs-calendar chip on `BudgetPressure` + `BudgetList` (shared `PaceBadge`
component); safe-to-spend; decide defect #4 (wire in or delete).

**Tier 3 — the no-budget floor**
Category analysis for non-budgeters; `hasBudgets` contract; delayed
inferred-envelope offer at ~6 weeks; gate the n=1 badge (defect #11).

**Tier 4 — foundations**
Defect #10 query fix + `@@index`, Decimal standardization (#12), then `$queryRaw`
analytics. `BudgetRevision` (#8) last.

## Sequencing & workflow

- **Git:** commit straight to `main`, no feature branch / PR (solo-project rule).
- **Implementation:** handed to **Codex** if available, reviewed by the relevant
  council agents. Money-touching diffs pass `money-feature-review` + accountant
  before commit.
- Tier 0 defects 1 and 2 change user-visible financial figures — accountant
  reviews those specifically.

## Open questions

1. Which tier(s) to implement now.
2. Defect #4 — wire `BudgetHealthSummary` in, or delete it?
3. Is introducing `$queryRaw` acceptable as a repo convention (Tier 4 gate)?
