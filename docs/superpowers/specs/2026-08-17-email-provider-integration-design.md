# Email Provider Integration + User-Owned Notification Config

**Date:** 2026-08-17
**Status:** approved, implementation in progress
**Supersedes:** `docs/plans/2026-02-07-gmail-smtp-email-integration.md`

## Goal

Three outcomes, in priority order:

1. **Remove Gmail SMTP entirely.** No hardcoded `smtp.gmail.com`, no `nodemailer`, no
   `SMTP_USER` / `SMTP_PASS`.
2. **Make email delivery a pluggable integration** so additional providers can be added
   later without touching a single call site.
3. **Make every notification user-configurable on the user's own account**, disclosed
   during onboarding as "we already set this up for you". Nothing user-facing moves to
   the admin panel.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Provider scope | **App-level registry**, one active provider for the whole app | Per-user BYO has no user context for password reset or admin mail. Per-user *sender identity* still overridable. |
| Adapters at ship | **Resend only** | Gmail removed outright, not kept as a fallback adapter. |
| Config storage | **DB-backed, edited at `/admin/system`** | Switch provider and rotate keys with no redeploy, plus a real "send test" button. |
| Plan tier | **Resend free tier** (3,000/mo, 100/day) | Forces a quota guard into commit 1 rather than a later surprise. |
| Sending domain | `budget.umbra.build`, sending as `noreply@budget.umbra.build` | Subdomain isolates this app's sending reputation from the root domain. |
| Notification types | **All 13**, every one user-toggleable | Default *state* differs per type — see the volume table. |
| `security_alerts` | Configurable, `defaultEnabled: true` | Sits in the normal grid, no special-casing. |

## Architecture

### Module layout

```
server/modules/email/
├── email.service.ts          # PUBLIC API — signatures unchanged from the Gmail version
├── email.provider.ts         # EmailProvider interface, shared types, typed errors
├── email.config.ts           # resolve + cache the active provider config
├── email.crypto.ts           # AES-256-GCM seal/open for stored credentials
├── email.quota.ts            # daily quota guard + priority tiers
├── email.controller.ts       # admin server actions (getConfig/updateConfig/sendTest)
├── email.types.ts            # Zod schemas
└── providers/
    ├── registry.ts           # PROVIDERS map — mirrors server/modules/automation/registry.ts
    └── resend.provider.ts    # the only adapter today
```

The four existing public methods (`send`, `sendWithAttachment`, `sendInvoice`,
`sendInvoiceReceipt`, `sendPasswordReset`) keep their exact signatures. The abstraction
goes *underneath* the current API, so all five call sites are untouched:

- `server/actions/auth.ts:45`
- `server/modules/feature-request/feature-request.service.ts:174`
- `server/modules/invoice/invoice.service.ts:567` / `:653` / `:690`
- `server/modules/notification/notification.service.ts:197` / `:289`
- `server/modules/report/report.service.ts:1079`

### Provider interface

```ts
export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type EmailIdentity = {
  fromName: string | null;   // display name; null falls back to config.fromName
  replyTo: string | null;    // per-user reply address (invoice mail)
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  identity?: EmailIdentity;
  idempotencyKey?: string;
  tags?: Array<{ name: string; value: string }>;   // Resend's shape, deliberately
};

export type SendResult = { providerMessageId: string; provider: EmailProviderKey };

export interface EmailProvider {
  readonly key: EmailProviderKey;
  send(input: SendEmailInput, cfg: ResolvedEmailConfig): Promise<SendResult>;
  verify(cfg: ResolvedEmailConfig): Promise<{ ok: boolean; message: string }>;
}
```

Two error types the interface must normalize so callers stay provider-agnostic:

- **`EmailSendError { retryable: boolean }`** — lets BullMQ avoid burning its 3 attempts
  on a hard bounce, and lets `invoice.service.ts` distinguish "bad client email" from
  "provider down" in its `emailWarning`.
- **`EmailNotConfiguredError`** — thrown when no active config exists. Every existing
  caller's failure semantics then work unchanged: password reset throws to the user,
  notifications hit their `.catch(() => {})`, invoices return a warning, report jobs
  fail into retry.

### Resend API facts (verified 2026-08-17)

| Capability | Detail | Use here |
|---|---|---|
| `Idempotency-Key` header | max 256 chars, 24h window | Kills double-sends on BullMQ report retries. Key on `report:{userId}:{period}` and `invoice:{invoiceId}:{variant}`. |
| `text` auto-generated | from `html` when omitted | Closes the missing-plaintext spam-score gap for free. |
| `attachments[]` | `filename`, `content` (Buffer or base64), `content_type`; **40MB after base64** | Report + invoice PDFs pass comfortably. |
| `reply_to` / `replyTo` | string or array | The reply-to fix. |
| `tags` | array of `{name, value}`, **not** a plain object | Interface mirrors this so the next provider adapts to us. |
| `to` | max 50 addresses | We always send single-recipient. |
| Free tier | 3,000/month, **100/day** | Lower than Gmail's ~500/day — drives the quota guard. |

### Config model

```prisma
enum EmailProviderKey { RESEND }

model EmailProviderConfig {
  id             String           @id @default(cuid())
  provider       EmailProviderKey
  isActive       Boolean          @default(false)
  fromEmail      String
  fromName       String
  replyToEmail   String?          // app-level default reply-to
  credentials    String           @db.Text   // AES-256-GCM ciphertext
  lastVerifiedAt DateTime?
  lastError      String?          @db.Text
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@unique([provider])
  @@map("email_provider_configs")
}
```

- **Encryption:** AES-256-GCM under a dedicated `EMAIL_CREDENTIALS_KEY` (32-byte base64).
  Deliberately *not* `NEXTAUTH_SECRET`, which already silently governs unsubscribe-token
  validity (`report.service.ts:1100`) — rotating auth must not also brick mail.
- **Never leaves the server.** The controller returns a masked hint (`re_••••7f2a`) only.
  Write-only in the UI; redacted in logs and in `lastError`.
- **One active provider:** enforced in a transaction (deactivate others on activate).
- **Caching:** module-level cache busted on admin update via `invalidateTags`, plus a
  60s TTL so multi-instance deploys converge without a restart.
- **Bootstrap fallback:** with no active row, fall back to `RESEND_API_KEY` + `EMAIL_FROM`
  from env. Removes the "migrated but not yet configured = all mail down" window and
  gives local dev a zero-click path.

### Send log, quota guard, priority

One table serves three purposes: daily quota counter, the audit trail the current system
completely lacks, and idempotency-key storage.

```prisma
enum EmailPriority {
  CRITICAL   // password reset, security alerts — never quota-suppressed
  HIGH       // client-facing invoice mail — the user's business depends on it
  NORMAL     // digests, budget/income alerts — first to be suppressed
}

enum EmailStatus { SENT  FAILED  SUPPRESSED_QUOTA  SKIPPED_PREF }

model EmailSendLog {
  id                String        @id @default(cuid())
  userId            String?       // null for admin/system mail
  notificationKey   String?       // null for transactional
  priority          EmailPriority
  status            EmailStatus
  provider          EmailProviderKey?
  recipient         String
  subject           String
  providerMessageId String?
  idempotencyKey    String?       @unique
  error             String?       @db.Text
  createdAt         DateTime      @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([userId, createdAt])
  @@map("email_send_logs")
}
```

Quota check before each send: indexed `count` of `status = SENT` rows since start of day.
`NORMAL` is suppressed at 40 remaining; `CRITICAL` and `HIGH` always send. A suppressed
send writes a `SUPPRESSED_QUOTA` row so the cause is visible instead of mysterious.

Also drop the report batch size from 50 to **40** (`report.queue.ts:68` default and
`registry.ts:39`), reserving ~60/day of headroom for transactional mail.

Binding constraint is actually the monthly cap, not the daily one: 40 reports/day × 30 =
1,200, leaving ~1,800/month for everything else.

## What gets deleted

| Removed | Replacement |
|---|---|
| `nodemailer` dep + the `createTransport` singleton (`email.service.ts:3-11`) | `resend` + provider registry |
| `SMTP_USER` / `SMTP_PASS` (`.env.example`, `docker-compose.yml:21-22`) | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_CREDENTIALS_KEY` |
| `EMAIL_FROM = process.env.SMTP_USER` (`email.service.ts:13`) | `EmailProviderConfig.fromEmail` |
| `ADMIN_EMAIL = process.env.SMTP_USER` (`feature-request.service.ts:7`) | **`admin_notification_email` SystemSetting.** Must land in the same commit — `:109` returns early when unset, so feature-request mail would die silently. |

## Environment variables

Note `.gitignore` ignores `.env*` including `.env.example`, so that file is not a shared
reference — this table is the committed source of truth. All are also wired into
`docker-compose.yml`.

| Variable | Required | Purpose |
|---|---|---|
| `EMAIL_CREDENTIALS_KEY` | **yes**, to store a provider config | AES-256-GCM key for credentials at rest. `openssl rand -base64 32`. |
| `RESEND_API_KEY` | bootstrap only | Used when no active DB config exists. |
| `EMAIL_FROM` | bootstrap only | Envelope sender, e.g. `noreply@budget.umbra.build`. |
| `EMAIL_FROM_NAME` | no | Default display name. Defaults to `Budget Planner`. |
| `EMAIL_REPLY_TO` | no | App-level default reply-to. |
| `EMAIL_DAILY_LIMIT` | no | Daily send budget. Defaults to `100` (Resend free tier). |
| `EMAIL_DAILY_RESERVE` | no | Of that budget, how much is held for CRITICAL/HIGH. Defaults to `40`. |
| `ADMIN_NOTIFICATION_EMAIL` | no | Feature-request recipient when the `admin_notification_email` setting is blank. |

**Removed:** `SMTP_USER`, `SMTP_PASS`.

## Notification types — all user-configurable

**Source of truth moves from `prisma/seed.ts:92` to a code-side registry** upserted on
migrate, mirroring `server/modules/automation/registry.ts:48`. Today a type is a seeded DB
row, so adding one needs a seed run and the pref key can drift from the code that checks
it.

### Volume and defaults

| Key | Sends/mo (active user) | Default | Status |
|---|---|---|---|
`monthly_report` | 1 | ON | exists |
`budget_alerts` | 2–10 (≤2 per budget) | ON | exists |
`income_notifications` | **10–30** (one per income record) | **OFF** | exists, default flips |
`invoice_overdue_owner` | 1 per overdue invoice | ON | new |
`security_alerts` | 1 per new-device sign-in | ON | new |
`goal_milestone` | a few per year | ON | new |
`import_complete` | 1 per import | ON | new |
`large_expense_alert` | unbounded, threshold-dependent | OFF | new |
`weekly_summary` | ~4.3 | OFF | new |
`invoice_paid_owner` | 1 per payment | OFF | new |
`invoice_send_on_mark_sent` | 1 per invoice | ON | new (default for an existing checkbox) |
`invoice_receipt_on_paid` | 1 per payment | ON | new (default for an existing checkbox) |
`invoice_overdue_client_reminder` | 1 per overdue invoice | **OFF** | new — auto-mailing a client from a cron is a trust decision |

All ON ≈ 45/user/month → free tier breaks at ~65 active users.
Recommended defaults ≈ 16/user/month → ~185 active users.

### Migration catch

Existing users have no `UserNotificationPreference` rows, so they inherit `defaultEnabled`
live (`notification.service.ts:107`). Flipping `income_notifications` to false would
silently stop mail they currently receive. The migration must **write explicit
`enabled: true` rows for all existing users first, then flip the default** — new users get
the quiet default, existing users keep what they had.

### Never configurable

- **Password reset** (`auth.ts:45`) — security transactional.
- **Invoice resend** (`invoice.controller.ts:121`) — already an explicit user action.
- **Feature request → admin** — internal ops, governed by `admin_notification_email`.

### Governance rule

The master gate (`User.emailNotificationsEnabled`) governs **owner-facing mail only**.
Client-facing invoice mail is never suppressed by it — a user muting their own
notifications must not silently stop their clients receiving invoices.

## Sender identity — the reply-to fix, zero new columns

`email.service.ts:115` tells the client "simply reply to this email", but `From` is the
app's mailbox and no `replyTo` is set, so replies vanish. Derive both from data already on
`User`:

- `fromName` → `businessName ?? name` (schema:107 / :95)
- `replyTo` → `notificationEmail ?? email` (schema:104 / :103)

No migration, no new settings field, and invoices immediately reply to the freelancer.

## Onboarding — disclosure, not configuration

Insert as **step 4 of 5** at `components/modules/onboarding/OnboardingWizard.tsx:10`. The
progress bar already derives from `STEPS.length`, so it adapts on its own; the
`currentStep === n` chain needs renumbering (Complete 3 → 4).

```
Step 4 of 5 — Notifications

   ✓  We've already set this up for you

   Nothing to configure. Here's what's on:

   •  Monthly financial report — PDF digest on the 1st
   •  Budget alerts — at 80% and when you go over
   •  Overdue invoices — when a client misses a due date
   •  Goal milestones — at 50% and 100%
   •  Import summaries — when a CSV finishes
   •  Security alerts — new sign-ins, password changes

   Sending to  you@example.com    [Change]

   [ Customize ⌄ ]                      [ Sounds good → ]
```

Mechanics that make the claim honest:

- **Writes nothing to the database unless the user toggles something.** `isEnabled`
  already falls back to `NotificationType.defaultEnabled`, so an untouched user needs zero
  preference rows — "we set it up for you" is literally true rather than a screen
  pretending to save.
- `Customize` expands the *same* component the profile renders. Extract
  `NotificationPreferencesCard` (`ProfilePage.tsx:882`) into a shared component rather
  than building a second grid that drifts.
- Delivery-address line reuses `updateNotificationEmailAction`.
- No required input → primary CTA is "Sounds good", never "Save".
- Copy must not imply mail has already been sent.

## Commit plan

| # | Contents | Status |
|---|---|---|
| **1** | Provider layer + Resend adapter + `EmailProviderConfig` + encryption + `EmailSendLog` (quota/audit/idempotency) + `admin_notification_email` + nodemailer removed | **done** |
| **2** | `/admin/system` provider section + send-test | next |
| **3** | Code-side notification registry + shared `NotificationPreferencesCard` + HTML escaping + default-preservation migration | |
| **4** | The 7 new owner-facing types and their triggers | |
| **5** | Onboarding Notifications step | |

Commit 1 is the only one with rollback risk; 2–5 are additive.

Three of commit 4's seven need more than a registry entry:

- `large_expense_alert` — new threshold column on `User`
- `weekly_summary` — `generateMonthlyDigest` must take a date range, plus a new
  `AutomationSchedule` row
- `security_alerts` — hooks in the NextAuth sign-in callback and the password-change path

The other four ride triggers that already exist.

## Implementation notes — deltas from the design (commit 1)

Four things changed once the code met reality:

1. **Sender identity landed in commit 1, not 3.** `sendInvoice` / `sendInvoiceReceipt`
   already received `fromName` and `fromEmail` as parameters, so wiring them into the
   real `From` display name and `Reply-To` was free in the file being rewritten anyway.
   `invoice.service.ts` now derives the name as `businessName ?? name`, per the design.

2. **Keyed log rows upsert instead of insert.** The first cut stored
   `idempotencyKey: null` on failures so a failed attempt could not occupy the unique
   key and block its own retry. That worked but made `SUPPRESSED_QUOTA` invisible to
   lookups. Keyed messages now upsert, so the row is the message's current state
   (`SENT` / `FAILED` / `SUPPRESSED_QUOTA`) and a later successful retry updates it
   rather than colliding. Unkeyed messages still append.

3. **Fixed a latent report-delivery bug the quota guard would have made common.**
   `generateAndSend` marks the `MonthlyReport` row `completed` at step 4, *before*
   sending at step 5. The queue's dedup check only looked at that row, so any send
   failure left the report `completed` and every BullMQ retry short-circuited —
   losing the email permanently. `report.queue.ts` now also requires a recorded
   successful send (via the shared `reportEmailIdempotencyKey`) before treating a
   report as done. Pre-existing, but the quota guard turned it from rare into likely.

4. **Batch size 50 → 40** in both `report.queue.ts` (default) and `registry.ts`.

### Required follow-up before enabling the report cron on the free tier

A quota-suppressed monthly report is currently **deferred, not recovered**: the send
logs `SUPPRESSED_QUOTA`, the queue stops burning retries on it, and nothing re-enqueues
it — so that user misses that month's digest. The fix belongs with the notification
registry work: have the daily `process-reports` job re-enqueue reports whose
`MonthlyReport` row is `completed` but whose send log is `SUPPRESSED_QUOTA`. Until then
the guard is doing its primary job (never starving transactional mail) but the digest
tail is lossy under quota pressure.

Also noted, not fixed: two concurrent sends sharing an idempotency key could race on the
unique index and surface as a failure after the provider already accepted the message.
The worker runs `concurrency: 1`, so this is currently unreachable.

## Risks

1. **Free tier is 3,000/month and 100/day.** Mitigated by the quota guard + priority tiers
   + batch size 40. Without them, a report batch can starve a password reset.
2. **A live mail credential now sits in Postgres**, so every DB backup carries it.
   Mitigated by AES-256-GCM, write-only UI, and log redaction — but it is a genuinely new
   exposure the env-var design did not have. Accepted in exchange for no-redeploy rotation.
3. **Feature-request admin mail breaks silently** when `SMTP_USER` disappears. Must land in
   commit 1.
4. **Cutover window** where mail is down — removed by the env bootstrap fallback.
5. **Attachments through a new transport** — report and invoice PDFs must be verified
   end-to-end via the admin test-send before the cron is re-enabled.

## Incidental fixes (in scope, same files)

- **Unescaped user input in every template.** Sharpest at
  `feature-request.service.ts:144,161`, reachable from the *public unauthenticated* form.
  Add an `escapeHtml` helper and apply it at every interpolation of user-controlled text.
- **`profile/page.tsx:17` calls `NotificationService` directly**, bypassing the
  controller rule in CLAUDE.md.

## Explicitly out of scope

- Per-user BYO email provider (the interface leaves room; no code).
- Moving templates out of the services into a template layer.
- Bounce/complaint webhook ingestion.
- SMS. The channel enum, per-channel prefs, and `SMS_API_*` env vars stay untouched and
  unimplemented.
- Replacing the `Number()` conversions on money in invoice email rendering
  (`invoice.service.ts:110-121`) — pre-existing, unchanged by this work.

## Stale docs to correct

`CLAUDE.md` still documents `api/cron/monthly-report` and `api/cron/process-reports`.
Neither exists — it is a single `api/cron/scheduler` driving DB-backed
`AutomationSchedule` rows.
