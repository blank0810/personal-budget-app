# Per-User Feature Gating -- Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace global-only feature flags with per-user feature gating. Admin manually enables/disables features for individual users from the admin user detail drawer. Global FeatureFlag table remains as the definition layer (what features exist + their defaults). A new UserFeature join table stores per-user overrides. Resolution: user override wins, global default is fallback, missing global = disabled.

**Architecture decision (supersedes prior):** Feature gating is PER-USER, not global. The previous decision (2026-03-27) to keep flags as "global on/off toggles" is replaced by this design. Global flags still define what features exist and their defaults, but admin can now grant or revoke features per user.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma ORM, Tailwind CSS 4, shadcn/ui

**Architecture alignment notes (v1.9.3):**
- All server actions return `ActionResponse<T>` from `@/server/lib/action-types` -- success: `{ success: true as const, data: T }`, error: `{ error: string }` (no `success` field on errors)
- Cache invalidation uses `invalidateTags(CACHE_TAGS.X)` from `@/server/actions/cache` -- never the deprecated `clearCache()`
- Auth in server actions uses `getAuthenticatedUser()` from `@/server/lib/auth-guard` (throws on no session) for user-facing actions, `requireAdminSession()` (returns `{ error }`) for admin actions
- Mutation controllers accept `(data: unknown)` and validate with Zod `safeParse` -- schemas live in the module's `.types.ts` file
- Prisma data with Date/Decimal fields must pass through `serialize()` from `@/lib/serialization` before returning to the client
- `Set<string>` is not serializable across server/client boundary -- pass `string[]` instead
- `useServerAction` hook from `@/hooks/use-server-action` wraps mutations with `useTransition` and auto-toasts errors
- Defer `unstable_cache` wrapping for feature resolution until profiling shows it is needed -- two small queries per layout render is acceptable at current scale

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
- Modify: `server/lib/cache-tags.ts` (add `FEATURE_FLAGS` tag)

### Step 1: Add FEATURE_FLAGS cache tag

In `server/lib/cache-tags.ts`, add to the `CACHE_TAGS` object:

```typescript
FEATURE_FLAGS: 'feature-flags',
```

This tag is invalidated whenever a user feature override or global flag is mutated.

### Step 2: Create types file

```
server/modules/feature-flag/feature-flag.types.ts
```

Define:

```typescript
import { z } from 'zod';

// All known feature flag keys -- single source of truth
export const FEATURE_KEYS = {
  RECURRING_TRANSACTIONS: 'recurring_transactions',
  CSV_IMPORT: 'csv_import',
  GOALS: 'goals',
  INVOICES: 'invoices',
  AI_FEATURES: 'ai_features',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

// Allowed flag key values for Zod validation
const featureKeyValues = Object.values(FEATURE_KEYS) as [string, ...string[]];

// --- Zod schemas for mutation actions ---

export const setUserFeatureSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  flagKey: z.enum(featureKeyValues, {
    errorMap: () => ({ message: 'Unknown feature key' }),
  }),
  enabled: z.boolean(),
});

export const resetUserFeatureSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  flagKey: z.enum(featureKeyValues, {
    errorMap: () => ({ message: 'Unknown feature key' }),
  }),
});

export const getUserFeaturesSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
});

export const updateSystemSettingSchema = z.object({
  key: z.string().min(1, 'key is required'),
  value: z.string(),
});

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

### Step 3: Create feature flag service

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
   * Two small queries (global flags + user overrides) are simple and
   * cache-friendly. Do NOT wrap in unstable_cache until profiling shows need.
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
- `FEATURE_FLAGS` tag added to `server/lib/cache-tags.ts`
- `getResolvedFeaturesForUser(userId)` returns `Record<string, boolean>` with user overrides winning
- `setUserFeatureOverride` upserts correctly (no duplicates)
- `removeUserFeatureOverride` deletes the override, making the user fall back to global default
- Feature key not in global flags AND not in user overrides = absent from result (treated as disabled)
- Zod schemas validate `flagKey` against known `FEATURE_KEYS` values and `userId` is non-empty string
- No `unstable_cache` wrapping -- deferred until profiling shows need

---

## Task 3: Admin Controller Actions for User Features

**Files:**
- Modify: `server/modules/admin/admin.controller.ts`

All new actions follow the v1.9.3 controller pattern:
- Import `ActionResponse` from `@/server/lib/action-types` and annotate return types
- Mutation actions accept `(data: unknown)` and validate with Zod `safeParse`
- Error paths return `{ error: string }` (no `success` field)
- Success paths return `{ success: true as const }` or `{ success: true as const, data: { ... } }`
- Cache invalidation uses `invalidateTags(CACHE_TAGS.FEATURE_FLAGS)`
- Prisma data with Date fields passes through `serialize()` before returning

### Step 1: Add imports

At the top of the file, add:

```typescript
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';
import {
  getUserFeaturesSchema,
  setUserFeatureSchema,
  resetUserFeatureSchema,
} from '@/server/modules/feature-flag/feature-flag.types';
import type { ActionResponse } from '@/server/lib/action-types';
```

Note: `invalidateTags`, `CACHE_TAGS`, and `serialize` are already imported in this file.

### Step 2: Add getUserFeatures action

After the existing `adminExportUserDataAction`, add:

```typescript
export async function adminGetUserFeaturesAction(
  data: unknown
): Promise<ActionResponse<{ flags: Array<{ key: string; description: string | null; enabled: boolean }>; overrides: Record<string, boolean> }>> {
  const { error } = await requireAdminSession();
  if (error) return { error };

  const parsed = getUserFeaturesSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  try {
    const [flags, overrides] = await Promise.all([
      AdminContentService.getFeatureFlags(),
      FeatureFlagService.getUserOverrides(parsed.data.userId),
    ]);
    return { success: true as const, data: { flags: serialize(flags), overrides } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch user features',
    };
  }
}
```

### Step 3: Add setUserFeature action

```typescript
export async function adminSetUserFeatureAction(
  data: unknown
): Promise<ActionResponse> {
  const { error } = await requireAdminSession();
  if (error) return { error };

  const parsed = setUserFeatureSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  try {
    await FeatureFlagService.setUserFeatureOverride(
      parsed.data.userId,
      parsed.data.flagKey,
      parsed.data.enabled
    );
    invalidateTags(CACHE_TAGS.FEATURE_FLAGS);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to set user feature',
    };
  }
}
```

### Step 4: Add resetUserFeature action

```typescript
export async function adminResetUserFeatureAction(
  data: unknown
): Promise<ActionResponse> {
  const { error } = await requireAdminSession();
  if (error) return { error };

  const parsed = resetUserFeatureSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  try {
    await FeatureFlagService.removeUserFeatureOverride(
      parsed.data.userId,
      parsed.data.flagKey
    );
    invalidateTags(CACHE_TAGS.FEATURE_FLAGS);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to reset user feature',
    };
  }
}
```

### Step 5: Update existing global flag toggle to also invalidate FEATURE_FLAGS

In the existing `adminToggleFeatureFlagAction`, add `CACHE_TAGS.FEATURE_FLAGS` to the invalidation call:

```typescript
// Change the existing invalidation (if any) or add:
invalidateTags(CACHE_TAGS.FEATURE_FLAGS);
```

**Acceptance criteria:**
- All three new actions require admin session via `requireAdminSession()`
- Auth error returns `{ error }` (no `success: false`)
- Mutation actions accept `(data: unknown)` and validate with Zod schemas from `feature-flag.types.ts`
- `adminGetUserFeaturesAction` returns `{ success: true as const, data: { flags, overrides } }` with `serialize()` on flags
- `adminSetUserFeatureAction` validates `flagKey` is a known feature key, upserts override, invalidates `CACHE_TAGS.FEATURE_FLAGS`
- `adminResetUserFeatureAction` validates inputs, removes override, invalidates `CACHE_TAGS.FEATURE_FLAGS`
- All actions annotated with `Promise<ActionResponse<T>>` return types

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
  adminGetUserFeaturesAction({ userId: userId! }),
]);

// ... existing handlers ...

if (featuresResult.success && featuresResult.data) {
  setFeatureFlags(
    featuresResult.data.flags.map((f) => ({
      key: f.key,
      description: f.description,
      globalEnabled: f.enabled,
    }))
  );
  setUserOverrides(featuresResult.data.overrides);
}
```

Note: `adminGetUserFeaturesAction` now takes `{ userId }` (validated via Zod), not a bare string argument.

### Step 4: Add toggle and reset handlers with useTransition

Replace bare `await` calls with `useTransition` wrapping. The per-flag `featureLoading` state is kept for the per-toggle spinner UX (a legitimate need since we need to track *which* flag is loading, which a single `isPending` boolean cannot express).

```typescript
import { useTransition } from 'react';

// Inside the component:
const [isFeaturePending, startFeatureTransition] = useTransition();

function handleFeatureToggle(flagKey: string, enabled: boolean) {
  if (!user) return;
  setFeatureLoading(flagKey);
  startFeatureTransition(async () => {
    const result = await adminSetUserFeatureAction({
      userId: user.id,
      flagKey,
      enabled,
    });
    setFeatureLoading(null);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      setUserOverrides((prev) => ({ ...prev, [flagKey]: enabled }));
      toast.success(`${flagKey} ${enabled ? 'enabled' : 'disabled'} for user`);
    }
  });
}

function handleFeatureReset(flagKey: string) {
  if (!user) return;
  setFeatureLoading(flagKey);
  startFeatureTransition(async () => {
    const result = await adminResetUserFeatureAction({
      userId: user.id,
      flagKey,
    });
    setFeatureLoading(null);

    if ('error' in result) {
      toast.error(result.error);
    } else {
      setUserOverrides((prev) => {
        const next = { ...prev };
        delete next[flagKey];
        return next;
      });
      toast.success(`${flagKey} reset to global default`);
    }
  });
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
- Toggle creates/updates a UserFeature override record via `adminSetUserFeatureAction({ userId, flagKey, enabled })`
- "Reset" button (RotateCcw icon) appears only when the user has a custom override
- Clicking reset removes the override and the toggle snaps to the global default
- All mutations wrapped in `useTransition` via `startFeatureTransition`
- Per-flag loading state disables the toggle while the action is in flight
- Action calls pass object payloads (not positional args) matching Zod schemas

---

## Task 5: Layout Gating -- Sidebar Filtering and Route Redirect

**Files:**
- Modify: `app/(authenticated)/layout.tsx`
- Modify: `components/common/app-sidebar.tsx`
- Create: `lib/feature-gate.ts`

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

### Step 2: Compute disabled sidebar keys as string[]

**Important:** `Set<string>` is not serializable across the server/client boundary. Compute a `string[]` instead.

```typescript
const disabledSidebarKeys: string[] = [];
for (const [featureKey, mapping] of Object.entries(FEATURE_ROUTE_MAP)) {
  if (!resolvedFeatures[featureKey]) {
    for (const key of mapping.sidebarKeys) {
      disabledSidebarKeys.push(key);
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

1. Add `disabledSidebarKeys?: string[]` to `AppSidebarProps`.
2. Filter both main nav items and footer nav items before rendering:

```typescript
const filteredNavItems = disabledSidebarKeys?.length
  ? navItems.filter((item) => !disabledSidebarKeys.includes(item.title))
  : navItems;
```

Also filter the footer items (Recurring, Import) by checking the same array:

```typescript
// In the footer, conditionally render each SidebarMenuItem:
{!disabledSidebarKeys?.includes('Recurring') && (
  <SidebarMenuItem>...</SidebarMenuItem>
)}
{!disabledSidebarKeys?.includes('Import') && (
  <SidebarMenuItem>...</SidebarMenuItem>
)}
```

### Step 5: Feature gate utility for route-level gating

Create a reusable wrapper. This is the preferred approach for route gating -- explicit per-page guards that work regardless of header availability.

```
lib/feature-gate.ts
```

```typescript
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/server/lib/auth-guard';
import { FeatureFlagService } from '@/server/modules/feature-flag/feature-flag.service';

/**
 * Guard a server component page behind a feature flag.
 * Redirects to /dashboard if the feature is disabled for the current user.
 *
 * Usage:
 *   await requireFeature('recurring_transactions');
 */
export async function requireFeature(featureKey: string) {
  const userId = await getAuthenticatedUser();

  const features = await FeatureFlagService.getResolvedFeaturesForUser(userId);
  if (!features[featureKey]) {
    redirect('/dashboard');
  }
}
```

**Note:** Uses `getAuthenticatedUser()` from `@/server/lib/auth-guard` (throws on no session), NOT raw `auth()`.

Then in each gated page/layout:

```typescript
// app/(authenticated)/recurring/page.tsx (or a layout wrapping it)
import { requireFeature } from '@/lib/feature-gate';

export default async function RecurringPage() {
  await requireFeature('recurring_transactions');
  // ... rest of page
}
```

**Caching note:** `requireFeature()` calls `getResolvedFeaturesForUser()` which runs two Prisma queries. At current scale this is fine. Do NOT wrap in `unstable_cache` preemptively -- defer until profiling shows the feature resolution query is a hot path. The layout already calls `getResolvedFeaturesForUser()` for sidebar gating, so pages guarded with `requireFeature()` will result in a second resolution call. If this becomes measurable, the fix is to lift the resolved features into a React cache or pass them as a prop -- but wait for data before optimizing.

**Acceptance criteria:**
- Sidebar hides nav items for disabled features entirely (not grayed out)
- `disabledSidebarKeys` is passed as `string[]` (not `Set<string>`) across server/client boundary
- `lib/feature-gate.ts` uses `getAuthenticatedUser()` from `@/server/lib/auth-guard`, not raw `auth()`
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

In `admin.controller.ts`, add imports:

```typescript
import { AdminSystemService } from './admin-system.service';
import { updateSystemSettingSchema } from '@/server/modules/feature-flag/feature-flag.types';
```

Then add the actions:

```typescript
export async function adminGetSystemSettingsAction(): Promise<
  ActionResponse<{ settings: Array<{ id: string; key: string; value: string; label: string | null; createdAt: string; updatedAt: string }> }>
> {
  const { error } = await requireAdminSession();
  if (error) return { error };

  try {
    const settings = await AdminSystemService.getSettings();
    return { success: true as const, data: { settings: serialize(settings) } };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to fetch settings',
    };
  }
}

export async function adminUpdateSystemSettingAction(
  data: unknown
): Promise<ActionResponse> {
  const { error } = await requireAdminSession();
  if (error) return { error };

  const parsed = updateSystemSettingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  try {
    await AdminSystemService.updateSetting(parsed.data.key, parsed.data.value);
    return { success: true as const };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to update setting',
    };
  }
}
```

**Note:** `adminGetSystemSettingsAction` wraps the result in `serialize()` because `SystemSetting` has `createdAt` and `updatedAt` Date fields that must be converted to ISO strings before crossing the server/client boundary.

### Step 3: Create SystemSettingsTable component

A simple editable table. Each row: key (read-only), label, current value (editable input), save button.

File: `components/modules/admin/SystemSettingsTable.tsx`

- Use inline editing (click value cell to edit, blur or enter to save)
- Show toast on save success/failure
- Use `useServerAction` hook from `@/hooks/use-server-action` for the save mutation, OR use `useTransition` directly since each row needs independent loading state
- Call `adminUpdateSystemSettingAction({ key, value })` -- object payload, not positional args

### Step 4: Update admin system page

The existing `app/(authenticated)/admin/system/page.tsx` currently shows cron run logs. Add a "System Settings" section above or below it:

```tsx
import { AdminSystemService } from '@/server/modules/admin/admin-system.service';
import { SystemSettingsTable } from '@/components/modules/admin/SystemSettingsTable';
import { serialize } from '@/lib/serialization';

// In the page component:
const settings = await AdminSystemService.getSettings();

// In the JSX, add section:
<div className='space-y-6'>
  <h2 className='text-xl font-bold'>System Settings</h2>
  <SystemSettingsTable initialSettings={serialize(settings)} />
</div>
```

**Acceptance criteria:**
- System settings table renders all SystemSetting records
- Admin can edit the value inline and save via `adminUpdateSystemSettingAction({ key, value })`
- `serialize()` applied when passing settings from server component to client component (Date fields)
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

**Important:** After adding a new key to `FEATURE_KEYS`, the Zod `z.enum()` for `flagKey` in `setUserFeatureSchema` and `resetUserFeatureSchema` will automatically pick it up because they derive from `Object.values(FEATURE_KEYS)`.

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
| `server/modules/feature-flag/feature-flag.types.ts` | Feature keys, route map, Zod schemas, types |
| `server/modules/admin/admin-system.service.ts` | System settings CRUD |
| `components/modules/admin/SystemSettingsTable.tsx` | Admin system settings UI |
| `lib/feature-gate.ts` | Reusable `requireFeature()` guard (uses `getAuthenticatedUser()`) |

### Modified files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `UserFeature`, `SystemSetting` models; add relation to `User` |
| `prisma/seed.ts` | Add `invoices` + `bulk_pdf_export` flags; seed admin overrides; seed system settings |
| `server/lib/cache-tags.ts` | Add `FEATURE_FLAGS: 'feature-flags'` tag |
| `server/modules/admin/admin.controller.ts` | Add 5 new actions (user features + system settings) with `ActionResponse<T>` types, Zod validation, `serialize()` on Date data, `invalidateTags(CACHE_TAGS.FEATURE_FLAGS)` |
| `server/modules/admin/admin-content.service.ts` | Enhance `getFeatureFlags()` with override counts |
| `components/modules/admin/UserDetailDrawer.tsx` | Add Features section with toggle/reset UI, `useTransition` wrapping, object payloads |
| `components/modules/admin/FeatureFlagTable.tsx` | Add override count column |
| `app/(authenticated)/layout.tsx` | Fetch resolved features, compute `disabledSidebarKeys` as `string[]`, pass to sidebar |
| `components/common/app-sidebar.tsx` | Accept `disabledSidebarKeys?: string[]` prop, filter nav items |
| `app/(authenticated)/admin/system/page.tsx` | Add system settings section with `serialize()` |
| `app/(authenticated)/recurring/page.tsx` | Add `requireFeature('recurring_transactions')` guard |
| `app/(authenticated)/goals/page.tsx` (or layout) | Add `requireFeature('goals')` guard |
| `app/(authenticated)/import/page.tsx` (or layout) | Add `requireFeature('csv_import')` guard |
| Routes under clients/entries/invoices | Add `requireFeature('invoices')` guard |

### Architecture patterns applied
| Pattern | Reference | Applied in |
|---------|-----------|------------|
| `ActionResponse<T>` return type | `server/lib/action-types.ts` | All new controller actions |
| `{ error: string }` on failure (no `success` field) | `server/lib/action-types.ts` | All error paths |
| `{ success: true as const, data: T }` on success | `goal.controller.ts` | All success-with-data paths |
| `(data: unknown)` + Zod `safeParse` | `goal.controller.ts` | Mutation actions |
| `invalidateTags(CACHE_TAGS.X)` | `server/actions/cache.ts` | Cache invalidation (never `clearCache`) |
| `serialize()` on Prisma Date/Decimal data | `lib/serialization.ts` | Flags, settings returned to client |
| `getAuthenticatedUser()` | `server/lib/auth-guard.ts` | `lib/feature-gate.ts` |
| `string[]` not `Set<string>` for serialization | Server/client boundary rule | `disabledSidebarKeys` prop |
| `useTransition` for mutations | `hooks/use-server-action.ts` pattern | UserDetailDrawer handlers |
| Deferred `unstable_cache` | Performance pragmatism | Feature resolution queries |

### Feature resolution flow
```
User visits /goals
  -> layout.tsx: FeatureFlagService.getResolvedFeaturesForUser(userId)
      -> Query: global flags + user overrides
      -> Merge: user override wins
      -> Return: { goals: false, ... }
  -> Sidebar: 'Goals' item hidden (disabledSidebarKeys: string[] includes 'Goals')
  -> requireFeature('goals') in goals page: redirect to /dashboard
```

### Admin UX flow
```
Admin opens User Detail Drawer for "Jane"
  -> Features section loads via adminGetUserFeaturesAction({ userId })
      -> Returns { success: true, data: { flags: [...], overrides: {...} } }
      recurring_transactions  [Default] [ON]     <- global is ON, no override
      csv_import              [Custom]  [OFF] [x] <- user override: OFF
      goals                   [Default] [ON]
      invoices                [Custom]  [ON]  [x] <- user override: ON
      ai_features             [Default] [OFF]
  -> Admin toggles csv_import ON
      -> startFeatureTransition -> adminSetUserFeatureAction({ userId, flagKey, enabled: true })
      -> Zod validates flagKey is known FEATURE_KEY
      -> Upserts UserFeature(jane, csv_import, true)
      -> invalidateTags(CACHE_TAGS.FEATURE_FLAGS)
  -> Admin clicks reset on invoices
      -> startFeatureTransition -> adminResetUserFeatureAction({ userId, flagKey })
      -> Deletes UserFeature(jane, invoices) -> falls back to global
      -> invalidateTags(CACHE_TAGS.FEATURE_FLAGS)
```
