# Changelog

All notable changes to this project will be documented in this file.

## [v1.3] - December 27, 2024

### Credit Logic Hotpatch

**A critical update to align system logic with our financial reality regarding credit utilization and debt calculation.**

#### Hotfix

-   **Corrected Credit Utilization**: Fixed logic that incorrectly interpreted "Available Credit" as "Debt". The system now correctly calculates `Usage = Limit - Balance`.
-   **Accurate Liability Tracking**: Dashboards and Reports now show the actual amount owed on credit cards, not the remaining limit.
-   **Visual Integrity**: Utilization progress bars now correctly indicate safety (Green = Low Usage) and danger (Red = High Usage) zones.

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
