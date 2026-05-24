# Centralized Email-Notification Control + Delivery Email — Design

**Date:** 2026-05-24
**Status:** Approved for implementation (quick path, no verification)
**Branch target:** feat branch off `main`
**Skill provenance:** brainstormed via `superpowers:brainstorm` → `budget-feature-design` council (founder, lead-engineer, budget-frontend, budget-backend).

## Problem

Email-notification control is scattered across a per-type × per-channel grid, and **every** notification email hard-sends to the account `user.email`. There is:

- No single, obvious "do I want email notifications at all?" switch.
- No way to receive notifications at a different address than the login email (Google-OAuth users are fully locked in).

## Goal

1. A **master toggle** governing whether any notification email is sent.
2. A **delivery email** the user can set; blank = account email. Notification mail routes there.

## Verdict (founder)

**Build-smaller / Reshape.** Keep the existing per-type grid — do *not* collapse it into one switch (that throws away useful granularity + the unsubscribe flow). The master switch is an **additive convenience layer above** the grid. Rated P2 polish; lives entirely inside the profile/notifications page (no new sidebar item). Money-adjacent (income + budget alerts) → must pass the `money-feature-review` gate before merge.

## Scope

### IN
- Master `Email notifications` toggle. Gates **all** notification email. Composes with existing per-type EMAIL prefs via logical AND.
- Delivery-email field. `null` = use account email. If the typed value equals the account email, store `null` (keeps "follows account email" behavior automatically).
- Master gate applies to **EMAIL only** — the SMS column stays fully independent.

### OUT (hard boundaries)
- **Password reset** → always account `user.email`. Security: a notifications address must never be able to intercept a reset link. (`server/actions/auth.ts:45` — leave untouched.)
- **Invoice sent / receipt** → goes to the client (`invoice.clientEmail`), structurally unrelated. (`server/modules/invoice/invoice.service.ts` — leave untouched.)
- **Admin / feature-request** → system `ADMIN_EMAIL`. Untouched.
- **Email verification** → deferred (see Future Enhancements). User is sole user for now; trust-on-input is acceptable.

## Data Model

Two columns on `User` (`prisma/schema.prisma`). Both defaulted/nullable → defaults *are* the backfill, zero silent opt-out.

```prisma
model User {
  // ...existing...
  emailNotificationsEnabled Boolean @default(true)  // master gate
  notificationEmail         String?                 // delivery override; null => account email
}
```

Migration SQL:
```sql
ALTER TABLE "users"
  ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "notificationEmail" TEXT;
```
No data backfill needed. Run via `docker compose exec app npx prisma migrate dev`, then **restart the `app` container** (Prisma dev restart gotcha) before the dev server sees the new fields.

## Single Choke-Point

Add to `UserService` (`server/modules/user/user.service.ts`) — the only place that decides a notification recipient:

```ts
async resolveNotificationRecipient(userId: string): Promise<string | null> {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, emailNotificationsEnabled: true, notificationEmail: true },
  });
  if (!u.emailNotificationsEnabled) return null;   // master OFF → suppress email
  return u.notificationEmail ?? u.email;           // override or account email
}
```

Callers: `const to = await UserService.resolveNotificationRecipient(userId); if (!to) return; /* skip email only */`.

### Call sites that change (exactly 3 notification paths)
| File | Function | Change |
|---|---|---|
| `server/modules/notification/notification.service.ts` (~147/192) | `sendBudgetAlert` | Resolve `to` via choke-point; skip email block on `null`. Keep `user.name` for greeting (still use `getEmailAndName` for name). |
| `server/modules/notification/notification.service.ts` (~230/297) | `sendIncomeNotification` | Same. |
| `server/modules/report/report.service.ts` (~1033 `generateAndSend`, `to:` at ~1076) | monthly digest | Compute `to = resolveNotificationRecipient(userId)` **separately from the digest object**. Use it only for the `to:` field; leave `digest.userEmail` as account identity for in-content use. |

### Call sites that must NOT change
`server/actions/auth.ts:45` (password reset), `server/modules/invoice/invoice.service.ts` (client), `server/modules/feature-request/feature-request.service.ts` (admin). Boundary is enforced by *which function each path calls* — these read their recipient directly and never import the resolver.

## Gate Composition

The master gate lives **inside `isEnabled()`** for the EMAIL channel so no caller can forget it (single source of truth — avoids master vs per-type drift):

```ts
async isEnabled(userId, key, channel = 'EMAIL'): Promise<boolean> {
  if (channel === 'EMAIL') {
    const master = await UserService.getEmailNotificationsEnabled(userId);
    if (!master) return false;       // master short-circuits EMAIL only
  }
  // ...existing per-type lookup unchanged...
}
```

Effective email-send = `emailNotificationsEnabled` AND per-type `isEnabled(EMAIL)`. SMS path (`isEnabled(..., 'SMS')`) is unaffected. The existing `/api/unsubscribe` flow (flips the `monthly_report` per-type pref) keeps working and inherits the gate for free.

> Note: `resolveNotificationRecipient` *also* returns `null` when master is off, so the recipient check is belt-and-suspenders with the `isEnabled` gate. Keep both — `isEnabled` is the semantic gate, the resolver is the transport gate.

## Monthly-Report Skip (critical correctness)

In `generateAndSend`, a `null` recipient must skip **only the email send**, NOT:
- PDF generation / Vercel Blob upload / `MonthlyReport` record upsert (the in-app report must exist regardless of email delivery + idempotency dedup relies on `status = completed`).
- The independent SMS summary (`sendMonthlyReportSms`, gated by its own `isEnabled(..., 'SMS')`).

Scope the skip narrowly around the email-send step only. Do not early-return the whole function.

## Backend — Controller Actions

In `server/modules/notification/notification.controller.ts`, mirroring `updatePhoneNumberAction` (auth check → Zod `safeParse` → service → `invalidateTags(CACHE_TAGS.PROFILE)`):

| Action | Zod | Service |
|---|---|---|
| `updateEmailNotificationsEnabledAction(enabled: boolean)` | `z.object({ enabled: z.boolean() })` | `UserService.setEmailNotificationsEnabled(userId, enabled)` |
| `updateNotificationEmailAction(email: string \| null)` | `z.object({ email: z.string().email().nullable() })` | `UserService.setNotificationEmail(userId, email)` — normalizes `email === account email` → `null` |

`UserService` additions: `getEmailNotificationsEnabled`, `setEmailNotificationsEnabled`, `setNotificationEmail`, `resolveNotificationRecipient`. Cache tag: `CACHE_TAGS.PROFILE` only.

## Frontend — UX

Inside `NotificationPreferencesCard` (`components/modules/profile/ProfilePage.tsx` ~905–1077). ASCII hierarchy:

```
Email Notifications                         [ ON ]  ← master switch
  Sending to: you@account.com   [Edit]              ← collapses/hidden when master OFF
    (editing) [ custom@email.com ] [Save] [Cancel]
  ─────────── divider ───────────
                            EMAIL   SMS
  Reports / Alerts / Activity  [grid as today]      ← EMAIL col greyed+tooltip when master OFF
```

- **Master switch**: optimistic flip → `updateEmailNotificationsEnabledAction`; on error revert + `animate-shake` (new `shakingMaster`) + `toast.error`.
- **Delivery email**: inline edit (no modal). Input `value` prefilled with current delivery email or account email; placeholder = account email. **Non-optimistic** save (spinner, can't preview). Success → exit edit, show address, toast. Error → stay in edit, inline `text-destructive` message.
- **Clear + save** → store `null`, display reverts to account email.
- **When master OFF**: delivery-email row hidden; per-type EMAIL `Switch`es `disabled opacity-40` wrapped in existing `Tooltip` ("Turn on Email Notifications above"). On ON→last persisted per-type state restored (no reset). SMS column never affected.
- **Mobile**: edit row `flex-col sm:flex-row`; column header labels `hidden sm:inline` (icons only).
- New props on the card: `emailNotificationsEnabled: boolean`, `notificationEmail: string | null`, `accountEmail: string`.
- Reuse shadcn: `Switch`, `Input`, `Button` (size sm), `Tooltip*`, `Card*`, sonner `toast`. New icons: `Pencil` (+ optional `AlertCircle` for "different from account email" note). All already installed.

## Risks (ranked)

1. **Security — reset hijack.** Mitigated structurally: resolver imported only by the 3 notification paths; `auth.ts` reads `user.email` directly. QA assertion: `sendPasswordReset` unreachable from `resolveNotificationRecipient`.
2. **Monthly-report over-skip.** Skip email send only; keep PDF/blob/record + SMS. Test master-off path produces report + SMS but no email.
3. **Deliverability black-hole.** A typo'd delivery address silently drops financial alerts. Accepted for v1 (single user). The "different from account email" note nudges; verification deferred.

## Implementation Order

Backend first (data model + choke-point + gate + actions), then frontend (card UI + props from server page), then `money-feature-review` gate, then `release-checklist` for the version bump.

## Future Enhancements (explicitly deferred)

- **Non-blocking email verification**: add `notificationEmailVerified Boolean @default(false)` + token columns; `/api/verify-notification-email` (HMAC binding `userId:email:expiry`, **must be added to `middleware.ts` allowlist**, test logged-OUT); resolver returns override only when verified, else falls back to account email (never goes dark). Lead + backend recommend this once there are real external users.
- Extend `/api/unsubscribe` one-click scope beyond `monthly_report` as more email types are added (CAN-SPAM hygiene).
