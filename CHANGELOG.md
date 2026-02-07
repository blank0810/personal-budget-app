# Changelog

All notable changes to this project will be documented in this file.

## [v1.8] - January 31, 2026

### Liability Payments Feature

**Dedicated payment portal for paying off credit cards and loans, with clean separation from asset transfers.**

#### Features

-   **New Payments Page**: Dedicated `/payments` route for managing debt payments.
-   **Payment Form**: Pay from asset accounts to liability accounts with optional transaction fee.
-   **Payment History**: View all past payments with detailed breakdown.
-   **Smart Account Filtering**: Form shows only asset accounts as source, only liabilities as destination.
-   **Available Credit Display**: Liability dropdown shows both debt owed and available credit.
-   **Review Dialog**: Confirm payment details before submission.
-   **Delete with Revert**: Delete payments and automatically revert all balance changes.

#### Architectural Changes

-   **Transfer Form**: Now restricted to asset-to-asset transfers only (no liabilities).
-   **Clean Separation**: Payments and Transfers serve distinct purposes with no overlap.

#### Bug Fixes

-   **Account Ledger Labels**: Payments now display as "DEBT PAYMENT" (on asset accounts) and "PAYMENT RECEIVED" (on liability accounts) instead of misleading "TRANSFER IN/OUT" labels.
-   **Liability Ledger Amount Signs**: Payment amounts on liability accounts now show "-" (debt reduced) instead of misleading "+", with green color indicating positive outcome for user.

#### Files Changed

| Component | Changes |
|-----------|---------|
| `app/(authenticated)/payments/page.tsx` | NEW - Payments page |
| `server/modules/payment/payment.types.ts` | NEW - Zod schemas for payment validation |
| `server/modules/payment/payment.service.ts` | NEW - Payment business logic |
| `server/modules/payment/payment.controller.ts` | NEW - Server actions for payments |
| `components/modules/payment/PaymentForm.tsx` | NEW - Payment form component |
| `components/modules/payment/PaymentList.tsx` | NEW - Payment history list |
| `components/modules/payment/PaymentDetailDialog.tsx` | NEW - Payment detail view with delete |
| `components/modules/transfer/TransferForm.tsx` | Filter to show only asset accounts |
| `components/common/nav-items.ts` | Added grouped navigation structure |
| `components/common/sidebar-nav.tsx` | Support for collapsible nav groups |
| `components/common/mobile-sidebar.tsx` | Mirror grouped navigation for mobile |

---

### Sidebar Reorganization

**Cleaner navigation with grouped menu items to reduce clutter.**

#### Features

-   **Transactions Group**: Income, Expenses, Transfers, and Payments grouped under collapsible "Transactions" section.
-   **Collapsible Sections**: Click to expand/collapse navigation groups.
-   **Visual Hierarchy**: Child items indented with border for clear grouping.
-   **Active State**: Group header highlights when any child is active.
-   **Mobile Support**: Same grouped navigation in mobile sidebar drawer.

---

### Expense/Income CSV Export

**Export your expense and income data to CSV files for external analysis or record-keeping.**

#### Features

-   **Export Button**: New "Export CSV" button in the header of Expense and Income pages.
-   **Filtered Export**: Exports respect current filters (month and category for expenses, month for income).
-   **Smart Filenames**: Files named with context (e.g., `expenses_january_2026_food.csv`).
-   **Mobile-Friendly**: Button shows abbreviated "CSV" text on small screens.

---

### Budget Replication Feature

**Quickly replicate budgets from previous months to new months, saving time on repetitive budget setup.**

#### Features

-   **Replicate Budgets Dialog**: New dialog accessible from the Budget page to copy budgets from any previous month.
-   **Source Month Selection**: Dropdown showing all months with existing budgets to copy from.
-   **Target Month Selection**: Choose destination month (current month + next 12 months).
-   **Selective Replication**: Checkbox selection to choose which budgets to replicate.
-   **Amount Editing**: Adjust budget amounts before replication if needed.
-   **Duplicate Prevention**: Automatically skips budgets that already exist in the target month (matched by name).
-   **Bulk Creation**: Creates all selected budgets in a single transaction.

### Financial Health Check (Merged into Overview)

**Comprehensive financial health scoring system merged into the Overview tab as a unified financial command center. Brutally honest feedback that roasts bad habits and celebrates good ones.**

#### Features

-   **Merged into Overview Tab**: Health Check consolidated into Overview (5 tabs → 4: Overview | Income & Expenses | Budget Analytics | Statements).
-   **Inline Health Badge**: Compact horizontal card (80px score ring + label + roast) sits alongside KPI cards in Row 1 for at-a-glance health status.
-   **5-Pillar Assessment**: Solvency (25%), Liquidity (20%), Savings (20%), Debt Management (20%), Cash Flow (15%).
-   **Score Ring Animation**: SVG ring animates from 0 → actual score on mount with health-colored glow (emerald → red). Text scales proportionally for different ring sizes.
-   **Pillar One-Liners**: Each pillar has a plain-language subtitle always visible (e.g., "Can you survive an emergency?" for Liquidity).
-   **Staggered Animations**: Pillar rows fade in with 80ms stagger, progress bars animate width from 0% → score with delay.
-   **Auto-Expand Weakest Pillar**: Lowest-scoring non-A pillar auto-expands on load with nudge text ("Your weakest area — check the recommendation above") that disappears after first interaction.
-   **Collapsible Sections**: Both Net Worth Trend chart and Financial Health Breakdown card have collapse/expand toggles (default open).
-   **Roast-Style Feedback**: Messages scale with severity — genuine praise for strong performance, escalating roasts for poor performance.
-   **Fund Health Removed from Reports**: Fund Health Report removed (already displayed on Dashboard), reducing redundancy.

#### Files Changed

| Component | Changes |
|-----------|---------|
| `server/modules/dashboard/dashboard.service.ts` | Added `getFinancialHealthScore()` method with 5-pillar scoring logic |
| `components/modules/reports/FinancialHealthCheck.tsx` | Health score with 3 variants (badge, pillars-only, full), animated ring, pillar one-liners, auto-expand, nudge text, collapsible breakdown |
| `components/modules/reports/NetWorthTrendChart.tsx` | Added collapsible toggle with animated expand/collapse |
| `components/ui/collapsible.tsx` | NEW - shadcn Collapsible primitive with animated transitions |
| `app/(authenticated)/reports/page.tsx` | Merged Health Check into Overview tab, removed Health Check tab, flat 5-col grid layout |

---

### Income vs Expense Ratio Chart

**Visual analysis of spending efficiency with dual-axis chart showing expense-to-income ratio and savings gap over time.**

#### Features

-   **Dual-Axis Composed Chart**: Expense ratio (%) on left axis, savings amount on right axis.
-   **Health Zone Reference Lines**: Color-coded thresholds at 70% (green/healthy), 90% (yellow/tight), 100% (red/critical).
-   **Color-Coded Data Points**: Each month's dot colored by its health zone for instant assessment.
-   **Savings Gap Area**: Green gradient area showing monthly savings amount.
-   **Summary Row**: Average ratio, best/worst months with values, and trend direction (improving/stable/worsening).

#### Files Changed

| Component | Changes |
|-----------|---------|
| `components/modules/reports/IncomeExpenseRatioChart.tsx` | NEW - Dual-axis ratio chart component |
| `app/(authenticated)/reports/page.tsx` | Added to Income & Expenses tab |

---

### Dashboard Layout Reorder

**Funds section moved above Recent Transactions for strategic-first information hierarchy.**

#### Features

-   **Strategic Positioning**: Fund accounts and savings goals now appear above operational transaction data.
-   **UX Philosophy**: Users see their strategic financial goals before day-to-day transaction noise.

#### Files Changed

| Component | Changes |
|-----------|---------|
| `app/(authenticated)/dashboard/page.tsx` | Reordered Funds section above Recent Transactions grid |

---

### Emergency Fund Calculation Fix

**Emergency Fund now uses actual spending history instead of budgeted amounts for more accurate coverage calculations.**

#### Features

-   **Hybrid Expense Calculation**: Uses 3-month average of actual expenses as primary, with monthly budget as fallback for new users.
-   **Expense Source Indicator**: Dashboard card now shows "Based on actual spending" or "Based on monthly budget" for transparency.
-   **Accountant-Approved Logic**: Aligns with industry best practices - actual spending provides more conservative and realistic coverage estimates.

---

### Budget Detail View Scoping

**Budget ledger now correctly scopes to individual budget envelopes, with unlinked expenses shown separately for full transparency.**

#### Features

-   **Envelope Isolation**: Budget ledger now shows only expenses linked to that specific budget, not all expenses in the category.
-   **Unlinked Expenses Section**: Expenses in the same category but not linked to any budget are displayed in a separate section with muted styling and a summary total.
-   **Accurate Metrics**: Budget progress, remaining amount, and daily pace now reflect only the linked expenses.

#### Files Changed

| Component | Changes |
|-----------|---------|
| `budget.service.ts` | Query scoped to `budgetId` instead of `categoryId`; added unlinked expenses query |
| `BudgetLedger.tsx` | Added `unlinkedExpenses` prop and rendering section |
| `budgets/[id]/page.tsx` | Pass unlinked expenses to BudgetLedger |

---

### Smart Budget Dropdown

**Expense form budget selector now groups budgets by month with current month primary and previous months accessible for flexibility.**

#### Features

-   **Sectioned Dropdown**: Budget selector groups budgets into "current month" (primary) and "Previous Months" (secondary) sections.
-   **3-Month Lookback**: Previous months section shows budgets from up to 3 months back, sorted newest first, with month labels.
-   **Auto-Reset on Month Change**: Budget selection automatically clears when the expense date month changes to prevent stale selections.
-   **Color-Coded Remaining**: Each budget option displays remaining amount with health-based color coding (green >20%, amber 0-20%, red over budget).

#### Files Changed

| Component | Changes |
|-----------|---------|
| `ExpenseForm.tsx` | Sectioned SelectGroups, `useMemo` grouping logic, `useRef` month-change detection |

---

### Account Type Separation

**Accounts page and dashboard now use a 4-group classification system for clearer financial organization.**

#### Features

-   **4-Group Classification**: Accounts organized into Liquid Assets (Bank, Cash), Savings & Investments (Savings, Investment), Liabilities (Credit, Loan), and Funds & Goals (Emergency Fund, Fund, Tithe).
-   **Group Headers**: Each group displays a colored header with icon, label, and balance subtotal.
-   **Dashboard Update**: Accounts card shows 3 distinct groups (Liquid, Savings, Liabilities) with color-coded icons instead of the previous binary asset/liability split.
-   **Preserved Details**: Credit utilization bars and fund progress indicators remain inline within their respective account groups.

#### Files Changed

| Component | Changes |
|-----------|---------|
| `lib/account-utils.ts` | NEW - Account classification utility (AccountClass type, grouping function) |
| `AccountList.tsx` | Rewritten with grouped sections, extracted sub-components |
| `dashboard/page.tsx` | 3-group account display with color-coded headers |

---

### Expense Category Filter

**Filter expenses by category within the selected month for easier expense review and analysis.**

#### Features

-   **Category Filter Dropdown**: New dropdown next to the search bar to filter expenses by category.
-   **Generic DataTable Filters**: Added reusable filter support to DataTable component for future extensibility.
-   **Month-Scoped Filtering**: Filter applies within the selected month only.
-   **Auto-Reset on Month Change**: Category filter resets to "All" when switching months.

#### Bug Fixes

-   **Fixed Month Off-by-One Error**: Resolved timezone issue where selecting February would create budgets for January. Now uses UTC dates consistently between client and server.
-   **Fixed Liability Ledger Running Balance**: Account ledger now correctly calculates running balance for credit cards and other liability accounts. Previously treated all accounts as assets, causing inverted balance display.
-   **Fixed Empty Amount Field UX**: Amount fields now start empty with placeholder instead of showing "0". Users can type directly without clearing first. Applies to Expense, Income, Transfer, and Budget forms.

#### Files Changed

| Component | Changes |
|-----------|---------|
| `budget.types.ts` | Added ReplicateBudgetsInput schema |
| `budget.service.ts` | Added replicateBudgets method, getAvailableBudgetMonths |
| `budget.controller.ts` | Added replicateBudgetsAction, getAvailableBudgetMonthsAction |
| `ReplicateBudgetDialog.tsx` | NEW - Dialog component for budget replication |
| `BudgetList.tsx` | Added Replicate Budget button |
| `BudgetViews.tsx` | Integrated ReplicateBudgetDialog |
| `tooltip.tsx` | NEW - Tooltip component for UI hints |
| `account.service.ts` | Fixed running balance calculation for liability accounts |
| `DataTable.tsx` | Added Filter interface and filters prop for generic filtering |
| `ExpenseList.tsx` | Accept and pass filters to DataTable |
| `ExpenseViews.tsx` | Added category filter state, options, and filtering logic |
| `dashboard.service.ts` | Hybrid expense calculation for Emergency Fund (actual + budget fallback) |
| `dashboard/page.tsx` | Display expense source indicator in Emergency Fund card |
| `ExpenseForm.tsx` | Amount field defaults to empty instead of 0 |
| `IncomeForm.tsx` | Amount field defaults to empty instead of 0 |
| `TransferForm.tsx` | Amount and fee fields default to empty instead of 0 |
| `BudgetForm.tsx` | Amount field defaults to empty instead of 0 |

---

## [v1.7] - January 11, 2026

### [v1.7.3] - January 17, 2026

#### Form Validation & UX Improvements

**Fixed validation bugs and improved error messages across Income and Expense forms for a better user experience.**

##### Bug Fixes

-   **Required Account Validation**: Income entries now require an account to be selected (was previously optional).
-   **Schema Enforcement**: Added server-side validation to prevent income creation without an account.

##### UX Improvements

-   **Auto-Select Single Account**: When user has only one account, it is automatically pre-selected in the income form.
-   **User-Friendly Error Messages**: Replaced cryptic validation errors with clear, actionable messages.
-   **Amount Field**: Now shows "Please enter an amount" instead of technical type errors.
-   **Account Field**: Now shows "Please select an account" instead of "Invalid input: expected string, received undefined".
-   **Category Field**: Now shows "Please select a category" instead of technical refine errors.

##### Files Changed

| Component | Changes |
|-----------|---------|
| `income.types.ts` | Required `accountId`, user-friendly validation messages |
| `expense.types.ts` | User-friendly validation messages for amount, account, category |
| `IncomeForm.tsx` | Auto-select logic for single account users |

---

### [v1.7.2] - January 14, 2026

#### Reports, Smart Savings & Form UX

**Major enhancements including Maya Bank-style transaction statements, smart Emergency Fund auto-deductions based on income stability analysis, and improved form dropdowns with search and balance visibility.**

##### Transaction Statement Report

-   **Maya Bank-Style PDF**: Professional statement design with teal/coral color scheme for credits/debits.
-   **Browser Print Export**: Click "Export PDF" to open a dedicated print page with automatic print dialog.
-   **Statement Summary Card**: Shows opening balance, income, expenses, transfers, and closing balance.
-   **Transaction Table**: Separate Debit/Credit columns with running balance and budget status badges.
-   **Filtering Options**: Filter by transaction type (income, expense, transfer) and category.

##### Emergency Fund Auto-Deduction

-   **Smart Percentage Suggestion**: Analyzes 6 months of income history using Coefficient of Variation (CV).
-   **Income Stability Analysis**: Suggests 15% (stable, CV<15%), 10% (moderate, CV<30%), or 5% (variable, CV≥30%) based on income consistency.
-   **Automatic Transfer**: Creates transfer record to Emergency Fund account with full audit trail.
-   **Conditional Display**: EF contribution option only appears when an Emergency Fund account exists.

##### ExpenseForm Dropdown Enhancements

-   **Searchable Category Combobox**: Type to filter categories with keyboard navigation using cmdk.
-   **Frequent Categories Section**: Shows top 5 most-used categories (last 3 months) with flame icon.
-   **Budget Remaining Display**: Budget dropdown shows remaining amount with health-based color coding.
-   **Color Thresholds**: Green (>20% remaining), Amber (0-20% remaining), Red (over budget).

##### Account Balance Visibility

-   **ExpenseForm**: Account dropdown shows current balance for all account types (spendable and savings).
-   **IncomeForm**: Account dropdown shows current balance alongside account name.
-   **TransferForm**: Both From and To account dropdowns now display current balance.

##### Budget List Enhancement

-   **Available Amount Display**: Replaced percentage display with "X left" showing actual remaining amount.
-   **Color-Coded Status**: Green for positive remaining, Red for negative (over budget).

##### Files Changed

| Component | Changes |
|-----------|---------|
| `report.types.ts` | Added StatementPrintPayload type |
| `report.service.ts` | Enhanced transaction statement generation |
| `reports/page.tsx` | Pass userName and accountName to statement |
| `TransactionStatement.tsx` | Simplified export using browser print |
| `StatementPrintView.tsx` | NEW - Maya Bank-style print layout |
| `app/reports/statement/print/page.tsx` | NEW - Dedicated print route |
| `income.types.ts` | Added emergencyFundEnabled/Percentage fields |
| `income.service.ts` | Added analyzeIncomeStability, EF transfer logic |
| `income.controller.ts` | Added getIncomeStabilityAction |
| `IncomeForm.tsx` | EF checkbox, smart suggestion UI, balance display |
| `income/page.tsx` | Check for EF account existence |
| `category.service.ts` | Added getFrequentCategories method |
| `category.controller.ts` | Added getFrequentCategoriesAction |
| `CategoryCombobox.tsx` | NEW - Searchable combobox with frequent categories |
| `ExpenseForm.tsx` | Category combobox, budget remaining, balance display |
| `TransferForm.tsx` | Added balance to To Account dropdown |
| `BudgetList.tsx` | Show remaining amount instead of percentage |

---

### [v1.7.1] - January 11, 2026

#### Expense Form UX: Budget-Category Auto-Link

**Enhanced expense form UX by auto-linking category when a budget is selected, reducing manual input and preventing mismatches.**

##### UX Improvements

-   **Budget-Category Auto-Link**: Selecting a budget now auto-populates the category field with the budget's linked category.
-   **Locked Category Field**: Category dropdown is disabled when a budget is selected to prevent mismatches.
-   **Field Reorder**: Budget field now appears before Category for logical flow.
-   **Clear Budget Option**: Added "No budget" option to easily unlink and freely select a category.
-   **Truncated Budget Names**: Long budget names now truncate with ellipsis to prevent overflow.

---

### Fund Account Feature

**Introducing dedicated Fund accounts for tracking emergency funds and savings goals. Funds are excluded from Net Worth calculations and displayed in a dedicated dashboard section with health status tracking.**

---

#### New Account Types

-   **Emergency Fund**: Track months of expense coverage with configurable health thresholds (Critical, Underfunded, Building, Funded).
-   **Savings Goal (Fund)**: Track progress toward a target amount with percentage-based health status.
-   **Calculation Modes**: Choose between "Months of Coverage" (budget-linked) or "Target Amount" (goal-based) tracking.

#### Dashboard Integration

-   **Emergency Fund Replaces Runway**: When an Emergency Fund exists, the Runway card displays months of coverage with health status instead of liquid assets calculation.
-   **Dedicated Funds Section**: New full-width section at bottom of dashboard showing all fund accounts with progress bars and health badges.
-   **FundCard Component**: Visual cards displaying balance, progress percentage, and health status (critical/underfunded/building/funded).

#### Financial Logic

-   **Net Worth Exclusion**: Fund accounts (EMERGENCY_FUND, FUND, TITHE) are excluded from Net Worth calculation to separate savings tracking from solvency metrics.
-   **No Opening Balance Income**: Creating fund accounts does not generate "Opening Balance" income entries, keeping income reports clean.
-   **Health Thresholds**: Configurable thresholds for months-of-coverage mode (default: 2/4/6 months for critical/underfunded/funded).

#### Account Form Updates

-   **Fund Account Group**: New "Fund Accounts" section in account type selector with Shield and Target icons.
-   **Fund Info Banner**: Blue alert explaining that funds are excluded from Net Worth.
-   **Dynamic Form Fields**: Calculation mode selector, target amount input, and threshold configuration appear based on selected mode.

#### Files Changed

| Component | Changes |
|-----------|---------|
| `prisma/schema.prisma` | Added EMERGENCY_FUND, FUND to AccountType enum; added fund fields |
| `account.types.ts` | Added FundCalculationMode constant and Zod schema fields |
| `account.service.ts` | Skip opening balance for fund accounts |
| `account.controller.ts` | Handle fund-specific form fields |
| `AccountForm.tsx` | Fund type group, info banner, dynamic form fields |
| `EditAccountDialog.tsx` | Fund-specific fields for editing |
| `dashboard.service.ts` | Net Worth exclusion, getFundHealthMetrics method |
| `dashboard/page.tsx` | Emergency Fund in Runway card, Funds section |
| `FundCard.tsx` | NEW - Fund display card component |

---

## [v1.6] - January 3, 2026

### Mobile-First Responsive Design

**A comprehensive responsive design overhaul making the entire application mobile-friendly with adaptive layouts, touch-optimized navigation, and responsive data tables.**

---

#### Mobile Navigation

-   **Slide-in Drawer**: New Sheet-based mobile sidebar that slides in from the left on small screens.
-   **Touch-Optimized**: Large tap targets and smooth animations for mobile interaction.
-   **Consistent Navigation**: Shared nav items between desktop sidebar and mobile drawer.
-   **Mobile Header**: Sticky header with hamburger menu and app branding on mobile.

#### Responsive Page Layouts

-   **Adaptive Grids**: All page layouts now stack vertically on mobile and expand to multi-column on larger screens.
-   **Form Layouts**: Forms now take full width on mobile, fixed 350px sidebar on desktop (breakpoint at `lg`).
-   **Container Padding**: Reduced vertical padding on mobile (`py-6`) expanding on desktop (`md:py-10`).
-   **Header Text**: Responsive text sizing (`text-2xl sm:text-3xl`) for all page headers.

#### DataTable Improvements

-   **Responsive Pagination**: Controls stack vertically on mobile, inline row on desktop.
-   **Search Layout**: Search bar and result counter adapt to available screen width.
-   **Horizontal Scroll**: Tables with many columns scroll horizontally when content exceeds viewport.

#### Reports & Charts

-   **Scrollable Tabs**: Report tabs now scroll horizontally on mobile devices.
-   **Responsive Pie Chart**: Category breakdown chart uses percentage-based radius (`70%`) instead of fixed pixels.
-   **Stacking Grids**: P&L multi-column chart layouts (`lg:col-span-*`) stack to single column on mobile.
-   **Cash Flow Summary**: Summary row stacks vertically on mobile (`grid-cols-1 sm:grid-cols-3`).
-   **Budget Analytics Table**: Added horizontal scroll support with minimum width.

#### Ledger Views

-   **Account Ledger**: Header actions wrap on mobile with `flex-col sm:flex-row`, table scrolls horizontally.
-   **Budget Ledger**: Metrics grid changes from 4 columns to 2 on mobile (`grid-cols-2 lg:grid-cols-4`).
-   **Export Buttons**: Show abbreviated text on mobile ("CSV" vs "Export CSV").
-   **Truncated Headers**: Long account/budget names truncate with ellipsis on small screens.

#### Bug Fixes

##### Transfer Liability Logic

-   **Fixed Transfer Balance Calculation**: Transfers to/from liability accounts now correctly update balances.
-   **Paying Debt (Asset → Liability)**: Destination liability balance now correctly decreases (debt paid off).
-   **Borrowing (Liability → Asset)**: Source liability balance now correctly increases (more debt incurred).
-   **Fee Handling**: Transfer fees now properly account for liability source accounts.

##### Adjust Balance Dialog

-   **Fixed Liability Adjustment**: Adjusting debt on liability accounts now works correctly.
-   **Increase Debt**: Now creates an Expense (which increases liability balance).
-   **Decrease Debt**: Now creates an Income (which decreases liability balance / payment).

##### DataTable Header Alignment

-   **Fixed Right-Aligned Headers**: Sortable column headers with `text-right` now properly align with cell values.

#### Files Changed

| Component | Changes |
|-----------|---------|
| `layout.tsx` | Added mobile header with MobileSidebar |
| `mobile-sidebar.tsx` | New component for mobile navigation drawer |
| `nav-items.ts` | Shared navigation items configuration |
| `DataTable.tsx` | Responsive search, pagination, and header alignment fix |
| `AccountLedger.tsx` | Responsive header and table |
| `BudgetLedger.tsx` | Responsive metrics grid and header |
| `reports/page.tsx` | Responsive grids and scrollable tabs |
| `transfer.service.ts` | Fixed liability balance logic for transfers |
| `account.controller.ts` | Fixed liability logic for balance adjustments |
| All page files | Consistent responsive container and header patterns |

---

## [v1.5] - December 31, 2024

### Budget Analytics & Liability Fixes

**A major update introducing intelligent budget analytics with problem detection, progress tracking, and critical fixes for liability account balance handling.**

---

#### Budget Analytics

##### Budget Health Summary (Budget Page)

-   **Quick Health Overview**: New summary card at the top of the Budget page showing budget status at a glance.
-   **Problem Detection**: Automatically flags categories that are consistently over budget (3+ months).
-   **Status Indicators**: Color-coded badges showing on-track, warning, and over-budget counts.

##### Budget Analytics Tab (Reports Page)

-   **6-Month Trend Chart**: Visualizes budget adherence over time with monthly breakdown.
-   **Category Performance Table**: Shows average budget vs spent, variance percentage, and trend indicators.
-   **Smart Recommendations**: AI-driven suggestions to increase, decrease, or maintain budget amounts based on historical spending patterns.
-   **Budget Health Score**: Weighted score combining categories on track (50%), overall adherence (30%), and improvement trend (20%).

##### Recommendation Thresholds

-   **Needs Increase**: Over budget 3+ of last 6 months.
-   **Consider Reduce**: Under 60% utilization for 3+ months.
-   **Stable**: Within 60-100% most months.

---

#### Bug Fixes

##### Liability Account Balance Logic

-   **Fixed Expense Balance Calculation**: Expenses on credit cards now correctly **increase** the balance (debt goes up), not decrease it.
-   **Fixed Income/Payment Balance Calculation**: Payments to credit cards now correctly **decrease** the balance (debt goes down).
-   **Consistent Liability Handling**: All CRUD operations (create, update, delete) for expenses and income now properly check the `isLiability` flag.
-   **Tithe Logic Exclusion**: Church tithe calculations are now correctly skipped for liability accounts.

##### AccountLedger Terminology

-   **Dynamic Label**: Liability accounts now display "Amount Owed" instead of "Current Balance" for clarity.

---

## [v1.4] - December 30, 2024

### Financial Analytics & UX Overhaul

**A massive update delivering professional-grade reporting tools, envelope budgeting, and a streamlined data management experience.**

---

### [v1.4.1] - December 30, 2024

#### Credit & Debt Metrics Enhancement

**A patch to fix color logic bugs and enhance dashboard metrics with no-sugarcoating, granular feedback.**

##### Bug Fixes

-   **Fixed Inverted Credit Utilization Colors**: Corrected the Accounts List where 100% usage incorrectly showed as green. Now properly shows red for high utilization.
-   **Consistent Color Thresholds**: Aligned all credit utilization displays (Dashboard, Accounts List, Liabilities section) with the same 7-tier color system.

##### Dashboard Net Worth Card

-   **Dynamic Color Indicators**: Net Worth card now shows green when positive, red when negative (was static indigo).
-   **Warning Message**: Displays "⚠️ Liabilities exceed assets" when net worth is negative.

##### Balance Sheet (Statements Tab)

-   **Total Equity Color Coding**: Net Worth footer now shows green/yellow/red based on financial health.
-   **Status Indicators**: Added contextual messages from "⚠️ Liabilities exceed assets" to "🏆 Strong financial position".
-   **Fixed Liability Credit Utilization**: Credit card progress bars in Liabilities section now correctly show red for high utilization (was inverted, showing green at 100%).

##### Transfer List Table

-   **Added Description Column**: Transfers now display the description field with searchable functionality.

##### Enhanced Credit Utilization Card

-   **7-Tier Color Thresholds**: 0% (Perfect), <10% (Excellent), 10-30% (Healthy), 30-50% (High), 50-70% (Suffering), 70-90% (Critical), 90%+ (Maxed Out).
-   **Available Credit Display**: Added "Used: ₱X" and "Available: ₱X" breakdown to show actual spending capacity.
-   **Dynamic Card Styling**: Border and icon colors now reflect utilization severity.

##### Enhanced Debt Paydown Card

-   **6-Tier Paydown Thresholds**: 0% (Zero payments), <1% (Token), 1-3% (Minimum), 3-5% (Progress), 5-10% (Strong), 10%+ (Aggressive).
-   **Context-Rich Display**: Shows payment as percentage of total debt (e.g., "₱5,000 (2.5% of debt)").
-   **Time-to-Payoff Estimate**: Displays "~12 mo to freedom", "~2 yr to go", or "Never at this rate" based on current payment velocity.
-   **Debt-Free State**: Celebrates "Debt Free! 🎉" when no liabilities exist.

##### Dashboard Liabilities Section

-   **Available Credit per Card**: Each credit card now shows "Avail: ₱X" alongside utilization percentage.
-   **Updated Color Logic**: Uses same 7-tier thresholds for consistency.

##### Accounts List Table

-   **Fixed Color Bug**: Progress bar and text now correctly show red for high utilization (was inverted).
-   **Dual Display**: Changed from "X% of limit" to "X% Used | Avail: ₱X" for clearer actionable insight.

---

#### Reporting Intelligence

-   **Net Worth Trend Chart**: Visualizes wealth growth over time with a retroactive "reverse-replay" algorithm.
-   **Tabbed Reports Dashboard**: Consolidated analytics into distinct Overview, P&L, and Balance Sheet views.
-   **Global Date Controls**: Unified sticky toolbar for filtering all charts simultaneously.

#### Data Management Excellence

-   **Interactive DataTables**: Added pagination, sorting, filtering, and search to Income, Expense, Transfer, and Budget lists.
-   **Bulk Visibility**: Optimized UI to handle thousands of records without performance degradation.

#### Envelope Budgeting

-   **Named Budgets**: Users can now create multiple recurring budgets per category (e.g., "Car Insurance" and "Life Insurance" under the Insurance category).
-   **Budget Tracking**: Enhanced precision in linking expenses to specific budget envelopes.

#### Financial Accuracy & Core UX

-   **Transfer Fees**: Added explicit handling for bank fees during transfers.
-   **Account Archiving**: Implemented "Soft Delete" to hide old accounts without losing historical data.
-   **Liability Accounting Standard**: Standardized "Balance = Amount Owed" across all forms and reports.

## [v1.3] - December 27, 2024

### Credit Logic Hotpatch

**A critical update to align system logic with our financial reality regarding credit utilization and debt calculation.**

#### Hotfix

-   **Corrected Credit Utilization**: Fixed logic that incorrectly interpreted "Available Credit" as "Debt". The system now correctly calculates `Usage = Limit - Balance`.
-   **Accurate Liability Tracking**: Dashboards and Reports now show the actual amount owed on credit cards, not the remaining limit.
-   **Visual Integrity**: Utilization progress bars now correctly indicate safety (Green = Low Usage) and danger (Red = High Usage) zones.
-   **Expense Form UI**: Resolved an issue where selecting a category would not display the selected value in the form field.

## [v1.2] - December 27, 2024

### Solvency & Integrity Update

**A major architectural shift focusing on financial solvency, credit integrity, and accurate liability tracking.**

#### Dashboard Refactor

-   Introduced "Solvency First" design philosophy.
-   Replaced tactical cash flow cards with a Financial Health Grid (Net Worth, Runway, Debt To Asset).
-   Added "Total Debt" and "Credit Utilization" as primary KPI metrics.
-   Split Account Overview into distinct "Liquid Assets" and "Liabilities" sections.

#### Financial Reporting

-   Completely Redesigned Balance Sheet: Aligned Assets & Liabilities for easier reading.
-   Added Net Worth Context: New footer showing Total Equity (Assets - Liabilities).
-   Detailed Liability Context: Added credit utilization bars directly to liability accounts in the report.

#### Credit Card Integrity

-   Enforced strict liability logic: Credit Cards & Loans are now always treated as Liabilities.
-   Added "Credit Limit" field to account management.
-   Implemented strict backend validation to prevent misclassification of debt instruments.

#### Visual Enhancements

-   Added color-coded "Danger Thresholds" (50%) for credit utilization bars.
-   Improved empty states for various sections.

## [v1.1] - December 15, 2024

### Analytics & Account Management

**Enhanced the application with deep-dive reporting capabilities and full account lifecycle management.**

#### Advanced Reports

-   Launched "Monthly Comparison" chart to track spending trends over time.
-   Added "Category Breakdown" pie charts for granular expense analysis.
-   Introduced "Budget Performance" tracking to visualize actual vs. planned spending.

#### Account Control

-   Full Create/Read/Update/Delete (CRUD) capabilities for financial accounts.
-   Support for multiple account types (Bank, Cash, Investment, Loan).
-   Real-time balance updates reflected across all dashboard metrics.

## [v1.0] - December 1, 2024

### Foundation Release

**The initial launch of the Personal Budget Planner, establishing the core pillars of financial tracking.**

#### Core Tracking

-   Transaction logging for Income and Expenses.
-   Category tagging with custom colors and icons.
-   Internal Transfer system for moving money between accounts without affecting net income.

#### Security & Infrastructure

-   Secure Authentication via NextAuth.js.
-   Robust PostgreSQL database schema with Prisma ORM.
-   Responsive, mobile-friendly UI built with Tailwind CSS and Shadcn/ui.
