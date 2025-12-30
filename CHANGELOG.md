# Changelog

All notable changes to this project will be documented in this file.

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
