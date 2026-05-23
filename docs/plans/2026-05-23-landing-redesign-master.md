# Landing Page Ground-Up Redesign — Master Design Doc & Build Plan

**Date:** 2026-05-23
**Status:** ⛔ BLOCKED — plan approved in principle; build deferred until the dashboard redesign (Operator Console / Direction B) ships.
**Scope:** Full ground-up redesign of `app/(public)/` (landing) — no auth/app-route logic except one middleware redirect move.

> **Dependency / why blocked:** §3 Hero browser mockup and §8 Dashboard Preview (scroll-pinned Health Score → Budget → Goals panels) are *faithful JSX mockups of the real shipped dashboard*. The dashboard is being redesigned (see `app/(authenticated)/dashboard-preview-2/`). Building these mockups before that lands means redoing them and risks depicting unshipped UI. **Resume the build once the new dashboard is merged**, then have budget-frontend mirror the final dashboard in the landing mockups. The dashboard-independent sections (navbar, hero copy, problem, features bento, AI spotlight, how-it-works, trust, pricing, FAQ, footer, metadata, JSON-LD, middleware redirect) can proceed first if we want to start early.

This is the single source of truth. It reconciles three council briefs and the maintainer's decisions. The detail specs remain binding where this doc doesn't override them:

- Positioning + IA → `2026-05-23-landing-positioning.md`
- Visual system + motion → `2026-05-23-landing-design-system.md`
- SEO + performance + rendering → `2026-05-23-landing-seo-architecture.md`

---

## 1. Locked decisions

| Decision | Choice |
|----------|--------|
| Scope | Full ground-up redesign (new IA, sections, copy, components) |
| Positioning | AI-native, **honest early-access** — AI Advisor framed as coming soon, never live |
| Motion | Framer Motion (`motion`) + GSAP ScrollTrigger |
| Aesthetic | Light gradient AI-startup (Vercel × Raycast × Linear × Mercury) |
| Product name | "Budget Planner" (unchanged) |
| **AI early-access** | **Coming-soon only, NO email capture.** No waitlist form, no `WaitlistSignup` model, no backend capture. |
| **Product preview** | **Faithful JSX mockups only.** No screenshots, no app-run. Mockups must mirror *real shipped* features. |
| Hero H1 | "Your money, finally with a brain." (founder Option A) |
| Testimonials | **Omitted** — replaced by honest credibility strip (no fake quotes/avatars) |
| Cal Sans | No — Geist only to start (already loaded). Revisit later. |
| User count / metrics | **None.** No real number exists → omit entirely. |

---

## 2. Honesty corrections (override the design-system spec)

The visual spec drifted into fabricated claims. These are **hard overrides** — build agents must use the corrected copy:

| Location | ❌ In design-system spec | ✅ Corrected |
|----------|--------------------------|--------------|
| Hero badge pill | `"Now with AI Advisor →"` (implies live) | `"AI Advisor · Coming soon"` (Early-access pill) |
| Hero stat strip | `"500+ users · Free forever · No credit card"` | `"Free to start · No credit card · Your data is yours"` |
| Social Proof Strip | `"500+ users…"`, `"₱2B+ transactions"`, `"Free forever"` | Honest chips: `"Built in the open by a solo founder"`, `"No ads. No data selling."`, `"Public changelog & feature board"`, `"Free to start"` |
| AI chat set-piece | unlabeled live-looking chat + active "Ask anything" input | Same animated chat **but** carries a persistent `"Preview — in development"` label + `Coming soon` pill; input is visibly inert (not a real field) |
| AI section CTA | `"Join the early-access list"` (email capture) | `"Start free"` → `/register`, microcopy: *"Create a free account and you'll be the first to know when the AI advisor opens."* |
| Secondary CTA (hero/final) | `"Join AI early access"` → waitlist | `"See what's coming"` → anchor-scroll to AI section (no form) |
| Security copy | `"bank-level encryption"` / unverifiable badges | Only true claims: encrypted connections, no ads, no data selling, export & delete anytime, built by a named solo founder |

**Standing rule for every AI mention:** future-tense or gated ("will", "coming soon", "in development", "early access"). Never present-tense AI behavior.

---

## 3. Final information architecture (12 sections)

Spine: Hook (AI vision) → Problem → Solution (bento) → AI spotlight (coming soon) → How it works → Product preview → Trust → Pricing/free → FAQ → Final CTA → Footer.

1. **Navbar** — glass, scroll-shadow. Logo + Features / How it works / AI Advisor / Pricing / FAQ + `Log in` + `Start free`.
2. **Hero** — H1 (Option A), subhead, `Start free` (primary) + `See what's coming` (ghost), honest microcopy, JSX browser mockup (real-feature dashboard).
3. **Credibility strip** — honest chips only (no metrics/logos).
4. **Problem** — "Budgeting apps track your past. This one plans your future." Before-diagram (3 disconnected tools).
5. **Features bento** — real shipped features only; invoicing = hero tile (closed loop). Animated mini-dashboard (recharts) in large cell.
6. **AI Advisor spotlight (COMING SOON)** — future-tense vision + labeled preview chat + `Coming soon` pill + `Start free` nudge (no form).
7. **How it works** — 3–4 step closed-loop, scroll-drawn connector.
8. **Product preview** — JSX dashboard mockup (Health Score → Budget → Goals), scroll-pinned reveal (desktop) / tabbed (mobile). Realistic seeded PHP numbers, no fabricated claims.
9. **Trust & security** — true claims only.
10. **Pricing / free** — "Free to start. Honest about what's next." One clear card; AI may be paid later (don't promise free AI).
11. **FAQ** — real Q&As (crawlable + mirrored in FAQPage JSON-LD). AI question answered "not yet, in development; create a free account to be first."
12. **Footer** — links, changelog, feature board, "Built by Ehnand", "Built with coffee in the Philippines". No fake company/team pages.

(No standalone testimonials section.)

---

## 4. Technical / SEO contract (from SEO architecture doc — enforced)

- **Static rendering:** remove `auth()` from `app/(public)/page.tsx`; move the logged-in→`/dashboard` redirect into `middleware.ts` (`pathname === '/' && session`). Crawlers always get cacheable static HTML. *(budget-backend owns the middleware edit.)*
- **LCP:** hero `<h1>`/subhead are plain SSR HTML, `opacity:1`, never animated from `opacity:0`. Only below/beside-headline elements animate in.
- **JSON-LD:** server-component `<script type="application/ld+json">` emitting honest **WebApplication + Organization + FAQPage**. **No `aggregateRating`/`review`** (no real reviews — accept losing the star snippet). Structured data must match visible DOM (no schema drift). Scrub `<`.
- **Metadata:** in `(public)/layout.tsx` — title template, `alternates.canonical: '/'`, robots block, OG/twitter. Keep `opengraph-image.tsx`/`twitter-image.tsx` (don't also declare `openGraph.images`). Honest title/desc: *"Budgeting & Invoicing for Freelancers — Budget Planner"* / desc with AI in future tense.
- **CLS:** explicit dimensions on all media; reserve min-heights (chat 420px, pinned section 200vh in static CSS); fonts via `next/font` only.
- **INP/bundle:** `LazyMotion` + `m` + `strict` (domAnimation only); dynamic-import `gsap`+`ScrollTrigger` below-fold; IntersectionObserver-init; transform/opacity only; route-isolate motion deps to `components/modules/landing/*` so they never leak into the authenticated bundle. `next/dynamic({ssr:false})` only inside thin `'use client'` wrappers (Next 16 rule).
- **prefers-reduced-motion:** disable all GSAP transforms, marquee, typewriter, pinned scrub (→ static tabs), blob drift, hover lifts, CTA pulse. Keep functional motion (navbar shadow, accordion).
- **OG image:** currently dark; landing is light. Left as-is (separate ticket) unless flagged.

---

## 5. Dependencies to add (in Docker)

```bash
docker compose exec app npm install motion gsap @gsap/react
```
- `motion` (Framer Motion v12) — `LazyMotion`/`m`/`domAnimation`.
- `gsap` (v3.13+; ScrollTrigger is free) — dynamic-imported only.
- `@gsap/react` — `useGSAP()` hook (avoids Strict-Mode double-fire on pinned sections).

> **Build method + toolchain:** see `2026-05-23-landing-build-methodology.md` for the registry choices (Magic UI / Aceternity / Motion Primitives / React Bits), the per-section component shortlist, the design-first-image → browser-loop → separate-evaluator workflow, the Playwright-MCP / DESIGN.md tooling adds, the anti-slop checklist, and design-spec refinements (hero h1 off-center, drop the 3× `border-l-4` tell, keep bento asymmetry).

Type-check locally with `npx tsc --noEmit` (never `npm run build` locally — Docker only).

---

## 6. Build plan — council assignments

**Phase 0 — setup (budget-frontend)**
- Install deps in Docker. Author `landing.css` tokens/keyframes. Build layout wrapper (`.landing` light scope + `LazyMotion`). Build shared primitives (`GradientMeshBg`, `BrowserMockup`, `SectionEyebrow`, `MotionReveal`).

**Phase 1 — sections, simple → complex (budget-frontend)**
Order per design-system §"Build Order": Navbar → Hero → Credibility strip + marquee → Problem/Trust/FAQ/Footer → Features bento → AI chat → AIAdvisorSpotlight → HowItWorks → DashboardPreview (pinned, last). Delete & replace all existing `components/modules/landing/*`.

**Phase 1 (parallel) — SEO surface (budget-seo)**
- Metadata export, JSON-LD server component (WebApplication+Organization+FAQPage), FAQ content set (8 freelancer Qs, mirrored in JSON-LD), sitemap/robots verification, per-change audit checklist. Coordinates with budget-frontend on FAQ DOM.

**Phase 1 (parallel) — static render (budget-backend)**
- Move `/` logged-in redirect from `page.tsx` to `middleware.ts`; verify middleware still treats `/` as public for crawlers; confirm no waitlist backend needed (none).

**Phase 2 — copy sign-off (founder)**
- Final honesty/copy pass against §2 corrections before merge.

**Phase 3 — verification (qa-engineer)**
- `npx tsc --noEmit` clean; reduced-motion behavior; responsive (mobile fallbacks); CLS/LCP sanity; **honesty audit** (zero fabricated metrics/claims, AI never present-tense); JSON-LD validates and matches DOM.

**Not required:** `money-feature-review` — this diff touches no income/expense/transfer/account/budget/goal service, no Decimal math, no balance/currency logic. Marketing UI + metadata + one auth-redirect relocation only. (Will reconfirm at review time.)

---

## 7. Risks

- **Honesty regressions** during build (the spec already drifted once) — qa honesty audit is a hard gate.
- **CWV vs heavy motion** — mitigated by §4; qa must spot-check LCP isn't gated by JS.
- **Middleware redirect** — must not break existing protected-route behavior; backend verifies.
- **Light landing vs dark app** — landing is an isolated `.landing` scope; confirm no global token bleed into authenticated routes.
