# Landing Page Redesign — Design

**Date:** 2026-05-31
**Status:** Revised 2026-06-21 — de-wedged to honest feature-first; invoicing → dedicated `/invoicing` page; AI spotlight off the home. **See the Revision section below — it overrides conflicting sections.**
**Owners:** founder (message), budget-seo (copy/metadata), budget-frontend + ui-ux-engineer (design)

---

## Revision — 2026-06-21 (post-maintainer review; OVERRIDES conflicting sections below)

**Why:** The maintainer corrected the product's positioning. The product is a **general
personal budgeting & tracking app** — *not* freelancer-specific. Invoicing is a real but
secondary feature. Guiding principle, verbatim: **"post what we have, not what we don't."**

**What changed:**

1. **No audience wedge.** Drop "For freelancers & solo operators," "Budget for the month
   you're actually having," and all irregular-income framing. Lead feature-first with what
   the product actually is. The `IncomeTimeline` visual stays but reads as "income you
   logged," not "a freelancer's variable income."
2. **Invoicing off the home.** Removed from the hero, the bento, and the CTA. It gets its
   own dedicated `/invoicing` explainer page. (This also removes the last closed-loop
   honesty risk from the home.)
3. **AI advisor off the home.** Not live → "don't post what we don't have." Delete
   `AIAdvisorSpotlight` from the home composition; keep only the honest, future-tense
   `/ai-advisor` page.

**Revised home copy (source of truth for the port — supersedes the Hero/CTA copy quoted below):**

| Slot | Copy |
|---|---|
| Eyebrow | Personal budgeting & tracking |
| H1 | Know exactly where your money goes. |
| Subhead | Set a budget for every category, track every transaction, and reach your savings goals. No bank linking — you log it, you own it. Free to start. |
| Microcopy | No bank linking required · You log it, you own it · Free to start |

**Revised home IA:** Hero → CredibilityStrip → BudgetDemo (de-wedged) → FeaturesBento
(budgeting-only) → FinalCTA. `AIAdvisorSpotlight` and the invoicing bento tile are cut.

**Unchanged & still authoritative:** the dark Linear×Ramp visual system + OKLCH tokens, the
BudgetDemo centerpiece (manual income logging is honest), the honesty gate, and the
LCP / reduced-motion / hydration constraints. `landing-preview/client.tsx` remains the
source of truth for component **structure / animation / hydration** — but its **copy and its
invoicing / AI sections are superseded by this revision.**

**Council review (2026-06-21) + maintainer decisions:** founder/budget-seo/budget-frontend reviewed
the revised plans. On the two reopened calls the maintainer kept the original direction with one SEO
carve-out: (1) invoicing stays **off the home UI** (no bento tile) **but remains in the home
title/meta** as the keyword differentiator (it's a real feature, not an integration claim); (2) the
hero eyebrow stays the plain "Personal budgeting & tracking" — the "no bank linking / you log it,
you own it" benefit rides in the subhead, not promoted to a wedge. Also locked: the `IncomeTimeline`
/ BudgetDemo visual is **re-cut income-agnostic** (neutral "deposit," optional paycheck row) so the
de-wedged copy doesn't sit over a freelancer-shaped graphic. Full concrete fix list lives in the
implementation plan's "Council review fixes — 2026-06-21" section.

---

## Problem

The current landing page sends the wrong message. The product's **core goal is a budget /
money-tracking app** for freelancers and solo operators. **Invoicing is an optional,
standalone feature that is NOT connected to the budget app yet.** The current site:

1. **Over-weights invoicing** — it is the hero tile of the Features bento (`col-span-7
   row-span-2`) and the section headline is "One app for the whole loop: earn, track,
   budget, save."
2. **Claims a false integration** — copy and visuals assert a closed loop that does not
   exist: *"When one is paid you log the income in the same app, and it flows straight into
   your budget"*, an animated `ClosedLoopChart` (Invoiced → Paid → Budgeted), the
   `LoopReveal` scroll set-piece, and "watch that income flow into your budget" in the
   `FinalCTA` (which renders on every public page).

The false-integration claim is **systemic (~10+ locations)** and is rooted in `PRODUCT.md`
itself, which lists *"the closed loop (invoice → income → budget)"* as an honest
differentiator. That doc is the source of truth every writer reads, so it is fixed first.

---

## Decisions (locked)

| Decision | Choice |
|---|---|
| **Positioning** | Budgeting/money-tracking is the core, presented **feature-first with NO audience wedge** (not "for freelancers"). Principle: *post what we have, not what we don't.* Invoicing is **removed from the home** and lives on its own `/invoicing` page. |
| **Page scope** | **Home + Features + How-it-works + NEW `/invoicing`.** AI-advisor and Pricing pages already honest — left alone. `AIAdvisorSpotlight` is **removed from the home** (AI not live → "don't post what we don't have"); the future-tense `/ai-advisor` page stays. |
| **Design direction** | **Hybrid: Direction A (refined dark Linear×Ramp) + Direction B's honest interactive budget demo as the single hero moment.** Keeps brand equity and low risk while delivering a genuine redesign centerpiece. Direction C (light editorial rebrand) rejected — abandons the just-shipped dark brand. |
| **AI advisor** | Future tense only; "coming, not live." Existing AI copy is exemplary — do not touch. |

---

## Visual system

Keep the existing dark Linear×Ramp system and OKLCH tokens (`--l-accent` emerald,
`--l-bg`, `--l-surface-1..3`, `--l-text-1..4`, `--l-border`, glow/aurora). Refinements only:

- Tokenise the existing ad-hoc amber warning as `--l-accent-amber: oklch(0.82 0.14 75)`,
  scoped to `.landing`. Used only for >80%-spent budget states.
- H1 leading tightens to `lg:leading-[1.0]` at 68px; subhead constrained to `max-w-[52ch]`.
- Collapse the hero's 4 separate entrance sequences to 2 (badge+microcopy share a
  staggered container; mockup is its own). Curves stay `[0.16, 1, 0.3, 1]`.

---

## Home page IA (revised)

| # | Section | Job |
|---|---------|-----|
| 1 | **Hero** (budget-first, no wedge) | Anchor on budgeting clarity; show the product immediately. Eyebrow is a plain descriptor ("Personal budgeting & tracking"), not an audience claim. No AI, no invoicing. |
| 2 | **CredibilityStrip** (kept, light polish) | Honest trust signals before any feature claim. No metrics. |
| 3 | **Budget Demo** (NEW centerpiece — replaces LoopReveal) | Prove the core value with honest, animated real UI: a month going from "no income yet" → *you log a payment* → clarity. De-wedged (not "a freelancer's month"). |
| 4 | **Features bento** (budgeting only) | Scannable inventory of budgeting features; budgeting is the hero tile. **Invoicing tile removed** (→ `/invoicing`); `ClosedLoopChart` removed. |
| 5 | **FinalCTA** (copy fixed) | Budget-first close. **No AI, no invoicing.** Remove "flow into your budget." |

`LoopReveal` is removed from `/features` too. On `/how-it-works`, the "invoice → budget in
one flow" framing is rewritten so income-logging is shown as a manual user step.

---

## Component specs

### Hero (Direction A — refined)
- True 2-column at `lg:` (~55/45). Left: badge → h1 → subhead → CTA row → microcopy.
  Right: `BrowserMockup` with a **budget-envelope dashboard mock** (envelope list dominant,
  one in amber 84%-spent warning, a savings-goal ring, a 4-cell KPI strip).
- **Eyebrow (plain descriptor, NOT an audience claim):** "Personal budgeting & tracking."
- **h1 (plain SSR, opacity:1, never animated):** "Know exactly where your money goes."
- **Subhead:** "Set a budget for every category, track every transaction, and reach your
  savings goals. No bank linking — you log it, you own it. Free to start." (No "freelancer,"
  no invoicing.)
- Budget bars animate `scaleX` on entry (reduced-motion → full width, static).

### Budget Demo (Direction B — honest, the centerpiece)
A scroll-told three-chapter demo of the **real** budget product. GSAP ScrollTrigger pins an
inner panel (`lg:min-h-[250vh]`), scrub maps to three states:

- **State A — empty (early month):** envelopes near-empty, income bar flat, health score 54
  (amber). Annotation: "Week 2. No income yet this month."
- **State B — you log income (manual action):** a form row fills in a ₱64,200 client
  payment and a Save flashes. Labeled **"You log it once"** — explicitly a user action, NOT
  automation. (This is the honesty hinge: it depicts manual income logging, the real flow.)
- **State C — clarity:** envelopes respond (one amber 81%), savings-goal ring 62%→68%,
  health score 54→71 (green), "Net saved: ₱25,290" counts up via `NumberTicker`.

**Honesty rule:** the demo shows the user logging income, then the budget reflecting *what
they logged*. It must never depict an invoice payment auto-updating a budget. No "flows
into," "syncs," "automatically."

**Reduced-motion / mobile fallback:** no GSAP, no 250vh runway. The three states render as
a static three-panel stack, each fully legible at final values, with explicit "Before / You
log it / After" headings. All space reserved in static markup (no CLS).

**Perf:** animate only `transform` (scaleX/scaleY) and `strokeDashoffset` / CSS vars — no
layout properties. GSAP dynamic-imported, shared with other ScrollTriggers, `anticipatePin: 1`.

### Features bento (budget-led)
12-col grid, three acts:
- **Act 1 (core):** Transactions (col-4) · **Budgets — hero tile** with `SpendingRing` donut
  (col-5) · Goals (col-3).
- **Act 2 (ops):** Recurring + CSV (col-4) · Reports + PDF (col-4) · Health score (col-4).
- **Act 3 (budgeting extras):** Multi-currency **budgeting** (col-5) + a budgeting visual (col-7). **Invoicing tile REMOVED** — invoicing now lives only on `/invoicing`. `InvoiceCardMock` is not used on the home.

`ClosedLoopChart` deleted. Section header: **"Everything you need to budget and track."**
Sub: "Every feature here ships today. Track what comes in and goes out, set budgets that
tell you what is safe to spend, and reach your savings goals — all in one place." (No
invoicing mention in the bento; that lives on `/invoicing`.)

### Invoicing — dedicated page (`/invoicing`), NOT on the home
Invoicing is real but secondary. It is **removed from the home and the bento entirely** and
gets its own explainer page at `/invoicing`:
- What it does: send polished invoices to clients by email, PDF export, payment links / QR,
  multi-currency. Use `InvoiceCardMock` + the invoice screenshots here.
- **No closed-loop claim.** It may note you can log a client's payment in the same app —
  framed explicitly as a manual step ("you log it"), never as auto-sync.
- Linked quietly from the global nav / footer; never pitched in the home hero or CTA.
- Add `/invoicing` to the `middleware.ts` public allowlist (verify logged-OUT 200).

### FinalCTA
- Body: budget-first close — e.g. "Set your budgets, track every transaction, hit your
  savings goals. Free to start." **No invoicing, no AI** (post what we have). Ghost button →
  `/features`.

---

## Honesty fixes (copy / metadata inventory)

Fix first, then build. P0 = false integration; P1/P2 = positioning/metadata.

- **P0** `PRODUCT.md` — rewrite the "closed loop (invoice → income → budget)" differentiator
  to "invoicing AND budgeting in one app" (co-location, true).
- **P0** `FeaturesBento.tsx` — section header/lede, invoicing tile body, delete `ClosedLoopChart`.
- **P0** `LoopReveal.tsx` — remove (replaced by Budget Demo); also remove from `/features`.
- **P0** `CTA.tsx` — remove "watch that income flow into your budget" (on every page).
- **P0** `faq-data.ts:32` — "that income flows into the same budget" → manual-logging wording
  (also propagates to FAQ JSON-LD).
- **P1** `HowItWorks.tsx` — steps 03/04 + "From invoice to budget, in one flow" framing.
- **P1** `how-it-works/page.tsx:9` — meta description.
- **P2** `HomeHighlights.tsx:26` — "whole money loop" → "one app for your money"; budgeting
  leads the enumeration.
- **P2** `layout.tsx` — `<title>` "Money and Invoicing" → budgeting-first; OG/Twitter to match.
- **P2** `features/page.tsx:10` — meta description leads with tracking/budgets.
- **P2** `opengraph-image.tsx:83` — subtext.

(Full quoted inventory in the budget-seo council audit; reproduce verbatim corrected strings
at implementation time.)

---

## Constraints

- **LCP:** h1 + subhead are plain SSR at `opacity:1`, never animated, in every section.
- **Reduced motion:** every animated element has a static, equally-informative fallback.
- **Tokens:** extend the existing `.landing`-scoped dark tokens; do not bleed into `globals.css`.
- **Honesty gate:** no fabricated metrics/testimonials; future features future-tense.
- **No `npm run build` locally** — typecheck with `npx tsc --noEmit`; builds run in Docker.

---

## Rollout

1. Build a **rendered preview** of the hybrid Home (disposable route) → validate visually.
2. On approval: fix `PRODUCT.md` + the honesty inventory, then fold the preview into the real
   `Hero.tsx`, new `BudgetDemo` component (retire `LoopReveal`), `FeaturesBento.tsx`,
   `CTA.tsx`, `HomeHighlights.tsx`, and the `/features` + `/how-it-works` pages.
3. Run **money-feature-review** is N/A (no money logic), but run a copy/honesty pass + SEO
   metadata check before merge. Delete the preview route + `middleware.ts` allowlist line.

## Deferred / open

- Whether the Budget Demo ships at full scroll-pinned fidelity or a lighter stepped version
  (decide after seeing the preview).
- Hero mock refresh to mirror the Operator Console dashboard when that ships.
