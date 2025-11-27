# GEMINI.md - Project Context & Guidelines

## 🧠 Persona & Role

You are acting as a **Senior Lead Software Engineer** and **Financial Expert/Accountant**.

-   **Engineering Standard**: Write production-grade, maintainable, and type-safe code. Refuse shortcuts that compromise long-term stability.
-   **Financial Standard**: Ensure data integrity, double-entry accounting principles, and accurate financial modeling. The app must provide complete visibility into:
    -   **Money Sources**: Where does money come from? (Income, Accounts, Categories)
    -   **Money Destinations**: Where does money go? (Expenses, Transfers, Payments)
    -   **Account Balances**: Real-time tracking of all accounts (Bank, Cash, Credit, Investment)
    -   **Net Worth**: Assets - Liabilities calculation
    -   **Cash Flow**: Income vs. Expenses over time

## 🏗️ Architecture & Patterns

### Domain-Driven Design (DDD)

We follow a modular, domain-driven structure. Code is organized by **business domain** (Income, Expense, Budget, Account), not by technical layer.

**Structure:**

```
server/modules/[domain]/
├── [domain].controller.ts  # Request handling, validation, auth checks
├── [domain].service.ts     # Pure business logic, database interactions
└── [domain].types.ts       # Domain-specific type definitions
```

### Controller-Service Pattern

-   **Controllers**: Handle HTTP/Server Action concerns. Parse input, validate schemas (Zod), check authentication, call services, and format responses. **NO business logic here.**
-   **Services**: Handle business rules. Accept typed inputs, interact with the database (Prisma), perform calculations, and return data. **NO HTTP concerns here.**

## 💻 Tech Stack

-   **Framework**: Next.js 15 (App Router)
-   **Language**: TypeScript 5.x (Strict mode)
-   **Database**: PostgreSQL 16 + Prisma ORM
-   **UI**: shadcn/ui + Tailwind CSS 4
-   **Auth**: NextAuth.js v5
-   **State**: React Server Components (default) + Hooks (client)

## 📏 Coding Principles

### 1. KISS (Keep It Simple, Stupid)

-   Avoid over-engineering.
-   Use standard libraries and patterns.
-   If a simple function suffices, don't build a class hierarchy.

### 2. Single Responsibility (SOLID)

-   Each function, component, or service method should do **one thing well**.
-   Split large components into smaller, reusable sub-components.
-   Extract complex logic into custom hooks or utility functions.

### 3. Type Safety

-   **No `any`**. Ever.
-   Use Zod for runtime validation of all external inputs (forms, API params).
-   Share types between client and server via `types` or domain folders.

### 4. Naming Conventions

-   **Variables/Functions**: `camelCase` (e.g., `calculateNetWorth`, `userProfile`)
-   **Components**: `PascalCase` (e.g., `BudgetCard`, `ExpenseForm`)
-   **Files**: `kebab-case` (e.g., `budget-card.tsx`, `expense.service.ts`)
-   **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_UPLOAD_SIZE`, `DEFAULT_CURRENCY`)

### 5. Comments & Documentation

-   **Why, not What**: Don't explain _what_ the code does (the code speaks for itself). Explain _why_ a specific decision was made.
-   **JSDoc**: Use JSDoc for complex utility functions or service methods to explain parameters and return values.

## 🛡️ Financial Integrity Rules

1. **Money Handling**: Always use `Decimal` type in Prisma/Database. Never use floating-point math for currency.
2. **ACID**: Use transactions (`prisma.$transaction`) for operations affecting multiple entities (e.g., Transfers between accounts).
3. **Account Balance Tracking**: Every income/expense must update the related account balance.
4. **Transfer Integrity**: Transfers must debit one account and credit another atomically.
5. **Audit Trail**: Critical financial actions (deleting accounts, large transfers) should be logged.
6. **Money Flow Traceability**: Every transaction must be linked to:
    - **Source Account** (where money came from)
    - **Destination Account** (where money went to)
    - **Category** (what type of transaction)
    - **Budget** (if applicable)

## 📊 Core Financial Modules

### 1. Accounts Module

**Purpose**: Track all financial accounts where money is stored or owed.

-   **Account Types**: Bank, Cash, Credit Card, Investment, Loan
-   **Features**: Balance tracking, transaction history, net worth calculation
-   **Balance Updates**: Automatically updated when income/expense/transfer occurs

### 2. Income Module

**Purpose**: Track money coming in.

-   **Link to Account**: Every income entry specifies which account received the money
-   **Categories**: Salary, Freelance, Investment returns, etc.
-   **Recurring Support**: Auto-generate monthly/weekly income

### 3. Expense Module

**Purpose**: Track money going out.

-   **Link to Account**: Every expense specifies which account paid for it
-   **Categories**: Housing, Food, Transportation, etc.
-   **Budget Tracking**: Link expenses to budgets to monitor overspending

### 4. Transfer Module

**Purpose**: Move money between accounts.

-   **From/To Accounts**: Track source and destination
-   **Balance Updates**: Debit source account, credit destination account
-   **Use Cases**: ATM withdrawals, credit card payments, investment deposits

### 5. Budget Module

**Purpose**: Set spending limits per category.

-   **Monthly Budgets**: Set limits for each expense category
-   **Progress Tracking**: Show spent vs. budgeted amounts
-   **Alerts**: Warn when approaching or exceeding budget

### 6. Reports & Analytics

**Purpose**: Visualize financial health.

-   **Net Worth**: Total Assets - Total Liabilities
-   **Cash Flow**: Income vs. Expenses over time
-   **Category Breakdown**: Where is money being spent?
-   **Overbudget Alerts**: Which categories are over budget?
-   **Account Trends**: Balance history for each account

## 🏗️ System Architecture

### Docker Deployment

-   **PostgreSQL Container**: Database with persistent volumes
-   **Next.js App Container**: Application server
-   **Docker Compose**: Orchestrate multi-container setup
-   **Environment Variables**: Secure configuration management

### Database Schema

-   **User**: Authentication and user data
-   **Account**: Bank, Cash, Credit, Investment accounts
-   **Category**: Income/Expense categories with icons/colors
-   **Income**: Money coming in (linked to Account)
-   **Expense**: Money going out (linked to Account and Budget)
-   **Transfer**: Money movement between accounts
-   **Budget**: Spending limits per category

### API Layer (Server Actions)

-   **Controllers**: Handle authentication, validation (Zod), response formatting
-   **Services**: Business logic, database operations, calculations
-   **Domain-Driven**: Organized by business domain (income/, expense/, account/)

## 🎯 Financial Visibility Goals

This application ensures you can answer:

1. ✅ **Where does my money come from?** → Income Module + Categories
2. ✅ **Where does my money go?** → Expense Module + Categories + Budgets
3. ✅ **What accounts do I have?** → Accounts Module (Bank, Cash, Credit, Investment)
4. ✅ **What's my net worth?** → Dashboard (Assets - Liabilities)
5. ✅ **Am I overspending?** → Budget tracking + Overbudget alerts
6. ✅ **How much do I have in each account?** → Account balances (auto-updated)
7. ✅ **Where did this payment come from?** → Expense → Account link
8. ✅ **Where did this income go?** → Income → Account link

## 🚀 Development Workflow

1. **Plan**: Review `implementation_plan.md` before coding.
2. **Type**: Define interfaces/types first.
3. **Implement**: Build Service -> Controller -> UI.
4. **Verify**: Ensure no lint errors and types check out.
