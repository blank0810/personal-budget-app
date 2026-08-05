# 💰 Personal Budget & Finance Manager

A comprehensive, double-entry accounting system for personal finance, built to help you move from **Tracking** (Data) to **Analysis** (Wisdom).

Built with **Next.js 15**, **PostgreSQL**, and **Prisma**, this application applies professional accounting principles to personal wealth management.

![Dashboard Preview](/public/dashboard.png)

## 📚 Documentation

-   **[Feature Walkthrough](docs/guides/WALKTHROUGH.md)**: A detailed user guide for every module (Dashboard, Accounts, Reports, etc.) and the financial logic behind them.
-   **[Design Docs](docs/plans/)**: Dated design and implementation plans covering architectural decisions and database schema changes.

---

## 🚀 Key Features

### 1. 📊 Financial Dashboard (The Cockpit)

-   **Net Worth Tracking** (Assets - Liabilities).
-   **Monthly Burn Rate**: See exactly how much you spend vs earn in real-time.
-   **Savings Rate**: The "Golden Metric" for financial independence.

### 2. 📒 Unified Ledger System

-   **Double-Entry Logic**: Every transaction is accounted for.
-   **Atomic Transfers**: Moving money between accounts (e.g., Checking -> Savings) is a single, atomic operation to ensure data integrity.
-   **Account Types**: Bank, Cash, Credit Cards, Investments, and Loans.

### 3. 📉 Reports & Analytics

-   **P&L Statement**: A corporate-style Profit & Loss statement for any date range (e.g., Tax Year).
-   **Budget Performance**: "Traffic Light" system (Green/Yellow/Red) to instantly spot category overspending.
-   **Trend Analysis**: Visual charts for Income vs Expenses over time.

### 4. 🛡️ Debt Managment

-   **Liability Tracking**: Mark accounts as "Liabilities" (Credit Cards, Loans).
-   **Debt Paydown Metric**: Tracks specifically how much principal you have paid off on your debts.

---

## 🛠️ Tech Stack

-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
-   **Database**: [PostgreSQL](https://www.postgresql.org/)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
-   **Auth**: [NextAuth.js v5](https://authjs.dev/)
-   **Charts**: [Recharts](https://recharts.org/)

---

## ⚡ Getting Started

### Prerequisites

-   Node.js 18+
-   Docker (for local PostgreSQL database)

### Installation

1.  **Clone the repository**

    ```bash
    git clone https://github.com/blank0810/personal-budget-app.git
    cd personal-budget-app
    ```

2.  **Install dependencies**

    ```bash
    npm install
    ```

3.  **Setup Environment**
    Create a `.env` file in the root directory:

    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/personal_budget?schema=public"
    AUTH_SECRET="your-super-secret-key"
    ```

4.  **Start Database (Docker)**

    ```bash
    docker-compose up -d
    ```

5.  **Initialize Database**

    ```bash
    npx prisma migrate dev --name init
    npm run seed # Optional: Seeds with demo data
    ```

6.  **Run Development Server**
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 📂 Project Structure

```bash
├── app/                  # Next.js App Router
│   ├── (auth)/           # Login/Register routes
│   ├── (authenticated)/  # Protected routes (Dashboard, Reports, etc.)
│   └── api/              # API Endpoints
├── components/           # React Components
│   ├── modules/          # Feature-specific components (Budget, Income, etc.)
│   └── ui/               # Reusable UI elements (shadcn)
├── lib/                  # Utilities & Prisma Client
├── prisma/               # Database Schema & Migrations
├── server/               # Server-Side Logic (Domain-Driven)
│   ├── actions/          # Server Actions
│   └── modules/          # Service & Controller layers
└── ...
```

## 📄 License

This project is licensed under the **MIT License**.
