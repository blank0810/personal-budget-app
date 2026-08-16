# AGENTS.md

This file provides guidance to coding agents working in this repository.

> **Maintainer:** a solo developer. **Do NOT embed the maintainer's personal info (real name, "Ehnand", "Adam", personal email) as placeholder, sample, greeting, demo, or marketing content anywhere in the product.** Use neutral generics ("there", "Demo User", sample brands like "Acme Co") or the signed-in user's own data. Greetings/profile already render the actual logged-in user's name dynamically.

> **Git workflow — solo project, commit straight to `main` (CRITICAL).** There is one developer here. For changes of any size, **do NOT create a feature branch and do NOT open a PR** — stage, commit directly on `main`, and push. Ship/merge immediately; review happens at commit time, not through a PR gate. This overrides the global "branch first / feature branches → PRs → main" convention for this repo. (Non-negotiable safety still holds: never force-push `main`, never rewrite already-pushed history, never run destructive DB commands without explicit confirmation.)

## Commands

```bash
# The app runs entirely in Docker. All commands go through docker compose.

# Docker (full stack: app + PostgreSQL on 5433 + pgAdmin on 5051 + Redis)
docker compose up        # Start all services
docker compose down      # Stop all services

# Development (runs inside Docker container)
docker compose exec app npm run dev       # Start dev server (port 3000)
docker compose exec app npm run build     # Production build
docker compose exec app npm run lint      # ESLint

# Database (runs inside Docker container)
docker compose exec app npx prisma migrate dev   # Create/apply migrations
docker compose exec app npx prisma db seed       # Seed database (uses prisma/seed.ts)
docker compose exec app npx prisma generate      # Regenerate Prisma client
docker compose exec app npx prisma studio        # Visual database browser
```

## Local dev gotchas

### Docker host-UID pinning

`docker-compose.yml` pins the `app` service to `user: "${HOST_UID:-1000}:${HOST_GID:-1000}"`. This ensures files Prisma / Next.js / TypeScript write onto the bind-mounted `./` directory are owned by the host user, not `root`. Without this, every `prisma migrate dev` and every `.tsbuildinfo` write would leave root-owned files on the host and break subsequent `git pull` operations.

Defaults to UID/GID 1000 (matches the pre-existing `node` user in `node:20-alpine` and typical Linux dev boxes). If your host UID differs, export `HOST_UID` / `HOST_GID` in `.env` or your shell before `docker compose up`.

If you ever hit "Permission denied" on files inside the project dir, it means something wrote as root (likely an older-config container pre-fix, or a commit from another dev with a different UID). One-shot recovery:

```bash
sudo chown -R $USER:$USER .
```

## Architecture

### Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (New York style)
- **Backend:** Next.js Server Actions, Prisma ORM 5
- **Auth:** NextAuth.js 5 (JWT strategy, credentials + Google OAuth)
- **Database:** PostgreSQL
- **Analytics:** Vercel Analytics
- **Queue:** BullMQ with Redis (monthly-reports)

### Project Structure

```text
app/
├── (auth)/              # Public auth pages (login, register, forgot-password)
├── (authenticated)/     # Protected routes with sidebar layout
│   ├── dashboard/       # Main dashboard with Health Ledger, evidence, charts, and quick actions
│   ├── transactions/    # Unified transactions (income, expense, transfer, payment)
│   ├── accounts/        # Account management + detail ledger
│   ├── budgets/         # Envelope budgets
│   ├── goals/           # Savings goals
│   ├── import/          # CSV import wizard
│   ├── reports/         # Financial reports & PDF export
│   ├── profile/         # User profile & notifications
│   └── admin/           # Admin panel (dashboard, users, feature-requests, feature-flags, system)
├── (onboarding)/        # New user onboarding wizard
├── (public)/            # Landing page (SEO-optimized)
├── changelog/           # Public changelog & feature requests
└── api/
    ├── auth/            # NextAuth route handler
    ├── cron/            # Cron jobs (monthly-report, process-reports)
    └── unsubscribe/     # HMAC-signed email unsubscribe

server/
├── actions/             # Server actions (auth, cache)
└── modules/             # Feature modules
    ├── transaction/     # Unified transaction queries + KPI aggregation
    ├── income/          # Income CRUD + balance updates
    ├── expense/         # Expense CRUD + balance updates
    ├── account/         # Account management + summary KPIs
    ├── budget/          # Envelope budgets
    ├── transfer/        # Account transfers (includes payments to liabilities)
    ├── category/        # Categories (income/expense)
    ├── report/          # Monthly reports, PDF generation, email digest
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
    ├── dashboard/       # Health verdict, ledger, evidence panels, charts, and quick actions
    ├── transactions/    # Unified transaction table, filters, KPI cards
    ├── account/         # Account form, list, ledger, KPI cards
    ├── goal/            # Goal cards, forms, dashboard widget
    ├── import/          # CSV import wizard steps
    └── ...              # Other feature modules

content/
└── changelog/           # Markdown changelog entries (v1.0.md, v1.1.md, etc.)
```

### Data Flow Pattern

```text
UI Component / Server Page → Controller (server action) → Service → Prisma → PostgreSQL
```

**All requests MUST route through the controller** — never call services directly from pages or components. This ensures consistent auth checks and validation at every entry point.

Controllers handle: auth checks (`getAuthenticatedUser()`), Zod validation, error handling, cache revalidation (`invalidateTags()`).

Services handle: business logic, Prisma queries/transactions, balance updates.

### Key Database Patterns

- All monetary values use `Decimal(10,2)` or `Decimal(12,2)` for account balances
- Income/Expense creation automatically updates associated account balance
- Transfers update both source and destination account balances
- Budgets are scoped to category + month (first day of month)
- Church tithe percentage supported on income (default 10%)
- `TransactionSource` enum (`MANUAL`/`IMPORT`) + `importBatchId` for audit trail
- Currency locked after onboarding — immutable once financial data exists
- `CronRunLog` tracks all cron job executions for system health monitoring

### Authentication Flow

- Middleware (`middleware.ts`) protects all routes except auth, changelog, and landing page
- Authenticated users are redirected away from `/login` and `/register`
- User ID is available in the session via NextAuth callbacks
- Admin routes require the `ADMIN` role (middleware) plus sudo re-authentication (layout)
- `lastLoginAt` is tracked on each sign-in

### Path Alias

`@/*` resolves to the project root (for example, `@/lib/prisma` and `@/server/modules/income`).
