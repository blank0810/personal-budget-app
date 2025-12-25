# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev              # Start dev server (port 3000)
npm run build            # Production build
npm run start            # Production server
npm run lint             # ESLint

# Database
npx prisma migrate dev   # Create/apply migrations
npx prisma db seed       # Seed database (uses prisma/seed.ts)
npx prisma generate      # Regenerate Prisma client
npx prisma studio        # Visual database browser

# Docker (full stack with PostgreSQL on port 5433, pgAdmin on 5051)
docker-compose up        # Start all services
docker-compose down      # Stop all services
```

## Architecture

### Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (New York style)
- **Backend:** Next.js Server Actions, Prisma ORM 5
- **Auth:** NextAuth.js 5 (JWT strategy, credentials provider)
- **Database:** PostgreSQL

### Project Structure
```
app/
├── (auth)/           # Public auth pages (login, register)
├── (authenticated)/  # Protected routes with sidebar layout
└── api/auth/         # NextAuth route handler

server/
├── actions/          # Server actions (auth, cache)
└── modules/          # Feature modules (income, expense, account, budget, transfer, category, report)
    └── [module]/
        ├── [module].types.ts      # Zod schemas
        ├── [module].service.ts    # Business logic (Prisma queries)
        └── [module].controller.ts # Server actions (form handlers)

components/
├── ui/              # shadcn/ui primitives
├── auth/            # Login/Register forms
├── common/          # Shared components (SidebarNav)
└── modules/         # Feature-specific components
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

### Authentication Flow
- Middleware (`middleware.ts`) protects all routes except auth pages
- Authenticated users redirected away from /login and /register
- User ID available in session via NextAuth callbacks

### Path Alias
`@/*` resolves to project root (e.g., `@/lib/prisma`, `@/server/modules/income`)
