# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (New York style)
- **Backend:** Next.js Server Actions, Prisma ORM 5
- **Auth:** NextAuth.js 5 (JWT strategy, credentials + Google OAuth)
- **Database:** PostgreSQL
- **Analytics:** Vercel Analytics
- **Queue:** BullMQ with Redis (monthly-reports)

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
- TransactionSource enum (MANUAL/IMPORT) + importBatchId for audit trail
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
| **seo-engineer** | Technical, content, and AI-era SEO specialist. Crawlability/indexing, metadata, JSON-LD structured data, Core Web Vitals, sitemaps/robots, on-page optimization, SEO audits, and Generative/Answer Engine Optimization (citations in AI Overviews, ChatGPT, Perplexity, Claude). |

### Project Agents (specific to this budget app)
| Agent | Kind | Purpose |
|-------|------|---------|
| **budget-frontend** | development | Frontend specialist for this app. UI components, dashboards, data tables, charts, the CSV import wizard, and all client-side work in this project. |
| **budget-backend** | development | Backend specialist for this app. Server actions, services, Prisma queries, balance updates, cron jobs, BullMQ queue workers, and server-side business logic. |
| **budget-devops** | development | DevOps specialist for this app. Docker configuration, deployment, CI/CD, server setup, database backups, Redis/BullMQ infrastructure, and production environment management. |
| **accountant** | advisory | Financial domain expert. Validates financial calculations, reviews balance logic, designs budget features, audits transaction flows, reviews report accuracy, and advises on money-related behavior from an accounting perspective. |
| **founder** | advisory | Product founder and visionary. Product decisions, feature prioritization, user experience from a business perspective, roadmap planning, competitor positioning, and deciding what to build next and why. |
| **budget-seo** | advisory | SEO specialist for this app. Owns the public surface (landing page, changelog), metadata, JSON-LD, sitemap/robots, Core Web Vitals on marketing routes, and GEO/AEO for the freelancer / AI-native positioning. Defers to global **seo-engineer** for general technique. |

**Two kinds of agent.** *Development* agents produce code, so they follow the delegation doctrine below (Claude plans → Codex implements → Claude reviews). *Advisory* agents produce judgment — an analysis, a verdict, a recommendation — and their deliverable **is** the written answer. Never hand an advisory agent's output to Codex. But note the doctrine is scoped to the *act of writing code*, not the kind of agent: the moment an advisory agent would touch code (the accountant patching a Decimal rounding bug, budget-seo editing a JSON-LD block), the handoff applies. Every agent file in `.claude/agents/` carries the doctrine for exactly this reason.

### Implementation handoff to Codex (IMPORTANT)

Mirrors `~/.claude/CLAUDE.md` → "Implementation handoff to Codex", which remains the canonical source. **Planning and review always stay with the Claude council agents. The *implementation* step is handed to Codex when it is available.** When a council run reaches the point of actually writing or editing code in this repo:

1. **Probe for Codex first:** `command -v codex` (or `codex --version`). If it is NOT installed, fall back to the Claude implementation agents (`budget-frontend`, `budget-backend`, `budget-devops`) exactly as before — nothing else changes.
2. **If Codex IS available, hand the implementation instruction to it** via Bash. **Pin neither the model nor the reasoning effort** — pass neither `-m` nor `model_reasoning_effort`, so Codex selects both itself:

   ```bash
   codex exec --sandbox workspace-write -c 'approval_policy="never"' "<full, self-contained implementation instruction>" < /dev/null
   ```

   - **Redirect stdin from `/dev/null`.** An open stdin makes `codex exec` hang at 0% CPU, writing nothing.
   - **Do NOT pass `-m`.** Model and effort are resolved by the Codex CLI *before* the prompt is sent, so asking Codex in the prompt to "use its latest model" is a no-op. Omitting the flag is the only way to let Codex choose its own default (verify with `codex doctor` → `model`). A hard-pinned `-m` silently *downgrades* it.
   - `--sandbox workspace-write` + `approval_policy="never"` lets Codex edit repo files without hanging on approval prompts. The repo must be trusted in `~/.codex/config.toml`. Never use `--dangerously-bypass-approvals-and-sandbox`.
   - The prompt must be **self-contained** — Codex does not share the conversation's context. Include the plan, exact file paths, acceptance criteria, and the conventions it must follow: the controller → service → Prisma data flow, `Decimal` (never float) for money, `getAuthenticatedUser()` + Zod validation in controllers, and `invalidateTags()` for cache revalidation.
   - **Not fire-and-forget:** you may go back and forth with Codex mid-task for clarification, and Codex may use its own harness/skills (or you may direct it to a specific approach). Codex leaves the work **uncommitted** — you review and commit.
3. **Claude reviews Codex's output.** The relevant council agents review the diff for correctness and convention adherence. Money-touching diffs still go through the `money-feature-review` skill and the **accountant** before merge — the Codex handoff does not bypass that gate.

The division is fixed: **Claude plans → Codex implements (if present) → Claude reviews.** If the maintainer explicitly says to implement with the Claude agents instead, honor that and skip the Codex handoff.
