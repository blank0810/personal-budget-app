# Settings Restructure — /profile → /settings/*

**Date:** 2026-08-18
**Status:** implemented
**Trigger:** maintainer reported /profile was "a hassle to scroll all the way down"

## Problem

Six cards stacked in one column inside a single 1335-line `ProfilePage.tsx`. The
notification section had just grown from 3 toggles to 9 across 4 categories and keeps
growing — every feature ships an alert — so the page gets worse over time, not better.

## Council verdicts

Two agents were dispatched and disagreed on structure.

**budget-frontend** proposed 5 tabs on `/profile?tab=`, arguing tabs over left-nav (the
app shell already owns the left edge, so a second in-content sidebar reads as a layout bug)
and over accordion (expand two sections and you are back to one long scroll).

**founder** proposed 4 sections on real `/settings/*` routes, moving Business out and
cutting the SMS column.

**Resolution: founder's structure, frontend's execution.** The deciding argument was the
founder's: *the reason someone opens notification settings is having received an email they
did not want.* That makes the email footer the primary entry point, and it needs a stable,
redirectable, deep-linkable URL — which a query param is not. The frontend's objection to
path segments (duplicated fetches) dissolves with a shared layout, which is the standard
Next.js answer rather than a workaround.

## Structure

| Route | Contents |
|---|---|
| `/settings/profile` | Personal info — the landing section |
| `/settings/security` | Password + linked accounts |
| `/settings/notifications` | Preferences — **the URL our emails link to** |
| `/settings/invoicing` | Business identity, gated on the `invoices` feature flag |
| `/settings/data` | Export + destructive reset |

- `/settings` redirects to `/settings/profile`.
- `/profile` is a **permanent** redirect to `/settings/profile` and must stay: already-sent
  notification emails have it baked into their footers.
- Each page fetches only what its own section needs — cheaper than the single fat query the
  old page ran, and one slow section cannot delay the others.
- `SettingsNav` is a link row that scrolls horizontally on mobile and becomes a vertical
  rail from `lg`. Deliberately not a nested sidebar component.

## Decisions and why

- **Business moved out of Profile.** It is the sender identity printed on a document a
  client sees, not information about the user as a person. Most users never invoice, yet it
  sat second on the page, above Security, for everyone.
- **Linked Accounts merged into Security.** An OAuth provider IS a sign-in method, and the
  two were already coupled in code — the disconnect button is gated on whether a password
  exists.
- **"Danger Zone" renamed "Data & Privacy".** Nobody navigates toward a danger zone, but
  people do look for how to export their data. The export lives here and is no longer
  styled as destructive.
- **SMS column hidden.** Nine permanently-disabled switches plus a "coming soon" banner
  doubled the visual weight of the largest section for zero function. The channel enum,
  per-channel preferences, and `SMS_API_*` env vars all remain — this is display-only.
  Removing it also killed the split-state coupling where phone number was lifted into the
  page purely to gate those switches.

## Fixed along the way

- **Phone validator accepted Philippine numbers only** (`/^\+639\d{9}$/`), silently making
  the field unusable for every other country. Now general E.164.
- **A failed preferences fetch took down the whole page.** It now renders inline on the
  notifications section only — someone who arrived from an email to turn something OFF must
  still reach the master switch.
- `NotificationPreferencesCard` is unchanged apart from the SMS removal, so its `embedded`
  reuse in the onboarding wizard survives.

## Verification

Production build lists all seven routes and compiles clean. 206 tests passing, typecheck
clean, lint unchanged from baseline. Pages could not be rendered as a signed-in user from
this session — middleware 307s unauthenticated requests before the page runs.

## Follow-ups

- Contextual entry point to `/settings/invoicing` from the invoice editor, plus an inline
  prompt when the fields are empty on a first invoice.
- Touch targets on the nav are 44px; the rest of the app still uses `h-9` (~36px) controls.
