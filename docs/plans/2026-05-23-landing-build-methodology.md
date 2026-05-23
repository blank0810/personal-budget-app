# Landing Build Methodology — Toolchain + AI-Agent Workflow (2026)

**Date:** 2026-05-23
**Source:** two council research passes (frontend-engineer = toolchain, lead-engineer = workflow), web-researched against 2026 sources (Anthropic harness-design, Stormy AI Claude-Code landing playbooks, Magic UI / Aceternity / React Bits / Motion Primitives docs, AI-slop pattern guides). Companion to `2026-05-23-landing-redesign-master.md`.

This captures *how* to build the landing (and any premium frontend in this repo), so the parked build resumes with a proven method rather than improvisation.

---

## 1. Toolchain decision

**Confirmed correct in the existing plan:** `motion` (Framer Motion v12) + `gsap` v3.13 + ScrollTrigger; **no Lenis** (conflicts with GSAP's RAF on pinned sections, adds latency for no benefit on a standard scroll layout); ambient loops (blob drift, CTA pulse) stay pure CSS.

**Add:** `@gsap/react` for the `useGSAP()` hook — auto-cleans via `gsap.context()` and avoids the Strict-Mode double-fire that breaks pinned sections.
→ install line becomes: `docker compose exec app npm install motion gsap @gsap/react`

### Registries — USE / SKIP

| Registry | Verdict | Use for |
|----------|---------|---------|
| **Magic UI** | ✅ Primary | shadcn-native registry (MCP-resolvable). `Marquee`, `BentoGrid`, `BorderBeam`, `NumberTicker`, device mocks. Maps to ~5 of our sections. |
| **Aceternity UI** | ✅ Supplementary, **copy-paste only** | `Spotlight`, `ContainerScrollAnimation`. ⚠️ Still ships old `framer-motion` package name → peer-dep conflict on React 19 if `npm install`ed. Copy the source instead. |
| **Motion Primitives** | ✅ Micro-interactions, **copy manually** | `InView` (reveal wrapper), `TextEffect` (typewriter), `AnimatedNumber`. Built on `motion` (no conflict). ⚠️ registry CLI bug (shadcn-ui/ui#9370) — copy from docs, don't `shadcn add`. |
| **React Bits** | ✅ CSS text effects (zero motion dep) | `ShinyText` (badge), `BlurText` (headline reveal), `GradientText`. Lightest weight, no framer-motion. |
| Animate UI / Kokonut / Cult / Origin | ❌ Skip | Duplicate coverage or wrong layer (Origin = app UI, not marketing). |
| Magic UI Pro / React Bits Pro (paid) | ❌ Skip | Our design-system spec is detailed enough; adapting their opinions costs more than building. |

### Component shortlist → sections

| Section | Component | Source |
|---------|-----------|--------|
| Hero badge shimmer | `ShinyText` | React Bits |
| Hero gradient headline | raw CSS (already specced) | — |
| Credibility strip marquee | `Marquee` | Magic UI |
| Bento active-cell border | `BorderBeam` | Magic UI |
| Bento grid primitive | `BentoGrid` | Magic UI |
| AI chat typewriter | `TextEffect` | Motion Primitives (copy) |
| Scroll-reveal wrapper | `InView` | Motion Primitives (copy) |
| Stat counters | `NumberTicker` | Magic UI |
| Section headline blur-in | `BlurText` | React Bits |
| Scroll-pinned dashboard | **custom GSAP** (master §4.7) | — (no registry hits this precision; our signature element) |

---

## 1b. Rich media, video & 3rd-party creative tools (researched separately)

How award-winning pages actually do motion/video, weighed against our **hard CWV requirement**. Reference points: Linear (short looping product WebM, sub-1s LCP), Stripe (~10 KB custom miniGL shader gradient, *no* video), Arc (cinematic hero video done right — poster is the LCP, preloaded `fetchpriority=high`), Mercury (no video/3D at all — screenshot + IO reveals, fastest fintech), Webflow (GSAP pin+scrub reveal = our §8 template).

**ADOPT (perf-safe):** CSS gradient-mesh blobs (blurred divs + `@keyframes` drift — what Vercel/Raycast/Linear actually use, 0 JS); GSAP pin+scrub for §8; Magic UI `Marquee`; Motion Primitives `InView`/`TextEffect`; **CSS `animation-timeline: scroll()`** for simple below-fold reveals (0 JS, ~82% browser support — the one genuine gap in the prior plan; use `InView` only when you need reversal/JS-timed coordination); clip-path stagger reveal on the bento.

**MAYBE (only if justified, deferred + lazy):** **Unicorn Studio** — perf-safe WebGL gradient (~36 KB, `lazyLoad` + `scale={0.25}` + `production`); the one tool worth a future look *if the CSS mesh reads flat in browser testing*. **Rive** (78 KB WASM, tiny `.riv`) for 1–2 below-fold feature illustrations, never hero without preload. **dotLottie** below-fold only, only with a real AE source. **Background/demo video** only post-dashboard-redesign, via Cloudflare Stream + poster/`preload="metadata"` pattern — never self-host >3 MB, never in the hero.

**SKIP (kills CWV or reads as template slop):** Spline (overused "AI-startup 2023" tell, 150 KB+, watermark); React Three Fiber/Three.js (~175 KB — unjustified for marketing); Apple-style frame-sequence scroll video (no source frames, high-maintenance); custom cursor follower + parallax + particle fields (INP cost, dated/slop tells); **Framer as builder/embed** (breaks SSR, JSON-LD, scroll coordination — fails our SEO requirement); scroll-jacking/full-page snap (INP + a11y).

**Net effect on the plan:** no fundamental change — the `motion`+`gsap` toolchain and the Lenis/Spline/parallax exclusions are confirmed correct. Two additions only: (1) use native CSS `animation-timeline: scroll()` for simple reveals; (2) keep Unicorn Studio + Cloudflare-Stream-video on the "maybe later" shelf, not the build.

---

## 2. The build workflow (Planner → Generator → Evaluator, mapped to the council)

Anthropic's harness research: separate who *plans*, who *builds*, who *evaluates* — agents overpraise their own work. Our plan had no design-first image step, no browser in the loop, and no separate visual evaluator. Fixed below.

**Phase 0 — Design contract (done).** Master + design-system + positioning + SEO docs are the contract. Add root **`DESIGN.md`** (tokens/type/elevation) + **`PRODUCT.md`** (honesty rules, anti-references) so the `impeccable` skill stops running context-blind.

**Phase 1 — Design-first reference images** (budget-frontend + `imagegen-frontend-web` / `image-to-code` skills). One reference image **per section** (12 sections = 12 images), seeded with our palette + Geist + the Vercel×Raycast×Linear×Mercury aesthetic so it doesn't drift to Inter/purple. Each image → extractable spec → match target + diff target. **Skip the 2 dashboard-mockup sections** (hero mockup §3, preview §8) — those mirror the *real* dashboard, which is mid-redesign.

**Phase 2 — Build, simple→complex, browser open** (budget-frontend). Per section loop: **pull (shadcn MCP) → build → screenshot (Playwright MCP @ localhost:3000) → self-critique vs reference image → refine → next.** Motion via `design-motion-principles` skill (purposeful, not decorative). Enforce: route-isolate `motion`/`gsap` to `components/modules/landing/*`; hero h1 stays SSR `opacity:1`.

**Phase 1-parallel — SEO + static render** (budget-seo ∥ budget-backend). Disjoint files → safe to parallelize. budget-seo: metadata, JSON-LD, FAQ content. budget-backend: the one `middleware.ts` redirect move. The FAQ-DOM ↔ FAQPage-JSON-LD check runs *after* the FAQ section ships (sequential), not concurrently.

**Phase 2 — Copy/honesty sign-off** (founder). The master §2 honesty pass.

**Phase 3 — Evaluator-with-eyes** (qa-engineer, *separate* agent, Playwright MCP): visual design-critique vs reference images at mobile/tablet/desktop; functional/CWV (`npx tsc --noEmit`, reduced-motion, CLS/LCP not JS-gated); honesty audit (no fabricated metrics, AI future-tense); JSON-LD validates + matches DOM.

**Phase 4 — Merge** (lead-engineer). Multi-commit feature branch → `--merge` (per merge-strategy preference). No `money-feature-review` (no money logic touched) — reconfirm at review.

**Parallelism rule:** parallelize only disjoint-file agents (frontend / seo / backend). Build is sequential-with-visual-loop; review is a separate downstream agent. Never two agents editing `components/modules/landing/*` at once.

---

## 3. Tooling to add

1. **Playwright MCP** — the one real gap (`.mcp.json` has shadcn + github, no browser). Without it, build/eval agents code blind.
   ```jsonc
   // .mcp.json (project scope; pin the version — avoid @latest tool churn)
   "playwright": { "command": "npx", "args": ["@playwright/mcp@0.0.41", "--headless"] }
   ```
   Then install the browser where the MCP runs: `npx playwright install chromium` (+ `install-deps` on Linux). Dev server must be up on :3000 first. **Prompt agents to explicitly "use Playwright MCP"** or they default to Bash and never open the browser. (Benefits the in-flight dashboard work too, not just the landing.)
2. **`DESIGN.md` + `PRODUCT.md`** at root — unlock the `impeccable` skill. Cheapest quality win; also helps the dashboard redesign.
3. **No orchestration framework.** The council + Task delegation is sufficient at solo-dev scale.

---

## 4. Anti-slop checklist

**Do:** feed the full design-system spec as context before generating any component; `useGSAP()` for pinned sections; `LazyMotion`+`domAnimation` strict (never import `motion` directly in landing); dynamic-import GSAP in `useEffect` only; single `useReducedMotion()` gate on all variants; `Geist Mono` for every financial number; explicit dimensions before JS (CLS); `viewport={{ once: true }}` on all reveals.

**Don't:** animate hero h1/subhead from `opacity:0` (top LCP killer); `npm install` Aceternity (copy-paste); flatten the bento to 4 equal columns (keep the 7+5 asymmetry — it's what reads as *designed*); use the `border-l-4` left accent on all 3 problem cards (recognized AI tell → use a faint top-gradient wash or vary treatment); let the Motion-Primitives CLI bug block you (copy 2–3 components); add Lenis; **use purple/violet** (signals "AI template" — protect the emerald accent); let the AI chat input look functional (inert + `Coming soon` label, per plan).

---

## 5. Design-spec refinements (apply at build, fold into design-system doc)

- **Hero H1:** nudge ~10% left of dead-center on desktop (dead-center + badge-above-H1 is a generic tell); keep the badge pill small/understated (status indicator, not banner).
- **Bento:** protect the 7-col + 5-col asymmetry under build pressure.
- **Problem cards:** drop `border-l-4 border-l-accent/30` on all three → faint top-gradient wash or varied treatment.
- **Section H2s:** stay mixed-case (only the small eyebrow labels are uppercase).
- **Aceternity components:** copy source; if a peer warning appears, alias `framer-motion`→`motion` rather than installing both.

---

## Sources
Anthropic harness-design; Stormy AI 2026 Claude-Code landing playbooks; Karthik Mulugu (shadcn+Magic UI+Playwright MCP); Builder.io Playwright-MCP guide; Developers Digest "AI Design Slop: 15 patterns"; PkgPulse react-bits vs Aceternity vs Magic UI; GSAP vs Motion 2026 (Satish Kumar); SaaSFrame 2026 SaaS landing trends; shadcn-ui/ui#9370 (Motion Primitives CLI bug); Addy Osmani "Code Agent Orchestra".
