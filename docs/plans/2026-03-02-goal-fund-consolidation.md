# Goal + Fund Consolidation Plan

**Goal:** Eliminate EMERGENCY_FUND and FUND account types. Absorb their capabilities (months-coverage calculation, threshold-based health status, health score integration) into the Goal model. Simplify the mental model to: Accounts = where money lives, Goals = what it's for.

**Key changes:**
- Remove EMERGENCY_FUND and FUND from AccountType enum
- Add `goalType`, threshold fields, and `calculationMode` to Goal model
- Migrate existing fund accounts → SAVINGS accounts + auto-created Goals
- Update health score Liquidity pillar to read from Goals
- Remove fund-specific UI from AccountForm, replace with enhanced GoalForm
- Rewire income-form EF auto-contribution to target the Emergency Fund Goal (instead of EMERGENCY_FUND account type)

**Breaking changes:**
- Existing EMERGENCY_FUND and FUND accounts become SAVINGS accounts
- EF auto-contribution now targets goal with `isEmergencyFund: true` + its linked account
- Fund health report reads from Goals instead of accounts

**Constraints:**
- Data migration must be reversible (migration has `down`)
- All existing fund account data must be preserved as Goals
- Net Worth calculation changes: SAVINGS accounts (including former funds) count toward Net Worth
- TITHE account type is untouched (separate concern)

---

## Task 1: Prisma Schema — Extend Goal Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1:** Add new enum `GoalType`:
```prisma
enum GoalType {
  FIXED_AMOUNT
  MONTHS_COVERAGE
}
```

**Step 2:** Add new fields to the `Goal` model:
```prisma
goalType          GoalType @default(FIXED_AMOUNT)
calculationMode   String?  // "MONTHS_COVERAGE" or "TARGET_PROGRESS" (legacy compat)
thresholdLow      Int?     @default(2)   // Months for "Critical"
thresholdMid      Int?     @default(4)   // Months for "Underfunded"
thresholdHigh     Int?     @default(6)   // Months for "Funded"
isEmergencyFund   Boolean  @default(false) // Marks the primary EF goal
```

**Step 3:** Remove EMERGENCY_FUND and FUND from `AccountType` enum:
```prisma
enum AccountType {
  BANK
  CASH
  CREDIT
  INVESTMENT
  LOAN
  SAVINGS
  TITHE
}
```

**Step 4:** Remove fund-specific fields from `Account` model:
- Remove: `targetAmount`, `fundCalculationMode`, `fundThresholdLow`, `fundThresholdMid`, `fundThresholdHigh`

**DO NOT run migrate yet.** The migration needs a custom SQL script (Task 2).

**Verify:** Schema file saves without syntax errors.

---

## Task 2: Data Migration Script

**Files:**
- Create: `prisma/migrations/[timestamp]_consolidate_funds_into_goals/migration.sql`

**Step 1:** Create migration with `npx prisma migrate dev --create-only --name consolidate_funds_into_goals`.

**Step 2:** Edit the generated migration.sql to include data migration BEFORE the destructive changes. The migration must:

1. **For each EMERGENCY_FUND account:** Create a Goal record:
   - `name` = account name
   - `targetAmount` = account `targetAmount` (or 0 if null)
   - `currentAmount` = account balance
   - `goalType` = 'MONTHS_COVERAGE'
   - `isEmergencyFund` = true
   - `thresholdLow/Mid/High` = from account fields
   - `linkedAccountId` = the account's ID
   - `baselineAmount` = 0 (since currentAmount = full balance)
   - `userId` = account userId
   - `status` = 'ACTIVE'

2. **For each FUND account:** Create a Goal record:
   - `name` = account name
   - `targetAmount` = account `targetAmount` (or account balance if null)
   - `currentAmount` = account balance
   - `goalType` = 'FIXED_AMOUNT'
   - `isEmergencyFund` = false
   - `linkedAccountId` = the account's ID
   - `baselineAmount` = 0
   - `userId` = account userId
   - `status` = 'ACTIVE'

3. **Convert account types:** `UPDATE accounts SET type = 'SAVINGS' WHERE type IN ('EMERGENCY_FUND', 'FUND')`

4. **Remove the enum values** and drop the fund columns from accounts table.

**Step 3:** Run `docker compose exec app npx prisma migrate dev` to apply.

**Step 4:** Run `docker compose exec app npx prisma generate` to regenerate client.

**Verify:** `docker compose exec app npx prisma db execute --stdin <<< "SELECT id, name, \"goalType\", \"isEmergencyFund\", \"targetAmount\", \"currentAmount\" FROM goals"` shows migrated goals.

---

## Task 3: Update Goal Types and Service

**Files:**
- Modify: `server/modules/goal/goal.types.ts`
- Modify: `server/modules/goal/goal.service.ts`

**Step 1:** Update `createGoalSchema` to include new fields:
```typescript
goalType: z.enum(['FIXED_AMOUNT', 'MONTHS_COVERAGE']).default('FIXED_AMOUNT'),
isEmergencyFund: z.boolean().default(false),
thresholdLow: z.number().int().min(1).optional(),
thresholdMid: z.number().int().min(1).optional(),
thresholdHigh: z.number().int().min(1).optional(),
```

**Step 2:** Update `GoalService.create()` to pass the new fields through.

**Step 3:** Add `GoalService.getGoalHealthMetrics(userId)` method that replaces `DashboardService.getFundHealthMetrics()`:
- Fetch all ACTIVE goals with linked accounts
- For MONTHS_COVERAGE goals: calculate `monthsCoverage = linkedAccount.balance / monthlyExpenseBaseline`
- For FIXED_AMOUNT goals with linked account: calculate `progress = currentAmount / targetAmount`
- Return health status (critical/underfunded/building/funded) using threshold fields
- Return summary with `hasEmergencyFund`, `emergencyFundMonths`, `emergencyFundHealth`

This method should use the same hybrid expense baseline logic currently in `DashboardService.getFundHealthMetrics()` (3-month actual expenses, fallback to budget).

**Step 4:** Update `GoalService.getAll()` to include the new fields in the query result.

**Verify:** Type check passes: `npx tsc --noEmit`.

---

## Task 4: Update Goal Controller

**Files:**
- Modify: `server/modules/goal/goal.controller.ts`

**Step 1:** Update `createGoalAction` to parse and pass new fields (`goalType`, `isEmergencyFund`, `thresholdLow`, `thresholdMid`, `thresholdHigh`).

**Step 2:** Update `updateGoalAction` similarly.

**Step 3:** If `isEmergencyFund` is set to true, verify no other active goal has `isEmergencyFund: true` for the user. If one exists, throw an error: "You already have an Emergency Fund goal. Only one is allowed."

**Step 4:** Same constraint for `updateGoalAction` — if toggling `isEmergencyFund` to true, check no other goal already holds that flag.

**Verify:** Type check passes.

---

## Task 5: Update Dashboard Service — Remove Fund Logic

**Files:**
- Modify: `server/modules/dashboard/dashboard.service.ts`

**Step 1:** Update `getNetWorth()`:
- Remove the `type: { notIn: ['EMERGENCY_FUND', 'FUND', 'TITHE'] }` filter
- Change to: `type: { notIn: ['TITHE'] }` (TITHE remains excluded)
- SAVINGS accounts (former funds) now count toward Net Worth

**Step 2:** Delete `getFundHealthMetrics()` method entirely.

**Step 3:** Update `getFinancialHealthScore()`:
- Replace `this.getFundHealthMetrics(userId)` call with `GoalService.getGoalHealthMetrics(userId)` (from Task 3)
- Import `GoalService` at the top
- Update the Liquidity pillar to use goal-based metrics instead of fund-based metrics:
  - Replace `fundHealth.emergencyFundHealth` with the equivalent from goal metrics
  - Replace `fundHealth.emergencyFundMonths` with goal-based months
  - Replace `fundHealth.hasEmergencyFund` with goal-based check
  - Keep the same scoring thresholds and narrative text

**Verify:** Type check passes.

---

## Task 6: Update Account Types and Service — Remove Fund Fields

**Files:**
- Modify: `server/modules/account/account.types.ts`
- Modify: `server/modules/account/account.service.ts`
- Modify: `server/modules/account/account.controller.ts`

**Step 1:** In `account.types.ts`:
- Remove fund-specific fields from `createAccountSchema`: `targetAmount`, `fundCalculationMode`, `fundThresholdLow`, `fundThresholdMid`, `fundThresholdHigh`
- Remove the `FundCalculationMode` constant and type

**Step 2:** In `account.service.ts`:
- Remove the special handling for EMERGENCY_FUND and FUND types in `createAccount()` (the block that skips opening balance for fund accounts)
- All SAVINGS accounts now create opening balance entries like any other asset

**Step 3:** In `account.controller.ts`:
- Remove the `EMERGENCY_FUND`/`FUND` type checks
- Remove the fund field processing blocks (lines that build `targetAmount`, `fundCalculationMode`, threshold data)
- Simplify create/update actions

**Verify:** Type check passes.

---

## Task 7: Update Account Form UI — Remove Fund Fields

**Files:**
- Modify: `components/modules/account/AccountForm.tsx`
- Modify: `components/modules/account/EditAccountDialog.tsx`
- Modify: `components/modules/account/AccountList.tsx`

**Step 1:** In `AccountForm.tsx`:
- Remove `EMERGENCY_FUND` and `FUND` from the account type dropdown options
- Remove all fund-specific form fields (calculation mode selector, threshold inputs, target amount input)
- Remove the `isFundType`/`isEmergencyFund` conditional logic
- Remove the information banners about fund behavior

**Step 2:** In `EditAccountDialog.tsx`:
- Remove fund-specific fields from the edit form
- Remove fund field initialization and watch logic

**Step 3:** In `AccountList.tsx`:
- Remove fund-specific indicators (target amount display, calculation mode badge)
- Fund accounts that were migrated to SAVINGS will render as normal savings accounts

**Verify:** Account form renders without fund options. Existing SAVINGS accounts display correctly.

---

## Task 8: Update Account Utils

**Files:**
- Modify: `lib/account-utils.ts`

**Step 1:** Remove EMERGENCY_FUND and FUND from `ACCOUNT_CLASS_MAP`.

**Step 2:** Remove the `fund` class entirely from `AccountClass`, `ACCOUNT_CLASS_META`, `ACCOUNT_CLASS_ORDER`, and `groupAccountsByClass`.

**Step 3:** Move TITHE to the `savings` class (or keep it in its own category — decision: move to `savings` since it's just another money container):
```typescript
export type AccountClass = 'liquid' | 'savings' | 'liability';

export const ACCOUNT_CLASS_MAP: Record<AccountType, AccountClass> = {
    BANK: 'liquid',
    CASH: 'liquid',
    SAVINGS: 'savings',
    INVESTMENT: 'savings',
    TITHE: 'savings',
    CREDIT: 'liability',
    LOAN: 'liability',
};
```

**Verify:** No type errors from downstream consumers.

---

## Task 9: Update Goal Form UI — Add Goal Type

**Files:**
- Modify: `components/modules/goal/GoalForm.tsx`

**Step 1:** Add goal type selector (before target amount field):
- Two options: "Fixed Amount" (default) and "Months of Coverage"
- Use a segmented toggle or radio group
- When "Months of Coverage" is selected:
  - Hide the target amount field (not needed — months coverage is calculated from expenses)
  - Show threshold inputs (Critical/Underfunded/Funded months) with defaults 2/4/6
  - Show "Mark as Emergency Fund" checkbox (auto-checked by default for months-coverage, since that's the primary use case)
  - If user already has an EF goal, the checkbox is **disabled** with tooltip: "You already have an Emergency Fund goal"
  - Show info banner: "This goal tracks how many months of expenses your linked account can cover."
- When "Fixed Amount" is selected:
  - Show target amount field (existing behavior)
  - Show optional deadline field (existing behavior)
  - Hide the Emergency Fund checkbox (EF only applies to months-coverage goals)

**Step 2:** Make linked account **required** for MONTHS_COVERAGE goals (since months-coverage needs an account balance to calculate against).

**Step 3:** For MONTHS_COVERAGE goals, set a default `targetAmount` of 0 (it's not used for calculation but the schema requires it — or make it optional in the schema).

**Verify:** Goal form renders both modes correctly.

---

## Task 10: Update Goal Card and Detail UI — Show Health Status

**Files:**
- Modify: `components/modules/goal/GoalCard.tsx`
- Modify: `components/modules/goal/GoalDetailDialog.tsx`
- Modify: `components/modules/goal/GoalsDashboardWidget.tsx`

**Step 1:** In `GoalCard.tsx`:
- Add `goalType`, `isEmergencyFund`, and health status to the `GoalCardData` interface
- For MONTHS_COVERAGE goals: show months coverage (e.g., "4.2 months") instead of "₱X / ₱Y"
- Show health status badge (Critical/Underfunded/Building/Funded) with color coding
- Show shield icon for emergency fund goals

**Step 2:** In `GoalDetailDialog.tsx`:
- For MONTHS_COVERAGE goals: show months coverage, health status, and threshold explanation
- Replace milestone dots (25/50/75/100%) with month-based milestones for coverage goals

**Step 3:** In `GoalsDashboardWidget.tsx`:
- Emergency fund goals should appear first in the widget
- Show health status badge in compact mode

**Verify:** Goal cards render both fixed-amount and months-coverage variants.

---

## Task 11: Update Dashboard Page — Replace Fund Cards with Goal Cards

**Files:**
- Modify: `app/(authenticated)/dashboard/page.tsx`

**Step 1:** Remove:
- `FundCard` import and rendering
- `getFundHealthMetrics()` call
- Emergency fund metrics display (the "Emergency Fund: X.X months" section)

**Step 2:** The `GoalsDashboardWidget` already exists on the dashboard. Update it to:
- Show emergency fund goal with health status prominently
- Use `GoalService.getGoalHealthMetrics()` to get health data
- Pass health metrics to the widget for display

**Step 3:** The health score section already calls `getFinancialHealthScore()` which now reads from Goals (Task 5). No changes needed there.

**Verify:** Dashboard renders without FundCard, shows goals with health status instead.

---

## Task 12: Rewire Income EF Auto-Contribution to Goals

**Files:**
- Modify: `server/modules/income/income.service.ts`
- Modify: `server/modules/income/income.controller.ts`
- Modify: `components/modules/income/IncomeForm.tsx`
- Modify: `app/(authenticated)/income/page.tsx`

**Rationale:** The EF auto-contribution toggle on the income form is a valuable UX feature. Instead of removing it, we rewire it to look for `goal.isEmergencyFund === true` and its linked account instead of `account.type === EMERGENCY_FUND`.

**Step 1:** In `income.service.ts`:
- Replace the "Handle Emergency Fund" block (lines 123-166):
  - OLD: looks up `account WHERE type = EMERGENCY_FUND AND userId = ...`
  - NEW: looks up `goal WHERE isEmergencyFund = true AND status = ACTIVE AND userId = ...` then uses `goal.linkedAccountId` as the target account
  - If no EF goal exists or it has no linked account, skip (same as before when no EF account existed)
  - The transfer logic stays the same: create an expense for the EF percentage, credit the linked account
- Keep `analyzeIncomeStability()` — it's still useful for reports

**Step 2:** In `income.controller.ts`:
- Keep `emergencyFundEnabled` and `emergencyFundPercentage` extraction (no change)

**Step 3:** In `IncomeForm.tsx`:
- Replace the EF account lookup:
  - OLD: checks if user has an `EMERGENCY_FUND` account to show the toggle
  - NEW: checks if user has an active Goal with `isEmergencyFund: true` that has a linked account
- The toggle, percentage input, and smart suggestion UI all stay the same
- Update the info text from "Emergency Fund Account" to "Emergency Fund Goal"

**Step 4:** In `income/page.tsx`:
- Replace `AccountType.EMERGENCY_FUND` filter with a query for the user's EF goal
- Pass the EF goal (and its linked account) to the IncomeForm instead of the EF account

**Verify:** Income form shows EF toggle when an EF goal exists. Auto-contribution creates transfer to the goal's linked account.

---

## Task 13: Update Reports — Goal Health Instead of Fund Health

**Files:**
- Modify: `server/modules/report/report.service.ts`
- Modify: `server/modules/report/report.types.ts`
- Modify: `components/modules/reports/FundHealthReport.tsx`
- Modify: `components/modules/reports/report.templates.tsx`

**Step 1:** In `report.service.ts`:
- Replace `getFundHealthMetrics()` call with `GoalService.getGoalHealthMetrics()`
- Update the funds section in report data to use goal-based metrics

**Step 2:** In `report.types.ts`:
- Update any fund-specific types to use goal-based equivalents

**Step 3:** Rename `FundHealthReport.tsx` to `GoalHealthReport.tsx`:
- Update imports and component name
- Update UI labels: "Fund Health" → "Goal Progress"
- Read from goal health metrics instead of fund health metrics
- Show both FIXED_AMOUNT and MONTHS_COVERAGE goals

**Step 4:** In `report.templates.tsx`:
- Update PDF report template to reference goals instead of funds

**Verify:** Report page renders with goal health data.

---

## Task 14: Delete Fund Module

**Files:**
- Delete: `server/modules/fund/fund.types.ts`
- Delete: `components/modules/fund/FundCard.tsx`

**Step 1:** Delete `server/modules/fund/fund.types.ts` — all types are now in goal module.

**Step 2:** Delete `components/modules/fund/FundCard.tsx` — replaced by enhanced GoalCard.

**Step 3:** Search for any remaining imports of deleted files and remove them.

**Verify:** `npx tsc --noEmit` — zero errors. No dangling imports.

---

## Task 15: Update Income Page — Remove EF Account Filter

**Files:**
- Modify: `app/(authenticated)/income/page.tsx`

**Step 1:** Remove the `AccountType.EMERGENCY_FUND` filter. The income page was filtering accounts to show an EF account indicator — this is no longer needed since EMERGENCY_FUND type no longer exists.

**Step 2:** Remove `AccountType` import if no longer used.

**Verify:** Income page renders without errors.

---

## Task 16: Update Seed Data

**Files:**
- Modify: `prisma/seed.ts`

**Step 1:** Remove any EMERGENCY_FUND or FUND account type references from seed data.

**Step 2:** Add a sample MONTHS_COVERAGE goal with `isEmergencyFund: true` linked to a SAVINGS account.

**Step 3:** Add a sample FIXED_AMOUNT goal (e.g., "New Laptop") linked to another SAVINGS account.

**Verify:** `docker compose exec app npx prisma db seed` runs without errors.

---

## Task 17: Update Admin Service

**Files:**
- Modify: `server/modules/admin/admin-users.service.ts`

**Step 1:** Remove references to account `targetAmount` in admin reports (it no longer exists on accounts).

**Step 2:** If admin reports show fund health, update to use goal health metrics.

**Verify:** Type check passes.

---

## Task 18: Final Verification and Commit

**Files:**
- All modified files

**Step 1:** Run full type check: `npx tsc --noEmit` — 0 errors.

**Step 2:** Search for any remaining references to EMERGENCY_FUND or FUND (as account type):
```bash
grep -rn "EMERGENCY_FUND\|AccountType\.FUND\|'FUND'" --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v changelog | grep -v docs/plans
```

**Step 3:** Reset and reseed the database:
```bash
docker compose exec app npx prisma migrate reset --force
```

**Step 4:** Smoke test:
- Create a SAVINGS account
- Create a MONTHS_COVERAGE goal linked to that account
- Create a FIXED_AMOUNT goal with manual contributions
- Verify dashboard health score includes goal metrics
- Verify income form has no EF fields

**Step 5:** Commit:
```bash
git add -A
git commit -m "refactor: consolidate fund account types into goal system

Removes EMERGENCY_FUND and FUND account types. Fund capabilities (months-coverage,
health thresholds, health score integration) are absorbed into the Goal model.
Existing fund accounts are migrated to SAVINGS + auto-created linked Goals.
Simplifies mental model: Accounts = where money lives, Goals = what it's for."
```

---

## Summary

| Task | What | Files Changed |
|------|------|--------------|
| 1 | Prisma schema — extend Goal, remove fund types | schema.prisma |
| 2 | Data migration script | migration.sql |
| 3 | Goal types and service — add health metrics | goal.types.ts, goal.service.ts |
| 4 | Goal controller — new fields | goal.controller.ts |
| 5 | Dashboard service — remove fund logic | dashboard.service.ts |
| 6 | Account types/service — remove fund fields | account.types.ts, account.service.ts, account.controller.ts |
| 7 | Account form UI — remove fund options | AccountForm.tsx, EditAccountDialog.tsx, AccountList.tsx |
| 8 | Account utils — remove fund class | account-utils.ts |
| 9 | Goal form UI — add goal type | GoalForm.tsx |
| 10 | Goal card/detail UI — health status | GoalCard.tsx, GoalDetailDialog.tsx, GoalsDashboardWidget.tsx |
| 11 | Dashboard page — replace fund cards | dashboard/page.tsx |
| 12 | Income service — rewire EF auto-contribution to Goals | income.service.ts, income.controller.ts, IncomeForm.tsx, income/page.tsx |
| 13 | Reports — goal health replaces fund health | report.service.ts, FundHealthReport.tsx, report.templates.tsx |
| 14 | Delete fund module | fund.types.ts, FundCard.tsx |
| 15 | Income page — remove EF filter | income/page.tsx |
| 16 | Seed data | seed.ts |
| 17 | Admin service | admin-users.service.ts |
| 18 | Final verification and commit | All |

**Deleted files:** 2 (fund.types.ts, FundCard.tsx)
**New files:** 1 (migration.sql)
**Modified files:** ~20
**New dependencies:** 0
