# Recurring Transactions Fixes

**Goal:** Close six gaps in the recurring transactions feature: missing edit UI, missing budget linking for recurring expenses, cron bypassing service layer (skipping tithe/EF auto-transfers and budget linking), optional account field that should be required, double cron logging, and stale category on type change.

**Architecture:**
- Data flow: `UI Component -> Server Action (controller) -> Service -> Prisma -> PostgreSQL`
- Cron flow: `API Route (auth + logging) -> Service.processDue() -> IncomeService / ExpenseService`
- Edit pattern: `Dialog` component with `react-hook-form` + `zodResolver` + server action via `FormData`

**Key files:**
- `server/modules/recurring/recurring.service.ts` -- service + `processDue()` cron logic
- `server/modules/recurring/recurring.controller.ts` -- server actions
- `server/modules/recurring/recurring.types.ts` -- Zod schemas
- `components/modules/recurring/RecurringForm.tsx` -- create form
- `components/modules/recurring/RecurringList.tsx` -- list/table component
- `app/(authenticated)/recurring/page.tsx` -- page (server component, data fetching)
- `app/api/cron/process-recurring/route.ts` -- cron route
- `prisma/schema.prisma` -- RecurringTransaction model
- `server/modules/income/income.service.ts` -- `IncomeService.createIncome()`
- `server/modules/expense/expense.service.ts` -- `ExpenseService.createExpense()`

**Constraints:**
- `IncomeService.createIncome()` expects `CreateIncomeInput` which includes `titheEnabled`, `tithePercentage`, `emergencyFundEnabled`, `emergencyFundPercentage` -- these are user-provided at form time, not stored on the User model. For recurring income, we need a strategy (see Task 3).
- `ExpenseService.createExpense()` expects `CreateExpenseInput` which includes `budgetId`, `accountId` (required in that schema), `date`, `amount`, `categoryId`.
- Budgets are scoped to `category + month` (first day of month). When the cron runs, it should find the matching budget for the current month if `budgetId` is stored on the RecurringTransaction.
- The existing `BudgetSelector` component is complex (shows spending progress, month grouping). For the recurring form, a simpler budget select is appropriate since we store the budget template reference, not a specific month's budget.

---

## Task 1: Prisma Schema -- Add `budgetId` to RecurringTransaction

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1:** Add `budgetId` field and relation to the `RecurringTransaction` model:

```prisma
model RecurringTransaction {
  id            String             @id @default(cuid())
  name          String
  type          RecurringType
  amount        Decimal            @db.Decimal(10, 2)
  description   String?
  frequency     RecurringFrequency
  startDate     DateTime
  endDate       DateTime?
  nextRunDate   DateTime
  lastRunDate   DateTime?
  isActive      Boolean            @default(true)
  categoryId    String
  accountId     String
  budgetId      String?
  userId        String
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  account  Account  @relation(fields: [accountId], references: [id], onDelete: Restrict)
  budget   Budget?  @relation(fields: [budgetId], references: [id], onDelete: SetNull)
  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isActive])
  @@index([nextRunDate, isActive])
  @@map("recurring_transactions")
}
```

Key changes from current model:
1. Add `budgetId String?` field
2. Add `budget Budget? @relation(...)` relation
3. Change `accountId` from `String?` to `String` (required -- see Task 4)
4. Change `account` relation from `Account?` to `Account` and `onDelete` from `SetNull` to `Restrict` (can't delete an account that has recurring transactions -- force user to delete/reassign recurring first)

**Step 2:** Add the reverse relation on the `Budget` model:

```prisma
model Budget {
  // ... existing fields ...
  expenses              Expense[]
  recurringTransactions RecurringTransaction[]  // <-- add this
  // ...
}
```

**Step 3:** Run migration:

```bash
docker compose exec app npx prisma migrate dev --name add-budget-to-recurring-and-require-account
```

**Note on the accountId migration:** Existing `RecurringTransaction` rows with `accountId = NULL` need to be handled. The migration SQL should:
1. Check if any rows have `NULL` accountId
2. If so, either: (a) set them to the user's first account, or (b) set `isActive = false` on those rows and leave accountId nullable until they are manually fixed

Safer approach: use a two-step migration:
- Step 1: Backfill NULL accountId rows (set `isActive = false` as a flag for user attention)
- Step 2: Make the column NOT NULL

If there are no NULL accountId rows in production, a single migration suffices. Check with:
```sql
SELECT COUNT(*) FROM recurring_transactions WHERE account_id IS NULL;
```

**Verify:** `npx prisma generate` succeeds. `npx prisma studio` shows the new field.

---

## Task 2: Zod Schema -- Require `accountId`, keep `budgetId` optional

**Files:**
- Modify: `server/modules/recurring/recurring.types.ts`

**Current state:**
```typescript
accountId: z.string().optional(),
budgetId: z.string().optional(),
```

**Change to:**
```typescript
accountId: z.string().min(1, 'Account is required'),
budgetId: z.string().optional(),
```

The `budgetId` field is already in the schema (it was added previously but unused). No change needed there.

The `updateRecurringSchema` extends `createRecurringSchema.partial()`, so `accountId` will become optional in updates (which is correct -- you only send what changed).

**Verify:** TypeScript compiles. `CreateRecurringInput` type now has `accountId: string` (non-optional).

---

## Task 3: Cron -- Delegate to IncomeService / ExpenseService

**Files:**
- Modify: `server/modules/recurring/recurring.service.ts`

This is the most important fix. Currently `processDue()` does raw `prisma.income.create()` / `prisma.expense.create()` + manual balance updates, bypassing:
- Tithe auto-transfer (for income)
- Emergency Fund auto-contribution (for income)
- Budget linking (for expenses)
- The `$transaction` wrapper in the service methods (they manage their own transactions)

**Current cron logic (lines 98-170):**
```typescript
await prisma.$transaction(async (tx) => {
  if (recurring.type === 'INCOME') {
    await tx.income.create({ ... });
    // manual balance update
  } else {
    await tx.expense.create({ ... });
    // manual balance update
  }
  // advance nextRunDate
});
```

**New logic:**

Replace the `$transaction` block with calls to the service methods, then advance the `nextRunDate` separately.

```typescript
import { IncomeService } from '../income/income.service';
import { ExpenseService } from '../expense/expense.service';
import { startOfMonth } from 'date-fns';

// Inside processDue(), for each recurring transaction:
try {
  if (recurring.type === 'INCOME') {
    await IncomeService.createIncome(recurring.userId, {
      amount: recurring.amount.toNumber(),
      description: `[Auto] ${recurring.name}`,
      date: today,
      categoryId: recurring.categoryId,
      accountId: recurring.accountId!,
      source: 'RECURRING',
      // Tithe/EF: pass false for now -- recurring income should NOT
      // auto-tithe/auto-EF since the user already budgets the net amount.
      // If the user sets up a $5000 recurring salary, they expect $5000
      // credited. Tithe/EF are separate manual or recurring transactions.
      titheEnabled: false,
      tithePercentage: 0,
      emergencyFundEnabled: false,
      emergencyFundPercentage: 0,
    });
  } else {
    // For expenses, resolve the budget for the current month
    let budgetId: string | undefined;
    if (recurring.budgetId) {
      // The recurring stores a "template" budgetId. But budgets are monthly.
      // We need to find this month's budget for the same category.
      const currentMonthBudget = await prisma.budget.findFirst({
        where: {
          userId: recurring.userId,
          categoryId: recurring.categoryId,
          month: startOfMonth(today),
        },
      });
      budgetId = currentMonthBudget?.id;
    }

    await ExpenseService.createExpense(recurring.userId, {
      amount: recurring.amount.toNumber(),
      description: `[Auto] ${recurring.name}`,
      date: today,
      categoryId: recurring.categoryId,
      accountId: recurring.accountId!,
      budgetId,
      source: 'RECURRING',
    });
  }

  // Advance nextRunDate (separate transaction since service methods
  // manage their own $transaction internally)
  const nextDate = calculateNextRunDate(
    recurring.nextRunDate,
    recurring.frequency
  );
  const shouldDeactivate = recurring.endDate && nextDate > recurring.endDate;

  await prisma.recurringTransaction.update({
    where: { id: recurring.id },
    data: {
      nextRunDate: nextDate,
      lastRunDate: today,
      isActive: !shouldDeactivate,
    },
  });

  processed++;
} catch (error) {
  failed++;
  errors.push(`Failed to process "${recurring.name}" (${recurring.id}): ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

**Important design decisions:**

1. **Tithe/EF on recurring income:** Set to `false` by default. Rationale: when a user creates a recurring $5000 salary, they intend $5000 to hit their account. Tithe and EF contributions should be set up as separate recurring transfers or handled at manual income entry time. If we auto-tithe on recurring income, the user gets surprised deductions they didn't configure on this form. A future enhancement could add tithe/EF toggle fields to the RecurringTransaction model, but that is out of scope for this fix.

2. **Budget resolution for expenses:** The `budgetId` on RecurringTransaction is a reference to which budget "line" the expense belongs to. But budgets are month-scoped. When the cron runs, we look up the budget for the current month + same category. If no budget exists for that month (user didn't replicate), `budgetId` is `undefined` and the expense is created without a budget link. This is the safe default.

3. **`source: 'RECURRING'`:** Both `CreateIncomeInput` and `CreateExpenseInput` schemas need to accept a `source` field. Currently they do NOT include `source` in their Zod schemas. The service methods also don't set `source` in the `tx.income.create()` / `tx.expense.create()` calls.

**Sub-task 3a: Add `source` field to income and expense types/services.**

**Files:**
- Modify: `server/modules/income/income.types.ts`
- Modify: `server/modules/expense/expense.types.ts`
- Modify: `server/modules/income/income.service.ts`
- Modify: `server/modules/expense/expense.service.ts`

Add to both `createIncomeSchema` and `createExpenseSchema`:
```typescript
source: z.enum(['MANUAL', 'IMPORT', 'RECURRING']).optional().default('MANUAL'),
```

Then in the service `create` methods, pass `source` through to the Prisma create:
```typescript
// income.service.ts - createIncome
const income = await tx.income.create({
  data: {
    amount: data.amount,
    description: data.description,
    date: data.date,
    categoryId,
    accountId: data.accountId,
    isRecurring: data.isRecurring,
    recurringPeriod: data.recurringPeriod,
    source: data.source ?? 'MANUAL',  // <-- add this
    userId,
  },
});

// expense.service.ts - createExpense
const expense = await tx.expense.create({
  data: {
    amount: data.amount,
    description: data.description,
    date: data.date,
    notes: data.notes,
    categoryId,
    accountId: data.accountId,
    budgetId: data.budgetId,
    isRecurring: data.isRecurring,
    recurringPeriod: data.recurringPeriod,
    source: data.source ?? 'MANUAL',  // <-- add this
    userId,
  },
});
```

**Verify:** The cron creates income/expense records with `source: 'RECURRING'` and proper balance updates. Manual creation still defaults to `'MANUAL'`.

---

## Task 4: Make Account Required in RecurringForm UI

**Files:**
- Modify: `components/modules/recurring/RecurringForm.tsx`

**Step 1:** Change the account field label from "Account (optional)" to "Account":

```tsx
// Before
<Label>Account (optional)</Label>
<Select name='accountId'>

// After
<Label>Account</Label>
<Select name='accountId' required>
```

**Step 2:** Change the placeholder text:

```tsx
// Before
<SelectValue placeholder='No account linked' />

// After
<SelectValue placeholder='Select account' />
```

**Verify:** Form validation prevents submission without an account selected. The Zod schema (Task 2) provides server-side validation as well.

---

## Task 5: Add Budget Selector to RecurringForm (for EXPENSE type)

**Files:**
- Modify: `components/modules/recurring/RecurringForm.tsx`
- Modify: `app/(authenticated)/recurring/page.tsx`

**Step 1:** Update the page to fetch budgets and pass them to the form:

```typescript
// In page.tsx, add to Promise.all:
import { BudgetService } from '@/server/modules/budget/budget.service';

const [recurring, accounts, incomeCategories, expenseCategories, budgets] =
  await Promise.all([
    RecurringService.getAll(session.user.id),
    AccountService.getAccounts(session.user.id),
    CategoryService.getCategories(session.user.id, 'INCOME'),
    CategoryService.getCategories(session.user.id, 'EXPENSE'),
    BudgetService.getBudgets(session.user.id),
  ]);
```

Pass budgets to the form:
```tsx
<RecurringForm
  categories={allCategories}
  accounts={...}
  budgets={serialize(budgets).map((b: any) => ({
    id: b.id,
    name: b.name,
    categoryId: b.categoryId,
  }))}
/>
```

**Step 2:** Update `RecurringFormProps` and add a budget select (only shown when type is EXPENSE):

```tsx
interface RecurringFormProps {
  categories: Array<{ id: string; name: string; type: string }>;
  accounts: Array<{ id: string; name: string }>;
  budgets: Array<{ id: string; name: string; categoryId: string }>;
}
```

Add a budget select after the category select, conditionally rendered:
```tsx
{type === 'EXPENSE' && (
  <div className='space-y-2'>
    <Label>Budget (optional)</Label>
    <Select name='budgetId'>
      <SelectTrigger>
        <SelectValue placeholder='No budget linked' />
      </SelectTrigger>
      <SelectContent>
        {budgets
          .filter((b) => {
            // Only show budgets whose category matches the selected category
            const selectedCategoryId = /* get from form state */;
            return !selectedCategoryId || b.categoryId === selectedCategoryId;
          })
          .map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>
)}
```

**Note:** The budget selector shows budgets filtered by the currently selected category. This requires tracking `categoryId` in component state. Currently the form uses an uncontrolled `<Select name='categoryId'>`. We need to add a `categoryId` state variable (similar to how `type` is tracked):

```tsx
const [categoryId, setCategoryId] = useState<string>('');

// Then in the category Select:
<Select
  name='categoryId'
  required
  value={categoryId}
  onValueChange={setCategoryId}
>
```

**Verify:** When type is EXPENSE, a budget dropdown appears showing budgets for the selected category. When type is INCOME, no budget dropdown is shown.

---

## Task 6: Edit Recurring Dialog

**Files:**
- Create: `components/modules/recurring/EditRecurringDialog.tsx`
- Modify: `components/modules/recurring/RecurringList.tsx`
- Modify: `app/(authenticated)/recurring/page.tsx`

**Step 1:** Create `EditRecurringDialog.tsx` following the pattern from `EditBudgetDialog.tsx` and `EditAccountDialog.tsx`:

- Uses `Dialog` from shadcn
- `react-hook-form` with `zodResolver(updateRecurringSchema)`
- Pre-fills all fields from the recurring item
- Calls `updateRecurringAction` via `FormData`
- Trigger button: pencil icon (`Pencil` from lucide) in the actions column

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  updateRecurringSchema,
  UpdateRecurringInput,
} from '@/server/modules/recurring/recurring.types';
import { updateRecurringAction } from '@/server/modules/recurring/recurring.controller';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface RecurringItem {
  id: string;
  name: string;
  type: string;
  amount: number | { toNumber(): number };
  frequency: string;
  description?: string | null;
  startDate: string | Date;
  endDate?: string | Date | null;
  categoryId: string;
  accountId: string | null;
  budgetId?: string | null;
  category: { id: string; name: string };
  account: { id: string; name: string } | null;
}

interface EditRecurringDialogProps {
  item: RecurringItem;
  categories: Array<{ id: string; name: string; type: string }>;
  accounts: Array<{ id: string; name: string }>;
  budgets: Array<{ id: string; name: string; categoryId: string }>;
}

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

export function EditRecurringDialog({
  item, categories, accounts, budgets,
}: EditRecurringDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<UpdateRecurringInput>({
    resolver: zodResolver(updateRecurringSchema),
    defaultValues: {
      id: item.id,
      name: item.name,
      type: item.type as 'INCOME' | 'EXPENSE',
      amount: Number(item.amount),
      description: item.description ?? undefined,
      frequency: item.frequency as any,
      startDate: new Date(item.startDate),
      endDate: item.endDate ? new Date(item.endDate) : undefined,
      categoryId: item.categoryId,
      accountId: item.accountId ?? undefined,
      budgetId: item.budgetId ?? undefined,
    },
  });

  const selectedType = form.watch('type');
  const selectedCategoryId = form.watch('categoryId');

  const filteredCategories = categories.filter(
    (c) => c.type === selectedType
  );
  const filteredBudgets = budgets.filter(
    (b) => b.categoryId === selectedCategoryId
  );

  async function onSubmit(data: UpdateRecurringInput) {
    setIsPending(true);
    const formData = new FormData();

    formData.append('id', data.id);
    if (data.name) formData.append('name', data.name);
    if (data.type) formData.append('type', data.type);
    if (data.amount) formData.append('amount', data.amount.toString());
    if (data.description) formData.append('description', data.description);
    if (data.frequency) formData.append('frequency', data.frequency);
    if (data.startDate) formData.append('startDate', data.startDate.toISOString());
    if (data.endDate) formData.append('endDate', data.endDate.toISOString());
    if (data.categoryId) formData.append('categoryId', data.categoryId);
    if (data.accountId) formData.append('accountId', data.accountId);
    if (data.budgetId) formData.append('budgetId', data.budgetId);

    const result = await updateRecurringAction(formData);
    setIsPending(false);

    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success('Recurring transaction updated');
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' title='Edit'>
          <Pencil className='h-4 w-4' />
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Edit Recurring Transaction</DialogTitle>
          <DialogDescription>
            Update the details for &quot;{item.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            {/* Name field */}
            {/* Type select (INCOME/EXPENSE) -- watch for type changes to reset category */}
            {/* Amount (CurrencyInput) */}
            {/* Category select (filtered by type) */}
            {/* Budget select (only for EXPENSE, filtered by category) */}
            {/* Account select (required) */}
            {/* Frequency select */}
            {/* Start date / End date */}
            {/* Description */}
            <DialogFooter>
              <Button type='submit' disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2:** Update `RecurringList.tsx` to accept categories, accounts, budgets props and render `EditRecurringDialog` in the actions column:

```tsx
interface RecurringListProps {
  items: RecurringItem[];
  categories: Array<{ id: string; name: string; type: string }>;
  accounts: Array<{ id: string; name: string }>;
  budgets: Array<{ id: string; name: string; categoryId: string }>;
}

// In the actions cell, add before the Pause/Play button:
<EditRecurringDialog
  item={item}
  categories={categories}
  accounts={accounts}
  budgets={budgets}
/>
```

The `RecurringItem` interface also needs `categoryId`, `accountId`, `budgetId`, `description`, `startDate`, `endDate` fields exposed (they exist on the Prisma query result but aren't in the current interface).

**Step 3:** Update `app/(authenticated)/recurring/page.tsx` to pass the new props:

```tsx
<RecurringList
  items={serialize(recurring)}
  categories={allCategories}
  accounts={serialize(accounts).map((a: any) => ({ id: a.id, name: a.name }))}
  budgets={serialize(budgets).map((b: any) => ({
    id: b.id,
    name: b.name,
    categoryId: b.categoryId,
  }))}
/>
```

**Verify:** Clicking the pencil icon on any recurring transaction opens a dialog pre-filled with all fields. Editing and saving calls `updateRecurringAction` and refreshes the list.

---

## Task 7: Fix Double Cron Logging

**Files:**
- Modify: `server/modules/recurring/recurring.service.ts`

**Current state:** Both the cron route (`app/api/cron/process-recurring/route.ts`, lines 19-26 and 34-41) AND the service (`recurring.service.ts`, lines 182-190) create `CronRunLog` entries.

This means every successful cron run creates **two** log entries: one from the service and one from the route.

**Fix:** Remove the `CronRunLog` creation from the service (lines 182-190). The route is the canonical place for cron logging, consistent with `monthly-report/route.ts` and other cron routes.

Delete from `recurring.service.ts`:
```typescript
// Remove this block (lines 182-190):
await prisma.cronRunLog.create({
  data: {
    key: 'process-recurring',
    status: failed === 0 ? 'success' : 'failed',
    processedCount: processed,
    errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
  },
});
```

Also update the route to pass `failed` count and `errors` back so the route can log error details:

The service already returns `{ processed, failed, errors }` which the route receives. The route currently only logs `processedCount: result.processed` for success. Update to also log error info when there are partial failures:

```typescript
// In route.ts success handler:
await prisma.cronRunLog.create({
  data: {
    key: 'process-recurring',
    status: result.failed > 0 ? 'partial_failure' : 'success',
    processedCount: result.processed,
    errorMessage: result.errors.length > 0 ? result.errors.join('; ') : undefined,
    duration,
  },
});
```

**Verify:** Run the cron endpoint. Only ONE `CronRunLog` entry is created per run. Partial failures are captured in the route's log entry.

---

## Task 8: Reset Category on Type Change

**Files:**
- Modify: `components/modules/recurring/RecurringForm.tsx`

**Current state:** When switching between INCOME and EXPENSE, the `filteredCategories` updates (line 37-39), but the `<Select name='categoryId'>` retains its previous value. If the user had selected an income category, then switches to EXPENSE, the form still holds the income category ID which would fail validation or create a mismatched record.

**Fix:** Track `categoryId` in state and reset it when `type` changes.

```tsx
const [categoryId, setCategoryId] = useState<string>('');

// When type changes, reset category and budget
function handleTypeChange(newType: 'INCOME' | 'EXPENSE') {
  setType(newType);
  setCategoryId('');  // Reset category
}

// Category select becomes controlled:
<Select
  name='categoryId'
  required
  value={categoryId}
  onValueChange={setCategoryId}
>
```

Also apply the same fix in `EditRecurringDialog.tsx`: when `type` changes in the edit form, reset `categoryId` and `budgetId` using `form.setValue()`:

```tsx
// In EditRecurringDialog, watch type and reset on change:
useEffect(() => {
  // Reset category and budget when type changes
  const subscription = form.watch((value, { name }) => {
    if (name === 'type') {
      form.setValue('categoryId', '');
      form.setValue('budgetId', undefined);
    }
  });
  return () => subscription.unsubscribe();
}, [form]);
```

**Verify:** Switch type from INCOME to EXPENSE -- category select clears. Select a new category. Switch back -- clears again.

---

## Task 9: Update RecurringService.create() to Store `budgetId`

**Files:**
- Modify: `server/modules/recurring/recurring.service.ts`

**Current state:** `create()` does not pass `budgetId` to `prisma.recurringTransaction.create()`.

**Fix:**
```typescript
async create(userId: string, data: CreateRecurringInput) {
  return prisma.recurringTransaction.create({
    data: {
      name: data.name,
      type: data.type,
      amount: data.amount,
      description: data.description,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
      nextRunDate: data.startDate,
      categoryId: data.categoryId,
      accountId: data.accountId,
      budgetId: data.budgetId,   // <-- add this
      userId,
    },
    include: { category: true, account: true, budget: true },
  });
},
```

Also update the `include` in `getAll()`, `getById()`, and `update()` to include `budget: true` so the list can display the budget name.

**Verify:** Creating a recurring expense with a budget stores the `budgetId`. It appears in the list/edit dialog.

---

## Task 10: Update `updateRecurringAction` to Handle `budgetId`

**Files:**
- Modify: `server/modules/recurring/recurring.controller.ts`

**Current state:** `updateRecurringAction` does not extract `budgetId` from formData.

**Fix:** Add `budgetId` extraction:
```typescript
const parsed = updateRecurringSchema.safeParse({
  id: formData.get('id'),
  name: formData.get('name') || undefined,
  type: formData.get('type') || undefined,
  amount: formData.get('amount') ? Number(formData.get('amount')) : undefined,
  description: formData.get('description') || undefined,
  frequency: formData.get('frequency') || undefined,
  startDate: formData.get('startDate') || undefined,
  endDate: formData.get('endDate') || undefined,
  categoryId: formData.get('categoryId') || undefined,
  accountId: formData.get('accountId') || undefined,
  budgetId: formData.get('budgetId') || undefined,  // <-- add this
  isActive: formData.get('isActive') != null
    ? formData.get('isActive') === 'true'
    : undefined,
});
```

**Verify:** Editing a recurring transaction's budget updates correctly.

---

## Execution Order

| Order | Task | Description | Dependencies |
|-------|------|-------------|--------------|
| 1 | Task 1 | Prisma schema: add `budgetId`, require `accountId` | None |
| 2 | Task 2 | Zod schema: require `accountId` | Task 1 (for types to align) |
| 3 | Task 3 + 3a | Cron delegates to services, add `source` to types | Task 1 (budgetId exists) |
| 4 | Task 7 | Remove double cron logging | Task 3 (service rewrite) |
| 5 | Task 9 | Service stores `budgetId` on create | Task 1 |
| 6 | Task 10 | Controller handles `budgetId` on update | Task 9 |
| 7 | Task 8 | Reset category on type change in form | None (UI only) |
| 8 | Task 4 | Make account required in form UI | Task 2 (schema requires it) |
| 9 | Task 5 | Add budget selector to RecurringForm | Task 1, Task 9 |
| 10 | Task 6 | Edit Recurring Dialog | Task 5, Task 8, Task 9, Task 10 |

Tasks 1-2 must go first (schema). Tasks 3-4 can follow (backend). Tasks 7-10 are UI and can be parallelized after the backend is solid. Task 6 (Edit Dialog) goes last since it depends on the form patterns established in Tasks 4, 5, and 8.
