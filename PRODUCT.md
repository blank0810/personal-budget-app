# PRODUCT.md — Budget Planner

Product + honesty context for AI-assisted work (loaded by the `impeccable` skill). The honesty rules below are **hard constraints**, especially for any public/marketing surface.

## What it is
**Budget Planner** — a personal budget web app. Evolving to serve **freelancers / solo operators** first (variable income, client invoicing, no finance team), with personal budgeters as a strong secondary audience; corporate/teams later.

**Maintainer:** a solo developer. **Do NOT embed the maintainer's personal info (real name, "Ehnand", "Adam", personal email) in product or marketing copy.** Use neutral generics ("there", "Demo User", "Acme Co") or the signed-in user's own data; greetings/profile render the actual user's name dynamically. Sample financial data uses PHP (₱) and a neutral demo persona with no real name.

## Shipped today (safe to present as live)
Unified transactions (income / expense / transfer / payment), accounts + per-account ledger, envelope budgets (category × month), savings goals (linked-account tracking), CSV import wizard (mapping, dup detection, undo), reports + PDF export + emailed monthly digest, recurring transactions (cron), multi-currency (locked after onboarding), **invoicing** (business identity + PDF invoices + email send), dashboard with 5-pillar health score + charts.

## NOT shipped — must be framed as coming soon / early access
- **AI Advisor** — conversational agent that will read transactions/budgets/invoices and advise. Currently a **non-interactive looping mock** (`components/modules/dashboard/AiAdvisorTeaser.tsx`). It is the flagship vision, NOT a live feature.

## Honesty rules (non-negotiable)
1. **No fabricated metrics** — no user counts, no "₱X transactions logged", no AI accuracy/savings stats. If a real number doesn't exist, omit it.
2. **No fake testimonials / press / logos.** The old `Testimonials.tsx` names (Maria S., James R., Anna L.) are placeholders — never present as real.
3. **AI is always future-tense / gated** — "coming soon", "in development", "early access". Never present-tense AI behavior ("our AI analyzes…", "ask the AI…").
4. **Structured data matches the visible DOM** (no schema drift); no fake `aggregateRating`/`review` in JSON-LD.
5. **Security claims must be true** — encrypted connections, no ads, no data selling, export & delete. Avoid unverifiable badges ("bank-level", "SOC 2") unless substantiated.
6. **"Free to start"**, not blanket "Free forever" (future AI may be paid).

## Honest differentiators to lean on
Built in the open by a solo founder (no personal name in copy); public changelog + feature-request board; the closed loop (invoice → income → budget) that pure budgeting apps (YNAB/Monarch/Copilot) and pure invoicing tools (FreshBooks/Wave) don't have; real product screenshots/mockups over invented ones.

## Anti-references (what NOT to look like)
Generic "AI startup template" slop: purple gradients, dead-center hero + announcement badge, identical icon-topped cards, fabricated trust-stat banners. See `docs/plans/2026-05-23-landing-build-methodology.md`.
