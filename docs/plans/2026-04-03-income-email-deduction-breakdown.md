# Income Email: Deduction Breakdown

**Date:** 2026-04-03
**Status:** Approved

## Problem

When income is added with church tithe (and/or emergency fund) auto-deduction enabled, the email notification shows the gross income amount and the new account balance. Since the balance reflects deductions that aren't mentioned in the email, the math appears wrong and causes confusion.

## Solution

Add conditional deduction rows to the income notification email so the user sees a full breakdown of how the gross income was allocated.

## Design

### Data Flow

The notification trigger in `income.service.ts` (lines 182-221) already has access to the input data containing `titheEnabled`, `tithePercentage`, and emergency fund fields. We compute the deduction amounts inline and pass them as a `deductions` object:

```typescript
deductions: {
  tithe?: { amount: number; percentage: number };
  emergencyFund?: { amount: number; percentage: number };
}
```

No new database queries needed -- amounts are derived from input data.

### Email Template

The summary table in `notification.service.ts` (lines 215-276) gains conditional rows:

```
Amount                  P1,000.00
Church Tithe (10%)      -P100.00      <- only if tithe applied
Emergency Fund (5%)     -P50.00       <- only if emergency fund applied
Net to Account          P850.00       <- only if any deduction exists
Category                Freelance
Account                 Savings
New Balance             P12,850.00
```

Rules:
- Deduction rows only render when present in the `deductions` object
- "Net to Account" only shows if at least one deduction exists
- Deduction amounts styled in muted/red color
- Gross Amount row always shows full income

### SMS

No changes -- SMS stays as a short confirmation. Deduction breakdown is email-only.

## Files Changed

1. `server/modules/income/income.service.ts` -- compute deductions, pass to notification call
2. `server/modules/notification/notification.service.ts` -- accept deductions param, render conditional rows
