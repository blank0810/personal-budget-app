# Landing Page Link Preview (OG / Twitter Card)

**Status:** Implemented (v1.9.13)
**Date:** 2026-04-26

## Problem

Pasting `budgetplanner.app` (or the preview URL) into Slack, iMessage, Twitter,
or Facebook produced no preview card. Two root causes:

1. `app/(public)/layout.tsx` referenced `/og-image.png`, but the file did not
   exist in `public/`. Most crawlers logged a 404 and skipped the unfurl.
2. No `metadataBase` was set on the root layout, so even when relative URLs
   were declared they could not resolve to absolute URLs — Slack and Twitter
   require absolute paths.

Authenticated routes are out of scope (they sit behind login and don't get
shared). Per-route dynamic previews for changelog entries / feature requests
were also out of scope for this pass — only the landing page (`/`).

## Approach

Use Next.js 16's file-based metadata convention with `next/og`'s
`ImageResponse` to render a composite OG image at build time. No new
dependencies, no hand-authored PNG to maintain, and the same JSX renders for
both `og:image` and `twitter:image`.

Composition (1200×630, dark to match the landing page):

- **Left half** — Wallet icon + "Budget Planner" wordmark, "Stop guessing
  where your money goes." headline (matches the live landing hero), a one-line
  tagline, and two pills ("Free to use" + "budgetplanner.app").
- **Right half** — The existing `public/dashboard.png` screenshot, rounded
  with a subtle border and drop-shadow, bleeding off the right edge for a
  product-peek effect.
- **Background** — Solid `#000000` with two faint radial gradients
  (indigo top-left, blue bottom-right) — same vibe as `Hero.tsx`'s
  `landing-glow`.

## Files

- `app/(public)/opengraph-image.tsx` — renders the composite via
  `ImageResponse`. Reads `public/dashboard.png` from disk and embeds it as a
  base64 data URI so Satori (the renderer behind `@vercel/og`) can resolve it.
- `app/(public)/twitter-image.tsx` — re-exports the same component plus
  metadata fields. Re-exporting `runtime` directly fails Next 16's static
  analysis, so each constant is re-declared explicitly.
- `app/layout.tsx` — adds
  `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://budgetplanner.app')`.
- `app/(public)/layout.tsx` — drops the stale `/og-image.png` reference (the
  file convention takes over). Adds `siteName` and `url: '/'` for richer
  unfurls.
- `middleware.ts` — extends the public allowlist to
  `pathname.startsWith('/opengraph-image')` and `'/twitter-image'`. Next 16
  appends a hash suffix (e.g. `/opengraph-image-1c1a04`) for cache busting,
  so a `startsWith` check is required, not `===`.

## Gotchas Hit

- `@vercel/og`'s style parser rejects shorthand hex like `#000` in
  `background:` shorthand. Workaround: split into `backgroundColor: '#000000'`
  and `backgroundImage: 'radial-gradient(...), radial-gradient(...)'`.
- Next 16 hashes the metadata route URLs (`/opengraph-image-<hash>`). Exact
  string match in middleware blocks the actual request. Use `startsWith`.
- Re-exporting `runtime` from another file via `export { runtime } from './x'`
  fails Next 16's static analysis. Declare each constant directly in
  `twitter-image.tsx`.

## Verification

- `curl http://localhost:3000/opengraph-image-1c1a04?<hash>` → 200,
  1200×630 PNG, ~197 KB.
- Page source for `/` emits absolute URLs:
  `<meta property="og:image" content="http://localhost:3000/opengraph-image-1c1a04?...">`.
- Visual check: composite layout reads cleanly — headline isn't clipped,
  dashboard peek bleeds off the right edge, gradients are subtle.

## Out of Scope (Future)

- Per-route dynamic OG for `/changelog/[slug]` and feature-request pages —
  would need its own `opengraph-image.tsx` per segment with a route
  parameter. Worth doing once content marketing picks up.
- Authenticated routes — no need; they're not shareable.
- Apple Touch Icon / favicon refresh — separate concern.
