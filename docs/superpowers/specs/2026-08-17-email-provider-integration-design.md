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
├── email.config.ts           # email's view of the shared integrations table
├── email.quota.ts            # daily quota guard + priority tiers
├── email.controller.ts       # admin server actions (getConfig/updateConfig/sendTest)
├── email.types.ts            # Zod schemas
└── providers/
    ├── registry.ts           # PROVIDERS map — mirrors server/modules/automation/registry.ts
    └── resend.provider.ts    # the only adapter today

server/modules/integration/
└── integration.service.ts    # shared storage/crypto/active-flag for ALL integrations

server/lib/
└── crypto.ts                 # AES-256-GCM seal/open, shared
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

export type SendResult = { providerMessageId: string; provider: IntegrationProvider };

export interface EmailProvider {
  readonly key: IntegrationProvider;
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
| Auth | a **single** API key (`re_...`) as a Bearer token — no key/secret pair | Resend declares one credential field. Its webhook signing secret (Svix) is separate and only needed for inbound bounce events, which this app does not yet ingest. |

### Integration storage — one generic table

Every integration needs the same scaffolding: which provider, whether it is active,
encrypted credentials, and the last verification result. That lives once, in a generic
table, rather than being re-implemented per category.

```prisma
enum IntegrationCategory { EMAIL }    // SMS, PAYMENT, STORAGE later
enum IntegrationProvider { RESEND }   // TWILIO, STRIPE later

model Integration {
  id             String              @id @default(cuid())
  category       IntegrationCategory
  provider       IntegrationProvider
  isActive       Boolean             @default(false)
  credentials    String              @db.Text        // sealed JSON, secrets only
  settings       Json                @default("{}")  // non-secret properties
  lastVerifiedAt DateTime?
  lastError      String?             @db.Text
  createdAt      DateTime            @default(now())
  updatedAt      DateTime            @updatedAt

  @@unique([category, provider])
  @@index([category, isActive])
  @@map("integrations")
}
```

For EMAIL, `settings` holds `{ fromEmail, fromName, replyToEmail }`.

**The split.** `IntegrationService` owns storage, encryption, and the
one-active-per-category rule; it knows nothing about what a "from address" is. Each
category's own module owns what is specific: its settings schema, its credential keys, how
to verify, how to call the service. Adding an integration is an adapter plus two enum
values plus a Zod schema — no migration, no new table, no new admin panel.

**The cost, and how it is paid back.** `fromEmail` loses its `NOT NULL`. So the settings
schema is applied on **read** as well as on write: an active row whose JSON is invalid
resolves to `null` and mail simply does not send, rather than going out with an empty From
address. The admin panel deliberately tolerates the same invalid row and renders it blank,
so it can be fixed. Verified by test and by end-to-end run.

- **Encryption:** AES-256-GCM under `SECRET_ENCRYPTION_KEY` (32-byte base64), via
  `server/lib/crypto.ts`. Named and located generically because it protects integration
  secrets in general. Deliberately *not* `NEXTAUTH_SECRET`, which already silently governs
  unsubscribe-token validity (`report.service.ts:1100`) — rotating auth must not also
  render every stored credential unreadable.
- **`credentials` is sealed JSON, not a bare string.** Resend needs only `apiKey`; the JSON
  shape costs nothing today and means Resend's *separate* webhook signing secret can be
  added later as another key with no data migration. A sealed bare string is still read as
  `{ apiKey }`. Supplied credentials **merge** over stored ones with blanks dropped, so an
  untouched field keeps its secret.
- **Never leaves the server.** `getForAdmin()` reports `hasCredential: boolean` — never a
  value, not even masked. Write-only in the UI; redacted in logs and in `lastError`.
- **One active per category:** enforced in a transaction, scoped by category, so activating
  an email provider cannot disturb an SMS or payment integration.
- **Caching:** module-level cache busted on admin update via `invalidateTags`, plus a 60s
  TTL so multi-instance deploys converge without a restart.
- **No env fallback.** With no active row, email is unconfigured and sends throw
  `EmailNotConfiguredError`. Commit 1 shipped a bootstrap fallback; commit 2's admin UI
  closed that window and removed it.

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
  provider          IntegrationProvider?
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
| `SMTP_USER` / `SMTP_PASS` (`.env.example`, `docker-compose.yml:21-22`) | a row in `integrations` + `SECRET_ENCRYPTION_KEY` |
| `EMAIL_FROM = process.env.SMTP_USER` (`email.service.ts:13`) | `EmailProviderConfig.fromEmail` |
| `ADMIN_EMAIL = process.env.SMTP_USER` (`feature-request.service.ts:7`) | **`admin_notification_email` SystemSetting.** Must land in the same commit — `:109` returns early when unset, so feature-request mail would die silently. |

## Environment variables

Note `.gitignore` ignores `.env*` including `.env.example`, so that file is not a shared
reference — this table is the committed source of truth. All are also wired into
`docker-compose.yml`.

| Variable | Required | Purpose |
|---|---|---|
| `SECRET_ENCRYPTION_KEY` | **yes** | AES-256-GCM key for stored integration secrets. `openssl rand -base64 32`. |
| `EMAIL_DAILY_LIMIT` | no | Daily send budget. Defaults to `100` (Resend free tier). |
| `EMAIL_DAILY_RESERVE` | no | Of that budget, how much is held for CRITICAL/HIGH. Defaults to `40`. |
| `ADMIN_NOTIFICATION_EMAIL` | no | Feature-request recipient when the `admin_notification_email` setting is blank. |

**Removed:** `SMTP_USER`, `SMTP_PASS`.

**Deliberately NOT env vars.** The provider API key and sender identity
(`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`) are entered in the
app under Admin → System and stored encrypted in `email_provider_configs`. Commit 1
shipped an env bootstrap fallback for them; commit 2 removed it. Reading the key from env
would defeat the no-redeploy rotation that DB storage was chosen for, and would leave the
same secret in two places. `SECRET_ENCRYPTION_KEY` is the sole exception because it
encrypts that table and so cannot live inside it.

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

### Migration catch — solved generically, not as a one-off

Existing users have no `UserNotificationPreference` rows, so they inherit `defaultEnabled`
live. Flipping `income_notifications` to false would silently stop mail they currently
receive.

Rather than a one-off data migration, `NotificationService.syncTypes()` detects **any**
default going true → false and backfills explicit `enabled: true` rows for users with none,
*before* writing the new default. So every future default change is protected by the same
mechanism, and the ordering cannot be got wrong by hand.

It is also fail-safe if the seed never runs: no sync means no flip, so behaviour is
unchanged rather than half-applied. Verified against the real DB — an existing user with no
row kept `income_notifications` on via a written row, a freshly created account inherited
off with zero rows written, and a second run backfilled nothing.

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
- `replyTo` → **`user.email`** — the account address (`invoice.service.ts:150`)

No migration, no new settings field, and invoices immediately reply to the freelancer.

⚠️ **Corrected 2026-08-18.** This section originally specified `replyTo` as
`notificationEmail ?? email`. The shipped code uses `user.email` only. That is arguably
the better behaviour — `notificationEmail` governs where a user reads *their own* app
mail, not where their clients should reach them — but the spec described something the
code never did. Believe the code.

Non-invoice mail sets no per-send `replyTo`, so it falls back to the app-level
`replyToEmail` in the provider config (blank by default → replies land on the `From`
address).

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
| **2** | `/admin/system` provider section + send-test; env bootstrap removed | **done** |
| **2b** | `SECRET_ENCRYPTION_KEY` rename; generic `integrations` table replaces `email_provider_configs` | **done** |
| **3** | Code-side notification registry + shared `NotificationPreferencesCard` + HTML escaping + default preservation | **done** |
| **4** | 6 of the 7 new owner-facing types and their triggers | **done** |
| **4b** | `weekly_summary` (needs `generateMonthlyDigest` re-parameterized to a date range) | |
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

## Implementation notes — commit 2

- **Env bootstrap removed.** `readEnvBootstrap()` is gone and `ResolvedEmailConfig` lost
  its `isBootstrap` flag. The active DB row is now the only source of provider config.
- **`requireAdminSession` moved to `server/lib/auth-guard.ts`.** It was private to
  `admin.controller.ts`; the email controller needs the same ADMIN-role-plus-sudo gate, and
  a `'use server'` module cannot safely export a shared helper (every export becomes a
  callable action endpoint). `admin.controller.ts` now imports it.
- **Bug caught by its own test:** the first cut of `EmailConfigService.upsert` inlined
  `seal(input.apiKey!)` inside a Prisma `upsert`'s `create` block. JS evaluates that object
  even when only `update` is used, so saving a sender-identity change *without* re-entering
  the API key threw — precisely the flow the UI's "leave blank to keep" placeholder
  invites. Replaced with explicit `update` / `create` branches.
- **Credential handling across the boundary:** blank `apiKey` means "keep the stored one",
  never "clear it". `getForAdmin()` returns `hasCredential: boolean` and never the value;
  the client clears its own input on success so a key is not left in the DOM.
- **Test send is CRITICAL priority** so a spent daily quota cannot make a correctly
  configured provider look broken.
- Saving runs `verify()` immediately (Resend `domains.list`, no mail sent) and records
  `lastVerifiedAt` / `lastError`, so a bad key surfaces in the panel rather than later as a
  silently dropped password reset.

Verified end-to-end against the live Resend API: credential stored as `v1:` ciphertext with
no plaintext, decrypt correct, identity-only update preserved the key, and a deliberately
invalid key returned `validation_error` → mapped to a non-retryable failure with
`lastError` recorded.

## Implementation notes — commit 4

Six of the seven types shipped. **`weekly_summary` split into commit 4b**: it needs
`generateMonthlyDigest` re-parameterized from a month to an arbitrary date range, which is
report-math work that belongs behind the money-review gate on its own rather than bundled
with six unrelated triggers.

**`security_alerts` scoped to password changes.** Both paths are covered — the in-app change
(`notification.controller.ts`) and completing a forgot-password reset
(`auth.service.ts`). New-device sign-in alerts are **deferred**: there is no device or
session record to compare against, so "new device" would mean emailing on every sign-in.
That needs session tracking first, and shipping a spammy version would train users to
disable the one alert worth keeping.

**Shared email layout** at `notification.templates.ts`. Six types at once would otherwise
mean six copies of the same table markup; every caller string is escaped inside the helper
so a sender cannot forget. The existing budget-alert and income templates are deliberately
NOT migrated onto it — they work and are visually tuned, and re-rendering live mail through
a new path to save duplication is not a good trade. They can migrate when one next needs
editing.

**Overdue digest is one email per owner, not per invoice.** A freelancer with eight late
clients wants a list.

**`large_expense_alert` needs a threshold**, so `User.largeExpenseThreshold` was added and
the input sits inline under its own toggle in the preferences card, with a warning while
unset. This is why the type defaults to off: enabled-but-unset must stay silent.

### Money-review gate findings (commit 4)

The gate caught a bug I introduced and one that predated me.

1. **CRITICAL — `processOverdue` lost its status guard.** Rewriting the bulk `updateMany`
   into select-then-update narrowed the update to `id IN (...)`, dropping
   `status = SENT`. An invoice paid between the select and the update would have been
   flipped back to OVERDUE. Guard restored, plus a re-read so the digest describes what
   actually lapsed rather than what was merely a candidate — otherwise a freelancer would
   be told a paid invoice is overdue. Six tests cover the race.
2. **MAJOR (pre-existing) — `syncLinkedAccounts` wrote float-derived money.** It computed
   `Number(balance) - Number(baseline)` and wrote the result into a `Decimal(12,2)` column.
   Now `Prisma.Decimal.minus()`. I only extracted it to a variable, so this was not a
   regression, but it was in the diff and is the documented anti-pattern.
3. **MINOR — `addContribution` return shape.** My first cut returned milestone data from a
   method that previously returned nothing. The controller ignores it, so nothing broke, but
   it leaked internals into a public contract. Reverted to void.

Percentage maths for crossing checks stays in `Number` deliberately — those values are
compared against 50/100 and never written back, matching how budget alerts already work.

## Implementation notes — commit 3

- **Registry** at `server/modules/notification/notification.registry.ts` is now the source
  of truth; `prisma/seed.ts` calls `NotificationService.syncTypes()` instead of carrying its
  own copy of the list. Each definition records its rough monthly volume next to its
  default, so the reason for the default is not lost.
- **Default flip protection is generic** — see the migration-catch section above.
- **`NotificationPreferencesCard` extracted** to `components/modules/notification/`, out of
  `ProfilePage.tsx` (which shrank by ~350 lines). An `embedded` prop drops the Card chrome
  for the onboarding wizard's "Customize" disclosure, so the two surfaces cannot drift.
  Category grouping is now ordered by the registry rather than by row insertion order.
- **HTML escaping** via `server/lib/html.ts`, applied across all four email-sending services.
  The sharpest case was `feature-request.service.ts`, reachable from the *public,
  unauthenticated* form. Note the deliberate asymmetry: email **subjects** stay unescaped,
  because a subject is a plain-text header and escaping it would show a literal `&amp;` to
  the recipient. Comments mark this at each site so it is not "fixed" later.
- **`profile/page.tsx` now goes through the controller** rather than calling
  `NotificationService` directly, per the data-flow rule in CLAUDE.md.

## Implementation notes — commit 2b

Two corrections, both taken while the table still held zero rows.

**1. `EMAIL_CREDENTIALS_KEY` → `SECRET_ENCRYPTION_KEY`**, and the crypto module moved from
`server/modules/email/email.crypto.ts` to `server/lib/crypto.ts`. It protects integration
secrets generally, so neither the name nor the location should have been feature-scoped.
Dropped `maskCredential` at the same time: dead once the UI reported only *whether* a
credential exists, and keeping it implied secrets get echoed back masked, which they do not.

**2. `email_provider_configs` → a generic `integrations` table.** The per-category table
would have meant `sms_provider_configs`, `payment_provider_configs`, and so on, each
re-implementing identical scaffolding and each needing its own migration, service, and admin
panel. What is genuinely per-integration is adapter code, which has to be written either
way. Done now specifically because the table was empty — after a live key is configured in
prod, the same change would be migrating real credentials.

**Rejected along the way: a provider-declared `credentialFields` array** driving a dynamic
admin form. It read as good generality but bought almost nothing — you cannot add a provider
without writing an adapter regardless, so the only saving was one UI edit, and with a single
one-field provider it was machinery rendering exactly one input. Replaced with a concrete
`apiKey` on `ResolvedEmailConfig`. The sealed-JSON *storage* was kept, since that is what
avoids a data migration when Resend's webhook signing secret arrives.

Verified end-to-end: sealed JSON with no plaintext, settings-only save preserved the key and
updated reply-to, corrupted JSON settings resolved to `null` while the admin panel still
rendered the broken row, category-scoped deactivation, and a live Resend call still mapping
to the right failure.

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
