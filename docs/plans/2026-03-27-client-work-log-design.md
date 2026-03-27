# Client & Work Log Feature — Design Document

## Overview

A generalized work/activity tracking system that feeds into invoice generation. Users log daily entries (hours, tasks, items) against clients with pre-set default rates. When ready to invoice, unbilled entries auto-populate a draft invoice as line items.

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

### New: WorkEntry

```prisma
enum WorkEntryStatus {
  UNBILLED
  BILLED
}

model WorkEntry {
  id                 String          @id @default(cuid())
  description        String
  date               DateTime
  quantity           Decimal         @db.Decimal(10, 2) @default(1)
  unitPrice          Decimal         @db.Decimal(10, 2)
  amount             Decimal         @db.Decimal(12, 2)
  status             WorkEntryStatus @default(UNBILLED)
  invoiceLineItemId  String?         @unique
  clientId           String
  userId             String
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  client             Client          @relation(fields: [clientId], references: [id], onDelete: Cascade)
  user               User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  invoiceLineItem    InvoiceLineItem? @relation(fields: [invoiceLineItemId], references: [id], onDelete: SetNull)

  @@index([userId, clientId, status])
  @@index([userId, date])
  @@map("work_entries")
}
```

### Modified: Invoice

Add nullable `clientId` foreign key:

```prisma
model Invoice {
  // ... existing fields ...
  clientId  String?
  client    Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
}
```

Existing denormalized fields (`clientName`, `clientEmail`, etc.) remain for backwards compatibility. When `clientId` is set, denormalized fields auto-fill from Client on creation.

### Modified: InvoiceLineItem

Add reverse relation from WorkEntry:

```prisma
model InvoiceLineItem {
  // ... existing fields ...
  linkedWorkEntry WorkEntry?
}
```

### Modified: User

Add relations:

```prisma
model User {
  // ... existing relations ...
  clients     Client[]
  workEntries WorkEntry[]
}
```

## Pages & Navigation

### Sidebar Structure

Invoices becomes a collapsible group:

```
Invoices (collapsible)
  - All Invoices    /invoices
  - Clients         /clients
  - Work Log        /work-log
```

### Route Map

| Route | Purpose |
|-------|---------|
| `/clients` | Client list — name, default rate, unbilled total, total billed |
| `/clients/[id]` | Client detail — info, unbilled entries, invoice history, "Generate Invoice" |
| `/work-log` | Daily entry hub — grouped by date, quick-add, filter by client |
| `/invoices` | (existing) — add client filter |
| `/invoices/new` | (existing) — add "Generate from entries" alongside manual creation |

## Work Log Page UX

### Quick-Add Form (always visible at top)

- Client dropdown (required) — selecting pre-fills unit price from `defaultRate`
- Description (required)
- Quantity (defaults to 1)
- Unit Price (pre-filled from client, editable)
- Date (defaults to today)
- "Add" button

### Entry List (below form)

- Grouped by date (today first, then yesterday, etc.)
- Each row: client badge, description, qty x price = amount, status (UNBILLED/BILLED)
- Inline edit and delete for UNBILLED entries
- BILLED entries are read-only with link to invoice
- Client filter dropdown
- Date range filter

## Client Detail Page

### Header

- Client name, email, phone, address
- Default rate display
- Edit button, "Generate Invoice" button

### Stats Row (4 cards)

- Unbilled entries count + total
- Total invoiced (all time)
- Total paid
- Outstanding (SENT + OVERDUE)

### Two Tabs

**Tab 1: Work Entries** — same list as work log, filtered to this client, with scoped quick-add form

**Tab 2: Invoices** — filtered invoice list for this client

## Generate Invoice from Entries Flow

1. User on client detail page (or work log filtered by client) clicks "Generate Invoice"
2. System shows all UNBILLED entries for that client with date range filter
3. All entries pre-selected; user can uncheck entries to exclude
4. User clicks "Generate Invoice"
5. System creates DRAFT invoice:
   - `clientId` set on invoice
   - Client info (name, email, address, phone) auto-filled from Client model into denormalized fields
   - Each selected entry becomes an InvoiceLineItem (1:1)
   - Issue date = today, due date = today + 30 days
6. Selected entries flip UNBILLED → BILLED with `invoiceLineItemId` linked
7. User lands on invoice edit page — fully editable
8. If DRAFT invoice deleted or cancelled → linked entries revert to UNBILLED

## Edge Cases

- Client with no unbilled entries → "Generate Invoice" disabled with tooltip
- Entry deleted while invoice is DRAFT → line item removed from invoice
- Invoice cancelled → all linked entries revert to UNBILLED
- Client deleted → entries cascade-delete, invoice keeps denormalized client info
- Manual invoice creation still works without a Client (backwards compatible)

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
  ClientStatsCards.tsx

components/modules/work-entry/
  WorkEntryForm.tsx
  WorkEntryList.tsx
  GenerateInvoiceDialog.tsx

app/(authenticated)/clients/
  page.tsx
  [id]/page.tsx

app/(authenticated)/work-log/
  page.tsx
```
