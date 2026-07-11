# Landing Page Redesign — SEO & Performance Architecture

**Date:** 2026-05-23
**Owner:** Lead Engineer (owns SEO + Core Web Vitals for this redesign)
**Status:** Design phase — this is the technical contract the build agents follow. No final code here.
**Scope:** Full ground-up redesign of `app/(public)/page.tsx` (light theme, AI-native positioning, heavy cinematic motion via GSAP + Framer Motion).

---

## 0. The core tension and the verdict

Heavy GSAP + Framer Motion animation **directly threatens** LCP, CLS, INP/TBT, and the marketing-route bundle. The non-negotiable rule that resolves it:

> **Text and the LCP element are server-rendered, painted, and never gated behind JS. Motion is an enhancement layered on top of already-painted content — never a prerequisite for content to appear.**

Every decision below flows from that rule. If a build agent ever finds themselves writing `initial={{ opacity: 0 }}` on the hero headline, they have violated the contract.

---

## 1. Metadata architecture

### 1.1 Where metadata lives
Keep the static `metadata` export in **`app/(public)/layout.tsx`** (current location). The page is a Server Component, so this is rendered into the initial HTML — Google reads it reliably without executing JS ([Next.js docs](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Strapi SEO guide](https://strapi.io/blog/nextjs-seo)). `metadataBase` is already set in the root `app/layout.tsx` (`https://budgetplanner.app`), so relative `url`/image paths resolve correctly. **Do not** add a second `metadataBase`.

### 1.2 Title template
Add a title template at the root or public layout so child public pages compose cleanly:

```ts
title: {
  default: 'Budget Planner — AI-native budgeting for freelancers & solo operators',
  template: '%s · Budget Planner',
}
```

The landing's `default` is the home title. Sub-pages (changelog, etc.) set only their own `title` string and inherit the suffix.

### 1.3 Honest, keyword-aware copy
The AI Advisor is a **teaser/mock on waitlist** — copy must not claim it ships today. Approved strings:

- **Title (default):** `Budget Planner — AI-native budgeting for freelancers & solo operators`
- **Description:** `Track income, expenses, and budgets, set savings goals, and automate recurring transactions. An AI financial advisor is coming soon — join the early-access waitlist. Free to use.`

Notes:
- "coming soon" + "early-access waitlist" is the honest framing. No "AI tells you exactly what to do" present-tense claims.
- Primary keywords: *budgeting app, expense tracker, savings goals, freelancers*. AI is a differentiator, not the only hook — so the page still ranks for core finance intent even if AI copy is hedged.

### 1.4 Canonical
Add explicit canonical to the landing (avoids duplicate-content ambiguity from query strings / trailing slashes):

```ts
alternates: { canonical: '/' }
```

Resolves against `metadataBase` to `https://budgetplanner.app/`.

### 1.5 openGraph / twitter
Expand the existing thin OG block. Reference the existing file-based images (do NOT inline `images` URLs — Next auto-wires `opengraph-image.tsx` / `twitter-image.tsx` when present; declaring `openGraph.images` manually would override and double up). Keep:

```ts
openGraph: {
  type: 'website',
  url: '/',
  siteName: 'Budget Planner',
  locale: 'en_US',
  title: 'Budget Planner — AI-native budgeting for freelancers',
  description: 'Track income, expenses, and budgets. AI advisor coming soon. Free to use.',
},
twitter: {
  card: 'summary_large_image',
  title: 'Budget Planner',
  description: 'AI-native budgeting for freelancers & solo operators. Free to use.',
},
```

`opengraph-image.tsx` and `twitter-image.tsx` stay exactly as they are (the twitter one re-exports OG — good). **One update:** the OG image art is dark-themed; the landing is now light. That is fine — social cards live in their own context and the dark card has better contrast for thumbnails. Leave it unless the founder wants brand consistency; if so, that's a separate visual ticket, not a blocker.

### 1.6 robots (metadata-level)
Add a `robots` block to allow full indexing/snippets explicitly (defends against any inherited noindex):

```ts
robots: {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
}
```

---

## 2. Structured data (JSON-LD)

### 2.1 The honesty problem — read this first
Google's current SoftwareApplication spec **requires** `name`, `offers.price`, **and one of** `aggregateRating` **or** `review` for rich-result eligibility ([Google Search Central — Software App](https://developers.google.com/search/docs/appearance/structured-data/software-app)). The user has **banned fake review/rating data**.

**Verdict:** We will NOT fabricate `aggregateRating`/`review`. Consequence: the SoftwareApplication block will **not** earn the star/rating rich result — and that is the correct, policy-safe outcome. Fabricated ratings risk a manual action ([Google review snippet guidelines]). We still emit SoftwareApplication because it provides honest entity context (category, price=0, OS) that strengthens entity understanding even without the rich snippet. When the product genuinely has reviews later, add real `aggregateRating` then.

Build agents: **do not** add `aggregateRating` or `review` to satisfy a validator warning. The warning is expected and acceptable.

### 2.2 What to emit
Emit a single `@graph` array (one `<script type="application/ld+json">`) from a small **server component** rendered inside `app/(public)/layout.tsx` (replacing the current inline `<script>`). Server-injected so it's in the initial HTML.

Types:
1. **Organization** — entity/brand node, links the site to the product.
2. **WebApplication** (subtype of SoftwareApplication) — more accurate than bare `SoftwareApplication` for a browser-only product; carries `browserRequirements` ([RankSight guide](https://ranksightai.com/blog/software-app-schema-guide-2025), [Unhead schema docs](https://unhead.unjs.io/docs/schema-org/api/schema/software-app)).
3. **FAQPage** — only if the rendered FAQ section ships (see §3.5). The FAQ JSON-LD **must mirror visible, crawlable text verbatim** — no questions in JSON-LD that aren't on the page.
4. **BreadcrumbList** — low value on a single-page landing (one item). **Skip** for the landing; revisit if/when sub-pages (e.g., `/features`, `/pricing`) exist. Documenting the decision so an agent doesn't add a one-node breadcrumb.

### 2.3 Sample shape (honest fields only)

```jsonc
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://budgetplanner.app/#org",
      "name": "Budget Planner",
      "url": "https://budgetplanner.app/",
      "logo": "https://budgetplanner.app/icon.png"
    },
    {
      "@type": "WebApplication",
      "@id": "https://budgetplanner.app/#app",
      "name": "Budget Planner",
      "url": "https://budgetplanner.app/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Web",
      "browserRequirements": "Requires JavaScript. Requires a modern web browser.",
      "publisher": { "@id": "https://budgetplanner.app/#org" },
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Track income, expenses, and budgets, set savings goals, and automate recurring transactions. AI financial advisor coming soon.",
      "featureList": [
        "Income & expense tracking",
        "Envelope budgets",
        "Savings goals",
        "Recurring transaction automation",
        "CSV import",
        "Financial reports & PDF export"
      ]
      // NO aggregateRating / review — see §2.1
    },
    {
      "@type": "FAQPage",
      "@id": "https://budgetplanner.app/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is Budget Planner free?",
          "acceptedAnswer": { "@type": "Answer", "text": "Yes. Core budgeting, tracking, goals, and reports are free to use." }
        },
        {
          "@type": "Question",
          "name": "Does the AI advisor work now?",
          "acceptedAnswer": { "@type": "Answer", "text": "The AI financial advisor is in early access. Join the waitlist to be notified when it launches." }
        }
      ]
    }
  ]
}
```

Validate with Google Rich Results Test and the schema.org validator before merge. Expect a "missing aggregateRating" *recommendation* on WebApplication — that is intended.

---

## 3. Semantic HTML / a11y for SEO

### 3.1 Heading hierarchy (hard rules)
- **Exactly one `<h1>`** — the hero headline. It carries the primary keyword phrase.
- Each section heading is an `<h2>`. Sub-points within a section use `<h3>`. **Never skip levels** (no `<h2>` → `<h4>`).
- Decorative oversized text (eyebrows, kickers) must NOT be headings — use `<p>` or `<span>` with styling.
- Build agents: a heading is for document structure, not font size. Style with classes.

### 3.2 Landmarks
- One `<header>` (nav), one `<main>`, one `<footer>`. Already structured this way in the current page — preserve it.
- Each major section: `<section aria-labelledby="...">` pointing at its `<h2>` id. The hero, features, how-it-works, FAQ, CTA each get a labelled section.
- Nav uses `<nav aria-label="Primary">`.

### 3.3 Alt text policy
- **Decorative motion/background art:** `alt=""` (empty) + `aria-hidden` where appropriate so AT skips it.
- **Meaningful product imagery** (dashboard screenshot): descriptive alt, e.g. `alt="Budget Planner dashboard showing monthly spending by category and savings-goal progress"`. Keyword-aware but truthful.
- Every `<img>`/`next/image` MUST have an `alt` attribute (empty string is a valid, deliberate value — never omit).

### 3.4 Motion + a11y
- Honor `prefers-reduced-motion`: gate all GSAP timelines and Framer transitions. When reduced, content renders in final state with no movement. This is both an a11y requirement and an INP win.
- Animated content must be present and readable with JS disabled / before hydration (it's SSR'd; motion only transforms it).

### 3.5 FAQ as real crawlable text
The FAQ section is **real server-rendered HTML** (`<section>` with `<h2>`, then `<h3>`/`<p>` or a `<dl>`), not injected by JS, not collapsed-by-default-with-content-in-JS. The JSON-LD FAQPage mirrors it verbatim (§2.2). Accordion interactivity is fine **as long as** the answer text is in the DOM at SSR (CSS-hidden is crawlable; JS-absent is not).

---

## 4. Core Web Vitals strategy (reconciling heavy motion)

### 4.1 LCP — the headline rule
The **LCP element is the hero `<h1>`** (text LCP is cheapest and fastest; we control it fully). If a hero product image is larger, it becomes the LCP element instead — plan for both.

**The opacity trap (load-bearing):** Chrome does **not** count an element with `opacity: 0` as an LCP candidate — it waits until the element repaints visible, delaying LCP by the full animation duration ([Savvy — Hero Animation LCP](https://savvy.co.il/en/blog/wordpress-speed/hero-animation-lcp-optimization/), confirmed in search). Real-world report in that source: removing the issue (and `filter: blur()`) dropped LCP from 5.3s to 2.4s.

**Rules for the hero:**
1. **Never animate the `<h1>` (or hero LCP image) from `opacity: 0` on load.** It must be painted at full opacity in the first frame.
2. If a fade-in on the hero is visually required, start from **`opacity: 0.1`** (browser counts it as an LCP candidate and records LCP on first paint) and transition to 1 over ~0.6–0.7s. This is the sanctioned compromise.
3. Prefer entrance motion that does NOT touch opacity on the LCP node: a small `translateY` reveal from a *visible* state, or animate *sibling/child decorative* elements while the headline itself is static.
4. No `filter: blur()` on or behind the LCP element during load (forces expensive repaints, the Savvy source called it out explicitly).
5. The hero entrance should fire after first paint: a tiny synchronous step + `requestAnimationFrame` so the browser paints the initial visible state once before the animation class/timeline is applied.

**Image strategy:**
- Hero/product images via **`next/image`** with explicit `width`/`height` (or `fill` + sized container) — never raw `<img>`. Auto AVIF/WebP, responsive `srcset`, prevents CLS ([Next.js / Strapi guidance](https://strapi.io/blog/nextjs-seo)).
- Mark the above-the-fold hero image `priority` (preloads it, removes lazy-load delay on the LCP candidate).
- Provide correct `sizes` so mobile doesn't download the desktop asset.
- Source assets: there are several PNGs in repo root (`dashboard-desktop-full.png`, `preview-light-full.png`, etc.) — move the chosen ones into `/public`, and prefer the **light-theme** previews for the light landing.

### 4.2 CLS — reserve everything
- Every image/video/embed has explicit dimensions or an aspect-ratio box. Zero unsized media.
- **Fonts via `next/font`** (already used: Geist/Geist_Mono in root). `next/font` self-hosts and applies `size-adjust` automatically to minimize FOUT/swap shift. Keep `display: swap` (the default) — do not block render on fonts. If the redesign adds a display font, route it through `next/font` too; never a raw `<link>` to Google Fonts (causes shift + extra origin).
- Reserve space for any lazy-mounted/below-fold section so its hydration/animation mount doesn't push layout (min-heights on sections).
- Sticky/animated nav: reserve its height; don't let it collapse-then-expand.
- GSAP `ScrollTrigger` pinning can cause shift if misconfigured — pinned sections must use `pinSpacing` correctly so surrounding content reserves the pinned height.

### 4.3 INP / TBT — keep the main thread light
- **Dynamically import GSAP + ScrollTrigger** so they are NOT in the initial bundle. Load them inside a `'use client'` animation controller, after mount / on idle, e.g. `const gsap = (await import('gsap')).default`. Register `ScrollTrigger` only on the client.
- **Lazy-init below-the-fold animations via `IntersectionObserver`** (or ScrollTrigger's own viewport triggering) — do not build/play timelines for sections the user hasn't reached.
- **Debounce/throttle** any custom scroll/resize handlers; prefer ScrollTrigger (it batches via a single rAF loop) over hand-rolled scroll listeners.
- **GPU-only properties:** animate **`transform` (translate/scale/rotate)** and **`opacity`** only. Never animate `width`, `height`, `top`, `left`, `margin`, or `box-shadow` in scroll-driven loops (layout/paint thrash → TBT/INP spikes).
- `will-change: transform` sparingly on actively animating elements; remove after.
- Keep hydration cost down: the page is mostly static Server Components; only the animation controllers and interactive bits (nav menu, FAQ accordion, waitlist form) are Client Components. Don't make the whole page one giant `'use client'` tree.

### 4.4 Bundle — route-level isolation
**Estimated added weight (gzipped, rough):**
- `gsap` core ~ 25–30kb + `ScrollTrigger` ~ 12–15kb.
- Framer Motion (`motion`) full `motion.*` import ~ 40kb+.

**Mitigations:**
1. **LazyMotion + `m` component** for Framer Motion: import `* as m from "motion/react-m"` and wrap in `<LazyMotion features={domAnimation} strict>`. Initial cost drops to ~4.6kb, `domAnimation` adds ~15kb on demand (`domMax` ~25kb only if drag/layout animations are truly needed — they aren't for a landing) ([Motion — reduce bundle size](https://motion.dev/docs/react-reduce-bundle-size)). `strict` makes the build agent's accidental `motion.div` throw, enforcing the optimization.
2. **Dynamic import** the heavy GSAP timelines and any large motion component so they're split into their own chunk loaded after first paint.
3. **`ssr: false` constraint (Next.js 16):** `next/dynamic({ ssr: false })` is **only allowed inside Client Components** — a Server Component using it errors ([Next.js lazy-loading docs](https://nextjs.org/docs/app/guides/lazy-loading), [PostHog issue #26016](https://github.com/PostHog/posthog/issues/26016)). So: keep `page.tsx` a Server Component that SSR's all text/structure; put each `ssr:false` motion wrapper inside a thin `'use client'` component. **Textual content is never inside an `ssr:false` boundary** — only the visual/motion layer is.
4. **Route isolation:** these libs live only in `components/modules/landing/*` and are imported only by the public route. They must **not** be imported by any `app/(authenticated)/*` code, so Next's per-route code-splitting keeps gsap/motion out of the app bundle. Build agents: do not add a shared "AnimatedThing" to `components/common/` that pulls gsap — that would leak it into the authenticated bundle.
5. React Compiler is on (`reactCompiler: true`) — it memoizes automatically; agents should not hand-wrap everything in `useMemo`/`useCallback`, but it does NOT reduce 3rd-party bundle weight, so the above still applies.

---

## 5. Rendering strategy — make the landing statically generated

### 5.1 The problem
`app/(public)/page.tsx` currently calls `await auth()` then `redirect('/dashboard')` for logged-in users. `auth()` reads cookies → **forces dynamic rendering** of the marketing page. That defeats static caching/CDN delivery for crawlers and hurts TTFB/LCP.

### 5.2 The fix — move the redirect out of the page
The middleware **already treats `/` as a public page and `NextResponse.next()`s it** (confirmed in `middleware.ts`). So the page-level `auth()` is the *only* thing forcing dynamic rendering, and removing it is safe for SEO.

**Plan:**
1. **Remove `auth()` + `redirect()` from `page.tsx`.** The page becomes a pure static Server Component (no cookies read → statically generated and CDN-cacheable). Crawlers get instant HTML.
2. **Handle the logged-in redirect in middleware** instead — add a rule: if `pathname === '/' && session`, `NextResponse.redirect('/dashboard')`. Middleware runs on every request including crawlers, but crawlers are unauthenticated (no session) so they always get the static landing. Logged-in humans get bounced to the dashboard. This is the recommended pattern — keep auth/redirect logic in the edge layer, keep the page static.
   - **Verify:** confirm the existing matcher `'/((?!api|_next/static|_next/image|favicon.ico).*)'` covers `/` (it does) and that adding the `/`-redirect rule doesn't create a loop (it won't — `/dashboard` is a separate path).
3. Result: `page.tsx` has **no dynamic API calls**, so Next statically generates it at build time. Add nothing that reads cookies/headers/`searchParams` to the page tree.

### 5.3 Guardrail
Build agents must NOT reintroduce `auth()`, `cookies()`, `headers()`, or `searchParams` into the landing render path. Any personalization for logged-in users belongs in middleware or a client-side check that does not block the static shell. If a future "logged-in → show dashboard CTA" is wanted, do it client-side after paint, not server-side.

---

## 6. Dependency + install plan

Add to `dependencies`:

```
motion@^12      # the new package name for framer-motion (import from "motion/react")
gsap@^3.13      # includes ScrollTrigger under gsap/ScrollTrigger
```

Notes:
- Package is **`motion`** (already noted in the prompt). Import surface: `motion/react`, `motion/react-m`, `LazyMotion`, `domAnimation`.
- GSAP core + ScrollTrigger ship in the one `gsap` package; `ScrollTrigger` is registered at runtime: `gsap.registerPlugin(ScrollTrigger)` — do this once, client-side, after dynamic import.
- **Install runs in Docker** (per project rule — no `npm run build` locally). After adding to `package.json`, install inside the container: `docker compose exec app npm install motion gsap`. Then restart the `app` container if the dev server caches modules.
- **`next.config.ts`:** no change strictly required. Optionally add `experimental.optimizePackageImports: ['lucide-react']` (icons) for a marginal win, but that's orthogonal — do NOT add gsap/motion there blindly; verify they're tree-shakeable first. Keep `reactCompiler: true` and `output: 'standalone'`.
- **License note for the founder:** GSAP core + ScrollTrigger are free under the standard license as of GSAP 3.13 (Webflow made the club plugins free). We're only using core + ScrollTrigger, so no licensing concern. Flag if any "club" plugin (e.g., SplitText, MorphSVG) gets pulled in.
- Local type check after wiring: `npx tsc --noEmit` (NOT `npm run build`).

---

## 7. Sitemap / robots audit

**`app/sitemap.ts`:** the landing (`baseUrl` = `/`) is present with `priority: 1` — good. Recommendations:
- Keep `/`, `/changelog` (0.6). (`/register` intentionally excluded — thin auth form, no indexable value.) **Reconsider `/login` (0.5):** login pages have near-zero SEO value; harmless to keep but candidate for removal. Low priority.
- If the redesign adds anchor-only sections (e.g., `#features`, `#faq`) they do NOT need sitemap entries (fragments aren't separate URLs). If it spins out real routes (`/features`, `/pricing`) later, add them.

**`app/robots.ts`:** `allow: '/'`, disallows `/dashboard`, `/admin`, `/api/`, `/onboarding` — correct; the landing is crawlable. Recommendations:
- The disallow list is fine. **Confirm** `opengraph-image`/`twitter-image` are NOT blocked (they aren't — good; social scrapers must reach them).
- Sitemap reference is present and correct.
- No change required. One nicety: add `/reset-password` and `/forgot-password` to disallow if they aren't meant to be indexed (low value, no harm indexed, optional).

**Action items:** none blocking. Optional cleanups noted above.

---

## 8. Prioritized risk list (what could tank SEO/CWV — and the guardrail)

| # | Risk | Impact | Guardrail for build agents |
|---|------|--------|----------------------------|
| **P0** | Hero `<h1>`/LCP image animated from `opacity: 0` on load | LCP balloons by full animation duration (multi-second regression) | Never `opacity:0` on the LCP node. Use `opacity:0.1`→1, or animate only non-LCP siblings. Paint first, animate after rAF. (§4.1) |
| **P0** | Page stays dynamic because `auth()` stays in `page.tsx` | No static/CDN delivery, slow TTFB/LCP for crawlers | Remove `auth()` from page; redirect logged-in users in middleware. No cookies/headers in the landing render path. (§5) |
| **P0** | gsap/motion leak into the authenticated app bundle | Bloats every protected route, hurts app INP/TBT | Keep these imports inside `components/modules/landing/*` only. No gsap in `components/common/`. (§4.4) |
| **P1** | Fabricated `aggregateRating`/`review` to win the rich result | Policy violation → possible manual action | Emit honest WebApplication only; accept the "missing rating" recommendation. Never fake reviews. (§2.1) |
| **P1** | Unsized media / late-mounting animated sections | CLS regression | Explicit dimensions on all media; reserve min-heights on lazy sections; correct ScrollTrigger `pinSpacing`. (§4.2) |
| **P1** | Heavy GSAP/motion in initial bundle, no code-split | High TBT/INP, slow hydration | Dynamic-import gsap+ScrollTrigger; LazyMotion + `m` + `strict`; init below-fold via IntersectionObserver. (§4.3, §4.4) |
| **P1** | FAQ rendered/expanded by JS only | FAQPage JSON-LD mismatches DOM → ineligible/penalized | FAQ is SSR'd real text; JSON-LD mirrors it verbatim; accordion content present in DOM at SSR. (§3.5, §2.2) |
| **P2** | Animating layout properties (width/height/top/left) in scroll loops | Paint/layout thrash → INP spikes | Transform + opacity only; GPU compositing. (§4.3) |
| **P2** | `prefers-reduced-motion` ignored | a11y failure + needless main-thread work | Gate all timelines on the media query; reduced = final state, no motion. (§3.4) |
| **P2** | Raw Google Fonts `<link>` or new font outside next/font | FOUT shift (CLS) + extra origin RTT | All fonts via `next/font` (size-adjust + swap). (§4.2) |
| **P2** | Title/description over-claims live AI | Trust/honesty; potential bounce | "coming soon / early-access waitlist" framing only. (§1.3) |
| **P3** | `ssr:false` dynamic import placed in a Server Component | Build error | `ssr:false` only inside `'use client'` wrappers; text stays SSR'd outside them. (§4.4) |

---

## Sources
- [Google Search Central — Software App (SoftwareApplication) structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Motion (framer-motion) — Reduce bundle size: LazyMotion, `m`, domAnimation/domMax](https://motion.dev/docs/react-reduce-bundle-size)
- [Next.js — Lazy loading & `next/dynamic` ssr:false constraint](https://nextjs.org/docs/app/guides/lazy-loading)
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [PostHog issue #26016 — `ssr:false` not allowed in Server Components](https://github.com/PostHog/posthog/issues/26016)
- [Savvy — How hero animations were killing my LCP (opacity 0.1 / rAF / no blur)](https://savvy.co.il/en/blog/wordpress-speed/hero-animation-lcp-optimization/)
- [Strapi — Next.js SEO guide (metadata, next/image, CWV)](https://strapi.io/blog/nextjs-seo)
- [RankSight — SoftwareApplication schema guide for SaaS](https://ranksightai.com/blog/software-app-schema-guide-2025)
- [Unhead — SoftwareApplication / WebApplication schema reference](https://unhead.unjs.io/docs/schema-org/api/schema/software-app)
