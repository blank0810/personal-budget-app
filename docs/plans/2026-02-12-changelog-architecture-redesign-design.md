# Changelog Architecture Redesign

**Feature:** #11 — Redesign changelog architecture
**Date:** 2026-02-12
**Status:** Design Complete

---

## Problem

The changelog page (`app/(authenticated)/changelog/page.tsx`) contains a 650-line hardcoded TypeScript array with all changelog data inline. A separate `CHANGELOG.md` (907 lines) duplicates the same information for the repo. Every new feature requires updating both files. Neither scales.

## Decision: MDX Files with Frontmatter

Individual markdown files per version in `content/changelog/`, parsed at request time with `gray-matter`. No database, no CMS, no MDX compiler.

**Why this approach:**
- Each version is a standalone file (~9 files vs one 650-line monolith)
- Git history provides audit trail
- Frontmatter schema maps 1:1 to existing `Version` TypeScript interface
- Zero external dependencies beyond `gray-matter`
- Sets up #18 (CI auto-update) — CI just creates a new `.md` file
- Eliminates `CHANGELOG.md` duplication — MDX files are the single source of truth

**Rejected alternatives:**
- Database (Prisma model) — overkill for static content on a personal app
- Headless CMS (Sanity/Contentful) — unnecessary external dependency
- Third-party platforms (Canny, Beamer) — vendor lock-in, recurring cost
- Full MDX with `@next/mdx` — no rich content needed, just structured data
- Content collection libraries (Velite) — immature, adds build pipeline

## Entry Organization

Version-based grouping: one file per version (v1.8.md, v1.7.md, etc.). Patches are nested within their parent version file's frontmatter. This mirrors the existing structure and keeps file count manageable.

## File Structure

```
content/
└── changelog/
    ├── v1.8.md
    ├── v1.7.md
    ├── v1.6.md
    ├── v1.5.md
    ├── v1.4.md
    ├── v1.3.md
    ├── v1.2.md
    ├── v1.1.md
    └── v1.0.md
```

## Frontmatter Schema

```yaml
---
version: v1.8
date: 2026-01-31
title: Liability Payments, Budget Scoping & Account Groups
description: >
  Dedicated payment portal for credit cards and loans, budget envelope
  isolation, smart budget dropdown, 4-group account classification,
  CSV export, and budget replication.
status: current    # "current" | "released"
features:
  - title: Automated Monthly Financial Reports
    items:
      - "Monthly PDF Report: Editorial-style PDF with health score..."
      - "Email Delivery: Report attached as PDF to a summary email..."
  - title: Forgot Password + Google OAuth
    items:
      - "Forgot Password Flow: Request a reset link from login page..."
patches:
  - version: v1.7.3
    date: 2026-01-17
    title: Form Validation & UX Improvements
    description: Fixed validation bugs and improved error messages.
    features:
      - title: Bug Fixes
        items:
          - "Required Account Validation: Income entries now require..."
---

Optional body text — human-readable summary for repo browsers.
```

## Data Flow

```
content/changelog/v1.8.md  ─┐
content/changelog/v1.7.md  ─┤  changelog.service.ts     changelog/page.tsx     ChangelogView
content/changelog/v1.6.md  ─┤  (readdir + gray-matter)  (server component)     (client component)
...                         ─┘  → Version[]               → passes array        → renders timeline
```

## New/Modified Files

### New Files

| File | Purpose |
|------|---------|
| `content/changelog/v1.0.md` through `v1.8.md` | 9 markdown files with frontmatter, extracted from hardcoded array |
| `server/modules/changelog/changelog.service.ts` | Reads `content/changelog/`, parses with `gray-matter`, sorts by date desc, returns `Version[]` |
| `server/modules/changelog/changelog.types.ts` | `Version`, `Patch`, `Feature` interfaces (moved from ChangelogView.tsx) |

### Modified Files

| File | Changes |
|------|---------|
| `app/(authenticated)/changelog/page.tsx` | Shrinks from 650 lines to ~15 lines — calls service, passes to ChangelogView |
| `components/modules/changelog/ChangelogView.tsx` | Import types from `changelog.types.ts` instead of inline definitions. Rendering unchanged. |

### Deleted Files

| File | Reason |
|------|--------|
| `CHANGELOG.md` | MDX files are now the single source of truth |

## Dependencies

```
gray-matter    # YAML frontmatter parser (~5KB)
```

## Migration Steps

1. **Create content directory + 9 MDX files** — Extract each version from the hardcoded array. Update v1.8 to include Sidebar Redesign, Profile Page + Notifications, Budget + Income Notifications features added this session.
2. **Build changelog service** — `changelog.service.ts` (readdir + gray-matter + sort) and `changelog.types.ts` (shared interfaces).
3. **Rewire the page** — Replace 640-line hardcoded array with service call. ~15 lines.
4. **Cleanup** — Delete `CHANGELOG.md`. Update ChangelogView imports.
