# Profile Page (#24) & Budget + Income Notifications (#23) — Design

**Date:** 2026-02-10
**Status:** Draft
**Depends on:** #3 (Email service), #10 (Google OAuth), #4+9 (Monthly reports)

---

## Overview

Two features designed together because #24 (Profile page) provides the preferences infrastructure that #23 (Notifications) requires.

- **#24 Profile Page:** Centralized user settings — personal info, password management, linked OAuth accounts, notification preferences. Includes a full sidebar redesign using shadcn's Sidebar component with collapsible icon mode.
- **#23 Budget + Income Notifications:** Threshold-crossing budget alerts (80%/100%) and income confirmation emails, with per-user opt-out via the Profile page.

---

## Part 1: Sidebar Redesign

### Why

Replace the custom sidebar (`sidebar-nav.tsx`, `mobile-sidebar.tsx`, manual `<aside>` in layout) with shadcn's `<Sidebar>` component. Gains: collapsible icon mode (collapse to icons, expand on hover/click), built-in mobile sheet, NavUser footer for profile access.

### Structure

```
<SidebarProvider>
  <AppSidebar collapsible="icon">
    <SidebarHeader>       → Wallet icon + "Budget Planner"
    <SidebarContent>      → Nav items with collapsible Transactions group
    <SidebarFooter>       → NavUser (avatar + name + dropdown)
    <SidebarRail />       → Click/hover to toggle collapse
  </AppSidebar>
  <SidebarInset>
    <header>              → Mobile: SidebarTrigger hamburger
    <main>{children}</main>
  </SidebarInset>
</SidebarProvider>
```

### Collapse Behavior

- **Expanded (default):** Full labels visible, 256px wide
- **Collapsed:** Icons only (~48px), tooltips on hover, state persisted via cookie
- **Mobile:** Renders as sheet from left, SidebarTrigger in mobile header

### NavUser Footer

- **Expanded:** Avatar initials circle + name + email (truncated) + chevron
- **Collapsed:** Avatar circle only
- **Dropdown menu:** Profile link (`/profile`) + Sign Out action
- Opens right on desktop, bottom on mobile

### Navigation Items

- Top-level: Dashboard, Budgets, Accounts, Reports, Updates — icon + label, tooltip when collapsed
- Transactions group: Collapsible submenu (Income, Expenses, Transfers, Payments) — dropdown submenu when sidebar collapsed

### Files Changed

| File | Action |
|------|--------|
| `components/common/app-sidebar.tsx` | New — main sidebar component |
| `components/common/nav-user.tsx` | New — footer user dropdown |
| `components/common/nav-items.ts` | Refactored — match shadcn data shape |
| `components/common/sidebar-nav.tsx` | Removed |
| `components/common/mobile-sidebar.tsx` | Removed |
| `app/(authenticated)/layout.tsx` | Rewritten — SidebarProvider + SidebarInset |

---

## Part 2: Profile Page

### Route

`app/(authenticated)/profile/page.tsx`

### Layout

Single scrollable page with 4 card sections. Page header: large avatar circle (user initials) + "Your Profile" heading + member since muted text.

### Card 1 — Personal Info

- Fields: Name (editable), Email (read-only with lock icon)
- Inline editing: fields display as styled text, click Edit pencil to make editable, Save/Cancel buttons fade in
- Server action: `updateProfileAction({ name })` with Zod validation (min 2 chars)
- Feedback: toast via sonner — "Profile updated"

### Card 2 — Security

- **Has password:** Current Password + New Password + Confirm Password fields, "Update Password" button
- **No password (Google-only):** Info banner with shield icon, New Password + Confirm only, "Set Password" button
- Password strength indicator: animated bar (red → yellow → green)
- Show/hide toggle (eye icon) on password fields
- Server action: `updatePasswordAction({ currentPassword?, newPassword, confirmPassword })`
- Feedback: toast + clear fields on success

### Card 3 — Linked Accounts

- Row per provider: icon + name + email + status badge
- Connected: green "Connected" badge + "Disconnect" button
- Not connected: "Connect Google" button with Google icon
- Disconnect blocked if no password set — warning message
- Confirmation dialog before disconnect
- Server action: `disconnectProviderAction(provider)`, connect via NextAuth OAuth redirect

### Card 4 — Notification Preferences

- Grouped by category (section headers: "Reports", "Alerts", "Activity")
- Each row: Switch toggle + label + description
- Rendered dynamically from `NotificationType` table — future types need zero UI changes
- Immediate save on toggle (optimistic UI, revert + shake on failure)
- Server action: `updateNotificationPreferenceAction(notificationTypeKey, enabled)`

### UI/UX Details

- Cards stagger-animate on load (50ms delay, fade-up)
- Hover elevation on cards (`hover:shadow-md transition-shadow`)
- Toggle switches with spring animation
- Skeleton loading state
- Toast notifications (sonner) for all save/error states

---

## Part 3: Schema Changes

### New Models

```prisma
model NotificationType {
  id             String  @id @default(cuid())
  key            String  @unique
  label          String
  description    String
  category       String
  defaultEnabled Boolean @default(true)

  userPreferences UserNotificationPreference[]

  @@map("notification_types")
}

model UserNotificationPreference {
  id                 String  @id @default(cuid())
  userId             String
  notificationTypeId String
  enabled            Boolean

  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  notificationType NotificationType @relation(fields: [notificationTypeId], references: [id], onDelete: Cascade)

  @@unique([userId, notificationTypeId])
  @@map("user_notification_preferences")
}
```

### User Model Changes

- Add relation: `notificationPreferences UserNotificationPreference[]`
- Remove: `monthlyReportEnabled Boolean @default(true)` (migrated to new tables)

### Seed Data

| key | label | description | category | defaultEnabled |
|-----|-------|-------------|----------|----------------|
| `monthly_report` | Monthly Financial Report | Receive a PDF financial digest on the 1st of each month | reports | true |
| `budget_alerts` | Budget Alerts | Get notified when a budget reaches 80% or exceeds 100% | alerts | true |
| `income_notifications` | Income Notifications | Get notified when income is recorded to your account | activity | true |

### Migration Plan

1. Create `notification_types` and `user_notification_preferences` tables
2. Seed 3 notification types
3. For each user where `monthlyReportEnabled = false`, insert override row with `enabled: false` for `monthly_report`
4. Drop `monthlyReportEnabled` from User

---

## Part 4: Notification Service

### Module Structure

```
server/modules/notification/
├── notification.types.ts       # Zod schemas
├── notification.service.ts     # Preferences + email triggers
└── notification.controller.ts  # Server actions
```

### NotificationService Methods

- `getPreferencesForUser(userId)` — All NotificationType rows merged with user overrides. Returns `{ key, label, description, category, enabled }[]`
- `updatePreference(userId, key, enabled)` — Upserts UserNotificationPreference row
- `isEnabled(userId, key)` — Quick boolean check
- `sendBudgetAlert(userId, budget, prevPercentage, newPercentage)` — Check preference, determine threshold (80/100), build HTML, send email
- `sendIncomeNotification(userId, income, account)` — Check preference, build HTML, send email

### Budget Alert Logic

Threshold-crossing detection (fires only when a threshold is actually crossed):

```
prevPercentage < 80  AND newPercentage >= 80  → warning email
prevPercentage < 100 AND newPercentage >= 100 → over-budget email
```

No deduplication tracking needed — crossing check is inherently deduplicated.

No queue — single-user, lightweight HTML emails. Fire-and-forget from controller (non-blocking, don't await).

### Income Notification Logic

Fires on every income creation (if enabled). Email contains: amount, category, account credited, new balance.

Same fire-and-forget pattern, no queue.

### Email Templates

Clean HTML emails matching existing branding (teal accent, "Budget Planner" header):

- **Budget warning:** Amount spent, budget limit, percentage, days remaining, link to budget page
- **Budget exceeded:** Same info with urgent tone, link to budget page
- **Income received:** Amount, category, account, new balance, link to income page

---

## Part 5: Integration Points

### Existing Code Changes

| File | Change |
|------|--------|
| `server/modules/expense/expense.controller.ts` | After create/update with budgetId: calculate prev/new %, call `NotificationService.sendBudgetAlert()` (fire-and-forget) |
| `server/modules/income/income.controller.ts` | After create: call `NotificationService.sendIncomeNotification()` (fire-and-forget) |
| `server/modules/report/report.controller.ts` | Replace `toggleMonthlyReportAction` / `getMonthlyReportPreference` with `NotificationService` calls |
| `app/api/cron/monthly-report/route.ts` | Replace `monthlyReportEnabled` query with `NOT EXISTS` on notification preferences |
| `app/api/unsubscribe/route.ts` | Call `NotificationService.updatePreference` instead of direct User update |
| `components/modules/reports/MonthlyReportToggle.tsx` | Removed — toggle now lives on Profile page |
| `components/modules/reports/SendReportDialog.tsx` | Stays on Reports page (manual trigger, not a preference) |

### What Does NOT Change

- `expense.service.ts` / `income.service.ts` — services stay pure business logic
- Queue infrastructure — budget/income alerts are direct sends, no BullMQ
- Monthly report PDF pipeline — unchanged, only the preference check moves

---

## Implementation Order

1. **Sidebar redesign** — Install shadcn sidebar, build AppSidebar + NavUser, rewrite layout, remove old components
2. **Schema + migration** — NotificationType, UserNotificationPreference, seed data, migrate monthlyReportEnabled
3. **Notification module** — notification.service.ts, notification.controller.ts, notification.types.ts
4. **Profile page** — /profile route with 4 cards, server actions, UI interactions
5. **Budget alerts** — Hook into expense controller, email template, threshold-crossing logic
6. **Income notifications** — Hook into income controller, email template
7. **Migrate existing code** — Update report controller, cron, unsubscribe endpoint, remove MonthlyReportToggle from Reports
