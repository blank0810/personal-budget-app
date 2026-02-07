# Merge Health Check into Reports Overview

**Date:** 2026-02-07
**Roadmap Item:** #22 - Merge Health Check into overview, remove unneeded components
**Status:** Design approved

## Goal

Consolidate the standalone Health Check tab into the Reports Overview tab, creating a single financial command center. Remove redundant components. Add animations for visual polish.

## Accountant's Analysis: What Stays, What Goes

### Redundancy Audit

| Component | Appears In | Verdict |
|-----------|-----------|---------|
| Fund Health Report | Health Check tab + Dashboard "Your Funds" | **Remove from reports** - duplicate |
| Health Check tab | Reports (standalone tab) | **Remove tab** - merge into Overview |
| Score Ring + Roast | Health Check tab only | **Keep** - unique synthesized metric |
| 5-Pillar Breakdown | Health Check tab only | **Keep** - actionable grades |
| 4 KPI Cards | Overview tab only | **Keep** - operational trends |
| Net Worth Trend | Overview tab only | **Keep** - historical trajectory |

### Result

- Reports tabs go from 5 → 4: **Overview** | Income & Expenses | Budget Analytics | Statements
- Fund Health Report removed from FinancialHealthCheck component (already on Dashboard)

## Merged Overview Layout

```
┌─────────────────────────────────────────────────────┐
│  [Score Ring]     │  KPI: Net Result   │ KPI: Inflow│
│   72/100          │  KPI: Burn Rate    │ KPI: Saving│
│   "Fair"          │  (with sparklines)              │
│   roast feedback  │                                 │
├─────────────────────────────────────────────────────┤
│  Net Worth Trend Chart (full width, animated)       │
├─────────────────────────────────────────────────────┤
│  5-Pillar Breakdown (collapsed by default)          │
│  ▸ Solvency ████████░░ 82 A                        │
│    "Can you cover what you owe?"                    │
│  ▸ Liquidity █████░░░░░ 51 C  ← weakest highlight  │
│    "Can you survive an emergency?"                  │
│  ▸ Savings ██████░░░░ 65 C                         │
│    "Are you keeping enough of what you earn?"       │
│  ▸ Debt Mgmt ███████░░░ 74 B                       │
│    "Is your debt under control?"                    │
│  ▸ Cash Flow ████████░░ 80 B                       │
│    "Is more coming in than going out?"              │
└─────────────────────────────────────────────────────┘
```

### UX Flow (Top-Down)

1. **"How healthy am I?"** → Score Ring + roast
2. **"What are my numbers?"** → KPI Cards
3. **"Where's my wealth heading?"** → Net Worth Trend
4. **"Where do I improve?"** → Pillar Breakdown

This mirrors a financial review meeting structure.

## Pillar One-Liners (Always Visible)

Each pillar gets a plain-language subtitle visible without expanding:

| Pillar | One-Liner |
|--------|-----------|
| Solvency | Can you cover what you owe? |
| Liquidity | Can you survive an emergency? |
| Savings | Are you keeping enough of what you earn? |
| Debt Management | Is your debt under control? |
| Cash Flow | Is more coming in than going out? |

Non-jargon so users with zero financial knowledge understand what's being graded.

## Animations

All lightweight -- CSS transitions + Recharts built-in. No animation library.

| Element | Animation | Technique |
|---------|-----------|-----------|
| Score Ring | Stroke animates 0 → actual score on mount | CSS `stroke-dashoffset` transition (already has CSS, needs initial state fix) |
| KPI Cards | Staggered fade-in | CSS `opacity` + `transform` with `animation-delay` |
| Pillar Progress Bars | Width animates 0 → score, staggered | CSS `width` transition with delay per pillar |
| Net Worth Chart | Line draws in on mount | Recharts `isAnimationActive` prop (ensure enabled) |

## Files Changed

| File | Change |
|------|--------|
| `app/(authenticated)/reports/page.tsx` | Remove Health Check tab, merge into Overview tab layout |
| `components/modules/reports/FinancialHealthCheck.tsx` | Remove Fund Health Report section, add pillar one-liners, fix score ring initial animation state |
| `components/modules/reports/FinancialHealthCheck.tsx` | Add staggered animation CSS for pillars |

## Data Fetching

No changes needed. The reports page already fetches `healthScore` via `DashboardService.getFinancialHealthScore(userId)`. Just move where it renders.

## What Gets Removed

- Health Check tab trigger + tab content from reports page
- Fund Health Report rendering from `FinancialHealthCheck.tsx`
- `fundHealth` prop becomes optional/unused in FinancialHealthCheck (clean up)
