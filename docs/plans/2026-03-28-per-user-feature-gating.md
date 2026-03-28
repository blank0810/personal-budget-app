# Per-User Feature Gating -- Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace global-only feature flags with per-user feature gating. Admin manually enables/disables features for individual users from the admin user detail drawer. Global FeatureFlag table remains as the definition layer (what features exist + their defaults). A new UserFeature join table stores per-user overrides. Resolution: user override wins, global default is fallback, missing global = disabled.

**Architecture decision (supersedes prior):** Feature gating is PER-USER, not global. The previous decision (2026-03-27) to keep flags as "global on/off toggles" is replaced by this design. Global flags still define what features exist and their defaults, but admin can now grant or revoke features per user.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma ORM, Tailwind CSS 4, shadcn/ui

---

## Task 1: Schema Migration -- UserFeature join table + SystemSetting model

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration file via `prisma migrate dev`

### Step 1: Add UserFeature model

After the `FeatureFlag` model (line ~481), add:

```prisma
// Per-user feature flag overrides
model UserFeature {
  id        String   @id @default(cuid())
  userId    String
  flagKey   String
  enabled   Boolean  @default(true)
  grantedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, flagKey])
  @@index([userId])
  @@map("user_features")
}
```

### Step 2: Add relation to User model

In the User model's relations block (around line 136), add:

```prisma
userFeatures UserFeature[]
```

### Step 3: Add SystemSetting model

After the UserFeature model, add:

```prisma
// Admin-configurable system defaults (key/value store)
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  label     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("system_settings")
}
```

### Step 4: Run migration

```bash
docker compose exec app npx prisma migrate dev --name add-user-features-and-system-settings
```

**Acceptance criteria:**
- `user_features` table exists with `userId`, `flagKey`, `enabled`, `grantedAt` columns
- Composite unique on `(userId, flagKey)` prevents duplicates
- Cascade delete: when a user is deleted, their feature overrides are removed
- `system_settings` table exists with `key` (unique), `value`, `label` columns
- Prisma client regenerated with both new models

---

## Task 2: Feature Resolution Service

**Files:**
- Create: `server/modules/feature-flag/feature-flag.service.ts`
- Create: `server/modules/feature-flag/feature-flag.types.ts`

### Step 1: Create types file

```
server/modules/feature-flag/feature-flag.types.ts
```

Define:

```typescript
// All known feature flag keys -- single source of truth
export const FEATURE_KEYS = {
  RECURRING_TRANSACTIONS: 'recurring_transactions',
  CSV_IMPORT: 'csv_import',
  GOALS: 'goals',
  INVOICES: 'invoices',
  AI_FEATURES: 'ai_features',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

// Maps feature keys to the sidebar items and routes they gate
export const FEATURE_ROUTE_MAP: Record<string, { routes: string[]; sidebarKeys: string[] }> = {
  [FEATURE_KEYS.RECURRING_TRANSACTIONS]: {
    routes: ['/recurring'],
    sidebarKeys: ['Recurring'],
  },
  [FEATURE_KEYS.CSV_IMPORT]: {
    routes: ['/import'],
    sidebarKeys: ['Import'],
  },
  [FEATURE_KEYS.GOALS]: {
    routes: ['/goals'],
    sidebarKeys: ['Goals'],
  },
  [FEATURE_KEYS.INVOICES]: {
    routes: ['/clients', '/entries', '/invoices'],
    sidebarKeys: ['Invoices'],  // Parent nav item -- hides entire group
  },
  [FEATURE_KEYS.AI_FEATURES]: {
    routes: [],       // No routes yet
    sidebarKeys: [],  // No sidebar yet
  },
};

export type ResolvedFeatures = Record<string, boolean>;
```

### Step 2: Create feature flag service

```
server/modules/feature-flag/feature-flag.service.ts
```

```typescript
import prisma from '@/lib/prisma';
import type { ResolvedFeatures } from './feature-flag.types';

export const FeatureFlagService = {
  /**
   * Resolve all feature flags for a user.
   * Resolution order: user override > global default > disabled.
   *
   * Single query using a raw join would be premature -- two small queries
   * (global flags + user overrides) are simple and cache-friendly.
   */
  async getResolvedFeaturesForUser(userId: string): Promise<ResolvedFeatures> {
    const [globalFlags, userOverrides] = await Promise.all([
      prisma.featureFlag.findMany(),
      prisma.userFeature.findMany({ where: { userId } }),
    ]);

    const result: ResolvedFeatures = {};

    // Start with global defaults
    for (const flag of globalFlags) {
      result[flag.key] = flag.enabled;
    }

    // Apply user overrides (wins over global)
    for (const override of userOverrides) {
      result[override.flagKey] = override.enabled;
    }

    return result;
  },

  /**
   * Get user overrides only (for the admin UI to show which are custom vs default).
   */
  async getUserOverrides(userId: string): Promise<Record<string, boolean>> {
    const overrides = await prisma.userFeature.findMany({
      where: { userId },
    });
    const result: Record<string, boolean> = {};
    for (const o of overrides) {
      result[o.flagKey] = o.enabled;
    }
    return result;
  },

  /**
   * Set a per-user override for a feature flag.
   * Creates or updates the UserFeature record.
   */
  async setUserFeatureOverride(
    userId: string,
    flagKey: string,
    enabled: boolean
  ) {
    return prisma.userFeature.upsert({
      where: { userId_flagKey: { userId, flagKey } },
      update: { enabled },
      create: { userId, flagKey, enabled },
    });
  },

  /**
   * Remove a per-user override (reset to global default).
   */
  async removeUserFeatureOverride(userId: string, flagKey: string) {
    return prisma.userFeature.deleteMany({
      where: { userId, flagKey },
    });
  },

  /**
   * Bulk set all overrides for a user (used when toggling multiple at once).
   * Deletes all existing overrides and creates new ones in a transaction.
   */
  async bulkSetUserFeatures(
    userId: string,
    overrides: Array<{ flagKey: string; enabled: boolean }>
  ) {
    // Only create records for actual overrides, not defaults
    return prisma.$transaction([
      prisma.userFeature.deleteMany({ where: { userId } }),
      ...overrides.map((o) =>
        prisma.userFeature.create({
          data: { userId, flagKey: o.flagKey, enabled: o.enabled },
        })
      ),
    ]);
  },
};
```

**Acceptance criteria:**
- `getResolvedFeaturesForUser(userId)` returns `Record<string, boolean>` with user overrides winning
- `setUserFeatureOverride` upserts correctly (no duplicates)
- `removeUserFeatureOverride` deletes the override, making the user fall back to global default
- Feature key not in global flags AND not in user overrides = absent from result (treated as disabled)

---

## Task 3: Admin Controller Actions for User Features

**Files:**
- Modify: `server/modules/admin/admin.controller.ts`

### Step 1: Import FeatureFlagService

At the top of the file, add:

```typescript
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';
```

### Step 2: Add getUserFeatures action

After the existing `adminExportUserDataAction`, add:

```typescript
export async function adminGetUserFeaturesAction(userId: string) {
  const { error } = await requireAdminSession();
  if (error) return { success: false, error };

  try {
    const [flags, overrides] = await Promise.all([
      AdminContentService.getFeatureFlags(),
      FeatureFlagService.getUserOverrides(userId),
    ]);
    return { success: true, flags, overrides };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch user features',
    };
  }
}
```

### Step 3: Add setUserFeature action

```typescript
export async function adminSetUserFeatureAction(
  userId: string,
  flagKey: string,
  enabled: boolean
) {
  const { error } = await requireAdminSession();
  if (error) return { success: false, error };

  try {
    await FeatureFlagService.setUserFeatureOverride(userId, flagKey, enabled);
    await clearCache('/', 'layout');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to set user feature',
    };
  }
}
```

### Step 4: Add resetUserFeature action

```typescript
export async function adminResetUserFeatureAction(
  userId: string,
  flagKey: string
) {
  const { error } = await requireAdminSession();
  if (error) return { success: false, error };

  try {
    await FeatureFlagService.removeUserFeatureOverride(userId, flagKey);
    await clearCache('/', 'layout');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reset user feature',
    };
  }
}
```

**Acceptance criteria:**
- All three actions require admin session
- `adminGetUserFeaturesAction` returns both global flags and user-specific overrides
- `adminSetUserFeatureAction` upserts the override and clears cache
- `adminResetUserFeatureAction` removes the override and clears cache

---

## Task 4: UserDetailDrawer -- Features Section

**Files:**
- Modify: `components/modules/admin/UserDetailDrawer.tsx`

### Step 1: Add imports

Add to existing imports:

```typescript
import { Switch } from '@/components/ui/switch';
import { RotateCcw } from 'lucide-react';
import {
  adminGetUserFeaturesAction,
  adminSetUserFeatureAction,
  adminResetUserFeatureAction,
} from '@/server/modules/admin/admin.controller';
```

### Step 2: Add state for features

Inside the component, add new state variables:

```typescript
const [featureFlags, setFeatureFlags] = useState<
  Array<{ key: string; description: string | null; globalEnabled: boolean }>
>([]);
const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({});
const [featureLoading, setFeatureLoading] = useState<string | null>(null);
```

### Step 3: Fetch features alongside user detail

In the existing `load()` function inside useEffect, add a third parallel call:

```typescript
const [detailResult, activityResult, featuresResult] = await Promise.all([
  adminGetUserDetailAction(userId!),
  adminGetUserActivityAction(userId!),
  adminGetUserFeaturesAction(userId!),
]);

// ... existing handlers ...

if (featuresResult.success && 'flags' in featuresResult && 'overrides' in featuresResult) {
  setFeatureFlags(
    (featuresResult.flags as Array<{ key: string; description: string | null; enabled: boolean }>)
      .map((f) => ({ key: f.key, description: f.description, globalEnabled: f.enabled }))
  );
  setUserOverrides(featuresResult.overrides as Record<string, boolean>);
}
```

### Step 4: Add toggle and reset handlers

```typescript
async function handleFeatureToggle(flagKey: string, enabled: boolean) {
  if (!user) return;
  setFeatureLoading(flagKey);
  const result = await adminSetUserFeatureAction(user.id, flagKey, enabled);
  setFeatureLoading(null);

  if (result.success) {
    setUserOverrides((prev) => ({ ...prev, [flagKey]: enabled }));
    toast.success(`${flagKey} ${enabled ? 'enabled' : 'disabled'} for user`);
  } else {
    toast.error(result.error || 'Failed');
  }
}

async function handleFeatureReset(flagKey: string) {
  if (!user) return;
  setFeatureLoading(flagKey);
  const result = await adminResetUserFeatureAction(user.id, flagKey);
  setFeatureLoading(null);

  if (result.success) {
    setUserOverrides((prev) => {
      const next = { ...prev };
      delete next[flagKey];
      return next;
    });
    toast.success(`${flagKey} reset to global default`);
  } else {
    toast.error(result.error || 'Failed');
  }
}
```

### Step 5: Add Features section to the drawer JSX

Insert a new section between Notification Preferences and Actions (between the two `<Separator />` elements). The section should show:

```tsx
<Separator />

{/* Feature Flags */}
<div>
  <h4 className='font-medium text-sm mb-2'>
    Feature Access ({featureFlags.length})
  </h4>
  {featureFlags.length > 0 ? (
    <div className='space-y-3'>
      {featureFlags.map((flag) => {
        const hasOverride = flag.key in userOverrides;
        const effectiveValue = hasOverride
          ? userOverrides[flag.key]
          : flag.globalEnabled;
        const isLoading = featureLoading === flag.key;

        return (
          <div key={flag.key} className='flex items-center justify-between gap-2'>
            <div className='flex-1 min-w-0'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-mono truncate'>{flag.key}</span>
                {hasOverride ? (
                  <Badge variant='outline' className='text-xs shrink-0'>
                    Custom
                  </Badge>
                ) : (
                  <Badge variant='secondary' className='text-xs shrink-0'>
                    Default
                  </Badge>
                )}
              </div>
              {flag.description && (
                <p className='text-xs text-muted-foreground truncate'>
                  {flag.description}
                </p>
              )}
            </div>
            <div className='flex items-center gap-1 shrink-0'>
              {hasOverride && (
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-7 w-7'
                  onClick={() => handleFeatureReset(flag.key)}
                  disabled={isLoading}
                  title='Reset to global default'
                >
                  <RotateCcw className='h-3 w-3' />
                </Button>
              )}
              <Switch
                checked={effectiveValue}
                disabled={isLoading}
                onCheckedChange={(checked) =>
                  handleFeatureToggle(flag.key, checked)
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <p className='text-sm text-muted-foreground'>
      No feature flags configured
    </p>
  )}
</div>
```

**Acceptance criteria:**
- Each feature flag row shows: flag key (mono), "Custom" or "Default" badge, description, toggle switch
- Toggle creates/updates a UserFeature override record
- "Reset" button (RotateCcw icon) appears only when the user has a custom override
- Clicking reset removes the override and the toggle snaps to the global default
- Loading state disables the toggle while the action is in flight

---

## Task 5: Layout Gating -- Sidebar Filtering and Route Redirect

**Files:**
- Modify: `app/(authenticated)/layout.tsx`
- Modify: `components/common/app-sidebar.tsx`

### Step 1: Fetch resolved features in layout

In `app/(authenticated)/layout.tsx`, import the service and fetch features:

```typescript
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';
import { FEATURE_ROUTE_MAP } from '@/server/modules/feature-flag/feature-flag.types';
```

After the existing `dbUser` query, add:

```typescript
const resolvedFeatures = await FeatureFlagService.getResolvedFeaturesForUser(session!.user!.id);
```

### Step 2: Compute disabled sidebar keys

```typescript
const disabledSidebarKeys = new Set<string>();
for (const [featureKey, mapping] of Object.entries(FEATURE_ROUTE_MAP)) {
  if (!resolvedFeatures[featureKey]) {
    for (const key of mapping.sidebarKeys) {
      disabledSidebarKeys.add(key);
    }
  }
}
```

### Step 3: Pass to AppSidebar

Add a new prop `disabledSidebarKeys` to the `<AppSidebar>` component:

```tsx
<AppSidebar
  user={user}
  signOutAction={signOutAction}
  hasNewChangelog={hasNewChangelog}
  disabledSidebarKeys={disabledSidebarKeys}
/>
```

### Step 4: Modify AppSidebar to accept and filter

In `components/common/app-sidebar.tsx`:

1. Add `disabledSidebarKeys?: Set<string>` to `AppSidebarProps`.
2. Filter both main nav items and footer nav items before rendering:

```typescript
const filteredNavItems = disabledSidebarKeys
  ? navItems.filter((item) => !disabledSidebarKeys.has(item.title))
  : navItems;
```

Also filter the footer items (Recurring, Import) by checking the same set:

```typescript
// In the footer, conditionally render each SidebarMenuItem:
{!disabledSidebarKeys?.has('Recurring') && (
  <SidebarMenuItem>...</SidebarMenuItem>
)}
{!disabledSidebarKeys?.has('Import') && (
  <SidebarMenuItem>...</SidebarMenuItem>
)}
```

### Step 5: Route redirect for gated features

Still in `app/(authenticated)/layout.tsx`, add a route guard. If the user is on a gated route, redirect to dashboard:

```typescript
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// Inside the component, after resolvedFeatures:
const headersList = await headers();
const pathname = headersList.get('x-nexturl-pathname') || headersList.get('x-invoke-path') || '';

// Check if user is accessing a disabled feature's route
for (const [featureKey, mapping] of Object.entries(FEATURE_ROUTE_MAP)) {
  if (!resolvedFeatures[featureKey]) {
    if (mapping.routes.some((route) => pathname.startsWith(route))) {
      redirect('/dashboard');
    }
  }
}
```

**Note:** The `x-nexturl-pathname` header may not be available in all Next.js configurations. Alternative approach: use `middleware.ts` to set a custom header, or move the route guard to each gated page's layout/page.tsx. The simplest reliable approach is to add a lightweight check in each gated route group's layout or page. Decide during implementation based on what the Next.js 15 headers expose.

**Fallback approach for route gating (preferred for reliability):**

Create a reusable wrapper:

```
lib/feature-gate.ts
```

```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';

export async function requireFeature(featureKey: string) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const features = await FeatureFlagService.getResolvedFeaturesForUser(session.user.id);
  if (!features[featureKey]) {
    redirect('/dashboard');
  }
}
```

Then in each gated page/layout:

```typescript
// app/(authenticated)/recurring/page.tsx (or a layout wrapping it)
import { requireFeature } from '@/lib/feature-gate';

export default async function RecurringPage() {
  await requireFeature('recurring_transactions');
  // ... rest of page
}
```

This is more explicit, harder to break, and works regardless of header availability.

**Acceptance criteria:**
- Sidebar hides nav items for disabled features entirely (not grayed out)
- Direct URL access to a gated route redirects to `/dashboard`
- Admin users are not exempt from feature gating (their overrides apply the same way)
- Core features (dashboard, transactions, budgets, accounts, reports) are never gated

---

## Task 6: Seed Updates

**Files:**
- Modify: `prisma/seed.ts`

### Step 1: Add `invoices` feature flag

Add to the existing `featureFlags` array:

```typescript
{ key: 'invoices', enabled: true, description: 'Invoicing module (clients, entries, invoices)' },
```

### Step 2: Seed the admin user with all features enabled

After the feature flags seeding block, add:

```typescript
// Grant admin user all features explicitly
const seededUserForFeatures = await prisma.user.findUnique({
  where: { email },
  select: { id: true },
});

if (seededUserForFeatures) {
  for (const flag of featureFlags) {
    await prisma.userFeature.upsert({
      where: {
        userId_flagKey: {
          userId: seededUserForFeatures.id,
          flagKey: flag.key,
        },
      },
      update: { enabled: true },
      create: {
        userId: seededUserForFeatures.id,
        flagKey: flag.key,
        enabled: true,
      },
    });
  }
  console.log('Seeded admin user feature overrides');
}
```

### Step 3: Seed initial system settings

```typescript
// Seed default system settings
const systemSettings = [
  { key: 'invoice_due_days', value: '30', label: 'Default invoice due date (days from issue)' },
];

for (const setting of systemSettings) {
  await prisma.systemSetting.upsert({
    where: { key: setting.key },
    update: { label: setting.label },
    create: setting,
  });
}
console.log('Seeded system settings');
```

**Acceptance criteria:**
- `invoices` flag exists in `feature_flags` table after seeding
- Admin user has UserFeature records for all flags, all enabled
- `system_settings` table has `invoice_due_days` = `'30'`
- Idempotent: running seed multiple times does not create duplicates (upsert)

---

## Task 7: Admin System Settings Page

**Files:**
- Create: `server/modules/admin/admin-system.service.ts`
- Modify: `server/modules/admin/admin.controller.ts` (add actions)
- Create: `components/modules/admin/SystemSettingsTable.tsx`
- Modify: `app/(authenticated)/admin/system/page.tsx`

### Step 1: Create admin-system.service.ts

```typescript
import prisma from '@/lib/prisma';

export const AdminSystemService = {
  async getSettings() {
    return prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  },

  async updateSetting(key: string, value: string) {
    return prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },
};
```

### Step 2: Add controller actions

In `admin.controller.ts`, add:

```typescript
import { AdminSystemService } from './admin-system.service';

export async function adminGetSystemSettingsAction() {
  const { error } = await requireAdminSession();
  if (error) return { success: false, error };

  try {
    const settings = await AdminSystemService.getSettings();
    return { success: true, settings };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch settings',
    };
  }
}

export async function adminUpdateSystemSettingAction(key: string, value: string) {
  const { error } = await requireAdminSession();
  if (error) return { success: false, error };

  try {
    await AdminSystemService.updateSetting(key, value);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update setting',
    };
  }
}
```

### Step 3: Create SystemSettingsTable component

A simple editable table. Each row: key (read-only), label, current value (editable input), save button.

File: `components/modules/admin/SystemSettingsTable.tsx`

- Use inline editing (click value cell to edit, blur or enter to save)
- Show toast on save success/failure
- Use `adminUpdateSystemSettingAction` server action

### Step 4: Update admin system page

The existing `app/(authenticated)/admin/system/page.tsx` currently shows cron run logs. Add a "System Settings" section above or below it:

```tsx
import { AdminSystemService } from '@/server/modules/admin/admin-system.service';
import { SystemSettingsTable } from '@/components/modules/admin/SystemSettingsTable';

// In the page component:
const settings = await AdminSystemService.getSettings();

// In the JSX, add section:
<div className='space-y-6'>
  <h2 className='text-xl font-bold'>System Settings</h2>
  <SystemSettingsTable initialSettings={settings} />
</div>
```

**Acceptance criteria:**
- System settings table renders all SystemSetting records
- Admin can edit the value inline and save
- New settings can be added via seed without schema changes
- Existing cron health monitoring on the system page is not affected

---

## Task 8: Global Feature Flags Page -- Show Override Counts

**Files:**
- Modify: `server/modules/admin/admin-content.service.ts`
- Modify: `components/modules/admin/FeatureFlagTable.tsx`

### Step 1: Enhance getFeatureFlags to include override counts

In `admin-content.service.ts`, modify `getFeatureFlags()`:

```typescript
async getFeatureFlags() {
  const flags = await prisma.featureFlag.findMany({
    orderBy: { key: 'asc' },
  });

  // Count per-flag how many users have overrides
  const overrideCounts = await prisma.userFeature.groupBy({
    by: ['flagKey'],
    _count: { flagKey: true },
  });

  const countMap = new Map(
    overrideCounts.map((o) => [o.flagKey, o._count.flagKey])
  );

  return flags.map((f) => ({
    ...f,
    overrideCount: countMap.get(f.key) ?? 0,
  }));
},
```

### Step 2: Update FeatureFlagTable to show override count

Add an "Overrides" column that shows the count badge. This gives admin visibility into how many users have custom settings for each flag.

```tsx
<TableHead>Overrides</TableHead>
// ...
<TableCell>
  <Badge variant='secondary' className='text-xs'>
    {flag.overrideCount} user{flag.overrideCount !== 1 ? 's' : ''}
  </Badge>
</TableCell>
```

**Acceptance criteria:**
- Global feature flags page shows how many users have overrides per flag
- Toggling a global flag still works as before (it changes the default for users without overrides)
- Zero overrides shows "0 users"

---

## Task 9: Bulk PDF Export Feature Flag

**Files:**
- Modify: `prisma/seed.ts`
- Modify: `server/modules/feature-flag/feature-flag.types.ts`
- Conditionally gate the bulk PDF export UI (wherever it exists or will be added)

### Step 1: Add bulk_pdf_export flag key

In `feature-flag.types.ts`, add to `FEATURE_KEYS`:

```typescript
BULK_PDF_EXPORT: 'bulk_pdf_export',
```

Add to `FEATURE_ROUTE_MAP`:

```typescript
[FEATURE_KEYS.BULK_PDF_EXPORT]: {
  routes: [],          // Not a route -- gated at the UI component level
  sidebarKeys: [],     // No sidebar item
},
```

### Step 2: Add to seed

In `prisma/seed.ts`, add to the `featureFlags` array:

```typescript
{ key: 'bulk_pdf_export', enabled: false, description: 'Bulk PDF report export (premium)' },
```

### Step 3: Usage pattern

This flag does not gate a route or sidebar item. Instead, it gates a specific UI element (e.g., a "Download All Reports" button on the reports page). The pattern for checking it in a server component:

```typescript
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';

// In a server component:
const features = await FeatureFlagService.getResolvedFeaturesForUser(userId);
const canBulkExport = features['bulk_pdf_export'] ?? false;

// Conditionally render:
{canBulkExport && <BulkExportButton />}
```

Or for a client component, pass it as a prop from the parent server component.

**Acceptance criteria:**
- `bulk_pdf_export` flag exists in the seed
- Type system includes the new key
- No route/sidebar gating (UI-level only)
- Admin seeded with it enabled; global default disabled

---

## Summary: File Change Map

### New files
| File | Purpose |
|------|---------|
| `server/modules/feature-flag/feature-flag.service.ts` | Feature resolution logic |
| `server/modules/feature-flag/feature-flag.types.ts` | Feature keys, route map, types |
| `server/modules/admin/admin-system.service.ts` | System settings CRUD |
| `components/modules/admin/SystemSettingsTable.tsx` | Admin system settings UI |
| `lib/feature-gate.ts` | Reusable `requireFeature()` guard |

### Modified files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `UserFeature`, `SystemSetting` models; add relation to `User` |
| `prisma/seed.ts` | Add `invoices` + `bulk_pdf_export` flags; seed admin overrides; seed system settings |
| `server/modules/admin/admin.controller.ts` | Add 5 new actions (user features + system settings) |
| `server/modules/admin/admin-content.service.ts` | Enhance `getFeatureFlags()` with override counts |
| `components/modules/admin/UserDetailDrawer.tsx` | Add Features section with toggle/reset UI |
| `components/modules/admin/FeatureFlagTable.tsx` | Add override count column |
| `app/(authenticated)/layout.tsx` | Fetch resolved features, compute disabled sidebar keys, pass to sidebar |
| `components/common/app-sidebar.tsx` | Accept `disabledSidebarKeys` prop, filter nav items |
| `app/(authenticated)/admin/system/page.tsx` | Add system settings section |
| `app/(authenticated)/recurring/page.tsx` | Add `requireFeature('recurring_transactions')` guard |
| `app/(authenticated)/goals/page.tsx` (or layout) | Add `requireFeature('goals')` guard |
| `app/(authenticated)/import/page.tsx` (or layout) | Add `requireFeature('csv_import')` guard |
| Routes under clients/entries/invoices | Add `requireFeature('invoices')` guard |

### Feature resolution flow
```
User visits /goals
  → layout.tsx: FeatureFlagService.getResolvedFeaturesForUser(userId)
      → Query: global flags + user overrides
      → Merge: user override wins
      → Return: { goals: false, ... }
  → Sidebar: 'Goals' item hidden
  → requireFeature('goals') in goals page: redirect to /dashboard
```

### Admin UX flow
```
Admin opens User Detail Drawer for "Jane"
  → Features section loads:
      recurring_transactions  [Default] [ON]     ← global is ON, no override
      csv_import              [Custom]  [OFF] [x] ← user override: OFF
      goals                   [Default] [ON]
      invoices                [Custom]  [ON]  [x] ← user override: ON
      ai_features             [Default] [OFF]
  → Admin toggles csv_import ON → creates UserFeature(jane, csv_import, true)
  → Admin clicks reset on invoices → deletes UserFeature(jane, invoices) → falls back to global
```
