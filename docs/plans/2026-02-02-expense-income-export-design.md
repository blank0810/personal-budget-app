# Expense/Income CSV Export Feature

## Overview

Add CSV export functionality to both Expense and Income pages, allowing users to download their transaction data.

## User Experience

### Button Placement
- Export CSV button in the header area of `ExpenseViews` and `IncomeViews`
- Placed next to month navigation controls
- Uses `Download` icon with "Export CSV" label (mobile: "CSV" only)

### Behavior
- Exports currently displayed data (respects month + category filter)
- Immediate file download on click
- Filename format:
  - `expenses_january_2026.csv` (no filter)
  - `expenses_january_2026_food.csv` (with category filter)
  - `income_january_2026.csv`

### CSV Columns

| Column | Description |
|--------|-------------|
| Date | Transaction date (yyyy-MM-dd) |
| Description | Transaction description |
| Category | Category name |
| Account | Account name |
| Amount | Numeric amount |

## Implementation

### Files to Modify

1. **`components/modules/expense/ExpenseViews.tsx`**
   - Add `handleExportCSV` function
   - Add Export button to header

2. **`components/modules/income/IncomeViews.tsx`**
   - Same changes as ExpenseViews

### Export Logic (reuses AccountLedger pattern)

```typescript
const handleExportCSV = () => {
  const headers = ['Date', 'Description', 'Category', 'Account', 'Amount'];
  const csvContent = [
    headers.join(','),
    ...filteredData.map((item) => [
      format(new Date(item.date), 'yyyy-MM-dd'),
      `"${(item.description || '').replace(/"/g, '""')}"`,
      `"${item.category?.name || ''}"`,
      `"${item.account?.name || ''}"`,
      item.amount.toString(),
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
```

### Dependencies
- None new (uses native browser APIs already in use)

### Backend Changes
- None (client-side export from loaded data)
