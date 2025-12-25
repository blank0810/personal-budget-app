# Dashboard Walkthrough

## 1. High Level & First Glance

When you first log in to the Personal Budget App, the **Dashboard** serves as your mission control. It is designed to answer the most critical question immediately: _"Am I financially healthy right now?"_

At a first glance, the page is divided into three logical sections:

1.  **Financial Health Indicators (Top Row)**: Four color-coded cards giving you a high-level "scorecard" of your financial resilience.
2.  **Monthly Pulse (Middle Row)**: A breakdown of your immediate cash flow—what you possess (Net Worth) vs. what's moving in and out this month.
3.  **Activity Feed (Bottom Section)**: Split between your latest transactions and a quick summary of your account balances.

The design uses **color queues** (Green for healthy/credit, Red for warning/debit, Yellow for caution) to draw your attention to areas needing improvement without requiring you to read every number.

---

## 2. Rationale & Purpose

The dashboard allows you to move from **reactive** to **proactive** financial management.

-   **Rationale**: Most budgeting apps focus on "Where did I spend money?". This dashboard focuses on "How long can I survive?" (Runway) and "Am I building wealth?" (Net Worth/Savings Rate).
-   **Purpose**: To provide an instant feedback loop. If you buy a coffee, you should see your _Daily Burn_ go up slightly. If you get paid, your _Savings Rate_ for the month improves.

---

## 3. Logics Used

Here is the exact logic driving each component on the screen:

### A. Financial Health Metrics (Top Row)

These metrics are calculated based on the **current month's** activity and your total account standings.

| Metric            | Formula                                | Logic / Goal                                                                                                         |
| :---------------- | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Savings Rate**  | `((Income - Expense) / Income) * 100`  | Shows what % of your income you keep. Also shows absolute **amount saved**. **Goal:** > 20% (Green).                 |
| **Debt-to-Asset** | `(Liabilities / Assets) * 100`         | Shows how leveraged you are. **Goal:** < 30% (Green). Higher turns Yellow.                                           |
| **Debt Paydown**  | `Sum(Transfers to Liability Accounts)` | Total amount paid towards debt (Credit Cards/Loans) this month. High is good (Green).                                |
| **Runway**        | `Total Assets / Monthly Expenses`      | The number of months you could survive on your current assets if income stopped today. **Goal:** > 6 months (Green). |

### B. Detailed Breakdown (Middle Row)

-   **Net Worth**: `(Sum of Asset Accounts) - (Sum of Liability Accounts)`
    -   _Assets_: Accounts where `isLiability = false`.
    -   _Liabilities_: Accounts where `isLiability = true`. (Configured in Account Settings)
-   **Income (This Month)**: Total of all transactions marked as `INCOME` dated from the 1st of the current month to now.
-   **Expenses (This Month)**: Total of all transactions marked as `EXPENSE` dated from the 1st of the current month to now.
-   **Cash Flow**: `Income - Expenses`. Positive is Green (Surplus), Negative is Red (Deficit).

### C. Recent Transactions & Accounts

-   **Recent Transactions**: Displays the last 5 transactions (both Income and Expense), sorted by date (newest first).
-   **Accounts**: Lists all connected accounts ordered by balance (highest to lowest).

---

## 4. Sample Scenario: "The Monthly Reset"

**User**: Alex, a Freelance Designer.
**Date**: November 25th.

### Initial State

-   **Net Worth**: $10,000 (Savings) - $1,000 (Credit Card) = **$9,000**.
-   **November Income**: $4,000.
-   **November Expenses**: $3,000.
-   **Savings Rate**: 25% (Green).

### The Event

Alex's laptop breaks, and he buys a new MacBook Pro for **$2,500** using his Credit Card.

### The Dashboard Update

Immediately after logging this transaction, the Dashboard reflects the new reality:

1.  **Expenses (This Month)** jumps from $3,000 → **$5,500**.
2.  **Cash Flow** drops from +$1,000 (Green) → **-$1,500** (Red). _Alex has spent more than he earned this month._
3.  **Savings Rate** plummets: `($4,000 - $5,500) / $4,000` = **-37.5%**. The card turns **Yellow/Warning**.
4.  **Net Worth** drops: Assets ($10,000) - Liabilities ($1,000 + $2,500) = **$6,500**.
5.  **Runway** shrinks: Since his "Monthly Burn" is now higher ($5,500), his $10,000 in assets would only last ~1.8 months at this spending rate, turning the Runway card **Red**.

### Insight

Alex logs in and sees **Red** and **Yellow** indicators immediately. He realizes that while he has cash in the bank, this month was a financial hit. He decides to delay his upcoming vacation booking until the _Savings Rate_ recovers next month.

---

# Income Page Walkthrough

## 1. High Level & First Glance

The **Income Page** is designed for speed and clarity. It is split into two distinct zones:

1.  **Fast Entry Form (Left/Top)**: A streamlined form to log money coming in. It anticipates your needs with "One-Click" features like Auto-Tithing and Recurring flags.
2.  **Income History & Views (Right/Bottom)**: Defaults to the current month's transaction list. Includes a **"View All Months"** toggle to switch to a **Yearly Grid View**, giving you a birds-eye view of your income across the entire year.

## 2. Rationale & Purpose

-   **Rationale**: Income isn't just a number; it's the `Source` of truth for your budget. If this is wrong, everything else is wrong.
-   **Purpose**: To enforce **"Money has a home"**. You cannot just "have income"; it must land in a specific **Account**. This ensures your real-world bank balance always matches the app.

## 3. Logics Used

### A. The "Account-First" Principle

When you log an Income of $1,000 to "Chase Checking":

1.  An `Income` record is created for history.
2.  The `Account` (Chase Checking) balance is **immediately incremented** by $1,000.

### B. The Auto-Tithe Feature (Unique Logic)

If you enable **"Auto-Tithe 10%"** on an income entry (e.g., $1,000 Salary):

1.  **Income Logged**: +$1,000 recorded as Income.
2.  **Initial Deposit**: +$1,000 added to your Main Account.
3.  **Tithe Calculation**: System calculates $100 (10%).
4.  **Auto-Transfer**: System creates an immediate `Transfer` of $100 from Main Account -> "Tithes" Account.
    -   _Result_: Main Account increases by net $900. Tithes Account increases by $100.

### C. Yearly Aggregation & Navigation

The "View All Months" feature uses client-side logic to:

1.  **Aggregate**: Instantly sums up all income transactions by month.
2.  **Navigate**: Allows clicking into any specific month (e.g., "June") to filter the list view to that specific date range.
3.  **Analyze**: Provides a quick "12-Month Scorecard" to see seasonal income trends at a glance.

## 4. Sample Scenario: "The Paycheck Protocol"

**User**: Sarah.
**Event**: Bi-weekly Paycheck of **$3,000**.

1.  Sarah opens **Income**.
2.  Enters `$3,000`, selects `Salary` category, and `Bank of America` account.
3.  Checks **"Deduct Tithe (10%)"**.
4.  Clicks **Save**.

**System Action**:

-   **Income Report**: Shows +$3,000 Income for the month.
-   **Bank Account**: Increases by **$2,700** ($3,000 - $300).
-   **Tithe Account**: Increases by **$300**.
-   **Net Worth**: Increases by total $3,000.

_Sarah doesn't have to manually calculate 10% or make a second transfer transaction. It's handled atomically._

> [!NOTE] > **Dashboard Display**: The Income History table displays the **Gross Amount** ($3,000). The Tithe deduction is handled as a separate background transfer and does not reduce the figure shown in the Income column, keeping your "Total Income" metrics accurate.

---

# Expense Page Walkthrough

## 1. High Level & First Glance

Similar to the Income Page, the **Expenses Page** is divided into two functional areas:

1.  **Expense Form (Left/Top)**: A detailed form to log spending. It allows linking every expense to a **Budget Category** and a **Payment Method** (Account).
2.  **Expense History & Views (Right/Bottom)**: Defaults to the current month's ledger. Includes a **"View All Months"** toggle to switch to a **Yearly Grid View**, useful for spotting seasonal spending spikes.

## 2. Rationale & Purpose

-   **Rationale**: "If you don't measure it, you can't manage it."
-   **Purpose**: To answer two questions: "Who paid for this?" (Account) and "Why did I buy this?" (Budget Category). If you track these two things, you have total clarity.

## 3. Logics Used

### A. The "Swipe" Logic (Immediate Debit)

Unlike a credit card statement that you see weeks later, this app tracks the "swipe" immediately:

1.  **Expense Logged**: -$50 recorded as an Expense.
2.  **Balance Updated**: The linked Account (e.g., "Chase Sapphire") is **immediately decremented** by $50.

### B. Budget Impact

Every expense requires a **Category**. This category links to your monthly Budget.

-   Logging a $100 "Grocery" expense immediately adds $100 to the "Used" portion of your Grocery Budget for the current month.
-   This provides the real-time "Overbudget" alerts you see on the Dashboard.

### C. Yearly Aggregation & Navigation

The "View All Months" feature allows you to:

1.  **Aggregate**: See total expenses per month (e.g., "December: $2,500").
2.  **Navigate**: Click any month to view that specific month's ledger.
3.  **Analyze**: Quickly identify high-spending months (highlighted in **Red**) compared to lower spending months.

## 4. Sample Scenario: "Friday Night Dinner"

**User**: Alex.
**Event**: Dinner at an Italian Restaurant ($85).

1.  Alex opens **Expenses**.
2.  Enters `$85`, Description: "Dinner with Sarah".
3.  Selects Category: `Dining Out`.
4.  Selects Account: `Amex Gold`.
5.  Clicks **Save**.

**System Action**:

-   **Expense Report**: Shows -$85 Expense.
-   **Amex Gold Account**: Balance decreases by $85 (or debt increases by $85 if liability).
-   **Dining Budget**: "Used" amount increases by $85. If budget was $200 and he had used $150, he is now **Over Budget** ($235/$200).

---

# Budget Page Walkthrough

## 1. High Level & First Glance

The **Budgets Page** acts as your financial guardrails. It is the place where you set the "Speed Limits" for your spending categories.

1.  **Set Budget (Left/Top)**: A simple tool to define a limit for a specific category for a specific month.
2.  **Budget Overview & Views (Right/Bottom)**: Defaults to the current month's progress bars. Includes a **"View All Months"** toggle to switch to a **Yearly Grid View**, allowing you to compare your budgeted vs. actual spending across the whole year.
    -   **Green Bar**: Safe zone (< 85% used).
    -   **Yellow Bar**: Warning zone (85-100% used).
    -   **Red Bar**: Danger zone (> 100% used).

## 2. Rationale & Purpose

-   **Rationale**: "A budget is telling your money where to go instead of wondering where it went."
-   **Purpose**: To prevent overspending _before_ it destroys your Savings Rate. It proactively alerts you when you are drifting off course.

## 3. Logics Used

### A. Dynamic Aggregation

Budgets are not static numbers you manually update. They are **live containers**:

1.  **Search**: When you load the page for "December", the system finds all expenses linked to "Groceries".
2.  **Sum**: It sums them up (e.g., $450).
3.  **Compare**: It compares this sum to your defined limit ($500).
4.  **Display**: It calculates the percentage (90%) and renders the appropriate color bar.

### B. The "Zero-Based" Goal

To achieve a Zero-Based Budget, you can assign every dollar of expected income to a specific budget category (including Savings). If your Income is $5,000, your total Budget Limits should ideally sum to $5,000.

## 4. Sample Scenario: "The Coffee Cap"

**User**: Alex.
**Goal**: Limit coffee spending to $50/month.

1.  Alex sets a Budget of **$50** for the `Coffee` category.
2.  He buys a latte ($5). The bar fills to **10%** (Green).
3.  Two weeks later, he has spent $45. The bar is at **90%** (Yellow).
4.  He buys one more coffee ($6). Total is now $51.
5.  **Alert**: The Budget Bar turns **Red** (102%). The Dashboard "Financial Health" card for that category (if visible) would flag a warning.

_Outcome: Alex sees the Red bar and decides to bring coffee from home for the rest of the month._

---

# Accounts Page Walkthrough

## 1. High Level & First Glance

The **Accounts Page** is the foundation of the entire system.

1.  **Create Account (Left/Top)**: A form to onboard new financial containers (Banks, Credit Cards, Cash).
2.  **Your Accounts (Right/Bottom)**: A centralized list of all your assets and liabilities.
3.  **The Ledger (Deep Dive)**: Clicking the **File Icon** on any account opens a specialized **Unified Ledger**. This view aggregates all money movement (Income, Expense, Transfer) into a single chronology, ignoring budget limits but **still displaying the Category** for context.

## 2. Rationale & Purpose

-   **Rationale**: "You cannot manage what isn't real."
-   **Purpose**: To mirror reality. Every dollar you physically own must reside in a digital Account here. If your physical wallet has $50, your "Wallet" account here must show $50.

## 3. Logics Used

### A. The "Liability" Flag

When creating an account (like a Credit Card), checking **"Treat as Liability"** changes the math:

1.  **Net Worth**: The balance is _subtracted_ from your total wealth.
2.  **Debt Paydown**: Transfers _into_ this account are counted as "Debt Paydown" (a positive metric) rather than just moving money around.

### B. The Unified Ledger

The Ledger logic aggregates three distinct data sources into one timeline:

-   `Incomes` (Money In)
-   `Expenses` (Money Out)
-   `Transfers` (Money Moved In/Out)
    This allows you to reconcile this app against your actual bank statement line-by-line.

## 4. Sample Scenario: "The Debt Trap"

**User**: Alex.
**Goal**: Track a Credit Card balance of $500.

1.  Alex adds a new Account: "Visa Signature".
2.  Sets Balance: `$500`.
3.  **Crucial Step**: Checks **"Treat as Liability"**.
4.  Clicks **Save**.

**System Action**:

-   **Dashboard**: His Net Worth _decreases_ by $500.
-   **Health Card**: The "Debt-to-Asset" ratio indicator rises (possibly turning Yellow).
-   **Future Action**: When he pays off this card next week, the system will record that as **Debt Paydown**, giving him a "Green" metrics boost.

---

# Transfer Page Walkthrough

## 1. High Level & First Glance

The **Transfers Page** is the logistical engine of your financial system. It handles the movement of money between your accounts without affecting your Income or Expense reports.

1.  **New Transfer (Left/Top)**: A specialized form for moving funds.
2.  **Recent Transfers (Right/Bottom)**: A clean history of internal movements, using clear "From -> To" visual cues.

## 2. Rationale & Purpose

-   **Rationale**: "Moving money from your Left Pocket to your Right Pocket isn't spending."
-   **Purpose**: To keep your Account Balances accurate (Reality Mirroring) without messing up your Budget. If you pay off a credit card, you didn't "spend" that money twice; you just moved it involved.

## 3. Logics Used

### A. Atomic Transactions

Every transfer is an **Atomic Operation**. This means three things happen instantly and simultaneously, or none of them happen:

1.  **Record**: A Transfer record is created.
2.  **Debit**: The Source Account is decreased.
3.  **Credit**: The Destination Account is increased.
    _This prevents "Ghost Money" where funds leave one account but never arrive at the other._

### B. The "Neutrality" Rule

Transfers are **Cash Flow Neutral**.

-   They do **NOT** appear as Income.
-   They do **NOT** appear as Expenses.
-   They do **NOT** affect your Monthly Budget limits.

### C. Debt Paydown Detection

While neutral for Cash Flow, the system watches where the money lands:

-   **Asset -> Asset**: Neutral (e.g., Checking -> Savings).
-   **Asset -> Liability**: **Good**. The system tags this as **"Debt Paydown"** and creates a positive Green metric on your Dashboard.

## 4. Sample Scenario: "Bill Pay Day"

**User**: Alex.
**Goal**: Pay off his $500 Visa balance.

1.  Alex opens **Transfers**.
2.  From: `Chase Checking` ($2,000).
3.  To: `Visa Signature` ($500 balance).
4.  Amount: `$500`.
5.  Clicks **Transfer**.

**System Action**:

-   **Chase Checking**: Drops to $1,500.
-   **Visa Signature**: Drops to $0 (Paid off).
-   **Debt Paydown** metric increases by $500.
    -   "Net Worth" remains the same (Asset went down, Liability went down).

---

# Reports Page Walkthrough

## 1. High Level & First Glance

The **Reports Page** is the "Financial Health Monitor" of the application. Unlike the transactional pages (Income/Expense) which handle data entry, this page aggregates millions of data points into actionable intelligence.

It is divided into **4 Strategic Zones**:

1.  **KPI Cards**: The "Vitals" check.
2.  **Trend Analytics**: The "Direction" check (Charts).
3.  **Budget Performance**: The "Discipline" check.
4.  **Financial Statement**: The "Audit" check (Deep Ledger).

---

## 2. Zone I: KPI Cards (The Vitals)

These 4 cards at the top provide an instant pulse check. They do not just show numbers; they show **Momentum** compared to the previous period.

### A. Net Result

-   **Definition**: `Total Income - Total Expenses`.
-   **Logic**:
    -   **Positive**: You are profitable (Green).
    -   **Negative**: You are burning cash (Red).
-   **Comparison**: Compares current period vs. previous period of same length (e.g., This Month vs Last Month).
-   **Scenario**:
    -   Last Month: Made $5k, Spent $4k = **+$1k Net**.
    -   This Month: Made $5k, Spent $6k = **-$1k Net**.
    -   **Result**: The card shows -$1,000 with a **Red Arrow** pointing down (200% drop).

### B. Inflow Velocity (Total Income)

-   **Definition**: Sum of all records in the **`Income` table** for the logged-in user.
-   **Logic**: Measures the raw speed of money entering your life.
-   **Scenario**: You get a bonus. The value spikes. The trend arrow turns Green.

### C. Burn Rate (Total Expenses)

-   **Definition**: Sum of all records in the **`Expense` table** for the logged-in user.
-   **Inverse Logic (Unique)**:
    -   **Trend Up (More Spending)**: Displayed as **Red Arrow** (Bad).
    -   **Trend Down (Less Spending)**: Displayed as **Green Arrow** (Good).
    -   **Why?**: In personal finance, "Growth" in expenses is usually negative.

### D. Savings Ratio (The Golden Metric)

-   **Formula**: `(Net Income / Total Income) * 100`.
-   **Significance**: This is the single most important number for financial independence.
-   **Target**: Financial Advisors recommend > 20%.
-   **Visual**:
    -   **0-10%**: Critical Danger.
    -   **10-20%**: Healthy.
    -   **>50%**: "Fire" Mode (Financial Independence Retire Early).

---

## 3. Zone II: Visual Analytics (Trends)

### A. Monthly Comparison Chart (Bar Chart)

-   **Question Answered**: "Am I making more than I spend _consistently_?"
-   **Visuals**:
    -   **Green Bar**: Income for that month.
    -   **Red Bar**: Expenses for that month.
-   **Gap Analysis**: The white space between the Green and Red bar is your **Margin**. If Red is taller than Green, you are in debt for that month.

### B. Category Breakdown (Pie Chart)

-   **Question Answered**: "Where is my money actually going?"
-   **Logic**: Aggregates expenses by category sum.
-   **Scenario**: You think you spend most on Rent, but the chart reveals **30% Dining Out**. This is a "Reality Check" visualization.

---

## 4. Zone III: Budget Performance

-   **Question Answered**: "Did I stick to the plan?"
-   **Logic**:
    -   `Variance = Budget Limit - Actual Spending`
    -   `% Used = (Actual / Budget) * 100`
-   **Traffic Light System**:
    -   **Green (< 80%)**: Safe. You are under budget.
    -   **Yellow (80-100%)**: Caution. You are nearing the limit.
    -   **Red (> 100%)**: Danger. You have breached the contract.
-   **Scenario**:
    -   Coffee Budget: $100.
    -   Spent: $120.
    -   **Display**: A **Red Bar** filled to 100%, showing "-$20" variance. This alerts you immediately to the "leak".

---

## 5. Zone IV: The Financial Statement (Deep Audit)

This is a professional-grade **Profit & Loss (P&L)** statement, identical to what businesses use.

### Features:

1.  **Date Picker**: Unlike the rest of the dashboard, this section allows custom ranges (e.g., "Tax Year 2024").
2.  **Granular Ledger**: It lists every single category row-by-row, **dynamically sourced from your database**.
    -   **Income Section**: (e.g., Salary, Dividends) -> **Total Income**.
    -   **Expense Section**: (e.g., Rent, Food) -> **Total Expenses**.
3.  **The Bottom Line**:
    -   **Net Income**: The final mathematical truth of your date range.
    -   **Savings Rate**: Calculated specifically for that range.

---

## 6. Comprehensive Scenario: "The Quarter Evaluation"

**User**: Alex.
**Context**: It's April 1st. He wants to see how Q1 (Jan-Mar) went.

### Step 1: The Vitals (KPIs)

-   He opens Reports.
-   **Net Result**: Shows `+$1,500` (Green). He saved money overall in March.
-   **Savings Ratio**: `12%`. (He realizes this is lower than his 20% goal).

### Step 2: The Trend Check (Charts)

-   He looks at the **Monthly Comparison**.
-   Jan: High Income (Bonus).
-   Feb: High Expense (Vacation).
-   Mar: Stabilized.
-   _Insight_: His savings are inconsistent.

### Step 3: The Leak Hunt (Budget vs Actual)

-   He checks **Budget Performance**.
-   **Groceries**: 90% (Yellow) - Okay.
-   **Entertainment**: 140% (Red) - **Busted**.
-   _Insight_: He is overspending on fun.

### Step 4: The Deep Dive (Financial Statement)

-   He sets the Date Picker to `Jan 1` - `Mar 31` (Q1).
-   He scrolls to **Expenses**.
-   He sees "Subscriptions: $450".
-   _Realization_: He forgot to cancel a gym membership he isn't using.

**Action**: He cancels the subscription immediately.
_Result_: The Reports module moved him from **Data** ("I feel broke") to **Wisdom** ("I am wasting $150/mo on a gym") to **Action** (Cancel).
