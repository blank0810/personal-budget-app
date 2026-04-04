# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
    ├── cron/            # Cron jobs (process-recurring, monthly-report, process-reports, process-sms)
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
    ├── dashboard/       # Dashboard cards, carousel, charts, quick actions
    ├── transactions/    # Unified transaction table, filters, KPI cards
    ├── account/         # Account form, list, ledger, KPI cards
    ├── goal/            # Goal cards, forms, dashboard widget
    ├── import/          # CSV import wizard steps
    └── ...              # Other feature modules

content/
└── changelog/           # Markdown changelog entries (v1.0.md, v1.1.md, etc.)
```

### Data Flow Pattern
```
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

## Terminology

- **Council of Agents:** The collection of specialized agents defined at global and project scope. When referred to as "the council," it means dispatching work to the appropriate specialized agents for collaborative, parallel execution.

### Global Agents (available across all projects)
| Agent | Purpose |
|-------|---------|
| **lead-engineer** | Senior full-stack architect. System design, architecture decisions, data modeling, performance optimization, scalability planning, tech stack evaluation, API design, and technical debt assessment. |
| **frontend-engineer** | Frontend and UX specialist. UI components, page layouts, forms, client-side state, accessibility, responsive design, animations, and user experience flows. |
| **backend-engineer** | Backend implementation specialist. Server-side features, API endpoints, database queries, service layers, middleware, authentication logic, data validation, and background jobs. |
| **devops-engineer** | Infrastructure and deployment specialist. Docker, CI/CD pipelines, server deployment, SSL/TLS, environment variables, cloud hosting, monitoring, logging, and security hardening. |
| **qa-engineer** | Quality assurance and testing specialist. Writing tests, reviewing test coverage, validating edge cases, setting up testing infrastructure, and verifying implementations meet requirements. |
| **code-simplifier** | Simplifies and refines code for clarity, consistency, and maintainability while preserving all functionality. |
| **ai-engineer** | AI/ML implementation specialist. LLM integration, recommendation systems, prompt engineering, computer vision, and intelligent automation. |
| **hiring-closer** | Hiring manager and deal-closing expert. Reviews CVs, portfolios, LinkedIn profiles, and developer credentials. Evaluates market relevance, trust signals, positioning, and gives hire/pass verdicts with actionable fixes. |

### Project Agents (specific to this budget app)
| Agent | Purpose |
|-------|---------|
| **budget-frontend** | Frontend specialist for this app. UI components, dashboards, data tables, charts, the CSV import wizard, and all client-side work in this project. |
| **budget-backend** | Backend specialist for this app. Server actions, services, Prisma queries, balance updates, recurring transactions, cron jobs, BullMQ queue workers, and server-side business logic. |
| **budget-devops** | DevOps specialist for this app. Docker configuration, deployment, CI/CD, server setup, database backups, Redis/BullMQ infrastructure, and production environment management. |
| **accountant** | Financial domain expert. Validates financial calculations, reviews balance logic, designs budget features, audits transaction flows, reviews report accuracy, and advises on money-related behavior from an accounting perspective. |
| **founder** | Product founder and visionary. Product decisions, feature prioritization, user experience from a business perspective, roadmap planning, competitor positioning, and deciding what to build next and why. |
