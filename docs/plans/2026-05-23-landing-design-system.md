# Landing Page Ground-Up Redesign — Design System & Motion Spec
**Date:** 2026-05-23  
**Scope:** `app/(public)/page.tsx` + all `components/modules/landing/` components  
**Theme:** Light — landing is its own visual world, independent of next-themes dark/light  
**Motion libraries adding:** `motion` (Framer Motion v11) + `gsap` (with ScrollTrigger)

---

## Reference Patterns (Extracted)

| Source | Pattern Borrowed |
|--------|-----------------|
| **Vercel** | Centered hero with bold gradient headline, dual CTA (primary pill + ghost arrow link), monochrome surface depth (white → gray-50 → gray-100), sticky frosted navbar |
| **Raycast** | Glass-effect card surfaces with `backdrop-filter: blur()`, layered depth via overlapping elements, bento grid for feature tiles, hero product visualization as centerpiece |
| **Linear** | Numbered modular sections with section eyebrows (`text-xs uppercase tracking-widest`), screenshot-forward product demo sections, minimal accent color used sparingly |
| **Mercury** | Fintech trust signals bar (users, security), social proof with named attribution, centered email-capture CTA, quantified credibility stats |
| **Framer** | Conic/radial gradient mesh background, animated hero shader glow, scroll-linked product reveal |

---

## 1. Color System

### Philosophy
Pure white base, cloud-white surfaces, ink-black type. One emerald accent (inheriting from app brand). Gradient meshes use desaturated violet + sky + emerald stops — soft, not garish.

### Base Palette (landing-scope only)

```css
/* app/(public)/landing.css — @layer base overrides scoped to .landing */
.landing {
  /* Backgrounds */
  --l-bg:          oklch(1 0 0);               /* #ffffff — page canvas */
  --l-surface-1:   oklch(0.985 0.002 264);     /* #f8f9fc — card background */
  --l-surface-2:   oklch(0.970 0.004 264);     /* #f2f4f8 — elevated card / table row */
  --l-surface-3:   oklch(0.940 0.006 264);     /* #e8ebf2 — active/pressed state */

  /* Borders */
  --l-border:      oklch(0.910 0.006 264);     /* #dde1ea — default border */
  --l-border-mid:  oklch(0.870 0.010 264);     /* #cdd3de — stronger border */

  /* Type scale */
  --l-text-1:      oklch(0.130 0.010 264);     /* #0d0f14 — headlines / hero */
  --l-text-2:      oklch(0.350 0.012 264);     /* #3d4252 — body / secondary */
  --l-text-3:      oklch(0.540 0.012 264);     /* #66708a — captions / eyebrows */
  --l-text-4:      oklch(0.680 0.010 264);     /* #939cb5 — disabled / placeholder */

  /* Primary accent — emerald (matches app brand) */
  --l-accent:      oklch(0.620 0.165 155);     /* #1a9f5a — buttons, links, icons */
  --l-accent-dim:  oklch(0.620 0.165 155 / 12%); /* tinted surface */
  --l-accent-ring: oklch(0.620 0.165 155 / 30%); /* focus ring */

  /* Gradient mesh stops */
  --l-mesh-violet: oklch(0.750 0.100 290);     /* #a78bfa-ish muted violet */
  --l-mesh-sky:    oklch(0.760 0.090 220);     /* #7dd3fc-ish muted sky */
  --l-mesh-emerald:oklch(0.820 0.090 155);     /* #6ee7b7-ish muted emerald */
  --l-mesh-amber:  oklch(0.870 0.090 80);      /* #fde68a-ish warm glow */

  /* Glow colors (used as radial bg on absolute blobs) */
  --l-glow-violet: oklch(0.750 0.100 290 / 18%);
  --l-glow-sky:    oklch(0.760 0.090 220 / 14%);
  --l-glow-emerald:oklch(0.820 0.090 155 / 12%);
}
```

### Tailwind v4 @theme Tokens (add to `landing.css`)

```css
@theme {
  /* Surfaced as Tailwind utilities: bg-l-surface-1, text-l-text-2, border-l-border, etc. */
  --color-l-bg:           oklch(1 0 0);
  --color-l-surface-1:    oklch(0.985 0.002 264);
  --color-l-surface-2:    oklch(0.970 0.004 264);
  --color-l-surface-3:    oklch(0.940 0.006 264);
  --color-l-border:       oklch(0.910 0.006 264);
  --color-l-border-mid:   oklch(0.870 0.010 264);
  --color-l-text-1:       oklch(0.130 0.010 264);
  --color-l-text-2:       oklch(0.350 0.012 264);
  --color-l-text-3:       oklch(0.540 0.012 264);
  --color-l-text-4:       oklch(0.680 0.010 264);
  --color-l-accent:       oklch(0.620 0.165 155);
  --color-l-accent-dim:   oklch(0.620 0.165 155 / 12%);
  --color-l-mesh-violet:  oklch(0.750 0.100 290);
  --color-l-mesh-sky:     oklch(0.760 0.090 220);
  --color-l-mesh-emerald: oklch(0.820 0.090 155);
}
```

### Gradient Mesh Recipe

The hero and CTA sections use a layered radial mesh. Three absolute blobs, heavy blur, stacked:

```css
/* Blob 1 — top-left violet */
position: absolute; top: -10%; left: -5%;
width: 640px; height: 640px;
background: radial-gradient(circle at center, var(--l-glow-violet), transparent 70%);
filter: blur(80px);

/* Blob 2 — top-right sky */
position: absolute; top: 0; right: -8%;
width: 500px; height: 500px;
background: radial-gradient(circle at center, var(--l-glow-sky), transparent 70%);
filter: blur(100px);

/* Blob 3 — bottom-center emerald (hero only) */
position: absolute; bottom: -5%; left: 50%; transform: translateX(-50%);
width: 800px; height: 300px;
background: radial-gradient(ellipse at center, var(--l-glow-emerald), transparent 70%);
filter: blur(60px);
```

All blobs: `pointer-events: none; z-index: 0;`

### Grid Background (replaces dark dots)

```css
.l-grid-bg {
  background-image:
    linear-gradient(var(--l-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--l-border) 1px, transparent 1px);
  background-size: 64px 64px;
  background-position: center top;
  /* Grid fades out before the fold */
  -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 40%);
  mask-image: linear-gradient(to bottom, black 0%, transparent 40%);
}
```

### Surface / Glassmorphism Recipe (cards, navbar)

```css
/* Glass card — used on bento tiles, dashboard preview frame */
background: oklch(1 0 0 / 70%);
backdrop-filter: blur(20px) saturate(180%);
border: 1px solid var(--l-border);
box-shadow:
  0 1px 3px oklch(0.130 0.010 264 / 4%),
  0 4px 16px oklch(0.130 0.010 264 / 6%),
  inset 0 1px 0 oklch(1 0 0 / 80%);

/* Elevated glass — hero mockup chrome, navbar */
background: oklch(1 0 0 / 85%);
backdrop-filter: blur(24px) saturate(200%);
```

---

## 2. Typography

### Font Stack

| Role | Font | Source | Rationale |
|------|------|---------|-----------|
| **Display / Hero** | `Geist` (already installed via `next/font/local`) | App already has it | Same as Vercel — crisp, modern, no licensing overhead |
| **Body / UI** | `Geist` (same) | — | Unified stack, no FOUT from second font |
| **Numeric / Stat callouts** | `Geist Mono` (already installed) | — | Tabular figures for financial numbers look intentional |
| **Optional display accent** | `Cal Sans` — `next/font/google` | Google Fonts (1 weight, 24kB) | Raycast / Linear use a slightly rounder display face for big hero headlines. Cal Sans is free, widely used in the indie SaaS space, adds warmth to what would otherwise be pure machine Geist. Use ONLY on the hero h1 if we add it. |

**Decision:** Start with Geist only — it's premium enough and already loaded. Add Cal Sans only if the hero headline needs warmth. Do not add a third font.

### Type Scale

```
Display XL  — 72px / 76px lh / -0.04em tracking / weight 700   (hero h1, desktop)
Display LG  — 56px / 60px lh / -0.03em tracking / weight 700   (hero h1, mobile; section h2 desktop)
Heading 1   — 42px / 48px lh / -0.02em tracking / weight 650   (major section h2)
Heading 2   — 30px / 36px lh / -0.015em tracking / weight 600  (section subheading)
Heading 3   — 20px / 28px lh / -0.010em tracking / weight 600  (card titles, FAQ items)
Body LG     — 18px / 28px lh / -0.005em tracking / weight 400  (hero paragraph, intro)
Body MD     — 16px / 24px lh / 0em tracking / weight 400       (card body copy)
Body SM     — 14px / 20px lh / 0em tracking / weight 400       (captions, meta)
Label       — 11px / 16px lh / +0.08em tracking / weight 500   (section eyebrows, UPPERCASE)
Mono SM     — 13px / 20px lh / 0em tracking / weight 400       (stats, number readouts)
```

**Implementation:** Use Tailwind utility classes. Map to:
- `text-[72px]` → `tracking-[-0.04em]` → `font-bold`
- Avoid arbitrary pixel values in JSX — define as `@theme` custom text sizes if used > 3 times.

### Gradient Text (hero headline)

```css
background: linear-gradient(
  135deg,
  var(--l-text-1) 0%,        /* near-black */
  oklch(0.350 0.012 264) 60%, /* dark slate */
  var(--l-accent) 100%        /* emerald tail */
);
-webkit-background-clip: text;
background-clip: text;
color: transparent;
```

---

## 3. Spacing & Layout System

### Container

```
Max-width:  1184px  (max-w-[1184px]) — slightly wider than current 1152px (max-w-6xl)
Padding:    0 24px  (px-6) on mobile
            0 40px  (px-10) on md+
            0 48px  (px-12) on xl+
```

### Section Rhythm

```
Section py:     96px top, 96px bottom  (py-24)
First section:  120px top (pt-[120px]) — clears sticky navbar
Hero bottom:    80px (pb-20) — tighter, visual flows into social-proof
Between sections: No extra gap — sections define their own py
```

### Bento Grid (Features section)

A 6-cell bento on 12-column grid:

```
Desktop (lg):
  Cell 1 — col-span-7  row-span-2  (Smart Dashboard — large visual left)
  Cell 2 — col-span-5  row-span-1  (Envelope Budgets)
  Cell 3 — col-span-5  row-span-1  (Savings Goals)
  Cell 4 — col-span-4  row-span-1  (Recurring)
  Cell 5 — col-span-4  row-span-1  (Reports)
  Cell 6 — col-span-4  row-span-1  (CSV Import)

Mobile: single column, natural stacking order
```

Gap between bento cells: `gap-3` (12px)

---

## 4. Section-by-Section Visual Concept

### 4.0 Navbar

**Layout:** Sticky top, full-width, `backdrop-blur-xl`, `bg-l-bg/80`. Logo left (Wallet icon + "Budget Planner"). Nav links center (Features, How it Works, Changelog). CTAs right (Login ghost, "Start free" emerald pill).

**Visual:** The navbar is glassy — glass surface recipe above. At scroll=0 it has no visible border. After 40px scroll, a 1px `border-b border-l-border` fades in and the blur intensifies. Thin shadow appears.

**Motion:**
- Framer Motion: `useScroll()` + `useMotionValueEvent` to toggle a `scrolled` state. When `scrolled=true`, `motion.header` animates `borderOpacity: 0 → 1` and `boxShadow` with `transition: { duration: 0.2 }`.
- No entrance animation — navbar is above the LCP element and must paint immediately (SSR).

---

### 4.1 Hero

**Layout:** Centered, full-bleed background. Gradient mesh blobs behind. Grid-dot overlay. Content stack: badge pill → h1 → sub → dual CTA → stat strip → browser-frame mockup.

**Visual elements:**
1. **Badge pill** — `"Now with AI Advisor →"` — small rounded pill, `bg-l-accent-dim border border-l-accent/20 text-l-accent`, 11px uppercase label inside. Glints on mount.
2. **H1** — Two-line max. Line 1: `"Your finances,"` (dark). Line 2: `"finally make sense."` (gradient text with emerald tail). 72px desktop.
3. **Subheading** — 18px `text-l-text-2`, max-w-lg centered.
4. **CTAs** — Primary: emerald pill `bg-l-accent text-white px-8 py-3.5 rounded-full font-medium`. Secondary: ghost with `ArrowRight` icon, `text-l-text-2`.
5. **Stat strip** — `"500+ users · Free forever · No credit card"` — small dividers, `text-l-text-4`.
6. **Browser mockup** — Glass-surface chrome frame (light gray bar with 3 light dots + URL bar). Inner dashboard (see §5 for the animated centerpiece). Slight 3D tilt: `perspective: 1200px; rotateX(3deg)`. Frame has a subtle ring glow at the bottom (`box-shadow: 0 32px 80px var(--l-glow-emerald)`).

**LCP protection:** The h1 and sub are server-rendered, `opacity: 1` at SSR. They are NOT faded in on mount. Framer Motion `initial={{ opacity: 1 }}` — no invisible-then-visible flash. Only the badge pill, stat strip, and mockup animate in (they are below or beside the headline, so they are not the LCP candidate).

**Motion (Framer Motion — not GSAP, no scroll required):**
- Badge pill: `initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}`
- CTA row: `initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}`
- Stat strip: `transition={{ delay: 0.35, duration: 0.4 }}`
- Browser mockup: `initial={{ opacity: 0, y: 32, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}` (spring-ish cubic)
- Gradient mesh blobs: CSS `@keyframes l-blob-drift` — slow 12s infinite alternating position, no JS needed.

---

### 4.2 Social Proof Strip

**Layout:** Full-width band, `bg-l-surface-1 border-y border-l-border`. Single row of logos (or stat pills if no real logos yet). Infinite horizontal scroll marquee.

**Visual:** Three stat pills (glass-surface, `rounded-full px-5 py-2`):
- `"500+ users tracking their finances"`
- `"₱2B+ in transactions logged"`  
- `"Free forever — no upsell"`

Plus 3-4 press/trust icons if available (shield icon = "Encrypted", lock icon = "No data selling").

**Motion (GSAP — marquee):**
```js
// Lazy-loaded below fold, triggered once on mount
gsap.to(".l-marquee-track", {
  xPercent: -50,
  duration: 20,
  ease: "none",
  repeat: -1,
});
```
The track contains 2× duplicated content so the loop is seamless. `@media (prefers-reduced-motion: reduce)` disables the scroll, showing static centered content instead.

---

### 4.3 Problem Statement

**Layout:** `max-w-[1184px]` container, centered eyebrow + h2, then 3-column grid of "pain point" cards.

**Visual:** Each card has a top `border-l-4 border-l-accent/30` left accent stroke, `bg-l-surface-1` fill, `rounded-xl`. Icon is `text-l-text-4` (muted), title is `text-l-text-1 font-semibold`, body is `text-l-text-2`.

**Motion (GSAP ScrollTrigger):**
```js
gsap.from(".problem-card", {
  scrollTrigger: {
    trigger: ".problem-section",
    start: "top 80%",
  },
  y: 40,
  opacity: 0,
  duration: 0.6,
  stagger: 0.12,
  ease: "power2.out",
});
```

---

### 4.4 Features Bento

**Layout:** 12-column bento (see §3). The large left cell (Dashboard) spans 2 rows and hosts a live animated mini-dashboard (recharts bar chart that animates its bars on scroll entry). Smaller cells have icon + title + 2-line description + a subtle illustrated mini-visual.

**Visual per cell:**
- `bg-l-bg border border-l-border rounded-2xl p-6` base
- On hover: `bg-l-surface-1` + `border-l-border-mid` + `box-shadow: 0 8px 32px oklch(0.130 0.010 264 / 8%)`
- Icon: `bg-l-accent-dim rounded-xl p-2.5` with `text-l-accent` Lucide icon
- Large cell gets a `bg-gradient-to-br from-l-surface-1 to-l-accent-dim/30` gradient fill to visually anchor it

**Motion:**
- Framer Motion `whileHover={{ y: -3, transition: { duration: 0.2 } }}` on each tile
- GSAP ScrollTrigger cascade entrance: stagger 0.08s, `y: 32 → 0`, `opacity: 0 → 1`
- The recharts `<BarChart>` in the large cell uses its built-in `isAnimationActive` triggered when the section enters viewport (Intersection Observer, not GSAP — keeps it simple)

---

### 4.5 AI Advisor Spotlight

**Layout:** Full-width section, `bg-l-surface-1 border-y border-l-border`. Two-column split: left = copy (eyebrow, h2, body, CTA link), right = the signature animated chat window (see §5).

**Visual:** Section gets a subtle `background: radial-gradient(ellipse 60% 80% at 80% 50%, var(--l-glow-emerald), transparent)` on the right side only.

**Motion:**
- The left column uses Framer Motion `whileInView={{ opacity: 1, x: 0 }}` from `{ opacity: 0, x: -24 }`
- The chat window uses Framer Motion `whileInView` + staggered message appearance (see §5)
- `viewport={{ once: true, amount: 0.4 }}`

---

### 4.6 How It Works

**Layout:** Centered eyebrow + h2, then 3 steps in a horizontal timeline on desktop. Steps connected by a dashed line (`border-t-2 border-dashed border-l-border`).

**Visual:** Steps use large serif-like numerals (`01`, `02`, `03`) in `text-l-surface-3` (very faint, purely decorative at 120px). On top of that: icon badge + title + body. The step number is positioned as an absolute giant behind the card content.

**Motion (GSAP ScrollTrigger, scroll-linked):**
```js
// The dashed connector line draws itself as user scrolls
gsap.fromTo(".how-connector", 
  { scaleX: 0, transformOrigin: "left center" },
  {
    scaleX: 1,
    scrollTrigger: {
      trigger: ".how-section",
      start: "top 60%",
      end: "bottom 60%",
      scrub: 1,
    }
  }
);
// Steps pop in sequentially
gsap.from(".how-step", {
  scrollTrigger: { trigger: ".how-section", start: "top 65%" },
  y: 32, opacity: 0,
  stagger: 0.18,
  duration: 0.55,
  ease: "power2.out",
});
```

---

### 4.7 Dashboard Preview (Scroll-Pinned Product Reveal)

**Layout:** This is the signature scroll-pinned section — see §5 for the full spec. Outer section is `min-h-[200vh]` to create scroll runway.

**Visual:** A large browser-chrome window (glass surface, same as hero mockup) containing the real dashboard UI as a static screenshot / detailed JSX mockup. The section pins itself while the user scrolls through 3 "slides" of dashboard content, each highlighting a different feature (Health Score → Budget → Goals).

**Motion (GSAP ScrollTrigger — pinned):**
```js
ScrollTrigger.create({
  trigger: ".dash-preview-outer",
  start: "top top",
  end: "+=150%",
  pin: ".dash-preview-inner",
  pinSpacing: true,
});
// As user scrolls through the 150% runway, crossfade between panels
gsap.timeline({
  scrollTrigger: {
    trigger: ".dash-preview-outer",
    start: "top top",
    end: "+=150%",
    scrub: true,
  }
})
.fromTo(".panel-health", { opacity: 1 }, { opacity: 0 }, 0.33)
.fromTo(".panel-budget", { opacity: 0 }, { opacity: 1 }, 0.33)
.fromTo(".panel-budget", { opacity: 1 }, { opacity: 0 }, 0.66)
.fromTo(".panel-goals", { opacity: 0 }, { opacity: 1 }, 0.66);
```

Side annotation labels slide in from right as each panel becomes active.

---

### 4.8 Trust & Security

**Layout:** Centered, clean, no extra decoration. 3 columns: Encrypted data, No ads / no data selling, Free forever. Below: a `border-t border-l-border` separator then a single trust statement row with Shield/Lock/Heart Lucide icons.

**Visual:** Each pillar uses `text-l-accent` icon (24px), `text-l-text-1` title (Heading 3), `text-l-text-2` body. Very sparse — let the whitespace speak. No background tint, no card borders.

**Motion:** Simple Framer Motion `whileInView staggerChildren` on the 3-column grid. `y: 20 → 0`, `opacity: 0 → 1`, `stagger: 0.1`. `once: true`.

---

### 4.9 FAQ

**Layout:** Two-column on desktop — left: eyebrow + h2 + CTA link ("Still have questions? Contact us"), right: accordion list (shadcn `<Accordion>` component — already available). 5-6 questions.

**Visual:** Accordion items use `border-b border-l-border`, `bg-transparent`, chevron rotates on open. No card wrappers. Question text: `text-l-text-1 font-medium`. Answer text: `text-l-text-2`.

**Motion:** shadcn Accordion has built-in CSS transition via `tw-animate-css` (already in stack). Add Framer Motion `whileInView` entrance on the entire FAQ block. Accordion open/close is handled by Radix (`data-[state=open]` transitions already wired). No additional animation needed here — keep it simple.

---

### 4.10 Final CTA

**Layout:** Full-bleed section with gradient mesh behind (same blob recipe as hero, tighter). Centered: eyebrow + h2 (large) + subline + primary CTA button + free-tier reassurance text.

**Visual:** `bg-gradient-to-b from-l-bg to-l-surface-1` base. Glow blobs overlaid. Primary button gets a pulse ring animation on idle:

```css
@keyframes l-cta-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--l-accent-ring); }
  50%       { box-shadow: 0 0 0 10px transparent; }
}
.l-cta-btn { animation: l-cta-pulse 2.5s ease-in-out infinite; }
```

**Motion:** Framer Motion `whileInView`, `initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}`, `transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}`. `viewport={{ once: true }}`.

---

### 4.11 Footer

**Layout:** `bg-l-surface-1 border-t border-l-border`. 4-column grid: Brand (logo + tagline + social icons row), Product links, Support links, Legal. Bottom bar: copyright + "Built with coffee in the Philippines" (keep this — it's personal and memorable).

**Visual:** Type is `text-l-text-3` for nav items, `text-l-text-4` for small print. Links get `hover:text-l-text-1 transition-colors duration-150`. Minimal — no gradients.

**Motion:** None. Footer is below scroll engagement. Respect the user's time.

---

## 5. Signature Animated Set-Pieces

### Set-Piece A: AI Advisor Chat Window (AI Advisor Spotlight section)

The right panel of the AI Advisor section is an animated fake-chat UI that loops through a conversation, making the product feel alive without requiring a real API call.

**Visual structure:**
```
┌─────────────────────────────────┐
│ AI Advisor          ● Online    │  ← header bar, glass surface
├─────────────────────────────────┤
│ [AI bubble] Hey Ehnand! Based   │
│ on this month, you've spent     │
│ 88% of your Entertainment       │
│ budget with 9 days left. 🎯     │
│                                 │
│ [User bubble] What should I     │
│ cut back on?                    │
│                                 │
│ [AI bubble] Top 3 suggestions:  │  ← types character by character
│ 1. Skip 2 streaming services    │
│ 2. Cook at home Fri-Sun         │
│ 3. ...                          │
│ ┌──────────────────────────┐    │
│ │ Ask anything...      ➤  │    │  ← input mock
│ └──────────────────────────┘    │
└─────────────────────────────────┘
```

**Implementation (Framer Motion):**
- A `useEffect` loop runs through a `CHAT_SCRIPT` array of message objects `{ role, text, delay }`
- Each message `<motion.div>` uses `initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}` with a `delay` matching the script timing
- The AI's second message uses a **typewriter effect** — a `useRef` interval that appends characters to state at 28ms per char. Starts only when the bubble becomes visible (`whileInView` triggers the typing sequence).
- A "thinking" indicator (`...` animated dots via CSS `@keyframes`) shows for 1.2s before the AI response appears
- After the full script plays (≈12s), the hook resets and replays with a 3s pause
- `prefers-reduced-motion`: skip typing animation, show all messages immediately at full opacity

**What makes it premium:** The chat feels real but controlled. The numbers in the AI message (88%, 9 days) match the mock data shown in the bento dashboard widget — the whole page tells one coherent story about Ehnand's finances.

---

### Set-Piece B: Scroll-Pinned Dashboard Reveal (Dashboard Preview section)

A 200vh pinned section where the browser mockup stays fixed and dashboard "tabs" crossfade as the user scrolls. Three states:

**State 1 (scroll 0–33%):** Health Score panel active. Left side annotation: `"Financial health at a glance"` with a pulsing ring around the score gauge SVG.

**State 2 (scroll 33–66%):** Budget Tracking panel fades in. Left annotation: `"Envelope budgets that actually hold"`. Budget bars animate their fill (CSS transition triggered when this panel becomes active).

**State 3 (scroll 66–100%):** Savings Goals panel. Left annotation: `"Watch your goals grow"`. Goal cards slide up 8px.

**Visual:** The browser chrome is exactly the same glass-surface component reused from the hero. The inner panels are detailed JSX mock dashboards (not screenshots — so they look crisp on all screen densities). A tab indicator row at the top of the inner frame shows which panel is active (3 dots, active one filled emerald).

**Implementation:**
- GSAP ScrollTrigger with `scrub: true` (see §4.7 for code)
- The annotation column is `position: absolute; left: -200px; width: 180px` on desktop, hidden on mobile
- Mobile fallback: static tabbed interface with click navigation (no pinning), uses Framer Motion `AnimatePresence` for crossfade between panels

---

## 6. Reduced-Motion + Performance Guardrails

### Reduced Motion (`prefers-reduced-motion: reduce`)

```js
// Single hook — use everywhere in Framer Motion components
import { useReducedMotion } from 'motion/react';

const prefersReduced = useReducedMotion();
// Pass to variants:
const variants = prefersReduced
  ? { hidden: {}, visible: {} }   // no transform, instant
  : { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
```

**What gets disabled at reduced motion:**
- All GSAP `from`/`fromTo` position animations → elements appear at final state
- GSAP marquee (Social Proof) → static centered layout
- Chat typewriter → all messages appear at once, no typing
- Scroll-pinned Dashboard Reveal → static tab layout (mobile fallback behavior)
- Blob drift animations → `animation: none`
- Framer Motion `whileHover={{ y: -3 }}` on bento tiles → removed
- CTA button pulse → removed

**What STAYS at reduced motion:**
- Navbar scroll shadow (functional, not decorative)
- Accordion open/close (functional)
- Tab switches in mobile dashboard fallback (instant opacity swap)
- Page-load badge pill entrance — reduce to just `opacity: 0 → 1` (no transform)

### Core Web Vitals

**LCP protection:**
- Hero h1, subheading, and CTA are plain server-rendered HTML with no `opacity: 0` initial state. Framer Motion is never applied to them.
- The browser mockup (the largest below-fold image) uses `loading="lazy"` if it becomes a real `<img>` element. As JSX, it renders server-side so it's in the HTML but below fold — no impact on LCP.
- No `@font-face` flash: Geist is already `next/font/local` — preloaded and no swap.

**CLS prevention:**
- All animated elements must have explicit dimensions before animation (no `height: auto` animating to a fixed size on mount).
- Bento grid uses `grid-template-rows` with fixed row heights on desktop so layout is pre-calculated.
- The chat window has a fixed `min-height: 420px` so typing animation doesn't shift surrounding content.
- Scroll-pinned section has `min-height: 200vh` declared in static CSS, not added by JS.

**GSAP lazy loading (below fold only):**
```js
// In the component file for HowItWorks, DashboardPreview, Features:
'use client';
import { useEffect } from 'react';

useEffect(() => {
  let ctx: gsap.Context;
  // Dynamic import so GSAP is NOT in the initial JS bundle
  import('gsap').then(({ gsap }) =>
    import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => {
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        // ... animations
      }, containerRef);
    })
  );
  return () => ctx?.revert();
}, []);
```

**Framer Motion:** Use `LazyMotion` + `domAnimation` features only (not `domMax`) to reduce bundle:
```jsx
// In LandingLayout or page.tsx wrapper
import { LazyMotion, domAnimation } from 'motion/react';
<LazyMotion features={domAnimation} strict>
  {children}
</LazyMotion>
```

**Bundle target:** Landing JS (beyond Next.js base) should stay under 80kB gzipped. GSAP core + ScrollTrigger ≈ 28kB gzip. Framer Motion domAnimation ≈ 18kB gzip. Chat component ≈ 4kB. Total additional ≈ 50kB — within budget.

---

## 7. Component Inventory

All new components live in `components/modules/landing/`. Existing component files are deleted and replaced entirely (ground-up redesign). Shared sub-components within the landing scope live in `components/modules/landing/ui/`.

### Page-Level Components (drop-in sections for `page.tsx`)

| Component | File | Responsibility |
|-----------|------|----------------|
| `LandingNavbar` | `Navbar.tsx` | Sticky glass navbar, scroll-shadow behavior via Framer Motion useScroll, Logo + nav links + CTAs |
| `LandingHero` | `Hero.tsx` | Full hero: mesh blobs, badge pill, h1+sub, dual CTA, stat strip, browser mockup frame, mockup content |
| `SocialProofStrip` | `SocialProofStrip.tsx` | Full-width band with GSAP marquee of stat pills and trust icons |
| `ProblemStatement` | `ProblemStatement.tsx` | Eyebrow + h2 + 3-column pain-point cards with GSAP stagger entrance |
| `FeaturesBento` | `FeaturesBento.tsx` | 12-col bento grid, 6 cells, large dashboard cell with animated recharts, Framer hover states |
| `AIAdvisorSpotlight` | `AIAdvisorSpotlight.tsx` | 2-col split: left copy, right animated chat window (see §5A) |
| `HowItWorks` | `HowItWorks.tsx` | 3-step numbered timeline, GSAP scroll-drawn connector line |
| `DashboardPreview` | `DashboardPreview.tsx` | 200vh scroll-pinned reveal section (§5B), 3 crossfading panels, GSAP scrub |
| `TrustSecurity` | `TrustSecurity.tsx` | 3-pillar trust section (encryption, no ads, free), Framer stagger |
| `FAQ` | `FAQ.tsx` | 2-col layout with shadcn Accordion on right, Framer whileInView entrance |
| `FinalCTA` | `CTA.tsx` | Full-bleed CTA with mesh, pulsing button, Framer scale entrance |
| `LandingFooter` | `Footer.tsx` | 4-col footer, brand + links + legal, no animation |

### Sub-Components / UI Primitives (landing-scope)

| Component | File | Responsibility |
|-----------|------|----------------|
| `GradientMeshBg` | `ui/GradientMeshBg.tsx` | Renders the 3-blob mesh + grid overlay as an `aria-hidden` absolute container. Accepts `variant: 'hero' | 'cta'` prop to adjust blob positions. Pure SSR, no motion. |
| `BrowserMockup` | `ui/BrowserMockup.tsx` | Glass browser chrome frame (dots + URL bar). Accepts `children` for inner content. Used in Hero and DashboardPreview. |
| `SectionEyebrow` | `ui/SectionEyebrow.tsx` | `<p>` with the `text-xs uppercase tracking-widest text-l-text-3` pattern. Accepts `label: string`. |
| `BentoCell` | `ui/BentoCell.tsx` | Individual bento tile: glass surface, border, Framer hover lift, icon slot, title, body, visual slot, `colSpan` prop. |
| `ChatWindow` | `ui/ChatWindow.tsx` | The AI Advisor animated chat (§5A). Client component. Manages typing state, message queue, replay loop. Accepts `script: ChatMessage[]` prop. |
| `DashboardPanel` | `ui/DashboardPanel.tsx` | One of the 3 crossfade panels inside the scroll-pinned mockup. Accepts `id`, `content` (Health/Budget/Goals JSX). |
| `MotionReveal` | `ui/MotionReveal.tsx` | Reusable Framer Motion wrapper: `whileInView={{ opacity: 1, y: 0 }}` from `{ opacity: 0, y: 24 }`, `viewport={{ once: true }}`. Accepts `delay`, `children`. Reads `useReducedMotion()` internally. |
| `MarqueeTrack` | `ui/MarqueeTrack.tsx` | GSAP marquee container. Client component. Doubles children for seamless loop. Loads GSAP dynamically. |

### Layout / CSS Files

| File | Responsibility |
|------|----------------|
| `app/(public)/landing.css` | All landing-scope CSS: `@theme` tokens, `.landing` class vars, blob drift keyframes, grid-bg, glass surface mixins, CTA pulse keyframe, reduced-motion overrides |
| `app/(public)/layout.tsx` | Wraps page in `<div className="landing">` (light, not `.dark`). Imports `landing.css`. Wraps in `<LazyMotion features={domAnimation}>`. |

---

## Build Order for Implementation

1. `landing.css` — tokens, keyframes, utilities
2. `layout.tsx` — remove `.dark`, add `.landing` wrapper, add `LazyMotion`
3. `GradientMeshBg`, `BrowserMockup`, `SectionEyebrow`, `MotionReveal` — shared primitives, no motion deps
4. `LandingNavbar` — Framer scroll shadow
5. `LandingHero` — the first fully visible section; highest visual priority
6. `SocialProofStrip` + `MarqueeTrack` — GSAP marquee
7. `ProblemStatement`, `TrustSecurity`, `FAQ`, `LandingFooter` — simpler sections
8. `FeaturesBento` + `BentoCell` — bento grid + recharts animation
9. `ChatWindow` → `AIAdvisorSpotlight` — typewriter, most complex client state
10. `HowItWorks` — GSAP scroll-drawn line
11. `DashboardPreview` + `DashboardPanel` — scroll-pinned, most complex GSAP, do last

---

## Open Decisions (for Ehnand to resolve before build)

1. **App name on landing:** Currently "Budget Planner" throughout. Worth a stronger product name before this launches publicly? The landing is the brand's face.
2. **Real user count:** "500+ users" — confirm the actual number from the DB before hardcoding.
3. **Cal Sans:** Add it for the hero h1 to get warmth, or stay pure Geist? Cal Sans is 1 weight, negligible cost.
4. **Screenshots vs JSX mockups:** The DashboardPreview scroll-pinned reveal will look sharpest with a real screenshot. A screenshot of the live dashboard in light mode would be ideal. Alternatively, the existing JSX mock from `Hero.tsx` can be expanded — works fine but requires maintenance when UI changes.
5. **Testimonials:** Keep the current fictional names or source real ones from actual users?
