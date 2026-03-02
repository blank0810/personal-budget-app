# Landing Page Redesign Plan

**Goal:** Transform the landing page from a generic template into a premium fintech SaaS experience that drives signups.

**Design direction:** Dark mode with strategic color accents (Copilot Money / Linear aesthetic). Zero client JS dependencies — all animations via CSS. Server-rendered throughout.

**Constraints:**
- No new dependencies (no framer-motion, no WebGL libraries)
- Use existing Geist font family (already premium — same as Vercel)
- Use existing shadcn/ui components + Tailwind CSS 4
- Dark mode via `.dark` class on the landing page wrapper (not site-wide toggle)
- All server components (zero client JS on landing page)
- OKLch color variables from globals.css

---

## Task 1: Dark Theme Foundation + Layout

**Files:**
- Modify: `app/(public)/layout.tsx`
- Modify: `app/(public)/page.tsx`
- Create: `app/(public)/landing.css`

**Step 1:** Create `app/(public)/landing.css` with landing-page-specific CSS:

```css
/* Gradient glow effects */
.landing-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;
  pointer-events: none;
}

/* Scroll-triggered fade-in animation */
.landing-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}
.landing-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger delays for children */
.landing-stagger > *:nth-child(1) { transition-delay: 0ms; }
.landing-stagger > *:nth-child(2) { transition-delay: 75ms; }
.landing-stagger > *:nth-child(3) { transition-delay: 150ms; }
.landing-stagger > *:nth-child(4) { transition-delay: 225ms; }
.landing-stagger > *:nth-child(5) { transition-delay: 300ms; }
.landing-stagger > *:nth-child(6) { transition-delay: 375ms; }

/* Subtle grid background */
.landing-grid-bg {
  background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 64px 64px;
}

/* Animated gradient border for feature cards */
@keyframes border-glow {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
```

**Step 2:** Update `app/(public)/layout.tsx`:
- Import `landing.css`
- Keep existing metadata and JSON-LD

**Step 3:** Update `app/(public)/page.tsx`:
- Wrap everything in `<div className="dark">` so the dark theme CSS variables apply
- Add the `landing-grid-bg` class to the main wrapper
- Add relative positioning for glow effects
- Rearrange section order: Navbar → Hero → ProblemStatement (new) → Features → HowItWorks → DashboardPreview → Testimonials (new) → CTA → Footer

**Verify:** Page renders with dark background and grid pattern visible.

---

## Task 2: Redesign Navbar

**Files:**
- Modify: `components/modules/landing/Navbar.tsx`

**Step 1:** Redesign the navbar:
- Background: transparent with `border-b border-white/10 bg-black/50 backdrop-blur-xl`
- Logo: Wallet icon + "Budget Planner" in white
- Right side: "Login" ghost button (white text) + "Start tracking free" solid button (white bg, dark text, rounded-full)
- Max-width container `max-w-6xl` centered

**Verify:** Navbar renders with glass effect on dark background.

---

## Task 3: Redesign Hero Section

**Files:**
- Modify: `components/modules/landing/Hero.tsx`

**Step 1:** Rewrite hero copy:
- Headline: "Stop guessing where your money goes." — `text-5xl md:text-7xl font-bold tracking-tight text-white`
- Add a subtle gradient on the headline text using `bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent`
- Subheadline: "Budget smarter, save faster, and see your full financial picture — in one free app." — `text-lg md:text-xl text-white/60`

**Step 2:** Redesign CTA area:
- Primary: "Start tracking free" — white bg, dark text, rounded-full, `px-8 py-3 text-base font-medium`
- Secondary: "See how it works" — ghost style, `text-white/60 hover:text-white`, arrow icon
- Below CTAs: trust line — "No credit card required. Free forever." in `text-sm text-white/40`

**Step 3:** Add glow effect behind hero:
- Two absolute-positioned gradient blobs:
  - Primary color glow top-center: `bg-primary/20 w-[600px] h-[400px] blur-[120px]`
  - Accent glow offset: `bg-blue-500/10 w-[400px] h-[300px] blur-[100px]`

**Step 4:** Replace the gray-box dashboard mockup with a styled dark-mode dashboard preview:
- Browser chrome: dark (`bg-white/5 border-b border-white/10`)
- Three dots in muted white/20 (not colored — more refined)
- URL bar: `bg-white/5` with white/40 text
- Dashboard content: dark cards with real-looking KPI values using `text-white` and `text-white/60`
- Bar chart with colored bars (primary/40 and emerald/40)
- Progress bars with subtle color fills
- Keep the `perspective(1000px) rotateX(2deg)` tilt
- Outer container: `border border-white/10 rounded-xl shadow-2xl shadow-primary/5`

**Verify:** Hero section renders with gradient headline, glows, dark mockup, and trust line.

---

## Task 4: Create Problem Statement Section

**Files:**
- Create: `components/modules/landing/ProblemStatement.tsx`

**Step 1:** Create the component with 3 pain points:
- Section background: transparent (inherits dark)
- Padding: `py-20`
- Layout: heading + 3-column grid

**Step 2:** Content:
- Small label above heading: "THE PROBLEM" in `text-xs font-medium tracking-widest text-primary/80 uppercase`
- Heading: "Your money is scattered across apps, spreadsheets, and guesswork." — `text-2xl md:text-3xl font-semibold text-white`

**Step 3:** Three pain cards (minimal, not boxy):
- No visible border — just `text-white/70` content with a subtle top border accent (`border-t border-white/10 pt-6`)
- Pain 1: "Banking apps show balances, not budgets." (icon: Landmark)
- Pain 2: "Spreadsheets break the moment life gets busy." (icon: FileSpreadsheet)
- Pain 3: "You deserve one place for the full picture." (icon: Eye)
- Each card: icon in `text-white/40`, title in `text-white font-medium`, description in `text-white/50 text-sm`

**Verify:** Problem section renders between hero and features.

---

## Task 5: Redesign Features Section (Bento Grid)

**Files:**
- Modify: `components/modules/landing/Features.tsx`

**Step 1:** Replace uniform 3x2 grid with asymmetric bento layout:
```
Desktop layout:
┌──────────────┬──────────┐
│  Large card   │  Small   │
│  (Dashboard)  │  (Budget)│
├──────┬───────┼──────────┤
│ Small│ Small │  Large   │
│(Goal)│(Recur)│ (Report) │
├──────┴───────┼──────────┤
│   Medium      │  Medium  │
│   (Import)    │  (More)  │
└───────────────┴──────────┘
```

**Step 2:** Card styling:
- Background: `bg-white/[0.03] border border-white/[0.06] rounded-xl`
- Hover: `hover:bg-white/[0.05] hover:border-white/[0.1] transition-colors`
- Icon: in a `rounded-lg bg-white/[0.06] p-2.5` container
- Title: `text-white font-medium`
- Description: `text-white/50 text-sm leading-relaxed`

**Step 3:** Large cards (Dashboard + Reports) get a visual element:
- Dashboard card: include a tiny inline bar-chart SVG or styled div mock
- Reports card: include a tiny progress indicator mock
- These are purely decorative CSS elements, no images

**Step 4:** Section heading:
- Small label: "FEATURES" in `text-xs tracking-widest text-primary/80 uppercase`
- Heading: "Everything you need, nothing you don't." — `text-3xl md:text-4xl font-bold text-white`

**Step 5:** Add `landing-reveal` and `landing-stagger` classes to the grid for scroll animation.

**Verify:** Bento grid renders with hover effects and visual hierarchy.

---

## Task 6: Redesign How It Works

**Files:**
- Modify: `components/modules/landing/HowItWorks.tsx`

**Step 1:** Redesign with numbered steps on dark background:
- Background: subtle differentiation with `bg-white/[0.02]`
- Border top/bottom: `border-t border-b border-white/[0.06]`

**Step 2:** Layout — horizontal on desktop, vertical on mobile:
- Each step: large number (`text-5xl font-bold text-white/[0.07]`), icon in a glowing circle, title, description
- Connector: dashed line in `border-white/10` between steps (horizontal desktop, vertical mobile)

**Step 3:** Content (same 3 steps, refined copy):
- Step 1: "Create your free account" — "No credit card. Just your name and email." (UserPlus icon)
- Step 2: "Set up your finances" — "Add accounts, set category budgets, pick your currency." (Settings icon)
- Step 3: "Watch your wealth grow" — "Track every dollar, hit your goals, and build real habits." (TrendingUp icon)

**Step 4:** Add `landing-reveal` class for scroll animation.

**Verify:** Steps render with connectors and large faded numbers.

---

## Task 7: Redesign Dashboard Preview

**Files:**
- Modify: `components/modules/landing/DashboardPreview.tsx`

**Step 1:** Redesign as a full-width dark dashboard mockup:
- Remove the browser chrome wrapper (keep it only in hero)
- Instead, show a detailed mock of the actual dashboard with dark cards
- This section is about showing depth of the product

**Step 2:** Content — show 3 highlighted capability panels side by side:
- Panel 1: "Financial Health Score" — circular progress indicator (CSS only) showing "82/100", label "Good", 5 small pillar bars below
- Panel 2: "Budget Tracking" — 3 category rows with progress bars and amounts (e.g., "Groceries $340/$500", "Transport $120/$200")
- Panel 3: "Savings Goals" — 2 goal cards with progress bars, icons, and target amounts

**Step 3:** Styling:
- Each panel: `bg-white/[0.03] border border-white/[0.06] rounded-xl p-6`
- Use realistic fake data with round numbers
- Color accents: emerald for positive, amber for warnings, primary for neutral

**Step 4:** Section heading:
- Small label: "PRODUCT" in `text-xs tracking-widest text-primary/80 uppercase`
- Heading: "See your full financial picture." — `text-3xl md:text-4xl font-bold text-white`
- Subheading: "Every insight you need, updated in real time." — `text-white/50`

**Verify:** Three panels render with realistic mock data.

---

## Task 8: Create Testimonials Section

**Files:**
- Create: `components/modules/landing/Testimonials.tsx`

**Step 1:** Create a testimonials section with 3 cards:
- Section heading: small label "WHAT USERS SAY" + heading "Trusted by people who take their finances seriously."

**Step 2:** Three testimonial cards:
- Card style: `bg-white/[0.03] border border-white/[0.06] rounded-xl p-6`
- 5-star rating row (filled stars in amber/yellow)
- Quote text in `text-white/70 text-sm leading-relaxed italic`
- Author name: `text-white font-medium text-sm`
- Author context: `text-white/40 text-xs` (e.g., "Freelance designer", "Small business owner")

**Step 3:** Placeholder testimonials (realistic but clearly sample):
- "I finally stopped dreading the end of the month. Seeing where every peso goes changed how I spend." — Maria S., Freelance Designer
- "The budget envelopes are a game changer. I paid off my credit card in 3 months." — James R., Software Engineer
- "Simple, fast, and actually useful. I tried YNAB and Mint — this is the one that stuck." — Anna L., Small Business Owner

**Step 4:** Below testimonials, add a trust bar:
- Centered row: "Free forever for personal use" + separator dot + "Bank-level encryption" + separator dot + "No ads, no data selling"
- Style: `text-white/30 text-xs`

**Verify:** Testimonials render with stars, quotes, and trust bar.

---

## Task 9: Redesign CTA Section

**Files:**
- Modify: `components/modules/landing/CTA.tsx`

**Step 1:** Redesign with a glow effect:
- Background: `relative overflow-hidden` with a centered gradient glow blob behind the text
- Glow: `absolute bg-primary/10 w-[500px] h-[300px] rounded-full blur-[100px]` centered

**Step 2:** Content:
- Heading: "Ready to take control?" — `text-3xl md:text-4xl font-bold text-white`
- Subheading: "Join hundreds of people who stopped guessing and started tracking." — `text-white/50`
- CTA button: "Start tracking free" — white bg, dark text, large rounded-full, `px-10 py-4 text-lg`
- Trust line below: "Free forever. No credit card. Setup in 2 minutes." — `text-white/30 text-sm`

**Verify:** CTA section renders with glow and prominent button.

---

## Task 10: Redesign Footer

**Files:**
- Modify: `components/modules/landing/Footer.tsx`

**Step 1:** Dark footer matching the page:
- Border top: `border-t border-white/[0.06]`
- Background: inherits dark
- All text in white/muted variants

**Step 2:** Layout (same 3-column structure):
- Brand column: Wallet icon + "Budget Planner" in white, tagline in `text-white/40`
- Product links: `text-white/50 hover:text-white transition-colors`
- Support links: same styling
- Bottom bar: `border-t border-white/[0.06]`, copyright + "Built with coffee" in `text-white/30`

**Verify:** Footer renders consistently with dark theme.

---

## Task 11: Add Scroll Reveal Observer

**Files:**
- Create: `components/modules/landing/ScrollReveal.tsx`

**Step 1:** Create a lightweight client component (the ONLY client component on the landing page):
```tsx
'use client';
import { useEffect } from 'react';

export function ScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.landing-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
```

**Step 2:** Add `<ScrollReveal />` to `app/(public)/page.tsx`.

**Step 3:** Add `landing-reveal` class to each section component's outer wrapper (Features, HowItWorks, DashboardPreview, Testimonials, CTA). Add `landing-stagger` to grids.

**Verify:** Sections fade in as they scroll into view.

---

## Task 12: Final Polish + Commit

**Files:**
- All modified landing page files

**Step 1:** Review all components for consistency:
- Verify all text uses white/opacity variants (no `text-foreground` or `text-muted-foreground` — those depend on the theme context)
- Verify all backgrounds use `bg-white/[opacity]` not `bg-card` or `bg-muted`
- Verify all borders use `border-white/[opacity]`

**Step 2:** Verify the page:
- Type check: `npx tsc --noEmit` — filter for landing page files, 0 errors
- Visual check: all sections render in dark mode with consistent styling

**Step 3:** Commit:
```bash
git add "app/(public)/" components/modules/landing/
git commit -m "feat: redesign landing page with dark theme, bento grid, social proof, and scroll animations"
```

---

## Summary

| Task | What | Key Change |
|------|------|-----------|
| 1 | Dark theme foundation | CSS file, dark wrapper, grid background |
| 2 | Navbar | Glass effect on dark background |
| 3 | Hero | Gradient headline, glows, dark mockup, trust line |
| 4 | Problem Statement | NEW section — 3 pain points |
| 5 | Features | Bento grid replaces uniform 3x2 |
| 6 | How It Works | Refined dark styling + connectors |
| 7 | Dashboard Preview | 3 detailed capability panels |
| 8 | Testimonials | NEW section — 3 quotes + trust bar |
| 9 | CTA | Glow effect + outcome CTA |
| 10 | Footer | Dark theme consistency |
| 11 | Scroll Reveal | Single client component for IntersectionObserver |
| 12 | Polish + Commit | Consistency check, type check, commit |

**New files:** 4 (landing.css, ProblemStatement.tsx, Testimonials.tsx, ScrollReveal.tsx)
**Modified files:** 8 (layout, page, Navbar, Hero, Features, HowItWorks, DashboardPreview, CTA, Footer)
**New dependencies:** 0
**Client JS:** Single ~15-line IntersectionObserver component
