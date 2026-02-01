# Emergency Fund Calculation Fix Design

**Date:** 2026-02-01
**Status:** Approved
**Feature:** Fix Emergency Fund calculation to use actual expenses (#15 from v1.8 roadmap)

## Problem Statement

The current Emergency Fund calculation uses **budgeted expenses** (what you plan to spend) instead of **actual expenses** (what you really spend). This creates a gap:

| Scenario | Budget | Actual | EF Balance | Current Shows | Reality |
|----------|--------|--------|------------|---------------|---------|
| Overspender | $2,000/mo | $3,000/mo | $6,000 | 3 months | 2 months |
| Underspender | $3,000/mo | $2,000/mo | $6,000 | 2 months | 3 months |

**Risk:** Users may think they're covered for 3 months but only have 2 months of real runway.

## Solution: Hybrid Approach

Use **3-month rolling average of actual expenses** as primary, with **total monthly budget** as fallback for new users.

```
monthlyExpenses =
  IF actualExpenses (3mo avg) > 0:
    actualExpenses
  ELSE:
    totalMonthlyBudget

monthsCoverage = fundBalance / monthlyExpenses
```

### Rationale

1. **Conservative** - Based on what you actually spend, not aspirations
2. **Industry standard** - Financial advisors use actual expenses for EF planning
3. **Smooths volatility** - 3-month average handles one-time spikes
4. **Graceful fallback** - New users without history still get useful data

## Implementation

### Changes to `dashboard.service.ts`

In `getFundHealthMetrics` method:

**Current logic (line ~320):**
```typescript
const totalMonthlyBudget = budgets.reduce(
  (sum, b) => sum + Number(b.amount), 0
);
// Used directly for monthsCoverage calculation
```

**New logic:**
```typescript
// 1. Get 3-month average of ACTUAL expenses (reuse existing method)
const avgMonthlyExpense = await this.getAverageMonthlyExpense(userId, 3);

// 2. Get total monthly budget as fallback
const totalMonthlyBudget = budgets.reduce(
  (sum, b) => sum + Number(b.amount), 0
);

// 3. Hybrid: Use actual if available, otherwise budget
const expenseSource: 'actual' | 'budget' | null =
  avgMonthlyExpense > 0 ? 'actual' :
  totalMonthlyBudget > 0 ? 'budget' : null;

const monthlyExpenseBaseline = avgMonthlyExpense > 0
  ? avgMonthlyExpense
  : totalMonthlyBudget;
```

**Update monthsCoverage calculation:**
```typescript
monthsCoverage = monthlyExpenseBaseline > 0
  ? balance / monthlyExpenseBaseline
  : balance > 0 ? 999 : 0;
```

**Add to return object:**
```typescript
return {
  funds,
  totalFundBalance,
  hasEmergencyFund: !!emergencyFund,
  emergencyFundMonths: emergencyFund?.monthsCoverage ?? null,
  emergencyFundHealth: emergencyFund?.healthStatus ?? null,
  // NEW fields
  emergencyFundExpenseSource: expenseSource,
  monthlyExpenseBaseline: monthlyExpenseBaseline,
};
```

### Changes to `dashboard/page.tsx`

Update Emergency Fund card to show expense source:

**Current:**
```
3.2 mo
Critical - build urgently
```

**New:**
```
3.2 mo
Critical - build urgently
Based on actual spending
```

Or with budget fallback:
```
2.0 mo
Underfunded
Based on monthly budget
```

## Files to Change

| File | Changes |
|------|---------|
| `server/modules/dashboard/dashboard.service.ts` | Hybrid expense calculation, add `expenseSource` field |
| `app/(authenticated)/dashboard/page.tsx` | Display expense source in Emergency Fund card |

## Edge Cases

1. **No expenses AND no budgets** - Shows 999 months (infinite) with "No expense data"
2. **New user with budgets only** - Falls back to budget, shows "Based on monthly budget"
3. **User with expenses but no EF account** - No change (EF card not shown)
4. **Zero balance EF account** - Shows 0 months regardless of expense source

## Out of Scope

- Changing FundCard component (only affects dashboard EF card)
- Adding user preference for calculation method
- Using MAX(actual, budget) conservative approach
- Changing the "Runway" card calculation (already uses actual expenses)

## Testing

1. User with 3+ months of expense history → Should use actual expenses
2. New user with only budgets → Should fall back to budget
3. User with no data → Should show appropriate empty state
4. Verify months coverage matches manual calculation
