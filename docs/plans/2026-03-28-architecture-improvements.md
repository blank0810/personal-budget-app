# Architecture Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address architectural gaps identified by the council's lead-engineer review. Improve error handling, caching, state management, code deduplication, and pagination to prepare the app for multi-user scaling.

**Architecture:** No schema changes. All tasks are internal refactors, new boundary files (`error.tsx`, `not-found.tsx`), and controller/service cleanup. No new features — purely structural improvements.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma ORM, Tailwind CSS 4, shadcn/ui, NextAuth.js 5

---

## Phase 1: High Priority (Before Multi-User)

### Task 1: Add Error Boundaries

**Problem:** No `error.tsx` files exist anywhere. If a server component throws, users see a blank screen or the default Next.js error page.

**Files:**
- Create: `app/error.tsx` — global error boundary
- Create: `app/(authenticated)/error.tsx` — catches errors within the sidebar layout
- Create: `app/global-error.tsx` — catches errors in root layout itself (rare but necessary)

### Steps:

1. Create `app/global-error.tsx` — must be a `'use client'` component. Include its own `<html>` and `<body>` tags since it replaces the root layout. Show a centered error message with a "Try again" button that calls `reset()`.

2. Create `app/error.tsx` — `'use client'` component. Show a centered card with error message and "Try again" button. This catches errors in public/auth routes.

3. Create `app/(authenticated)/error.tsx` — `'use client'` component. Renders within the sidebar layout. Show error message with "Try again" button and a "Go to Dashboard" link as fallback. Use shadcn `Button` and `Card` components.

---

### Task 2: Extract Shared `getAuthenticatedUser()`

**Problem:** Every controller (19 files) defines the same `getAuthenticatedUser()` function independently.

**Files:**
- Create: `server/lib/auth-guard.ts`
- Modify: All controller files in `server/modules/*/` that define `getAuthenticatedUser()`

### Steps:

1. Create `server/lib/auth-guard.ts`:
```typescript
import { auth } from '@/lib/auth';

export async function getAuthenticatedUser(): Promise<string> {
    const session = await auth();
    if (!session?.user?.id) throw new Error('Unauthorized');
    return session.user.id;
}
```

2. Find all controller files that define `getAuthenticatedUser()` and replace the local definition with an import from `@/server/lib/auth-guard`.

3. Verify no controller has a unique variant of the function (some may check for admin role, etc.) — those should remain separate or get their own exported variant like `getAdminUser()`.

---

### Task 3: Add Suspense Boundaries to Dashboard

**Problem:** The dashboard page is 600+ lines. It awaits 7 parallel queries via `Promise.all`. If any query is slow, the entire page blocks. No streaming.

**Files:**
- Modify: `app/(authenticated)/dashboard/page.tsx`
- Create: Async server component wrappers for each dashboard section (can live in same directory or `components/modules/dashboard/`)

### Steps:

1. Identify the independent data-fetching sections in the dashboard page (KPI cards, budget health, recent transactions, goals widget, charts, etc.).

2. Extract each section into its own async server component that fetches its own data. Each component should accept `userId` and `currency` as props.

3. Refactor `page.tsx` to ~50 lines: authenticate, get currency, render each section wrapped in `<Suspense fallback={<Skeleton />}>`.

4. Create skeleton components for each section's loading state. Use shadcn's `Skeleton` primitive.

5. The page should look roughly like:
```tsx
export default async function DashboardPage() {
    const session = await auth();
    const currency = await getCurrency(session.user.id);

    return (
        <div className="container mx-auto py-6 md:py-10 space-y-8">
            <Suspense fallback={<KPICardsSkeleton />}>
                <KPICards userId={session.user.id} currency={currency} />
            </Suspense>
            <Suspense fallback={<BudgetHealthSkeleton />}>
                <BudgetHealthSection userId={session.user.id} currency={currency} />
            </Suspense>
            {/* etc. */}
        </div>
    );
}
```

---

### Task 4: Server-Side Pagination for Income & Expense Pages

**Problem:** Income and expense pages fetch ALL records without pagination. Work-entries already has the correct paginated pattern to follow.

**Files:**
- Modify: `server/modules/income/income.service.ts` — add paginated query method
- Modify: `server/modules/income/income.controller.ts` — add paginated action
- Modify: `app/(authenticated)/income/page.tsx` — use paginated data
- Modify: `server/modules/expense/expense.service.ts` — add paginated query method
- Modify: `server/modules/expense/expense.controller.ts` — add paginated action
- Modify: `app/(authenticated)/expense/page.tsx` — use paginated data
- Reference: `server/modules/work-entry/` — follow the existing pagination pattern

### Steps:

1. Study the work-entry module's pagination pattern (service, controller, and page) as the reference implementation.

2. Add `getPaginatedIncomes(userId, { page, pageSize, sortBy, sortOrder })` to income service. Return `{ data, total, page, pageSize }`.

3. Add `getPaginatedIncomesAction(params)` to income controller with Zod validation for pagination params.

4. Repeat steps 2-3 for expense module.

5. Update income and expense page components to use the DataTable pattern with server-side pagination (matching work-entries UI).

---

## Phase 2: Medium Priority (Before Public Launch)

### Task 5: Standardize Controllers on `(data: unknown)` Input Pattern

**Problem:** Older controllers accept `FormData` and manually parse with `formData.get()` — error-prone (`Number(null)` silently becomes `0`). Newer controllers accept `(data: unknown)` + Zod `safeParse`, which is strictly better.

**Files:**
- Modify: `server/modules/income/income.controller.ts`
- Modify: `server/modules/expense/expense.controller.ts`
- Modify: `server/modules/account/account.controller.ts`
- Modify: `server/modules/transfer/transfer.controller.ts`
- Modify: `server/modules/budget/budget.controller.ts`
- Modify: `server/modules/payment/payment.controller.ts`
- Modify: Corresponding form components that call these actions (update to pass plain objects)

### Steps:

1. For each controller listed above, change action signatures from `(formData: FormData)` to `(data: unknown)`.

2. Replace manual `formData.get()` parsing with `schema.safeParse(data)`.

3. Update the corresponding form components to pass plain objects instead of `FormData`. Change from `<form action={serverAction}>` to `onSubmit` handlers that call the action with an object.

4. Do this incrementally — one module at a time, test after each migration.

---

### Task 6: Migrate to Tag-Based Revalidation

**Problem:** Older modules use `revalidatePath('/', 'layout')` which invalidates the entire app cache. Newer modules use targeted `clearCache('/path')` but still invalidate full pages.

**Files:**
- Modify: `server/actions/cache.ts` — update or deprecate
- Modify: All controller files that call `revalidatePath` or `clearCache`
- Modify: Data-fetching functions in services or pages — wrap with `unstable_cache` and tags

### Steps:

1. Define a tag naming convention: `incomes`, `expenses`, `accounts`, `budgets`, `goals`, `dashboard`, `transfers`, `payments`, etc.

2. Wrap data-fetching functions with `unstable_cache` using appropriate tags. Start with dashboard queries since they get invalidated most often.

3. Replace `revalidatePath('/', 'layout')` calls in controllers with targeted `revalidateTag()` calls. Each mutation should only invalidate the tags it affects (e.g., creating income invalidates `incomes` + `dashboard` + `accounts`).

4. Update `clearCache()` in `server/actions/cache.ts` to use tags, or deprecate it in favor of direct `revalidateTag()` calls.

5. Test that mutations properly update the UI after revalidation changes.

---

### Task 7: Move Notification Logic from Controllers to Services

**Problem:** `income.controller.ts` fetches category name, account info, and fires notifications after creating income. `expense.controller.ts` has similar budget alert logic. This is business logic that leaked into the controller layer.

**Files:**
- Modify: `server/modules/income/income.controller.ts`
- Modify: `server/modules/income/income.service.ts`
- Modify: `server/modules/expense/expense.controller.ts`
- Modify: `server/modules/expense/expense.service.ts`

### Steps:

1. Move notification dispatch logic from income controller into the income service's `createIncome` method (or a separate `afterCreate` hook within the service).

2. Move budget alert logic from expense controller into the expense service.

3. Controllers should only: authenticate, validate, call service, revalidate cache, return result.

---

### Task 8: Extract `UserService`

**Problem:** No `UserService` exists. User queries (`prisma.user.findUnique/findUniqueOrThrow`) are scattered across 15+ locations with different `select` clauses: 5 page files, 3 controllers, 2 API routes, and 1 auth action file. This is the single largest source of query duplication.

**Files:**
- Create: `server/modules/user/user.service.ts`
- Create: `server/modules/user/user.types.ts`
- Modify: `app/(authenticated)/layout.tsx` — replace inline `prisma.user.findUnique` with `UserService.getForLayout()`
- Modify: `app/(authenticated)/dashboard/page.tsx` — replace inline `prisma.user.findUnique` with `UserService.getCurrency()`
- Modify: `app/(authenticated)/profile/page.tsx` — replace inline `prisma.user.findUniqueOrThrow` with `UserService.getProfile()`
- Modify: `app/(authenticated)/reports/page.tsx` — replace inline `prisma.user.findUniqueOrThrow` with `UserService.getEmailAndCreatedAt()`
- Modify: `app/changelog/page.tsx` — replace inline `prisma.user.update` with `UserService.markChangelogSeen()`
- Modify: `server/modules/notification/notification.controller.ts` — replace 7 inline `prisma.user.*` calls with `UserService` methods
- Modify: `app/api/unsubscribe/route.ts` — replace inline user lookup
- Modify: `app/api/invoices/[id]/pdf/route.ts` — replace inline user lookup

### Steps:

1. Create `server/modules/user/user.service.ts` with these methods:
   - `getForLayout(userId)` — returns name, email, currency, role, lastSeenChangelogAt
   - `getCurrency(userId)` — returns currency string only
   - `getProfile(userId)` — returns full profile (name, email, hasPassword, phone, createdAt, authAccounts)
   - `getEmailAndCreatedAt(userId)` — for reports page
   - `markChangelogSeen(userId, date)` — update lastSeenChangelogAt
   - `updateProfile(userId, data)` — for notification controller's profile updates
   - `updatePassword(userId, hashedPassword)` — for notification controller's password changes
   - `updatePhone(userId, phone)` — for notification controller's phone updates
   - `findByEmail(email)` — for unsubscribe and other lookups

2. Replace all inline `prisma.user.*` calls in the listed files with the appropriate `UserService` method.

3. The notification controller should shrink significantly — its 7 prisma calls become 7 service calls.

---

### Task 9: Extract `AuthService`

**Problem:** `server/actions/auth.ts` handles registration, password reset tokens, and password updates directly with Prisma — no service layer. Every other domain has a service file.

**Files:**
- Create: `server/modules/auth/auth.service.ts`
- Create: `server/modules/auth/auth.types.ts`
- Modify: `server/actions/auth.ts` — call AuthService methods instead of inline Prisma

### Steps:

1. Create `server/modules/auth/auth.service.ts` with methods:
   - `register(data)` — create user, handle currency, create default categories
   - `createPasswordResetToken(email)` — generate token, set expiry
   - `resetPassword(token, newPassword)` — validate token, update password
   - `findUserByResetToken(token)` — for token validation

2. Refactor `server/actions/auth.ts` to: validate input with Zod, call AuthService, return result. No direct Prisma calls.

---

### Task 10: Extract `CronLogService` Utility

**Problem:** Every cron route (4 files) repeats the same `prisma.cronRunLog.create(...)` pattern for both success and failure logging.

**Files:**
- Create: `server/modules/cron/cron.service.ts`
- Modify: `app/api/cron/process-recurring/route.ts`
- Modify: `app/api/cron/monthly-report/route.ts`
- Modify: `app/api/cron/process-reports/route.ts`
- Modify: `app/api/cron/process-sms/route.ts` (if it exists)

### Steps:

1. Create `server/modules/cron/cron.service.ts` with:
```typescript
export class CronService {
    static async logRun(key: string, status: 'SUCCESS' | 'FAILURE', data?: {
        duration?: number;
        processedCount?: number;
        errorMessage?: string;
    }) {
        return prisma.cronRunLog.create({
            data: { key, status, ...data }
        });
    }
}
```

2. Replace inline `prisma.cronRunLog.create(...)` blocks in all cron routes with `CronService.logRun()`.

---

### Task 11: Move Dev Dependencies to `devDependencies` (was Task 8)

**Problem:** All dev dependencies (`typescript`, `eslint`, `@types/*`, `tailwindcss`, `babel-plugin-react-compiler`) are in `dependencies`, inflating the production Docker image.

**Files:**
- Modify: `package.json`

### Steps:

1. Identify packages that are only needed at build time: `typescript`, `@types/*`, `eslint`, `eslint-config-next`, `babel-plugin-react-compiler`, `tailwindcss`, `@tailwindcss/*`, `tw-animate-css`, and similar.

2. Move them from `dependencies` to `devDependencies`.

3. Verify `docker compose build` still succeeds (the Dockerfile must run `npm install` without `--production` during build, then optionally prune for the final image).

---

### Task 12: Add `not-found.tsx` to Dynamic Route Segments

**Problem:** Navigating to a non-existent ID (e.g., `/accounts/nonexistent`) shows no custom 404 within the authenticated layout.

**Files:**
- Create: `app/(authenticated)/not-found.tsx` — general authenticated 404
- Create: `app/not-found.tsx` — root-level custom 404

### Steps:

1. Create `app/not-found.tsx` with a centered "Page not found" message and a "Go home" link.

2. Create `app/(authenticated)/not-found.tsx` with a "Page not found" message within the sidebar layout, with a "Go to Dashboard" link.

3. In dynamic pages that fetch by ID, call `notFound()` from `next/navigation` when the record doesn't exist instead of redirecting or showing blank.

---

## Phase 3: State Management & Hooks

### Task 13: Standardize Pending State on `useTransition`

**Problem:** 9 components use manual `useState(false)` + `setIsPending(true/false)` for pending state. 8 newer components correctly use `useTransition`. The manual pattern doesn't integrate with React's concurrent rendering.

**Files:**
- Modify: `components/modules/income/IncomeForm.tsx`
- Modify: `components/modules/expense/ExpenseForm.tsx`
- Modify: `components/modules/budget/BudgetForm.tsx`
- Modify: `components/modules/budget/EditBudgetDialog.tsx`
- Modify: `components/modules/transfer/TransferForm.tsx`
- Modify: `components/modules/account/AccountForm.tsx`
- Modify: `components/modules/account/EditAccountDialog.tsx`
- Modify: `components/modules/account/AdjustBalanceDialog.tsx`
- Modify: `components/modules/payment/PaymentForm.tsx`

### Steps:

1. In each component, replace `const [isPending, setIsPending] = useState(false)` with `const [isPending, startTransition] = useTransition()`.

2. Wrap the async server action call in `startTransition(async () => { ... })` instead of manually toggling `setIsPending(true/false)`.

3. Remove the manual `setIsPending(true)` / `setIsPending(false)` calls. `isPending` from `useTransition` handles this automatically.

4. Do this one component at a time, verify the form still works (submit, loading state, error handling).

---

### Task 14: Create `useServerAction` Hook

**Problem:** Non-form mutations (delete, mark-as-paid, status toggles) repeat the same ~12 lines of pending/error/toast boilerplate across 12+ components.

**Files:**
- Create: `hooks/use-server-action.ts`

### Steps:

1. Create the hook:
```typescript
// hooks/use-server-action.ts
import { useTransition, useCallback } from 'react';
import { toast } from 'sonner';

type ActionResult<T = unknown> = { error: string } | { success: true; data?: T };

interface UseServerActionOptions<T> {
    onSuccess?: (data?: T) => void;
    successMessage?: string;
}

export function useServerAction<TInput, TResult = unknown>(
    action: (input: TInput) => Promise<ActionResult<TResult>>,
    options?: UseServerActionOptions<TResult>,
) {
    const [isPending, startTransition] = useTransition();

    const execute = useCallback(
        (input: TInput) => {
            startTransition(async () => {
                const result = await action(input);
                if ('error' in result) {
                    toast.error(result.error);
                } else {
                    if (options?.successMessage) toast.success(options.successMessage);
                    options?.onSuccess?.(result.data);
                }
            });
        },
        [action, options],
    );

    return { execute, isPending };
}
```

2. Migrate simple mutation components (delete confirmations, mark-as-paid dialogs, status toggles) to use this hook.

3. Do NOT force complex form components to use this hook — react-hook-form components should keep their existing `useTransition` + `handleSubmit` pattern.

---

### Task 15: Unify Server Action Return Types

**Problem:** Older controllers return `{ error: string, issues?: ZodIssue[] }` with `revalidatePath`. Newer controllers return `{ success: true, data?: T } | { error: string }` with `clearCache`. The `issues` array is never consumed by any client component.

**Files:**
- Modify: All controllers in `server/modules/*/`
- Reference: `server/modules/work-entry/work-entry.controller.ts` (target pattern)

### Steps:

1. Define the standard return type:
```typescript
type ActionResponse<T = void> = { success: true; data?: T } | { error: string };
```

2. Migrate older controllers to return `{ success: true }` on success and `{ error: parsed.error.issues[0]?.message || 'Validation failed' }` on validation failure.

3. Drop the `issues` array from all error responses.

4. Update any client components that check for `result?.issues` (likely none).

---

## Phase 4: Low Priority (Architectural Polish)

### Task 16: Simplify `serialize()` Utility

**Problem:** `serialize()` runs `convertDecimals()` (walks entire object tree) then `JSON.parse(JSON.stringify(...))` — a redundant double traversal. `convertDecimals` already handles the Decimal conversion.

**Files:**
- Modify: `lib/serialization.ts`

### Steps:

1. Review `lib/serialization.ts` to confirm `convertDecimals` already produces plain objects.
2. Remove the `JSON.parse(JSON.stringify())` pass if `convertDecimals` output is already serializable.
3. Test with a few pages that use `serialize()` to confirm no regressions.

---

### Task 17: Decompose Dashboard Page

**Problem:** `app/(authenticated)/dashboard/page.tsx` is 600+ lines mixing data fetching, conditional rendering, and inline presentation logic.

**Files:**
- Modify: `app/(authenticated)/dashboard/page.tsx`
- Create: Section server components (if not already done in Task 3)

### Steps:

1. If Task 3 was completed, most of this work is already done.
2. Extract any remaining inline rendering blocks (icon/color logic IIFEs, conditional sections) into child components.
3. The final `page.tsx` should be ~50 lines: auth, fetch currency, render composed sections.

---

## Notes

- **Do not change:** The module system, the controller-service-Prisma layered flow, server components as page boundaries, Prisma `$transaction` for balance updates, route group organization, or `standalone` output mode.
- **No repository layer needed.** Prisma IS the data access abstraction. Services own their domain queries + business logic. Adding repositories would double the file count for zero value at this scale.
- **Do not adopt:** `useActionState` (forms too complex), `next-safe-action` (migration cost > benefit), or a generic `useFormAction` hook (forms are meaningfully different — defer until pattern stabilizes).
- **react-hook-form is correct for this project.** Community consensus (2025-2026) confirms it is not obsoleted by React 19. It wins for complex forms with conditional logic, field arrays, and watch-based derived state.
- **Next.js version:** `package.json` specifies `next: "16.0.10"` — the app is running Next.js 16, not 15. Some community advice for Next.js 15 may differ slightly.
- **API routes (cron, webhooks) with inline Prisma are acceptable** — they are system-level endpoints, not user-facing CRUD. The cron log utility (Task 10) is the only consolidation needed there.
