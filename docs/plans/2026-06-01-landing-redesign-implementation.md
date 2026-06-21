# Landing Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fold the validated, de-slopped landing preview into the real public pages — a budget-first, honest, **feature-first redesign with no audience wedge** — and remove every false "closed-loop / invoice→budget integration" claim.

> **⚠ Read the Revision (2026-06-21) block below first — it overrides the per-task copy and scope where they conflict.**

**Architecture:** The validated implementation already exists in `app/(public)/landing-preview/client.tsx` (critic-graded 1.5/5, "designed, not generated"). This plan PORTS those components into the production landing components/pages, applies the honesty-copy inventory, fixes the remaining nits, and deletes the disposable preview. The preview file is the **source of truth** for new component code — port verbatim, adapting only imports/props.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind 4, `motion/react`, GSAP ScrollTrigger (dynamic-imported), shadcn/ui. Dark Linear×Ramp `.landing`-scoped OKLCH tokens.

---

## Conventions for every task

- **Source of truth:** `app/(public)/landing-preview/client.tsx` (the tested build). When a task says "port X," copy that component's code and adapt imports.
- **No TDD unit tests** — these are presentational components with no existing test harness. The verification gate for each task is:
  1. `docker compose exec app npx prisma generate >/dev/null 2>&1 || true` then **`docker compose exec app npx tsc --noEmit`** → zero errors. (Per project rule: NO `npm run build` locally.)
  2. For any task touching a rendered route, the **Playwright console gate** (below) → **0 console errors AND 0 hydration warnings under BOTH normal and reduced motion**, logged-OUT.
  3. Visual screenshot diff vs the preview baseline (`v3-*.png` at repo root).
- **Playwright console gate** (the lesson from this project — a typecheck pass is NOT proof of no hydration mismatch):
  ```
  Load the route twice — emulateMedia reducedMotion 'no-preference' then 'reduce' —
  with a fresh (logged-out) context, and assert console error count === 0 and no
  text matching /hydrat/i in either load.
  ```
- **LCP rule (non-negotiable):** every `<h1>`/`<h2>` hero headline + its subhead are plain SSR at `opacity:1`, never wrapped in animation.
- **Hydration rule:** any value derived from `useReducedMotion()` / `matchMedia` / `window` that affects rendered markup or a style/className MUST be gated behind the `useMounted()` flag so SSR === first client render. (This is the root cause that bit us twice.)
- **Commits:** each task ends with a commit. NOTE: the maintainer commits on their own cadence — the executor should commit per task UNLESS the maintainer says to hold. Never push without being asked. Branch: `enhancement/landing-page-redesign` (already a dedicated feature branch; a worktree is optional).
- **Do NOT** modify authenticated-route code or `app/globals.css`. All token work stays `.landing`-scoped in `app/(public)/landing.css`.

---

## Revision — 2026-06-21 — task deltas (AUTHORITATIVE; overrides the per-task copy below)

Maintainer review changed the positioning: **honest, feature-first, no audience wedge; invoicing off the home onto its own page; AI advisor off the home.** Principle: *"post what we have, not what we don't."* The preview (`client.tsx`) is still the source of truth for component **structure / animation / hydration**, but its **copy and its invoicing / AI sections are superseded.** Apply these deltas when executing:

- **Task 3 (Hero):** Use this copy instead of the preview's freelancer copy —
  - Eyebrow: "Personal budgeting & tracking" (NOT "For freelancers & solo operators").
  - H1: "Know exactly where your money goes." (plain SSR, `opacity:1`, never animated).
  - Subhead: "Set a budget for every category, track every transaction, and reach your savings goals. No bank linking — you log it, you own it. Free to start."
  - Keep `IncomeTimeline` as the right-column visual, but it now reads as "income you logged," not "a freelancer's variable income." No "freelancer / solo operator / irregular income" anywhere.
- **Task 4 (BudgetDemo):** Keep the demo (manual logging is honest). **De-wedge the label:** "A freelancer's variable month, lived inside the app." → "A month, made clear — inside the app." Section h2 "Your money, made clear." stays. (The "Before" starkness nit still applies.)
- **Task 5 (FeaturesBento):** Budgeting-only. **Remove the invoicing tile (07) and the `InvoiceCardMock` usage from the bento** (move them to the new `/invoicing` page — Task 7b). Keep multi-currency but reframe its body to budgeting ("Track and budget in any currency; lock your base currency at setup."). Re-cut the heading to drop the irregular-income split — e.g. "Everything you need to budget and track" / sub "Every feature here ships today." Renumber the remaining tiles; re-balance the grid spans now that one tile is gone (re-evaluate the empty-text-tile nit against the new layout).
- **Task 6 (CTA / FinalCTA):** **No AI line, no invoicing line.** Budget-first close only. Remove the "An AI advisor is coming…" copy from the home CTA.
- **Task 7 (Home composition):** New body: `<LandingHero /> <CredibilityStrip /> <BudgetDemo /> <FeaturesBento /> <FinalCTA />`. **Remove `<AIAdvisorSpotlight />`** from the home (it stays only on its own `/ai-advisor` page). Remove `HomeHighlights`.
- **NEW Task 7b (Invoicing page):** Create `app/(public)/invoicing/page.tsx` — a standalone, honest invoicing explainer (send by email, PDF, payment links / QR, multi-currency; `InvoiceCardMock` + invoice screenshots). **No closed-loop claim;** any income-logging mention is an explicit manual step. Add `/invoicing` to the `middleware.ts` public allowlist (per the public-route gotcha — verify logged-OUT 200). Add it to the public nav / footer. Give it its own `metadata` (title/description/OG) and a SoftwareApplication/WebPage JSON-LD as appropriate.
- **Task 8 (/features):** Keep the budgeting bento. Invoicing is NOT a hero of this page; if mentioned at all, link to `/invoicing`. Metadata description → budgeting-first, invoicing a secondary mention at most.
- **Task 9 (/how-it-works):** Reframe around the **budgeting flow** (log → budget → track → save). Move invoicing steps out / link to `/invoicing`; no "invoice → budget in one flow," no auto-propagation language.
- **Task 10 (FAQ):** Honest invoicing answer; point detail to `/invoicing`. Keep manual-logging framing.
- **Task 11 (metadata / title / OG):** Budget-first title; drop "and Invoicing" from the lead. OG subtext budgeting-first. AI is **not** mentioned as a live feature anywhere; `featureList` JSON-LD leads with budgeting and does not imply AI exists.
- **Task 16 (cleanup):** `AIAdvisorSpotlight` is now unused on the home — keep the component only if `/ai-advisor` still imports it. **Do NOT delete `InvoiceCardMock`** — it's now used by `/invoicing`. Confirm with grep before any deletion as before.

**"Done when" additions:** the home shows **zero invoicing and zero AI-as-live content**; invoicing exists only on `/invoicing`; **no audience-wedge copy** ("freelancer," "solo operator," "irregular income," "the month you're actually having") anywhere on the home/hero; all public routes (incl. the new `/invoicing`) return **200 logged-OUT**.

---

## Council review fixes — 2026-06-21 (apply IN ADDITION to the deltas above)

Three council agents (founder, budget-seo, budget-frontend) reviewed the revised plan. **Maintainer
decisions on the two reopened questions:** (a) invoicing stays **OFF the home UI** (dedicated
`/invoicing` page only — no bento tile) but **remains in the home title/meta** for SEO; (b) hero
eyebrow stays the plain **"Personal budgeting & tracking"** — the "no bank linking / you log it, you
own it" benefit rides prominently in the subhead + microcopy, NOT promoted to a wedge. Concrete fixes:

**De-wedge the SOURCE strings (not just the prose — these port verbatim otherwise):**
- `IncomeTimeline` aria-label `client.tsx:149` "Monthly income timeline — irregular spikes across 4 weeks" → "Monthly income logged — 4-week view". (Fold into Task 2.)
- `BudgetDemo` sub-label `client.tsx:508` "A freelancer's variable month, lived inside the app." → "A month, made clear — inside the app." (Task 4.)
- BudgetDemo demo data "₱64,200 client payment" → income-agnostic "₱64,200 deposit"; if feasible add a regular paycheck row so the timeline reads for salaried AND variable income (resolves the de-wedged-copy-over-wedged-visual mismatch flagged by founder + frontend). (Tasks 2/4.)
- Bento tile 01 body `client.tsx:997` "When a client pays, you log it here." → "When income arrives, you log it here." (Task 5.)
- Bento heading `client.tsx:977-985` "Budgeting built for income / that does not come in twice a month." → "Everything you need to budget and track." (Task 5.)

**Bento grid re-balance after removing tile 07 (Task 5) — use this layout (the old grid leaves a 5-col hole):**
- Drop `row-span-2` from tile 02. Clean 3-row × 12-col grid:
  - Row 1: Transactions (col-4) · Budgets hero w/ `SpendingRing` (col-5) · Goals (col-3)
  - Row 2: Recurring+Import (col-4) · Reports+PDF (col-4) · Health score + micro gauge (col-4)
  - Row 3: Multi-currency budgeting (col-5) · budget-visual anchor (col-7)
  Also fixes the "dead text tile" nit (05/06 gain width for micro-visuals).

**`InvoiceCardMock` extraction + ordering (frontend P0 — otherwise `/invoicing` has no import source):**
- `InvoiceCardMock` exists ONLY inside `client.tsx:914-939`. Add an explicit step (Task 5 or a Task 7b prerequisite) to extract it to `components/modules/landing/ui/InvoiceCardMock.tsx` BEFORE `/invoicing` imports it.
- **Task 16 is BLOCKED BY Task 7b** — deleting `client.tsx` before `InvoiceCardMock` is extracted kills its only source.

**Hydration (Task 12 — exact location, was only a "suspect"):**
- `FeatureTile` `client.tsx:850-854` calls `useReducedMotion()` ungated, used in `whileHover`. Fix: add `const mounted = useMounted()`; `whileHover={(!mounted || prefersReduced) ? undefined : { y: -2 }}`. Cite this location in Task 12.

**New Task 7c — link + sitemap `/invoicing` (SEO P0/P1 — nav/footer alone orphan it):**
- Add `/invoicing` to `components/modules/landing/Navbar.tsx` AND `Footer.tsx` (no existing task touched these).
- Add to `app/sitemap.ts`: `{ url: \`${baseUrl}/invoicing\`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 }`.
- Add ONE contextual in-body link to `/invoicing` from the home (below the bento) and from `/how-it-works` — passes topical authority that nav/footer links don't.

**`/invoicing` page details (fill Task 7b gaps):**
- JSON-LD type = **`WebPage`** (NOT `SoftwareApplication`; the sitewide layout already emits `WebApplication` — a second app-type node conflicts), with the page's canonical URL.
- Title: "Client Invoicing — Send & Track Invoices · Budget Planner". Meta: "Send polished invoices by email, export to PDF, and share payment links or QR codes. Log a client payment in the same app where you manage your budget. Free to start."
- Include `<FinalCTA />` at the bottom (every other public page has it).
- Add `/invoicing` to the **Task 14** verification route list (curl + Playwright, logged-OUT 200).

**`/how-it-works` meta (Task 9) must not lead with invoicing:**
- → "Set budgets, track every transaction, and reach your savings goals. Also send client invoices and log income — all in one app, no switching between tools."

---

## Phase 0 — Honesty source-of-truth (do first; it propagates)

### Task 0: Fix PRODUCT.md closed-loop differentiator

**Files:** Modify `PRODUCT.md` (grep for "closed loop").

**Step 1:** Find the differentiator line asserting *"the closed loop (invoice → income → budget) that pure budgeting apps and pure invoicing tools don't have."*

**Step 2:** Replace with a true co-location claim, e.g.: *"invoicing AND budgeting in one app — bill a client and track your money in the same place, without a second tool (you log the payment; the apps are not auto-synced)."*

**Step 3:** Scan the rest of PRODUCT.md for any other "closed loop / flows into / automatic sync" wording; correct to manual-logging framing.

**Verify:** `grep -ri "closed loop\|flows into\|flows straight" PRODUCT.md` → no integration claims remain.

**Commit:** `docs: correct PRODUCT.md honesty gate — invoicing is co-located, not integrated`

---

## Phase 1 — Shared primitives

### Task 1: Extract `useMounted` hook

**Files:** Create `components/modules/landing/ui/use-mounted.ts`.

**Step 1:** Port the `useMounted()` hook from `client.tsx:81-85` into the new file, exported.

```ts
'use client';
import { useEffect, useState } from 'react';

/** false on SSR + first client render; true after mount. Gate any
 *  reduced-motion / matchMedia branch behind this to keep SSR === first paint. */
export function useMounted() {
	const [mounted, setMounted] = useState(false);
	useEffect(() => { setMounted(true); }, []);
	return mounted;
}
```

**Verify:** `npx tsc --noEmit`.
**Commit:** `feat(landing): add useMounted hydration-gate hook`

### Task 2: Create the `IncomeTimeline` signature component

**Files:** Create `components/modules/landing/ui/IncomeTimeline.tsx`.

**Step 1:** Port `IncomeTimeline` + the `TIMELINE_WEEKS` and `TIMELINE_ENV_BARS` consts from `client.tsx:113-260` verbatim. Keep the `compact` prop. Keep `figure role="img"` + aria-label (a11y).

**Step 2:** Confirm it imports `cn` from `@/lib/utils`. No other deps.

**Verify:** `npx tsc --noEmit`. (Used by Hero, BudgetDemo, FinalCTA next.)
**Commit:** `feat(landing): add IncomeTimeline signature visual`

---

## Phase 2 — Production components

### Task 3: Rebuild `Hero.tsx`

**Files:** Modify `components/modules/landing/Hero.tsx` (replace `LandingHero` + delete the old `HeroDashboardMock`).

**Step 1:** Replace the export body with the ported `PreviewHero` (`client.tsx:269-383`), renamed `LandingHero`. Key points:
- New eyebrow **"Personal budgeting & tracking"** [Revised 2026-06-21 — NOT "For freelancers & solo operators", NOT the AI badge].
- H1 **"Know exactly where your money goes."** — plain SSR, `opacity:1`, never animated.
- Subhead **"Set a budget for every category, track every transaction, and reach your savings goals. No bank linking — you log it, you own it. Free to start."** (NOT the preview's freelancer subhead.)
- Right column = `<IncomeTimeline />` (frameless), imported from Task 2.
- Quiet directional radial gradient + `.l-noise-overlay` (NOT `GradientMeshBg`).
- `useMounted()` + `useReducedMotion()` exactly as the preview (variants gated behind `mounted`).

**Step 2:** Remove the now-unused `GradientMeshBg`, `BrowserMockup`, `NumberTicker` imports/usages from this file if no longer referenced.

**Verify:** typecheck + **Playwright console gate** on `/` (after Task 8 wires it; for now verify on `/landing-preview` parity). Screenshot vs `v3-hero.png`.
**Commit:** `feat(landing): budget-first hero with income-timeline visual`

### Task 4: Create `BudgetDemo` + retire `LoopReveal`

**Files:**
- Create `components/modules/landing/BudgetDemo.tsx`
- Delete `components/modules/landing/LoopReveal.tsx` (after Task 9 removes its import)

**Step 1:** Port `BudgetDemo`, `DemoAnimatedView`, `DemoSteps`, `StaticDemoPanel`, and the `DEMO_*` consts from `client.tsx:386-833` into `BudgetDemo.tsx`. Import `IncomeTimeline`, `NumberTicker`, `useMounted`, `cn`.

**Step 2:** Keep the `useMounted`-gated `isAnimated` so the `lg:min-h-[250vh]` class and GSAP only attach post-mount (the hydration fix). Keep the static three-panel fallback for mobile/reduced-motion.

**Step 3 (nit #1 — "Before" panel starkness):** In State A / `StaticDemoPanel state='A'`, make "Week 2. No income yet this month." visually stark — e.g. render the empty envelopes muted/greyed with a single oversized `₱0 in` mono figure or an empty-state line, so the "Before" reads as bleak/tension that the "After" ₱25,290 payoff resolves. Mirror the treatment in both the animated and static A states.

**Verify:** typecheck. (Console/visual gate after Task 8/9 wire it in.)
**Commit:** `feat(landing): BudgetDemo centerpiece (replaces LoopReveal)`

### Task 5: Rebuild `FeaturesBento.tsx`

**Files:** Modify `components/modules/landing/FeaturesBento.tsx` (delete `ClosedLoopChart` + `LOOP_DATA`).

**Step 1:** Replace the bento with the ported `PreviewFeaturesBento` + `FeatureTile` + `SpendingRing` + `InvoiceCardMock` + `useBentoStagger` from `client.tsx:844-1036`. Keep the `lead` prop behavior (h1 vs h2) for the `/features` route — the ported `<h2>` becomes `<h1>` when `lead`.

**Step 2:** Keep the typographic-split heading (#5), the row-span-2 tile 02 with large `SpendingRing` (#4), mono-numeral hairline tiles (no icon-box), and the honest copy verbatim from the preview.

**Step 3 (nit #2 — empty text tiles):** Tiles 05 (recap) and 06 (health score) are text-only and create dead whitespace beside the tall tile 02. Either add a micro-visual (a tiny sparkline / mock-PDF chip / oversized health numeral) OR condense their spans so the whitespace is intentional. Pick one and apply.

**Step 4:** Delete `ClosedLoopChart`, `LOOP_DATA`, and now-unused recharts imports if nothing else in the file uses them.

**Verify:** typecheck + screenshot vs `v3-bento.png`.
**Commit:** `feat(landing): budget-led bento, invoicing separate, kill ClosedLoopChart`

### Task 6: Rebuild `CTA.tsx` (`FinalCTA`)

**Files:** Modify `components/modules/landing/CTA.tsx`.

**Step 1:** Replace `FinalCTA` body with the ported `PreviewFinalCTA` (`client.tsx:1046-1117`): raw dark surface, oversized left-aligned heading, mini `<IncomeTimeline compact />`, underline-style "Start free →" link, **NO AI line** (removed — see Step 2). Remove `GradientMeshBg`/blob usage and the "Be first to the AI" heading. Also replace the headline "…next irregular month." (`client.tsx:1070-1077`) with a budget-first headline, e.g. **"Start free. / Know exactly / where your money goes."** No invoicing line.

**Step 2:** Keep `MotionReveal`. **REMOVE the AI line from the home CTA entirely** [Revised 2026-06-21] — cut "An AI advisor is coming…" (`client.tsx:1089-1092`) from the shared `FinalCTA`. `/ai-advisor` already carries the full AI section via `AIAdvisorSpotlight`, so the shared CTA needs no AI line. Verify scope = **all public marketing routes** (FinalCTA also renders on /faq, /pricing, /ai-advisor, /invoicing).

**Verify:** typecheck + screenshot vs `v3-cta.png`. (FinalCTA renders on every public page — gate all of `/`, `/features`, `/how-it-works`.)
**Commit:** `feat(landing): rebuild FinalCTA — budget-first, no blobs, AI demoted`

---

## Phase 3 — Page composition

### Task 7: Update Home (`app/(public)/page.tsx`)

**Files:** Modify `app/(public)/page.tsx`.

**Step 1:** New composition (matches the validated preview Home):
```
<LandingHero /> <CredibilityStrip /> <BudgetDemo /> <FeaturesBento /> <FinalCTA />
```
Import `BudgetDemo`. **Do NOT include `<AIAdvisorSpotlight />`** [Revised 2026-06-21 — AI off the home; it stays only on `/ai-advisor`]. Remove `HomeHighlights`.

**Step 2:** Confirm the page stays a server component (no `auth()`), SSR for SEO. `FeaturesBento` (client) and `BudgetDemo` (client) are fine as nested client components.

**Verify:** **Playwright console gate on `/` logged-OUT** (normal + reduced motion, 0 errors / 0 hydration). Full-page screenshot.
**Commit:** `feat(landing): new budget-first Home composition`

### Task 8: Update `/features` (`app/(public)/features/page.tsx`)

**Files:** Modify `app/(public)/features/page.tsx`.

**Step 1:** Remove the `<LoopReveal />` import and usage. New body: `<FeaturesBento lead /> <TrustSecurity /> <FinalCTA />`.

**Step 2:** Fix the metadata `description` (currently invoicing-first):
> "Track every peso in and out, set budgets that show what is safe to spend, reach your savings goals, and send polished invoices to clients. One app for freelancers and solo operators."

**Verify:** Playwright console gate on `/features` logged-OUT. Confirm exactly one `<h1>` (the `lead` bento heading).
**Commit:** `feat(landing): /features uses budget-led bento, drop LoopReveal`

### Task 9: Update `/how-it-works`

**Files:** Modify `app/(public)/how-it-works/page.tsx` and `components/modules/landing/HowItWorks.tsx`.

**Step 1:** Rewrite every false-loop line so income-logging is shown as a MANUAL step (no auto-propagation). Specifically:
- `HowItWorks.tsx` section heading "From invoice to budget, in one flow." → e.g. "Invoice, log, budget — all in one app." Body: drop "the loop, end to end" / "never leave the same app" auto-framing.
- Steps 03/04 "That income flows into your budgets..." → "You log the payment; your budget reflects what you logged."
- Step 2 "every account stays up to date on its own" → remove "on its own."
- `how-it-works/page.tsx:9` meta description → "Invoice your clients, log your income, and manage your budgets in one place. See how Budget Planner connects billing and finances without switching apps."

**Verify:** `grep -rin "flows into\|in one flow\|the loop\|on its own\|automatic" app/\(public\)/how-it-works components/modules/landing/HowItWorks.tsx` → clean. Playwright console gate.
**Commit:** `fix(landing): /how-it-works honest manual-logging framing`

---

## Phase 4 — Honesty inventory: copy + metadata

### Task 10: FAQ + JSON-LD

**Files:** Modify `components/modules/landing/faq-data.ts`.

**Step 1:** Fix the "Can I send real invoices?" answer (`:32`): replace *"that income flows into the same budget you are already planning against"* with: *"When a client pays, you log the income in the same app where you track your budget, so your billing and your finances stay in one place instead of two separate tools."* (Propagates automatically to the FAQPage JSON-LD.)

**Step 2:** Scan all FAQ answers for other "flows/syncs/automatic" wording; correct.

**Verify:** typecheck; Playwright on `/faq` (FAQ JSON-LD present, honest).
**Commit:** `fix(landing): honest invoicing FAQ answer (+ JSON-LD)`

### Task 11: Metadata, OG, title

**Files:** Modify `app/(public)/layout.tsx`, `app/(public)/opengraph-image.tsx`.

**Step 1:** `layout.tsx` default `<title>` "Budget Planner: Money and Invoicing for Freelancers" → **"Budget Planner — Budgeting, expense tracking & client invoicing"** [Revised 2026-06-21: NO "freelancers"; invoicing kept as the SEO keyword differentiator, not an audience claim]. Update OG title + Twitter description to match. **Also fix the two strings that still say "for freelancers and solo operators":** `BASE_DESCRIPTION` (`layout.tsx:8-9`) and the `SITEWIDE_JSON_LD` `description` (`layout.tsx:53`) → e.g. "Personal budgeting and expense tracking app. Track income and expenses, set budgets for every category, reach savings goals, and send client invoices. Free to start. An AI financial advisor is in development." Home meta `description` → "Track income and expenses, set budgets for every category, reach savings goals, and send professional invoices to clients. No bank linking — you log it, you own it. Free to start."

**Step 2:** `opengraph-image.tsx:83` subtext → "Budgeting, expense tracking, and invoicing for freelancers. Free to start."

**Step 3:** Optional: reorder JSON-LD `featureList` so budgeting precedes invoicing (hygiene, not required).

**Verify:** typecheck; Playwright — `document.title` + `meta[property="og:title"]` are budget-first; OG image route 200.
**Commit:** `fix(landing): budget-first title + OG/Twitter metadata`

---

## Phase 5 — Remaining nits

### Task 12: Reduced-motion hydration attribute fix (nit #4)

**Files:** Whichever component still emits an ungated `prefersReduced`-derived style/attribute on first paint (suspect: `IncomeTimeline` bar `animation` style, or a `FeatureTile`/demo style). 

**Step 1:** Reproduce: Playwright, `emulateMedia({reducedMotion:'reduce'})`, load `/`, assert NO `/hydrat/i` console message. (Currently fails with "some attributes... didn't match... won't be patched up.")

**Step 2:** Find the first-paint style/attribute that differs only under reduced motion (a `style` computed from `prefersReduced`/`useReducedMotion` without a `mounted` gate). Gate it behind `useMounted()` (render the static/SSR value until mounted), OR make the initial inline style deterministic and apply the CSS `@media (prefers-reduced-motion)` override in `landing.css` instead of in JS.

**Step 3:** Re-run the reduced-motion console gate → 0 hydration messages.

**Verify:** Playwright console gate passes under BOTH `no-preference` AND `reduce`.
**Commit:** `fix(landing): eliminate reduced-motion hydration attribute mismatch`

### Task 13: Noise grain visibility (nit #3)

**Files:** `app/(public)/landing.css` (`.l-noise-overlay`).

**Step 1:** Confirm the grain registers visibly in a screenshot. If not, bump opacity/contrast or fix the SVG data-URI `baseFrequency`. If it can't be made tastefully visible, remove it cleanly (don't leave an invisible half-measure).

**Verify:** screenshot shows texture (or overlay removed).
**Commit:** `style(landing): make noise grain register (or remove)`

---

## Phase 6 — Verify, review, clean up

### Task 14: Full route verification (logged-OUT)

**Step 1:** Playwright console gate on `/`, `/features`, `/how-it-works`, `/faq`, `/pricing`, `/ai-advisor` — each under normal + reduced motion, logged-OUT — 0 console errors, 0 hydration.

**Step 2:** `curl` each route logged-out → 200 (middleware allowlist intact; per the public-route gotcha).

**Step 3:** Screenshot each and eyeball vs the `v3-*` baselines.

**Step 4 (optional but recommended):** re-run the visual-craft critic agent on the PRODUCTION screenshots to confirm parity with the 1.5/5 preview.

**Commit:** none (verification only) — or `test(landing): verification screenshots` if artifacts are kept.

### Task 15: Honesty/SEO final sweep

**Step 1:** `grep -rin "closed loop\|flows into\|flows straight\|in one flow\|automatic sync\|one number, one place" app components content PRODUCT.md` → ZERO hits.

**Step 2:** Confirm budget-first title/description/JSON-LD; invoicing present but never integration-claimed; AI strictly future-tense.

**Step 3:** Money-feature-review: **N/A** (no Decimal/balance/currency logic touched) — note this explicitly in the PR.

**Commit:** (fixes if any) `fix(landing): final honesty sweep`

### Task 16: Delete the preview + cleanup dead code

**Files:**
- Delete `app/(public)/landing-preview/` (page.tsx + client.tsx)
- `middleware.ts`: remove the `/landing-preview` allowlist line (~`:28`)
- Delete `components/modules/landing/HomeHighlights.tsx` (now unused — confirm with grep)
- Delete `components/modules/landing/LoopReveal.tsx` (confirm unused)
- Delete `components/modules/landing/ui/GradientMeshBg.tsx` + `BrowserMockup.tsx` ONLY if grep confirms zero remaining usages
- Remove the root-level screenshot PNGs (`hyb-*.png`, `v2-*.png`, `v3-*.png`, `preview-*.png`, `optA2/optB2/optC2.png`) if they were committed; otherwise leave (gitignored)

**Step 1:** For each deletion, `grep -rln <Name> app components` first → confirm zero references before deleting.

**Verify:** `npx tsc --noEmit` clean; Playwright `/landing-preview` → 404/redirect (gone); all real routes still 200 logged-out.
**Commit:** `chore(landing): remove disposable preview + dead landing code`

---

## Done when

- All public routes render the redesign logged-OUT with **0 console/hydration errors** under normal AND reduced motion.
- `grep` for closed-loop/integration phrasing returns **zero** hits across `app`, `components`, `content`, `PRODUCT.md`.
- Title/metadata/OG are budget-first; invoicing prominent but never claimed as integrated; AI strictly future-tense.
- Preview route + dead components removed; typecheck clean.
- Production screenshots match the `v3-*` baselines (critic parity ~1.5/5).

## Open / deferred

- Hero mock refresh to mirror the Operator Console dashboard — out of scope (separate effort).
- Peso/PH-vs-global brand commitment — left ambiguous per decision; ₱ stays in mockups only.
- Final hero/CTA headline copy is provisional — confirm with maintainer before merge.
