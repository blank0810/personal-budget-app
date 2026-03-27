# Client & Billable Entries — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add client management and billable entry tracking that feeds into invoice generation, creating the closed loop: work logged → invoice generated → invoice paid → income recorded → budget updated.

**Architecture:** New Client and WorkEntry Prisma models, two new server modules (client, work-entry), modifications to the existing invoice module, new page routes, and sidebar restructuring.

**Tech Stack:** Next.js 15, React 19, TypeScript, Prisma ORM, Tailwind CSS 4, shadcn/ui

---

## Task 1: Schema Migration — Client, WorkEntry, Invoice modifications

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration file via `prisma migrate dev`

### Step 1: Add WorkEntryStatus enum

After the existing `InvoiceStatus` enum, add:

```prisma
enum WorkEntryStatus {
  UNBILLED
  BILLED
}
```

### Step 2: Add Client model

After the Invoice models section, add:

```prisma
model Client {
  id           String   @id @default(cuid())
  name         String
  email        String?
  phone        String?
  address      String?  @db.Text
  defaultRate  Decimal? @db.Decimal(10, 2)
  notes        String?  @db.Text
  isArchived   Boolean  @default(false)
  userId       String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  workEntries  WorkEntry[]
  invoices     Invoice[]

  @@unique([userId, name])
  @@index([userId])
  @@map("clients")
}
```

### Step 3: Add WorkEntry model

```prisma
model WorkEntry {
  id                String          @id @default(cuid())
  description       String
  date              DateTime
  quantity          Decimal         @db.Decimal(10, 2) @default(1)
  unitPrice         Decimal         @db.Decimal(10, 2)
  amount            Decimal         @db.Decimal(12, 2)
  status            WorkEntryStatus @default(UNBILLED)
  currency          String          @default("USD")
  lastInvoiceId     String?
  lastInvoiceNumber String?
  clientId          String
  userId            String
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt

  client            Client          @relation(fields: [clientId], references: [id], onDelete: Restrict)
  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  linkedLineItem    InvoiceLineItem?

  @@index([userId, clientId, status])
  @@index([userId, date])
  @@map("work_entries")
}
```

### Step 4: Modify InvoiceLineItem — add workEntryId FK

Add to the existing `InvoiceLineItem` model:

```prisma
  workEntryId  String?     @unique
  workEntry    WorkEntry?  @relation(fields: [workEntryId], references: [id], onDelete: SetNull)
```

Add index: `@@index([workEntryId])`

### Step 5: Modify Invoice — add clientId FK

Add to the existing `Invoice` model:

```prisma
  clientId  String?
  client    Client?  @relation(fields: [clientId], references: [id], onDelete: SetNull)
```

### Step 6: Add User relations

Add to User model's relations:

```prisma
  clients     Client[]
  workEntries WorkEntry[]
```

### Step 7: Run migration

```bash
docker compose exec app npx prisma migrate dev --name add_client_and_work_entries
```

### Step 8: Commit

```bash
git add prisma/
git commit -m "feat: add Client, WorkEntry models and Invoice modifications for billable entries"
```

---

## Task 2: Client Module Backend

**Files:**
- Create: `server/modules/client/client.types.ts`
- Create: `server/modules/client/client.service.ts`
- Create: `server/modules/client/client.controller.ts`

### Step 1: Create client.types.ts

```typescript
import { z } from 'zod';

export const createClientSchema = z.object({
  name: z.string().min(1, 'Client name is required').max(200),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  defaultRate: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
  id: z.string(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
```

### Step 2: Create client.service.ts

Methods:
- `create(userId, data)` — create with currency from user
- `update(userId, data)` — update client fields
- `archive(userId, clientId)` — set `isArchived = true` (soft delete)
- `restore(userId, clientId)` — set `isArchived = false`
- `getAll(userId, includeArchived?)` — list clients with unbilled entry counts/totals
- `getById(userId, clientId)` — full client with stats (unbilled total, invoiced total, paid total, outstanding total)
- `delete(userId, clientId)` — hard delete only if no entries exist (Restrict FK handles this)

For `getAll`, include aggregated unbilled totals:
```typescript
const clients = await prisma.client.findMany({
  where: { userId, isArchived: includeArchived ? undefined : false },
  include: {
    _count: { select: { workEntries: true } },
    workEntries: {
      where: { status: 'UNBILLED' },
      select: { amount: true },
    },
  },
  orderBy: { name: 'asc' },
});
```

### Step 3: Create client.controller.ts

Server actions: `createClientAction`, `updateClientAction`, `archiveClientAction`, `deleteClientAction`.

Follow pattern from `invoice.controller.ts` — `'use server'`, authenticate, Zod safeParse, service call, `clearCache('/clients')`.

### Step 4: Verify and commit

```bash
npx tsc --noEmit --incremental false && npm run lint
git add server/modules/client/
git commit -m "feat: add client module with types, service, and controller"
```

---

## Task 3: Work Entry Module Backend

**Files:**
- Create: `server/modules/work-entry/work-entry.types.ts`
- Create: `server/modules/work-entry/work-entry.service.ts`
- Create: `server/modules/work-entry/work-entry.controller.ts`

### Step 1: Create work-entry.types.ts

```typescript
import { z } from 'zod';

export const createWorkEntrySchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.coerce.date(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
});

export const updateWorkEntrySchema = createWorkEntrySchema.partial().extend({
  id: z.string(),
});

export const generateFromEntriesSchema = z.object({
  clientId: z.string(),
  workEntryIds: z.array(z.string()).min(1, 'Select at least one entry'),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export type CreateWorkEntryInput = z.infer<typeof createWorkEntrySchema>;
export type UpdateWorkEntryInput = z.infer<typeof updateWorkEntrySchema>;
export type GenerateFromEntriesInput = z.infer<typeof generateFromEntriesSchema>;
```

Note: `amount` is NOT in the schema — server computes it.

### Step 2: Create work-entry.service.ts

Methods:
- `create(userId, data)` — compute `amount = quantity * unitPrice`, set `currency` from user, create entry
- `update(userId, data)` — UNBILLED only. Recompute amount if qty/price changed.
- `delete(userId, entryId)` — UNBILLED only.
- `getAll(userId, filters?)` — with optional clientId, status, dateRange filters. Include client name. Order by date desc. Paginated with skip/take.
- `getByClient(userId, clientId, status?)` — entries for a specific client
- `getUnbilledByClient(userId, clientId)` — UNBILLED entries for generate-invoice dialog

### Step 3: Create work-entry.controller.ts

Server actions: `createWorkEntryAction`, `updateWorkEntryAction`, `deleteWorkEntryAction`.

### Step 4: Verify and commit

```bash
npx tsc --noEmit --incremental false && npm run lint
git add server/modules/work-entry/
git commit -m "feat: add work entry module with types, service, and controller"
```

---

## Task 4: Extend Invoice Service — createFromWorkEntries + revert logic

**Files:**
- Modify: `server/modules/invoice/invoice.service.ts`
- Modify: `server/modules/invoice/invoice.types.ts`
- Modify: `server/modules/invoice/invoice.controller.ts`

### Step 1: Add generateFromEntriesSchema to invoice.types.ts

Import and re-export from work-entry types, or define directly:

```typescript
export const generateFromEntriesSchema = z.object({
  clientId: z.string(),
  workEntryIds: z.array(z.string()).min(1),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});
```

### Step 2: Extract shared computeTotals helper

Extract from existing `create`/`update` methods:

```typescript
function computeInvoiceTotals(lineItems: { amount: number }[], taxRate: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount;
  return { subtotal, taxAmount, totalAmount };
}
```

### Step 3: Add createFromWorkEntries method

Must run inside `prisma.$transaction({ timeout: 30000 })`:

1. Fetch client by ID, validate belongs to user
2. Fetch all work entries by IDs, validate all belong to user + client, all UNBILLED
3. Generate invoice number
4. Create Invoice with `clientId` and denormalized client fields
5. Create InvoiceLineItems from entries, setting `workEntryId` on each
6. Update all entries: `status = 'BILLED'`, `lastInvoiceId`, `lastInvoiceNumber`
7. Return invoice with line items

### Step 4: Modify cancel method — add entry revert

Inside a `$transaction`:
1. Find all InvoiceLineItems with non-null `workEntryId` for this invoice
2. Collect the `workEntryId` values
3. Update those WorkEntries: `status = 'UNBILLED'` (preserve `lastInvoiceId`/`lastInvoiceNumber`)
4. Null out `workEntryId` on the line items
5. Set invoice status to CANCELLED

### Step 5: Modify delete method — add entry revert

Same pattern as cancel: find linked entries, revert to UNBILLED, then delete invoice.

### Step 6: Add generateInvoiceFromEntriesAction to controller

New server action that validates input, calls `createFromWorkEntries`, clears cache for `/invoices`, `/entries`, `/clients`.

### Step 7: Add clientId filter to getAll

Update the existing `getAll` query to accept optional `clientId` filter.

### Step 8: Verify and commit

```bash
npx tsc --noEmit --incremental false && npm run lint
git add server/modules/invoice/
git commit -m "feat: add createFromWorkEntries, entry revert on cancel/delete, and shared totals helper"
```

---

## Task 5: Client UI Components + Pages

**Files:**
- Create: `components/modules/client/ClientSelectCombobox.tsx`
- Create: `components/modules/client/ClientForm.tsx`
- Create: `components/modules/client/ClientList.tsx`
- Create: `components/modules/client/ClientDetail.tsx`
- Create: `app/(authenticated)/clients/page.tsx`
- Create: `app/(authenticated)/clients/[id]/page.tsx`

### ClientSelectCombobox

Reusable searchable client dropdown using shadcn Command + Popover. Props: `clients`, `value`, `onChange`. Used in work entry form, generate invoice dialog, and invoice filter.

### ClientForm

Dialog-based form for create/edit. Fields: name (required), email, phone, address, default rate, notes. Uses react-hook-form + zodResolver.

### ClientList

Card grid layout (not table). Each card: client name, default rate, unbilled count + amount, "Generate Invoice" and "Edit" buttons. Shows archived clients with muted styling if `includeArchived` filter is on.

### ClientDetail

Full client page with header (info + edit button + Generate Invoice button), stats cards row (unbilled total with oldest date, total invoiced, total paid, outstanding), and two tabs: "Billable Entries (N unbilled)" and "Invoices (N)".

### Pages

- `/clients/page.tsx` — auth, fetch clients with stats, render ClientList + "Add Client" button
- `/clients/[id]/page.tsx` — auth, fetch client + entries + invoices, render ClientDetail

### Commit

```bash
git add components/modules/client/ "app/(authenticated)/clients/"
git commit -m "feat: add client UI components and page routes"
```

---

## Task 6: Work Entry UI Components + Page

**Files:**
- Create: `components/modules/work-entry/WorkEntryForm.tsx`
- Create: `components/modules/work-entry/WorkEntryList.tsx`
- Create: `components/modules/work-entry/WorkEntryStatusBadge.tsx`
- Create: `components/modules/work-entry/DateGroupHeader.tsx`
- Create: `components/modules/work-entry/GenerateInvoiceDialog.tsx`
- Create: `app/(authenticated)/entries/page.tsx`

### WorkEntryForm

Quick-add form. Field order: Client (combobox) → Date → Description → Quantity → Unit Price → Add button.

Desktop: horizontal row always visible at top. Mobile (below `md:`): hidden, replaced by fixed bottom "Add Entry" button that opens a Sheet with fields stacked vertically.

Selecting a client pre-fills unitPrice from `client.defaultRate`. Amount auto-computes and is shown but not editable.

### WorkEntryList

Date-grouped list with DateGroupHeader (date + daily unbilled total). Each row: client badge, description, qty × price = amount, status badge.

UNBILLED rows: click-to-edit inline (row becomes editable fields, checkmark/X to confirm/cancel). Delete button.

BILLED rows: read-only, link to invoice.

Client filter (combobox) + date range filter at top.

### WorkEntryStatusBadge

UNBILLED: amber badge. BILLED: muted green badge with invoice number link.

### DateGroupHeader

Renders: formatted date label + running daily unbilled total. Reused in entries page and client detail entries tab.

### GenerateInvoiceDialog

Dialog triggered from client page or entries page (when filtered by client).

- Header: "Generate Invoice for [Client Name]"
- Date range filter (defaults to all unbilled)
- Scrollable checklist of unbilled entries with select-all/deselect-all
- Sticky footer: "X entries · Total: $Y.YY"
- "Generate Draft Invoice" button → calls `generateInvoiceFromEntriesAction`
- On success: redirect to `/invoices/[newId]/edit`

### Page

`/entries/page.tsx` — auth, fetch entries + clients, render WorkEntryForm + WorkEntryList.

### Commit

```bash
git add components/modules/work-entry/ "app/(authenticated)/entries/"
git commit -m "feat: add billable entries UI components and page route"
```

---

## Task 7: Sidebar Restructuring — Invoices as collapsible group

**Files:**
- Modify: `components/common/app-sidebar.tsx`

### Step 1: Convert Invoices from flat item to collapsible group

Replace the current Invoices entry in `navItems`:

```typescript
{
  title: 'Invoices',
  url: '/invoices',
  icon: FileText,
},
```

With:

```typescript
{
  title: 'Invoices',
  url: '#',
  icon: FileText,
  items: [
    { title: 'All Invoices', url: '/invoices' },
    { title: 'Clients', url: '/clients' },
    { title: 'Billable Entries', url: '/entries' },
  ],
},
```

Add `Users` or `UserCircle` import from lucide-react if using a different icon for Clients (optional — the sub-items don't need icons in the current NavMain pattern).

### Step 2: Verify and commit

```bash
npx tsc --noEmit --incremental false && npm run lint
git add components/common/app-sidebar.tsx
git commit -m "refactor: convert Invoices to collapsible sidebar group with Clients and Billable Entries"
```

---

## Execution Order

| Priority | Task | Agent | Dependencies |
|----------|------|-------|-------------|
| 1 | Schema migration | budget-backend | None |
| 2a | Client module backend | budget-backend | Task 1 |
| 2b | Work entry module backend | budget-backend | Task 1 |
| 3 | Invoice service extensions | budget-backend | Tasks 2a, 2b |
| 4a | Client UI + pages | budget-frontend | Tasks 2a, 3 |
| 4b | Work entry UI + page | budget-frontend | Tasks 2b, 3 |
| 4c | Sidebar restructuring | budget-frontend | None (independent) |
