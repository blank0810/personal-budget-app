---
name: Budget Planner
description: An evidence-first personal-finance interface built from neutral surfaces, fixed comparisons, and restrained semantic status.
colors:
  background: "var(--background)"
  foreground: "var(--foreground)"
  card: "var(--card)"
  muted: "var(--muted)"
  muted-foreground: "var(--muted-foreground)"
  primary: "var(--primary)"
  primary-foreground: "var(--primary-foreground)"
  border: "var(--border)"
  destructive: "var(--destructive)"
  chart-income: "var(--chart-2)"
  status-positive: "oklch(69.6% 0.17 162.48)"
  status-warning: "oklch(76.9% 0.188 70.08)"
  status-negative: "oklch(63.7% 0.237 25.331)"
  landing-accent: "oklch(0.72 0.17 155)"
typography:
  page-heading:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
    letterSpacing: "-0.03em"
  diagnostic-headline:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.02em"
  section-title:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    letterSpacing: "-0.02em"
  panel-title:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
  control:
    fontFamily: "Geist, ui-sans-serif, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  data-score:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "\"tnum\""
  data-value:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    fontFeature: "\"tnum\""
rounded:
  none: "0px"
  sm: "calc(0.625rem - 4px)"
  md: "calc(0.625rem - 2px)"
  lg: "0.625rem"
  xl: "calc(0.625rem + 4px)"
spacing:
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.control}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    height: "2.25rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
    height: "2.25rem"
  evidence-panel:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.none}"
    padding: "1.25rem"
---

# Design System: Budget Planner

## Overview

**Creative North Star: "The Health Ledger"**

Budget Planner's authenticated experience is a calm financial instrument: neutral, direct, and structured around evidence rather than decoration. The dashboard is its clearest expression—one diagnosis, five comparable evidence rows, and one concrete next action, followed immediately by the operating detail that supports the judgment.

The system favors near-white or near-black canvases, gray hairlines, compact density, and explicit labels. Semantic color is scarce and meaningful; hierarchy comes from type, alignment, and sequence instead of a grid of equal widget cards. Empty and partial states stay factual and non-aggressive until the underlying data can support a diagnosis.

**Key Characteristics:**

- Evidence-first hierarchy with a verdict before supporting detail.
- Neutral, theme-aware surfaces with restrained semantic status color.
- Geist interface typography and Geist Mono tabular financial figures.
- Hairline-separated comparisons and square-edged operating panels.
- Static, accessible interaction with responsive reflow rather than decorative motion.

### Stack & conventions

- Next.js 16 App Router, React 19 with React Compiler, and TypeScript.
- Tailwind CSS 4 uses CSS-first `@theme inline` tokens from `app/globals.css`; there is no `tailwind.config.js`.
- Compose shadcn/ui New York primitives from `components/ui/`; themes use `next-themes` with a `.dark` class and the system default.
- Use tabs for indentation, `lucide-react` for icons, Recharts for charts, and Sonner for toasts.
- Aniq UI remains a general authenticated-app reference; the shipped Health Ledger is the dashboard's visual ground truth. The authenticated shell remains unchanged.
- Reports retains its own visual system and begins with Income & Expenses, followed by Budget Analytics and Statements. Summary health, KPI, and net-worth overview belong to the dashboard.
- The public landing remains Vercel × Raycast × Linear × Mercury: light, gradient, glass, and restrained, within its isolated landing scope.

## Colors

The authenticated palette is neutral monochrome in both themes; semantic hues appear only when they communicate status, direction, danger, or progress.

### Primary

- **Theme Primary** (`var(--primary)`): near-black in light mode and near-white in dark mode for decisive actions and high-contrast controls.
- **Theme Canvas** (`var(--background)`): white in light mode and near-black in dark mode.

### Neutral

- **Theme Ink** (`var(--foreground)`): primary copy and figures.
- **Muted Surface** (`var(--muted)`): low-emphasis fills, including the verdict band's 25% tint.
- **Muted Ink** (`var(--muted-foreground)`): questions, evidence descriptions, snapshot labels, and metadata.
- **Hairline** (`var(--border)`): section boundaries, ledger rows, evidence-strip divisions, and bounded operating panels.
- The sidebar keeps its separate `--sidebar*` token group; do not replace it with dashboard-local colors.

### Semantic

- **Positive Emerald** (`oklch(69.6% 0.17 162.48)`): positive markers; light and dark text/badge variants use the existing Emerald 700/300 and 100/950 scales.
- **Warning Amber** (`oklch(76.9% 0.188 70.08)`): warning markers; light and dark text/badge variants use Amber 700/300 and 100/950.
- **Negative Red** (`oklch(63.7% 0.237 25.331)`): negative markers and dashboard status; expenses and danger also use `var(--destructive)` where the existing component does.
- **Income Trend** (`var(--chart-2)`): the cash-flow income series. Expense remains destructive red.
- Other chart components retain the theme-aware `--chart-1..5` ramp; the light and dark values intentionally differ.
- Every semantic use also carries a label, grade, sign, icon, or text description; color is never the only signal.

### Landing exception

The public landing route owns an isolated emerald accent (`oklch(0.72 0.17 155)`) and gradient mesh in its landing styles. Do not use its `l-*` palette, glass effects, or mesh as authenticated-app tokens.

**The Status-Only Color Rule.** In the authenticated app, green, amber, orange, and red are evidence—not decoration. Keep primary structure neutral.

## Typography

**Display Font:** Geist (with `ui-sans-serif`, `sans-serif` fallback)

**Body Font:** Geist (with `ui-sans-serif`, `sans-serif` fallback)

**Label/Mono Font:** Geist Mono (with `ui-monospace`, `monospace` fallback)

**Character:** Geist keeps the interface plainspoken and compact; Geist Mono stabilizes money, scores, percentages, and ratios. The dashboard does not opt into Sora or JetBrains Mono.

### Hierarchy

- **Page heading** (600, `1.875rem` mobile / `2.25rem` from `sm`, `-0.03em`): route identity such as “Dashboard.”
- **Diagnostic headline** (600, `1.25rem` mobile / `1.5rem` from `sm`, `-0.02em`): the authoritative Reports diagnosis becomes the populated verdict headline.
- **Section title** (600, `1.25rem`, `-0.02em`): major evidence groups such as Health Ledger.
- **Panel title** (600, `1.125rem`): bounded operating views.
- **Body** (400, `0.875rem`, `1.25rem` line height): questions, recommendations, and evidence; keep explanatory copy near 65 characters when practical.
- **Label** (500, `0.75rem`): column labels and supporting metadata; sentence case rather than decorative all-caps.
- **Score** (Geist Mono 600, `3rem`, tabular): paired directly with its generic status label.
- **Financial value** (Geist Mono 600, `1.25rem`, tabular): aligned money and ratio evidence.

**The Stable Figures Rule.** Money, scores, percentages, and ratios use Geist Mono with tabular figures; surrounding language stays in Geist.

## Layout

The authenticated layout owns the sidebar, top bar, and content inset. Dashboard code must not render a duplicate shell. The page uses the existing centered container, `1rem` horizontal shell padding on mobile and `2rem` from `md`, a `1.25rem` vertical rhythm, and compact `1rem` dashboard padding.

The dashboard order is fixed: compact title and quick actions, verdict band, five-row Health Ledger, current-month evidence strip, then cash flow, budget pressure, accounts/debt, and recent activity. This density is intentional: on a 1536×1024 desktop, the operating area begins in the first viewport.

- **Header:** actions form a two-by-two grid on narrow screens, become an inline group from `sm`, and sit beside the title only from `xl`.
- **Verdict band:** below `xl`, score, diagnosis, and focus/action reflow vertically, with the focus block separated by a top hairline. At `xl`, they use a compact `10rem / flexible / minmax(19rem, 0.75fr)` row and a left divider before the focus block.
- **Health Ledger:** five evidence rows retain one order. From `md`, each row uses aligned pillar/question, grade, evidence, and action columns; below `md`, each row becomes a compact vertical section without hiding any label or action.
- **Evidence strip:** one column on mobile, two from `sm`, and four aligned cells from `lg`; divisions remain hairlines rather than individual cards.
- **Operating area:** panels stack on mobile, reflow to broad-plus-narrow pairs from `lg`, and preserve the priority order cash flow, budget pressure, accounts/debt, recent activity. No layout introduces horizontal page scrolling.

## Elevation & Depth

The authenticated system is flat by default. The verdict, ledger, and evidence strip use tonal tint and one-pixel hairlines rather than shadow. Distinct operating groups may use a single bounded panel with no radius or nested cards. Standard shadcn inputs and outlined controls retain the small `0 1px 2px rgb(0 0 0 / 0.05)` shadow already present in the component library.

**The Flat Diagnosis Rule.** Financial hierarchy comes from sequence, alignment, and hairlines; do not lift every evidence group into an equal card.

### Motion

The Health Ledger dashboard is intentionally static: no staggered entrance, count-up, score-ring drawing, carousel, auto-scroll, pulse, celebration, or looping chart motion. Recharts lines disable animation. Keep only immediate hover/focus/pressed feedback and tooltip transitions, and honor `prefers-reduced-motion`.

`tw-animate-css`, the global fade-up utility, and the collapsible keyframes remain available outside this dashboard; the collapsible may keep its existing 300ms open and 250ms close behavior. Do not apply the fade-up utility to Health Ledger. Landing-only Motion, GSAP, and `@gsap/react` remain route-isolated to `components/modules/landing/*`; they are not authenticated-app dependencies.

## Shapes

The base radius is `0.625rem`; `sm`, `md`, `lg`, and `xl` resolve to 6px, 8px, 10px, and 14px. Controls and compact status badges use restrained `md` corners. Progress tracks may be pill-shaped because their geometry encodes completion.

Diagnostic structures deliberately resist card silhouettes: verdict bands and evidence strips use border-y edges, Health Ledger rows use bottom hairlines, and operating panels use a square one-pixel boundary. Lucide icons stay small (typically 16px), inline, and redundant with text rather than sitting in decorative tiles.

## Components

### Buttons

- **Primary:** near-black on light and near-white on dark, 36px high, 8px radius, compact padding; reserve it for the current priority action.
- **Outline:** theme background with one-pixel input border and `shadow-xs`; use for secondary quick actions.
- **Ghost:** no resting surface; use for ledger and panel links where the row already supplies structure.
- **Hover / focus:** preserve immediate shadcn feedback and a visible three-pixel focus ring. No essential action depends on hover.

### Inputs / Fields

- Use the shared 36px-high shadcn fields with an 8px radius, input border, transparent/light background, and dark `--input` tint.
- Focus shifts the border to `--ring` and adds the existing three-pixel ring. Invalid and disabled states retain explicit text and semantic attributes.

### Navigation

- The authenticated sidebar keeps its existing token group, compact icon-and-label rows, neutral active fill, and responsive collapse behavior.
- The dashboard header includes only the route title, real snapshot label, and four real quick actions. Unavailable actions remain focusable with `aria-disabled`, ignore activation, and expose their reason visibly and through `aria-describedby`.

### Verdict band

- Pair the generic status label with the score, then lead with the more forceful shared Reports diagnosis as the headline.
- Show the weakest valid pillar, its real recommendation, and one route-backed action. Below `xl`, the focus block moves beneath the diagnosis; at `xl`, it occupies the right column.
- Partial data replaces score and aggressive copy with factual setup guidance. Empty data replaces the diagnosis entirely with the calm account-first state.

### Health Ledger

- Always show the five pillars in their fixed order as comparison rows, not cards: pillar/question and weight, grade/status, factual evidence, then a real next action.
- Define desktop tracks once on the ledger parent and let its header and rows inherit them with subgrid. Use hairlines, compact `0.75rem` row padding, small status icons, and text-backed semantic badges.
- On mobile, preserve the same information order in a vertical row. Unsupported pillars say “Needs data” without a misleading number.

### Evidence strip and operating panels

- Net worth, current-month income, expenses, and surplus/deficit form one divided strip. Money is mono/tabular; semantic color is paired with an explicit label or sign.
- Cash flow, budget pressure, accounts/debt, and recent activity may use bounded panels because they are distinct operating views. Avoid nested cards and equal-card bento treatment.
- Charts include a textual summary and accessible table, use static lines, and keep tooltip interaction supplemental. Absence becomes explanatory copy and a real action, not zero-value theater.

### States

- Loading geometry mirrors the final hierarchy without pulsing or decorative motion.
- Empty and partial states are non-numeric, factual, and non-aggressive. Do not infer health from missing income/expense history.
- Errors state that data was not changed and offer a real retry or destination.

## Do's and Don'ts

### Do:

- **Do** lead with one supported financial verdict, five comparable evidence rows, and one concrete action.
- **Do** keep desktop rows compact enough that operating evidence begins in the first viewport.
- **Do** reflow the verdict focus block below the diagnosis before the layout becomes cramped.
- **Do** pair every status color with a label, score, grade, sign, icon, or explanation.
- **Do** keep unavailable quick actions keyboard-focusable and show the reason they cannot run.
- **Do** keep landing effects isolated, keep Reports focused on analysis and statements, and keep the authenticated shell singular.
- **Do** preserve landing-grid asymmetry, mixed-case section headings, and restrained glass where its route-specific guidance calls for them.

### Don't:

- **Don't** restore the dashboard carousel, AI teaser, tabs, animated counters, score ring, fake period control, historical score delta, or decorative/looping motion.
- **Don't** manufacture values, action amounts, diagnoses, or aggressive copy for empty and partial data.
- **Don't** turn the Health Ledger rows or evidence-strip values into equal elevated widget cards.
- **Don't** use the landing emerald, violet mesh, or glass as authenticated-app branding.
- **Don't** use purple/violet as a generic AI-template accent, animate an LCP headline from opacity zero, or add a thick left accent border to every card.
- **Don't** hide essential values, labels, actions, or disabled reasons behind hover.
