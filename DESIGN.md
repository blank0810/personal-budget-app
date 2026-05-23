# DESIGN.md — Budget Planner Design System

Design context for AI-assisted UI work (loaded by the `impeccable` skill). Reflects the **actual** tokens in `app/globals.css` and `app/layout.tsx` — keep it truthful; update it when the real tokens change.

## Stack & conventions
- **Next.js 16 App Router, React 19 (React Compiler on), TypeScript.**
- **Tailwind CSS 4**, CSS-first config via `@theme inline` in `app/globals.css` (no `tailwind.config.js`). Tokens are CSS variables mapped to Tailwind color utilities.
- **shadcn/ui (New York style)** primitives in `components/ui/`. Prefer composing these over hand-rolled primitives. Registry available via the shadcn MCP.
- **Theming:** `next-themes`, class-based (`attribute="class"`), `defaultTheme="system"`. Dark mode = `.dark` class; `@custom-variant dark`.
- **Indent:** tabs. **Icons:** `lucide-react`. **Charts:** `recharts`. **Toasts:** `sonner`.

## Color (actual tokens — `oklch`)
The base palette is **neutral monochrome**, not a colored brand. Do not invent an "emerald brand" for app UI.
- **Light:** bg `oklch(1 0 0)`, fg `oklch(0.145 0 0)`, `--primary oklch(0.205 0 0)` (near-black), border `oklch(0.922 0 0)`, radius `0.625rem`.
- **Dark:** bg `oklch(0.145 0 0)`, fg `oklch(0.985 0 0)`, `--primary oklch(0.922 0 0)` (near-white), border `oklch(1 0 0 / 10%)`.
- **Semantic:** `--destructive` (red) for expense/negative/danger; income/positive uses green at the component level. Charts use the `--chart-1..5` ramp (varied hues; differs light vs dark).
- **Sidebar** has its own token group (`--sidebar*`).
- **Landing exception:** the public landing (`app/(public)/`) runs its **own isolated light scope** with an emerald accent + gradient mesh — defined in `app/(public)/landing.css`, NOT the app tokens. That emerald is landing-only; don't bleed it into authenticated routes.

## Typography
- **Default:** Geist (`--font-geist-sans`) / Geist Mono (`--font-geist-mono`) — `next/font/google`, applied globally on `<body>`.
- **Operator Console dashboard (in-progress redesign):** opts into **Sora** (`--font-grotesk`, display) + **JetBrains Mono** (`--font-numeric`, figures) per-component. Global default stays Geist.
- **Money figures:** always tabular/mono (Geist Mono app-wide; JetBrains Mono in the Operator Console). Numbers reading as tabular = intentional.

## Radius / elevation / motion
- Radius scale off `--radius: 0.625rem` (`sm/md/lg/xl`).
- Motion: `tw-animate-css` + custom keyframes in `globals.css` (`fade-up` → `.animate-fade-up`, collapsible). The **landing** adds `motion` (Framer Motion) + `gsap` + `@gsap/react`, route-isolated to `components/modules/landing/*` (never in the app bundle).
- All motion must honor `prefers-reduced-motion`.

## Design references
- **Dashboard / app UI:** Aniq UI (primary reference — see project memory `reference_aniq_ui`). Current direction: "Operator Console" (Direction B) at `app/(authenticated)/dashboard-preview-2/` — motion + floating Dock.
- **Landing:** Vercel × Raycast × Linear × Mercury (light, gradient, glass, restrained).

## Anti-slop guardrails (see `docs/plans/2026-05-23-landing-build-methodology.md`)
No purple/violet "AI-template" accent; keep layout asymmetry (don't flatten bento/grids to identical cards); never animate an LCP headline from `opacity:0`; avoid the `border-l-4` accent on every card in a row; section H2s mixed-case (only small eyebrow labels are uppercase).
