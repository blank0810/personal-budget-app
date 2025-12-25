# Implementation Plan - Dynamic Liability & Dashboard Refinements

## Goal Description

Implement dynamic liability tracking by adding an `isLiability` flag to the Account model, replacing hardcoded `AccountType` checks. Refine the Dashboard to use this new logic, replace "Monthly Burn" with "Debt Paydown", and add a detailed breakdown to the "Savings Rate" card.

## User Review Required

> [!IMPORTANT] > **Database Migration**: This change involves a schema migration (`isLiability` boolean). All existing accounts will need a default value. I will default it to `false` and then run a migration script to backfill it based on the old hardcoded logic (Credit/Loan -> true).

## Proposed Changes

### Database & Schema

#### [MODIFY] [schema.prisma](file:///home/blank/Desktop/Projects/Personal_Projects/personal-budget-app/prisma/schema.prisma)

-   Add `isLiability Boolean @default(false)` to `Account` model.

### Backend Logic

#### [MODIFY] [account.types.ts](file:///home/blank/Desktop/Projects/Personal_Projects/personal-budget-app/server/modules/account/account.types.ts)

-   Update Zod schemas (`createAccountSchema`, `updateAccountSchema`) to include `isLiability`.

#### [MODIFY] [account.controller.ts](file:///home/blank/Desktop/Projects/Personal_Projects/personal-budget-app/server/modules/account/account.controller.ts)

-   Update `createAccountAction` and `updateAccountAction` to handle `isLiability` from FormData.

#### [MODIFY] [dashboard.service.ts](file:///home/blank/Desktop/Projects/Personal_Projects/personal-budget-app/server/modules/dashboard/dashboard.service.ts)

-   Update `getNetWorth` to use `account.isLiability` instead of `AccountType` checks.
-   Update `getFinancialHealthMetrics`:
    -   Remove `monthlyBurnRate`.
    -   Add `debtPaydown` calculation (Sum of transfers where `toAccount.isLiability` is true).
    -   Update `savingsRate` logic if needed to return breakdown data (or add a separate helper).

### Frontend UI

#### [MODIFY] [page.tsx](<file:///home/blank/Desktop/Projects/Personal_Projects/personal-budget-app/app/(authenticated)/dashboard/page.tsx>)

-   **Top Row**: Replace "Monthly Burn" card with "Debt Paydown".
-   **Top Row**: Update "Savings Rate" card to show breakdown text (e.g., "x% Savings Account | y% Others").
    > [!NOTE] > **UX Decision**: Percentage (%) is generally better for a "Rate" metric as it normalizes income fluctuations. However, for the breakdown, I will use the format "Saved: $500 (10%)" to show both amount and percentage, implementing a tooltip or subtitle for the raw amounts.

#### [MODIFY] [report.service.ts](file:///home/blank/Desktop/Projects/Personal_Projects/personal-budget-app/server/modules/report/report.service.ts)

-   Inspect `getNetWorthHistory` or similar functions. If they use hardcoded `AccountType` logic, update them to use `isLiability`.

## Verification Plan

### Automated Verification

I will create a script `scripts/verify-financial-logic.ts` to:

1.  Create a test user.
2.  Create a "Bank" account (Asset) and "Credit Card" account (Liability).
3.  Simulate Income ($5000) and Expense ($2000).
4.  Simulate a Transfer ($500) from Bank to Credit Card.
5.  Call `DashboardService.getFinancialHealthMetrics` and verify:
    -   `debtPaydown` equals $500.
    -   `savingsRate` is correct.
    -   `netWorth` uses the new `isLiability` flag.

### Manual Verification

### Manual Verification

1.  Restart the application container: `docker restart <container_name>` (or use the VS Code Docker extension).
2.  Go to **Accounts** -> **Add Account**. Verify "Treat as Liability" checkbox appears.
3.  Create a custom account type checked as Liability.
4.  Go to **Dashboard**.
5.  Verify "Debt Paydown" card shows 0.
6.  Make a transfer to the new liability account.
7.  Verify "Debt Paydown" updates.
