# Client & Billable Entries Feature — Design Document

> **Product direction:** Personal finance for freelancers and solo operators. Corporate identity is a future expansion.

## Overview

A generalized activity tracking system that feeds into invoice generation. Users log daily entries (hours, tasks, items) against clients with pre-set default rates. When ready to invoice, unbilled entries auto-populate a draft invoice as line items. The closed loop — work logged → invoice generated → invoice paid → income recorded → budget updated — is the key differentiator.

## User Stories

- **Freelancer**: Tracks daily hours per client, generates monthly invoices from logged hours
- **Retainer**: Lists completed tasks at fixed prices, invoices on delivery
- **Supplier**: Records items delivered with quantities and unit prices, invoices per shipment

All three follow the same data pattern: `description + quantity + unitPrice = amount`, scoped to a client.

## Data Model

### New: Client

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

  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  workEntries  WorkEntry[]
  invoices     Invoice[]

  @@unique([userId, name])
  @@index([userId])
  @@map("clients")
}
```

**Council fix:** Soft-delete via `isArchived` instead of cascade-delete. Prevents destroying BILLED entry audit trail when a client is no longer active.

### New: WorkEntry

```prisma
enum WorkEntryStatus {
  UNBILLED
  BILLED
}

model WorkEntry {
  id               String          @id @default(cuid())
  description      String
  date             DateTime
  quantity         Decimal         @db.Decimal(10, 2) @default(1)
  unitPrice        Decimal         @db.Decimal(10, 2)
  amount           Decimal         @db.Decimal(12, 2)
  status           WorkEntryStatus @default(UNBILLED)
  currency         String          @default("USD")
  lastInvoiceId    String?
  lastInvoiceNumber String?
  clientId         String
  userId           String
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  client           Client          @relation(fields: [clientId], references: [id], onDelete: Restrict)
  user             User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, clientId, status])
  @@index([userId, date])
  @@map("work_entries")
}
```

**Council fixes:**
- `onDelete: Restrict` on Client FK — prevents deleting clients with entries (use archive instead)
- `currency` field — populated from user's currency at creation, not exposed in UI (future multi-currency readiness)
- `lastInvoiceId` / `lastInvoiceNumber` — lightweight audit trail preserved when entries revert to UNBILLED
- `amount` is server-computed only (`quantity × unitPrice`) — never accepted from client input
- FK flipped: `workEntryId` lives on InvoiceLineItem (see below), not `invoiceLineItemId` on WorkEntry

### Modified: InvoiceLineItem

```prisma
model InvoiceLineItem {
  // ... existing fields ...
  workEntryId  String?  @unique
  workEntry    WorkEntry? @relation(fields: [workEntryId], references: [id], onDelete: SetNull)

  @@index([workEntryId])
}
```

**Council fix:** FK lives here, not on WorkEntry. This means:
- Line items point to their source entry (not the other way around)
- The existing `update()` delete-and-recreate pattern won't silently orphan entries
- Revert logic can find affected entries via the line items being deleted

### Modified: Invoice

```prisma
model Invoice {
  // ... existing fields ...
  clientId  String?
  client    Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
}
```

Existing denormalized fields (`clientName`, `clientEmail`, etc.) remain for backwards compatibility. When `clientId` is set, denormalized fields auto-fill from Client on creation.

### Modified: User

```prisma
model User {
  // ... existing relations ...
  clients     Client[]
  workEntries WorkEntry[]
}
```

### Modified: WorkEntry (reverse relation)

```prisma
model WorkEntry {
  // ... existing fields ...
  linkedLineItem InvoiceLineItem?
}
```

## Critical Service Changes

### New: `InvoiceService.createFromWorkEntries`

Must run in a single `prisma.$transaction`:
1. Fetch client + validate all entry IDs belong to that client/user and are UNBILLED
2. Create Invoice with `clientId` and denormalized client fields
3. Create InvoiceLineItems from entries (mapping desc/qty/unitPrice/amount), setting `workEntryId`
4. Flip all selected WorkEntries to BILLED, set `lastInvoiceId` and `lastInvoiceNumber`
5. Compute subtotal/taxAmount/totalAmount (extract shared helper from existing `create`/`update`)

### Modified: `InvoiceService.cancel` and `InvoiceService.delete`

Extend both to revert linked entries inside a `$transaction`:
1. Find all InvoiceLineItems with non-null `workEntryId`
2. Set those WorkEntries to `UNBILLED` (preserve `lastInvoiceId`/`lastInvoiceNumber`)
3. Then perform the cancel/delete

**Rule:** Entries linked to PAID invoices are permanently BILLED. Only DRAFT deletion and DRAFT/SENT cancellation trigger revert.

### Modified: `InvoiceService.update`

For work-entry-generated invoices: do not allow removing linked line items via the delete-and-recreate pattern. Options:
- Update line items in-place (preserve IDs and `workEntryId` links)
- Allow adding manual line items and editing non-linked fields (tax, notes, dates)
- To exclude an entry, user must explicitly unlink it (reverts to UNBILLED)

### New Zod Schema

```typescript
const generateFromEntriesSchema = z.object({
  clientId: z.string(),
  workEntryIds: z.array(z.string()).min(1),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});
```

## Pages & Navigation

### Sidebar Structure

Invoices becomes a collapsible group (renamed from "Work Log" to "Billable Entries"):

```
Invoices (collapsible)
  - All Invoices       /invoices
  - Clients            /clients
  - Billable Entries   /entries
```

**Council fix:** Renamed "Work Log" → "Billable Entries" — neutral for non-freelancer personas. Sidebar active-state detection must work for the collapsible group.

### Route Map

| Route | Purpose |
|-------|---------|
| `/clients` | Client list — card grid with name, default rate, unbilled total |
| `/clients/[id]` | Client detail — info, entries tab, invoices tab, "Generate Invoice" |
| `/entries` | Daily entry hub — grouped by date, quick-add, filter by client |
| `/invoices` | (existing) — add client filter |
| `/invoices/new` | (existing) — add "Generate from entries" flow |

## Billable Entries Page UX

### Quick-Add Form

Field order (council-reviewed): **Client → Date → Description → Quantity → Unit Price**

- Client: searchable combobox (shadcn Command), not plain select
- Date: defaults to today
- Description: required
- Quantity: defaults to 1
- Unit Price: pre-filled from client's `defaultRate`, editable
- "Add" button

**Mobile (below `md:`):** Replace inline form with fixed bottom "Add Entry" button → opens bottom Sheet with fields stacked vertically.

### Entry List

- Grouped by date (today first) with `DateGroupHeader` showing date + running daily unbilled total
- Each row: client badge, description, qty × price = amount, status badge
- **Click-to-edit** inline for UNBILLED entries (not sheet/dialog — speed for daily use)
- BILLED entries read-only with link to invoice
- Client filter (combobox) + date range filter
- Paginated for large datasets

## Client Detail Page

### Header

- Client name, email, phone, address, default rate
- Edit button (opens dialog), "Generate Invoice" button (disabled if no unbilled entries)

### Stats Row (4 cards)

- Unbilled entries count + total (show oldest unbilled date)
- Total invoiced (all time)
- Total paid
- Outstanding (SENT + OVERDUE)

Empty state: "All entries billed" with check icon when unbilled count is 0.

### Two Tabs

Tab labels show counts: `Billable Entries (12 unbilled)` | `Invoices (5)`

**Tab 1: Billable Entries** — same list as `/entries`, filtered to this client, with scoped quick-add
**Tab 2: Invoices** — filtered invoice list for this client

## Generate Invoice from Entries Flow

1. User clicks "Generate Invoice" (from client page or entries page filtered by client)
2. **Dialog** opens: "Generate Invoice for [Client Name]"
   - Date range filter (defaults to all unbilled)
   - Scrollable checklist of unbilled entries (date, description, qty × price = amount)
   - Select all / Deselect all toggle
   - Sticky footer: "X entries selected · Total: $Y.YY"
3. User clicks "Generate Draft Invoice"
4. System runs `createFromWorkEntries` in a single transaction:
   - Creates DRAFT invoice with client info
   - Maps entries → line items (1:1)
   - Flips entries to BILLED
5. User lands on invoice edit page — fully editable
6. If DRAFT invoice deleted or cancelled → linked entries revert to UNBILLED

## Edge Cases

- Client with no unbilled entries → "Generate Invoice" disabled with tooltip
- Client deletion → blocked if BILLED entries exist (Restrict FK). Archive instead.
- Invoice cancelled (DRAFT/SENT) → linked entries revert to UNBILLED in same transaction
- Invoice PAID → entries permanently BILLED, cannot revert
- Entry deleted while on DRAFT invoice → line item removed, entry gone
- Double-invoice race condition → `$transaction` checks entries still UNBILLED; UI handles error gracefully
- Entry amount diverges from edited line item → show indicator on line item (entry is ground truth)
- Manual invoice creation still works without Client (backwards compatible)

## Shared Components

| Component | Purpose |
|-----------|---------|
| `ClientSelectCombobox` | Searchable client dropdown — used in entries form, generate dialog, invoice form |
| `WorkEntryStatusBadge` | UNBILLED (amber) / BILLED (muted green) with invoice link |
| `ClientCard` | Card for client list page — name, rate, unbilled amount, actions |
| `DateGroupHeader` | Date section divider with daily total — used in entries page and client detail |
| `GenerateInvoiceDialog` | Entry selection dialog with date filter, select-all, sticky total footer |

## Module Structure

```
server/modules/client/
  client.types.ts
  client.service.ts
  client.controller.ts

server/modules/work-entry/
  work-entry.types.ts
  work-entry.service.ts
  work-entry.controller.ts

components/modules/client/
  ClientForm.tsx
  ClientList.tsx
  ClientDetail.tsx
  ClientSelectCombobox.tsx

components/modules/work-entry/
  WorkEntryForm.tsx
  WorkEntryList.tsx
  WorkEntryStatusBadge.tsx
  DateGroupHeader.tsx
  GenerateInvoiceDialog.tsx

app/(authenticated)/clients/
  page.tsx
  [id]/page.tsx

app/(authenticated)/entries/
  page.tsx
```

## Future Considerations (not v1)

- Revenue by Client report
- WIP aging report (unbilled entries by age bucket)
- Per-line-item tax rates for international users
- Multi-currency entries
- Client portal / payment links
- Recurring entries (auto-log same entry weekly/monthly)
