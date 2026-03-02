# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint

# Database (run inside Docker)
docker compose exec app npx prisma migrate dev   # Create/apply migrations
docker compose exec app npx prisma db seed       # Seed database (uses prisma/seed.ts)
docker compose exec app npx prisma generate      # Regenerate Prisma client
docker compose exec app npx prisma studio        # Visual database browser

# Docker (full stack with PostgreSQL on port 5433, pgAdmin on 5051)
docker compose up        # Start all services
docker compose down      # Stop all services
```

## Architecture

### Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (New York style)
- **Backend:** Next.js Server Actions, Prisma ORM 5
- **Auth:** NextAuth.js 5 (JWT strategy, credentials + Google OAuth)
- **Database:** PostgreSQL
- **Analytics:** Vercel Analytics
- **Queue:** BullMQ with Redis (monthly-reports, sms-notifications)

### Project Structure
```
app/
├── (auth)/              # Public auth pages (login, register, forgot-password)
├── (authenticated)/     # Protected routes with sidebar layout
│   ├── dashboard/       # Main dashboard with health score, charts, goals widget
│   ├── income/          # Income management
│   ├── expense/         # Expense management
│   ├── transfers/       # Account transfers
│   ├── payments/        # Liability payments
│   ├── budgets/         # Envelope budgets
│   ├── accounts/        # Account management
│   ├── goals/           # Savings goals
│   ├── recurring/       # Recurring transactions
│   ├── import/          # CSV import wizard
│   ├── reports/         # Financial reports & PDF export
│   ├── profile/         # User profile & notifications
│   └── admin/           # Admin panel (dashboard, users, feature-requests, feature-flags, system)
├── (onboarding)/        # New user onboarding wizard
├── (public)/            # Landing page (SEO-optimized)
├── changelog/           # Public changelog & feature requests
└── api/
    ├── auth/            # NextAuth route handler
    ├── cron/            # Cron jobs (process-recurring, monthly-report, process-reports, process-sms)
    └── unsubscribe/     # HMAC-signed email unsubscribe

server/
├── actions/             # Server actions (auth, cache)
└── modules/             # Feature modules
    ├── income/          # Income CRUD + balance updates
    ├── expense/         # Expense CRUD + balance updates
    ├── account/         # Account management
    ├── budget/          # Envelope budgets
    ├── transfer/        # Account transfers
    ├── category/        # Categories (income/expense)
    ├── report/          # Monthly reports, PDF generation, email digest
    ├── recurring/       # Recurring transaction automation
    ├── import/          # CSV import with batch undo
    ├── goal/            # Savings goals with linked account tracking
    ├── admin/           # Admin analytics, user management, content, system health
    ├── onboarding/      # Onboarding wizard flow
    ├── notification/    # Email, SMS, notification preferences
    ├── changelog/       # File-based changelog (gray-matter markdown)
    └── feature-request/ # Community feature requests

components/
├── ui/                  # shadcn/ui primitives
├── auth/                # Login/Register forms
├── common/              # Shared components (SidebarNav, AppSidebar)
└── modules/             # Feature-specific components
    ├── landing/         # Landing page sections (Navbar, Hero, Features, etc.)
    ├── admin/           # Admin panel components
    ├── goal/            # Goal cards, forms, dashboard widget
    ├── import/          # CSV import wizard steps
    ├── recurring/       # Recurring transaction UI
    └── ...              # Other feature modules

content/
└── changelog/           # Markdown changelog entries (v1.0.md, v1.1.md, etc.)
```

### Data Flow Pattern
```
UI Component → Server Action (controller) → Service → Prisma → PostgreSQL
```

Controllers handle: auth checks, Zod validation, error handling, cache revalidation.
Services handle: business logic, Prisma transactions, balance updates.

### Key Database Patterns
- All monetary values use `Decimal(10,2)` or `Decimal(12,2)` for account balances
- Income/Expense creation automatically updates associated account balance
- Transfers update both source and destination account balances
- Budgets are scoped to category + month (first day of month)
- Church tithe percentage supported on income (default 10%)
- TransactionSource enum (MANUAL/IMPORT/RECURRING) + importBatchId for audit trail
- Currency locked after onboarding — immutable once financial data exists
- CronRunLog tracks all cron job executions for system health monitoring

### Authentication Flow
- Middleware (`middleware.ts`) protects all routes except auth, changelog, and landing page
- Authenticated users redirected away from /login and /register
- User ID available in session via NextAuth callbacks
- Admin routes require ADMIN role (middleware) + sudo re-authentication (layout)
- `lastLoginAt` tracked on each sign-in

### Path Alias
`@/*` resolves to project root (e.g., `@/lib/prisma`, `@/server/modules/income`)
