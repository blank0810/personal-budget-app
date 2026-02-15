# Liability Payments Feature & Transfer Enhancement

## Overview

Separate liability payments from general transfers to create cleaner architectural boundaries. Transfer becomes asset-to-asset only, while a new dedicated Payments feature handles debt payments.

## Problem Statement

When selecting a liability account in the Transfer form, users see the debt balance instead of available credit. Rather than patching this display issue, we're implementing proper separation:
- **Transfer**: Asset-to-asset movements only
- **Payments**: Dedicated portal for paying off liabilities

## Sidebar Reorganization

### Current Structure
```
Dashboard
Income
Expense
Transfer
Budget
Accounts
Reports
Changelog
```

### New Structure
```
Dashboard
━━━━━━━━━━━━━━━━
Transactions
  ├─ Income
  ├─ Expense
  ├─ Transfer
  └─ Payments
━━━━━━━━━━━━━━━━
Budget
Accounts
Reports
Changelog
```

### Implementation
- Modify `SidebarNav.tsx` to support grouped navigation items
- "Transactions" is a collapsible section header (not a link)
- Child items indented for visual hierarchy
- Group expanded by default

## Transfer Form Enhancement

### Changes
- Filter account dropdowns to show only non-liability accounts
- Both "From Account" and "To Account" affected
- No other UI changes

### Filter Logic
```typescript
const transferableAccounts = accounts.filter(
  (account) => !account.isLiability && !account.isArchived
);
```

### Account Types in Transfer
| Type | Allowed |
|------|---------|
| BANK | Yes |
| CASH | Yes |
| SAVINGS | Yes |
| INVESTMENT | Yes |
| EMERGENCY_FUND | Yes |
| FUND | Yes |
| TITHE | Yes |
| CREDIT | No |
| LOAN | No |

## New Payments Feature

### Route
`/payments`

### Page Layout
- Left column: Payment form (Card)
- Right column: Payment history (DataTable)
- Matches Transfer page layout for consistency

### Form Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| From Account | Select | Yes | Assets only (non-liability) |
| To Liability | Select | Yes | Liabilities only (CREDIT, LOAN) |
| Amount | Currency | Yes | Payment amount |
| Transaction Fee | Currency | No | Bank fee (creates expense) |
| Date | Date Picker | Yes | Default: today |
| Description | Text | No | Optional memo |

### Form Flow
1. User fills form, clicks "Review Payment"
2. Review dialog shows summary
3. User confirms, payment created

## Backend Implementation

### New Module Structure
```
server/modules/payment/
├── payment.types.ts      # Zod schemas
├── payment.service.ts    # Business logic
└── payment.controller.ts # Server actions
```

### Database
- No new tables - payments stored as Transfer records
- Differentiated by: fromAccount.isLiability=false AND toAccount.isLiability=true
- Fee stored as linked Expense record

### Payment Service Logic
```typescript
async createPayment(data) {
  return prisma.$transaction(async (tx) => {
    // 1. Deduct from asset account (amount + fee)
    await tx.account.update({
      where: { id: data.fromAccountId },
      data: { balance: { decrement: data.amount + (data.fee || 0) } }
    });

    // 2. Reduce liability balance (debt goes down)
    await tx.account.update({
      where: { id: data.toAccountId },
      data: { balance: { decrement: data.amount } }
    });

    // 3. Create transfer record
    const transfer = await tx.transfer.create({ ... });

    // 4. If fee exists, create expense record
    if (data.fee > 0) {
      await tx.expense.create({ ... });
    }

    return transfer;
  });
}
```

### Accounting Logic (Accountant Verified)
- Asset: `balance -= (amount + fee)` — cash leaves the account
- Liability: `balance -= amount` — debt reduces
- Fee: Creates expense against source asset account

## Payment History

### DataTable Columns
| Column | Description |
|--------|-------------|
| Date | Payment date |
| From | Source asset account name |
| To | Destination liability name |
| Amount | Payment amount |
| Fee | Transaction fee (if any) |
| Description | Optional memo |
| Actions | Edit / Delete |

### Data Fetching
```typescript
async getPayments(userId: string) {
  return prisma.transfer.findMany({
    where: {
      userId,
      toAccount: { isLiability: true }
    },
    include: {
      fromAccount: true,
      toAccount: true,
    },
    orderBy: { date: 'desc' }
  });
}
```

### Migration Note
Existing transfers to liabilities automatically appear in Payment History. No data migration needed.

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `app/(authenticated)/payments/page.tsx` | Payments page |
| `server/modules/payment/payment.types.ts` | Zod schemas |
| `server/modules/payment/payment.service.ts` | Business logic |
| `server/modules/payment/payment.controller.ts` | Server actions |
| `components/modules/payment/PaymentForm.tsx` | Payment form |
| `components/modules/payment/PaymentList.tsx` | Payment history |

### Modified Files
| File | Changes |
|------|---------|
| `components/common/SidebarNav.tsx` | Add grouped navigation, Payments link |
| `components/modules/transfer/TransferForm.tsx` | Filter out liability accounts |
