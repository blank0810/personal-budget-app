# Invoice Payment Methods ("Get Paid") Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let a freelancer save structured "how clients pay me" methods (Wise link/Wisetag, GCash, bank, PayPal, other) once, and render them — with a scannable QR — on the invoice web view and the invoice PDF a client receives.

**Architecture:** A generic `PayoutMethod` child table on `User` (per-currency capable, provider-typed). Methods are snapshotted onto each invoice at send-time so a sent invoice never mutates. QR codes are generated **server-side** (the PDF and email render with no browser) via the `qrcode` package and reused on the web view. **No Wise API, no payment gateway, no changes to money/income flow** — that is Phase 2, deferred.

**Tech Stack:** Next.js 15 (App Router) server actions, Prisma 5 / PostgreSQL, React 19, Tailwind 4, shadcn/ui (New York), `@react-pdf/renderer` v4, `qrcode` (new dep). Type-check via `docker compose exec app npx tsc --noEmit`; lint via `docker compose exec app npm run lint`.

---

## Research basis (why this shape)

- **Wise has no payment-request API.** "Request money / Wisetag / payment links" is a Wise UI-only feature; the personal API token only *sends* money, and statement/funding APIs are region-locked (PH excluded). Confirmed via docs.wise.com. So this feature is a **link + QR on the invoice**, not an integration.
- Wise "Request money", Wisetag, payment links, and PHP receiving details **are** available to Philippines personal & business accounts — so a user can paste a real Wise link/Wisetag.
- Existing scaffolding to reuse: `User.paymentInstructions` already renders a free-text "How to Pay" box on the PDF; `Invoice.linkedIncomeId @unique` ↔ `Income` relation already exist (used in Phase 2, not here).

## Decisions locked by maintainer
1. **Phase 1 only** (display + QR). Mark-as-paid stays status-only; income stays manual. No money math touched.
2. **Generic** methods (Wise + GCash + Bank + PayPal + Other), Wise first-class.
3. Tithe/EF participation of invoice income → **decided in Phase 2** (out of scope here).

## Naming collision (MUST honor)
`server/modules/payment/` already exists and means **liability payments** (paying down a credit card/loan via `Transfer`). Do **not** name anything new `payment`/`Payment`. Use **`payout` / `PayoutMethod` / `PayoutProvider`**.

## Out of scope (Phase 2 / future — do NOT build here)
- Auto-creating an `Income` on mark-as-paid, FX handling, fee-as-expense, reversal, import dedupe (the money-touching half — separate gated PR; see `## Phase 2 pointer`).
- Partial/over/under payments, `PARTIALLY_PAID` status, `InvoicePayment` table.
- Real payment gateway, Wise webhooks.

## Testing convention note
This repo uses **vitest** (`npm test` → `vitest run`) with co-located `*.test.ts` files (e.g. `server/modules/income/income.service.test.ts`, `account.service.test.ts`). The two **pure functions** introduced (`resolvePayoutMethods`, the Zod schema) are written test-first as co-located vitest specs. Run a single file with `docker compose exec app npx vitest run <path>`. UI/PDF/service-with-Prisma tasks are verified with `tsc --noEmit` + lint + manual checks (DB-touching services here are thin; deeper service tests are a Phase-2 qa-engineer concern).

## Commit convention
`type(scope): description` under 72 chars. End each commit body with the Co-Authored-By trailer. Commit after each task.

---

### Task 1: Add the `qrcode` dependency

**Files:**
- Modify: `package.json` (+ lockfile)

**Step 1: Install (inside the container)**

Run:
```bash
docker compose exec app npm install qrcode && docker compose exec app npm install -D @types/qrcode
```
Expected: `qrcode` in `dependencies`, `@types/qrcode` in `devDependencies`, lockfile updated.

**Step 2: Verify it imports server-side**

Run:
```bash
docker compose exec app npx tsx -e "import QRCode from 'qrcode'; QRCode.toDataURL('https://wise.com/pay/me/test').then(d=>console.log(d.slice(0,30)))"
```
Expected: prints `data:image/png;base64,iVBOR…`.

**Step 3: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore(invoice): add qrcode dep for payout QR codes"
```

---

### Task 2: Schema — `PayoutMethod` table + provider enum + invoice snapshot

**Files:**
- Modify: `prisma/schema.prisma` (User model ~line 113; Invoice model ~line 571)

**Step 1: Add the enum and model**

Add near the other enums:
```prisma
enum PayoutProvider {
  WISE
  PAYPAL
  GCASH
  BANK
  OTHER
}
```

Add the model:
```prisma
model PayoutMethod {
  id             String         @id @default(cuid())
  userId         String
  provider       PayoutProvider
  label          String         // user-facing, e.g. "Wise USD"
  currency       String?        // per-currency receiving detail; null = any currency
  payLink        String?        // https://wise.com/pay/... / paypal.me / wisetag URL — drives the QR
  accountDetails String?        @db.Text // free-form bank/account lines (IBAN, routing, holder)
  showQr         Boolean        @default(true)
  isDefault      Boolean        @default(false)
  isArchived     Boolean        @default(false)
  sortOrder      Int            @default(0)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isArchived])
  @@index([userId, currency])
  @@map("payout_methods")
}
```

**Step 2: Wire the relations**

On `model User` add:
```prisma
  payoutMethods PayoutMethod[]
```
On `model Invoice` add (snapshot of resolved methods at send-time):
```prisma
  payoutSnapshot Json?
```
Keep `User.paymentInstructions` untouched — it remains the free-text fallback.

**Step 3: Migrate + regenerate + restart**

Run:
```bash
docker compose exec app npx prisma migrate dev --name payout_methods
docker compose exec app npx prisma generate
docker compose restart app
```
Expected: migration `*_payout_methods` created and applied; client regenerated. **Restart is mandatory** — without it the dev server throws stale "Unknown field" errors (known project gotcha).

**Step 4: Verify additive & non-destructive**

Run:
```bash
docker compose exec app npx prisma migrate status
```
Expected: up to date, no pending; existing `invoices`/`users` rows untouched (`payoutSnapshot` null, no `payout_methods` rows).

**Step 5: Commit**
```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(invoice): add PayoutMethod model + invoice payout snapshot"
```

---

### Task 3: Zod schema + shared types (pure, test-first)

**Files:**
- Create: `server/modules/payout/payout.schema.ts`
- Create: `server/modules/payout/payout.types.ts`
- Create: `server/modules/payout/payout.schema.test.ts`

**Step 1: Write the failing vitest spec**

`server/modules/payout/payout.schema.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { payoutMethodInputSchema, payoutMethodsInputSchema } from './payout.schema'

describe('payoutMethodInputSchema', () => {
  it('rejects a non-wise.com link for WISE', () => {
    expect(payoutMethodInputSchema.safeParse({ provider: 'WISE', label: 'x', payLink: 'http://evil.com' }).success).toBe(false)
  })
  it('accepts a wise.com link and a @wisetag', () => {
    expect(payoutMethodInputSchema.safeParse({ provider: 'WISE', label: 'Wise USD', payLink: 'https://wise.com/pay/me/abc' }).success).toBe(true)
    expect(payoutMethodInputSchema.safeParse({ provider: 'WISE', label: 'Wise', payLink: '@ehnandb123' }).success).toBe(true)
  })
  it('accepts BANK with accountDetails and no link', () => {
    expect(payoutMethodInputSchema.safeParse({ provider: 'BANK', label: 'BPI', accountDetails: 'Acct 1234 5678' }).success).toBe(true)
  })
  it('caps the list at 10', () => {
    expect(payoutMethodsInputSchema.safeParse(Array(11).fill({ provider: 'OTHER', label: 'x', accountDetails: 'y' })).success).toBe(false)
  })
})
```

**Step 2: Run it; verify it fails (module missing)**

Run: `docker compose exec app npx vitest run server/modules/payout/payout.schema.test.ts`
Expected: FAIL — cannot resolve `./payout.schema`.

**Step 3: Implement the schema**

`server/modules/payout/payout.schema.ts`:
```ts
import { z } from 'zod'

export const PAYOUT_PROVIDERS = ['WISE', 'PAYPAL', 'GCASH', 'BANK', 'OTHER'] as const

const wiseValue = (v: string) =>
  /^https:\/\/(www\.)?wise\.com\//.test(v) || /^@?[A-Za-z0-9]{2,}$/.test(v)

export const payoutMethodInputSchema = z
  .object({
    id: z.string().optional(),
    provider: z.enum(PAYOUT_PROVIDERS),
    label: z.string().trim().min(1).max(60),
    currency: z.string().trim().length(3).optional().nullable(),
    payLink: z.string().trim().max(500).optional().nullable(),
    accountDetails: z.string().trim().max(1000).optional().nullable(),
    showQr: z.boolean().default(true),
    isDefault: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  })
  .superRefine((m, ctx) => {
    if (m.provider === 'WISE') {
      if (!m.payLink || !wiseValue(m.payLink))
        ctx.addIssue({ code: 'custom', path: ['payLink'], message: 'Enter a wise.com link or @wisetag' })
    } else if (!m.payLink && !m.accountDetails) {
      ctx.addIssue({ code: 'custom', path: ['payLink'], message: 'Provide a link or account details' })
    }
  })

export const payoutMethodsInputSchema = z.array(payoutMethodInputSchema).max(10)
```

`server/modules/payout/payout.types.ts`:
```ts
import type { PayoutMethod, PayoutProvider } from '@prisma/client'
import type { z } from 'zod'
import type { payoutMethodInputSchema } from './payout.schema'

export type PayoutMethodInput = z.infer<typeof payoutMethodInputSchema>
// Plain shape rendered on invoice/PDF (snapshot or live):
export type PayoutMethodView = Pick<
  PayoutMethod,
  'provider' | 'label' | 'currency' | 'payLink' | 'accountDetails' | 'showQr'
>
export type { PayoutMethod, PayoutProvider }
```

**Step 4: Run spec; verify pass**

Run: `docker compose exec app npx vitest run server/modules/payout/payout.schema.test.ts`
Expected: 4 passing.

**Step 5: Commit**
```bash
git add server/modules/payout
git commit -m "feat(payout): add payout-method zod schema and types"
```

---

### Task 4: Resolution helper (pure, test-first)

Picks the method to show for a given invoice currency: exact-currency match → null-currency catch-all → `isDefault` → first; skips archived.

**Files:**
- Create: `server/modules/payout/payout.resolve.ts`
- Create: `server/modules/payout/payout.resolve.test.ts`

**Step 1: Failing vitest spec**

`server/modules/payout/payout.resolve.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { resolvePayoutMethods } from './payout.resolve'

const methods = [
  { provider: 'WISE', label: 'Wise USD', currency: 'USD', payLink: '@a', accountDetails: null, showQr: true, isArchived: false, isDefault: false, sortOrder: 0 },
  { provider: 'BANK', label: 'Any', currency: null, payLink: null, accountDetails: 'x', showQr: false, isArchived: false, isDefault: true, sortOrder: 1 },
  { provider: 'GCASH', label: 'Old', currency: 'PHP', payLink: '@g', accountDetails: null, showQr: true, isArchived: true, isDefault: false, sortOrder: 2 },
] as any

describe('resolvePayoutMethods', () => {
  it('returns currency match + null-currency catch-all, default first, archived excluded', () => {
    expect(resolvePayoutMethods(methods, 'USD').map((m: any) => m.label)).toEqual(['Any', 'Wise USD'])
  })
  it('returns only the catch-all when no active currency match (archived PHP excluded)', () => {
    expect(resolvePayoutMethods(methods, 'PHP').map((m: any) => m.label)).toEqual(['Any'])
  })
})
```
> Note: `Any` sorts first because it is `isDefault`. Adjust the assertion if you prefer currency-exact first — decide the ordering rule and encode it in both the test and `resolvePayoutMethods`.

**Step 2: Run; verify fail.** `docker compose exec app npx vitest run server/modules/payout/payout.resolve.test.ts` → FAIL (module missing).

**Step 3: Implement**

`server/modules/payout/payout.resolve.ts`:
```ts
import type { PayoutMethodView } from './payout.types'

type Resolvable = PayoutMethodView & { currency: string | null; isArchived: boolean; isDefault: boolean; sortOrder: number }

export function resolvePayoutMethods<T extends Resolvable>(methods: T[], invoiceCurrency: string): T[] {
  const active = methods.filter(m => !m.isArchived)
  const out = active.filter(m => m.currency === invoiceCurrency || m.currency == null)
  return out.sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.sortOrder - b.sortOrder)
}
```

**Step 4: Run; verify pass.** `docker compose exec app npx vitest run server/modules/payout/payout.resolve.test.ts` → passing.

**Step 5: Commit**
```bash
git add server/modules/payout/payout.resolve.ts server/modules/payout/payout.resolve.test.ts
git commit -m "feat(payout): add currency-aware payout-method resolver"
```

---

### Task 5: Server-side QR utility

**Files:**
- Create: `server/modules/payout/payout.qr.ts`

**Step 1: Implement**
```ts
import QRCode from 'qrcode'

/** Returns a base64 PNG data URI, or null if there is nothing to encode. */
export async function payLinkToQrDataUri(payLink: string | null | undefined): Promise<string | null> {
  if (!payLink) return null
  // Wisetag handle -> canonical Wise pay URL; full URLs pass through.
  const target = payLink.startsWith('@') ? `https://wise.com/pay/me/${payLink.slice(1)}` : payLink
  try {
    return await QRCode.toDataURL(target, { margin: 1, width: 256 })
  } catch {
    return null
  }
}
```

**Step 2: Verify**

Run:
```bash
docker compose exec app npx tsx -e "import {payLinkToQrDataUri} from '@/server/modules/payout/payout.qr'; payLinkToQrDataUri('@ehnandb123').then(d=>console.log(d?.slice(0,30)))"
```
Expected: prints a `data:image/png;base64,` prefix.

**Step 3: Commit**
```bash
git add server/modules/payout/payout.qr.ts
git commit -m "feat(payout): server-side QR data-uri helper"
```

---

### Task 6: Service — read/write payout methods

**Files:**
- Create: `server/modules/payout/payout.service.ts`

**Step 1: Implement**
```ts
import { prisma } from '@/lib/prisma'
import type { PayoutMethodInput } from './payout.types'

export const PayoutService = {
  async list(userId: string) {
    return prisma.payoutMethod.findMany({
      where: { userId, isArchived: false },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
    })
  },

  /** Full replace of the user's active methods (simplest correct model for a small set). */
  async replaceAll(userId: string, methods: PayoutMethodInput[]) {
    const hasDefault = methods.some(m => m.isDefault)
    return prisma.$transaction(async (tx) => {
      await tx.payoutMethod.updateMany({ where: { userId, isArchived: false }, data: { isArchived: true } })
      for (const [i, m] of methods.entries()) {
        await tx.payoutMethod.create({
          data: {
            userId,
            provider: m.provider,
            label: m.label,
            currency: m.currency ?? null,
            payLink: m.payLink ?? null,
            accountDetails: m.accountDetails ?? null,
            showQr: m.showQr,
            isDefault: hasDefault ? m.isDefault : i === 0,
            sortOrder: i,
          },
        })
      }
      return tx.payoutMethod.findMany({ where: { userId, isArchived: false }, orderBy: { sortOrder: 'asc' } })
    })
  },
}
```
> Archive-on-replace (not hard delete) preserves any historical reference and matches the app's soft-delete instinct. Snapshots (Task 7) mean already-sent invoices are unaffected regardless.

**Step 2: Verify type-check.** `docker compose exec app npx tsc --noEmit` → clean.

**Step 3: Commit**
```bash
git add server/modules/payout/payout.service.ts
git commit -m "feat(payout): payout-method service (list + replaceAll)"
```

---

### Task 7: Controller actions + snapshot on send

**Files:**
- Create: `server/modules/payout/payout.controller.ts`
- Modify: `server/modules/invoice/invoice.service.ts` (the `markAsSent` path, ~line 516)
- Check: `lib/cache-tags.ts` (reuse existing `PROFILE`/`INVOICES` tags; add none if present)

**Step 1: Controller**
```ts
'use server'
import { getAuthenticatedUser } from '@/server/actions/auth'
import { invalidateTags } from '@/server/actions/cache'
import { CACHE_TAGS } from '@/lib/cache-tags'
import { PayoutService } from './payout.service'
import { payoutMethodsInputSchema } from './payout.schema'

export async function getPayoutMethodsAction() {
  const user = await getAuthenticatedUser()
  return { data: await PayoutService.list(user.id) }
}

export async function savePayoutMethodsAction(input: unknown) {
  const user = await getAuthenticatedUser()
  const parsed = payoutMethodsInputSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.flatten() }
  const data = await PayoutService.replaceAll(user.id, parsed.data)
  await invalidateTags([CACHE_TAGS.PROFILE, CACHE_TAGS.INVOICES]) // PDFs embed payout block
  return { data }
}
```
> If `CACHE_TAGS.PROFILE`/`INVOICES` differ in name, use the existing constants — do not invent tags.

**Step 2: Snapshot resolved methods when an invoice is sent**

In `invoice.service.ts` `markAsSent` (and any create-and-send path), before/within the status update, compute and persist the snapshot:
```ts
import { resolvePayoutMethods } from '@/server/modules/payout/payout.resolve'
// ...inside markAsSent, after loading the invoice + its currency:
const methods = await prisma.payoutMethod.findMany({ where: { userId, isArchived: false } })
const payoutSnapshot = resolvePayoutMethods(methods as any, invoice.currency)
  .map(m => ({ provider: m.provider, label: m.label, currency: m.currency, payLink: m.payLink, accountDetails: m.accountDetails, showQr: m.showQr }))
// include in the same update:
data: { status: 'SENT', sentAt: ..., payoutSnapshot }
```
> Live invoice page reads live methods; the **PDF/email read the snapshot** (Task 9/10), so a client always sees what was on the invoice when sent.

**Step 3: Verify.** `docker compose exec app npx tsc --noEmit` → clean. Manually: send a draft invoice, confirm `payoutSnapshot` populated (`npx prisma studio`).

**Step 4: Commit**
```bash
git add server/modules/payout/payout.controller.ts server/modules/invoice/invoice.service.ts
git commit -m "feat(payout): payout actions + snapshot methods on invoice send"
```

---

### Task 8: Settings UI — manage payout methods

**Files:**
- Create: `components/modules/profile/PayoutMethodEditor.tsx`
- Modify: `components/modules/profile/ProfilePage.tsx` (`BusinessProfileCard`, ~line 401; payment block ~line 533)
- Modify: `app/(authenticated)/profile/page.tsx` (pass initial methods via `getPayoutMethodsAction`)

**Step 1: Build `PayoutMethodEditor`** (client component)
- List of rows; each row: provider `Select` (Wise/PayPal/GCash/Bank/Other), `label` `Input`, `currency` optional `Input` (3-letter), value field — `payLink` `Input` for WISE/PAYPAL/GCASH, `accountDetails` `Textarea` for BANK/OTHER, `showQr` `Switch`, `isDefault` radio, remove button, drag/reorder (or up/down buttons for v1).
- "Add payment method" button; max 10 (disable past 10).
- Save calls `savePayoutMethodsAction`; on `{error}`, map Zod `fieldErrors` to inline messages (match `InvoiceForm` error pattern); on success `toast` via `sonner`.
- Empty state: dashed-border nudge "Add your Wise link or bank details so clients know how to pay you."
- Anchor: wrap in a section with `id="payment-methods"` for deep-linking from the invoice empty state.

**Step 2: Mount in `BusinessProfileCard`**
- Render `<PayoutMethodEditor initial={...} />` above the existing `paymentInstructions` textarea; relabel the textarea "Additional payment notes (optional)".

**Step 3: Verify.** `npm run lint` + `npx tsc --noEmit` clean. Manual: add a Wise method, save, reload — persists; invalid Wise value shows inline error; mobile stacks.

**Step 4: Commit**
```bash
git add components/modules/profile/PayoutMethodEditor.tsx components/modules/profile/ProfilePage.tsx "app/(authenticated)/profile/page.tsx"
git commit -m "feat(profile): payout-method editor in business profile"
```

---

### Task 9: Invoice web view — "How to Pay" block + QR

**Files:**
- Create: `components/modules/invoice/InvoicePaymentMethods.tsx`
- Modify: `components/modules/invoice/InvoiceDetail.tsx` (`InvoicePreview`, insert between line items and totals ~line 293; status-aware)
- Modify: the invoice detail page data loader to pass resolved methods + QR data URIs

**Step 1: Resolve + QR on the server (page loader)**
- For the live page: load active methods, `resolvePayoutMethods(methods, invoice.currency)`, and for each with `showQr && payLink` compute `payLinkToQrDataUri`. Pass `{ method, qr }[]` to the client component.

**Step 2: `InvoicePaymentMethods` component**
- Renders each method: provider label, `label`, `accountDetails` (pre-wrapped), a **copy-link** button (writes `payLink` to clipboard, `sonner` "Copied", `aria-live`), an **Open** link (`<a href target=_blank rel="noopener noreferrer">`), and the QR `<img src={qr}>` with `role="img"` + `aria-label` containing the URL.
- Render only when invoice status is `SENT` or `OVERDUE`. If no methods resolve, show a small `Alert`: "No payment methods yet — add one in Profile settings" linking to `/profile#payment-methods`.

**Step 3: Verify.** Manual: open a SENT invoice with a Wise method → QR + copy + open render; DRAFT/PAID → hidden; no-method SENT → alert. `tsc`/lint clean.

**Step 4: Commit**
```bash
git add components/modules/invoice/InvoicePaymentMethods.tsx components/modules/invoice/InvoiceDetail.tsx "app/(authenticated)/invoices"
git commit -m "feat(invoice): render payment methods + QR on invoice view"
```

---

### Task 10: Invoice PDF — payout block + QR

**Files:**
- Modify: `server/modules/invoice/invoice.templates.tsx` (`SummarySection` "How to Pay" box ~line 741; `InvoicePDFData` type; `renderInvoicePDF` ~line 820)
- Modify: `app/api/invoices/[id]/pdf/route.ts` (~line 43) and the email PDF path in `invoice.service.ts` (~line 67) — assemble snapshot + QR before render

**Step 1: Extend PDF data**
- Add `payoutMethods?: { provider; label; currency; payLink; accountDetails; showQr; qr: string | null }[]` to `InvoicePDFData`.
- In both render call-sites, source methods from **`invoice.payoutSnapshot`** (fallback: resolve live if snapshot null, for legacy invoices); compute QR data URIs via `payLinkToQrDataUri`.

**Step 2: Render in `SummarySection`**
- Extend the existing `paymentBox`: for each method render label + details + (if `qr`) an `<Image src={qr} style={{width:80,height:80}} />` with the URL printed as `<Text>` beneath (PDF has no alt-text). Keep `paymentInstructions` prose below as fallback notes.
- **Suppress the pay block when `variant === 'receipt'`** (PAID receipt should not show "pay me").

**Step 3: Verify.** Download a SENT invoice PDF → QR scans to the Wise link; download a PAID receipt → no pay block. `tsc` clean.

**Step 4: Commit**
```bash
git add server/modules/invoice/invoice.templates.tsx "app/api/invoices/[id]/pdf/route.ts" server/modules/invoice/invoice.service.ts
git commit -m "feat(invoice): render payout methods + QR on invoice PDF"
```

---

### Task 11: Final verification pass

**Step 1: Type-check + lint**
```bash
docker compose exec app npx tsc --noEmit
docker compose exec app npm run lint
```
Expected: both clean.

**Step 2: Run the new specs (and the full suite to catch regressions)**
```bash
docker compose exec app npx vitest run server/modules/payout
docker compose exec app npm test
```
Expected: payout specs pass; existing suite still green.

**Step 3: Manual end-to-end (logged in)**
- Profile → add a Wise (link + currency) and a Bank method → save → reload persists.
- Create invoice (USD) → send → invoice page shows Wise QR + copy + open; `payoutSnapshot` populated.
- Download PDF → QR scans to the Wise link; receipt variant hides the block.
- Invoice in a currency with no matching method → only null-currency catch-all (or alert) shows.

**Step 4: Final commit (if any docs/touch-ups)**
```bash
git commit -am "docs(invoice): payout methods feature notes" || true
```

---

## Phase 2 pointer (separate, gated — do NOT start without sign-off)

Wire `markAsPaid` to optionally create a linked `Income` (idempotent via `linkedIncomeId @unique`, atomic, with reversal), book the Wise/transfer **fee as a separate Expense**, record income at **net received** in the **receiving account's currency** (hard-guard `account.currency === invoice.currency` for v1; FX deferred), add `TransactionSource.INVOICE`, and add CSV-import reconciliation to prevent double-counting. Decide tithe/EF participation then (compute on net). Also fix the pre-existing latent bugs first: the misleading "creates an Income record" comment in `invoice.controller.ts:91` and the float math in `computeInvoiceTotals` (`invoice.service.ts:20-28`). **Gates:** `money-feature-review` skill + `accountant` + `security-engineer` + `qa-engineer` before merge.
