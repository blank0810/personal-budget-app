# Features Walkthrough & User Guide

## 0. System Setup & Configuration

Before using the application, understanding the setup ensures data accuracy.

### A. Docker Environment

The app runs in a containerized environment (Docker) to ensure the database (`PostgreSQL`) is isolated and consistent.

-   **Command**: `docker-compose up -d`
-   **Effect**: Starts the App (Port 3000), Database (Port 5433), and Database GUI (pgAdmin on Port 5051).

### B. Seed Data

To test features without manual entry, the system includes a "Seed Script".

-   **Command**: `npm run seed`
-   **Effect**: Creates a "Demo User", 5 Accounts, and 50+ transactions to populate charts immediately.

---

# Dashboard Walkthrough

## 1. High Level & First Glance

When you first log in, the **Dashboard** serves as your mission control. It is designed to answer the most critical question immediately: _"Am I financially healthy right now?"_

1.  **Financial Health Indicators (Top Row)**: Four color-coded cards giving you a high-level "scorecard" of your financial resilience.
2.  **Monthly Pulse (Middle Row)**: A breakdown of immediate cash flow (Net Worth vs. Monthly Burn).
3.  **Activity Feed (Bottom Section)**: Latest 5 transactions and Account Balance summary.

> [!NOTE] > **Technical Underpinning**: This page performs a heavy aggregate query (`dashboard.service.ts`). It fetches `Accounts`, `Incomes`, `Expenses`, and `Transfers` in parallel using `Promise.all` to render instantly.

## 2. Rationale & Purpose

-   **Rationale**: Most apps focus on "Where did I spend?". This dashboard focuses on "How long can I survive?" (Runway) and "Am I building wealth?" (Net Worth).
-   **Purpose**: Instant feedback loop. Buying a coffee immediately drops your _Daily Burn_ metric.

## 3. Logics Used

### A. Financial Health Metrics

| Metric           | Formula                                | Goal               |
| :--------------- | :------------------------------------- | :----------------- |
| **Savings Rate** | `((Income - Expense) / Income) * 100`  | > 20% (Green)      |
| **Debt Paydown** | `Sum(Transfers to Liability Accounts)` | Maximize (Green)   |
| **Runway**       | `Total Assets / Monthly Expenses`      | > 6 Months (Green) |

### B. Net Worth Calculation

-   **Formula**: $\sum(Assets) - \sum(Liabilities)$
-   **Data Source**: Iterates through `Account` table. Checks `isLiability` flag (e.g., Credit Cards = True).

---

# Income Page Walkthrough

## 1. High Level & First Glance

Split into **Fast Entry Form** (Left) and **Yearly Grid View** (Right).

## 2. Rationale

**"Money has a home"**. You cannot just "have income"; it must land in a specific **Account**.

## 3. Logics Used

### A. The "Account-First" Principle

When you log Income:

1.  **DB Action 1**: Create `Income` record.
2.  **DB Action 2**: Update `Account` balance (`increment`).
    _This is transactional. If one fails, both fail._

### B. Auto-Tithe (10%)

If enabled:

1.  System calculates 10% of Gross.
2.  Automatically creates a `Transfer` record from Deposit Account -> Tithe Account.
3.  **Result**: You see Net Income in your bank, but Gross Income in your reports.

---

# Expense Page Walkthrough

## 1. High Level & First Glance

**Expense Form** (Left) linked to Budgets, and **Ledger History** (Right).

## 2. Rationale

**"If you don't measure it, you can't manage it."**

## 3. Logics Used

### A. Immediate Debit

-   **DB Action**: Decrements the linked `Account` balance immediately.
-   **Visual**: Your "Net Worth" on the dashboard drops the second you click save.

### B. Budget Impact

-   Each Expense is tagged with a `CategoryId`.
-   System sums all Expenses with that `CategoryId` for the current month -> Updates Budget Bar.

---

# Budget Page Walkthrough

## 1. High Level & First Glance

Sets spending limits. Features a **Yearly Grid View** to spot seasonal overspending.

## 2. Logics Used

### A. Dynamic Aggregation

Budgets are not static. The status bar (Green/Red) is calculated live:
`Utilization = (Sum of Expenses with CategoryID / Budget Limit) * 100`

### B. Zero-Based Goal

The UI encourages you to assign every dollar of Income to a Budget Category (including Savings).

---

# Accounts Page Walkthrough

## 1. High Level & First Glance

List of all Asset/Liability containers. Features a **Unified Ledger** View.

## 2. Logics Used

### A. The "Liability" Flag

-   **True**: Account balance is subtracted from Net Worth. Transfers IN = Debt Paydown.
-   **False**: Account balance is added to Net Worth.

### B. Unified Ledger

Aggregates `prisma.income`, `prisma.expense`, and `prisma.transfer` into a single chronological list, allowing you to reconcile against real bank statements.

---

# Transfer Page Walkthrough

## 1. High Level & First Glance

Move money between accounts.

## 2. Logics Used

### A. Atomic Transactions

Crucial for data integrity. Uses `prisma.$transaction`:

1.  Create Transfer.
2.  Debit Source.
3.  Credit Destination.

### B. Neutrality

Transfers do **not** appear on Income/Expense reports, preserving accurate P&L data.

---

# Reports Page Walkthrough

## 1. High Level & First Glance

The **"Financial Health Monitor"**.

## 2. Logics Used

### A. KPI Momentum

-   **Comparison**: Current Period vs Previous Period (e.g., This Month vs Last Month).
-   **Visual**: Green Arrow = Good Trend (Income Up, Expense Down).

### B. P&L Statement

-   **Data Source**: Dynamic query of `Income` and `Expense` tables grouped by `Category`.
-   **Structure**: Revenue - COGS = Net Income.

## 3. Scenario: "The Q1 Audit"

**User**: Alex.
**Action**: Sets range Jan 1 - Mar 31.
**Result**: Identifies he spent $450 on "Subscriptions" (Gym). Cancels it.
**Outcome**: Data -> Wisdom -> Action.
