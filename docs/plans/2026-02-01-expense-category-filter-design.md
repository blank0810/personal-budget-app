# Expense Category Filter Design

**Date:** 2026-02-01
**Status:** Approved
**Feature:** Filter expenses by category (#13 from v1.8 roadmap)

## Overview

Add a category filter dropdown to the expense list, allowing users to filter expenses by category within the selected month.

## Requirements

| Requirement | Decision |
|-------------|----------|
| Filter scope | Within selected month only |
| UI placement | Next to search bar in DataTable |
| Selection type | Single category |
| Architecture | Generic filter support in DataTable |

## Design

### DataTable Filter Interface

New types added to `DataTable.tsx`:

```typescript
interface FilterOption {
  value: string;
  label: string;
}

interface Filter {
  key: string;              // Unique identifier
  label: string;            // Display label (e.g., "Categories")
  options: FilterOption[];  // Available options
  value: string;            // Selected value ('' = all)
  onChange: (value: string) => void;
}

interface DataTableProps<T> {
  // ...existing props
  filters?: Filter[];       // Optional array of filter dropdowns
}
```

### UI Layout

```
[🔍 Search expenses...] [Category ▼]  156 items
```

- Filter dropdowns render between search input and item count
- Each filter shows "All {label}" when no value selected
- Responsive: wraps below search on mobile

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `DataTable` | Renders filter dropdowns (UI only) |
| `ExpenseList` | Passes filters prop through to DataTable |
| `ExpenseViews` | Manages filter state, builds options, filters data |

### ExpenseViews Logic

```typescript
// State
const [selectedCategory, setSelectedCategory] = useState<string>('');

// Extract unique categories from ALL expenses (not just current month)
const categoryOptions = useMemo(() => {
  const uniqueCategories = new Map<string, string>();
  expenses.forEach((exp) => {
    uniqueCategories.set(exp.category.id, exp.category.name);
  });
  return Array.from(uniqueCategories.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}, [expenses]);

// Filter by month AND category
const filteredExpenses = useMemo(() => {
  return expenses.filter((expense) => {
    const matchesMonth = isSameMonth(new Date(expense.date), selectedMonth);
    const matchesCategory = !selectedCategory || expense.categoryId === selectedCategory;
    return matchesMonth && matchesCategory;
  });
}, [expenses, selectedMonth, selectedCategory]);

// Filter config
const filters = [
  {
    key: 'category',
    label: 'Categories',
    options: categoryOptions,
    value: selectedCategory,
    onChange: setSelectedCategory,
  },
];
```

### Behavior

- Category filter resets when switching months
- Categories extracted from full expense list (all months)
- Empty state shows only "All Categories" option

## Files to Change

| File | Changes |
|------|---------|
| `components/common/DataTable.tsx` | Add Filter interface, filters prop, render dropdowns |
| `components/modules/expense/ExpenseList.tsx` | Accept and pass filters prop |
| `components/modules/expense/ExpenseViews.tsx` | Add filter state, build options, filter data |

## Edge Cases

1. **Empty category list** - Dropdown shows only "All Categories"
2. **Category with no expenses in current month** - Still appears in dropdown
3. **Month change** - Category filter resets to "All"
4. **Mobile** - Filter dropdown wraps below search (existing flex behavior)

## Out of Scope

- Account filter (future enhancement using same pattern)
- Persisting filter in URL
- Multi-select categories
- Custom hook extraction (refactor later if needed)

## Future Extensibility

The generic `filters` prop on DataTable enables:
- Adding Account filter to expenses
- Adding Category filter to Income
- Any filterable column on any DataTable instance
